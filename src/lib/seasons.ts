import type { CropId } from "./catalog";
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
