import { describe, expect, it } from "vitest";
import { diarySchema, toFieldErrors } from "@/lib/validation";

const ok = { animalId: "goats", date: "2026-11-02", kind: "medicine", animalName: " Malhada ", note: " Vermífugo " };

function errorsOf(data: unknown) {
  const r = diarySchema.safeParse(data);
  return r.success ? {} : toFieldErrors(r.error);
}

describe("diarySchema", () => {
  it("aceita uma anotação e limpa espaços", () => {
    expect(diarySchema.parse(ok)).toEqual({ ...ok, animalName: "Malhada", note: "Vermífugo" });
  });

  it("nome do animal é opcional", () => {
    expect(diarySchema.parse({ ...ok, animalName: null }).animalName).toBe("");
  });

  it.each([
    [{ note: "  " }, "note", "required"],
    [{ note: "x".repeat(1001) }, "note", "tooLong"],
    [{ animalName: "x".repeat(61) }, "animalName", "tooLong"],
    [{ date: "" }, "date", "dateInvalid"],
    [{ date: "2026-02-30" }, "date", "dateInvalid"],
    [{ date: "2999-01-01" }, "date", "dateInFuture"],
  ])("%j → %s: %s", (patch, field, code) => {
    expect(errorsOf({ ...ok, ...patch })[field]).toBe(code);
  });

  it("recusa animal ou tipo fora da lista", () => {
    expect(diarySchema.safeParse({ ...ok, animalId: "dragons" }).success).toBe(false);
    expect(diarySchema.safeParse({ ...ok, kind: "magic" }).success).toBe(false);
  });
});
