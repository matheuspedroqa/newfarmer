// Ícone original do NewFarmer para um cultivo ou animal (public/icons/<id>.svg, gerado por scripts/icons/build.mjs).
// Decorativo: o nome do item sempre aparece ao lado. Por padrão acompanha o tamanho do texto em volta.
export function ItemIcon({ id, className = "size-[1.3em]" }: { id: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG estático e pequeno, sem ganho com next/image.
  return <img src={`/icons/${id}.svg`} alt="" aria-hidden width={64} height={64} className={`inline-block shrink-0 align-middle ${className}`} />;
}
