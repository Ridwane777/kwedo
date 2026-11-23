// Partagé entre le layout (serveur) et lib/theme.tsx (client).
export const CLE_THEME = "kwedo-theme";

/**
 * Posé dans <head>, exécuté avant le premier rendu : aucun flash de mauvais thème.
 * « Système » suit le réglage du téléphone en direct, par la media query CSS.
 */
export const SCRIPT_THEME = `(function(){var t;try{t=localStorage.getItem("${CLE_THEME}")}catch(e){}if(t!=="light"&&t!=="dark")t="system";document.documentElement.dataset.theme=t})()`;
