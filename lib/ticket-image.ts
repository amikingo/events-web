/**
 * A ticket as a PNG, drawn on a canvas in one of the ready-made designs, or on the organizer's own artwork. This one picture is what's shown on screen, downloaded,
 * shared and printed, so they can't differ. The QR holds the ticket's code only (always black on white, so it scans);
 * the order reference and token are never put on a ticket, so one can be passed to a friend. Colours and the font come
 * from the design tokens.
 */
import { WIDE_DRAW } from "@/lib/ticket-wide";

/** The ready-made designs. `picture`: the event's cover (or a background picture) shows on it. */
export const TICKET_DESIGNS = [
  { value: "poster", label: "Poster", picture: true },
  { value: "stub", label: "Stub", picture: true },
  { value: "minimal", label: "Minimal", picture: false },
  { value: "night", label: "Night", picture: true },
  { value: "concert", label: "Concert", picture: true },
  { value: "cinema", label: "Cinema", picture: false },
  { value: "festival", label: "Festival", picture: true },
  { value: "classic", label: "Classic", picture: false },
  { value: "gold", label: "Gold", picture: false },
  { value: "curtain", label: "Theatre", picture: false },
  { value: "stage", label: "Stage", picture: true },
  { value: "starlight", label: "Starlight", picture: false },
  { value: "neo", label: "Club", picture: false },
  { value: "vintage", label: "Vintage", picture: false },
  { value: "pop", label: "Pop", picture: false },
  { value: "gallery", label: "Gallery", picture: true },
  { value: "slant", label: "Slant", picture: true },
  { value: "spotlight", label: "Spotlight", picture: true },
  { value: "sport", label: "Sport", picture: true },
  { value: "gala", label: "Gala", picture: true },
] as const;

/** One of the ready-made designs. */
export type StandardDesign = (typeof TICKET_DESIGNS)[number]["value"];
/** A ready-made design, or the organizer's own artwork with the QR placed on it. */
export type TicketDesign = StandardDesign | "custom";

/** How big the QR panel is on custom artwork, as a share of the artwork's shorter side. */
export const QR_SIZES = [
  { value: "s", label: "Small", share: 0.32 },
  { value: "m", label: "Medium", share: 0.44 },
  { value: "l", label: "Large", share: 0.58 },
] as const;

/** A ticket the organizer made elsewhere (a design tool, a template), uploaded as one picture. */
export interface TicketArtwork {
  /** A data URL. */
  image: string;
  width: number;
  height: number;
  /** Where the middle of the QR panel goes, from 0 to 1 across and down; kept inside the picture. */
  x: number;
  y: number;
  qrSize: (typeof QR_SIZES)[number]["value"];
}

/** Each ready-made design's picture size, in pixels. */
export const TICKET_SIZE: Record<StandardDesign, { width: number; height: number }> = {
  poster: { width: 1080, height: 1760 },
  stub: { width: 1800, height: 760 },
  minimal: { width: 1080, height: 1640 },
  night: { width: 1080, height: 1760 },
  concert: { width: 1080, height: 1760 },
  cinema: { width: 1800, height: 760 },
  festival: { width: 1080, height: 1760 },
  classic: { width: 1080, height: 1760 },
  gold: { width: 1800, height: 720 },
  curtain: { width: 1800, height: 720 },
  stage: { width: 1800, height: 720 },
  starlight: { width: 1800, height: 720 },
  neo: { width: 1800, height: 720 },
  vintage: { width: 1800, height: 720 },
  pop: { width: 1800, height: 720 },
  gallery: { width: 1800, height: 720 },
  slant: { width: 1800, height: 720 },
  spotlight: { width: 1800, height: 720 },
  sport: { width: 1800, height: 720 },
  gala: { width: 1800, height: 720 },
};

/** The size of a ticket's picture: custom artwork keeps its own. */
export function ticketSize(design: TicketDesign, artwork?: TicketArtwork | null): { width: number; height: number } {
  if (design !== "custom") return TICKET_SIZE[design];
  return artwork ? { width: artwork.width, height: artwork.height } : TICKET_SIZE.poster;
}

