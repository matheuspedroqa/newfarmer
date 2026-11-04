/** Janela de navegador realista só com CSS: pontos, setas, barra de endereço com cadeado e sombra grande. */
export function BrowserFrame({ children, path = "/dashboard" }: { children: React.ReactNode; path?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-black/25 ring-1 ring-border">
      <div aria-hidden className="flex items-center gap-3 border-b border-border bg-soft px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-accent/70" />
          <span className="size-2.5 rounded-full bg-primary/70" />
        </span>
        <span className="hidden gap-2 text-sm text-muted sm:flex"><span>←</span><span className="opacity-50">→</span></span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs text-muted">
          <svg viewBox="0 0 12 12" className="size-3 shrink-0" fill="currentColor"><path d="M3 5V4a3 3 0 0 1 6 0v1h.5A1.5 1.5 0 0 1 11 6.5v4A1.5 1.5 0 0 1 9.5 12h-7A1.5 1.5 0 0 1 1 10.5v-4A1.5 1.5 0 0 1 2.5 5zm1.5 0h3V4a1.5 1.5 0 0 0-3 0z" /></svg>
          <span className="truncate">newfarmer.vercel.app{path}</span>
        </span>
      </div>
      {children}
    </div>
  );
}
