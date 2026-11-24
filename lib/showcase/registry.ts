import { cardDialogNavEntries } from "./entries/cards-dialogs-nav";
import { chartEntries } from "./entries/charts";
import { chartMoreEntries } from "./entries/charts-more";
import { formEntries } from "./entries/forms";
import { statusFeedbackEntries } from "./entries/status-feedback";
import type { ShowcaseEntry } from "./types";

/**
 * Every component page in /components. To document a component, add an entry in one of the
 * files in ./entries (or create a new file and list it here).
 */
export const SHOWCASE_ENTRIES: ShowcaseEntry[] = [
  ...formEntries,
  ...statusFeedbackEntries,
  ...cardDialogNavEntries,
  ...chartEntries,
  ...chartMoreEntries,
];
