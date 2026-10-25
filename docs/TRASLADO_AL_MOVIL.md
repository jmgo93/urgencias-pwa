# Llevar tu biblioteca al móvil

La aplicación publicada contiene el buscador y el lector. Tu libro se incorpora desde un archivo personal cifrado; ese archivo no se publica en GitHub.

1. **Copia el paquete a tu móvil.** En el ordenador está en `biblioteca-local/Para el movil/Biblioteca.urgencias`. Transfiérelo por el medio que elijas y guárdalo en Archivos o Descargas del móvil. Ocupa aproximadamente 576 MB; la importación necesita espacio adicional para la copia cifrada que guarda la app.

2. **Instala primero Urgencias.** Entra en [la aplicación](https://jmgo93.github.io/urgencias-pwa/) con conexión y pulsa **Instalar app**. Si tu navegador ofrece la instalación, confírmala. Si aparece la guía, sigue los pasos de tu dispositivo:

   - **iPhone o iPad:** abre la página en Safari, pulsa **Compartir → Añadir a pantalla de inicio** y activa **Abrir como app** si aparece esa opción. Confirma con **Añadir**. [Instrucciones de Apple](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios).
   - **Android:** en Chrome, abre el menú **⋮** y busca **Instalar app**, **Instalar y crear acceso directo** o **Añadir a pantalla de inicio**, según la versión. Confirma la instalación. [Instrucciones de Chrome](https://support.google.com/chrome/answer/9658361?hl=es&co=GENIE.Platform%3DAndroid).

3. **Abre Urgencias desde su icono e importa el archivo allí.** Dentro de la app instalada, pulsa **Importar biblioteca del dispositivo** y selecciona `Biblioteca.urgencias`. Mantén la app abierta mientras termina. Haz la importación desde la app instalada para que la biblioteca se guarde en ella; si ya la importaste desde una pestaña del navegador, comprueba el estado dentro de la app y vuelve a importarla allí si es necesario.

4. **Prepara el uso sin conexión.** Pulsa **Preparar uso sin conexión**. Espera al estado **Lista para usar sin conexión** antes de cerrar la app o desconectar Internet. Este paso prepara los recursos de la aplicación y comprueba la biblioteca cifrada guardada en el dispositivo. No descarga el libro desde GitHub.

5. **Desbloquea tu biblioteca.** Consulta la contraseña en el archivo privado `biblioteca-local/ACCESO_LOCAL.txt` del ordenador e introdúcela en la app. El paquete no contiene la contraseña y la app no la guarda. Al cerrar, recargar o bloquear tendrás que introducirla otra vez; funciona también sin conexión.

6. **Compruébalo en tu móvil.** Una vez que indique que está lista, activa el modo avión, cierra y vuelve a abrir Urgencias desde su icono. Desbloquea la biblioteca, realiza una búsqueda y abre un PDF que todavía no hayas consultado. Así comprobarás la preparación en tu dispositivo.

Conserva el paquete personal como copia. El navegador o el sistema pueden liberar almacenamiento; borrar los datos de la app también elimina su biblioteca local. Si faltan archivos, recupera la conexión para preparar la app e importa de nuevo tu paquete. **Eliminar biblioteca del dispositivo** permite borrar voluntariamente la copia guardada en la app.

## Regenerar o comprobar el paquete en el ordenador

Desde la carpeta `repositorio-app`, después de preparar la biblioteca cifrada:

```text
node scripts/pack-library.mjs
```

Para verificar un paquete existente sin modificarlo:

```text
node scripts/pack-library.mjs --verify
```

El empaquetador solo lee el manifiesto técnico y los archivos cifrados. Escribe por bloques y verifica el tamaño y el SHA-256 de todos los activos, sin cargar la biblioteca completa en memoria. No lee ni incluye la contraseña. El formato es: siete bytes ASCII `URG001\n`, cuatro bytes con longitud del manifiesto en entero sin signo de 32 bits y orden little-endian, los bytes UTF-8 originales de `bootstrap.json` y los activos cifrados en el orden de `Object.values(bootstrap.assets)`.
