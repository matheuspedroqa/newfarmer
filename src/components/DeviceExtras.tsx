/** Cartão branco flutuante com um detalhe do sistema. Só enfeite: repete o que já está no print. */
export function FloatingCard({ icon, title, text, className = "" }: { icon: string; title: string; text: string; className?: string }) {
  return (
    <div aria-hidden className={`absolute z-10 hidden w-44 items-center gap-3 rounded-[20px] bg-surface p-3 shadow-xl shadow-black/20 ring-1 ring-border sm:flex ${className}`}>
      <span className="text-2xl">{icon}</span>
      <span className="min-w-0 text-left text-xs leading-snug text-muted">
        <b className="block text-sm text-text">{title}</b>
        {text}
      </span>
    </div>
  );
}

/** Selo de verificado (estrela de pontas arredondadas) na cor da marca. */
export function VerifiedSeal({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={`absolute z-10 size-12 drop-shadow-lg ${className}`}>
      <path className="fill-primary" d="M24 2l5.2 3.4 6.2-.2 2.6 5.6 5.6 2.6-.2 6.2L46 24l-3.4 5.2.2 6.2-5.6 2.6-2.6 5.6-6.2-.2L24 46l-5.2-3.4-6.2.2-2.6-5.6-5.6-2.6.2-6.2L2 24l3.4-5.2-.2-6.2 5.6-2.6 2.6-5.6 6.2.2z" />
      <path d="M15 24.5l6 6 12-13" fill="none" className="stroke-primary-text" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
