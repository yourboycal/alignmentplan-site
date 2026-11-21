/* The Alignment Plan: life audit worksheet.
   Eight areas. For each: a score, what is working, what is not, and one change.
   Kept in this browser with localStorage. Nothing is sent anywhere.
   If the wheel of life has been used on this device, the audit starts from its area names and scores. */
(function () {
  "use strict";
  var grid = document.getElementById("audit");
  if (!grid) return;
  var KEY = "ap-audit-v1";
  var DEFAULT = ["Career", "Money", "Health", "Family and friends", "Love", "Personal growth", "Fun", "Home"];
  var HINTS = ["Is your work worthwhile, and is it going where you want?", "Can you cover what you need, and do you feel in control?",
    "Body, sleep, energy and mood.", "Do you see the people who matter, and are things in good repair?",
    "Your partner, or how you feel about not having one.", "Are you still getting better at something?",
    "When did you last do something only because you enjoy it?", "Does the space around you help, or get in your way?"];
  var result = document.getElementById("a-result");
  var status = document.getElementById("save-status");
  var note = document.getElementById("a-note");

  var labels = DEFAULT.slice(), wheelScores = null;
  try {
    var w = JSON.parse(window.localStorage.getItem("ap-wheel-v1"));
    if (w && Array.isArray(w.labels) && w.labels.length === 8) labels = w.labels.map(function (l, i) { return String(l || DEFAULT[i]); });
    if (w && Array.isArray(w.draft) && w.draft.length === 8) wheelScores = w.draft.map(clamp);
  } catch (e) {}

  function clamp(v) { v = Math.round(+v); if (!(v >= 1)) v = 1; if (v > 10) v = 10; return v; }
  function fresh(scores) { return { areas: DEFAULT.map(function (_, i) { return { s: scores ? scores[i] : 5, w: "", n: "", c: "" }; }) }; }
  var state = null;
  try { state = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || typeof state !== "object" || !Array.isArray(state.areas) || state.areas.length !== 8) {
    state = fresh(wheelScores);
    if (wheelScores && note) note.hidden = false;
  }
  state.areas = state.areas.map(function (a) { a = a || {}; return { s: clamp(a.s), w: String(a.w || ""), n: String(a.n || ""), c: String(a.c || "") }; });

  var timer;
  function save() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      var ok = true;
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { ok = false; }
      status.textContent = ok ? "Saved in this browser" : "Not saved: this browser is blocking storage";
    }, 400);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fit(t) { t.style.height = "auto"; t.style.height = Math.max(64, t.scrollHeight + 2) + "px"; }

  function build() {
    grid.innerHTML = "";
    state.areas.forEach(function (a, i) {
      var card = el("div", "audit-card");
      card.appendChild(el("h3", null, labels[i]));
      if (labels[i] === DEFAULT[i]) card.appendChild(el("p", "note", HINTS[i]));
      var row = el("div", "slider");
      var id = "a-score-" + i;
      var lab = el("label", null, "Score out of 10"); lab.htmlFor = id;
      var out = el("output", null, String(a.s)); out.htmlFor = id;
      var range = document.createElement("input"); range.type = "range"; range.id = id; range.min = 1; range.max = 10; range.step = 1; range.value = a.s;
      range.addEventListener("input", function () { a.s = clamp(range.value); out.textContent = a.s; summarise(); save(); });
      row.appendChild(lab); row.appendChild(out); row.appendChild(range); card.appendChild(row);
      [["w", "What is working", "The part you would keep"], ["n", "What is not", "The part you would change"]].forEach(function (f) {
        var fid = "a-" + f[0] + "-" + i;
        var l = el("label", "lbl", f[1]); l.htmlFor = fid;
        var t = document.createElement("textarea"); t.id = fid; t.rows = 2; t.maxLength = 400; t.value = a[f[0]]; t.placeholder = f[2];
        t.addEventListener("input", function () { a[f[0]] = t.value; fit(t); save(); });
        card.appendChild(l); card.appendChild(t);
        window.setTimeout(function () { fit(t); }, 0);
      });
      var cid = "a-c-" + i;
      var cl = el("label", "lbl", "One change"); cl.htmlFor = cid;
      var c = document.createElement("input"); c.type = "text"; c.id = cid; c.maxLength = 90; c.value = a.c; c.placeholder = "Small enough to start this month"; c.autocomplete = "off";
      c.addEventListener("input", function () { a.c = c.value; summarise(); save(); });
      card.appendChild(cl); card.appendChild(c);
      grid.appendChild(card);
    });
  }

  function summarise() {
    var order = state.areas.map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) { return x.a.s - y.a.s || x.i - y.i; });
    var avg = state.areas.reduce(function (t, a) { return t + a.s; }, 0) / 8;
    var gap = order[7].a.s - order[0].a.s;
    var written = state.areas.filter(function (a) { return a.c.trim(); }).length;
    result.innerHTML = "";
    var box = el("div", "result");
    var head, body;
    if (gap === 0) {
      head = "Every area is at " + order[0].a.s + ".";
      body = "Move each score until it feels true for the last few months. An audit where everything scores the same has not started yet.";
    } else {
      head = "Start with " + labels[order[0].i] + " (" + order[0].a.s + ") and " + labels[order[1].i] + " (" + order[1].a.s + ").";
      body = "Your average is " + avg.toFixed(1) + " and your strongest area is " + labels[order[7].i] + " (" + order[7].a.s + "). " +
        (written ? "You have written a change for " + written + " of 8 areas. " : "") +
        "Pick one change from your lowest areas and do that first. One change that happens beats eight that do not.";
    }
    box.appendChild(el("b", null, head)); box.appendChild(el("p", null, body));
    result.appendChild(box);

    var bars = el("div", "bars");
    bars.setAttribute("role", "img");
    bars.setAttribute("aria-label", "Your scores. " + state.areas.map(function (a, i) { return labels[i] + " " + a.s; }).join(", ") + ".");
    state.areas.forEach(function (a, i) {
      var r = el("div", "bar-row");
      r.appendChild(el("span", "name", labels[i]));
      var track = el("span", "track"), fill = el("i", a.s <= 4 ? "low" : (a.s >= 8 ? "high" : ""));
      fill.style.width = (a.s * 10) + "%"; track.appendChild(fill); r.appendChild(track);
      r.appendChild(el("span", "num", String(a.s)));
      bars.appendChild(r);
    });
    result.appendChild(bars);

    if (gap > 0) {
      var top = el("div", "next-steps");
      top.appendChild(el("span", "lbl", "Your three to act on"));
      var ol = el("ol");
      order.slice(0, 3).forEach(function (o) {
        var li = el("li");
        li.appendChild(el("b", null, labels[o.i] + " (" + o.a.s + "): "));
        li.appendChild(document.createTextNode(o.a.c.trim() || "no change written yet"));
        ol.appendChild(li);
      });
      top.appendChild(ol); result.appendChild(top);
    }
  }

  var blank = false;
  document.getElementById("print").addEventListener("click", function () {
    Array.prototype.forEach.call(grid.querySelectorAll("textarea"), fit);
    window.print();
  });
  document.getElementById("print-blank").addEventListener("click", function () { blank = true; document.body.classList.add("print-blank"); window.print(); });
  window.addEventListener("afterprint", function () { if (blank) { blank = false; document.body.classList.remove("print-blank"); } });
  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete your audit from this browser? This cannot be undone.")) return;
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    state = fresh(null); if (note) note.hidden = true;
    build(); summarise(); status.textContent = "Audit deleted";
  });

  build(); summarise();
})();
