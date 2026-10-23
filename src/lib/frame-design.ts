// Editorial names for Óptica Global. Product IDs and supplier identifiers remain unchanged.
const DESIGNS:Record<string,{name:string;use:"solar"|"optical";collection:string}>={
  "optico-kensington": {
    "name": "Kensington",
    "use": "optical",
    "collection": "Ritmo urbano"
  },
  "optico-perla": {
    "name": "Montmartre",
    "use": "optical",
    "collection": "Galería de color"
  },
  "optico-oslo": {
    "name": "Oslo",
    "use": "optical",
    "collection": "Líneas esenciales"
  },
  "optico-bauhaus": {
    "name": "Bauhaus",
    "use": "optical",
    "collection": "Líneas esenciales"
  },
  "optico-manhattan": {
    "name": "Manhattan",
    "use": "optical",
    "collection": "Ritmo urbano"
  },
  "sol-amalfi": {
    "name": "Amalfi",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-cannes": {
    "name": "Cannes",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-brooklyn": {
    "name": "Brooklyn",
    "use": "solar",
    "collection": "Ritmo urbano"
  },
  "sol-sicilia": {
    "name": "Sicilia",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-leone": {
    "name": "Bellagio",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-havana": {
    "name": "Havana",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-riva": {
    "name": "Riva",
    "use": "solar",
    "collection": "Líneas esenciales"
  },
  "sol-pantera": {
    "name": "Tribeca",
    "use": "solar",
    "collection": "Ritmo urbano"
  },
  "sol-palazzo": {
    "name": "Palazzo",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "sol-azzurra": {
    "name": "Capri",
    "use": "solar",
    "collection": "Rutas del sol"
  },
  "ovalo-negro": {
    "name": "Soho",
    "use": "solar",
    "collection": "Ritmo urbano"
  },
  "cat-eye-ambar": {
    "name": "Riviera",
    "use": "optical",
    "collection": "Galería de color"
  },
  "cat-eye-mosaico": {
    "name": "Brera",
    "use": "optical",
    "collection": "Galería de color"
  }
};
export function frameDesign(slug:string){return DESIGNS[slug]??null;}
