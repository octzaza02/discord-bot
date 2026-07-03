import type { ReactNode } from 'react';

export function HowToUse({
  title = 'วิธีใช้',
  defaultOpen = false,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-lg border border-amber-border bg-amber-surface mb-6 overflow-hidden group shadow-sm"
    >
      <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between hover:bg-amber-bg">
        <span className="flex items-center gap-2 font-medium text-amber-heading">
          <span>📖</span>
          <span>{title}</span>
        </span>
        <span className="text-amber-gold text-xs transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="px-5 pt-3 pb-5 text-sm text-amber-sub space-y-3 border-t border-amber-border">
        {children}
      </div>
    </details>
  );
}

export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-6 h-6 rounded-full bg-amber-primary text-white text-xs flex items-center justify-center font-semibold mt-0.5">
        {n}
      </div>
      <div className="flex-1 text-amber-heading">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-amber-bg border border-amber-border text-xs text-amber-heading">
      {children}
    </code>
  );
}
