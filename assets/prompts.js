/* The Alignment Plan: journal prompts.
   The 52 prompts are the lists written on the page. This script picks one for the current week,
   offers another at random, and keeps what you write in this browser with localStorage. */
(function () {
  "use strict";
  var text = document.getElementById("pp-text");
  var items = Array.prototype.slice.call(document.querySelectorAll("ol.prompts li"));
  if (!text || !items.length) return;
  var KEY = "ap-prompts-v1";
  var NAMES = { "new-year": "new year", "reflection": "self reflection", "growth": "self growth", "stuck": "when you feel stuck", "gratitude": "gratitude", "year-end": "end of year" };
  var prompts = items.map(function (li, i) { return { n: i + 1, text: li.textContent.replace(/\s+/g, " ").trim(), theme: li.parentNode.getAttribute("data-theme"), li: li }; });
  var kicker = document.getElementById("pp-kicker");
  var answer = document.getElementById("pp-answer");
  var themeSel = document.getElementById("pp-theme");
  var status = document.getElementById("save-status");
  var toast = document.getElementById("toast");
  var current = null;

  var answers = {};
  try { answers = JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { answers = {}; }
  if (typeof answers !== "object" || Array.isArray(answers)) answers = {};

  function say(msg) { toast.textContent = msg; window.clearTimeout(say.t); say.t = window.setTimeout(function () { toast.textContent = ""; }, 4000); }
  // ISO week number: weeks start on Monday and week 1 holds the first Thursday of the year.
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - start) / 86400000 + 1) / 7);
  }
  var thisWeek = Math.min(52, Math.max(1, isoWeek(new Date())));

  function mark() { prompts.forEach(function (p) { p.li.classList.toggle("answered", !!(answers[p.n] && answers[p.n].trim())); }); }
  function show(n) {
    current = prompts[n - 1];
    text.textContent = current.text;
    kicker.textContent = (current.n === thisWeek ? "This week's prompt, week " + current.n + " of 52" : "Prompt " + current.n + " of 52") + ", " + NAMES[current.theme];
    answer.value = typeof answers[current.n] === "string" ? answers[current.n] : "";
    fit();
  }
  function fit() { answer.style.height = "auto"; answer.style.height = Math.max(130, answer.scrollHeight + 2) + "px"; }

  var timer;
  answer.addEventListener("input", function () {
    if (!current) return;
    answers[current.n] = answer.value; fit();
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      var ok = true;
      try { window.localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { ok = false; }
      status.textContent = ok ? "Saved in this browser" : "Not saved: this browser is blocking storage";
      mark();
    }, 400);
  });

  document.getElementById("pp-random").addEventListener("click", function () {
    var theme = themeSel.value;
    var pool = prompts.filter(function (p) { return (!theme || p.theme === theme) && p !== current; });
    if (!pool.length) return;
    show(pool[Math.floor(Math.random() * pool.length)].n);
  });
  themeSel.addEventListener("change", function () {
    var theme = themeSel.value;
    if (theme && current && current.theme !== theme) { var first = prompts.filter(function (p) { return p.theme === theme; })[0]; if (first) show(first.n); }
  });
  document.getElementById("pp-week").addEventListener("click", function () { themeSel.value = ""; show(thisWeek); });
  document.getElementById("pp-copy").addEventListener("click", function () {
    var t = current.text;
    var done = function () { say("Prompt copied."); };
    var fallback = function () { window.prompt("Copy this prompt:", t); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete everything you have written here from this browser? This cannot be undone.")) return;
    answers = {}; try { window.localStorage.removeItem(KEY); } catch (e) {}
    answer.value = ""; fit(); mark(); status.textContent = "Deleted";
  });

  mark();
  show(thisWeek);
})();
