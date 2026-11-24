import Image from "next/image";

/** Capture réelle de l'app (apps/web/public/ecrans), en clair et en sombre selon le thème. */
export function Capture({ nom, alt, l = 360, h = 760, prioritaire = false, sizes }: { nom: string; alt: string; l?: number; h?: number; prioritaire?: boolean; sizes: string }) {
  const commun = { width: l * 2, height: h * 2, sizes, priority: prioritaire, loading: prioritaire ? undefined : ("lazy" as const), className: "h-full w-full object-cover object-top" };
  return (
    <>
      <Image src={`/ecrans/${nom}-clair.jpg`} alt={alt} {...commun} className={`seul-clair ${commun.className}`} />
      <Image src={`/ecrans/${nom}-sombre.jpg`} alt="" aria-hidden="true" {...commun} priority={false} loading="lazy" className={`seul-sombre ${commun.className}`} />
    </>
  );
}

/** Cadre de téléphone (bord dessiné par le jeton --cadre). `ecrans` > 1 : les écrans se succèdent en fondu. */
export function Telephone({ ecrans, className = "", prioritaire = false, largeur = "18rem" }: {
  ecrans: { nom: string; alt: string }[]; className?: string; prioritaire?: boolean; largeur?: string;
}) {
  return (
    <figure className={`shrink-0 ${className}`} style={{ width: largeur, maxWidth: "100%" }}>
      <div className="relative aspect-[360/760] overflow-hidden rounded-[2.4rem] border-[9px] border-cadre bg-fond">
        <div className={ecrans.length > 1 ? "defile absolute inset-0" : "absolute inset-0"}>
          {ecrans.map((e, k) => (
            <div key={e.nom} className={ecrans.length > 1 ? "" : "h-full"} aria-hidden={k > 0 ? true : undefined}>
              <Capture nom={e.nom} alt={k === 0 ? e.alt : ""} prioritaire={prioritaire && k === 0} sizes={`(min-width: 1024px) ${largeur}, 70vw`} />
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
