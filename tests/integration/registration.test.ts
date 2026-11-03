import { describe, expect, it } from "vitest";
import type { SignupInput } from "@/lib/validation";
import { getUserById } from "@/server/accounts";
import { refreshEstimatedClimate, registerUser } from "@/server/registration";
import { createFakeWeatherProvider } from "@/server/weather/fake";
import { testDb } from "../helpers/db";

const input = (city: SignupInput["city"]): SignupInput => ({
  name: "Ana",
  email: "ana@exemplo.com",
  username: "ana",
  password: "segredo123",
  confirmPassword: "segredo123",
  city,
});

describe("registerUser", () => {
  it("descobre o tipo de clima e o hemisfério pela cidade", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider();
    const [curitiba] = await provider.searchCities("Curitiba", "pt");
    const result = await registerUser(db, provider, input(curitiba));
    expect(result.ok).toBe(true);
    const user = await getUserById(db, (result as { userId: number }).userId)!;
    expect(user).toMatchObject({ climateZone: "subtropical", climateEstimated: false, hemisphere: "south" });
  });

  it("hemisfério norte para Lisboa", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider();
    const [lisboa] = await provider.searchCities("Lisboa", "pt");
    const result = await registerUser(db, provider, input(lisboa));
    expect((await getUserById(db, (result as { userId: number }).userId))!.hemisphere).toBe("north");
  });

  it("se o serviço de clima falhar, estima pela latitude e marca como estimado", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider({ failNormals: true });
    const [campinas] = await provider.searchCities("Campinas", "pt");
    const result = await registerUser(db, provider, input(campinas));
    expect(await getUserById(db, (result as { userId: number }).userId)).toMatchObject({
      climateZone: "tropical",
      climateEstimated: true,
    });
  });

  it("e-mail repetido devolve emailTaken", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider();
    const [campinas] = await provider.searchCities("Campinas", "pt");
    await registerUser(db, provider, input(campinas));
    expect(await registerUser(db, provider, input(campinas))).toEqual({ ok: false, error: "emailTaken" });
  });
});

describe("refreshEstimatedClimate", () => {
  it("recalcula quando o clima estava estimado e o serviço voltou", async () => {
    const db = await testDb();
    const [curitiba] = await createFakeWeatherProvider().searchCities("Curitiba", "pt");
    const result = await registerUser(db, createFakeWeatherProvider({ failNormals: true }), input(curitiba));
    const userId = (result as { userId: number }).userId;
    expect(await getUserById(db, userId)).toMatchObject({ climateZone: "subtropical", climateEstimated: true });

    await refreshEstimatedClimate(db, createFakeWeatherProvider(), userId);
    expect(await getUserById(db, userId)).toMatchObject({ climateZone: "subtropical", climateEstimated: false });
  });

  it("não faz nada se o serviço continuar fora", async () => {
    const db = await testDb();
    const provider = createFakeWeatherProvider({ failNormals: true });
    const [campinas] = await provider.searchCities("Campinas", "pt");
    const userId = ((await registerUser(db, provider, input(campinas))) as { userId: number }).userId;
    await expect(refreshEstimatedClimate(db, provider, userId)).resolves.toBeUndefined();
    expect((await getUserById(db, userId))!.climateEstimated).toBe(true);
  });
});
