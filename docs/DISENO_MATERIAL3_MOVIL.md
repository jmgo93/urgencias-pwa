# Diseño de la PWA: Material Design 3 y uso en móvil

Estado implementado, 26 de octubre de 2026. Este documento concreta el buscador y el lector actuales; las pantallas docentes del [plan general](plan/06_Diseno_Material_3.md) siguen siendo una evolución posterior.

## Referencia y criterio de aplicación

La referencia es [Material Design 3](https://m3.material.io/). Se usan superficies neutras, jerarquía tipográfica, tarjetas tonales y colores definidos por función. Los pares de fondo y contenido se mantienen unidos: `container` para el fondo y `on-container` para texto e iconos, conforme al [sistema de roles de color](https://m3.material.io/styles/color/the-color-system).

Los controles propios de esta PWA siguen esos criterios; no se presentan como una biblioteca de componentes nativos de Android. Los SVG, las fuentes y los estilos se sirven desde la app y funcionan sin conexión.

## Identidad de las secciones

Las 25 secciones tienen un identificador estable, un nombre breve, un icono de contorno y una familia cromática. Se resuelven por `sectionId`, independientemente del título del PDF o del idioma de su texto. Los identificadores desconocidos reciben una identidad neutra; ningún dato de la biblioteca puede introducir clases, estilos o SVG arbitrarios.

La identidad aparece en la cabecera de cada tarjeta, también en **Sólo títulos**, y en el lector. El nombre y el icono acompañan siempre al color. La superficie de lectura sigue siendo neutra y el PDF conserva su presentación original.

`src/section-themes.js` define el catálogo. `scripts/generate-section-tokens.mjs` genera `src/section-tokens.css` con `@material/material-color-utilities`. Los valores se adaptan a claro y oscuro; los componentes consumen variables de función, sin colores literales dispersos. `npm run tokens` regenera tanto la paleta general como las de sección.

## Estrella de mejor coincidencia

- La primera tarjeta lleva **★ Mejor coincidencia**: es el PDF con la mejor evidencia documental de la consulta.
- Dentro de cada PDF, su mejor página y su pasaje exacto llevan **★ Mejor en este PDF**. Se conserva el orden natural de las páginas y los pasajes; la estrella permite localizar el destacado sin reordenarlos.
- El selector del lector señala ese mismo pasaje con **★** y texto explícito. Sólo hay un destacado por documento, con el mismo desempate que utiliza la tarjeta.

La estrella expresa relevancia del texto para la búsqueda. No indica probabilidad diagnóstica ni revisión clínica.

## Prioridad móvil

Una columna, márgenes contenidos y espacio entre controles. La jerarquía es: sección, título del PDF, resumen de coincidencias, páginas y pasajes. Los nombres extensos se ajustan a varias líneas; los destinos y los textos no se cortan por falta de anchura.

Se conserva el cuerpo de lectura de 18 px y se destaca el título de cada resultado. Las zonas táctiles de las acciones principales y de apertura tienen al menos 48 px CSS; es la adaptación web del objetivo táctil recomendado por las [guías oficiales de accesibilidad de Android y Material](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility). El zoom del navegador permanece disponible.

Las páginas se despliegan mediante controles nativos accesibles con teclado. El foco es visible, las estrellas incluyen texto y los iconos decorativos no duplican su lectura. Se respeta la preferencia de movimiento reducido. No se añaden menús vacíos ni una barra inferior para funciones que todavía no existen.

## Comprobación

Las pruebas verifican cobertura de las 25 identidades, recuperación neutra de identificadores ajenos, colores reproducibles, contraste de texto de al menos 4,5:1 en los pares utilizados y correspondencia entre la estrella y el pasaje con mejor puntuación. Se mantienen las pruebas de agrupación, seguridad de HTML y destinos de PDF.

La revisión visual se realiza en anchuras de teléfono, con modo compacto y desplegado, títulos largos y varias secciones. También se comprueba el lector, el selector de coincidencias y la vuelta a la página seleccionada. Estas comprobaciones no sustituyen a una auditoría completa de accesibilidad ni a pruebas físicas en todos los teléfonos.
