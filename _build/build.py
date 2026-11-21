"""Assemble The Alignment Plan site from content fragments.

Run from anywhere:  python3 site/_build/build.py

Each fragment in content/*.html starts with one JSON line of metadata, then the
HTML body. The script wraps it with the head tags, nav, offer block and footer,
adds canonical and Open Graph tags and JSON-LD, and writes <slug>/index.html.
It also builds the home page (the product page, with the free tools below it) from home.html, a 404
page, sitemap.xml, robots.txt and the CNAME file for the host.

Change BASE when the domain changes. Nothing else holds the address.
"""
import json, os, re, glob, html, datetime, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
BASE = "https://alignmentplan.com/"
DOMAIN = "alignmentplan.com"
# Public contact address, kept in contact.txt. Decide the final one before going live.
CONTACT = open(os.path.join(HERE, "contact.txt"), encoding="utf-8").read().strip()
BRAND = "The Alignment Plan"
TODAY = datetime.date.today().isoformat()
ORG_ID = BASE + "#org"
SITE_ID = BASE + "#site"
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap">')

# The logo mark: three dots, one for each step, pulled into line by a pen stroke.
MARK = ('<svg class="mark" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 9.5C7 5 11 12 20 8s13-3 18 .5" fill="none" '
        'stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="8.4" r="4.6" fill="var(--s1)"/>'
        '<circle cx="20" cy="8" r="4.6" fill="var(--s2)"/><circle cx="32" cy="7.6" r="4.6" fill="var(--s3)"/></svg>')
# Waiting list. waitlist.json holds the sign-up form address from the email tool. While "action" is empty
# the button opens an email to the contact address instead, so the page never shows a form that goes nowhere.
WAITLIST = json.load(open(os.path.join(HERE, "waitlist.json"), encoding="utf-8"))

problems = []


def aside(p):
    """Pages that are not tools or guides: the privacy page and the two sign-up steps. Kept off the tool cards."""
    return p.get("kind") in ("legal", "step")


def step(p):
    """The two pages Kit sends people to after signing up and after confirming. Not for search engines, not in the footer."""
    return p.get("kind") == "step"


def waitlist_html(n, ghost=""):
    if WAITLIST.get("action"):
        return ('<form class="waitlist" action="{action}" method="post">\n'
                '      <label class="sr-only" for="wl-{n}">Your email address</label>\n'
                '      <div class="wl-row"><input id="wl-{n}" type="email" name="{field}" placeholder="Your email address" autocomplete="email" required>'
                '<button class="btn btn-primary" type="submit">Join the waiting list</button></div>\n'
                '      <p class="wl-note">We will email you once to confirm, then when it opens in December. You can leave any time. <a href="privacy/">Privacy</a>.</p>\n'
                '    </form>').format(action=esc(WAITLIST["action"]), field=esc(WAITLIST.get("field", "email")), n=n)
    mail = ("mailto:" + CONTACT + "?subject=Add%20me%20to%20the%20waiting%20list"
            "&body=Please%20add%20me%20to%20The%20Alignment%20Plan%20waiting%20list.")
    return ('<div class="waitlist">\n'
            '      <div class="wl-row"><a class="btn btn-primary" href="{mail}">Join the waiting list</a>{ghost}</div>\n'
            '      <p class="wl-note">Opens this December. The button starts an email to {c}: press send and you are on the list. <a href="privacy/">Privacy</a>.</p>\n'
            '    </div>').format(mail=mail, c=CONTACT, ghost=ghost)


def esc(s):
    return html.escape(s, quote=True)


def check(slug, title, desc):
    if len(title) > 60:
        problems.append(f"{slug}: title is {len(title)} characters (limit 60)")
    if len(desc) > 155:
        problems.append(f"{slug}: description is {len(desc)} characters (limit 155)")


