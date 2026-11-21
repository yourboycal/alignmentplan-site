# The Alignment Plan: site build

The site is plain static files. Everything in `site/` except `_build/` is what gets published.

## Rebuild after any change

```
python3 site/_build/build.py
python3 site/_build/og.py
```

`build.py` stops with a list of problems if a title is over 60 characters, a description is over 155, a page contains an em or en dash, or a page has no link from the home page or from another page.

## Where things are

- `content/*.html`: one file per page. The first line is the page's settings (address, title, description, FAQ). The rest is the page body.
- `content/reflection-questions.questions.json`: the 45 questions and the line under each one.
- `../assets/site.css`: the one shared stylesheet.
- `../assets/wheel.js`, `reflect.js`, `goals.js`, `board.js`, `planner.js`, `bingo.js`, `prompts.js`, `audit.js`: one script per tool. All save to the visitor's own browser. Nothing is sent to a server.
- `../assets/canvas-kit.js`: shared helpers for the two tools that save a picture (vision board, bingo card).
- `home.html`: the home page. It is a hub that lists every page in `content/`, so a new page appears on it without any editing.
- `contact.txt`: the public contact email shown on the home page. One line.
- The product page with the mock-up screens (`reflections-pitch/index.html`) is not part of this site. It stays private for now.

## The address

`BASE` at the top of `build.py` is the only place the web address is written. It is set to https://alignmentplan.com/. Change it there if the domain changes, then rebuild.

## Adding a page

Copy a file in `content/`, change the first line, write the body, run both scripts. The home page, footer, sitemap and share image update themselves.

Settings on the first line worth knowing:

- `"in_nav": false` keeps a page out of the top menu. The menu only has room for four, so new pages should set this.
- `"nav_short"` is a shorter name for the top menu. The footer uses `"nav"`.
- `"order"` sets where the page appears on the home page.
- `"related": ["slug-a", "slug-b"]` picks the two pages shown in the block at the bottom.
- `"script"` can be one file name or a list.
- `"kind": "guide"` marks a written guide with sources (the two how-to guides). It adds article details for search engines. Give it `"published": "2026-11-21"` (the day it first went up) and leave that date alone when you edit the guide later.

## Putting changes online

The site lives in its own git repository inside `site/` and is hosted on GitHub Pages (repository `yourboycal/alignmentplan-site`, branch `main`). After a rebuild:

```
cd site
git add -A
git commit -m "Say what changed"
git push
```

The live site updates about a minute after the push. GitHub leaves out any folder that starts with an underscore, so `_build/` is stored in the repository but never served. Do not add a `.nojekyll` file: that would switch this off.

`meta.py` changes the first line of a page from Python, which avoids hand-editing a long line of JSON.

## Each year

- `year-planner`: add the new year's bank holidays to `HOLS` in `planner.js` from gov.uk/bank-holidays, add the year to the select, and update the title, the bank holiday table and the "at a glance" list.
- `bingo-card`, `vision-board`, `journal-prompts`: change 2027 to the new year in the titles, headings and default text. Do it in September, not December.
