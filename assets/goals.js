/* The Alignment Plan: yearly goals template.
   One focus, up to three goals, a step for every month up to each goal's finish.
   Everything is kept in this browser with localStorage. Nothing is sent anywhere. */
(function () {
  "use strict";
  var KEY = "ap-goals-v1";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var grid = document.getElementById("goals-grid");
  if (!grid) return;
  var focus = document.getElementById("focus");
  var status = document.getElementById("save-status");

  var state;
  try { state = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || typeof state !== "object" || !Array.isArray(state.goals) || state.goals.length !== 3) {
    state = { focus: "", goals: [blankGoal(8), blankGoal(5), blankGoal(11)] };
  }
  function blankGoal(by) { return { name: "", by: by, steps: ["", "", "", "", "", "", "", "", "", "", "", ""] }; }

  var timer;
  function save() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      var ok = true;
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { ok = false; }
      status.textContent = ok ? "Saved in this browser" : "Not saved: this browser is blocking storage";
    }, 400);
  }

  function render() {
    grid.innerHTML = "";
    state.goals.forEach(function (g, gi) {
      var card = document.createElement("div"); card.className = "goal-card";
      var lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = "Goal " + (gi + 1) + (gi ? " (optional)" : "");
      var row = document.createElement("div"); row.className = "row";
      var name = document.createElement("input"); name.type = "text"; name.value = g.name; name.maxLength = 80;
      name.placeholder = ["Launch to ten customers", "Feel fit again", "Three months of savings"][gi];
      name.setAttribute("aria-label", "Goal " + (gi + 1));
      name.addEventListener("input", function () { g.name = name.value; save(); });
      var by = document.createElement("select"); by.setAttribute("aria-label", "Finish goal " + (gi + 1) + " by");
      LONG.forEach(function (m, mi) { var o = document.createElement("option"); o.value = mi; o.textContent = "by " + m; by.appendChild(o); });
      by.value = g.by;
      by.addEventListener("change", function () { g.by = +by.value; save(); render(); });
      row.appendChild(name); row.appendChild(by);
      var list = document.createElement("div"); list.className = "steps-list";
      for (var mi = 0; mi <= g.by; mi++) {
        (function (mi) {
          var l = document.createElement("label");
          var s = document.createElement("span"); s.textContent = MONTHS[mi];
          var inp = document.createElement("input"); inp.type = "text"; inp.value = g.steps[mi] || ""; inp.maxLength = 90;
          inp.placeholder = mi === g.by ? "Done" : "One step";
          inp.setAttribute("aria-label", "Goal " + (gi + 1) + ", step for " + LONG[mi]);
          inp.addEventListener("input", function () { g.steps[mi] = inp.value; save(); });
          l.appendChild(s); l.appendChild(inp); list.appendChild(l);
        })(mi);
      }
      card.appendChild(lbl); card.appendChild(row); card.appendChild(list);
      grid.appendChild(card);
    });
  }

  focus.value = state.focus || "";
  focus.addEventListener("input", function () { state.focus = focus.value; save(); });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete your focus, goals and steps from this browser? This cannot be undone.")) return;
    state = { focus: "", goals: [blankGoal(8), blankGoal(5), blankGoal(11)] };
    focus.value = "";
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    render(); status.textContent = "Template cleared";
  });
  render();
})();
