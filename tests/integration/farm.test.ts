import { describe, expect, it } from "vitest";
import { getFarm, saveFarm } from "@/server/farm";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("fazenda", () => {
  it("começa vazia", async () => {
    const db = testDb();
    expect(getFarm(db, await makeUser(db))).toEqual({ animals: [], crops: [] });
  });

  it("salva e devolve na ordem do catálogo", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["corn", "tomato"] });
    expect(getFarm(db, id)).toEqual({
      animals: [
        { id: "chickens", count: 12 },
        { id: "goats", count: 3 },
      ],
      crops: ["tomato", "corn"],
    });
  });

  it("salvar de novo substitui tudo (tirar um animal remove)", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: { goats: 3, chickens: 12 }, crops: ["tomato"] });
    saveFarm(db, id, { animals: { chickens: 15 }, crops: [] });
    expect(getFarm(db, id)).toEqual({ animals: [{ id: "chickens", count: 15 }], crops: [] });
  });

  it("plantação repetida conta uma vez só (clique duplo)", async () => {
    const db = testDb();
    const id = await makeUser(db);
    saveFarm(db, id, { animals: {}, crops: ["tomato", "tomato"] });
    expect(getFarm(db, id).crops).toEqual(["tomato"]);
  });

  it("não mexe na fazenda de outra pessoa", async () => {
    const db = testDb();
    const ana = await makeUser(db);
    const bia = await makeUser(db, { email: "bia@exemplo.com" });
    saveFarm(db, ana, { animals: { cows: 2 }, crops: [] });
    saveFarm(db, bia, { animals: { pigs: 4 }, crops: [] });
    expect(getFarm(db, ana).animals).toEqual([{ id: "cows", count: 2 }]);
  });
});
