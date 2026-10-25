# Publicación de la aplicación

URL prevista: https://jmgo93.github.io/urgencias-pwa/

El repositorio contiene exclusivamente aplicación, scripts, pruebas y documentación. La biblioteca, el paquete `.urgencias` y la contraseña permanecen fuera. El usuario importa su paquete desde el dispositivo; el navegador guarda archivos cifrados en Cache Storage sin subirlos a un servidor.

El propietario ha hecho público el repositorio y ha activado Pages. El origen debe ser GitHub Actions para compilar la aplicación antes de publicarla; servir directamente el código fuente de `main` no resuelve los módulos de npm. Publicar la aplicación no equivale a publicar el libro.

## Preparación y activación

1. Integrar la rama de implementación tras las pruebas.
2. Comprobar que Pages está habilitado por el propietario.
3. En Settings → Pages, elegir GitHub Actions como origen.
4. En Actions, ejecutar manualmente «Publicar en GitHub Pages» desde `main`.
5. Confirmar que el despliegue terminó y comprobar la URL real por HTTPS, incluido el lector y el uso sin conexión tras importar la biblioteca.

El flujo ejecuta pruebas, compilación y la guardia que rechaza contenido personal antes de generar el artefacto. No copia `biblioteca-local` ni necesita secretos de biblioteca en Actions. Las futuras publicaciones son manuales.

## Protección y límites

Los archivos de biblioteca usan AES-256-GCM y PBKDF2. El acceso al contenido exige el paquete local y su contraseña. La interfaz y el código genérico de la aplicación son públicos al publicar Pages. La contraseña no impide copiar ese código ni sustituye un sistema de cuentas.

Consulta [Traslado al móvil](TRASLADO_AL_MOVIL.md) para copiar la biblioteca, importarla y desbloquearla. No subir el paquete al repositorio, a Releases ni a los artefactos del despliegue.

## Dependencias

Vite 5.4.21 se mantiene conforme a la versión solicitada y se usa sólo para compilar. `npm audit` detectó dos avisos de desarrollo relacionados con Vite y esbuild; no se ejecuta su servidor de desarrollo. El servidor de prueba es propio y se limita a loopback. Los cambios de versión mayor se revisarán por separado. El lector PDF y las fuentes se sirven localmente desde el artefacto, sin CDN.
