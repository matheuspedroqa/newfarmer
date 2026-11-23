// Gera public/icons/<id>.svg (cultivos e animais) a partir dos desenhos desta pasta: node scripts/icons/build.mjs
// Ícones originais do NewFarmer. Para mudar um desenho, edite o arquivo da família e rode de novo.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { svg } from "./kit.mjs";

const FAMILIES = ["destaques", "folhas", "ervas", "graos-raizes", "frutas", "animais"];
const all = {};
for (const f of FAMILIES) Object.assign(all, (await import(`./${f}.mjs`)).default);
const catalog = readFileSync(new URL("../../src/lib/catalog.ts", import.meta.url), "utf8");
const ids = [...catalog.matchAll(/id: "(\w+)"[^}]*icon: "/g)].map((m) => m[1]);
const missing = ids.filter((id) => !all[id]);
if (missing.length) throw new Error(`sem desenho: ${missing.join(", ")}`);
const out = new URL("../../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
// Uma casa decimal basta num ícone de 64 px e corta o tamanho do arquivo.
const round = (s) => s.replace(/-?\d+\.\d{2,}/g, (n) => String(Number(Number(n).toFixed(1))));
for (const id of ids) writeFileSync(new URL(`${id}.svg`, out), round(svg(all[id])) + "\n");
console.log(ids.length, "ícones em public/icons");
