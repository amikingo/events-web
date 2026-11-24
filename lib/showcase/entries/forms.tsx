"use client";

import { useState } from "react";
import { AmountInput } from "../../../components/ui/amount-input";
import { Button } from "../../../components/ui/button";
import { Field } from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { PhoneInput } from "../../../components/ui/phone-input";
import { SegmentedControl } from "../../../components/ui/segmented-control";
import { toast } from "../../../components/ui/toaster";
import type { ShowcaseEntry } from "../../showcase/types";

export const formEntries: ShowcaseEntry[] = [
  {
    id: "button",
    name: "Button",
    category: "Actions",
    summary: "The trigger for an action. One primary button per screen.",
    scenario: "Bottom of a create-customer form: Save and Cancel.",
    whenToUse: ["Submitting a form.", "Starting an action such as 'New booking'."],
    avoid: ["Navigating to another page (use TextLink).", "An icon-only toolbar action (use IconButton)."],
    source: "components/ui/button.tsx",
    code: `<Button loading={saving} loadingLabel="Saving">Create customer</Button>
<Button variant="secondary">Cancel</Button>`,
    Demo: function Demo() {
      const [saving, setSaving] = useState(false);
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            loading={saving}
            loadingLabel="Saving"
            onClick={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                toast.success("Customer created");
              }, 1200);
            }}
          >
            Create customer
          </Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      );
    },
  },
  {
    id: "field-input",
    name: "Field + Input",
    category: "Forms & Inputs",
    summary: "A label, a text box and a message under it. Errors replace the hint.",
    scenario: "Create-user page: full name with a validation error.",
    whenToUse: ["Any single form control that needs a label.", "Showing a validation error under a control."],
    avoid: ["A phone number (use PhoneInput).", "Money (use AmountInput)."],
    source: "components/ui/field.tsx",
    code: `<Field label="Full name" htmlFor="name" required error={error}>
  <Input id="name" value={name} error={!!error} onChange={(e) => setName(e.target.value)} />
</Field>`,
    Demo: function Demo() {
      const [name, setName] = useState("");
      const error = name.length > 0 && name.trim().split(" ").length < 2 ? "Enter first and last name." : undefined;
      return (
        <div className="max-w-sm">
          <Field label="Full name" htmlFor="demo-name" required hint="As it appears on their ID." error={error}>
            <Input id="demo-name" value={name} error={!!error} onChange={(e) => setName(e.target.value)} placeholder="Hana Bekele" />
          </Field>
        </div>
      );
    },
  },
  {
    id: "phone-input",
    name: "PhoneInput",
    category: "Forms & Inputs",
    summary: "An Ethiopian phone number with a fixed +251 prefix and automatic grouping.",
    scenario: "Create-customer page: the contact phone.",
    whenToUse: ["Any phone number field."],
    avoid: ["A plain text Input for phone numbers."],
    source: "components/ui/phone-input.tsx",
    code: `<Field label="Phone number" htmlFor="phone">
  <PhoneInput id="phone" value={phone} onValueChange={setPhone} />
</Field>`,
    Demo: function Demo() {
      const [phone, setPhone] = useState("");
      return (
        <div className="max-w-sm">
          <Field label="Phone number" htmlFor="demo-phone">
            <PhoneInput id="demo-phone" value={phone} onValueChange={setPhone} />
          </Field>
        </div>
      );
    },
  },
  {
    id: "amount-input",
    name: "AmountInput",
    category: "Forms & Inputs",
    summary: "Money field with thousands separators and the currency beside it.",
    scenario: "Record payment page: the amount received.",
    whenToUse: ["Any money value the user types."],
    avoid: ["A plain number Input for money."],
    source: "components/ui/amount-input.tsx",
    code: `<Field label="Amount" htmlFor="amount">
  <AmountInput id="amount" value={amount} onValueChange={setAmount} />
</Field>`,
    Demo: function Demo() {
      const [amount, setAmount] = useState("2550");
      return (
        <div className="max-w-sm">
          <Field label="Amount" htmlFor="demo-amount">
            <AmountInput id="demo-amount" value={amount} onValueChange={setAmount} />
          </Field>
        </div>
      );
    },
  },
  {
    id: "segmented-control",
    name: "SegmentedControl",
    category: "Forms & Inputs",
    summary: "Switch between two to four views or options in the same place.",
    scenario: "Operations page: switch between the table and the board.",
    whenToUse: ["A short list of mutually exclusive options.", "Changing how the same data is shown."],
    avoid: ["Switching between different pages of content (use Tabs).", "More than five options (use Select)."],
    source: "components/ui/segmented-control.tsx",
    code: `<SegmentedControl
  value={view}
  onValueChange={setView}
  aria-label="View"
  options={[{ value: "table", label: "Table" }, { value: "board", label: "Board" }]}
/>`,
    Demo: function Demo() {
      const [view, setView] = useState("table");
      return (
        <div className="flex flex-col gap-3">
          <SegmentedControl
            value={view}
            onValueChange={setView}
            aria-label="View"
            options={[
              { value: "table", label: "Table" },
              { value: "board", label: "Board" },
            ]}
          />
          <p className="type-body-sm m-0 text-text-faint">Showing the {view} view.</p>
        </div>
      );
    },
  },
];
