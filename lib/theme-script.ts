/**
 * Runs before the first paint (put it in `<head>`) so a saved Light / Dark choice is applied immediately and the page never flashes the wrong
 * theme. "System" is stored as nothing: no `data-theme` attribute, so `prefers-color-scheme` decides. Server-safe: just a string.
 */
export const THEME_KEY = "cheche-theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
