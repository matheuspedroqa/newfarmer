import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Componentes do navegador só recebem os grupos de CLIENT_MESSAGES (src/app/layout.tsx): um grupo esquecido vira texto quebrado na tela.
describe("textos mandados ao navegador", () => {
  it("todo grupo usado num componente do navegador está na lista", () => {
    const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
    const list = new Set([...layout.slice(layout.indexOf("CLIENT_MESSAGES = ["), layout.indexOf("] as const")).matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]));
    const files: string[] = [];
    const walk = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(dir, e.name))));
    walk("src");
    const used = new Set<string>();
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      if (!src.startsWith('"use client"')) continue;
      for (const m of src.matchAll(/useTranslations\("([a-zA-Z]+)"\)/g)) used.add(m[1]);
      // useTranslations() sem grupo: o grupo vem na chave, t("farm.x") ou t(`crops.${id}`).
      if (/useTranslations\(\)/.test(src)) for (const m of src.matchAll(/\bt\(["`]([a-zA-Z]+)\./g)) used.add(m[1]);
    }
    expect([...used].filter((g) => !list.has(g))).toEqual([]);
  });
});
