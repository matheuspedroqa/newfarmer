import { describe, expect, it } from "vitest";
import { farmSchema, parseCityField, parseFarmForm, toFieldErrors } from "@/lib/validation";

function errorsOf(data: unknown) {
  const r = farmSchema.safeParse(data);
  return r.success ? {} : toFieldErrors(r.error);
}

describe("farmSchema", () => {
  it("aceita animais com quantidade e plantações do catálogo", () => {
    expect(farmSchema.parse({ animals: { chickens: "12", goats: "3" }, crops: ["tomato"] })).toEqual({
      animals: { chickens: 12, goats: 3 },
      crops: ["tomato"],
    });
  });

  it("aceita fazenda vazia", () => {
    expect(farmSchema.parse({ animals: {}, crops: [] })).toEqual({ animals: {}, crops: [] });
  });

  it.each([
    ["abc", "countInvalid"],
    ["2.5", "countInvalid"],
    ["", "countTooSmall"],
    ["0", "countTooSmall"],
    ["-3", "countTooSmall"],
    ["100001", "countTooLarge"],
  ])("quantidade %j → %s, apontando o animal", (count, code) => {
    expect(errorsOf({ animals: { goats: count }, crops: [] })["animals.goats"]).toBe(code);
  });

  it("recusa animal ou plantação fora do catálogo", () => {
    expect(farmSchema.safeParse({ animals: { dragons: "1" }, crops: [] }).success).toBe(false);
    expect(farmSchema.safeParse({ animals: {}, crops: ["pizza"] }).success).toBe(false);
  });
});

describe("parseFarmForm", () => {
  it("lê só os animais marcados e todas as plantações marcadas", () => {
    const form = new FormData();
    form.set("animal:chickens", "on");
    form.set("count:chickens", "12");
    form.set("count:pigs", "5"); // porco sem marcar: ignorado
    form.append("crop", "tomato");
    form.append("crop", "corn");
    expect(parseFarmForm(form)).toEqual({ animals: { chickens: "12" }, crops: ["tomato", "corn"] });
  });

  it("animal marcado sem quantidade vira texto vazio (a validação reclama)", () => {
    const form = new FormData();
    form.set("animal:ducks", "on");
    expect(parseFarmForm(form)).toEqual({ animals: { ducks: "" }, crops: [] });
  });
});

describe("parseCityField", () => {
  it("lê a cidade escolhida", () => {
    expect(parseCityField('{"label":"X","latitude":1,"longitude":2,"countryCode":"BR"}')).toEqual({
      label: "X",
      latitude: 1,
      longitude: 2,
      countryCode: "BR",
    });
  });

  it("devolve null para vazio ou texto quebrado", () => {
    expect(parseCityField("")).toBeNull();
    expect(parseCityField("{quebrado")).toBeNull();
    expect(parseCityField(null)).toBeNull();
  });
});
