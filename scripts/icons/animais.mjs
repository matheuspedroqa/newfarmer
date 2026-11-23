// Animais: galinha e pato de corpo inteiro; porco, vaca, ovelha e cabra de rosto.
import { C, circle, dot, ellipse, g, line, path, shine, thin } from "./kit.mjs";

const eye = (x, y, r = 2.6) => dot(x, y, r, C.line) + dot(x - r * 0.35, y - r * 0.35, r * 0.35, C.white);

export default {
  chickens: path("M12 30 C8 24 10 16 16 18 C14 24 16 28 20 30Z", "#7a4e2d") +
    path("M18 32 C18 22 26 14 34 16 C40 18 42 24 40 30 C48 30 56 36 54 46 C52 56 40 60 30 58 C20 56 16 46 18 32Z", "#c96a2b") +
    path("M30 46 C36 50 44 48 48 42 C44 52 34 54 30 46Z", "#a5521e") +
    path("M30 16 C30 10 34 8 36 12 C38 8 42 10 40 15 C42 14 44 18 40 19Z", "#e53935") + path("M42 26 L50 28 L42 31Z", C.yellow) + path("M41 31 C43 33 43 37 40 37 C38 36 38 33 40 31Z", "#e53935") +
    eye(37, 24) + line("M30 58 L28 63 M38 58 L40 63"),
  ducks: path("M10 40 C10 34 16 32 22 34 C24 26 30 22 36 24 C42 20 50 22 50 30 C50 36 46 38 44 40 C52 42 56 46 54 50 C50 58 36 60 24 58 C14 56 10 48 10 40Z", C.white) +
    path("M48 27 L58 29 C58 32 54 33 48 32Z", C.orange) + eye(43, 27) + path("M20 44 C26 40 36 42 40 48 C34 50 24 50 20 44Z", "#e6e6e6") +
    path("M26 58 L24 62 L30 62Z", C.orange) + path("M36 58 L34 62 L40 62Z", C.orange),
  pigs: path("M12 18 L10 6 L22 14Z", "#f2a7b5") + path("M52 18 L54 6 L42 14Z", "#f2a7b5") + circle(32, 34, 22, "#f7b9c4") +
    ellipse(32, 42, 10, 7, "#ef8ea2") + dot(28.5, 42, 2, "#b85a72") + dot(35.5, 42, 2, "#b85a72") + eye(23, 30) + eye(41, 30) +
    dot(16, 40, 3, "#f48aa3") + dot(48, 40, 3, "#f48aa3"),
  cows: path("M12 18 C6 14 4 8 8 6 C10 10 14 12 18 14Z", "#e8dcc0") + path("M52 18 C58 14 60 8 56 6 C54 10 50 12 46 14Z", "#e8dcc0") +
    ellipse(10, 26, 7, 4, C.white, -25) + ellipse(54, 26, 7, 4, C.white, 25) +
    path("M18 16 C24 12 40 12 46 16 C50 24 48 36 46 42 L18 42 C16 36 14 24 18 16Z", C.white) +
    path("M18 16 C22 14 26 13 29 13 C30 18 28 24 22 26 C20 24 18 20 18 16Z", C.line) + path("M44 30 C47 30 48 34 47 38 C44 38 42 34 44 30Z", C.line) +
    ellipse(32, 46, 15, 11, "#f4b7a6") + dot(26, 46, 2.4, "#a0574a") + dot(38, 46, 2.4, "#a0574a") + eye(25, 30) + eye(39, 30),
  sheep: [[18, 16], [28, 11], [38, 11], [47, 17], [52, 28], [48, 39], [16, 39], [12, 28]].map(([x, y]) => circle(x, y, 8.5, C.cream)).join("") +
    ellipse(12, 32, 6, 3.4, "#3b3330", -20) + ellipse(52, 32, 6, 3.4, "#3b3330", 20) +
    path("M22 24 C24 16 40 16 42 24 C44 34 40 50 32 54 C24 50 20 34 22 24Z", "#3b3330") + circle(32, 17, 7, C.cream) + circle(26, 19, 5.5, C.cream) + circle(38, 19, 5.5, C.cream) +
    dot(27, 32, 2.6, C.white) + dot(37, 32, 2.6, C.white) + dot(27, 32, 1.3, C.line) + dot(37, 32, 1.3, C.line) + thin("M29 46 L32 48 L35 46", C.white, 1.4),
  goats: path("M22 16 C18 8 12 4 6 6 C12 8 16 12 18 18Z", "#9b8a6a") + path("M42 16 C46 8 52 4 58 6 C52 8 48 12 46 18Z", "#9b8a6a") +
    path("M20 20 C12 22 6 30 6 34 C12 34 18 30 22 26Z", "#c9a27a") + path("M44 20 C52 22 58 30 58 34 C52 34 46 30 42 26Z", "#c9a27a") +
    path("M20 18 C26 12 38 12 44 18 C46 28 42 40 38 46 L26 46 C22 40 18 28 20 18Z", "#e9dcc6") + path("M26 46 L38 46 C38 50 35 52 32 52 C29 52 26 50 26 46Z", "#d6c3a6") +
    path("M28 52 L32 62 L36 52Z", "#bba887") + path("M28 14 C30 20 34 20 36 14Z", "#c9a27a") +
    dot(29, 48, 1.5, "#7a6450") + dot(35, 48, 1.5, "#7a6450") + eye(26, 28) + eye(38, 28),
};
