# Urgencias PWA

Proyecto personal de consulta documental y aprendizaje en urgencias.

Repositorio privado: https://github.com/jmgo93/urgencias-pwa

## Estado

Repositorio inicial con planificación. La aplicación, el buscador, el cifrado y la PWA todavía no están implementados. GitHub Pages no está publicado y no hay una contraseña configurada.

## Primera implementación

- PWA estática, sin backend ni base de datos.
- Búsqueda local de frases, términos, siglas y variantes revisadas.
- Resultados con evidencia y apertura del PDF pequeño en la página verificada.
- Retorno a sugerencias conservando consulta, filtros y posición.
- Biblioteca personal local, con paquete cifrado y desbloqueo por contraseña.
- Diseño Material 3 y funcionamiento sin IA.

## Plan

- [Índice completo](docs/plan/00_Indice_y_decisiones.md).
- [Implementación estática](docs/plan/14_Plan_PWA_estatica.md).
- [Buscador y relevancia](docs/plan/15_Buscador_local_y_relevancia.md).
- [PDF, navegación y publicación](docs/plan/16_PDF_navegacion_y_publicacion.md).
- [Acceso mediante contraseña](docs/plan/17_Acceso_con_contrasena.md).
- [Decisiones confirmadas](docs/plan/13_Decisiones_confirmadas.md).

Los diseños de backend se conservan como evolución posterior; no son dependencias del primer buscador.

## Contenido personal

Este repositorio no contiene el libro, sus PDF, transcripciones OCR, índices textuales, figuras ni contraseñas. La biblioteca se prepara fuera del repositorio y no se incorpora automáticamente al artefacto de Pages. [Separación de archivos personales](docs/ARCHIVOS_PERSONALES.md).

La contraseña protege contenido cifrado; una pantalla que sólo oculta archivos públicos no cumple el diseño. El resultado de búsqueda mide relevancia documental, no probabilidad diagnóstica.

## Siguiente hito

Validar inventario y contratos estáticos con una muestra propia, antes de implementar búsqueda y lector. No activar despliegue hasta comprobar los permisos de contenido y la protección previstos.
