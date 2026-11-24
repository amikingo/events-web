import { FormCard } from "./form-card";
import { Skeleton } from "./skeleton";

export interface FormSkeletonProps {
  /** One entry per row of fields: `1` is a full-width field, `2` is two side by side. Default: one, then two. */
  rows?: (1 | 2)[];
  /** Show a title bar (default) and the full-width submit button (default). */
  title?: boolean;
  submit?: boolean;
  className?: string;
}

const LABEL_WIDTHS = ["30%", "40%", "50%", "35%"];

/** The loading version of a `<FormCard>`: label bars over 36px input bars, same card, same padding, so nothing moves when the real form arrives. */
export function FormSkeleton({ rows = [1, 2], title = true, submit = true, className }: FormSkeletonProps) {
  let n = 0;
  const field = () => (
    <div key={`f${n}`} className="flex w-full flex-col gap-1.5">
      <Skeleton width={LABEL_WIDTHS[n++ % LABEL_WIDTHS.length]} height={10} />
      <Skeleton shape="input" />
    </div>
  );
  return (
    <FormCard aria-hidden="true" className={className}>
      {title && <Skeleton width="40%" height={18} />}
      {rows.map((r, i) => (r === 2 ? <div key={`g${i}`} className="grid grid-cols-2 gap-3">{[field(), field()]}</div> : field()))}
      {submit && <Skeleton shape="button" width="100%" className="mt-1" />}
    </FormCard>
  );
}
