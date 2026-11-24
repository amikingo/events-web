"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { CameraIcon, DocIcon, PauseIcon, PlayIcon, UploadIcon, XIcon } from "./icons";
import { DashedZone, EmptyState } from "./empty-state";
import { Pill } from "./pill";
import { ProgressBar } from "./progress-bar";

export type UploadStatus = "uploading" | "paused" | "done" | "failed";

export interface UploadItem {
  id: string;
  name: string;
  /** "1.8 MB". */
  size: string;
  status: UploadStatus;
  /** 0–100. */
  progress: number;
  /** Transfer rate while uploading ("1.1 MB/s"), shown after the size. */
  speed?: string;
  /** Shown instead of the size when `failed` ("Upload failed · network error"). */
  error?: string;
  /** Image files get the gradient thumb; everything else the document glyph. */
  image?: boolean;
}

export interface FileUploadProps {
  items: UploadItem[];
  /** Called with the files dropped or chosen. Validate and start the upload; return a message to reject them instead. */
  onFiles: (files: File[]) => string | void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  /** Show a Pause button on running rows and a Resume button on paused ones. Omit both to keep cancel only. */
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  /** Passed to the file picker (`accept`), and shown in the hint line. */
  accept?: string;
  title?: ReactNode;
  hint?: ReactNode;
  multiple?: boolean;
  className?: string;
}

/**
 * The dashed drop zone from Empty states plus the upload rows from Loading states: drag over turns it accent,
 * each file gets a row with a 4px bar, done rows turn green, failed rows red with Retry.
 */
export function FileUpload({
  items,
  onFiles,
  onRetry,
  onRemove,
  onPause,
  onResume,
  accept,
  title = "Drop files here or browse",
  hint = "PDF, PNG or JPG up to 5 MB each",
  multiple = true,
  className,
}: FileUploadProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(files: File[]) {
    if (!files.length) return;
    const rejection = onFiles(files);
    setRejected(typeof rejection === "string" ? rejection : null);
  }

  const zone = rejected ? (
    <DashedZone state="error" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
      <EmptyState size="sm" tone="danger" icon={<UploadIcon />} title={rejected} description="Try a PDF or a smaller image." />
    </DashedZone>
  ) : (
    <DashedZone
      hoverable
      state={dragging !== null ? "dragging" : "idle"}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(e.dataTransfer.items.length);
      }}
      onDragLeave={() => setDragging(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(null);
        handle([...e.dataTransfer.files]);
      }}
    >
      {dragging !== null ? (
        <EmptyState size="sm" icon={<UploadIcon />} title="Release to upload" description={`${dragging} file${dragging === 1 ? "" : "s"}`} />
      ) : (
        <EmptyState
          size="sm"
          icon={<UploadIcon />}
          title={title}
          description={hint}
          actions={
            <Button
              variant="secondary"
              className="h-[30px] px-[11px] py-[5px] text-[13px]"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Browse files
            </Button>
          }
        />
      )}
    </DashedZone>
  );

  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      {zone}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          handle([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {items.length > 0 && (
        <div className="overflow-hidden rounded-sm border border-border bg-surface">
          {items.map((f) => (
            <div key={f.id} className="flex items-center gap-3 border-t border-border px-3 py-2.5 first:border-t-0">
              {f.image ? (
                <span className="size-9 flex-none rounded-thumb bg-gradient-to-br from-accent-soft via-accent to-accent-deep" aria-hidden="true" />
              ) : (
                <span className="flex size-9 flex-none items-center justify-center rounded-thumb bg-surface-2 text-text-soft">
                  <DocIcon className="size-[18px]" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-text">{f.name}</div>
                <ProgressBar
                  height={4}
                  className="mt-1.5"
                  value={f.progress}
                  tone={f.status === "done" ? "success" : f.status === "failed" ? "danger" : f.status === "paused" ? "neutral" : "accent"}
                  aria-label={`${f.name} upload progress`}
                />
                <div className="mt-0.5 flex justify-between text-[11.5px] text-text-faint">
                  <span>
                    {f.status === "failed"
                      ? (f.error ?? "Upload failed")
                      : f.status === "paused"
                        ? `Paused · ${f.size}`
                        : f.status === "uploading" && f.speed
                          ? `${f.size} · ${f.speed}`
                          : f.size}
                  </span>
                  <span className={cn(f.status === "failed" && "text-danger-text")}>{Math.round(f.progress)}%</span>
                </div>
              </div>
              {f.status === "failed" ? (
                <Button variant="secondary" className="h-[30px] px-2.5 py-1 text-[12.5px]" onClick={() => onRetry(f.id)}>
                  Retry
                </Button>
              ) : (
                <>
                  {f.status === "done" && (
                    <Pill tone="success" dot>
                      Done
                    </Pill>
                  )}
                  {f.status === "uploading" && onPause && (
                    <Button variant="secondary" iconOnly className="size-[30px]" aria-label="Pause" onClick={() => onPause(f.id)}>
                      <PauseIcon className="size-3.5" />
                    </Button>
                  )}
                  {f.status === "paused" && onResume && (
                    <Button variant="secondary" iconOnly className="size-[30px]" aria-label="Resume" onClick={() => onResume(f.id)}>
                      <PlayIcon className="size-3.5" />
                    </Button>
                  )}
                  <Button variant="secondary" iconOnly className="size-[30px]" aria-label={f.status === "done" ? "Remove" : "Cancel"} onClick={() => onRemove(f.id)}>
                    <XIcon className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AvatarUploadProps {
  /** Initials on the empty tile. */
  initials?: string;
  /** Image URL once set; otherwise the tile shows initials (or the gradient placeholder when `hasImage`). */
  src?: string;
  hasImage?: boolean;
  title: ReactNode;
  /** The muted spec line ("Square, at least 400×400 · JPG or PNG"). */
  hint: ReactNode;
  /** The file input's `accept`. */
  accept?: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  uploadLabel?: string;
}

/** `.avatar-upl` — a 68px rounded tile with a camera badge, a title, the spec line and Upload / Remove. */
export function AvatarUpload({ initials, src, hasImage = false, title, hint, accept = "image/png,image/jpeg", onFile, onRemove, uploadLabel }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = hasImage || !!src;
  return (
    <div className="flex w-full items-center gap-4">
      <span
        className={cn(
          "relative flex size-[68px] flex-none items-center justify-center rounded-avatar border border-border text-[22px] font-bold",
          filled ? "bg-gradient-to-br from-accent-soft via-accent to-accent-deep" : "bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] text-accent-text",
        )}
      >
        {src ? <img src={src} alt="" className="size-full rounded-[inherit] object-cover" /> : !filled && initials}
        <button
          type="button"
          aria-label="Change photo"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-accent-fill text-white"
        >
          <CameraIcon className="size-[13px]" />
        </button>
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <b className="text-[13.5px] font-semibold text-text">{title}</b>
        <small className="text-[11.5px] text-text-faint">{hint}</small>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            {uploadLabel ?? (filled ? "Replace" : "Upload")}
          </Button>
          <Button variant="secondary" disabled={!filled} onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
