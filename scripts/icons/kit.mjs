// Kit de desenho dos ícones NewFarmer: 64x64, contorno escuro arredondado, cores chapadas da paleta e um brilho.
export const C = {
  line: "#2f3b22", leaf: "#6fae3f", leafDark: "#3f7d2b", leafLight: "#b7d86a", red: "#e04a3b", orange: "#f39a2c",
  yellow: "#f5cf3d", purple: "#6e3a86", plum: "#3b1f4a", brown: "#9b6a3c", tan: "#e3bf86", cream: "#f6ecd4", pink: "#ef8ea2", white: "#fff",
};
const SW = 2.6;
const st = `stroke="${C.line}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
// Contorno claro por baixo (efeito adesivo): o ícone aparece igual no tema claro e no escuro.
export const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><style>.h *{stroke:#fff8ec!important;stroke-width:6.5px!important;fill:#fff8ec!important;stroke-opacity:1!important}</style><g class="h">${body}</g>${body}</svg>`;
export const path = (d, fill = "none", extra = "") => `<path d="${d}" fill="${fill}" ${st} ${extra}/>`;
export const line = (d) => `<path d="${d}" fill="none" ${st}/>`;
export const thin = (d, color = C.line, w = 1.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${st}/>`;
export const ellipse = (cx, cy, rx, ry, fill, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})" ${st}/>`;
// Brilho: um traço branco curto, sem contorno.
export const shine = (d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>`;
// Folha em amêndoa saindo de (x,y), com comprimento, largura e ângulo (0 = para cima).
export const leaf = (x, y, len, w, ang, fill = C.leaf, rib = true) =>
  `<g transform="translate(${x} ${y}) rotate(${ang})">${path(`M0 0 C${w} ${-len * 0.3} ${w * 0.8} ${-len * 0.8} 0 ${-len} C${-w * 0.8} ${-len * 0.8} ${-w} ${-len * 0.3} 0 0Z`, fill)}${rib ? thin(`M0 -2 L0 ${-len * 0.75}`, C.leafDark, 1.4) : ""}</g>`;
// Folha de borda ondulada (couve, acelga, melissa): n ondas de amplitude amp.
export const wavy = (x, y, len, w, ang, fill, n = 5, amp = 2, rib = true) => {
  const pts = [], N = 48;
  for (const side of [1, -1]) for (let i = 0; i <= N; i++) {
    const t = side === 1 ? i / N : 1 - i / N;
    const hw = w * Math.pow(Math.sin(Math.PI * t), 0.75) + amp * Math.abs(Math.sin(n * Math.PI * t)) * Math.sin(Math.PI * t);
    pts.push(`${(side * hw).toFixed(1)} ${(-len * t).toFixed(1)}`);
  }
  return `<g transform="translate(${x} ${y}) rotate(${ang})">${path(`M${pts.join(" L")}Z`, fill)}${rib ? thin(`M0 -2 L0 ${-len * 0.8}`, C.leafDark, 1.4) : ""}</g>`;
};
export const g = (x, y, ang, body, s = 1) => `<g transform="translate(${x} ${y}) rotate(${ang}) scale(${s})">${body}</g>`;
export const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
// Grão em gota (trigo, aveia, arroz).
export const grain = (x, y, len, w, ang, fill) =>
  `<g transform="translate(${x} ${y}) rotate(${ang})">${path(`M0 0 C${w} ${-len * 0.25} ${w} ${-len * 0.75} 0 ${-len} C${-w} ${-len * 0.75} ${-w} ${-len * 0.25} 0 0Z`, fill)}</g>`;