/** The colours an organizer may pick for a ticket (design tokens, never hex values). None: the design's own. */
export const TICKET_COLORS = [
  { value: "--color-accent-fill", label: "Pink" },
  { value: "--color-accent-deep", label: "Wine" },
  { value: "--color-cbe", label: "Purple" },
  { value: "--color-success-fill", label: "Green" },
  { value: "--color-warning-fill", label: "Amber" },
  { value: "--ticket-brick", label: "Red" },
  { value: "--ticket-orange", label: "Orange" },
  { value: "--ticket-blue", label: "Blue" },
  { value: "--ticket-teal", label: "Teal" },
  { value: "--color-paper-ink", label: "Black" },
] as const;

/** One of the ready-made colours, or any other as `#rrggbb` (picked by the organizer). */
export type TicketColor = (typeof TICKET_COLORS)[number]["value"] | `#${string}`;

export interface TicketImageData {
  eventName: string;
  organizerName: string;
  /** The full Ethiopian-first date and time. */
  when: string;
  /** The short form, "Hidar 21, 2019 · Nov 30, 2:00 AM". */
  whenShort: string;
  venue?: string | null;
  guest?: string | null;
  ticketType: string;
  code: string;
  coverUrl?: string | null;
  /**
   * The organizer's own picture (a data URL). The designs built around a picture get it as `coverUrl`; the others show
   * it from here, in a place of their own.
   */
  photo?: string | null;
  /** The ticket's QR as a data URL. */
  qr: string;
  /** The organizer's own choices (the design editor). */
  color?: TicketColor | null;
  /** A picture as a data URL. */
  logo?: string | null;
  /** A short line printed in place of "Show this QR or the code at the door". */
  note?: string | null;
  /** The organizer's own picture, for the custom design. */
  artwork?: TicketArtwork | null;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const loadImage = (src: string, crossOrigin = false) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // A cover that won't load leaves the brand colours instead.
    image.src = src;
  });

