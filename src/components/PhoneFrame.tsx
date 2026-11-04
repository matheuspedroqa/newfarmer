/** Contorno de celular só com CSS, para emoldurar os prints da tela pequena. */
export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[2rem] border-[6px] border-text bg-surface shadow-xl ${className}`}>{children}</div>;
}
