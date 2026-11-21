/* The Alignment Plan: reflection questions.
   Answers are kept in this browser with localStorage. Nothing is sent anywhere. */
(function () {
  "use strict";
  var KEY = "ap-reflect-v1";
  var fields = Array.prototype.slice.call(document.querySelectorAll("textarea[data-q]"));
  if (!fields.length) return;
  var count = document.getElementById("count");
  var bar = document.getElementById("bar");
  var status = document.getElementById("save-status");
  var answers = {};
  var canSave = true;

  try { answers = JSON.parse(window.localStorage.getItem(KEY)) || {}; } catch (e) { answers = {}; }
  if (typeof answers !== "object" || Array.isArray(answers)) answers = {};

  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(answers)); canSave = true; }
    catch (e) { canSave = false; }
    status.textContent = canSave ? "Saved in this browser" : "Not saved: this browser is blocking storage";
  }
  function progress() {
    var done = fields.filter(function (f) { return f.value.trim().length > 0; }).length;
    count.textContent = done + " of " + fields.length + " answered";
    bar.style.width = (100 * done / fields.length).toFixed(1) + "%";
  }
  function fit(f) { f.style.height = "auto"; f.style.height = Math.max(76, f.scrollHeight + 2) + "px"; }

  var timer;
  fields.forEach(function (f) {
    var id = f.getAttribute("data-q");
    if (typeof answers[id] === "string") f.value = answers[id];
    fit(f);
    f.addEventListener("input", function () {
      answers[id] = f.value; fit(f); progress();
      window.clearTimeout(timer); timer = window.setTimeout(save, 400);
    });
  });
  progress();

  document.getElementById("print").addEventListener("click", function () { fields.forEach(fit); window.print(); });
  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete all your answers from this browser? This cannot be undone.")) return;
    answers = {}; fields.forEach(function (f) { f.value = ""; fit(f); });
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    progress(); status.textContent = "Answers deleted";
  });
})();
