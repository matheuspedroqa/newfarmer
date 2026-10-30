import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { ANIMALS, CROPS, CROP_GROUPS } from "@/lib/catalog";

describe("catálogo", () => {
  it("tem os 6 animais pedidos", () => {
    expect(ANIMALS.map((a) => a.id)).toEqual(["chickens", "pigs", "cows", "sheep", "goats", "ducks"]);
  });

  it("tem as 100 culturas mais conhecidas, sem repetição, em 4 grupos", () => {
    expect(CROPS).toHaveLength(100);
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(100);
    expect(CROP_GROUPS.map((g) => CROPS.filter((c) => c.group === g).length)).toEqual([30, 15, 30, 25]);
  });

  it.each([
    ["pt", pt],
    ["en", en],
  ])("todo item tem nome em %s", (_lang, messages) => {
    for (const a of ANIMALS) expect(messages.animals[a.id], a.id).toBeTruthy();
    for (const c of CROPS) expect(messages.crops[c.id], c.id).toBeTruthy();
    for (const g of CROP_GROUPS) expect(messages.cropGroups[g], g).toBeTruthy();
  });

  it("pt e en têm exatamente as mesmas chaves", () => {
    const keys = (obj: object, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(keys(en).sort()).toEqual(keys(pt).sort());
  });
});
