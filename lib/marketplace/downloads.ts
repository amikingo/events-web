"use client";

import { formatEventDate, formatEventTime } from "./datetime";
import { qrPath } from "./qr";
import type { EventSummary, IssuedTicket, Order } from "../../types/marketplace";

/**
 * Client-side file downloads: a ticket as an SVG image and an event as an .ics calendar file. Files are standalone, so
 * they carry literal colours (black on white) rather than theme tokens.
 */

function save(filename: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function downloadTicket(ticket: IssuedTicket, order: Order, event: EventSummary) {
  const { d, size } = qrPath(ticket.id);
  const where = event.format === "online" ? `Online · ${event.onlinePlatform ?? ""}` : `${event.venueName ?? ""}, ${event.cityName ?? ""}`;
  const line = (y: number, label: string, value: string) =>
    `<text x="32" y="${y}" font-size="11" fill="dimgray" letter-spacing="1">${esc(label.toUpperCase())}</text><text x="32" y="${y + 20}" font-size="16" fill="black">${esc(value)}</text>`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360" font-family="Poppins, Helvetica, Arial, sans-serif">
  <rect width="720" height="360" rx="20" fill="white" stroke="lightgray"/>
  <text x="32" y="52" font-size="24" font-weight="700" fill="black">${esc(event.title)}</text>
  ${line(90, "When", `${formatEventDate(event.startsAt, { weekday: true })} · ${formatEventTime(event.startsAt)}`)}
  ${line(146, "Where", where)}
  ${line(202, "Ticket holder", ticket.holder.name)}
  ${line(258, "Ticket", `${ticket.ticketTypeName} · ${ticket.id}`)}
  <text x="32" y="330" font-size="11" fill="dimgray">Order ${esc(order.ref)} · Demo ticket, not valid for entry</text>
  <line x1="470" y1="24" x2="470" y2="336" stroke="lightgray" stroke-dasharray="6 6"/>
  <g transform="translate(500 70) scale(${(190 / size).toFixed(3)})"><rect width="${size}" height="${size}" fill="white"/><path d="${d}" fill="black"/></g>
  <text x="595" y="300" font-size="13" text-anchor="middle" fill="black">${esc(ticket.id)}</text>
</svg>`;
  save(`${ticket.id}.svg`, "image/svg+xml", svg);
}

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function downloadCalendar(event: EventSummary, url: string) {
  const location = event.format === "online" ? `Online (${event.onlinePlatform ?? "link on your ticket"})` : [event.venueName, event.venueAddress, event.cityName].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cheche Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@cheche-events`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${event.title.replace(/[,;]/g, "\\$&")}`,
    `LOCATION:${location.replace(/[,;]/g, "\\$&")}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  save(`${event.slug}.ics`, "text/calendar", ics);
}
