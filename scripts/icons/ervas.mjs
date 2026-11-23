// Ervas e flores: cada uma com folha, cor ou flor que a distingue.
import { C, circle, dot, ellipse, g, leaf, line, path, shine, thin, wavy } from "./kit.mjs";

const deg = (a) => (a * Math.PI) / 180;
const along = (x1, y1, x2, y2, n, fn) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / (n + 1); return fn(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, i); }).join("");
const angOf = (x1, y1, x2, y2) => (Math.atan2(x2 - x1, y1 - y2) * 180) / Math.PI;
const trefoil = (x, y, r, fill) => circle(x - r * 0.75, y, r, fill) + circle(x + r * 0.75, y, r, fill) + circle(x, y - r * 0.8, r, fill);
const daisy = (x, y, r) => Array.from({ length: 10 }, (_, i) => ellipse(x + r * 0.9 * Math.sin(deg(i * 36)), y - r * 0.9 * Math.cos(deg(i * 36)), r * 0.38, r * 0.75, C.white, i * 36)).join("") + circle(x, y, r * 0.45, C.yellow);

export default {
  basil: line("M32 61 L32 40") + leaf(32, 44, 22, 13, -48, "#43a047") + leaf(32, 44, 22, 13, 48, "#43a047") + leaf(32, 38, 30, 15, 0, "#5cb85c") +
    shine("M27 30 C27 24 29 18 31 15"),
  cilantro: line("M32 61 C30 48 24 40 18 32") + line("M32 61 C34 48 40 40 46 30") + line("M32 61 L32 20") +
    trefoil(18, 30, 6, C.leaf) + trefoil(46, 28, 6, C.leaf) + trefoil(32, 18, 7, "#7cc254") + trefoil(25, 44, 5, C.leaf) + trefoil(40, 42, 5, C.leaf),
  parsley: line("M32 61 L22 34") + line("M32 61 L42 34") + line("M32 61 L32 28") +
    [[22, 28], [42, 28], [32, 20]].map(([x, y]) => [[-6, 2], [6, 2], [0, -5], [-4, -9], [4, -9], [0, 4]].map(([dx, dy]) => circle(x + dx, y + dy, 5, C.leafDark)).join("")).join(""),
  dill: line("M32 61 L32 22") + line("M32 46 L18 32") + line("M32 38 L46 26") +
    [[32, 52], [32, 44], [25, 39], [39, 32]].map(([x, y]) => [-60, -30, 30, 60].map((a) => thin(`M${x} ${y} l${(9 * Math.sin(deg(a))).toFixed(1)} ${(-9 * Math.cos(deg(a))).toFixed(1)}`, C.leaf, 1.6)).join("")).join("") +
    [-60, -35, -12, 12, 35, 60].map((a) => line(`M32 22 L${(32 + 14 * Math.sin(deg(a))).toFixed(1)} ${(22 - 12 * Math.cos(deg(a))).toFixed(1)}`) + circle(+(32 + 14 * Math.sin(deg(a))).toFixed(1), +(22 - 12 * Math.cos(deg(a))).toFixed(1), 2.6, C.yellow)).join(""),
  chives: [22, 27, 32, 37, 42].map((x, i) => line(`M32 61 L${x} ${i % 2 ? 14 : 20}`)).join("") + [22, 27, 32, 37, 42].map((x, i) => thin(`M32 61 L${x} ${i % 2 ? 14 : 20}`, "#4aa04a", 2)).join("") +
    circle(22, 16, 6, "#b07cc6") + circle(42, 16, 6, "#b07cc6") + dot(20, 14, 1.2, "#7c4a92") + dot(24, 17, 1.2, "#7c4a92") + dot(40, 14, 1.2, "#7c4a92") + dot(44, 17, 1.2, "#7c4a92"),
  oregano: line("M32 61 L32 14") + line("M32 44 L20 30") + line("M32 36 L44 24") +
    along(32, 60, 32, 14, 6, (x, y, i) => circle(x + (i % 2 ? 6 : -6), y, 4.3, "#6a9e3f")) + along(32, 44, 20, 30, 2, (x, y) => circle(x - 4, y + 2, 3.8, "#6a9e3f")) + along(32, 36, 44, 24, 2, (x, y) => circle(x + 4, y + 2, 3.8, "#6a9e3f")) +
    circle(20, 28, 4, C.pink) + circle(44, 22, 4, C.pink) + circle(32, 12, 4.5, C.pink),
  marjoram: line("M32 61 L32 16") + line("M32 46 L19 30") + line("M32 40 L45 26") +
    along(32, 60, 32, 16, 5, (x, y) => ellipse(x - 5.5, y, 5, 3, "#94ad79", -20) + ellipse(x + 5.5, y, 5, 3, "#94ad79", 20)) +
    [[19, 28], [45, 24], [32, 13]].map(([x, y]) => circle(x, y, 4.5, "#c9dca0") + thin(`M${x - 3} ${y} L${x + 3} ${y}`, "#94ad79", 1.2) + thin(`M${x} ${y - 3} L${x} ${y + 3}`, "#94ad79", 1.2)).join(""),
  thyme: [[32, 6], [18, 12], [46, 12]].map(([x, y]) => {
    const a = angOf(32, 61, x, y);
    return line(`M32 61 L${x} ${y}`) + along(32, 61, x, y, 7, (px, py) => ellipse(px, py, 2.2, 3.6, "#7f9d64", a - 55) + ellipse(px, py, 2.2, 3.6, "#7f9d64", a + 55)
      .replace(`cx="${px}"`, `cx="${px}"`));
  }).join(""),
  sage: line("M32 61 L32 30") + [[-50, 26], [50, 26], [-20, 30], [20, 30]].map(([a, l], i) => g(32, i < 2 ? 50 : 40, a,
    path(`M0 0 C7 -6 8 ${-l + 6} 0 ${-l} C-8 ${-l + 6} -7 -6 0 0Z`, "#9db592") + thin(`M0 -2 L0 ${-l + 4}`, "#6d8a66", 1.3) +
    thin(`M0 ${-l * 0.35} l4 -4 M0 ${-l * 0.35} l-4 -4 M0 ${-l * 0.6} l3.5 -3.5 M0 ${-l * 0.6} l-3.5 -3.5`, "#6d8a66", 1.1))).join(""),
  tarragon: [[32, 4], [20, 12], [44, 12]].map(([x, y]) => {
    const a = angOf(32, 61, x, y);
    return line(`M32 61 L${x} ${y}`) + along(32, 61, x, y, 4, (px, py, i) => leaf(px, py, 15, 2.8, a + (i % 2 ? 32 : -32), "#5f9b3c", false));
  }).join(""),
  lemonBalm: line("M32 61 L32 26") + wavy(32, 50, 20, 10, -55, "#9ccc65", 6, 1.5) + wavy(32, 50, 20, 10, 55, "#9ccc65", 6, 1.5) + wavy(32, 34, 22, 11, 0, "#aed581", 6, 1.5) +
    circle(48, 50, 9, C.yellow) + `<circle cx="48" cy="50" r="6" fill="#fff6c2"/>` + [0, 60, 120].map((a) => thin(`M${48 - 6 * Math.sin(deg(a))} ${50 - 6 * Math.cos(deg(a))} L${48 + 6 * Math.sin(deg(a))} ${50 + 6 * Math.cos(deg(a))}`, "#e6b800", 1.2)).join(""),
  stevia: line("M32 61 L32 18") + along(32, 60, 32, 22, 3, (x, y) => wavy(x, y, 15, 5, -60, "#6fbf4a", 5, 0.8, false) + wavy(x, y, 15, 5, 60, "#6fbf4a", 5, 0.8, false)) +
    [[26, 14], [32, 10], [38, 14], [29, 19], [35, 19]].map(([x, y]) => circle(x, y, 3.2, C.white)).join("") + dot(32, 10, 1, C.yellow) + dot(26, 14, 1, C.yellow) + dot(38, 14, 1, C.yellow),
  lavender: [[20, 8, -18], [32, 4, 0], [44, 8, 18]].map(([x, y, a]) => line(`M32 61 L${x} ${y + 22}`) +
    g(x, y + 22, a, Array.from({ length: 6 }, (_, i) => ellipse(i % 2 ? 2.6 : -2.6, -i * 4 - 2, 2.8, 3.8, i < 2 ? "#9b7fd4" : "#7e5fc2")).join("") + ellipse(0, -26, 2.5, 3.5, "#9b7fd4"))).join("") +
    leaf(32, 61, 16, 2.6, -40, "#8fae86", false) + leaf(32, 61, 16, 2.6, 40, "#8fae86", false),
  chamomile: line("M30 61 C28 48 22 40 18 34") + line("M32 61 C34 46 42 36 46 30") + line("M31 61 L32 22") + daisy(18, 30, 9) + daisy(46, 26, 9) + daisy(32, 16, 10),
  lemongrass: [-18, -8, 2, 12, 22].map((a, i) => leaf(32, 44, 44 - Math.abs(a) * 0.6, 3.4, a, i % 2 ? "#8bc34a" : "#9ccc65", false)).join("") +
    path("M25 42 C24 50 26 58 28 61 L36 61 C38 58 40 50 39 42Z", "#e8efc9") + thin("M29 46 L29 58", "#c99ab8", 1.4) + thin("M35 46 L35 58", "#c99ab8", 1.4),
};
