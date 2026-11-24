import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type SkeletonShape = "line" | "title" | "num" | "text" | "avatar" | "avatar-lg" | "pill" | "button" | "input" | "block" | "media" | "thumb" | "circle";

/** Each shape matches its real counterpart: line 12px, title 16px, number 28px, avatar 36px (8px radius), pill 20px full-radius, button 36px, input 36px, block 84px. */
const shapeClasses: Record<SkeletonShape, string> = {
  line: "h-3",
  text: "h-3",
  title: "h-4 w-[55%]",
  num: "h-7 w-[45%]",
  avatar: "size-9 rounded-sm",
  "avatar-lg": "size-12 rounded-md",
  circle: "size-9 rounded-sm",
  pill: "h-5 w-16 rounded-full",
  button: "h-9 w-[110px]",
  input: "h-9",
  block: "h-[84px] rounded-tile",
  media: "h-[120px] rounded-none",
  thumb: "h-[92px] w-[70px] rounded-tile",
};

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: SkeletonShape;
  /** Override the shape's width (a number is px). Lines usually take a percentage so rows look natural. */
  width?: number | string;
  height?: number | string;
}

/** `.skel` — the loading shimmer (1.4s). Same shape and size as the content it replaces, never a generic grey box. Under reduced motion it freezes. */
export function Skeleton({ shape = "line", width, height, className, style, ...props }: SkeletonProps) {
  const dims: CSSProperties = { ...style };
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-skel rounded-btn bg-shimmer motion-reduce:animate-none", shapeClasses[shape], className)}
      style={dims}
      {...props}
    />
  );
}

/** `.skel-stack` — a column of skeleton lines, 8px apart. */
export function SkeletonStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex w-full flex-col gap-2", className)} {...props} />;
}
