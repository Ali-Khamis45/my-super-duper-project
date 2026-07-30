interface ProgressDotsProps {
  total: number;
  current: number;
}

/** A real, reusable progress indicator — the same "one indicator, any step count" shape a future multi-step flow could reuse, not hardcoded to 8. */
export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-1.5 rounded-full transition-all ${
            index === current ? "bg-brand-accent-500 w-4" : "bg-border w-1.5"
          }`}
        />
      ))}
    </div>
  );
}
