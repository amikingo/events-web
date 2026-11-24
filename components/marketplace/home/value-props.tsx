import type { ReactNode } from "react";
import { HOLD_MINUTES, ORDER_TICKET_LIMIT } from "../../../lib/marketplace/config";
import { CardIcon, ShieldIcon, UndoIcon } from "../../ui/icons";

/** Why book here: three plain promises, each backed by how checkout actually works. Shown by `WhyBookReveal`. */
export const PROPS: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <ShieldIcon />, title: "The price you see is the price you pay", body: "Service fee and VAT are shown before checkout, never added at the last step." },
  { icon: <CardIcon />, title: "Tickets on your phone in seconds", body: `Pay with Telebirr, CBE Birr or your wallet. We hold your seats for ${HOLD_MINUTES} minutes while you check out, up to ${ORDER_TICKET_LIMIT} per order.` },
  { icon: <UndoIcon />, title: "Refunded if it's cancelled", body: "If an organizer cancels, your money goes back to your payment method automatically." },
];