def load_fragments():
    pages = []
    for path in sorted(glob.glob(os.path.join(HERE, "content", "*.html"))):
        raw = open(path, encoding="utf-8").read()
        first, body = raw.split("\n", 1)
        meta = json.loads(first)
        meta["body"] = body
        pages.append(meta)
    pages.sort(key=lambda m: m.get("order", 99))
    return pages


def nav(rel, current, pages):
    links = "".join(
        '<a href="{rel}{slug}/"{cur}>{name}</a>'.format(
            rel=rel, slug=p["slug"], name=esc(p.get("nav_short", p["nav"])),
            cur=' aria-current="page"' if p["slug"] == current else "")
        for p in pages if p.get("in_nav", True))
    return ('<div class="nav gutter"><div class="wrap">\n'
            '  <a class="logo" href="{rel}">' + MARK + '{brand}</a>\n'
            '  <nav class="nav-links" aria-label="Main">{links}<a class="nav-tools" href="{rel}#tools">Free tools</a>'
            '<a class="btn btn-primary" href="{rel}#ask">Join the waiting list</a></nav>\n'
            '</div></div>').format(rel=rel, brand=BRAND, links=links)


def footer(rel, pages):
    links = '<a href="{rel}">Home</a>'.format(rel=rel) + "".join(
        '<a href="{rel}{slug}/">{name}</a>'.format(rel=rel, slug=p["slug"], name=esc(p["nav"])) for p in pages if not step(p))
    return ('<footer class="gutter"><div class="wrap">\n'
            '  <p>{brand}. Your scores and answers stay in your own browser.</p>\n'
            '  <nav aria-label="Footer">{links}</nav>\n'
            '</div></footer>').format(brand=BRAND, links=links)


def offer(rel, current, pages):
    by_slug = {p["slug"]: p for p in pages}
    wanted = (by_slug.get(current) or {}).get("related") or []
    others = [by_slug[x] for x in wanted if x in by_slug and x != current][:2]
    if len(others) < 2:
        others += [p for p in pages if p["slug"] != current and p not in others and not aside(p)][:2 - len(others)]
    cards = "".join(
        '<a href="{rel}{slug}/"><b>{name}</b><span>{sub}</span></a>'.format(
            rel=rel, slug=p["slug"], name=esc(p["og_title"]), sub=esc(p["card_sub"])) for p in others)
    cards += ('<a href="{rel}#how"><b>How The Alignment Plan works</b>'
              '<span>Reflect, plan, stay aligned. Three steps.</span></a>').format(rel=rel)
    return ('<section class="offer gutter"><div class="wrap">\n'
            '  <div class="copy">\n'
            '    <span class="kicker">Keep it going</span>\n'
            '    <h2>A reflection is the start. The plan is what keeps you aligned.</h2>\n'
            '    <p>The Alignment Plan takes what you have just worked out and turns it into one focus for the year '
            'and a step for every month. A tap every Friday and ten minutes on the first of the month keep you on it.</p>\n'
            '    <div class="actions"><a class="btn btn-primary" href="{rel}#ask">Join the waiting list</a>'
            '<a class="btn btn-ghost" href="{rel}#how">How it works</a></div>\n'
            '  </div>\n'
            '  <div class="next">{cards}</div>\n'
            '</div></section>').format(rel=rel, cards=cards)


def faq_html(faq):
    return '<div class="faq">\n' + "\n".join(
        "    <details><summary>{q}</summary><p>{a}</p></details>".format(q=esc(q), a=esc(a)) for q, a in faq) + "\n  </div>"


