import { redirect } from "next/navigation";

/** Ancienne page « Portefeuille » : remplacée par Crédits (indicateurs et onglets) et Recouvrement (ADR 0019). */
export default function AnciennePortefeuille() {
  redirect("/console/credits");
}
