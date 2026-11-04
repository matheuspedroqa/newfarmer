/** Celular realista só com CSS: moldura escura, ilha, botões laterais e barra de status. A tela é o `children` (o print). */
export function PhoneFrame({ children, className = "", tilt = false }: { children: React.ReactNode; className?: string; tilt?: boolean }) {
  return (
    <div className={`relative ${tilt ? "md:[transform:perspective(1600px)_rotateY(-12deg)_rotateX(4deg)]" : ""} ${className}`}>
      <div className="rounded-[2.75rem] bg-gradient-to-br from-zinc-500 via-zinc-900 to-zinc-700 p-[3px] shadow-2xl shadow-black/40">
        <div className="rounded-[2.65rem] bg-zinc-950 p-[7px]">
          <div className="relative overflow-hidden rounded-[2.2rem] bg-black [container-type:inline-size]">
            {children}
            <div aria-hidden>
              <div className="absolute left-1/2 top-[2.5cqw] h-[7cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[9cqw] pt-[2.5cqw] text-[4cqw] font-bold leading-[7cqw] text-zinc-900">
                <span>9:41</span>
                <span className="flex items-center gap-[1.5cqw]">
                  <svg viewBox="0 0 18 12" className="h-[3.4cqw]" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                  <svg viewBox="0 0 16 12" className="h-[3.4cqw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 4.2a10 10 0 0 1 14 0M3.6 7a6.3 6.3 0 0 1 8.8 0" /><circle cx="8" cy="10.2" r="1.1" fill="currentColor" stroke="none" /></svg>
                  <svg viewBox="0 0 27 12" className="h-[3.4cqw]" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3.2" stroke="currentColor" opacity=".45" /><rect x="2" y="2" width="19" height="8" rx="2" fill="currentColor" /><rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".45" /></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span aria-hidden className="absolute -left-[2px] top-[17%] h-[5%] w-[3px] rounded-l bg-zinc-700" />
      <span aria-hidden className="absolute -left-[2px] top-[25%] h-[9%] w-[3px] rounded-l bg-zinc-700" />
      <span aria-hidden className="absolute -right-[2px] top-[27%] h-[13%] w-[3px] rounded-r bg-zinc-700" />
    </div>
  );
}
