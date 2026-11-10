import { describe, expect, it } from "vitest";
import { getFarm, saveFarm } from "@/server/farm";
import { CROP_IDS } from "@/lib/catalog";
import { farmSchema } from "@/lib/validation";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("fazenda", () => {
  it("começa vazia", async () => {
    const db = await testDb();
    expect(await getFarm(db, await makeUser(db))).toEqual({ animals: [], crops: [] });
  });

  it("salva e devolve na ordem do catálogo", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["corn", "tomato"] });
    expect(await getFarm(db, id)).toEqual({
      animals: [
        { id: "chickens", count: 12 },
        { id: "goats", count: 3 },
      ],
      crops: ["tomato", "corn"],
    });
  });

  it("salvar de novo substitui tudo (tirar um animal remove)", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["tomato"] });
    await saveFarm(db, id, { animals: { chickens: 15 }, crops: [] });
    expect(await getFarm(db, id)).toEqual({ animals: [{ id: "chickens", count: 15 }], crops: [] });
  });

  it("plantação repetida conta uma vez só (clique duplo)", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    await saveFarm(db, id, { animals: {}, crops: ["tomato", "tomato"] });
    expect((await getFarm(db, id)).crops).toEqual(["tomato"]);
  });

  it("lista de plantações maior que o catálogo é recusada (não prende o banco)", () => {
    expect(farmSchema.safeParse({ animals: {}, crops: Array(CROP_IDS.length + 1).fill("tomato") }).success).toBe(false);
    expect(farmSchema.safeParse({ animals: {}, crops: [...CROP_IDS] }).success).toBe(true);
  });

  it("não mexe na fazenda de outra pessoa", async () => {
    const db = await testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    await saveFarm(db, ana, { animals: { cows: 2 }, crops: [] });
    await saveFarm(db, bia, { animals: { pigs: 4 }, crops: [] });
    expect((await getFarm(db, ana)).animals).toEqual([{ id: "cows", count: 2 }]);
  });
});