def questions_html(parts):
    out, n = [], 0
    for part in parts:
        items = []
        for q, why in part["questions"]:
            n += 1
            items.append(
                '    <li><h3 id="q{n}">{q}</h3><p class="why">{why}</p>'
                '<textarea data-q="q{n}" aria-labelledby="q{n}" rows="3" placeholder="Write your answer"></textarea></li>'.format(
                    n=n, q=esc(q), why=esc(why)))
        start = n - len(part["questions"])
        out.append(
            '<section class="part gutter" id="{id}"><div class="wrap">\n'
            '  <div style="display:grid; gap:8px;"><span class="kicker {cls}">{kicker}</span><h2>{title}</h2><p class="intro">{intro}</p></div>\n'
            '  <ol class="qs" style="--start:{start};">\n{items}\n  </ol>\n'
            '</div></section>'.format(id=part["id"], cls=part["class"], kicker=esc(part["kicker"]), title=esc(part["title"]),
                                      intro=esc(part["intro"]), start=start, items="\n".join(items)))
    return "\n\n".join(out), n


def graph(page, url):
    g = [
        {"@type": "Organization", "@id": ORG_ID, "name": BRAND, "url": BASE},
        {"@type": "WebSite", "@id": SITE_ID, "url": BASE, "name": BRAND, "publisher": {"@id": ORG_ID}, "inLanguage": "en-GB"},
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": page["title"], "description": page["description"],
         "isPartOf": {"@id": SITE_ID}, "inLanguage": "en-GB", "dateModified": TODAY},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": page["crumb"], "item": url}]},
    ]
    if page.get("kind") == "tool":
        g.append({"@type": "WebApplication", "name": page["app_name"], "url": url, "applicationCategory": "LifestyleApplication",
                  "operatingSystem": "Any", "browserRequirements": "Requires JavaScript",
                  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}, "publisher": {"@id": ORG_ID}})
    if page.get("kind") == "guide":
        # A written guide with sources. "published" is the day it first went up; keep it when you edit the guide.
        g.append({"@type": "Article", "headline": page.get("headline", page["og_title"]), "description": page["description"],
                  "mainEntityOfPage": {"@id": url + "#page"}, "image": BASE + "og/" + page["slug"] + ".png",
                  "datePublished": page.get("published", TODAY), "dateModified": TODAY, "inLanguage": "en-GB",
                  "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID}})
    if page.get("faq"):
        g.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in page["faq"]]})
    return json.dumps({"@context": "https://schema.org", "@graph": g}, ensure_ascii=False, indent=1)


def head(title, desc, url, og_image, rel, ld, extra="", robots=""):
    return ('<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<title>{t}</title>\n<meta name="description" content="{d}">\n<link rel="canonical" href="{u}">\n'
            '<meta property="og:type" content="website">\n<meta property="og:site_name" content="{brand}">\n'
            '<meta property="og:title" content="{t}">\n<meta property="og:description" content="{d}">\n'
            '<meta property="og:url" content="{u}">\n<meta property="og:image" content="{img}">\n'
            '<meta property="og:locale" content="en_GB">\n<meta name="twitter:card" content="summary_large_image">\n'
            '{robots}{fonts}\n<link rel="icon" href="{rel}assets/favicon.svg" type="image/svg+xml">\n'
            '<link rel="stylesheet" href="{rel}assets/site.css">\n{extra}<script type="application/ld+json">\n{ld}\n</script>\n</head>\n').format(
                t=esc(title), d=esc(desc), u=url, brand=BRAND, img=og_image, fonts=FONTS, extra=extra, ld=ld, rel=rel, robots=robots)


