// Primeiro lote: os que mais se repetiam como emoji e os brasileiros.
import { C, circle, ellipse, grain, leaf, line, path, shine, thin } from "./kit.mjs";

const pod = (x, y, ang) => `<g transform="translate(${x} ${y}) rotate(${ang})">
  ${path("M-7.5 4 C-9.5 17 -5 34 0 50 C5 34 9.5 17 7.5 4 Z", C.leaf)}
  ${thin("M0 7 L0 44", C.leafDark)}${thin("M-4 9 L-1.6 37", C.leafDark, 1.3)}${thin("M4 9 L1.6 37", C.leafDark, 1.3)}
  ${line("M0 1 L0 -4")}${path("M-8 6 C-8 -1 8 -1 8 6 Z", C.leafDark)}</g>`;
const root = (x, y, ang) => `<g transform="translate(${x} ${y}) rotate(${ang})">
  ${path("M-7 0 C-8 18 -4 36 0 47 C4 36 8 18 7 0 Z", C.brown)}
  ${thin("M-6 12 C-2 13 2 13 6 12", C.line, 1.3)}${thin("M-5 25 C-2 26 2 26 5 25", C.line, 1.3)}${thin("M-3 36 C-1 37 1 37 3 36", C.line, 1.3)}
  ${ellipse(0, 0, 7, 3, C.cream)}</g>`;

export default {
  okra: pod(23, 8, -16) + pod(42, 9, 18),
  rosemary: (() => {
    let s = line("M16 60 L46 5");
    const a = 28.6;
    for (let i = 0; i < 7; i++) {
      const t = 0.1 + i * 0.125, x = 16 + 30 * t, y = 60 - 55 * t;
      s += leaf(x, y, 14, 3.6, a - 55, C.leafDark, false) + leaf(x, y, 14, 3.6, a + 55, C.leafDark, false);
    }
    return s + leaf(46, 6, 10, 3.4, a, C.leafDark, false) + circle(27, 33, 3, "#a98ad6") + circle(37, 22, 3, "#a98ad6");
  })(),
  mint: line("M32 60 L32 22") + leaf(32, 50, 17, 10, -62, "#58b866") + leaf(32, 50, 17, 10, 62, "#58b866") +
    leaf(32, 36, 15, 9, -52, "#58b866") + leaf(32, 36, 15, 9, 52, "#58b866") + leaf(32, 24, 16, 8, 0, "#7fd07f"),
  wheat: (() => {
    let s = line("M32 61 C32 48 32 38 32 30");
    for (let i = 0; i < 5; i++) {
      const y = 32 - i * 5.5;
      s += grain(32, y, 11, 4, -28, "#e6b54a") + grain(32, y, 11, 4, 28, "#e6b54a");
      s += thin(`M${32 - 9} ${y - 8} L${32 - 15} ${y - 16}`, C.brown, 1.2) + thin(`M${32 + 9} ${y - 8} L${32 + 15} ${y - 16}`, C.brown, 1.2);
    }
    return s + grain(32, 9, 10, 4, 0, "#e6b54a");
  })(),
  oats: (() => {
    let s = line("M30 62 C30 42 31 22 36 4");
    const pts = [[30, 46, -1], [30.5, 37, 1], [31, 28, -1], [32.5, 20, 1], [34, 12, -1], [35.5, 6, 1]];
    for (const [x, y, side] of pts) {
      const ex = x + side * 13, ey = y + 1;
      s += line(`M${x} ${y} Q${x + side * 9} ${y - 5} ${ex} ${ey}`) + grain(ex, ey, 13, 5, 180 + side * -14, "#ecd896");
    }
    return s;
  })(),
  lettuce: circle(20, 38, 14, C.leaf) + circle(44, 38, 14, C.leaf) + circle(32, 24, 14, C.leaf) + circle(32, 40, 17, C.leafLight) +
    thin("M32 57 L32 30", C.leaf, 2) + thin("M32 50 L22 36", C.leaf, 1.6) + thin("M32 50 L42 36", C.leaf, 1.6) + shine("M24 30 C26 27 29 25 32 25"),
  spinach: line("M32 60 L22 40") + line("M32 60 L42 40") + line("M32 60 L32 36") +
    leaf(22, 42, 24, 13, -28, C.leafDark) + leaf(42, 42, 24, 13, 28, C.leafDark) + leaf(32, 38, 27, 14, 0, C.leaf),
  cassava: root(24, 12, -22) + root(40, 12, 18) + leaf(32, 12, 10, 4, -30, C.leaf, false) + leaf(32, 12, 10, 4, 30, C.leaf, false) + leaf(32, 12, 11, 4, 0, C.leaf, false),
  jabuticaba: path("M24 4 L40 4 L42 60 L22 60 Z", C.brown) + thin("M28 10 L27 54", C.line, 1.2) + thin("M36 14 L37 50", C.line, 1.2) +
    [[19, 16], [45, 22], [18, 30], [46, 36], [20, 45], [44, 50], [31, 26], [33, 42]].map(([x, y]) => circle(x, y, 6, C.plum) + shine(`M${x - 3} ${y - 2} L${x - 2} ${y - 3.5}`)).join(""),
  acerola: line("M32 14 L24 30") + line("M32 14 L41 31") + line("M32 14 L32 26") + leaf(32, 14, 14, 7, 50, C.leaf) +
    [[22, 40], [42, 41], [32, 32]].map(([x, y]) => circle(x, y, 10, C.red) + thin(`M${x} ${y - 9} L${x} ${y + 9}`, "#a92b22", 1.3) + shine(`M${x - 6} ${y - 2} C${x - 5} ${y - 5} ${x - 3} ${y - 7} ${x} ${y - 7}`)).join(""),
  chayote: path("M32 9 C45 9 52 24 52 39 C52 53 42 58 32 58 C22 58 12 53 12 39 C12 24 19 9 32 9Z", C.leafLight) +
    thin("M32 58 C30 50 30 45 32 40", C.leafDark, 1.8) + thin("M23 56 C23 49 25 45 28 42", C.leafDark, 1.8) + thin("M41 56 C41 49 39 45 36 42", C.leafDark, 1.8) +
    shine("M19 28 C21 21 25 16 29 14") + line("M32 9 L33 3") + leaf(33, 6, 9, 4, 60, C.leafDark, false),
  passionFruit: circle(24, 32, 17, C.yellow) + [[18, 26], [28, 24], [22, 38], [31, 36], [16, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${C.brown}"/>`).join("") +
    shine("M13 27 C14 22 17 19 21 17") + line("M24 15 L26 8") +
    circle(44, 44, 15, C.cream) + `<circle cx="44" cy="44" r="10.5" fill="${C.orange}"/>` +
    [[40, 40], [46, 39], [49, 45], [44, 47], [39, 47], [45, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="${C.line}"/>`).join(""),
};
