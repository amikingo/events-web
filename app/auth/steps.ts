/** Every screen of the single auth page at /auth. Plain data, so it can be read from server and client code alike. */
export type Step = "sign-in" | "code" | "sign-up" | "forgot" | "reset" | "two-step";
export const STEPS: readonly Step[] = ["sign-in", "code", "sign-up", "forgot", "reset", "two-step"];

/** The step named by `?step=`, or the first screen when it is missing or unknown. */
export function stepFromParam(value: string | null | undefined): Step {
  return STEPS.find((s) => s === value) ?? "sign-in";
}

/** The address of a step. The first screen has a clean `/auth`; `next` rides along so it survives every step. */
export function stepUrl(step: Step, next?: string | null): string {
  const params = new URLSearchParams();
  if (step !== "sign-in") params.set("step", step);
  if (next) params.set("next", next);
  const query = params.toString();
  return query ? `/auth?${query}` : "/auth";
}
