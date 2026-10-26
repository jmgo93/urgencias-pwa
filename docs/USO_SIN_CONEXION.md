# Llevar Urgencias en el móvil y consultarla sin conexión

La aplicación puede abrir el buscador y los PDF sin Internet después de preparar este dispositivo. Se guardan dos cosas: la aplicación y la biblioteca cifrada. Instalar el icono por sí solo no incorpora el libro.

## Preparación inicial, con conexión

1. Abre [Urgencias](https://jmgo93.github.io/urgencias-pwa/) en el navegador que vas a utilizar habitualmente.
2. Instala la aplicación. En Android, utiliza **Instalar app** cuando aparezca o la opción de instalación del menú del navegador. En iPhone o iPad, utiliza **Compartir → Añadir a pantalla de inicio** en Safari. Los nombres pueden variar según el navegador. [Guía de instalación de MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing).
3. Abre Urgencias desde el icono instalado y pulsa **Importar biblioteca del dispositivo**. Selecciona tu archivo privado `Biblioteca.urgencias`, de aproximadamente **576 MB**. No se envía a GitHub ni a ningún servidor.
4. Espera a que termine la importación y utiliza **Preparar uso sin conexión** para comprobar que estén guardados el buscador, el lector y todos los documentos. Espera al estado **Lista para usar sin conexión**. Esta comprobación no necesita la contraseña: trabaja con los archivos cifrados.
5. Introduce la contraseña de la biblioteca una vez y deja marcada **Recordar este dispositivo** si se trata de tu móvil personal. La app conserva una clave de acceso local, sin guardar la contraseña, para abrir directamente las siguientes veces.
6. Haz la prueba descrita a continuación antes de depender de la consulta sin cobertura.

La importación conserva una copia cifrada dentro del almacenamiento de la aplicación. El archivo original sigue siendo útil como copia de recuperación. Se necesita espacio para ambos mientras estén en el teléfono, además de los recursos de la aplicación. No importes el paquete en navegación privada: sus datos suelen desaparecer al cerrar esa sesión. [Almacenamiento de navegadores, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Prueba de funcionamiento sin Internet

1. Espera la confirmación de que la preparación ha terminado.
2. Cierra la aplicación, activa el modo avión y vuelve a abrirla desde su icono.
3. La biblioteca se abrirá directamente si has recordado este dispositivo. Si no lo has hecho, introduce su contraseña, que también funciona sin conexión. El paquete no incluye la contraseña; consérvala por separado.
4. Busca una frase y abre un capítulo que no hayas consultado antes. Cambia de página, vuelve a los resultados y abre otra sugerencia.

El buscador utiliza el índice local. El lector abre únicamente el PDF pequeño elegido, también desde este dispositivo. La copia guardada permanece cifrada; recordar el dispositivo permite abrirla mediante su clave local. Utiliza esta opción sólo en un dispositivo personal, porque quien pueda usar esa app podrá consultar la biblioteca.

## Buscar al abrir y recuperar consultas

El índice se prepara la primera vez y queda guardado cifrado en este dispositivo. En las aperturas posteriores se reutiliza, sin reconstruirlo cada vez. Puedes empezar a escribir mientras aparece **Preparando la primera búsqueda…**; la app conserva esa consulta para ejecutarla cuando esté lista. Si cambias la biblioteca o se borran sus datos, puede necesitar prepararlo de nuevo.

**Últimas búsquedas** muestra hasta 20 consultas recientes con sus filtros. Toca una para repetirla, también sin Internet. El historial se guarda cifrado sólo en este dispositivo. **Borrar historial** elimina las consultas y mantiene el índice y los documentos; no se envía el historial a GitHub.

## Recordar u olvidar el acceso

**Recordar este dispositivo** está marcado inicialmente y evita repetir la contraseña al cerrar, recargar y volver a abrir, también sin Internet. La app conserva una clave de acceso local; no guarda el texto de la contraseña. No aplica bloqueo por inactividad mientras el dispositivo esté recordado.

**Olvidar este dispositivo** borra esa clave y cierra la sesión sin eliminar la biblioteca cifrada. En la siguiente apertura se pedirá de nuevo la contraseña. Si desmarcas **Recordar este dispositivo** al desbloquear, la clave dura sólo esa sesión y vuelve el bloqueo tras 15 minutos sin actividad; puedes usar **Bloquear** para cerrarla antes.

## Conservación y recuperación

La aplicación solicita conservar el almacenamiento, pero el navegador decide si concede esa protección. El espacio disponible varía entre dispositivos. El sistema puede retirar datos cuando falta espacio o tras periodos sin uso; borrar los datos del sitio también elimina la biblioteca. En Safari, la instalación en la pantalla de inicio influye en la concesión de almacenamiento persistente. [Política de almacenamiento de WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

- Utiliza la aplicación instalada y evita cambiar de navegador durante la preparación. Las instalaciones realizadas en navegadores distintos no comparten necesariamente sus datos. [Instalación de aplicaciones web, MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing).
- Conserva el paquete privado y la contraseña por separado. Si faltan datos, vuelve a importar el paquete y repite la comprobación.
- Si no hay espacio, libera almacenamiento y vuelve a importar. La aplicación no declara lista una descarga incompleta.
- **Eliminar biblioteca del dispositivo** borra la copia cifrada de esta aplicación. Conserva el archivo original si quieres poder recuperarla.

Abre la aplicación con conexión periódicamente para recibir sus actualizaciones. La biblioteca personal no se publica ni se vuelve a descargar desde GitHub Pages: se importa desde tu propio archivo.