def build_page(page, pages):
    rel = "../"
    url = BASE + page["slug"] + "/"
    check(page["slug"], page["title"], page["description"])
    body = page["body"].replace("{{REL}}", rel).replace("{{EMAIL}}", CONTACT)
    # The privacy page names whoever holds the waiting list, so it changes by itself when waitlist.json is filled in.
    inbox = ('<li><b>Our inbox.</b> Email you send us is forwarded by Cloudflare to a mailbox hosted by Microsoft.{extra}</li>')
    if WAITLIST.get("action"):
        holder = ('<li><b>Kit</b> (kit.com) stores the waiting list and sends our emails. Kit is based in the United States.</li>\n    '
                  + inbox.format(extra=""))
    else:
        holder = inbox.format(extra=" For now the waiting list is simply the emails people send us.")
    body = body.replace("{{LIST_HOLDER}}", holder)
    if page.get("faq"):
        body = body.replace("{{FAQ}}", faq_html(page["faq"]))
    if page.get("questions"):
        parts = json.load(open(os.path.join(HERE, "content", page["questions"]), encoding="utf-8"))
        qhtml, n = questions_html(parts)
        body = body.replace("{{QUESTIONS}}", qhtml)
        page["question_count"] = n
    crumbs = ('<div class="crumbs gutter"><div class="wrap"><a href="{rel}">Home</a> / {c}</div></div>').format(rel=rel, c=esc(page["crumb"]))
    names = page.get("script") or []
    if isinstance(names, str):
        names = [names]
    script = "".join('<script src="{rel}assets/{s}" defer></script>\n'.format(rel=rel, s=n) for n in names)
    doc = (head(page["title"], page["description"], url, BASE + "og/" + page["slug"] + ".png", rel, graph(page, url),
                robots='<meta name="robots" content="noindex">\n' if step(page) else "")
           + "<body>\n" + nav(rel, page["slug"], pages) + "\n" + crumbs + "\n<main>\n" + body.strip() + "\n</main>\n"
           + ("" if aside(page) else offer(rel, page["slug"], pages) + "\n") + footer(rel, pages) + "\n" + script + "</body>\n</html>\n")
    out_dir = os.path.join(SITE, page["slug"])
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8").write(doc)
    return url


