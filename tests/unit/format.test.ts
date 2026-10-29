import { describe, expect, it } from "vitest";
import { formatDay, formatTime } from "@/lib/format";

describe("formatDay", () => {
  it("dia curto em português e inglês (29/10/2026 é quinta-feira)", () => {
    expect(formatDay("2026-10-29", "pt", "short").toLowerCase()).toContain("qui");
    expect(formatDay("2026-10-29", "en", "short")).toContain("Thu");
  });

  it("dia longo traz o dia do mês", () => {
    expect(formatDay("2026-10-29", "pt", "long")).toContain("29");
    expect(formatDay("2026-10-29", "en", "long")).toContain("29");
  });
});

describe("formatTime", () => {
  it("mostra horas e minutos", () => {
    expect(formatTime(Date.UTC(2026, 9, 29, 14, 5), "pt")).toMatch(/\d{2}:\d{2}/);
  });
});
