/* Home page: draws the two life wheels in the product screens and wires the sliders under the big one.
   The eight areas are the same standard coaching areas the wheel of life tool uses. */
(function () {
  var areas = ["Career", "Money", "Health", "Family and friends", "Love", "Personal growth", "Fun", "Home"];
  var dec = [8, 5, 4, 7, 6, 6, 5, 7];
  var now = [8, 5, 6, 7, 6, 7, 4, 7];
  var NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  /* Colours and line weights come from home.css (the wh- classes), so the wheel follows whichever screen it sits in. */
  function drawWheel(svg, cx, cy, R, fontSize, labelR) {
    function pt(i, v) {
      var a = -Math.PI / 2 + (i / areas.length) * Math.PI * 2;
      var r = (v / 10) * R;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function poly(vals) { return vals.map(function (v, i) { return pt(i, v).join(","); }).join(" "); }
    for (var ring = 2; ring <= 10; ring += 2) svg.appendChild(el("circle", { cx: cx, cy: cy, r: (ring / 10) * R, "class": "wh-ring" }));
    areas.forEach(function (name, i) {
      var p = pt(i, 10);
      svg.appendChild(el("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], "class": "wh-spoke" }));
      if (!fontSize) return;
      var lp = pt(i, labelR);
      var anchor = Math.abs(lp[0] - cx) < 10 ? "middle" : (lp[0] < cx ? "end" : "start");
      svg.appendChild(el("text", { x: lp[0], y: lp[1] + fontSize * 0.35, "text-anchor": anchor, "font-size": fontSize, "class": "wh-label" }, name));
    });
    svg.appendChild(el("polygon", { points: poly(dec), "class": "wh-dec" }));
    var nowPoly = el("polygon", { points: poly(now), "class": "wh-now" });
    svg.appendChild(nowPoly);
    var dots = now.map(function (v, i) { var p = pt(i, v); var d = el("circle", { cx: p[0], cy: p[1], r: Math.max(2.4, R * 0.024), "class": "wh-dot" }); svg.appendChild(d); return d; });
    return { update: function () { nowPoly.setAttribute("points", poly(now)); dots.forEach(function (d, i) { var p = pt(i, now[i]); d.setAttribute("cx", p[0]); d.setAttribute("cy", p[1]); }); } };
  }

  var wheels = [];
  document.querySelectorAll("svg.wheel-static").forEach(function (s) { wheels.push(drawWheel(s, 120, 120, 108, 0, 0)); });
  var big = document.getElementById("home-wheel");
  if (big) wheels.push(drawWheel(big, 300, 222, 140, 17, 11.7));

  var box = document.getElementById("home-dials");
  if (!box) return;
  areas.forEach(function (name, i) {
    var row = document.createElement("div"); row.className = "dial";
    var id = "area-" + i;
    row.innerHTML = '<label for="' + id + '">' + name + '</label><output id="' + id + '-out" for="' + id + '">' + now[i] + '</output>' +
      '<input id="' + id + '" type="range" min="1" max="10" step="1" value="' + now[i] + '">';
    box.appendChild(row);
    var input = row.querySelector("input"), out = row.querySelector("output");
    input.addEventListener("input", function () {
      now[i] = +input.value; out.textContent = input.value;
      wheels.forEach(function (w) { w.update(); });
    });
  });
})();
