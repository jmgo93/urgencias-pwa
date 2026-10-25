# Plan de la aplicación de urgencias

Fecha de referencia: 25 de octubre de 2026. Versión 2.0 del alcance: primera implementación como PWA estática en GitHub, sin base de datos y con buscador documental prioritario. Véanse [14. Plan de implementación](14_Plan_PWA_estatica.md), [15. Buscador](15_Buscador_local_y_relevancia.md) y [16. PDF y publicación](16_PDF_navegacion_y_publicacion.md). Los documentos Laravel/MariaDB quedan como evolución posterior. No se ha iniciado programación ni publicación de contenidos.

## Resultado propuesto

Primero, una PWA estática que busque frases en la biblioteca personal, cruce términos mediante un índice local y abra PDF pequeños en la página y, cuando esté verificada, subsección exacta. Volver a resultados conservará consulta, filtros, sugerencias y posición. GitHub alojará la aplicación; el corpus privado se preparará y seleccionará localmente, sin publicarlo por defecto.

Después se podrá incorporar el producto docente y clínico estructurado definido en los documentos anteriores: fichas actuales, tests, casos, algoritmos y, sólo cuando sea útil, backend. Se mantienen la orientación multiprofesional, ausencia de IA y pacientes reales, acceso personal al libro y guías actuales como base de las futuras fichas clínicas. El buscador de esta primera fase es documental: encontrar una frase en el libro de 2018 no la convierte en recomendación actual ni en probabilidad diagnóstica.

## Documentos y orden de lectura

| Documento | Contenido | Decisiones que permite tomar |
| --- | --- | --- |
| [14. PWA estática: implementación actual](14_Plan_PWA_estatica.md) | Sin backend ni BD; corpus personal; hitos E0–E6 | Qué construir primero |
| [15. Buscador local](15_Buscador_local_y_relevancia.md) | Frases, conceptos, índices, relevancia y sugerencias | Cómo cruzar el texto con rapidez |
| [16. PDF pequeños y publicación](16_PDF_navegacion_y_publicacion.md) | Capítulos, subsecciones, visor, retorno y GitHub | Cómo abrir exactamente el destino y conservar privacidad |
| [17. Acceso con contraseña](17_Acceso_con_contrasena.md) | Cifrado, desbloqueo estático, sesión y caché | Cómo proteger contenido sin confundir una pantalla con autorización |
| [01. Producto y perfiles](01_Producto_perfiles_y_alcance.md) | Objetivos, módulos, permisos, prioridades y criterios de éxito | Para quién se construye y qué entra primero |
| [02. Modelo de datos](02_Modelo_de_datos.md) | Entidades, relaciones, revisiones, claves, restricciones e índices | Cómo se guarda el conocimiento y la actividad |
| [03. Búsqueda y conocimiento clínico](03_Busqueda_y_conocimiento_clinico.md) | Síntomas, enfermedades, pruebas, interpretación y recuperación | Cómo encontrar y conectar información útil |
| [04. Preparación y gobierno del contenido](04_Ingesta_y_gobierno_del_contenido.md) | Importación, OCR, fuentes, revisión, actualizaciones y retirada | Cuándo una extracción puede convertirse en contenido publicable |
| [05. Aprendizaje y algoritmos](05_Aprendizaje_tests_casos_y_algoritmos.md) | Tests, casos ramificados, repaso, evaluación y motor de reglas | Cómo se utiliza el conocimiento para aprender |
| [06. Diseño Material 3](06_Diseno_Material_3.md) | Sistema visual, componentes, accesibilidad, temas e idiomas | Cómo debe verse y comportarse la interfaz |
| [07. Pantallas y flujos](07_Pantallas_y_flujos.md) | Catálogo de pantallas y recorridos por perfil | Qué puede hacer cada usuario y desde dónde |
| [08. Arquitectura y stack](08_Arquitectura_y_stack.md) | Módulos Laravel, contratos y compatibilidad de dependencias | Cómo se implementa respetando la base facilitada |
| [09. PWA, seguridad y operación](09_PWA_seguridad_y_operacion.md) | Sin conexión, sincronización, autenticación y despliegue | Qué funciona en cada dispositivo y cómo se protege |
| [10. Ejecución y calidad](10_Plan_de_implementacion_y_calidad.md) | Fases, entregables, pruebas y condiciones de aceptación | En qué orden construir y cómo demostrar que funciona |
| [11. Cuestionario respondido](11_Cuestionario_de_decisiones.md) | Preguntas originales conservadas como historial | Consultar el origen de las decisiones |
| [12. Contratos y criterios transversales](12_Contratos_y_criterios_transversales.md) | Convenciones, identificadores, versiones y aceptación entre módulos | Evitar interpretaciones incompatibles al programar |
| [13. Decisiones confirmadas](13_Decisiones_confirmadas.md) | Respuestas, alcance 1.1 y puntos aún pendientes | Fuente de verdad de las decisiones del usuario |

