"use client";

import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/ui/empty-state";
import { ScheduleIcon, PlusIcon } from "../../../components/ui/icons";
import { Note } from "../../../components/ui/note";
import { Pill } from "../../../components/ui/pill";
import { StatusPill } from "../../../components/ui/status-pill";
import { toast } from "../../../components/ui/toaster";
import type { ShowcaseEntry } from "../../showcase/types";

const payments = [
  { id: "TX-2041", who: "Hana Bekele", status: "paid" },
  { id: "TX-2042", who: "Dawit Alemu", status: "pending" },
  { id: "TX-2043", who: "Selam Tadesse", status: "failed" },
  { id: "TX-2044", who: "Abel Girma", status: "refunded" },
];

export const statusFeedbackEntries: ShowcaseEntry[] = [
  {
    id: "status-pill",
    name: "StatusPill",
    category: "Status & Feedback",
    summary: "Shows the state of a record. The colour and wording come from one shared vocabulary.",
    scenario: "Payments list: the status column next to each transaction.",
    whenToUse: [
      "A record has a state that changes over time (paid, pending, failed).",
      "You need the same status to look the same on every screen.",
    ],
    avoid: ["A role or category (use a neutral Pill).", "A clickable filter (use Chip)."],
    source: "components/ui/status-pill.tsx",
    code: `<StatusPill kind="payment" status="paid" />`,
    Demo: function Demo() {
      return (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="flex flex-col">
                <span className="type-body font-medium text-text">{p.who}</span>
                <span className="type-body-sm text-text-faint">{p.id}</span>
              </div>
              <StatusPill kind="payment" status={p.status} />
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    id: "pill",
    name: "Pill",
    category: "Status & Feedback",
    summary: "A small read-only label for a fixed fact, such as a role or plan.",
    scenario: "Users directory: the role next to a person's name.",
    whenToUse: ["A label that doesn't change (role, plan, category).", "Two words at most."],
    avoid: ["A record state (use StatusPill).", "Anything the user can click (use Chip)."],
    source: "components/ui/pill.tsx",
    code: `<Pill>Admin</Pill>`,
    Demo: function Demo() {
      return (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {[
            ["Meron Haile", "Admin"],
            ["Yonas Kebede", "Operator"],
            ["Liya Mengistu", "Viewer"],
          ].map(([name, role]) => (
            <li key={name} className="flex items-center justify-between gap-4 py-2.5">
              <span className="type-body font-medium text-text">{name}</span>
              <Pill>{role}</Pill>
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    id: "empty-state",
    name: "EmptyState",
    category: "Status & Feedback",
    summary: "Tells the user what is missing and offers the one action that fills the space.",
    scenario: "Bookings page on the first visit, before any booking exists.",
    whenToUse: ["A list or page has no data yet.", "A search or filter returns nothing."],
    avoid: ["The data is still loading (pass `loading` and show a skeleton)."],
    source: "components/ui/empty-state.tsx",
    code: `<EmptyState
  icon={<ScheduleIcon />}
  title="No bookings yet"
  description="Bookings you create will show up here."
  actions={<Button><PlusIcon className="size-4" /> New booking</Button>}
/>`,
    Demo: function Demo() {
      return (
        <EmptyState
          icon={<ScheduleIcon />}
          title="No bookings yet"
          description="Bookings you create will show up here."
          actions={
            <Button>
              <PlusIcon className="size-4" /> New booking
            </Button>
          }
        />
      );
    },
  },
  {
    id: "toast",
    name: "toast",
    category: "Status & Feedback",
    summary: "A short message after an action. Success fades out; errors stay until dismissed.",
    scenario: "After saving a user or sending an invoice.",
    whenToUse: ["Telling the user an action worked or failed.", "An undo window after a quiet action."],
    avoid: ["A form field error (use Field `error`).", "A message the user must act on (use AlertDialog)."],
    source: "components/ui/toaster.tsx",
    code: `toast.success("Customer created", { body: "Hana Bekele was added." });
toast.error("Payment failed", { body: "Check the phone number and try again." });`,
    Demo: function Demo() {
      return (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success("Customer created", { body: "Hana Bekele was added." })}>Save customer</Button>
          <Button
            variant="secondary"
            onClick={() => toast.error("Payment failed", { body: "Check the phone number and try again." })}
          >
            Send payment
          </Button>
        </div>
      );
    },
  },
  {
    id: "note",
    name: "Note",
    category: "Status & Feedback",
    summary: "A quiet aside inside a screen or form.",
    scenario: "Under a payment form, reminding the user not to close the screen.",
    whenToUse: ["Extra context that does not need attention."],
    avoid: ["A real problem (use ErrorBanner)."],
    source: "components/ui/note.tsx",
    code: `<Note>Keep this screen open until the payment is confirmed.</Note>`,
    Demo: function Demo() {
      return <Note>Keep this screen open until the payment is confirmed.</Note>;
    },
  },
];
