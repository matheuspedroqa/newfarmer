/** Janela de navegador falsa só com CSS, para emoldurar os prints do computador. */
export function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-border">
      <div aria-hidden className="flex items-center gap-1.5 border-b border-border bg-soft px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/70" />
        <span className="size-2.5 rounded-full bg-accent/70" />
        <span className="size-2.5 rounded-full bg-primary/70" />
        <span className="ml-3 h-4 flex-1 rounded-full bg-bg" />
      </div>
      {children}
    </div>
  );
}
