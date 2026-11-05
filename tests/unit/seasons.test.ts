import { describe, expect, it } from "vitest";
import { monthlyTasks, plantableThisMonth, seasonFor, toUserMonth, userCalendar, type CropCalendar } from "@/lib/seasons";

const empty: CropCalendar = { directSowing: [], seedbed: [], transplant: [], harvest: [] };

describe("toUserMonth", () => {
  it("hemisfério sul mantém o mês", () => {
    expect(toUserMonth(3, "south")).toBe(3);
  });
  it.each([
    [1, 7],
    [3, 9],
    [6, 12],
    [7, 1],
    [12, 6],
  ])("hemisfério norte: %i → %i", (m, expected) => {
    expect(toUserMonth(m, "north")).toBe(expected);
  });
});

describe("seasonFor", () => {
  it.each([
    [1, "south", "summer"],
    [4, "south", "autumn"],
    [7, "south", "winter"],
    [10, "south", "spring"],
    [12, "south", "summer"],
    [1, "north", "winter"],
    [4, "north", "spring"],
    [7, "north", "summer"],
    [10, "north", "autumn"],
  ] as const)("mês %i no %s → %s", (m, h, s) => {
    expect(seasonFor(m, h)).toBe(s);
  });
});

describe("userCalendar", () => {
  it("converte e ordena os meses para o hemisfério norte", () => {
    const cal: CropCalendar = { ...empty, seedbed: [8, 9], harvest: [12, 1] };
    expect(userCalendar(cal, "north")).toEqual({ directSowing: [], seedbed: [2, 3], transplant: [], harvest: [6, 7] });
    expect(userCalendar(cal, "south").harvest).toEqual([1, 12]);
  });
});

describe("monthlyTasks", () => {
  const crops = [
    {
      id: "tomato" as const,
      calendar: {
        tropical: empty,
        subtropical: { ...empty, seedbed: [8], transplant: [9, 10], harvest: [12, 1] },
        temperate: empty,
        semiarid: empty,
        cold: empty,
      },
    },
    {
      id: "lettuce" as const,
      calendar: {
        tropical: empty,
        subtropical: { ...empty, directSowing: [10], harvest: [10] },
        temperate: empty,
        semiarid: empty,
        cold: empty,
      },
    },
  ];

  it("lista as atividades do mês para o clima do usuário", () => {
    expect(monthlyTasks(crops, "subtropical", "south", 10)).toEqual([
      { cropId: "tomato", activities: ["transplant"] },
      { cropId: "lettuce", activities: ["directSowing", "harvest"] },
    ]);
  });

  it("omite plantações sem atividade e respeita o hemisfério norte", () => {
    // sementeira do tomate em agosto (sul) = fevereiro (norte)
    expect(monthlyTasks(crops, "subtropical", "north", 2)).toEqual([{ cropId: "tomato", activities: ["seedbed"] }]);
    expect(monthlyTasks(crops, "tropical", "south", 10)).toEqual([]);
  });
});

describe("plantableThisMonth", () => {
  const cal = (c: Partial<CropCalendar>) => ({ tropical: { ...empty, ...c }, subtropical: { ...empty, ...c }, temperate: { ...empty, ...c }, semiarid: { ...empty, ...c }, cold: { ...empty, ...c } }) as never;
  const crops = [
    { id: "lettuce", calendar: cal({ seedbed: [3] }) },
    { id: "tomato", calendar: cal({ harvest: [3] }) }, // só colheita: não entra
    { id: "watermelon", calendar: cal({ directSowing: [3] }) }, // fruta rasteira: entra
    { id: "orange", calendar: cal({ transplant: [3] }) }, // árvore: fica de fora
    { id: "carrot", calendar: cal({ directSowing: [9] }) },
  ] as Parameters<typeof plantableThisMonth>[0];
  it("lista o que se semeia ou transplanta no mês, sem árvores frutíferas", () => {
    expect(plantableThisMonth(crops, "subtropical", "south", 3)).toEqual(["lettuce", "watermelon"]);
  });
  it("no hemisfério norte o calendário anda 6 meses", () => {
    expect(plantableThisMonth(crops, "subtropical", "north", 3)).toEqual(["carrot"]);
  });
});
