import type { ComponentType } from "react";

export const SHOWCASE_CATEGORIES = [
  "Actions",
  "Forms & Inputs",
  "Status & Feedback",
  "Cards & Lists",
  "Charts",
  "Dialogs",
  "Navigation",
] as const;

export type ShowcaseCategory = (typeof SHOWCASE_CATEGORIES)[number];

/**
 * One component page in the library. Add an entry to a file in `lib/showcase/entries/`
 * and it appears at /components automatically.
 */
export interface ShowcaseEntry {
  /** URL-safe id, unique. Used in the link: /components?c=<id> */
  id: string;
  /** Name as imported, e.g. "StatusPill". */
  name: string;
  category: ShowcaseCategory;
  /** One sentence: what it is. */
  summary: string;
  /** The real screen this belongs in, e.g. "Payments list: the status column". */
  scenario: string;
  /** Situations where this is the right component. */
  whenToUse: string[];
  /** Situations that need a different component (name it). */
  avoid?: string[];
  /** Path of the component file, relative to the project root. */
  source: string;
  /** The snippet developers copy. Keep it the same as what Demo renders. */
  code: string;
  /** A live demo in a realistic context. May use hooks. */
  Demo: ComponentType;
}
