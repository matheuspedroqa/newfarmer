import { z, type ZodError } from "zod";
import { ANIMAL_IDS, CROP_IDS } from "./catalog";
import { normalizeUsername, usernameProblem } from "./username";

const email = z.string().trim().toLowerCase().min(1, "required").email("emailInvalid");
const username = z
  .string({ required_error: "usernameInvalid", invalid_type_error: "usernameInvalid" })
  .transform(normalizeUsername)
  .superRefine((value, ctx) => {
    const problem = usernameProblem(value);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  });
const newPassword = z.string().min(1, "required").min(8, "passwordTooShort").max(128, "passwordTooLong");

export const citySchema = z.object(
  {
    label: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    countryCode: z.string().min(2).max(3),
  },
  { required_error: "cityRequired", invalid_type_error: "cityRequired" },
);
export type CityChoice = z.infer<typeof citySchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(80, "tooLong"),
    email,
    username,
    password: newPassword,
    confirmPassword: z.string(),
    city: citySchema,
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({ username: z.string().trim().min(1, "required").max(254, "tooLong"), password: z.string().min(1, "required") });

export const forgotSchema = z.object({ identifier: z.string().trim().min(1, "required").max(254, "tooLong") });

export const usernameReminderSchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });

export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.length ? issue.path.join(".") : "form";
    result[field] ??= issue.message;
  }
  return result;
}

export const MAX_ANIMAL_COUNT = 100_000;

const animalCount = z.coerce
  .number({ invalid_type_error: "countInvalid" })
  .int("countInvalid")
  .min(1, "countTooSmall")
  .max(MAX_ANIMAL_COUNT, "countTooLarge");

export const farmSchema = z.object({
  animals: z.record(z.enum(ANIMAL_IDS), animalCount),
  crops: z.array(z.enum(CROP_IDS)),
});
export type FarmInput = z.infer<typeof farmSchema>;

export function parseFarmForm(formData: FormData): { animals: Record<string, string>; crops: string[] } {
  const animals: Record<string, string> = {};
  for (const id of ANIMAL_IDS) {
    if (formData.get(`animal:${id}`) === "on") animals[id] = String(formData.get(`count:${id}`) ?? "");
  }
  return { animals, crops: formData.getAll("crop").map(String) };
}

export function parseCityField(raw: FormDataEntryValue | null): unknown {
  try {
    return typeof raw === "string" && raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "required"), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });

export const DIARY_KINDS = ["vaccine", "medicine", "birth", "illness", "feeding", "other"] as const;

function isRealDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export const diarySchema = z.object({
  animalId: z.enum(ANIMAL_IDS),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateInvalid")
    .refine(isRealDate, "dateInvalid")
    // um dia de folga: o fuso da pessoa pode estar à frente do servidor
    .refine((v) => v <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), "dateInFuture"),
  kind: z.enum(DIARY_KINDS),
  animalName: z.string().nullish().transform((v) => (v ?? "").trim()).pipe(z.string().max(60, "tooLong")),
  note: z.string().trim().min(1, "required").max(1000, "tooLong"),
});
export type DiaryInput = z.infer<typeof diarySchema>;
