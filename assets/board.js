/* The Alignment Plan: vision board maker.
   Eight squares around a centre square. Each takes a few words, a photo, or both.
   Words are kept in this browser with localStorage. Photos are shrunk on the device and kept there too.
   Nothing is uploaded. The board is drawn on a canvas so the picture you save is the picture you see. */
(function () {
  "use strict";
  var K = window.APCanvas;
  var canvas = document.getElementById("board");
  if (!canvas || !K) return;
  var ctx = canvas.getContext("2d");
  var KEY = "ap-board-v1", IMG = "ap-board-v1-img-";
  var DEFAULT = ["Career", "Money", "Health", "Family and friends", "Love", "Personal growth", "Fun", "Home"];
  var HINTS = ["Work I am proud of", "Three months of savings", "Run 5k without stopping", "Sunday lunch, every month",
    "A weekend away, just us", "Hold a conversation in Spanish", "A tent, a lake, no phone", "A table that seats eight"];
  var TINT = ["#e8edff", "#fff0dc", "#e1f6e8", "#fff0dc", "#e8edff", "#e1f6e8", "#e8edff", "#fff0dc"];
  var INKS = ["#1d3aa6", "#9a5203", "#1a6b35", "#9a5203", "#1d3aa6", "#1a6b35", "#1d3aa6", "#9a5203"];
  var POS = [0, 1, 2, 3, 5, 6, 7, 8];
  var INK = "#15151b", INK2 = "#5f5f6a", PAPER2 = "#f6f6f2";

  var toast = document.getElementById("toast");
  var list = document.getElementById("tiles");
  var titleIn = document.getElementById("b-title");
  var wordIn = document.getElementById("b-word");
  var shapeBtns = Array.prototype.slice.call(document.querySelectorAll("[data-shape]"));
  var imgs = [null, null, null, null, null, null, null, null];
  var mode = null; // null, "export" or "blank"

  function fresh() {
    var labels = DEFAULT.slice();
    // If the wheel of life has been renamed on this device, start from the same eight names.
    try {
      var w = JSON.parse(window.localStorage.getItem("ap-wheel-v1"));
      if (w && Array.isArray(w.labels) && w.labels.length === 8) labels = w.labels.map(function (l, i) { return String(l || DEFAULT[i]).slice(0, 18); });
    } catch (e) {}
    return { title: "2027", word: "", shape: "board", tiles: labels.map(function (l) { return { label: l, text: "" }; }) };
  }
  var state = null;
  try { state = JSON.parse(window.localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || typeof state !== "object" || !Array.isArray(state.tiles) || state.tiles.length !== 8) state = fresh();
  if (state.shape !== "phone") state.shape = "board";

  function say(msg) { toast.textContent = msg; window.clearTimeout(say.t); say.t = window.setTimeout(function () { toast.textContent = ""; }, 6000); }
  var timer;
  function save() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 400);
  }

  function draw() {
    var phone = state.shape === "phone";
    var W = 1080, H = phone ? 1920 : 1350;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    canvas.className = phone ? "phone" : "";
    var pad = 44, gap = 16, top = phone ? 400 : pad, bottom = phone ? 200 : 84;
    var tw = (W - pad * 2 - gap * 2) / 3, th = (H - top - bottom - gap * 2) / 3;
    var blank = mode === "blank";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = blank ? "#ffffff" : PAPER2;
    ctx.fillRect(0, 0, W, H);
    function box(p) { return { x: pad + (p % 3) * (tw + gap), y: top + Math.floor(p / 3) * (th + gap) }; }

    state.tiles.forEach(function (t, i) {
      var b = box(POS[i]), x = b.x, y = b.y, img = blank ? null : imgs[i];
      var text = blank ? "" : String(t.text || "").trim();
      ctx.save();
      K.rr(ctx, x, y, tw, th, 26); ctx.clip();
      if (blank) { ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, tw, th); }
      else if (img) {
        var s = Math.max(tw / img.naturalWidth, th / img.naturalHeight);
        var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.drawImage(img, x + (tw - dw) / 2, y + (th - dh) / 2, dw, dh);
        var g = ctx.createLinearGradient(0, y + th * 0.3, 0, y + th);
        g.addColorStop(0, "rgba(21,21,27,0)"); g.addColorStop(1, "rgba(21,21,27,0.82)");
        ctx.fillStyle = g; ctx.fillRect(x, y, tw, th);
      } else { ctx.fillStyle = TINT[i]; ctx.fillRect(x, y, tw, th); }
      ctx.restore();
      if (blank) { K.rr(ctx, x + 1, y + 1, tw - 2, th - 2, 26); ctx.strokeStyle = "#8a8a94"; ctx.lineWidth = 2; ctx.stroke(); }

      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      var label = String(t.label || DEFAULT[i]).toUpperCase(), size = 21;
      K.spacing(ctx, 1.5);
      ctx.font = K.font(600, size, K.BODY);
      while (size > 13 && ctx.measureText(label).width > tw - 44) { size -= 1; ctx.font = K.font(600, size, K.BODY); }
      var f = null;
      if (text) { K.spacing(ctx, 0); f = K.fit(ctx, text, 800, K.DISPLAY, tw - 44, th * (img ? 0.44 : 0.62), img ? 40 : 46, 24); }
      var textTop = f ? y + th - 26 - (f.lines.length - 1) * f.lh : 0;
      // The name of the square: over a photo it sits just above the words, otherwise at the top.
      K.spacing(ctx, 1.5);
      ctx.font = K.font(600, size, K.BODY);
      if (img) { ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillText(label, x + 22, f ? textTop - f.size - 8 : y + th - 26); }
      else { ctx.fillStyle = blank ? INK2 : INKS[i]; ctx.fillText(label, x + 22, y + 44); }
      K.spacing(ctx, 0);
      if (f) {
        ctx.font = K.font(800, f.size, K.DISPLAY);
        ctx.fillStyle = img ? "#ffffff" : INK;
        f.lines.forEach(function (line, n) { ctx.fillText(line, x + 22, textTop + n * f.lh); });
      } else if (!img && !mode) {
        ctx.font = K.font(500, 22, K.BODY); ctx.fillStyle = INK2;
        K.wrap(ctx, "Add words or a photo", tw - 44).forEach(function (line, n, a) { ctx.fillText(line, x + 22, y + th - 26 - (a.length - 1 - n) * 28); });
      }
    });

    // The centre square: the year, and a word for it.
    var c = box(4), cx = c.x + tw / 2;
    K.rr(ctx, c.x, c.y, tw, th, 26);
    if (blank) { ctx.fillStyle = "#ffffff"; ctx.fill(); K.rr(ctx, c.x + 1, c.y + 1, tw - 2, th - 2, 26); ctx.strokeStyle = "#8a8a94"; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.fillStyle = INK; ctx.fill(); }
    ["#3457d5", "#f08a1d", "#2a9d4f"].forEach(function (col, n) {
      ctx.beginPath(); ctx.arc(cx - 26 + n * 26, c.y + 52, 9, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    });
    var title = String(state.title || "").trim() || "2027";
    var word = blank ? "" : String(state.word || "").trim();
    ctx.textAlign = "center";
    var ft = K.fit(ctx, title, 800, K.DISPLAY, tw - 40, th * 0.36, 124, 34, 1.02);
    var fw = word ? K.fit(ctx, word, 700, K.DISPLAY, tw - 44, th * 0.2, 44, 22) : null;
    var blockH = ft.lines.length * ft.lh + (fw ? 14 + fw.lines.length * fw.lh : 0);
    var ty = c.y + th / 2 - blockH / 2 + 26 + ft.size * 0.82;
    ctx.font = K.font(800, ft.size, K.DISPLAY); ctx.fillStyle = blank ? INK : "#ffffff";
    ft.lines.forEach(function (line, n) { ctx.fillText(line, cx, ty + n * ft.lh); });
    if (fw) {
      var wy = ty + (ft.lines.length - 1) * ft.lh + 18 + fw.size;
      ctx.font = K.font(700, fw.size, K.DISPLAY); ctx.fillStyle = "#f6a04a";
      fw.lines.forEach(function (line, n) { ctx.fillText(line, cx, wy + n * fw.lh); });
    }

    ctx.font = K.font(600, 22, K.BODY); ctx.fillStyle = INK2;
    ctx.fillText(blank ? "My vision board. Made with The Alignment Plan." : "The Alignment Plan", W / 2, H - (phone ? 130 : 32));
    ctx.textAlign = "left";

    canvas.setAttribute("aria-label", "Your vision board for " + title + (word ? ", " + word : "") + ". " + state.tiles.map(function (t, i) {
      return t.label + ": " + ((t.text || "").trim() || (imgs[i] ? "a photo" : "empty"));
    }).join(". ") + ".");
  }

  function addPhoto(i, file, after) {
    if (!file || !/^image\//.test(file.type || "")) { say("That file is not a picture. Choose a JPG or PNG."); return; }
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      var s = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var data;
      try { data = c.toDataURL("image/jpeg", 0.82); } catch (e) { say("That picture could not be read."); return; }
      var kept = true;
      try { window.localStorage.setItem(IMG + i, data); } catch (e) { kept = false; }
      setImage(i, data, function () {
        say(kept ? "Photo added. It stays on this device." : "Photo added, but this browser could not keep it. Save your board as an image before you leave.");
        if (after) after();
      });
    };
    im.onerror = function () { URL.revokeObjectURL(url); say("That picture could not be opened. Try a JPG or PNG."); };
    im.src = url;
  }
  function setImage(i, data, cb) {
    var im = new Image();
    im.onload = function () { imgs[i] = im; draw(); if (cb) cb(); };
    im.onerror = function () { imgs[i] = null; if (cb) cb(); };
    im.src = data;
  }

  function build() {
    list.innerHTML = "";
    state.tiles.forEach(function (t, i) {
      var card = document.createElement("div"); card.className = "tile-ed";
      var top = document.createElement("div"); top.className = "top";
      var name = document.createElement("input"); name.type = "text"; name.className = "name"; name.maxLength = 18; name.value = t.label;
      name.setAttribute("aria-label", "Name of square " + (i + 1));
      var text = document.createElement("input"); text.type = "text"; text.maxLength = 60; text.value = t.text || ""; text.placeholder = HINTS[i];
      function relabel() { text.setAttribute("aria-label", "What you want for " + t.label); }
      relabel();
      name.addEventListener("input", function () { t.label = name.value; draw(); save(); });
      name.addEventListener("change", function () { t.label = name.value.replace(/\s+/g, " ").trim() || DEFAULT[i]; name.value = t.label; relabel(); draw(); save(); });
      text.addEventListener("input", function () { t.text = text.value; draw(); save(); });
      var file = document.createElement("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true; file.tabIndex = -1;
      var add = document.createElement("button"); add.type = "button"; add.className = "btn btn-ghost btn-small";
      var remove = document.createElement("button"); remove.type = "button"; remove.className = "linkish"; remove.textContent = "Remove photo";
      function buttons() {
        add.textContent = imgs[i] ? "Change photo" : "Add photo";
        add.setAttribute("aria-label", (imgs[i] ? "Change the photo for " : "Add a photo for ") + t.label);
        remove.hidden = !imgs[i];
      }
      add.addEventListener("click", function () { file.click(); });
      file.addEventListener("change", function () { addPhoto(i, file.files && file.files[0], buttons); file.value = ""; });
      remove.addEventListener("click", function () {
        imgs[i] = null; try { window.localStorage.removeItem(IMG + i); } catch (e) {}
        buttons(); draw(); say("Photo removed.");
      });
      card._buttons = buttons;
      var acts = document.createElement("span"); acts.className = "acts"; acts.appendChild(remove); acts.appendChild(add);
      top.appendChild(name); top.appendChild(acts);
      card.appendChild(top); card.appendChild(text); card.appendChild(file);
      list.appendChild(card);
      buttons();
    });
  }
  function refreshButtons() { Array.prototype.forEach.call(list.children, function (c) { if (c._buttons) c._buttons(); }); }

  function setShape(shape) {
    state.shape = shape === "phone" ? "phone" : "board";
    shapeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-shape") === state.shape)); });
    draw(); save();
  }
  shapeBtns.forEach(function (b) { b.addEventListener("click", function () { setShape(b.getAttribute("data-shape")); }); });

  titleIn.value = state.title || "2027";
  wordIn.value = state.word || "";
  titleIn.addEventListener("input", function () { state.title = titleIn.value; draw(); save(); });
  wordIn.addEventListener("input", function () { state.word = wordIn.value; draw(); save(); });

  document.getElementById("save-image").addEventListener("click", function () {
    mode = "export"; draw();
    var name = "vision-board-" + (String(state.title || "2027").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "2027") + (state.shape === "phone" ? "-wallpaper" : "") + ".png";
    K.save(canvas, name, function (how) {
      if (how === "saved") say("Saved as " + name + ". Look in your downloads.");
      else if (how === "shared") say("Done. Choose Save Image to keep it in your photos.");
      else if (how === "failed") say("Your browser would not make the image. Try Print, then Save as PDF.");
    });
    mode = null; draw();
  });
  function printAs(m) { mode = m; draw(); window.print(); }
  document.getElementById("print").addEventListener("click", function () { printAs("export"); });
  document.getElementById("print-blank").addEventListener("click", function () { printAs("blank"); });
  window.addEventListener("afterprint", function () { if (mode) { mode = null; draw(); } });

  document.getElementById("clear").addEventListener("click", function () {
    if (!window.confirm("Delete your words and photos from this browser and start again? This cannot be undone.")) return;
    try { window.localStorage.removeItem(KEY); for (var i = 0; i < 8; i++) window.localStorage.removeItem(IMG + i); } catch (e) {}
    imgs = [null, null, null, null, null, null, null, null];
    state = fresh(); titleIn.value = state.title; wordIn.value = "";
    build(); setShape("board"); say("Cleared. A fresh board.");
  });

  build();
  setShape(state.shape);
  K.fonts(draw);
  for (var n = 0; n < 8; n++) (function (i) {
    var data = null;
    try { data = window.localStorage.getItem(IMG + i); } catch (e) {}
    if (data) setImage(i, data, refreshButtons);
  })(n);
})();
