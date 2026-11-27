/**
 * The wide ticket designs with a mood of their own. They're original drawings, 1800 × 720: the event on the left, a
 * tear-off stub with the QR on the right. Designs with colours of their own (the `--ticket-*` variables in
 * `app/globals.css`) are repainted when the organizer picks a colour. Every one shows an added picture.
 */
import type { TicketImageData, TicketStage } from "@/lib/ticket-image";

const WIDTH = 1800;
const HEIGHT = 720;
/** Where the stub starts. */
const SPLIT = 1340;
/** The middle of the part left of the stub. */
const MIDDLE = SPLIT / 2;

const dayAndTime = (data: TicketImageData) => data.whenShort.replace(" · ", ", ");

/** The same dots on every ticket: a small repeatable sequence between 0 and 1. */
function sequence(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

interface Type {
  x: number;
  y: number;
  width: number;
  px: number;
  color: string;
  weight?: number;
  alpha?: number;
  align?: CanvasTextAlign;
  /** A font other than the brand's, and `italic`. */
  face?: string;
  italic?: boolean;
  /** Lines allowed; the text first gets smaller (down to `min`) so it fits in them. */
  max?: number;
  min?: number;
  /** A title with fewer lines than allowed sits in the middle of the room kept for them. */
  settle?: boolean;
}

/** Text that shrinks to fit its lines before it's cut. Returns the baseline of the last line. */
function write(s: TicketStage, value: string, o: Type): number {
  const { ctx } = s;
  const { max = 1, weight = 600, face = s.family } = o;
  const min = o.min ?? Math.round(o.px * 0.65);
  const set = (px: number) => {
    ctx.font = `${o.italic ? "italic " : ""}${weight} ${px}px ${face}`;
  };
  let px = o.px;
  set(px);
  // Too long when it needs more lines than allowed, which `wrap` shows by ending the last one with "…".
  const cut = () => {
    const lines = s.wrap(ctx, value, o.width, max);
    return lines.some((l) => l.endsWith("…")) && !value.endsWith("…");
  };
  while (px > min && cut()) {
    px -= 2;
    set(px);
  }
  ctx.textAlign = o.align ?? "left";
  ctx.fillStyle = o.color;
  ctx.globalAlpha = o.alpha ?? 1;
  const lines = s.wrap(ctx, value, o.width, max);
  const top = o.settle ? o.y + ((max - lines.length) * px * 1.14) / 2 : o.y;
  let y = top;
  lines.forEach((line, i) => {
    y = top + i * px * 1.14;
    ctx.fillText(line, o.x, y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  return y;
}

/** The right end: an optional fill, "Admit one", the QR with the code, the hint, and the tear line. */
function stub(s: TicketStage, data: TicketImageData, o: { fill?: string | CanvasGradient; ink: string; line: string; codePx?: number }) {
  const { ctx } = s;
  if (o.fill) {
    ctx.fillStyle = o.fill;
    ctx.fillRect(SPLIT, 0, WIDTH - SPLIT, HEIGHT);
  }
  const cx = SPLIT + (WIDTH - SPLIT) / 2;
  write(s, "ADMIT ONE", { x: cx, y: 92, width: 380, px: 34, weight: 700, color: o.ink, align: "center" });
  const end = s.scan(cx, 148, 340, o.ink, o.codePx ?? 44);
  write(s, data.note?.trim() || "Show at the door", { x: cx, y: end + 52, width: 400, px: 28, weight: 500, color: o.ink, alpha: 0.75, align: "center" });
  s.tear(SPLIT, 0, SPLIT, HEIGHT, o.line);
}

/** Metallic gold with a double frame and the details in boxes: a VIP pass. */
function gold(s: TicketStage, data: TicketImageData) {
  const { ctx, token } = s;
  const ink = token("--ticket-black");
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  const tint = (amount: number, own: string) => (s.chosen ? s.mix(s.chosen, s.colors.paper, amount) : token(own));
  const deep = tint(0.45, "--ticket-gold-deep");
  const pale = tint(0.84, "--ticket-gold-light");
  const metal = tint(0.6, "--ticket-gold");
  g.addColorStop(0, deep);
  g.addColorStop(0.28, pale);
  g.addColorStop(0.55, metal);
  g.addColorStop(0.8, pale);
  g.addColorStop(1, deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.own(0, 0, SPLIT, HEIGHT, 0.24, "multiply");
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(34, 34, SPLIT - 76, HEIGHT - 68);
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, SPLIT - 112, HEIGHT - 104);
  s.mark(80, 78);
  const centre = { x: MIDDLE, align: "center" as const, color: ink };
  write(s, "★  ★  ★", { ...centre, y: 122, width: 600, px: 34 });
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 176, width: data.logo ? 640 : 1100, px: 28, alpha: 0.8 });
  write(s, data.eventName.toUpperCase(), { ...centre, y: 286, width: 1120, px: 88, weight: 700, max: 2, min: 52, settle: true });
  write(s, `—  ${data.ticketType}  —`, { ...centre, y: 468, width: 1100, px: 38, weight: 700 });
  const [day = data.whenShort, time] = data.whenShort.split(" · ");
  const boxes = [
    { label: "DATE", value: day, under: time },
    ...(data.venue ? [{ label: "VENUE", value: data.venue, under: undefined }] : []),
    ...(data.guest ? [{ label: "GUEST", value: data.guest, under: undefined }] : []),
  ];
  const room = (SPLIT - 190) / boxes.length;
  boxes.forEach((box, i) => {
    const left = 95 + room * i + 10;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(left, 522, room - 20, 120, 14);
    ctx.stroke();
    const x = left + (room - 20) / 2;
    write(s, box.label, { ...centre, x, y: 560, width: room - 50, px: 22, alpha: 0.65 });
    write(s, box.value, { ...centre, x, y: box.under ? 598 : 594, width: room - 46, px: 32, weight: 700, min: 24, max: box.under ? 1 : 2, settle: true });
    if (box.under) write(s, box.under, { ...centre, x, y: 628, width: room - 46, px: 24, alpha: 0.8 });
  });
  stub(s, data, { ink, line: ink });
}

/** A red theatre curtain under two spotlights, a serif title and a yellow stub. */
function curtain(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const deep = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.68) : token("--ticket-curtain-deep");
  const light = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.12) : token("--ticket-curtain-light");
  const sun = token("--ticket-sun");
  const serif = token("--ticket-serif");
  // Folds: dark, light, dark, across the whole width.
  for (let x = 0; x < SPLIT; x += 112) {
    const fold = ctx.createLinearGradient(x, 0, x + 112, 0);
    fold.addColorStop(0, deep);
    fold.addColorStop(0.5, light);
    fold.addColorStop(1, deep);
    ctx.fillStyle = fold;
    ctx.fillRect(x, 0, 112, HEIGHT);
  }
  s.own(0, 0, SPLIT, HEIGHT, 0.45);
  for (const [from, to] of [
    [140, 500],
    [1200, 840],
  ] as const) {
    const beam = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    beam.addColorStop(0, "rgba(255,255,255,0.32)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(from - 20, 0);
    ctx.lineTo(from + 20, 0);
    ctx.lineTo(to + 260, HEIGHT);
    ctx.lineTo(to - 260, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
  s.shade(0, 0, SPLIT, HEIGHT, 0.15, 0.6);
  s.mark(70, 50);
  const centre = { x: MIDDLE, align: "center" as const };
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 112, width: data.logo ? 640 : 1100, px: 28, color: colors.paper, alpha: 0.85 });
  write(s, data.eventName, { ...centre, y: 262, width: 1140, px: 108, weight: 700, color: sun, face: serif, italic: true, max: 2, min: 60, settle: true });
  write(s, `★  ${data.ticketType.toUpperCase()}  ★`, { ...centre, y: 470, width: 1100, px: 34, color: colors.paper });
  ctx.fillStyle = sun;
  ctx.fillRect(MIDDLE - 240, 504, 480, 3);
  write(s, [dayAndTime(data), data.venue].filter(Boolean).join("   •   "), { ...centre, y: 566, width: 1160, px: 34, weight: 500, color: colors.paper, min: 22 });
  if (data.guest) write(s, data.guest, { ...centre, y: 640, width: 1100, px: 46, weight: 700, color: colors.paper });
  stub(s, data, { fill: sun, ink: token("--ticket-black"), line: deep });
}

/** The cover in black and white fading into the dark, a tall title and the date in the chosen colour. */
function stage(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const black = token("--ticket-black");
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.picture(0, 0, SPLIT, HEIGHT);
  // Takes the colour out of the picture.
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, SPLIT, HEIGHT);
  ctx.globalCompositeOperation = "source-over";
  const fade = ctx.createLinearGradient(0, 0, SPLIT, 0);
  fade.addColorStop(0, "rgba(0,0,0,0.94)");
  fade.addColorStop(0.55, "rgba(0,0,0,0.66)");
  fade.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, SPLIT, HEIGHT);
  s.shade(0, 420, SPLIT, 300, 0, 0.65);
  write(s, data.organizerName.toUpperCase(), { x: 74, y: 96, width: 700, px: 30, color: colors.paper, alpha: 0.8 });
  s.pill(SPLIT - 56, 52, 34, 480, true);
  // Narrowed letters make the title tall.
  ctx.save();
  ctx.translate(70, 0);
  ctx.scale(0.82, 1);
  write(s, data.eventName.toUpperCase(), { x: 0, y: 250, width: 1180, px: 132, weight: 700, color: colors.paper, max: 2, min: 70 });
  ctx.restore();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(74, 450, 130, 10);
  const clear = data.logo ? 880 : 1200;
  write(s, dayAndTime(data), { x: 74, y: 532, width: clear, px: 50, weight: 700, color: colors.paper });
  if (data.venue) write(s, data.venue, { x: 74, y: 586, width: clear, px: 32, weight: 500, color: colors.paper, alpha: 0.82 });
  if (data.guest) write(s, data.guest, { x: 74, y: 654, width: clear, px: 40, weight: 700, color: colors.paper });
  s.mark(SPLIT - 56, HEIGHT - 170, true);
  stub(s, data, { fill: colors.paper, ink: black, line: colors.line });
}

