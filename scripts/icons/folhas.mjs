// Folhosas, brássicas e talos.
import { C, circle, dot, ellipse, g, leaf, line, path, shine, thin, wavy } from "./kit.mjs";

const rucula = "M0 0 C-3 -6 -9 -6 -9 -12 C-9 -16 -4 -16 -3 -18 C-8 -20 -10 -26 -7 -29 C-4 -32 -2 -30 -2 -31 C-7 -35 -5 -42 0 -42 C5 -42 7 -35 2 -31 C2 -30 4 -32 7 -29 C10 -26 8 -20 3 -18 C4 -16 9 -16 9 -12 C9 -6 3 -6 0 0Z";
const spear = (x, y, ang, h) => g(x, y, ang, path(`M-3.6 0 L-3.2 ${-h + 8} C-3.4 ${-h + 2} 3.4 ${-h + 2} 3.2 ${-h + 8} L3.6 0Z`, "#7cb342") +
  path(`M-3.2 ${-h + 9} L0 ${-h + 1} L3.2 ${-h + 9}`, "#5a7d3a") + thin(`M-3 ${-h + 18} L0 ${-h + 14} L3 ${-h + 18}`, "#5a7d3a", 1.3) + thin(`M-3 ${-h + 27} L0 ${-h + 23} L3 ${-h + 27}`, "#5a7d3a", 1.3));
const stalk = (x1, x2, top, fill) => path(`M${x1 - 3.5} 58 C${x1 - 4} 46 ${x2 - 4} 34 ${x2 - 3.5} ${top} L${x2 + 3.5} ${top} C${x2 + 4} 34 ${x1 + 4} 46 ${x1 + 3.5} 58Z`, fill);

