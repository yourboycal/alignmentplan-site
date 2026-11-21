/* The Alignment Plan: printable year planner.
   Two layouts (a wall planner with a column for each month, or twelve month grids), UK bank holidays,
   and your own dates. Everything is kept in this browser with localStorage. Nothing is sent anywhere. */
(function () {
  "use strict";
  var box = document.getElementById("planner");
  if (!box) return;
  var KEY = "ap-planner-v1";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var REGIONS = { ew: "England and Wales", sc: "Scotland", ni: "Northern Ireland" };
  // Bank holidays as published at gov.uk/bank-holidays, read on 20 November 2026.
  var HOLS = {
    ew: {
      2027: { "01-01": "New Year's Day", "03-26": "Good Friday", "03-29": "Easter Monday", "05-03": "Early May bank holiday", "05-31": "Spring bank holiday", "08-30": "Summer bank holiday", "12-27": "Christmas Day (substitute)", "12-28": "Boxing Day (substitute)" },
      2028: { "01-03": "New Year's Day (substitute)", "04-14": "Good Friday", "04-17": "Easter Monday", "05-01": "Early May bank holiday", "05-29": "Spring bank holiday", "08-28": "Summer bank holiday", "12-25": "Christmas Day", "12-26": "Boxing Day" }
    },
    sc: {
      2027: { "01-01": "New Year's Day", "01-04": "2nd January (substitute)", "03-26": "Good Friday", "05-03": "Early May bank holiday", "05-31": "Spring bank holiday", "08-02": "Summer bank holiday", "11-30": "St Andrew's Day", "12-27": "Christmas Day (substitute)", "12-28": "Boxing Day (substitute)" },
      2028: { "01-03": "New Year's Day (substitute)", "01-04": "2nd January (substitute)", "04-14": "Good Friday", "05-01": "Early May bank holiday", "05-29": "Spring bank holiday", "08-07": "Summer bank holiday", "11-30": "St Andrew's Day", "12-25": "Christmas Day", "12-26": "Boxing Day" }
    },
    ni: {
      2027: { "01-01": "New Year's Day", "03-17": "St Patrick's Day", "03-26": "Good Friday", "03-29": "Easter Monday", "05-03": "Early May bank holiday", "05-31": "Spring bank holiday", "07-12": "Battle of the Boyne", "08-30": "Summer bank holiday", "12-27": "Christmas Day (substitute)", "12-28": "Boxing Day (substitute)" },
      2028: { "01-03": "New Year's Day (substitute)", "03-17": "St Patrick's Day", "04-14": "Good Friday", "04-17": "Easter Monday", "05-01": "Early May bank holiday", "05-29": "Spring bank holiday", "07-12": "Battle of the Boyne", "08-28": "Summer bank holiday", "12-25": "Christmas Day", "12-26": "Boxing Day" }
    }
  };

  var yearSel = document.getElementById("p-year");
  var regionSel = document.getElementById("p-region");
  var focusIn = document.getElementById("p-focus");
  var layoutBtns = Array.prototype.slice.call(document.querySelectorAll("[data-layout]"));
  var dateIn = document.getElementById("p-date");
  var labelIn = document.getElementById("p-label");
  var chips = document.getElementById("p-chips");
  var keyBox = document.getElementById("p-key");
  var headYear = document.getElementById("p-head-year");
  var headFocus = document.getElementById("p-head-focus");
  var credit = document.getElementById("p-credit");
  var status = document.getElementById("save-status");
  var toast = document.getElementById("toast");

  var state = null;
  try { state = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || typeof state !== "object") state = {};
  if (state.year !== 2028) state.year = 2027;
  if (state.layout !== "wall" && state.layout !== "grid") state.layout = window.innerWidth < 700 ? "grid" : "wall";
  if (!REGIONS[state.region] && state.region !== "none") state.region = "ew";
  if (typeof state.focus !== "string") state.focus = "";
  if (!Array.isArray(state.dates)) state.dates = [];
  state.dates = state.dates.filter(function (x) { return x && /^\d{4}-\d{2}-\d{2}$/.test(x.d) && typeof x.label === "string"; });

  function save() {
    var ok = true;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { ok = false; }
    status.textContent = ok ? "Saved in this browser" : "Not saved: this browser is blocking storage";
  }
  function say(msg) { toast.textContent = msg; window.clearTimeout(say.t); say.t = window.setTimeout(function () { toast.textContent = ""; }, 5000); }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function daysIn(m) { return new Date(state.year, m + 1, 0).getDate(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function hols() { return state.region === "none" ? {} : (HOLS[state.region][state.year] || {}); }
  function mine() {
    var out = {};
    state.dates.forEach(function (x) { if (+x.d.slice(0, 4) === state.year) { var k = x.d.slice(5); out[k] = out[k] ? out[k] + ", " + x.label : x.label; } });
    return out;
  }
  function nice(key) { var m = +key.slice(0, 2) - 1, d = +key.slice(3); return DAYS[new Date(state.year, m, d).getDay()] + " " + d + " " + MONTHS[m]; }

  function wall(h, own) {
    var t = el("table", "wall");
    t.setAttribute("aria-label", state.year + " wall planner: a column for each month and a row for each day");
    var head = el("thead"), hr = el("tr");
    MONTHS.forEach(function (m) { var th = el("th", null, m); th.scope = "col"; hr.appendChild(th); });
    head.appendChild(hr); t.appendChild(head);
    var body = el("tbody");
    for (var d = 1; d <= 31; d++) {
      var tr = el("tr");
      for (var m = 0; m < 12; m++) {
        var td = el("td");
        if (d > daysIn(m)) { td.className = "none"; tr.appendChild(td); continue; }
        var dow = new Date(state.year, m, d).getDay(), key = two(m + 1) + "-" + two(d);
        var cls = [];
        if (dow === 0 || dow === 6) cls.push("we");
        var label = "";
        if (h[key]) { cls.push("bh"); label = h[key]; }
        if (own[key]) { cls.push("mine"); label = own[key]; }
        td.className = cls.join(" ");
        td.appendChild(el("span", "d", DOW[dow] + " " + d));
        if (label) { td.appendChild(el("span", "t", label)); td.title = nice(key) + ": " + (own[key] && h[key] ? own[key] + " (" + h[key] + ")" : label); }
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    t.appendChild(body);
    return t;
  }

  function grid(h, own) {
    var wrap = el("div", "months");
    MONTHS.forEach(function (name, m) {
      var card = el("div", "month");
      card.appendChild(el("h3", null, name));
      var t = el("table", "mini"), head = el("thead"), hr = el("tr");
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach(function (dn) {
        var th = el("th", null, dn.charAt(0)); th.scope = "col"; th.setAttribute("aria-label", dn); hr.appendChild(th);
      });
      head.appendChild(hr); t.appendChild(head);
      var body = el("tbody"), tr = el("tr");
      var lead = (new Date(state.year, m, 1).getDay() + 6) % 7; // Monday first
      for (var i = 0; i < lead; i++) tr.appendChild(el("td"));
      for (var d = 1; d <= daysIn(m); d++) {
        var col = (lead + d - 1) % 7;
        if (col === 0 && d > 1) { body.appendChild(tr); tr = el("tr"); }
        var key = two(m + 1) + "-" + two(d), td = el("td", null, String(d)), cls = [];
        if (col > 4) cls.push("we");
        if (h[key]) { cls.push("bh"); td.title = nice(key) + ": " + h[key]; }
        if (own[key]) { cls.push("mine"); td.title = nice(key) + ": " + own[key]; }
        td.className = cls.join(" ");
        tr.appendChild(td);
      }
      while (tr.children.length < 7) tr.appendChild(el("td"));
      body.appendChild(tr); t.appendChild(body); card.appendChild(t); wrap.appendChild(card);
    });
    return wrap;
  }

  function render() {
    var h = hols(), own = mine();
    box.innerHTML = "";
    box.appendChild(state.layout === "wall" ? wall(h, own) : grid(h, own));
    document.body.classList.toggle("wall-print", state.layout === "wall");
    headYear.textContent = state.year + " year planner";
    headFocus.textContent = state.focus.trim();
    credit.textContent = (state.region === "none" ? "" : "Bank holidays shown for " + REGIONS[state.region] + ", from gov.uk. ") + "Made with The Alignment Plan.";

    keyBox.innerHTML = "";
    Object.keys(own).sort().forEach(function (k) { var li = el("li", "mine"); li.appendChild(el("b", null, nice(k))); li.appendChild(document.createTextNode(" " + own[k])); keyBox.appendChild(li); });
    Object.keys(h).sort().forEach(function (k) { var li = el("li", "bh"); li.appendChild(el("b", null, nice(k))); li.appendChild(document.createTextNode(" " + h[k])); keyBox.appendChild(li); });

    chips.innerHTML = "";
    state.dates.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).forEach(function (x) {
      if (+x.d.slice(0, 4) !== state.year) return;
      var li = el("li");
      li.appendChild(el("span", null, +x.d.slice(8) + " " + MONTHS[+x.d.slice(5, 7) - 1].slice(0, 3) + ": " + x.label));
      var rm = el("button", null, "×"); rm.type = "button"; rm.setAttribute("aria-label", "Remove " + x.label);
      rm.addEventListener("click", function () { state.dates.splice(state.dates.indexOf(x), 1); save(); render(); });
      li.appendChild(rm); chips.appendChild(li);
    });
    dateIn.min = state.year + "-01-01"; dateIn.max = state.year + "-12-31";
    layoutBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-layout") === state.layout)); });
  }

  yearSel.value = String(state.year);
  regionSel.value = state.region;
  focusIn.value = state.focus;
  yearSel.addEventListener("change", function () { state.year = +yearSel.value === 2028 ? 2028 : 2027; dateIn.value = ""; save(); render(); });
  regionSel.addEventListener("change", function () { state.region = regionSel.value; save(); render(); });
  var timer;
  focusIn.addEventListener("input", function () { state.focus = focusIn.value; headFocus.textContent = state.focus.trim(); window.clearTimeout(timer); timer = window.setTimeout(save, 400); });
  layoutBtns.forEach(function (b) { b.addEventListener("click", function () { state.layout = b.getAttribute("data-layout"); save(); render(); }); });

  document.getElementById("p-add").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var d = dateIn.value, label = labelIn.value.replace(/\s+/g, " ").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || +d.slice(0, 4) !== state.year) { say("Choose a date in " + state.year + "."); dateIn.focus(); return; }
    if (!label) { say("Give the date a name, such as a birthday or a deadline."); labelIn.focus(); return; }
    if (state.dates.length >= 60) { say("That is 60 dates, which is the most this planner holds."); return; }
    state.dates.push({ d: d, label: label.slice(0, 28) });
    labelIn.value = ""; save(); render(); say("Added " + nice(d.slice(5)) + ".");
  });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("clear").addEventListener("click", function () {
    if (!state.dates.length && !state.focus) { say("There is nothing to clear."); return; }
    if (!window.confirm("Delete your dates and your focus line from this browser? This cannot be undone.")) return;
    state.dates = []; state.focus = ""; focusIn.value = ""; save(); render(); say("Cleared.");
  });

  render();
})();