/** Splits text into at most `max` lines that fit `width`, ending the last one with "…" when more is left. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= max && lines.every((l) => ctx.measureText(l).width <= width)) return lines;
  const kept = lines.slice(0, max);
  let last = kept[kept.length - 1] ?? "";
  const cut = lines.length > max;
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  if (cut || last !== kept[kept.length - 1]) kept[kept.length - 1] = `${last}…`;
  return kept;
}

/** The canvas and the few things every design draws. */
async function stage(data: TicketImageData, size: { width: number; height: number }) {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const colors = {
    ink: token("--color-paper-ink"),
    paper: token("--color-paper"),
    line: token("--color-paper-line"),
    accent: data.color?.startsWith("#") ? data.color : token(data.color ?? "--color-accent-fill"),
    // The second stop of the brand gradient (a ticket with no picture).
    deep: token(!data.color || data.color === "--color-accent-fill" ? "--color-accent-deep" : "--color-paper-ink"),
  };
  const family = token("--font-sans");
  // A canvas doesn't ask for a font by itself: load the weights used here, so the picture matches the screen.
  await Promise.all([500, 600, 700].map((weight) => document.fonts.load(`${weight} 40px ${family}`).catch(() => [])));

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d")!;
  // A picture from the API is asked for again with CORS (and its own address, so a cached copy without CORS isn't
  // reused); an uploaded one is already in memory.
  const coverSrc = data.coverUrl && !data.coverUrl.startsWith("data:") ? `${data.coverUrl}${data.coverUrl.includes("?") ? "&" : "?"}for=ticket` : data.coverUrl;
  const cover = coverSrc ? await loadImage(coverSrc, !coverSrc.startsWith("data:")) : null;
  const qr = await loadImage(data.qr);
  const logo = data.logo ? await loadImage(data.logo) : null;
  const photo = data.photo ? await loadImage(data.photo) : null;

  /** `color` moved `amount` of the way towards `other` (0 to 1). Both are any CSS colour. */
  const mix = (color: string, other: string, amount: number) => {
    // The canvas hands a colour back as #rrggbb.
    const channels = (value: string) => {
      ctx.fillStyle = value;
      const hex = String(ctx.fillStyle);
      return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    };
    const from = channels(color);
    const to = channels(other);
    return `#${from.map((v, i) => Math.round(v + (to[i]! - v) * amount).toString(16).padStart(2, "0")).join("")}`;
  };

  // A colour of the organizer's own may be too pale for white text: darken it until it isn't.
  if (data.color?.startsWith("#")) {
    const brightness = (color: string) => {
      const hex = mix(color, color, 0);
      const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    while (brightness(colors.accent) > 0.62) colors.accent = mix(colors.accent, colors.ink, 0.12);
  }
  /** The colour the organizer picked, or null for the design's own. */
  const chosen = data.color ? colors.accent : null;

  const font = (weight: number, px: number, face = family) => {
    ctx.font = `${weight} ${px}px ${face}`;
  };
  /** Lines of text from `y` (the first baseline) downward; returns the baseline after the last. */
  const text = (value: string, x: number, y: number, o: { width: number; max?: number; px: number; weight?: number; color: string; alpha?: number; gap?: number }) => {
    font(o.weight ?? 600, o.px);
    ctx.fillStyle = o.color;
    ctx.globalAlpha = o.alpha ?? 1;
    let at = y;
    for (const l of wrap(ctx, value, o.width, o.max ?? 1)) {
      ctx.fillText(l, x, at);
      at += o.px + (o.gap ?? 12);
    }
    ctx.globalAlpha = 1;
    return at;
  };
  /** An image cropped to fill a box. */
  const crop = (image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  };
  /** The organizer's own picture in a box, faint when `alpha` is low. False when none was added. */
  const own = (x: number, y: number, w: number, h: number, alpha = 1, mode: GlobalCompositeOperation = "source-over") => {
    if (!photo) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    crop(photo, x, y, w, h);
    ctx.restore();
    return true;
  };
  /** The cover cropped to fill a box, or the brand gradient. */
  const picture = (x: number, y: number, w: number, h: number) => {
    if (cover) crop(cover, x, y, w, h);
    else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, colors.accent);
      g.addColorStop(1, colors.deep);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
  };
  /** A darkening layer from `from` to `to` opacity, top to bottom. */
  const shade = (x: number, y: number, w: number, h: number, from: number, to: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(0,0,0,${from})`);
    g.addColorStop(1, `rgba(0,0,0,${to})`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  /** The ticket type in a coloured pill; `x` is its right edge when `right`. */
  const pill = (x: number, y: number, px: number, maxWidth: number, right = false) => {
    font(600, px);
    const label = wrap(ctx, data.ticketType, maxWidth - px * 1.8, 1)[0] ?? "";
    const w = ctx.measureText(label).width + px * 1.8;
    const h = px * 2;
    const left = right ? x - w : x;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.roundRect(left, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = colors.paper;
    ctx.textBaseline = "middle";
    ctx.fillText(label, left + px * 0.9, y + h / 2 + 2);
    ctx.textBaseline = "alphabetic";
  };
  /** A dashed tear line with a see-through notch at each end. */
  const tear = (x1: number, y1: number, x2: number, y2: number, color = colors.line) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(x1 + (x1 === x2 ? 0 : 60), y1 + (y1 === y2 ? 0 : 60));
    ctx.lineTo(x2 - (x1 === x2 ? 0 : 60), y2 - (y1 === y2 ? 0 : 60));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = "destination-out";
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };
  /** The QR (on its own white square) and the spaced code under it, centred on `cx`. */
  const scan = (cx: number, y: number, side: number, codeColor: string, codePx: number) => {
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.roundRect(cx - side / 2 - 18, y - 18, side + 36, side + 36, 24);
    ctx.fill();
    if (qr) ctx.drawImage(qr, cx - side / 2, y, side, side);
    ctx.textAlign = "center";
    font(700, codePx, MONO);
    ctx.fillStyle = codeColor;
    ctx.fillText(data.code.split("").join(" "), cx, y + side + 36 + codePx);
    ctx.textAlign = "left";
    return y + side + 36 + codePx;
  };
  const centred = (value: string, cx: number, y: number, px: number, color: string, alpha = 0.6) => {
    ctx.textAlign = "center";
    font(500, px);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillText(value, cx, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  };

  /** The logo on a white plate, fitted in 220 × 100; `x` is the plate's left edge, right edge or middle. */
  const mark = (x: number, y: number, right = false, middle = false) => {
    if (!logo) return;
    const scale = Math.min(220 / logo.width, 100 / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    const left = right ? x - w - 32 : middle ? x - (w + 32) / 2 : x;
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.roundRect(left, y, w + 32, h + 24, 16);
    ctx.fill();
    ctx.drawImage(logo, left + 16, y + 12, w, h);
  };

  return { canvas, ctx, colors, chosen, mix, token, family, wrap, text, picture, own, shade, pill, tear, scan, centred, mark };
}

/** The canvas and drawing helpers a design is given. */
export type TicketStage = Awaited<ReturnType<typeof stage>>;
type Stage = TicketStage;
const HINT = "Show this QR or the code at the door";

/** The organizer's note, cut to one line that fits, or the usual instruction. */
function hint(s: Stage, data: TicketImageData, usual: string, px: number, width: number): string {
  const note = data.note?.trim();
  if (!note) return usual;
  s.ctx.font = `500 ${px}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  return wrap(s.ctx, note, width, 1)[0] ?? usual;
}

/** Cover on top with the title, details, a tear line, then the QR. */
function poster(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 1080, 1760);
  s.picture(0, 0, 1080, 560);
  s.shade(0, 0, 1080, 560, 0.05, 0.82);
  s.pill(1008, 56, 34, data.logo ? 640 : 936, true);
  s.mark(72, 40);
  ctx.font = `700 64px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  const lines = wrap(ctx, data.eventName, 936, 3);
  const first = 504 - (lines.length - 1) * 76;
  s.text(data.organizerName, 72, first - 78, { width: 936, px: 32, weight: 500, color: colors.paper });
  s.text(data.eventName, 72, first, { width: 936, max: 3, px: 64, weight: 700, color: colors.paper });
  let y = 650;
  const detail = (label: string, value: string, px = 34) => {
    s.text(label.toUpperCase(), 72, y, { width: 936, px: 26, color: colors.ink, alpha: 0.55 });
    y = s.text(value, 72, y + px + 18, { width: 936, max: 2, px, color: colors.ink }) + 30;
  };
  detail("Date", data.when);
  if (data.venue) detail("Venue", data.venue);
  if (data.guest) detail("Guest", data.guest, 44);
  s.tear(0, 1080, 1080, 1080);
  const end = s.scan(540, 1140, 420, colors.ink, 76);
  s.centred(hint(s, data, HINT, 30, 936), 540, end + 60, 30, colors.ink);
}

/** A wide ticket: the picture with the details on the left, a tear-off stub with the QR on the right. */
function stub(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  const split = 1260;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 1800, 760);
  s.picture(0, 0, split, 760);
  s.shade(0, 0, split, 760, 0.35, 0.88);
  s.pill(64, 56, 34, split - (data.logo ? 420 : 128));
  s.mark(split - 64, 40, true);
  s.text(data.organizerName, 64, 220, { width: split - 128, px: 34, weight: 500, color: colors.paper, alpha: 0.85 });
  const y = s.text(data.eventName, 64, 306, { width: split - 128, max: 2, px: 76, weight: 700, color: colors.paper });
  let at = Math.max(y + 30, 500);
  at = s.text(data.whenShort, 64, at, { width: split - 128, px: 44, color: colors.paper }) + 14;
  if (data.venue) at = s.text(data.venue, 64, at, { width: split - 128, px: 36, weight: 500, color: colors.paper, alpha: 0.85 }) + 22;
  if (data.guest) s.text(data.guest, 64, Math.min(at + 8, 710), { width: split - 128, px: 44, weight: 700, color: colors.paper });
  s.tear(split, 0, split, 760);
  const cx = split + (1800 - split) / 2;
  s.centred("ADMIT ONE", cx, 92, 30, colors.ink);
  const end = s.scan(cx, 150, 400, colors.ink, 46);
  s.centred(hint(s, data, "Show at the door", 28, 460), cx, end + 52, 28, colors.ink);
}

/** White paper, a large title and little ink: easy to print. */
function minimal(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 1080, 1640);
  s.own(0, 0, 1080, 1640, 0.12);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 1080, 22);
  s.text(data.organizerName.toUpperCase(), 80, 132, { width: data.logo ? 640 : 920, px: 30, color: colors.accent });
  s.mark(1000, 64, true);
  let y = s.text(data.eventName, 80, 230, { width: 920, max: 3, px: 80, weight: 700, color: colors.ink, gap: 14 });
  y = s.text(data.ticketType, 80, y + 4, { width: 920, px: 36, color: colors.ink, alpha: 0.7 }) + 6;
  ctx.fillStyle = colors.line;
  ctx.fillRect(80, y, 920, 4);
  y += 70;
  const detail = (label: string, value: string, px = 34) => {
    s.text(label.toUpperCase(), 80, y, { width: 920, px: 24, color: colors.ink, alpha: 0.5 });
    y = s.text(value, 80, y + px + 14, { width: 920, max: 2, px, color: colors.ink }) + 24;
  };
  detail("Date", data.when, 32);
  if (data.venue) detail("Venue", data.venue, 32);
  if (data.guest) detail("Guest", data.guest, 42);
  const end = s.scan(540, 1060, 360, colors.ink, 68);
  s.centred(hint(s, data, HINT, 28, 920), 540, end + 54, 28, colors.ink);
}

/** The picture across the whole ticket, darkened, with a bold date and the QR in a white box. */
function night(s: Stage, data: TicketImageData) {
  const { colors } = s;
  s.picture(0, 0, 1080, 1760);
  s.shade(0, 0, 1080, 760, 0.35, 0.75);
  s.shade(0, 760, 1080, 1000, 0.75, 0.94);
  s.text(data.organizerName, 72, 112, { width: data.logo ? 640 : 936, px: 36, color: colors.paper });
  s.pill(72, 150, 34, data.logo ? 640 : 936);
  s.mark(1008, 56, true);
  s.text(data.eventName, 72, 420, { width: 936, max: 3, px: 86, weight: 700, color: colors.paper, gap: 16 });
  const [first, ...rest] = data.whenShort.split(" · ");
  let y = s.text(first ?? data.whenShort, 72, 800, { width: 936, px: 78, weight: 700, color: colors.paper, gap: 16 });
  if (rest.length) y = s.text(rest.join(" · "), 72, y, { width: 936, px: 46, weight: 500, color: colors.paper, alpha: 0.85 });
  if (data.venue) y = s.text(data.venue, 72, y + 20, { width: 936, px: 36, weight: 500, color: colors.paper, alpha: 0.8 });
  if (data.guest) s.text(data.guest, 72, y + 20, { width: 936, px: 44, weight: 700, color: colors.paper });
  const end = s.scan(540, 1140, 420, colors.paper, 76);
  s.centred(hint(s, data, HINT, 30, 936), 540, end + 58, 30, colors.paper, 0.75);
}

/** The picture washed in the ticket's colour, a very large title and the date on a slanted white band. */
function concert(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  s.picture(0, 0, 1080, 1760);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 1080, 1760);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  s.shade(0, 0, 1080, 900, 0.35, 0.2);
  s.shade(0, 900, 1080, 860, 0.2, 0.85);
  s.text(data.organizerName.toUpperCase(), 72, 112, { width: data.logo ? 640 : 936, px: 34, color: colors.paper });
  s.pill(72, 150, 34, data.logo ? 640 : 936);
  s.mark(1008, 56, true);
  s.text(data.eventName.toUpperCase(), 72, 370, { width: 936, max: 4, px: 104, weight: 700, color: colors.paper });
  const [first, ...rest] = data.whenShort.split(" · ");
  // The band leans up to the right; its text leans with it.
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.moveTo(0, 880);
  ctx.lineTo(1080, 820);
  ctx.lineTo(1080, 1030);
  ctx.lineTo(0, 1090);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(72, 975);
  ctx.rotate(Math.atan(-60 / 1080));
  s.text(first ?? data.whenShort, 0, 0, { width: 936, px: 68, weight: 700, color: colors.ink });
  if (rest.length) s.text(rest.join(" · "), 0, 62, { width: 936, px: 40, weight: 500, color: colors.ink, alpha: 0.75 });
  ctx.restore();
  if (data.venue) s.text(data.venue, 72, 1150, { width: 936, px: 38, weight: 500, color: colors.paper, alpha: 0.9 });
  if (data.guest) s.text(data.guest, 72, 1212, { width: 936, px: 46, weight: 700, color: colors.paper });
  const end = s.scan(540, 1268, 300, colors.paper, 60);
  s.centred(hint(s, data, HINT, 28, 936), 540, end + 46, 28, colors.paper, 0.8);
}

/** A wide cinema ticket in the ticket's colour: scalloped ends, a framed middle and a white tear-off stub. */
function cinema(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  const split = 1280;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 1800, 760);
  s.own(0, 0, split, 760, 0.25);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = colors.paper;
  ctx.lineWidth = 5;
  ctx.strokeRect(54, 40, split - 94, 680);
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.roundRect(split + 40, 40, 1800 - split - 94, 680, 28);
  ctx.fill();
  const middle = (split + 14) / 2;
  s.mark(84, 70);
  ctx.textAlign = "center";
  s.text(data.organizerName.toUpperCase(), middle, 126, { width: data.logo ? 640 : 1060, px: 32, weight: 500, color: colors.paper, alpha: 0.85 });
  ctx.font = `700 78px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  const rows = wrap(ctx, data.eventName.toUpperCase(), 1080, 2).length;
  // A logo sits in the top corner, so everything under the organizer's name moves down to clear it.
  const down = data.logo ? 46 : 0;
  s.text(data.eventName.toUpperCase(), middle, (rows === 1 ? 288 : 240) + down, { width: 1080, max: 2, px: 78, weight: 700, color: colors.paper, gap: 14 });
  s.text(`★  ${data.ticketType}  ★`, middle, 440 + down / 2, { width: 1080, px: 40, color: colors.paper });
  ctx.fillStyle = colors.paper;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(110, 484 + down / 2, split - 206, 3);
  ctx.globalAlpha = 1;
  // Date, venue and guest side by side, whichever are known.
  const columns = [
    { label: "DATE", values: data.whenShort.split(" · ") },
    ...(data.venue ? [{ label: "VENUE", values: [data.venue] }] : []),
    ...(data.guest ? [{ label: "GUEST", values: [data.guest] }] : []),
  ];
  const room = (split - 206) / columns.length;
  columns.forEach((c, i) => {
    const x = 110 + room * (i + 0.5);
    s.text(c.label, x, 548 + down / 2, { width: room - 30, px: 24, color: colors.paper, alpha: 0.7 });
    // The date and time each get a line; a venue or name may wrap onto the second.
    let y = 600 + down / 2;
    for (const value of c.values) y = s.text(value, x, y, { width: room - 30, max: c.values.length === 1 ? 2 : 1, px: 34, color: colors.paper });
  });
  ctx.textAlign = "left";
  const cx = split + 40 + (1800 - split - 94) / 2;
  s.centred("ADMIT ONE", cx, 108, 30, colors.ink);
  const end = s.scan(cx, 160, 340, colors.ink, 44);
  s.centred(hint(s, data, "Show at the door", 26, 400), cx, end + 54, 26, colors.ink);
  s.tear(split, 0, split, 760);
  // Half circles bitten out of both ends.
  ctx.globalCompositeOperation = "destination-out";
  for (let y = 76; y < 760; y += 76) {
    for (const x of [0, 1800]) {
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

/** A bright colour block with a round picture over it, the details on white below. */
function festival(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 1080, 1760);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1080, 920);
  ctx.clip();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, 1080, 920);
  ctx.fillStyle = colors.paper;
  ctx.globalAlpha = 0.12;
  for (const [x, y, r] of [
    [80, 880, 260],
    [1040, 760, 190],
    [820, 290, 300],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // The picture in a circle with a white ring.
  ctx.beginPath();
  ctx.arc(820, 290, 238, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(820, 290, 224, 0, Math.PI * 2);
  ctx.clip();
  s.picture(596, 66, 448, 448);
  ctx.restore();
  s.text(data.organizerName, 72, 112, { width: 470, max: 2, px: 36, color: colors.paper });
  s.mark(72, 190);
  ctx.font = `700 90px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  const lines = wrap(ctx, data.eventName, 936, 3).length;
  s.text(data.eventName, 72, 820 - (lines - 1) * 106, { width: 936, max: 3, px: 90, weight: 700, color: colors.paper, gap: 16 });
  // The ticket type on a white pill, over the edge of the block.
  ctx.font = `700 36px ${getComputedStyle(document.documentElement).getPropertyValue("--font-sans")}`;
  const type = wrap(ctx, data.ticketType, 860, 1)[0] ?? "";
  const width = ctx.measureText(type).width + 72;
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.roundRect(72, 882, width, 76, 38);
  ctx.fill();
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 5;
  ctx.stroke();
  s.text(type, 108, 933, { width: 860, px: 36, weight: 700, color: colors.accent });
  const detail = (label: string, value: string, x: number, y: number, w: number) => {
    s.text(label, x, y, { width: w, px: 26, color: colors.accent });
    s.text(value, x, y + 50, { width: w, max: 2, px: 34, color: colors.ink, gap: 8 });
  };
  detail("DATE", data.when, 72, 1024, 936);
  if (data.venue) detail("VENUE", data.venue, 72, 1160, data.guest ? 440 : 936);
  if (data.guest) detail("GUEST", data.guest, data.venue ? 568 : 72, 1160, data.venue ? 440 : 936);
  s.tear(0, 1285, 1080, 1285);
  const end = s.scan(540, 1332, 270, colors.ink, 52);
  s.centred(hint(s, data, HINT, 28, 936), 540, end + 48, 28, colors.ink);
}

/** An old-style admission ticket: a double frame with notched corners, everything centred. */
function classic(s: Stage, data: TicketImageData) {
  const { ctx, colors } = s;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 1080, 1760);
  ctx.fillStyle = colors.accent;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(0, 0, 1080, 1760);
  ctx.globalAlpha = 1;
  s.own(60, 60, 960, 1640, 0.13);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, 1008, 1688);
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, 960, 1640);
  s.mark(540, 92, false, true);
  ctx.textAlign = "center";
  s.text(data.organizerName.toUpperCase(), 540, data.logo ? 276 : 190, { width: 820, px: 32, color: colors.ink, alpha: 0.7 });
  s.text("★   ★   ★", 540, 340, { width: 820, px: 34, color: colors.accent });
  let y = s.text(data.eventName.toUpperCase(), 540, 446, { width: 880, max: 3, px: 76, weight: 700, color: colors.ink, gap: 16 });
  y = s.text(data.ticketType, 540, y + 8, { width: 880, px: 44, weight: 700, color: colors.accent });
  ctx.fillStyle = colors.accent;
  ctx.fillRect(420, y - 10, 240, 4);
  const [first, ...rest] = data.whenShort.split(" · ");
  y = s.text(first ?? data.whenShort, 540, Math.max(y + 90, 800), { width: 880, px: 54, weight: 700, color: colors.ink });
  if (rest.length) y = s.text(rest.join(" · "), 540, y, { width: 880, px: 36, weight: 500, color: colors.ink, alpha: 0.75 });
  if (data.venue) y = s.text(data.venue, 540, y + 18, { width: 880, px: 34, weight: 500, color: colors.ink, alpha: 0.75 });
  if (data.guest) s.text(data.guest, 540, y + 36, { width: 880, px: 46, weight: 700, color: colors.ink });
  ctx.textAlign = "left";
  s.tear(0, 1160, 1080, 1160);
  const end = s.scan(540, 1214, 300, colors.ink, 60);
  s.centred(hint(s, data, HINT, 28, 880), 540, end + 48, 28, colors.ink);
  // Quarter circles cut from the corners.
  ctx.globalCompositeOperation = "destination-out";
  for (const [x, cy] of [
    [0, 0],
    [1080, 0],
    [0, 1760],
    [1080, 1760],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, cy, 96, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/** The organizer's artwork as it is, with a white panel on it: the QR, the code, the guest, ticket type and note. */
function custom(s: Stage, data: TicketImageData, art: TicketArtwork, image: HTMLImageElement) {
  const { ctx, colors } = s;
  const { width, height } = art;
  ctx.drawImage(image, 0, 0, width, height);
  const lines = [data.guest, data.ticketType, data.note?.trim()].filter((l): l is string => Boolean(l));
  const short = Math.min(width, height);
  const share = QR_SIZES.find((q) => q.value === art.qrSize)?.share ?? 0.44;
  // The panel's measures for a QR of side `side`.
  const measure = (side: number) => {
    const pad = Math.max(26, side * 0.09);
    const codePx = side * 0.11;
    const linePx = side * 0.085;
    return { side, pad, codePx, linePx, w: side + pad * 2, h: pad * 2 + side + 36 + codePx + lines.length * linePx * 1.5 };
  };
  // It shrinks when it wouldn't fit the picture.
  const wanted = measure(short * share);
  const fit = Math.min(1, (height * 0.96) / wanted.h, (width * 0.96) / wanted.w);
  const p = measure(wanted.side * fit);
  const margin = short * 0.02;
  const within = (middle: number, size: number, room: number) => Math.max(margin, Math.min(middle - size / 2, room - size - margin));
  const left = within(art.x * width, p.w, width);
  const top = within(art.y * height, p.h, height);
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.roundRect(left, top, p.w, p.h, p.pad);
  ctx.fill();
  const cx = left + p.w / 2;
  let y = s.scan(cx, top + p.pad, p.side, colors.ink, p.codePx);
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-sans");
  ctx.textAlign = "center";
  ctx.fillStyle = colors.ink;
  lines.forEach((line, i) => {
    y += p.linePx * 1.5;
    // A long name gets a little smaller before it's cut.
    const room = p.w - p.pad;
    const weight = i === 0 ? 700 : 500;
    ctx.font = `${weight} ${p.linePx}px ${family}`;
    const wide = ctx.measureText(line).width;
    if (wide > room) ctx.font = `${weight} ${p.linePx * Math.max(0.75, room / wide)}px ${family}`;
    ctx.globalAlpha = i === 0 ? 1 : 0.65;
    ctx.fillText(wrap(ctx, line, room, 1)[0] ?? "", cx, y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

const DRAW: Record<StandardDesign, (s: Stage, data: TicketImageData) => void> = { poster, stub, minimal, night, concert, cinema, festival, classic, ...WIDE_DRAW };

export async function renderTicketImage(data: TicketImageData, design: TicketDesign = "poster"): Promise<Blob> {
  // Custom artwork has everything on it already: no cover or logo to load.
  const s = await stage(design === "custom" ? { ...data, coverUrl: null, logo: null } : data, ticketSize(design, data.artwork));
  if (design === "custom") {
    const image = data.artwork ? await loadImage(data.artwork.image) : null;
    if (!data.artwork || !image) throw new Error("Couldn't read the artwork");
    custom(s, data, data.artwork, image);
  } else DRAW[design](s, data);
  return new Promise((resolve, reject) => s.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't draw the ticket"))), "image/png"));
}
