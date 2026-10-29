import { z, type ZodError } from "zod";

const email = z.string().trim().toLowerCase().min(1, "required").email("emailInvalid");
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
    password: newPassword,
    confirmPassword: z.string(),
    city: citySchema,
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1, "required") });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "passwordsDontMatch" });

export function toFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    result[field] ??= issue.message;
  }
  return result;
}
