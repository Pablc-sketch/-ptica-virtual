// Las cotizaciones se abren solo cuando existen política de privacidad, canal de contacto real
// y recepción en admin. Se activa con QUOTES_OPEN=true en el entorno (servidor).
export const quotesOpen = () => process.env.QUOTES_OPEN === "true";
