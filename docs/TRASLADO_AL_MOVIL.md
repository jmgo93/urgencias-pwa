# Llevar tu biblioteca al móvil

La aplicación publicada contiene el buscador y el lector. Tu libro se incorpora desde un archivo personal cifrado; ese archivo no se publica en GitHub.

1. **Copia el paquete a tu móvil.** En el ordenador está en `biblioteca-local/Para el movil/Biblioteca.urgencias`. Transfiérelo por el medio que elijas y guárdalo en Archivos o Descargas del móvil. Ocupa aproximadamente 576 MB; la importación necesita espacio adicional en el navegador.

2. **Abre la aplicación e importa el archivo.** Entra en [Urgencias](https://jmgo93.github.io/urgencias-pwa/) desde el móvil. Usa la opción para importar la biblioteca y selecciona `Biblioteca.urgencias`. Mantén abierta la aplicación mientras termina la importación. Puedes instalarla desde las opciones del navegador cuando esté disponible la instalación.

3. **Abre la biblioteca con tu contraseña.** Consulta la contraseña en el archivo privado `biblioteca-local/ACCESO_LOCAL.txt` del ordenador e introdúcela en la aplicación. El paquete no contiene la contraseña. Cuando la importación termine, podrás buscar y abrir los documentos que has trasladado. Si el navegador elimina sus datos, necesitarás importar el paquete otra vez.

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
