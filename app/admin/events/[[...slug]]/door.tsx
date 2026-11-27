"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import jsQR from "jsqr";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, CircleAlert, CircleX, DoorClosed, DoorOpen, RotateCcw, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ApiError, assetUrl } from "@/lib/api-client";
import { checkIn } from "@/lib/api/check-ins";
import type { CheckIn } from "@/lib/api/check-ins";
import { describeApiError } from "@/lib/api/errors";
import type { StaffEvent } from "@/lib/api/events";
import { getRegistrationSummary } from "@/lib/api/registrations";
import { newIdempotencyKey } from "@/lib/checkout";
import { formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatNumber } from "@/lib/format";
import { registrationQk } from "@/lib/query-keys";

/** The browser's own barcode reader (Chrome, Android). iPhones don't have it: jsQR reads the frames there. */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** A code as the gate reads it: upper case, no spaces. The API accepts either, this keeps the screen tidy. */
const tidy = (code: string) => code.toUpperCase().replace(/\s+/g, "");
/** The same code scanned again within this time is the camera seeing it twice, not a second guest. */
const SAME_CODE_MS = 4000;
/** How long an answer covers the camera before scanning carries on. */
const ANSWER_SHOWN_MS = 4000;
/** How often the camera frame is read. */
const SCAN_EVERY_MS = 250;

type Outcome =
  | { kind: "admitted"; checkIn: CheckIn }
  | { kind: "already"; checkIn: CheckIn }
  | { kind: "refused"; code: string; title: string; detail: string }
  | { kind: "offline"; code: string; key: string };

const guestName = (h: CheckIn["ticket"]["holder"]) => (h ? [h.first_name, h.last_name].filter(Boolean).join(" ") : "Unnamed ticket");

/** Why a ticket can't get in, in words the person at the gate can say out loud. */
function refusal(error: ApiError, timeZone: string): { title: string; detail: string } {
  const details = (error.details ?? {}) as { status?: string; doors_open_at?: string | null; ends_at?: string | null };
  if (error.status === 404) return { title: "No ticket with this code", detail: "Check the code, or that this is the right event." };
  if (error.code === "ticket_not_admissible") {
    const why = details.status === "HELD" ? "it's still waiting for payment" : details.status === "RELEASED" ? "it was never paid" : "it was cancelled or returned";
    return { title: "This ticket can't be used", detail: `It's not valid: ${why}.` };
  }
  if (error.code === "outside_admission_window") {
    const ended = details.ends_at && Date.parse(details.ends_at) <= Date.now();
    return ended
      ? { title: "The event has ended", detail: "Tickets can't be used any more." }
      : { title: "Doors aren't open yet", detail: details.doors_open_at ? `Doors open ${formatMomentFull(details.doors_open_at, timeZone)}.` : "Try again when the doors open." };
  }
  if (error.code === "invalid_event_state") return { title: "The event isn't open", detail: "Only a published event can let guests in." };
  return { title: "Couldn't check this ticket", detail: describeApiError(error, "ticket") };
}


/**
 * The door (Phase 8): scan a ticket's QR, or type its code, and see at once whether to let the guest in. One admission
 * per ticket for the whole event; a second scan says when it was used. Each scan has its own Idempotency-Key, and a
 * scan whose answer was lost is sent again with the same key, so the API returns the first answer instead of guessing.
 */
/**
 * `onBack` shows a Back button (opened from an event); `picker` puts an event picker in the header instead (the Door
 * page in the menu, where staff choose the event first).
 */
