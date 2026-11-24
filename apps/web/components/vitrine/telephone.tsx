import Image from "next/image";

/** Capture réelle de l'app (apps/web/public/ecrans), en clair et en sombre selon le thème. */
export function Capture({ nom, alt, l = 360, h = 760, prioritaire = false, sizes }: { nom: string; alt: string; l?: number; h?: number; prioritaire?: boolean; sizes: string }) {
  const commun = { width: l * 2, height: h * 2, sizes, priority: prioritaire, loading: prioritaire ? undefined : ("lazy" as const), className: "h-full w-full object-contain object-top" };
  return (
    <>
      <Image src={`/ecrans/${nom}-clair.jpg`} alt={alt} {...commun} className={`seul-clair ${commun.className}`} />
      <Image src={`/ecrans/${nom}-sombre.jpg`} alt="" aria-hidden="true" {...commun} priority={false} loading="lazy" className={`seul-sombre ${commun.className}`} />
    </>
  );
}

/** Cadre de téléphone (bord dessiné par le jeton --cadre). `ecrans` > 1 : les écrans se succèdent en fondu. */
export function Telephone({ ecrans, className = "", prioritaire = false, largeur = "18rem", sizes = "(min-width: 1280px) 20vw, (min-width: 640px) 18rem, 72vw" }: {
  ecrans: { nom: string; alt: string }[]; className?: string; prioritaire?: boolean; largeur?: string;
  /** Attribut sizes valide (pas de clamp) : le navigateur choisit une image à la taille affichée. */
  sizes?: string;
}) {
  return (
    <figure className={`shrink-0 ${className}`} style={{ width: largeur, maxWidth: "100%" }}>
      {/* Le rapport 360/760 s'applique à l'écran seul (bordure exclue) : la capture n'est jamais rognée sur les côtés. */}
      <div className="overflow-hidden rounded-[2.4rem] border-[9px] border-cadre bg-fond">
        <div className="relative aspect-[360/760]">
        <div className={ecrans.length > 1 ? "defile absolute inset-0" : "absolute inset-0"}>
          {ecrans.map((e, k) => (
            <div key={e.nom} className={ecrans.length > 1 ? "" : "h-full"} aria-hidden={k > 0 ? true : undefined}>
              <Capture nom={e.nom} alt={k === 0 ? e.alt : ""} prioritaire={prioritaire && k === 0} sizes={sizes} />
            </div>
          ))}
        </div>
        </div>
      </div>
    </figure>
  );
}
