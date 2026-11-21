/* The Alignment Plan: small helpers for drawing a card on a canvas and saving it as an image.
   Used by the vision board and the bingo card. Nothing here talks to a server. */
(function () {
  "use strict";
  var DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
  var BODY = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';

  function font(weight, size, family) { return weight + " " + size + "px " + family; }

  // Break text into lines no wider than maxW. A single word that is too long is split with a hyphen.
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    lines.split = false;
    words.forEach(function (w) {
      while (w.length > 2 && ctx.measureText(w).width > maxW) {
        lines.split = true;
        var cut = w.length - 1;
        while (cut > 1 && ctx.measureText(w.slice(0, cut) + "-").width > maxW) cut--;
        if (cur) { lines.push(cur); cur = ""; }
        lines.push(w.slice(0, cut) + "-");
        w = w.slice(cut);
      }
      var trial = cur ? cur + " " + w : w;
      if (ctx.measureText(trial).width <= maxW) cur = trial;
      else { if (cur) lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // The largest size from max down to min at which the text fits inside maxW by maxH.
  // A size that keeps every word whole is preferred over a larger one that splits a word.
  function fit(ctx, text, weight, family, maxW, maxH, max, min, ratio) {
    ratio = ratio || 1.14;
    for (var pass = 0; pass < 2; pass++) {
      for (var size = max; size >= min; size -= 2) {
        ctx.font = font(weight, size, family);
        var lines = wrap(ctx, text, maxW);
        if ((pass || !lines.split) && lines.length * size * ratio <= maxH) return { size: size, lines: lines, lh: size * ratio };
      }
    }
    ctx.font = font(weight, min, family);
    var all = wrap(ctx, text, maxW), room = Math.max(1, Math.floor(maxH / (min * ratio)));
    if (all.length > room) {
      all = all.slice(0, room);
      all[room - 1] = all[room - 1].replace(/.{0,2}$/, "") + "…";
    }
    return { size: min, lines: all, lh: min * ratio };
  }

  // Rounded rectangle path.
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function spacing(ctx, px) { try { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; } catch (e) {} }

  // Wait for the two site fonts so canvas text does not fall back to Arial.
  function fonts(cb) {
    var called = false;
    function go() { if (!called) { called = true; cb(); } }
    try {
      if (!document.fonts || !document.fonts.load) return go();
      Promise.all([
        document.fonts.load('800 40px "Bricolage Grotesque"'),
        document.fonts.load('700 40px "Bricolage Grotesque"'),
        document.fonts.load('600 20px "Instrument Sans"'),
        document.fonts.load('500 20px "Instrument Sans"')
      ]).then(go, go);
      window.setTimeout(go, 2500);
    } catch (e) { go(); }
  }

  // Hand the picture to the person: the share sheet on a phone (so it can go to Photos), a download elsewhere.
  function save(canvas, name, done) {
    function download(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      if (done) done("saved");
    }
    try {
      canvas.toBlob(function (blob) {
        if (!blob) { if (done) done("failed"); return; }
        var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        var file = null;
        try { file = new File([blob], name, { type: "image/png" }); } catch (e) { file = null; }
        if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(
            function () { if (done) done("shared"); },
            function (err) { if (err && err.name === "AbortError") { if (done) done("cancelled"); } else download(blob); });
        } else download(blob);
      }, "image/png");
    } catch (e) { if (done) done("failed"); }
  }

  window.APCanvas = { DISPLAY: DISPLAY, BODY: BODY, font: font, wrap: wrap, fit: fit, rr: rr, spacing: spacing, fonts: fonts, save: save };
})();