export function DoorScreen({ event, onBack, picker }: { event: StaffEvent; onBack?: () => void; picker?: ReactNode }) {
  const queryClient = useQueryClient();
  const orgId = event.organization_id;
  const summary = useQuery({ queryKey: registrationQk.summary(orgId, event.id), queryFn: ({ signal }) => getRegistrationSummary(orgId, event.id, signal) });

  const [typed, setTyped] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [recent, setRecent] = useState<{ outcome: Outcome; at: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "blocked">("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastSeen = useRef<{ code: string; at: number } | null>(null);
  // The clock the door window is read against: every second while the countdown runs (so it ticks and the doors
  // open on the second), every 30 seconds after that.
  const [now, setNow] = useState(() => Date.now());
  const doorsAt = event.doors_open_at ?? event.starts_at;
  const countingDown = Boolean(doorsAt) && now < Date.parse(doorsAt!);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), countingDown ? 1000 : 30_000);
    return () => window.clearInterval(timer);
  }, [countingDown]);

  const admit = useCallback(
    async (raw: string, retryKey?: string) => {
      const code = tidy(raw);
      if (!code || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const key = retryKey ?? newIdempotencyKey();
      let next: Outcome;
      try {
        const result = await checkIn(orgId, event.id, code, key);
        next = result.result === "ADMITTED" ? { kind: "admitted", checkIn: result } : { kind: "already", checkIn: result };
        void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status >= 500) {
          // The answer was lost: send the same key again, and the API returns the first answer.
          next = { kind: "offline", code, key };
        } else {
          next = { kind: "refused", code, ...refusal(error, event.timezone) };
        }
      }
      setOutcome(next);
      setRecent((list) => [{ outcome: next, at: Date.now() }, ...list].slice(0, 8));
      if (typeof navigator.vibrate === "function") navigator.vibrate(next.kind === "admitted" ? 80 : [60, 60, 60]);
      busyRef.current = false;
      setBusy(false);
    },
    [orgId, event.id, event.timezone, queryClient],
  );

  // The camera: read a frame every 250ms, with the browser's reader where there is one, otherwise jsQR.
  useEffect(() => {
    if (camera !== "on") return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busyRef.current) return;
      let text: string | null = null;
      try {
        if (detector) {
          text = (await detector.detect(video))[0]?.rawValue ?? null;
        } else {
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d", { willReadFrequently: true });
          if (!canvas || !context) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          text = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null;
        }
      } catch {
        return;
      }
      if (!text) return;
      const code = tidy(text);
      const now = Date.now();
      if (lastSeen.current && lastSeen.current.code === code && now - lastSeen.current.at < SAME_CODE_MS) return;
      lastSeen.current = { code, at: now };
      void admit(code);
    }, SCAN_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [camera, admit]);

  // With the camera running, an answer clears itself after a few seconds so the next guest can step up. "No answer"
  // stays until staff retry: nobody may walk in on a lost reply.
  useEffect(() => {
    if (!outcome || outcome.kind === "offline" || camera !== "on") return;
    const timer = window.setTimeout(() => setOutcome(null), ANSWER_SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [outcome, camera]);

  // Stop the camera when the screen closes.
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startCamera() {
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("on");
    } catch {
      setCamera("blocked");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera("off");
  }

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    void admit(typed).then(() => setTyped(""));
  }

  const checkedIn = summary.data?.checked_in ?? 0;
  const confirmed = summary.data?.confirmed ?? 0;
  // Phase 9: the door is open from doors_open_at (or the start) until the end. Before or after, the scanner rests.
  const opensAt = event.doors_open_at ?? event.starts_at;
  const phase = !opensAt || now < Date.parse(opensAt) ? "before" : event.ends_at && now >= Date.parse(event.ends_at) ? "ended" : "open";
  const resting = event.status !== "PUBLISHED" || phase !== "open";

  const doorsText = opensAt ? formatMomentFull(opensAt, event.timezone) : null;
  const closedReason =
    event.status !== "PUBLISHED"
      ? { title: "This event isn't open", detail: "Only a published event can let guests in." }
      : phase === "before"
        ? { title: doorsText ? `Doors open ${doorsText}` : "No start time yet", detail: "Scanning starts by itself when the doors open." }
        : phase === "ended"
          ? { title: "The event has ended", detail: "Tickets can't be used any more." }
          : null;
  /** What's left until the doors open, in days, hours, minutes and seconds (days only while there are some). */
  const opensIn = (() => {
    if (!opensAt || phase !== "before") return null;
    const total = Math.max(0, Math.floor((Date.parse(opensAt) - now) / 1000));
    const parts = [
      { value: Math.floor(total / 86_400), label: "Days" },
      { value: Math.floor((total % 86_400) / 3600), label: "Hours" },
      { value: Math.floor((total % 3600) / 60), label: "Min" },
      { value: total % 60, label: "Sec" },
    ];
    return parts[0]!.value > 0 ? parts : parts.slice(1);
  })();
  const ago = (at: number) => {
    const minutes = Math.floor((now - at) / 60_000);
    return minutes < 1 ? "Just now" : minutes < 60 ? `${minutes} min ago` : formatMomentShort(new Date(at).toISOString(), event.timezone);
  };
  const share = confirmed ? Math.min(100, Math.round((checkedIn / confirmed) * 100)) : 0;
  const tone = (o: Outcome) => (o.kind === "admitted" ? "success" : o.kind === "refused" ? "danger" : "warning");

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Title and the event; the picker (Door page) or Back (from an event) on the right. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Door</h1>
          <p className="type-body m-0 truncate text-text-soft">
            {event.name}
            {event.starts_at ? ` · ${formatMomentShort(event.starts_at, event.timezone)}` : ""}
          </p>
        </div>
        {picker ?? (
          onBack && (
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back to event
            </Button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* The stage: the camera, with each answer flashed over it in full colour. */}
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-paper-ink text-white sm:aspect-video">
            <video ref={videoRef} className={camera === "on" ? "absolute inset-0 block size-full object-cover" : "hidden"} playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* The event's cover behind the countdown and "Ready to scan", darkened so the white text reads on any
                photo. Hidden while the camera runs (the picture is the camera) and under an answer (its own colour). */}
            {event.cover && camera !== "on" && !outcome && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded file from the API, shown as a backdrop */}
                <img src={assetUrl(event.cover.url)} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-105 object-cover blur-[2px]" />
                <div className="absolute inset-0 bg-paper-ink/75" aria-hidden="true" />
              </>
            )}

            {/* The aiming frame: four corners in the middle of the picture. */}
            {camera === "on" && !outcome && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
                <span className="absolute left-0 top-0 size-10 rounded-tl-lg border-l-4 border-t-4 border-white" />
                <span className="absolute right-0 top-0 size-10 rounded-tr-lg border-r-4 border-t-4 border-white" />
                <span className="absolute bottom-0 left-0 size-10 rounded-bl-lg border-b-4 border-l-4 border-white" />
                <span className="absolute bottom-0 right-0 size-10 rounded-br-lg border-b-4 border-r-4 border-white" />
              </div>
            )}

            {/* No camera picture: closed doors, or ready to start. */}
            {camera !== "on" && !outcome && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                {closedReason ? (
                  <>
                    <DoorClosed className="size-10 opacity-70" />
                    {phase === "before" && opensIn ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="type-label m-0 uppercase tracking-widest opacity-70">Doors open in</p>
                        {/* The countdown: one block per unit, ticking every second. */}
                        <div className="flex items-start gap-2 sm:gap-3" role="timer" aria-live="off" aria-label={`Doors open ${doorsText ?? ""}`}>
                          {opensIn.map((part, i) => (
                            <div key={part.label} className="flex items-start gap-2 sm:gap-3">
                              {i > 0 && <span className="pt-2 text-3xl font-semibold leading-none opacity-40 sm:text-5xl">:</span>}
                              <div className="flex min-w-[64px] flex-col items-center gap-1.5 rounded-md bg-white/10 px-3 py-3 sm:min-w-[88px] sm:px-4">
                                <span className="text-4xl font-semibold leading-none tabular-nums tracking-tight sm:text-6xl">{String(part.value).padStart(2, "0")}</span>
                                <span className="type-label opacity-70">{part.label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="type-body-sm m-0 max-w-[360px] opacity-70">{doorsText}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="type-h2 m-0">{closedReason.title}</p>
                        <p className="type-body-sm m-0 max-w-[360px] opacity-70">{closedReason.detail}</p>
                      </div>
                    )}
                    {phase === "before" && <p className="type-body-sm m-0 opacity-60">Scanning starts by itself. Keep this screen open.</p>}
                  </>
                ) : (
                  <>
                    <ScanLine className="size-12 opacity-80" />
                    <div className="flex flex-col items-center gap-1">
                      <p className="type-h2 m-0">{camera === "blocked" ? "The camera isn't available" : "Ready to scan"}</p>
                      <p className="type-body-sm m-0 max-w-[340px] opacity-70">
                        {camera === "blocked" ? "Allow the camera in the browser, or type the code below." : "Start the camera and hold each ticket's QR inside the frame."}
                      </p>
                    </div>
                    <Button onClick={() => void startCamera()} loading={camera === "starting"} loadingLabel="Starting camera">
                      <Camera className="size-4" />
                      Start camera
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* The answer, over everything, in its colour: readable from arm's length. */}
            {outcome && (
              <div
                role="status"
                aria-live="assertive"
                className={
                  "absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white " +
                  (tone(outcome) === "success" ? "bg-success" : tone(outcome) === "danger" ? "bg-danger" : "bg-warning")
                }
              >
                {outcome.kind === "admitted" ? <CheckCircle2 className="size-16" /> : outcome.kind === "refused" ? <CircleX className="size-16" /> : <CircleAlert className="size-16" />}
                <p className="type-label m-0 uppercase tracking-widest opacity-90">
                  {outcome.kind === "admitted" ? "Let in" : outcome.kind === "already" ? "Already let in" : "Don't let in"}
                </p>
                <p className="m-0 font-semibold leading-tight text-[clamp(1.75rem,4vw,2.75rem)]">
                  {outcome.kind === "admitted" || outcome.kind === "already" ? guestName(outcome.checkIn.ticket.holder) : outcome.kind === "refused" ? outcome.title : "No answer"}
                </p>
                <p className="type-body m-0 max-w-[420px] opacity-90">
                  {outcome.kind === "admitted"
                    ? `${outcome.checkIn.ticket.ticket_type.name} · ${outcome.checkIn.ticket.code}`
                    : outcome.kind === "already"
                      ? `Used ${formatMomentShort(outcome.checkIn.checked_in_at, event.timezone)}. Check it's the same person.`
                      : outcome.kind === "refused"
                        ? outcome.detail
                        : `The connection dropped while checking ${outcome.code}. Don't let them in yet.`}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {outcome.kind === "offline" && (
                    <Button variant="secondary" onClick={() => void admit(outcome.code, outcome.key)} loading={busy} loadingLabel="Checking">
                      <RotateCcw className="size-4" />
                      Try again
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setOutcome(null)}>
                    Next guest
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Under the stage: type a code, and the camera switch. */}
          <form onSubmit={submitTyped} noValidate className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:items-center">
            <label htmlFor="door-code" className="sr-only">
              Ticket code
            </label>
            <Input
              id="door-code"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type a code, e.g. U43N99SW"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase"
              disabled={resting}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none" variant={resting ? "secondary" : undefined} loading={busy} loadingLabel="Checking" disabled={!typed.trim() || resting}>
                Check
              </Button>
              {camera === "on" && (
                <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={stopCamera}>
                  <CameraOff className="size-4" />
                  Stop camera
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* The night so far: who's in, then every answer as it happened. */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="type-label m-0 text-text-soft">Checked in</p>
                <span className={closedReason ? "type-body-sm flex items-center gap-1.5 text-text-soft" : "type-body-sm flex items-center gap-1.5 text-success-text"}>
                  {closedReason ? <DoorClosed className="size-4" /> : <DoorOpen className="size-4" />}
                  {closedReason ? (phase === "ended" ? "Doors closed" : "Not open yet") : "Doors open"}
                </span>
              </div>
              <p className="m-0 flex items-baseline gap-2 text-text">
                <span className="text-5xl font-semibold leading-none tracking-tight">{summary.isPending ? "–" : formatNumber(checkedIn)}</span>
                <span className="type-body text-text-soft">of {formatNumber(confirmed)}</span>
              </p>
              <ProgressBar value={share} aria-label="Guests checked in" />
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div className="flex flex-col">
                  <span className="type-h3 text-text">{formatNumber(Math.max(0, confirmed - checkedIn))}</span>
                  <span className="type-body-sm text-text-soft">Still to come</span>
                </div>
                <div className="flex flex-col">
                  <span className="type-h3 text-text">{share}%</span>
                  <span className="type-body-sm text-text-soft">Arrived</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" subtitle={recent.length ? "Last 8 scans, newest first." : undefined} />
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <IconTile tone="charcoal" size="md">
                  <ScanLine />
                </IconTile>
                <p className="type-body-sm m-0 text-text-soft">No scans yet. Each answer is listed here.</p>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {recent.map(({ outcome: r, at }, i) => {
                  const code = r.kind === "admitted" || r.kind === "already" ? r.checkIn.ticket.code : r.code;
                  const title =
                    r.kind === "admitted" || r.kind === "already" ? guestName(r.checkIn.ticket.holder) : r.kind === "refused" ? r.title : "No answer";
                  const sub = r.kind === "admitted" ? "Let in" : r.kind === "already" ? "Already used" : r.kind === "refused" ? "Not let in" : "Try again";
                  return (
                    <li key={`${code}-${at}-${i}`} className="flex items-center gap-3">
                      <IconTile tone={tone(r)} size="sm">
                        {r.kind === "admitted" ? <CheckCircle2 /> : r.kind === "refused" ? <CircleX /> : <CircleAlert />}
                      </IconTile>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="type-body-sm truncate font-medium text-text">{title}</span>
                        <span className="type-body-sm truncate text-text-faint">
                          {sub} · <span className="font-mono">{code}</span>
                        </span>
                      </div>
                      <span className="type-body-sm flex-none text-text-faint">{ago(at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
