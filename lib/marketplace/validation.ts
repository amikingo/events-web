/**
 * Small typed validators for the attendee forms. They return the inline error text (guideline voice: what to do, no
 * "invalid input") or `undefined` when the value is fine. The project has no schema library installed, and these few
 * rules don't justify adding one.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^251/, "").replace(/^0/, "").slice(0, 9);
}

export function isValidPhone(value: string): boolean {
  const d = phoneDigits(value);
  return d.length === 9 && /^[79]/.test(d);
}

/** `911204412` → `911 204 412` (the shape `PhoneInput` works with). */
export function groupPhone(digits: string): string {
  const d = phoneDigits(digits);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(" ");
}

export function validateName(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Enter the full name.";
  if (v.length < 2) return "Enter at least two characters.";
  if (v.length > 80) return "Use 80 characters or fewer.";
  return undefined;
}

export function validateEmail(value: string, { required = true }: { required?: boolean } = {}): string | undefined {
  const v = value.trim();
  if (!v) return required ? "Enter an email address." : undefined;
  if (!EMAIL.test(v)) return "Enter an email like name@example.com.";
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!phoneDigits(value)) return "Enter a phone number.";
  if (!isValidPhone(value)) return "Enter a 9-digit number starting with 9 or 7.";
  return undefined;
}

export function validateRequired(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `Enter ${label.toLowerCase()}.`;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
