/* The Alignment Plan: goals bingo card.
   A 3, 4 or 5 square card. Write a goal in each square, tap a square when it is done.
   Kept in this browser with localStorage. Nothing is sent anywhere. */
(function () {
  "use strict";
  var card = document.getElementById("bingo");
  if (!card) return;
  var K = window.APCanvas;
  var KEY = "ap-bingo-v1";
  // The idea bank is the list of ideas written on the page itself, so the two cannot drift apart.
  var IDEAS = Array.prototype.map.call(document.querySelectorAll("[data-ideas] li"), function (li) { return li.textContent.replace(/\s+/g, " ").trim(); });
  var titleBox = document.getElementById("bingo-title");
  var titleIn = document.getElementById("g-title");
  var list = document.getElementById("squares");
  var result = document.getElementById("result");
  var toast = document.getElementById("toast");
  var sizeBtns = Array.prototype.slice.call(document.querySelectorAll("[data-size]"));
  var DEFAULT_TITLE = "My 2027 bingo card";

  function fresh() {
    var cells = [];
    for (var i = 0; i < 25; i++) cells.push({ t: "", done: false });
    cells[12] = { t: "Free square", done: true };
    return { title: DEFAULT_TITLE, size: 5, cells: cells };
  }
  var state = null;
  try { state = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || typeof state !== "object" || !Array.isArray(state.cells) || state.cells.length !== 25) state = fresh();
  if ([3, 4, 5].indexOf(state.size) < 0) state.size = 5;
  state.cells = state.cells.map(function (c) { return { t: String((c && c.t) || "").slice(0, 40), done: !!(c && c.done) }; });

  var timer;
  function save() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 300);
  }
  function say(msg) { toast.textContent = msg; window.clearTimeout(say.t); say.t = window.setTimeout(function () { toast.textContent = ""; }, 6000); }
  function count() { return state.size * state.size; }
  function live() { return state.cells.slice(0, count()); }

  // Every complete row, column and diagonal, as lists of square numbers.
  function lines() {
    var n = state.size, all = [], i, j, row, col, d1 = [], d2 = [];
    for (i = 0; i < n; i++) {
      row = []; col = [];
      for (j = 0; j < n; j++) { row.push(i * n + j); col.push(j * n + i); }
      all.push({ name: "row " + (i + 1), at: row }); all.push({ name: "column " + (i + 1), at: col });
      d1.push(i * n + i); d2.push(i * n + (n - 1 - i));
    }
    all.push({ name: "a diagonal", at: d1 }); all.push({ name: "the other diagonal", at: d2 });
    return all.filter(function (l) { return l.at.every(function (k) { return state.cells[k].done && state.cells[k].t.trim(); }); });
  }

  function renderCard() {
    var n = state.size, done = lines(), inLine = {};
    done.forEach(function (l) { l.at.forEach(function (k) { inLine[k] = true; }); });
    card.style.setProperty("--n", n);
    card.setAttribute("data-n", n);
    card.innerHTML = "";
    live().forEach(function (c, i) {
      var b = document.createElement("button"); b.type = "button";
      var text = c.t.trim();
      var span = document.createElement("span"); span.textContent = text;
      b.appendChild(span);
      if (!text) { b.className = "empty"; b.setAttribute("aria-label", "Square " + (i + 1) + " is empty. Press to write it."); }
      else { b.setAttribute("aria-pressed", String(c.done)); if (inLine[i]) b.className = "line"; }
      b.addEventListener("click", function () {
        if (!c.t.trim()) { var inp = list.querySelectorAll("input")[i]; if (inp) inp.focus(); return; }
        c.done = !c.done; save(); renderCard();
        var after = card.querySelectorAll("button")[i]; if (after) after.focus();
      });
      card.appendChild(b);
    });
    titleBox.textContent = state.title.trim() || DEFAULT_TITLE;
    fitCells();

    var filled = live().filter(function (c) { return c.t.trim(); }).length;
    var ticked = live().filter(function (c) { return c.t.trim() && c.done; }).length;
    var head, body;
    if (!filled) { head = "An empty card."; body = "Write a goal in each square, or press \"Fill empty squares with ideas\" and change the ones that are not you."; }
    else if (filled < count()) { head = filled + " of " + count() + " squares written."; body = "Fill the rest, then tap a square on the card each time you finish one."; }
    else if (ticked === count()) { head = "Full house. Every square is done."; body = "That is the whole card. Time to make a harder one."; }
    else {
      head = ticked + " of " + count() + " done" + (done.length ? ", and " + done.length + (done.length === 1 ? " line" : " lines") + " complete." : ".");
      body = done.length ? "Bingo: " + done.map(function (l) { return l.name; }).join(", ") + ". Keep going for a full house."
        : "Tap a square on the card when you finish it. A full row, column or diagonal is a bingo.";
    }
    result.innerHTML = "";
    var hb = document.createElement("b"); hb.textContent = head;
    var p = document.createElement("p"); p.textContent = body;
    result.appendChild(hb); result.appendChild(p);
  }

  var measure = null;
  try { measure = document.createElement("canvas").getContext("2d"); } catch (e) { measure = null; }
  // A long goal is set a little smaller so it is never cut off inside its square.
  function fitCells() {
    Array.prototype.forEach.call(card.querySelectorAll("button"), function (b) {
      var span = b.firstChild; b.style.fontSize = "";
      var cs = window.getComputedStyle(b), size = parseFloat(cs.fontSize) || 11, room = b.clientHeight - 4;
      var words = span.textContent.split(/\s+/), wide = span.clientWidth;
      // Too tall for the square, or one word too wide for it: step the size down.
      function tooWide() {
        if (!measure) return false;
        measure.font = cs.fontWeight + " " + size + "px " + cs.fontFamily;
        return words.some(function (w) { return measure.measureText(w).width > wide; });
      }
      while (size > 8.5 && (span.getBoundingClientRect().height > room || tooWide())) { size -= 0.5; b.style.fontSize = size + "px"; }
    });
  }
  var resizeTimer;
  window.addEventListener("resize", function () { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(fitCells, 150); });

  function renderList() {
    list.innerHTML = "";
    live().forEach(function (c, i) {
      var l = document.createElement("label");
      var s = document.createElement("span"); s.textContent = i + 1;
      var inp = document.createElement("input"); inp.type = "text"; inp.maxLength = 40; inp.value = c.t;
      inp.setAttribute("aria-label", "Square " + (i + 1)); inp.autocomplete = "off";
      inp.addEventListener("input", function () { c.t = inp.value; if (!c.t.trim()) c.done = false; save(); renderCard(); });
      l.appendChild(s); l.appendChild(inp); list.appendChild(l);
    });
  }
  function all() { renderList(); renderCard(); sizeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-size") === state.size)); }); }

  sizeBtns.forEach(function (b) { b.addEventListener("click", function () { state.size = +b.getAttribute("data-size"); save(); all(); }); });
  titleIn.value = state.title;
  titleIn.addEventListener("input", function () { state.title = titleIn.value; titleBox.textContent = state.title.trim() || DEFAULT_TITLE; save(); });

  document.getElementById("fill").addEventListener("click", function () {
    var used = {}, pool, added = 0;
    live().forEach(function (c) { used[c.t.trim().toLowerCase()] = true; });
    pool = IDEAS.filter(function (x) { return !used[x.toLowerCase()]; });
    live().forEach(function (c) {
      if (c.t.trim() || !pool.length) return;
      c.t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; c.done = false; added++;
    });
    save(); all();
    say(added ? "Filled " + added + (added === 1 ? " square" : " squares") + ". Change any that are not you." : "Every square already has something in it.");
  });
  document.getElementById("shuffle").addEventListener("click", function () {
    var n = count(), mid = state.size % 2 ? (n - 1) / 2 : -1, idx = [], i, j, tmp;
    for (i = 0; i < n; i++) if (i !== mid) idx.push(i);
    var vals = idx.map(function (k) { return state.cells[k]; });
    for (i = vals.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); tmp = vals[i]; vals[i] = vals[j]; vals[j] = tmp; }
    idx.forEach(function (k, m) { state.cells[k] = vals[m]; });
    save(); all(); say("Shuffled." + (mid >= 0 ? " The middle square stays where it is." : ""));
  });

  // The picture to save or share: the same card, drawn on a canvas.
  function picture() {
    var n = state.size, W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d"), INK = "#211e1b";
    x.fillStyle = "#efe9e1"; x.fillRect(0, 0, W, H);
    ["#7a3b4e", "#c98a2b", "#3f6b55"].forEach(function (col, k) { x.beginPath(); x.arc(W / 2 - 30 + k * 30, 70, 10, 0, Math.PI * 2); x.fillStyle = col; x.fill(); });
    x.textAlign = "center"; x.textBaseline = "alphabetic";
    var ft = K.fit(x, state.title.trim() || DEFAULT_TITLE, 800, K.DISPLAY, W - 140, 132, 80, 36, 1.05);
    x.font = K.font(800, ft.size, K.DISPLAY); x.fillStyle = INK;
    var ty = 110 + (132 - ft.lines.length * ft.lh) / 2 + ft.size * 0.86;
    ft.lines.forEach(function (line, k) { x.fillText(line, W / 2, ty + k * ft.lh); });
    var side = 984, gx = 48, gy = 262, gap = 10, cell = (side - gap * (n - 1)) / n;
    var max = { 3: 46, 4: 38, 5: 30 }[n];
    live().forEach(function (sq, i) {
      var cx = gx + (i % n) * (cell + gap), cy = gy + Math.floor(i / n) * (cell + gap), text = sq.t.trim(), on = text && sq.done;
      K.rr(x, cx, cy, cell, cell, 18); x.fillStyle = on ? "#3f6b55" : "#ffffff"; x.fill();
      if (!on) { K.rr(x, cx + 1.5, cy + 1.5, cell - 3, cell - 3, 18); x.strokeStyle = "#d8d8d2"; x.lineWidth = 3; x.stroke(); }
      if (!text) return;
      var f = K.fit(x, text, 600, K.BODY, cell - 26, cell - 26, max, 16, 1.18);
      x.font = K.font(600, f.size, K.BODY); x.fillStyle = on ? "#ffffff" : INK;
      var y0 = cy + cell / 2 - (f.lines.length * f.lh) / 2 + f.size * 0.82;
      f.lines.forEach(function (line, k) { x.fillText(line, cx + cell / 2, y0 + k * f.lh); });
    });
    x.font = K.font(600, 22, K.BODY); x.fillStyle = "#6a6259";
    x.fillText("The Alignment Plan", W / 2, H - 40);
    return c;
  }
  document.getElementById("save-image").addEventListener("click", function () {
    if (!K) { say("Your browser could not make the image. Try Print, then Save as PDF."); return; }
    K.fonts(function () {
      K.save(picture(), "2027-bingo-card.png", function (how) {
        if (how === "saved") say("Saved as 2027-bingo-card.png. Look in your downloads.");
        else if (how === "shared") say("Done. Choose Save Image to keep it in your photos.");
        else if (how === "failed") say("Your browser would not make the image. Try Print, then Save as PDF.");
      });
    });
  });

  var blank = false;
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("print-blank").addEventListener("click", function () { blank = true; document.body.classList.add("print-blank"); window.print(); });
  // Printed squares are larger than on screen, so the print stylesheet sets the text size, not the fitting above.
  window.addEventListener("beforeprint", function () { Array.prototype.forEach.call(card.querySelectorAll("button"), function (b) { b.style.fontSize = ""; }); });
  window.addEventListener("afterprint", function () { if (blank) { blank = false; document.body.classList.remove("print-blank"); } fitCells(); });

  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete this card from this browser and start again? This cannot be undone.")) return;
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    state = fresh(); titleIn.value = state.title; all(); say("Cleared. A fresh card.");
  });

  all();
})();
