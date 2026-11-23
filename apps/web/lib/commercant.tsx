"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { COMMERCANT_DEMO } from "./api";

const Ctx = createContext<{ id: string; changer: (id: string) => void }>({ id: COMMERCANT_DEMO, changer: () => {} });

/** Identité du commerçant connecté (prototype : mémorisée dans le navigateur, pas d'authentification). */
export function FournisseurCommercant({ children }: { children: ReactNode }) {
  const [id, setId] = useState(COMMERCANT_DEMO);
  useEffect(() => {
    const v = window.localStorage.getItem("kwedo.commercant");
    if (v) setId(v);
  }, []);
  const changer = (v: string) => { window.localStorage.setItem("kwedo.commercant", v); setId(v); };
  return <Ctx.Provider value={{ id, changer }}>{children}</Ctx.Provider>;
}

export const useCommercant = () => useContext(Ctx);
