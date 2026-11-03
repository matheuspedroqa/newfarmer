import { describe, expect, it } from "vitest";
import { getUserById } from "@/server/accounts";
import { changeCity } from "@/server/registration";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";
import { makeUser } from "../helpers/users";

describe("changeCity", () => {
  it("troca a cidade e recalcula clima e hemisfério", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const provider = createFakeWeatherProvider();
    const [lisboa] = await provider.searchCities("Lisboa", "pt");
    await changeCity(db, provider, id, lisboa);
    expect(await getUserById(db, id)).toMatchObject({
      cityLabel: "Lisboa, Lisboa, Portugal",
      latitude: 38.72,
      countryCode: "PT",
      climateZone: "subtropical",
      climateEstimated: false,
      hemisphere: "north",
    });
  });

  it("serviço de clima fora: estima pela latitude", async () => {
    const db = await testDb();
    const id = await makeUser(db);
    const [campinas] = await createFakeWeatherProvider().searchCities("Campinas", "pt");
    await changeCity(db, createFakeWeatherProvider({ failNormals: true }), id, campinas);
    expect(await getUserById(db, id)).toMatchObject({ climateZone: "tropical", climateEstimated: true });
  });
});