## Material disponible

Inventario comprobado en los archivos locales: 1.101 páginas, 23 secciones temáticas, preliminares, 198 capítulos y 45 casos clínicos. Existen 25 PDF divididos, 25 transcripciones Markdown y un manifiesto de correspondencia. El OCR se aplicó a 32 páginas para las transcripciones; no se añadió una nueva capa OCR a los PDF.

- [Índice del material (archivo personal no incluido)](../ARCHIVOS_PERSONALES.md).
- [Manifiesto de origen (archivo personal no incluido)](../ARCHIVOS_PERSONALES.md).
- [Clasificación inicial de páginas (archivo personal no incluido)](../ARCHIVOS_PERSONALES.md).

Estos archivos son una base documental; todavía no constituyen una base de datos clínica revisada. Las propuestas de cantidades para el piloto son objetivos futuros, no contenidos ya creados.

## Convenciones de esta propuesta

**Requisito confirmado:** procede de lo solicitado: PWA, Material 3, varios perfiles, libro como fuente, tests, casos, algoritmos y stack indicado.

**Decisión confirmada:** elección registrada en el documento 13. **Decisión propuesta:** detalle técnico o visual todavía no elegido, como la identidad entre las tres alternativas Material 3. No confundir ambas categorías.

**Pendiente de comprobar:** compatibilidad de versiones exactas bajo el stack estricto, infraestructura, usos permitidos de las fuentes, organización de la revisión clínica y escala. La dedicación disponible ya está definida: proyecto personal con pocas horas semanales y sin fecha cerrada.

Las tablas de campos son un contrato de diseño para migraciones futuras. Los ejemplos de registros, JSON y flujos son sintéticos; no son protocolos asistenciales ni una base de conocimiento ya validada.

## Decisiones centrales del producto completo, aplazadas donde requieran backend

1. Primera fase estática en GitHub Pages, con HTML/CSS/JavaScript y sin servidor propio. Laravel queda para evolución posterior.
2. Catálogo e índice en archivos versionados y worker local; sin MariaDB, SQLite ni IndexedDB en la primera fase. La base relacional anterior es un diseño futuro.
3. Identidad estable del contenido y revisiones publicadas inmutables. Cada cita, intento y recorrido conserva su versión.
4. Material 3 continúa como sistema visual; componentes web estáticos en esta fase. Blade/Livewire/Filament sólo al incorporar backend. Las alternativas de identidad siguen pendientes.
5. Buscador personal sin cuentas ni altas. Los seis perfiles y el registro aprobado se reservan para una fase con identidad y autorización reales.
6. Piloto de soporte vital, síntomas cardiorrespiratorios y pruebas básicas, diferenciando adultos/pediatría y español/inglés, por sublotes revisados.
7. Guías actuales como base principal y contenido propio estructurado en la base de datos; PDF y Markdown del libro como fuentes secundarias restringidas. Convertir el formato no elimina los derechos.
8. Primero búsqueda y lectura; PWA con caché de app y biblioteca local opcional. Tests formativos y demás módulos se incorporan después del recorrido de búsqueda.
9. El cambio explícito a estático sustituye el requisito de ejecutar PHP/Laravel/MariaDB ahora. Las dependencias frontend se fijarán y probarán sin actualizar versiones solicitadas silenciosamente.
10. Sin IA en las primeras versiones. Casos ficticios y adaptaciones permitidas, sin datos personales de pacientes.

## Siguiente trabajo propuesto

El cuestionario permanece respondido; el cambio posterior queda registrado en el documento 13 y concretado en 14–16. El primer recorrido a implementar es buscar → sugerencia explicada → PDF del capítulo en su ubicación → volver a otras sugerencias. La preparación revisará mapas y subsecciones e indexará el texto existente sin procesar PDF en cada consulta. No se ha creado repositorio, desplegado la app ni subido el libro a terceros con este plan.