def build_home(pages):
    """The home page is the product page: hero with the product screen, the three steps, the features,
    then every free tool one click away and the contact block. Its styles and script are home.css and home.js."""
    raw = open(os.path.join(HERE, "home.html"), encoding="utf-8").read()
    first, body = raw.split("\n", 1)
    meta = json.loads(first)
    check("home", meta["title"], meta["description"])
    all_pages = pages
    pages = [p for p in pages if not aside(p)]  # the privacy page is linked from the footer, not shown as a tool
    cards = "\n    ".join(
        '<a href="{slug}/"><span class="tag">{tag}</span><b>{name}</b><span class="sub">{sub}</span><span class="go">Open</span></a>'.format(
            slug=p["slug"], tag=esc(p["tag"]), name=esc(p["og_title"]), sub=esc(p["card_sub"])) for p in pages)
    body = body.replace("{{TOOLS}}", cards).replace("{{EMAIL}}", CONTACT)
    body = body.replace("{{WAITLIST_TOP}}", waitlist_html(1, '<a class="btn btn-ghost" href="#how">See how it works</a>'))
    body = body.replace("{{WAITLIST_END}}", waitlist_html(2))
    ld = json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "Organization", "@id": ORG_ID, "name": BRAND, "url": BASE},
        {"@type": "WebSite", "@id": SITE_ID, "url": BASE, "name": BRAND, "publisher": {"@id": ORG_ID}, "inLanguage": "en-GB"},
        {"@type": "WebPage", "@id": BASE + "#page", "url": BASE, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": SITE_ID}, "inLanguage": "en-GB", "dateModified": TODAY},
        {"@type": "ItemList", "name": "Free tools", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": p["og_title"], "url": BASE + p["slug"] + "/"} for i, p in enumerate(pages)]}]},
        ensure_ascii=False, indent=1)
    doc = (head(meta["title"], meta["description"], BASE, BASE + "og/home.png", "", ld,
                extra='<link rel="stylesheet" href="assets/home.css">\n')
           + "<body class=\"home\">\n" + nav("", None, pages) + "\n<main>\n" + body.strip() + "\n</main>\n" + footer("", all_pages)
           + '\n<script src="assets/home.js" defer></script>\n</body>\n</html>\n')
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(doc)
    return meta


def build_404(pages):
    links = "".join('<li><a href="/{slug}/">{name}</a></li>'.format(slug=p["slug"], name=esc(p["og_title"])) for p in pages if not aside(p))
    ld = json.dumps({"@context": "https://schema.org", "@type": "WebPage", "name": "Page not found"})
    body = ('<section class="page-head gutter" style="padding-top:44px;"><div class="wrap">\n'
            '  <h1>That page is not here.</h1>\n  <p class="lede">It may have moved. These are the pages people usually want.</p>\n'
            '</div></section>\n<section class="prose gutter" style="border-top:0; padding-top:0;"><div class="wrap">\n'
            '  <ul><li><a href="/">Home</a></li>' + links + '</ul>\n</div></section>')
    doc = (head("Page not found | The Alignment Plan", "This page could not be found.", BASE + "404.html", BASE + "og/home.png", "/", ld,
                robots='<meta name="robots" content="noindex">\n')
           + "<body>\n" + nav("/", None, pages) + "\n<main>\n" + body + "\n</main>\n" + footer("/", pages) + "\n</body>\n</html>\n")
    open(os.path.join(SITE, "404.html"), "w", encoding="utf-8").write(doc)


def main():
    pages = load_fragments()
    urls = [BASE]
    home = build_home(pages)
    build_404(pages)
    for p in pages:
        u = build_page(p, pages)
        if not step(p):
            urls.append(u)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += ["  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>".format(u=u, d=TODAY) for u in urls]
    sm.append("</urlset>")
    open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm) + "\n")
    open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8").write("User-agent: *\nAllow: /\n\nSitemap: " + BASE + "sitemap.xml\n")
    open(os.path.join(SITE, "CNAME"), "w", encoding="utf-8").write(DOMAIN + "\n")
    # No .nojekyll file on purpose: GitHub Pages' default build leaves out folders that start
    # with an underscore, which keeps _build/ off the public site (the First Light site works the same way).
    nj = os.path.join(SITE, ".nojekyll")
    if os.path.exists(nj):
        os.remove(nj)
    # House rule: no em or en dashes anywhere in the published pages.
    for path in [os.path.join(SITE, "index.html")] + [os.path.join(SITE, p["slug"], "index.html") for p in pages]:
        text = open(path, encoding="utf-8").read()
        for ch, name in (("—", "em dash"), ("–", "en dash")):
            if ch in text:
                problems.append(os.path.relpath(path, SITE) + ": contains an " + name)
    for p in pages:
        words = len(re.sub(r"<[^>]+>", " ", p["body"]).split())
        print("built /{slug}/  title {t} chars, description {d} chars, about {w} words in the body{q}".format(
            slug=p["slug"], t=len(p["title"]), d=len(p["description"]), w=words,
            q=", {} questions".format(p["question_count"]) if p.get("question_count") else ""))
    print("built /  title {} chars, description {} chars".format(len(home["title"]), len(home["description"])))
    # No orphans: every page must be linked from the home page and from at least one other page.
    home_html = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
    slugs = {p["slug"] for p in pages}
    for p in pages:
        if step(p):
            continue  # reached from Kit, not from our own links
        for x in p.get("related", []):
            if x not in slugs:
                problems.append("/" + p["slug"] + "/ lists a related page that does not exist: " + x)
        if 'href="' + p["slug"] + '/"' not in home_html:
            problems.append("home does not link to /" + p["slug"] + "/")
        inbound = sum(1 for q in pages if q["slug"] != p["slug"] and
                      ("../" + p["slug"] + "/") in open(os.path.join(SITE, q["slug"], "index.html"), encoding="utf-8").read())
        if inbound == 0:
            problems.append("/" + p["slug"] + "/ has no link from another page")
    print("sitemap: {} addresses, base {}".format(len(urls), BASE))
    if problems:
        print("\nPROBLEMS:")
        for x in problems:
            print(" -", x)
        sys.exit(1)


if __name__ == "__main__":
    main()
