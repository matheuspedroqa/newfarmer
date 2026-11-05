/** Janela de navegador só com CSS: os três pontos e sombra grande, sem barra de endereço. */
export function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-black/25 ring-1 ring-border">
      <div aria-hidden className="flex items-center gap-3 border-b border-border bg-soft px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-accent/70" />
          <span className="size-2.5 rounded-full bg-primary/70" />
        </span>
      </div>
      {children}
    </div>
  );
}