/** A night sky with strings of lights and a golden title. */
function starlight(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const night = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.76) : token("--ticket-night");
  const high = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.38) : token("--ticket-violet");
  const glow = token("--ticket-glow");
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, night);
  sky.addColorStop(1, high);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.own(0, 0, SPLIT, HEIGHT, 0.3);
  const next = sequence(2027);
  ctx.fillStyle = colors.paper;
  for (let i = 0; i < 150; i += 1) {
    ctx.globalAlpha = 0.15 + next() * 0.6;
    ctx.beginPath();
    ctx.arc(next() * SPLIT, next() * HEIGHT, 1 + next() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Two hanging strings, each with its bulbs.
  for (const [from, to, dip] of [
    [-20, 700, 170],
    [640, 1360, 140],
  ] as const) {
    ctx.strokeStyle = glow;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from, 8);
    ctx.quadraticCurveTo((from + to) / 2, dip, to, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let t = 0.08; t < 1; t += 0.12) {
      const x = from + (to - from) * t;
      const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * dip + t * t * 8 + 14;
      const halo = ctx.createRadialGradient(x, y, 2, x, y, 30);
      halo.addColorStop(0, "rgba(255,220,140,0.85)");
      halo.addColorStop(1, "rgba(255,220,140,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(x - 30, y - 30, 60, 60);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  s.mark(70, 140);
  const centre = { x: MIDDLE, align: "center" as const };
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 188, width: data.logo ? 600 : 1100, px: 28, color: colors.paper, alpha: 0.8 });
  write(s, data.eventName.toUpperCase(), { ...centre, y: 308, width: 1160, px: 92, weight: 700, color: glow, max: 2, min: 54, settle: true });
  write(s, data.ticketType, { ...centre, y: 492, width: 1100, px: 38, color: colors.paper });
  ctx.fillStyle = glow;
  ctx.fillRect(MIDDLE - 200, 522, 400, 3);
  write(s, [dayAndTime(data), data.venue].filter(Boolean).join("   •   "), { ...centre, y: 584, width: 1180, px: 34, weight: 500, color: colors.paper, min: 22 });
  if (data.guest) write(s, data.guest, { ...centre, y: 652, width: 1100, px: 44, weight: 700, color: colors.paper });
  stub(s, data, { fill: night, ink: colors.paper, line: glow });
}

/** Black with hard shapes in orange and lime, and a very large title: a club night. */
function neo(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const black = token("--ticket-black");
  const orange = s.chosen ? s.mix(s.chosen, colors.paper, 0.35) : token("--ticket-orange");
  const lime = s.chosen ? s.mix(s.chosen, colors.paper, 0.72) : token("--ticket-lime");
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 330, HEIGHT);
  ctx.clip();
  // Rings above, slanted bars below, unless the organizer's picture fills the panel.
  const shapes = !s.own(0, 0, 330, HEIGHT);
  for (let r = 250; shapes && r > 0; r -= 28) {
    ctx.fillStyle = (r / 28) % 2 < 1 ? black : lime;
    ctx.beginPath();
    ctx.arc(165, 190, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (shapes) {
    ctx.fillStyle = black;
    ctx.fillRect(0, 380, 330, HEIGHT - 380);
  }
  ctx.fillStyle = orange;
  if (!shapes) ctx.fillRect(316, 0, 14, HEIGHT);
  for (let x = -360; shapes && x < 330; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, HEIGHT);
    ctx.lineTo(x + 340, 380);
    ctx.lineTo(x + 385, 380);
    ctx.lineTo(x + 45, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Small text takes the paler shade of a chosen colour, so a dark one stays readable.
  write(s, data.organizerName.toUpperCase(), { x: 380, y: 82, width: 520, px: 28, min: 24, color: s.chosen ? lime : orange });
  s.pill(SPLIT - 52, 44, 30, 380, true);
  write(s, data.eventName.toUpperCase(), { x: 376, y: 226, width: 920, px: 112, weight: 700, color: colors.paper, max: 3, min: 58, settle: true });
  ctx.fillStyle = lime;
  ctx.fillRect(380, 498, SPLIT - 430, 84);
  write(s, dayAndTime(data), { x: 404, y: 555, width: SPLIT - 480, px: 46, weight: 700, color: black });
  const room = data.logo ? 640 : 900;
  if (data.venue) write(s, data.venue, { x: 380, y: 636, width: room, px: 32, weight: 500, color: colors.paper, alpha: 0.85 });
  if (data.guest) write(s, data.guest, { x: 380, y: 686, width: room, px: 38, weight: 700, color: colors.paper });
  s.mark(SPLIT - 52, 596, true);
  stub(s, data, { fill: colors.paper, ink: black, line: orange });
}

/** Cream paper inside a striped border, a serif title and a line for the guest's name: an old raffle ticket. */
function vintage(s: TicketStage, data: TicketImageData) {
  const { ctx, token } = s;
  const cream = token("--ticket-cream");
  const brick = s.chosen ?? token("--ticket-brick");
  const ink = token("--ticket-black");
  const serif = token("--ticket-serif");
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.own(0, 0, SPLIT, HEIGHT, 0.15);
  // Slanted stripes, kept to a band around the edge.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, HEIGHT);
  ctx.rect(26, 26, WIDTH - 52, HEIGHT - 52);
  ctx.clip("evenodd");
  ctx.strokeStyle = brick;
  ctx.lineWidth = 17;
  for (let x = -HEIGHT; x < WIDTH; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, HEIGHT);
    ctx.lineTo(x + HEIGHT, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = brick;
  ctx.lineWidth = 4;
  ctx.strokeRect(62, 62, SPLIT - 118, HEIGHT - 124);
  s.mark(90, 88);
  const centre = { x: MIDDLE, align: "center" as const };
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 138, width: data.logo ? 640 : 1100, px: 28, color: brick });
  write(s, data.eventName, { ...centre, y: 262, width: 1100, px: 104, weight: 700, color: brick, face: serif, italic: true, max: 2, min: 58, settle: true });
  write(s, `❦  ${data.ticketType}  ❦`, { ...centre, y: 462, width: 1100, px: 38, color: ink, face: serif, weight: 700 });
  write(s, [dayAndTime(data), data.venue].filter(Boolean).join("   |   "), { ...centre, y: 532, width: 1140, px: 34, weight: 400, color: ink, face: serif, min: 22 });
  if (data.guest) {
    write(s, "NAME", { x: 300, y: 628, width: 130, px: 24, color: brick });
    write(s, data.guest, { x: 420, y: 628, width: 620, px: 40, weight: 700, color: ink, face: serif });
    ctx.fillStyle = brick;
    ctx.fillRect(415, 642, 630, 2);
  }
  stub(s, data, { ink: brick, line: brick, codePx: 38 });
}

/** Butter yellow with blobs, a squiggle and a blue stub: playful, for fairs and family events. */
function pop(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const butter = token("--ticket-butter");
  const blue = s.chosen ?? token("--ticket-blue");
  const pink = token("--ticket-pink");
  const teal = token("--ticket-teal");
  const ink = token("--ticket-black");
  ctx.fillStyle = butter;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const blob = (color: string, x: number, y: number, r: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(teal, 1290, 700, 190);
  blob(pink, 1300, 40, 120);
  blob(blue, 20, 720, 90);
  // The organizer's picture in a ringed circle, or a starburst; then a squiggle.
  const pictured = Boolean(data.photo);
  if (pictured) {
    blob(colors.paper, 1130, 480, 184);
    ctx.save();
    ctx.beginPath();
    ctx.arc(1130, 480, 170, 0, Math.PI * 2);
    ctx.clip();
    s.own(960, 310, 340, 340);
    ctx.restore();
  } else {
    ctx.fillStyle = pink;
    ctx.beginPath();
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      const r = i % 2 ? 44 : 96;
      ctx.lineTo(1150 + Math.cos(angle) * r, 480 + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = teal;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(850, 76);
  for (let x = 850; x < 1100; x += 70) ctx.bezierCurveTo(x + 20, 20, x + 50, 132, x + 70, 76);
  ctx.stroke();
  ctx.lineCap = "butt";
  write(s, data.organizerName.toUpperCase(), { x: 84, y: 90, width: 640, px: 30, color: ink });
  write(s, data.eventName.toUpperCase(), { x: 80, y: 232, width: pictured ? 860 : 1080, px: 120, weight: 700, color: blue, max: 2, min: 54 });
  // The ticket type on a pink pill.
  ctx.font = `700 36px ${s.family}`;
  const type = s.wrap(ctx, data.ticketType, 760, 1)[0] ?? "";
  const width = ctx.measureText(type).width + 64;
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.roundRect(80, 420, width, 72, 36);
  ctx.fill();
  write(s, type, { x: 112, y: 469, width: 760, px: 36, weight: 700, color: colors.paper });
  const room = pictured ? 840 : 940;
  write(s, dayAndTime(data), { x: 84, y: 564, width: room, px: 44, weight: 700, color: ink });
  if (data.venue) write(s, data.venue, { x: 84, y: 614, width: room, px: 32, weight: 500, color: ink });
  if (data.guest) write(s, data.guest, { x: 84, y: 676, width: room, px: 40, weight: 700, color: blue });
  s.mark(SPLIT - 60, 556, true);
  stub(s, data, { fill: blue, ink: colors.paper, line: butter });
}

/** A photo down the left side, a serif title on cream: workshops, exhibitions, dinners. */
function gallery(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const ink = token("--ticket-black");
  const serif = token("--ticket-serif");
  ctx.fillStyle = token("--ticket-cream");
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.picture(0, 0, 520, HEIGHT);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(520, 0, 14, HEIGHT);
  s.mark(32, 32);
  const centre = { x: 937, align: "center" as const };
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 92, width: 720, px: 26, color: colors.accent });
  write(s, data.eventName, { ...centre, y: 202, width: 730, px: 94, weight: 700, color: ink, face: serif, max: 2, min: 50, settle: true });
  ctx.fillStyle = ink;
  ctx.fillRect(640, 366, 594, 2);
  write(s, data.ticketType.toUpperCase(), { ...centre, y: 414, width: 720, px: 28, color: ink, alpha: 0.75 });
  ctx.fillRect(640, 442, 594, 2);
  write(s, dayAndTime(data), { ...centre, y: 524, width: 730, px: 46, color: ink, face: serif, weight: 700 });
  if (data.venue) write(s, data.venue, { ...centre, y: 580, width: 730, px: 30, weight: 400, color: ink, face: serif, min: 22 });
  if (data.guest) write(s, data.guest, { ...centre, y: 662, width: 730, px: 42, weight: 700, color: colors.accent, face: serif });
  stub(s, data, { fill: colors.paper, ink, line: colors.line });
}

/** White paper cut by a slanted photo, with a dark stub: concerts and nights out. */
function slant(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const black = token("--ticket-black");
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  /** A slanted shape from `top` to `bottom` along the left edge, `right` on the other side. */
  const shape = (top: number, bottom: number, rightTop: number, rightBottom: number) => {
    ctx.beginPath();
    ctx.moveTo(top, 0);
    ctx.lineTo(rightTop, 0);
    ctx.lineTo(rightBottom, HEIGHT);
    ctx.lineTo(bottom, HEIGHT);
    ctx.closePath();
  };
  ctx.save();
  shape(780, 620, SPLIT, SPLIT);
  ctx.clip();
  s.picture(620, 0, SPLIT - 620, HEIGHT);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(620, 0, SPLIT - 620, HEIGHT);
  ctx.restore();
  ctx.fillStyle = colors.accent;
  shape(728, 568, 762, 602);
  ctx.fill();
  s.pill(SPLIT - 48, 46, 30, 420, true);
  s.mark(SPLIT - 48, HEIGHT - 170, true);
  write(s, data.organizerName.toUpperCase(), { x: 64, y: 86, width: 600, px: 26, color: colors.accent });
  write(s, data.eventName.toUpperCase(), { x: 62, y: 188, width: 560, px: 90, weight: 700, color: black, max: 3, min: 40, settle: true });
  ctx.fillStyle = colors.accent;
  ctx.fillRect(64, 466, 110, 8);
  write(s, dayAndTime(data), { x: 64, y: 536, width: 500, px: 40, weight: 700, color: black, min: 24 });
  if (data.venue) write(s, data.venue, { x: 64, y: 588, width: 490, px: 28, weight: 500, color: black, alpha: 0.75, min: 20 });
  if (data.guest) write(s, data.guest, { x: 64, y: 662, width: 480, px: 38, weight: 700, color: black, min: 24 });
  stub(s, data, { fill: black, ink: colors.paper, line: colors.accent });
}

/** The chosen colour with the photo in a large ringed circle: talks, conferences, fashion shows. */
function spotlight(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const ink = token("--ticket-black");
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const disc = (x: number, y: number, r: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  disc(1050, 360, 380, 0.12);
  disc(40, 760, 190, 0.1);
  disc(1050, 360, 306, 1);
  ctx.save();
  ctx.beginPath();
  ctx.arc(1050, 360, 292, 0, Math.PI * 2);
  ctx.clip();
  s.picture(758, 68, 584, 584);
  ctx.restore();
  write(s, data.organizerName.toUpperCase(), { x: 72, y: 86, width: 620, px: 28, color: colors.paper, alpha: 0.9 });
  write(s, data.eventName.toUpperCase(), { x: 70, y: 188, width: 630, px: 100, weight: 700, color: colors.paper, max: 3, min: 44, settle: true });
  ctx.font = `700 32px ${s.family}`;
  const type = s.wrap(ctx, data.ticketType, 560, 1)[0] ?? "";
  const width = ctx.measureText(type).width + 56;
  ctx.fillStyle = colors.paper;
  ctx.beginPath();
  ctx.roundRect(72, 448, width, 62, 31);
  ctx.fill();
  write(s, type, { x: 100, y: 491, width: 560, px: 32, weight: 700, color: ink });
  write(s, dayAndTime(data), { x: 72, y: 570, width: 640, px: 40, weight: 700, color: colors.paper, min: 24 });
  if (data.venue) write(s, data.venue, { x: 72, y: 618, width: 620, px: 28, weight: 500, color: colors.paper, alpha: 0.85, min: 20 });
  if (data.guest) write(s, data.guest, { x: 72, y: 678, width: 620, px: 38, weight: 700, color: colors.paper });
  s.mark(SPLIT - 40, HEIGHT - 150, true);
  stub(s, data, { fill: colors.paper, ink, line: colors.line });
}

/** A tinted photo with the title on tilted white labels and a details band: sports and competitions. */
function sport(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const black = token("--ticket-black");
  ctx.fillStyle = black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  s.picture(0, 0, SPLIT, HEIGHT);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, SPLIT, HEIGHT);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  s.shade(0, 0, SPLIT, HEIGHT, 0.4, 0.2);
  s.mark(48, 36);
  write(s, data.organizerName.toUpperCase(), { x: data.logo ? 340 : 56, y: 92, width: data.logo ? 480 : 700, px: 30, color: colors.paper });
  s.pill(SPLIT - 48, 46, 30, 440, true);
  // The largest size at which the title fits two lines.
  const title = data.eventName.toUpperCase();
  let px = 104;
  const set = () => {
    ctx.font = `700 ${px}px ${s.family}`;
    return s.wrap(ctx, title, 1080, 2);
  };
  let lines = set();
  while (px > 52 && lines.some((l) => l.endsWith("…"))) {
    px -= 2;
    lines = set();
  }
  ctx.save();
  ctx.translate(MIDDLE, 340);
  ctx.rotate(-0.05);
  ctx.textAlign = "center";
  const step = px * 1.32;
  lines.forEach((line, i) => {
    const y = (i - (lines.length - 1) / 2) * step;
    const w = ctx.measureText(line).width + 60;
    ctx.fillStyle = colors.paper;
    ctx.fillRect(-w / 2, y - px * 0.62, w, px * 1.24);
    ctx.fillStyle = black;
    ctx.textBaseline = "middle";
    ctx.fillText(line, 0, y + px * 0.05);
  });
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 556, SPLIT, HEIGHT - 556);
  const columns = [
    { label: "DATE", value: dayAndTime(data) },
    ...(data.venue ? [{ label: "VENUE", value: data.venue }] : []),
    ...(data.guest ? [{ label: "GUEST", value: data.guest }] : []),
  ];
  const room = (SPLIT - 80) / columns.length;
  columns.forEach((c, i) => {
    const x = 56 + room * i;
    write(s, c.label, { x, y: 604, width: room - 40, px: 22, color: colors.accent, weight: 700 });
    write(s, c.value, { x, y: 648, width: room - 40, px: 32, weight: 700, color: black, max: 2, min: 22 });
  });
  stub(s, data, { fill: black, ink: colors.paper, line: colors.paper });
}

/** Deep red with a gold frame and the photo in an arch: galas, weddings, award nights. */
function gala(s: TicketStage, data: TicketImageData) {
  const { ctx, token, colors } = s;
  const deep = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.7) : token("--ticket-curtain-deep");
  const middle = s.chosen ? s.mix(s.chosen, token("--ticket-black"), 0.25) : token("--ticket-curtain-light");
  const gold = token("--ticket-gold");
  const pale = token("--ticket-gold-light");
  const serif = token("--ticket-serif");
  const sky = ctx.createRadialGradient(900, 360, 80, 900, 360, 1000);
  sky.addColorStop(0, middle);
  sky.addColorStop(1, deep);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 32, SPLIT - 70, HEIGHT - 64);
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, SPLIT - 102, HEIGHT - 96);
  // A small diamond on each corner of the frame.
  ctx.fillStyle = pale;
  for (const [x, y] of [
    [32, 32],
    [SPLIT - 38, 32],
    [32, HEIGHT - 32],
    [SPLIT - 38, HEIGHT - 32],
  ] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-13, -13, 26, 26);
    ctx.restore();
  }
  const arch = () => {
    ctx.beginPath();
    ctx.moveTo(110, 626);
    ctx.lineTo(110, 284);
    ctx.arc(300, 284, 190, Math.PI, 0);
    ctx.lineTo(490, 626);
    ctx.closePath();
  };
  ctx.save();
  arch();
  ctx.clip();
  s.picture(110, 94, 380, 532);
  ctx.restore();
  arch();
  ctx.strokeStyle = pale;
  ctx.lineWidth = 8;
  ctx.stroke();
  const centre = { x: 903, align: "center" as const };
  const down = data.logo ? 44 : 0;
  s.mark(903, 66, false, true);
  write(s, data.organizerName.toUpperCase(), { ...centre, y: 128 + down * 1.8, width: 740, px: 26, color: pale });
  write(s, data.eventName, { ...centre, y: 244 + down, width: 750, px: 90, weight: 700, color: colors.paper, face: serif, max: 2, min: 46, settle: true });
  write(s, `❖  ${data.ticketType}  ❖`, { ...centre, y: 442 + down / 2, width: 740, px: 32, color: gold });
  write(s, dayAndTime(data), { ...centre, y: 522 + down / 2, width: 750, px: 40, color: colors.paper, face: serif, weight: 700 });
  if (data.venue) write(s, data.venue, { ...centre, y: 574 + down / 3, width: 750, px: 28, weight: 400, color: colors.paper, face: serif, alpha: 0.85, min: 20 });
  if (data.guest) write(s, data.guest, { ...centre, y: 644, width: 750, px: 40, weight: 700, color: pale, face: serif });
  stub(s, data, { fill: pale, ink: deep, line: deep });
}

export const WIDE_DRAW = { gold, curtain, stage, starlight, neo, vintage, pop, gallery, slant, spotlight, sport, gala };
