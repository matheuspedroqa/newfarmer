import { CROPS, type CropId } from "./catalog";
import type { ClimateZone, Hemisphere } from "@/server/climate";

export type Season = "summer" | "autumn" | "winter" | "spring";
export type Activity = "directSowing" | "seedbed" | "transplant" | "harvest";
export const ACTIVITIES: Activity[] = ["directSowing", "seedbed", "transplant", "harvest"];

export type CropCalendar = Record<Activity, number[]> & { notes?: { pt: string; en: string } };

// Calendários são escritos na referência do hemisfério sul.
export function toUserMonth(month: number, hemisphere: Hemisphere): number {
  return hemisphere === "south" ? month : ((month + 5) % 12) + 1;
}

const SOUTH_SEASONS: Season[] = [
  "summer", "summer", "autumn", "autumn", "autumn", "winter",
  "winter", "winter", "spring", "spring", "spring", "summer",
];
const OPPOSITE: Record<Season, Season> = { summer: "winter", winter: "summer", autumn: "spring", spring: "autumn" };

export function seasonFor(month: number, hemisphere: Hemisphere): Season {
  const south = SOUTH_SEASONS[month - 1];
  return hemisphere === "south" ? south : OPPOSITE[south];
}

export function userCalendar(calendar: CropCalendar, hemisphere: Hemisphere): Record<Activity, number[]> {
  return Object.fromEntries(
    ACTIVITIES.map((a) => [a, calendar[a].map((m) => toUserMonth(m, hemisphere)).sort((x, y) => x - y)]),
  ) as Record<Activity, number[]>;
}

export function monthlyTasks(
  crops: { id: CropId; calendar: Record<ClimateZone, CropCalendar> }[],
  zone: ClimateZone,
  hemisphere: Hemisphere,
  month: number,
): { cropId: CropId; activities: Activity[] }[] {
  return crops
    .map((crop) => {
      const cal = userCalendar(crop.calendar[zone], hemisphere);
      return { cropId: crop.id, activities: ACTIVITIES.filter((a) => cal[a].includes(month)) };
    })
    .filter((task) => task.activities.length > 0);
}

// Frutas que não são árvores (ciclo curto ou rasteiras): entram em "Este mês você pode plantar"; as outras frutas são árvores e ficam de fora.
const NOT_TREES: readonly CropId[] = ["watermelon", "melon", "strawberry", "pineapple"];
const SOWING: Activity[] = ["directSowing", "seedbed", "transplant"];

/** Tudo o que dá para semear ou transplantar neste mês no clima e hemisfério da pessoa, sem árvores frutíferas. */
export function plantableThisMonth(
  crops: { id: CropId; calendar: Record<ClimateZone, CropCalendar> }[],
  zone: ClimateZone,
  hemisphere: Hemisphere,
  month: number,
): CropId[] {
  const group = (id: CropId) => CROPS.find((c) => c.id === id)?.group;
  return crops
    .filter((c) => group(c.id) !== "fruits" || NOT_TREES.includes(c.id))
    .filter((c) => {
      const cal = userCalendar(c.calendar[zone], hemisphere);
      return SOWING.some((a) => cal[a].includes(month));
    })
    .map((c) => c.id);
}
