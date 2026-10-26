// Stable identities for the book's sections. Colors are generated as M3 tonal roles.
// Icons are local 24 × 24 outline drawings; no font, image download or emoji is needed.
export const SECTION_THEMES = Object.freeze([
  { id: 's00', slug: 'preliminares', label: 'Preliminares', hue: 250, chroma: 10,
    icon: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15M6 8h3M6 12h3M15 8h3M15 12h3"/>' },
  { id: 's01', slug: 'soporte-vital', label: 'Soporte vital', hue: 25, chroma: 60,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h5l2-5 4 10 2-5h5"/>' },
  { id: 's02', slug: 'exploraciones', label: 'Exploraciones', hue: 235, chroma: 50,
    icon: '<path d="m8 3 5 3-4 7-5-3 4-7Zm-2 9-1 2M12 9a6 6 0 0 1 2 11H4m6-7v3m-3 0h6M2 21h18"/>' },
  { id: 's03', slug: 'cardiovascular', label: 'Cardiovascular', hue: 10, chroma: 55,
    icon: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-3 3-1 7 1 9l7 7 7-7c2-2 4-6 1-9Z"/><path d="M5 12h4l2-3 2 6 2-3h4"/>' },
  { id: 's04', slug: 'respiratorio', label: 'Respiratorio', hue: 200, chroma: 48,
    icon: '<path d="M10 4v7L7 8c-1-1-2 0-3 2-2 4-3 9 0 10 2 1 5-1 6-3V4m4 0v7l3-3c1-1 2 0 3 2 2 4 3 9 0 10-2 1-5-1-6-3V4M10 9h4"/>' },
  { id: 's05', slug: 'digestivo', label: 'Digestivo', hue: 80, chroma: 52,
    icon: '<path d="M10 3v6c0 3-4 3-5 6-1 4 2 6 5 6h4c5 0 8-4 7-8-1-3-3-4-5-3-1 0-2 0-2-2V3M9 17c2-2 5 1 8-2"/>' },
  { id: 's06', slug: 'neurologia', label: 'Neurología', hue: 300, chroma: 58,
    icon: '<path d="M12 4c-2-3-6-1-6 2-3 0-4 3-3 5-2 2-1 5 2 6 0 4 5 6 7 3 2 3 7 1 7-3 3-1 4-4 2-6 1-2 0-5-3-5 0-3-4-5-6-2Zm0 0v16M6 6c0 2 1 3 3 3m-6 2h4m-2 6c1-2 2-2 4-2m9-9c0 2-1 3-3 3m6 2h-4m2 6c-1-2-2-2-4-2"/>' },
  { id: 's07', slug: 'endocrino', label: 'Endocrino y metabolismo', hue: 335, chroma: 50,
    icon: '<path d="M12 8c-2-4-6-5-7-1-2 5-1 10 2 11 2 1 4-2 5-4 1 2 3 5 5 4 3-1 4-6 2-11-1-4-5-3-7 1Zm-2 3h4M12 3v3"/>' },
  { id: 's08', slug: 'nefrourologia', label: 'Nefrourología', hue: 170, chroma: 44,
    icon: '<path d="M8 4c-5-1-7 5-5 9 1 3 5 3 6 0 1-2-2-2-1-4 2-2 2-4 0-5Zm8 0c5-1 7 5 5 9-1 3-5 3-6 0-1-2 2-2 1-4-2-2-2-4 0-5ZM8 14v4c0 4 8 4 8 0v-4"/>' },
  { id: 's09', slug: 'infecciones', label: 'Infecciones', hue: 125, chroma: 48,
    icon: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3"/><circle cx="10" cy="10" r=".7"/><circle cx="14" cy="14" r=".7"/>' },
  { id: 's10', slug: 'reumatologia', label: 'Reumatología', hue: 145, chroma: 38,
    icon: '<path d="m5 3 5 5c1 1 1 3 0 4l-2 2m11 7-5-5c-1-1-1-3 0-4l2-2M3 5l5 5m13 9-5-5"/><circle cx="12" cy="12" r="3"/>' },
  { id: 's11', slug: 'oncologia', label: 'Oncología', hue: 315, chroma: 38,
    icon: '<path d="M8 5c0-4 8-4 8 0 0 5-7 12-10 16l-3-3C7 14 16 7 16 5M8 5c0 4 8 12 13 13l-3 3c-3-3-5-5-6-7M8 5c2 2 6 2 8 0"/>' },
  { id: 's12', slug: 'hematologia', label: 'Hematología', hue: 350, chroma: 54,
    icon: '<path d="M12 2c-3 5-8 9-8 13a8 8 0 0 0 16 0c0-4-5-8-8-13Z"/><circle cx="9" cy="14" r="1"/><circle cx="14" cy="12" r="1"/><circle cx="13" cy="17" r="1"/>' },
  { id: 's13', slug: 'intoxicaciones', label: 'Intoxicaciones', hue: 50, chroma: 62,
    icon: '<path d="M9 3h6m-5 0v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V3M7 15h10m-7 2 4 3m0-3-4 3"/>' },
  { id: 's14', slug: 'alcohol', label: 'Alcohol', hue: 65, chroma: 36,
    icon: '<path d="M6 3h12l-1 8c-1 5-9 5-10 0L6 3Zm6 12v6m-4 0h8M7 8h10"/>' },
  { id: 's15', slug: 'agentes-fisicos-quimicos', label: 'Agentes físicos y químicos', hue: 100, chroma: 52,
    icon: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/><path d="M4 3 2 2m18 19 2 1M3 19l-1 2M21 5l1-2"/>' },
  { id: 's16', slug: 'otorrinolaringologia', label: 'Otorrinolaringología', hue: 270, chroma: 46,
    icon: '<path d="M5 9a7 7 0 0 1 14 0c0 4-2 5-4 7-1 1-1 5-5 5-2 0-4-2-4-4m3-8a3 3 0 0 1 6 0c0 2-1 3-3 4m0-4v3H9"/>' },
  { id: 's17', slug: 'oftalmologia', label: 'Oftalmología', hue: 255, chroma: 52,
    icon: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: 's18', slug: 'maxilofacial', label: 'Maxilofacial', hue: 35, chroma: 36,
    icon: '<path d="M6 8a6 6 0 0 1 12 0v5l-2 6-4 3-4-3-2-6V8Zm3 6h6m-5 0v3m4-3v3M5 9H3m18 0h-2"/>' },
  { id: 's19', slug: 'traumatologia', label: 'Traumatología', hue: 110, chroma: 34,
    icon: '<path d="M7 3a3 3 0 0 0-4 4c-2 3 1 6 4 4l6 6c-2 3 1 6 4 4a3 3 0 0 0 4-4c2-3-1-6-4-4l-6-6c2-3-1-6-4-4Z"/>' },
  { id: 's20', slug: 'dermatologia', label: 'Dermatología', hue: 330, chroma: 62,
    icon: '<path d="M3 7c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 17c3-3 6 3 9 0s6 3 9 0"/><path d="M6 3h.01M12 3h.01M18 3h.01M6 21h.01M12 21h.01M18 21h.01"/>' },
  { id: 's21', slug: 'pediatria', label: 'Pediatría', hue: 155, chroma: 54,
    icon: '<circle cx="12" cy="13" r="8"/><path d="M12 5c4 0 4-4 1-4-2 0-2 2-1 3M9 12h.01M15 12h.01M9 16c2 2 4 2 6 0M4 11c-3 0-3 4 0 4m16-4c3 0 3 4 0 4"/>' },
  { id: 's22', slug: 'obstetricia-ginecologia', label: 'Obstetricia y ginecología', hue: 345, chroma: 38,
    icon: '<path d="M9 7c-3-4-8-3-7 0 1 3 4 3 5 1m8-1c3-4 8-3 7 0-1 3-4 3-5 1M7 8c0 5 5 4 5 10 0-6 5-5 5-10M9 7c1 4 5 4 6 0m-3 11v4"/>' },
  { id: 's23', slug: 'miscelanea', label: 'Miscelánea', hue: 185, chroma: 24,
    icon: '<rect x="3" y="3" width="6" height="6" rx="1"/><circle cx="17" cy="6" r="3"/><circle cx="6" cy="17" r="3"/><path d="M14 14h6v6h-6v-6Z"/>' },
  { id: 's24', slug: 'casos-clinicos', label: 'Casos clínicos', hue: 285, chroma: 34,
    icon: '<path d="M9 3H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M8 11h8M8 17l2 2 5-5"/><rect x="9" y="1" width="6" height="4" rx="1"/>' },
].map(Object.freeze));

export const FALLBACK_SECTION_THEME = Object.freeze({
  id: 'other', slug: 'other', label: 'Otras secciones', hue: 250, chroma: 6,
  icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11"/>',
});

const themesById = new Map(SECTION_THEMES.map(theme => [theme.id, theme]));

export function sectionTheme(sectionId) {
  return themesById.get(typeof sectionId === 'string' ? sectionId : '') ?? FALLBACK_SECTION_THEME;
}