export default {
  arugula: g(32, 60, -28, path(rucula, C.leaf) + thin("M0 -2 L0 -36", C.leafDark, 1.4), 1.15) +
    g(32, 60, 28, path(rucula, C.leaf) + thin("M0 -2 L0 -36", C.leafDark, 1.4), 1.15) + g(32, 60, 0, path(rucula, "#86c04f") + thin("M0 -2 L0 -36", C.leafDark, 1.4), 1.25),
  kale: wavy(32, 60, 44, 11, -30, "#3c7552", 7, 2.6) + wavy(32, 60, 44, 11, 30, "#3c7552", 7, 2.6) + wavy(32, 60, 50, 12, 0, "#4f8f63", 8, 2.8),
  chard: g(26, 60, -22, path("M-2.5 0 L-2 -24 L2 -24 L2.5 0Z", C.yellow) + wavy(0, -20, 30, 12, 0, C.leafDark, 4, 1.6)) +
    path("M28.5 61 L29 30 L35 30 L35.5 61Z", C.red) + wavy(32, 34, 30, 14, 4, C.leaf, 4, 1.8, false) + thin("M32 32 L32 10", C.red, 2),
  cabbage: path("M13 28 C6 44 16 60 31 59 C20 52 16 42 19 28Z", C.leaf) + path("M51 28 C58 44 48 60 33 59 C44 52 48 42 45 28Z", C.leaf) +
    circle(32, 37, 20, "#a9d673") + thin("M32 57 C29 46 29 32 32 18", "#6c9e45", 1.8) + thin("M31 50 C24 46 19 40 17 33", "#6c9e45", 1.5) + thin("M33 50 C40 46 45 40 47 33", "#6c9e45", 1.5) + shine("M20 30 C22 24 26 20 30 19"),
  brusselsSprouts: path("M28 61 L29 14 L35 14 L36 61Z", "#cfe0a0") + leaf(32, 15, 13, 6, -30, C.leaf) + leaf(32, 15, 13, 6, 30, C.leaf) +
    [[22, 22], [42, 28], [22, 36], [42, 42], [22, 50], [42, 55]].map(([x, y]) => circle(x, y, 7, "#8cc152") + thin(`M${x - 4} ${y + 2} C${x - 1} ${y - 1} ${x + 1} ${y - 1} ${x + 4} ${y + 2}`, C.leafDark, 1.3)).join(""),
  broccoli: path("M27 61 L29 38 L35 38 L37 61Z", "#a5cf6e") + line("M32 44 L24 34") + line("M32 44 L40 34") +
    [[21, 30, 9], [43, 30, 9], [27, 21, 9], [38, 20, 9], [32, 31, 10]].map(([x, y, r]) => circle(x, y, r, "#3f8a3a")).join("") +
    [[20, 28], [25, 32], [42, 28], [37, 33], [27, 19], [31, 23], [38, 18], [41, 23], [32, 29]].map(([x, y]) => dot(x, y, 1.4, "#26571f")).join(""),
  cauliflower: leaf(32, 60, 28, 13, -58, C.leaf) + leaf(32, 60, 28, 13, 58, C.leaf) + leaf(32, 60, 20, 10, -18, C.leafDark) + leaf(32, 60, 20, 10, 18, C.leafDark) +
    [[22, 33, 9], [42, 33, 9], [27, 24, 9], [38, 24, 9], [32, 36, 11]].map(([x, y, r]) => circle(x, y, r, C.cream)).join("") +
    [[22, 31], [42, 31], [27, 22], [37, 22], [30, 35], [35, 37]].map(([x, y]) => dot(x, y, 1.3, "#d9c9a0")).join(""),
  celery: leaf(22, 22, 12, 6, -30, C.leaf) + leaf(30, 18, 13, 6, -5, C.leaf) + leaf(37, 18, 13, 6, 12, C.leaf) + leaf(44, 22, 12, 6, 35, C.leaf) +
    stalk(26, 21, 24, "#b6dc7a") + stalk(38, 43, 24, "#b6dc7a") + stalk(30, 29, 20, "#c8e590") + stalk(34, 37, 20, "#c8e590") +
    thin("M29 56 L29 26", "#7fae4d", 1.2) + thin("M35 56 L36 26", "#7fae4d", 1.2),
  asparagus: spear(23, 58, -10, 46) + spear(41, 58, 10, 46) + spear(32, 59, 0, 52) + path("M20 44 L44 44 L44 50 L20 50Z", C.orange),
  artichoke: path("M30 56 L31 62 L33 62 L34 56Z", "#6e9a4c") +
    path("M32 12 C45 13 51 27 49 40 C47 52 40 57 32 57 C24 57 17 52 15 40 C13 27 19 13 32 12Z", "#6f9a4e") +
    [[22, 52], [32, 54], [42, 52], [18, 42], [27, 44], [37, 44], [46, 42], [22, 32], [32, 34], [42, 32], [27, 23], [37, 23], [32, 16]]
      .map(([x, y]) => leaf(x, y, 12, 6.5, 0, "#93bd6c", false) + dot(x, y - 11, 1.4, "#8a4f9a")).join(""),
  leek: leaf(32, 34, 30, 6, -22, "#3f7d5a") + leaf(32, 34, 30, 6, 22, "#3f7d5a") + leaf(32, 34, 32, 6, 0, "#4f9a6c") +
    path("M26 32 L38 32 L38 54 C38 58 26 58 26 54Z", C.cream) + path("M26 32 L38 32 L38 38 L26 38Z", "#c8e090") +
    thin("M28 58 L26 62", C.line, 1.3) + thin("M32 58 L32 62", C.line, 1.3) + thin("M36 58 L38 62", C.line, 1.3) + thin("M30 40 L30 54", "#d8cdb0", 1.2),
  fennel: line("M26 34 L20 10") + line("M32 32 L32 6") + line("M38 34 L44 10") +
    [[20, 10], [32, 6], [44, 10], [23, 20], [41, 20]].map(([x, y]) => [-50, -20, 20, 50].map((a) => thin(`M${x} ${y} l${(7 * Math.sin((a * Math.PI) / 180)).toFixed(1)} ${(-7 * Math.cos((a * Math.PI) / 180)).toFixed(1)}`, C.leaf, 1.6)).join("")).join("") +
    path("M17 47 C17 37 25 33 32 33 C39 33 47 37 47 47 C47 55 40 59 32 59 C24 59 17 55 17 47Z", "#eef4d6") + thin("M24 37 C21 44 22 52 26 57", "#c4d49a", 1.6) + thin("M40 37 C43 44 42 52 38 57", "#c4d49a", 1.6),
};
