"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalSteps } from "./modal";

export interface StepModalStep {
  label: string;
  content: ReactNode;
}

export interface StepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  steps: StepModalStep[];
  /** Return false to keep the user on a step (validation). Receives the 1-based step. */
  canAdvance?: (step: number) => boolean;
  onFinish: () => void;
  container?: "viewport" | "parent";
}

/** A short wizard in one modal: stepper under the header, one pane at a time, "Step n of N" with Back and Next / Finish in the footer. */
export function StepModal({ open, onOpenChange, title, subtitle, steps, canAdvance, onFinish, container }: StepModalProps) {
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);
  const total = steps.length;
  return (
    <Modal open={open} onOpenChange={onOpenChange} container={container} aria-label={typeof title === "string" ? title : undefined}>
      <ModalHeader title={title} subtitle={subtitle} onClose={() => onOpenChange(false)} />
      <ModalSteps steps={steps.map((s) => s.label)} current={step} />
      <ModalBody>{steps[step - 1]?.content}</ModalBody>
      <ModalFooter left={`Step ${step} of ${total}`}>
        <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Button
          data-autofocus
          onClick={() => {
            if (canAdvance && !canAdvance(step)) return;
            if (step === total) onFinish();
            else setStep(step + 1);
          }}
        >
          {step === total ? "Finish" : "Next"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
