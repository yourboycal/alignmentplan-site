/* The Alignment Plan: interactive wheel of life.
   No account and no server. Scores are kept in this browser with localStorage.
   A wheel can also be shared as a link: the eight scores travel in the address. */
(function () {
  "use strict";
  var KEY = "ap-wheel-v1";
  var DEFAULT_LABELS = ["Career", "Money", "Health", "Family and friends", "Love", "Personal growth", "Fun", "Home"];
  var NS = "http://www.w3.org/2000/svg";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var svg = document.getElementById("wheel");
  if (!svg) return;
  var slidersBox = document.getElementById("sliders");
  var resultBox = document.getElementById("result");
  var toast = document.getElementById("toast");
  var compareSel = document.getElementById("compare");
  var savedBox = document.getElementById("saved");
  var editGrid = document.getElementById("edit-grid");
  var legendThen = document.getElementById("legend-then");

  var store = load();
  var labels = store.labels.slice();
  var now = store.draft ? store.draft.slice() : [5, 5, 5, 5, 5, 5, 5, 5];
  var compareId = null;
  var blank = false;

  // A shared link wins over the saved draft.
  var fromLink = readLink();
  if (fromLink) now = fromLink;

  function load() {
    var s = null;
    try { s = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== "object") s = {};
    if (!Array.isArray(s.labels) || s.labels.length !== 8) s.labels = DEFAULT_LABELS.slice();
    if (!Array.isArray(s.entries)) s.entries = [];
    if (!Array.isArray(s.draft) || s.draft.length !== 8) s.draft = null;
    return s;
  }
  function persist() {
    store.labels = labels.slice();
    store.draft = now.slice();
    try { window.localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch (e) { return false; }
  }
  function clamp(v) { v = Math.round(+v); if (!(v >= 1)) v = 1; if (v > 10) v = 10; return v; }
  function readLink() {
    var m = /[#&]w=([0-9-]+)/.exec(window.location.hash || "");
    if (!m) return null;
    var parts = m[1].split("-").map(clamp);
    return parts.length === 8 ? parts : null;
  }
  function monthId(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function monthName(id) { var p = id.split("-"); return MONTHS[+p[1] - 1] + " " + p[0]; }
  function say(msg) { toast.textContent = msg; window.clearTimeout(say.t); say.t = window.setTimeout(function () { toast.textContent = ""; }, 4000); }

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // Split a long area name over two lines so the labels stay large on a phone.
  function wrap(name) {
    if (name.length <= 12 || name.indexOf(" ") < 0) return [name];
    var mid = name.length / 2, best = -1;
    for (var i = 0; i < name.length; i++) if (name.charAt(i) === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    return [name.slice(0, best), name.slice(best + 1)];
  }

  function draw() {
    var cx = 220, cy = 200, R = 112, font = 16, lh = 18;
    svg.setAttribute("viewBox", "0 0 440 400");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    function pt(i, v) {
      var a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
      var r = (v / 10) * R;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function poly(vals) { return vals.map(function (v, i) { return pt(i, v).map(function (n) { return n.toFixed(1); }).join(","); }).join(" "); }
    for (var ring = 2; ring <= 10; ring += 2) {
      svg.appendChild(el("circle", { cx: cx, cy: cy, r: (ring / 10) * R, fill: "none", stroke: "#6b6259", "stroke-opacity": 0.25, "stroke-width": 1 }));
    }
    [5, 10].forEach(function (n) {
      svg.appendChild(el("text", { x: cx + 4, y: cy - (n / 10) * R + 13, fill: "#6b6259", "font-size": 11, "font-family": "Instrument Sans, Arial, sans-serif" }, String(n)));
    });
    labels.forEach(function (name, i) {
      var p = pt(i, 10);
      svg.appendChild(el("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: "#6b6259", "stroke-opacity": 0.35, "stroke-width": 1 }));
      var lp = pt(i, 11.1);
      var middle = Math.abs(lp[0] - cx) < 10;
      var anchor = middle ? "middle" : (lp[0] < cx ? "end" : "start");
      var lines = wrap(name);
      var y;
      if (middle && lp[1] < cy) y = lp[1] - 4 - (lines.length - 1) * lh;      // top: stack upwards
      else if (middle) y = lp[1] + font;                                       // bottom: stack downwards
      else y = lp[1] + font * 0.35 - (lines.length - 1) * lh / 2;              // sides: centre on the spoke
      var t = el("text", { x: lp[0].toFixed(1), y: y.toFixed(1), "text-anchor": anchor, fill: "#26211c", "font-size": font, "font-family": "Instrument Sans, Arial, sans-serif", "font-weight": 600 });
      lines.forEach(function (line, n) { t.appendChild(el("tspan", { x: lp[0].toFixed(1), dy: n ? lh : 0 }, line)); });
      svg.appendChild(t);
      // A long custom name is shrunk to fit inside the picture instead of being cut off.
      try {
        var box = t.getBBox();
        var room = anchor === "start" ? 436 - lp[0] : (anchor === "end" ? lp[0] - 4 : 2 * Math.min(lp[0] - 4, 436 - lp[0]));
        if (box.width > room && box.width > 0) t.setAttribute("font-size", Math.max(8, Math.floor(font * room / box.width * 10) / 10));
      } catch (e) {}
    });
    if (blank) return;
    var cmp = entryById(compareId);
    if (cmp) svg.appendChild(el("polygon", { points: poly(cmp.scores), fill: "#4458d6", "fill-opacity": 0.16, stroke: "#4458d6", "stroke-width": 1.5 }));
    svg.appendChild(el("polygon", { points: poly(now), fill: "#2a8452", "fill-opacity": 0.28, stroke: "#2a8452", "stroke-width": 2.5 }));
    now.forEach(function (v, i) { var p = pt(i, v); svg.appendChild(el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 4.5, fill: "#2a8452" })); });
    svg.setAttribute("aria-label", "Your wheel of life. " + labels.map(function (l, i) { return l + " " + now[i]; }).join(", ") + ".");
  }

  function entryById(id) {
    for (var i = 0; i < store.entries.length; i++) if (store.entries[i].id === id) return store.entries[i];
    return null;
  }

  function buildSliders() {
    slidersBox.innerHTML = "";
    labels.forEach(function (name, i) {
      var row = document.createElement("div"); row.className = "slider";
      var id = "area-" + i;
      var label = document.createElement("label"); label.htmlFor = id; label.textContent = name;
      var out = document.createElement("output"); out.id = id + "-out"; out.htmlFor = id; out.textContent = now[i];
      var input = document.createElement("input");
      input.type = "range"; input.id = id; input.min = 1; input.max = 10; input.step = 1; input.value = now[i];
      input.addEventListener("input", function () {
        now[i] = clamp(input.value); out.textContent = now[i];
        draw(); summarise(); persist();
      });
      row.appendChild(label); row.appendChild(out); row.appendChild(input);
      slidersBox.appendChild(row);
    });
  }

  function summarise() {
    var order = now.map(function (v, i) { return { v: v, i: i }; }).sort(function (a, b) { return a.v - b.v || a.i - b.i; });
    var avg = now.reduce(function (a, b) { return a + b; }, 0) / 8;
    var low = order[0], low2 = order[1], high = order[7];
    var gap = high.v - low.v;
    var head, body;
    if (gap === 0) {
      head = "An even wheel at " + low.v + ".";
      body = "Every area has the same score. Move each slider until it feels true for this month, not for a good week.";
    } else {
      head = "Lowest: " + labels[low.i] + " (" + low.v + ") and " + labels[low2.i] + " (" + low2.v + ").";
      body = "Your average is " + avg.toFixed(1) + " and the gap between your highest and lowest area is " + gap + " points. " +
        (gap >= 5 ? "That is a lopsided wheel. One low area is usually pulling on the others." : "That is a fairly even wheel.") +
        " Pick one low area to work on this month, not all of them.";
    }
    var cmp = entryById(compareId);
    if (cmp) {
      var ups = [], downs = [];
      now.forEach(function (v, i) { var d = v - cmp.scores[i]; if (d > 0) ups.push(labels[i] + " +" + d); if (d < 0) downs.push(labels[i] + " " + d); });
      body += " Since " + monthName(cmp.id) + ": " + (ups.length ? "up in " + ups.join(", ") : "nothing is up") + "; " + (downs.length ? "down in " + downs.join(", ") : "nothing is down") + ".";
    }
    resultBox.innerHTML = "";
    var b = document.createElement("b"); b.textContent = head;
    var p = document.createElement("p"); p.textContent = body;
    resultBox.appendChild(b); resultBox.appendChild(p);
  }

  function refreshSaved() {
    var thisMonth = monthId(new Date());
    store.entries.sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    compareSel.innerHTML = "";
    var none = document.createElement("option"); none.value = ""; none.textContent = "Nothing";
    compareSel.appendChild(none);
    store.entries.forEach(function (e) {
      var o = document.createElement("option"); o.value = e.id; o.textContent = monthName(e.id) + (e.id === thisMonth ? " (saved this month)" : "");
      compareSel.appendChild(o);
    });
    if (compareId && !entryById(compareId)) compareId = null;
    compareSel.value = compareId || "";
    savedBox.hidden = store.entries.length === 0;
    legendThen.hidden = !compareId;
    if (compareId) legendThen.textContent = monthName(compareId);
  }

  // Start by comparing with the most recent earlier month, if there is one.
  (function () {
    var thisMonth = monthId(new Date());
    var earlier = store.entries.filter(function (e) { return e.id < thisMonth; }).sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    if (earlier.length) compareId = earlier[0].id;
  })();

  document.getElementById("save").addEventListener("click", function () {
    var id = monthId(new Date());
    var existing = entryById(id);
    if (existing) { existing.scores = now.slice(); existing.date = new Date().toISOString(); }
    else store.entries.push({ id: id, date: new Date().toISOString(), scores: now.slice() });
    var ok = persist();
    refreshSaved();
    say(ok ? (existing ? "Updated your wheel for " + monthName(id) + "." : "Saved for " + monthName(id) + ". Come back next month and rate again.") : "Your browser would not save it. Private windows often block this. Copy the link instead.");
  });

  compareSel.addEventListener("change", function () {
    compareId = compareSel.value || null;
    refreshSaved(); draw(); summarise();
  });

  document.getElementById("forget").addEventListener("click", function () {
    if (!window.confirm("Delete every saved month from this browser? This cannot be undone.")) return;
    store.entries = []; compareId = null; persist(); refreshSaved(); draw(); summarise(); say("Saved months deleted.");
  });

  document.getElementById("copy").addEventListener("click", function () {
    var url = window.location.href.split("#")[0] + "#w=" + now.join("-");
    var done = function () { say("Link copied. It opens this exact wheel."); };
    var fallback = function () { window.prompt("Copy this link:", url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  });

  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("print-blank").addEventListener("click", function () {
    blank = true; document.body.classList.add("print-blank"); draw();
    window.print();
  });
  window.addEventListener("afterprint", function () {
    if (!blank) return;
    blank = false; document.body.classList.remove("print-blank"); draw();
  });

  function buildEdit() {
    editGrid.innerHTML = "";
    labels.forEach(function (name, i) {
      var input = document.createElement("input");
      input.type = "text"; input.value = name; input.maxLength = 18; input.setAttribute("aria-label", "Name of area " + (i + 1));
      input.addEventListener("change", function () {
        var v = input.value.replace(/\s+/g, " ").trim();
        labels[i] = v || DEFAULT_LABELS[i]; input.value = labels[i];
        persist(); buildSliders(); draw(); summarise();
      });
      editGrid.appendChild(input);
    });
  }
  document.getElementById("reset-areas").addEventListener("click", function () {
    labels = DEFAULT_LABELS.slice(); persist(); buildEdit(); buildSliders(); draw(); summarise();
  });

  buildSliders(); buildEdit(); refreshSaved(); draw(); summarise();
})();
