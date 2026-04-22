README - Conversor Masivo Local de Imagenes
================================================

Este proyecto permite convertir imagenes (JPG, PNG, WEBP, TIFF, AVIF, etc.)
a multiples formatos de salida con control de calidad y compresion.
Todo el procesamiento ocurre en tu equipo: ningun archivo se sube a internet.

Desarrollado con Node.js en el backend y una interfaz web accesible desde
cualquier navegador moderno en tu computadora.

====================================
REQUISITOS PREVIOS
====================================

Antes de usar el programa necesitas tener instalado Node.js en tu equipo.
Node.js es el entorno que permite ejecutar el servidor local.

   - Version recomendada: LTS (Long Term Support), v18 o superior.
   - Descarga oficial: https://nodejs.org

Instrucciones de instalacion:

   Windows:
      1. Entra a https://nodejs.org y descarga el instalador LTS (.msi).
      2. Ejecuta el instalador y sigue los pasos: Siguiente, Aceptar, Instalar.
      3. Al terminar, abre el CMD (busca "cmd" en el menu inicio) y escribe:
            node -v
            npm -v
         Si ves numeros de version, la instalacion fue exitosa.

   macOS:
      1. Entra a https://nodejs.org y descarga el instalador LTS (.pkg).
      2. Abre el archivo descargado y sigue los pasos del asistente.
      3. Al terminar, abre la Terminal (Aplicaciones > Utilidades > Terminal) y escribe:
            node -v
            npm -v
         Si ves numeros de version, la instalacion fue exitosa.

====================================
1) UBICAR LA CARPETA DEL PROYECTO
====================================

Copia la carpeta "img-converter" en cualquier lugar de tu equipo.
Se recomienda el Escritorio o una carpeta de proyectos para encontrarla facilmente.

Ejemplos de rutas validas:

   Windows:   C:\Users\TuUsuario\Desktop\img-converter
   macOS:     /Users/TuUsuario/Desktop/img-converter

Puedes moverla despues sin problema.

====================================
2) INSTALAR DEPENDENCIAS (solo la primera vez)
====================================

Las dependencias son las librerias que el proyecto necesita para funcionar,
como Express (servidor web), Sharp (procesamiento de imagenes) y Archiver (crear ZIP).
Solo necesitas instalarlas una vez. Node.js las descarga automaticamente.

Pasos:

   Windows:
      1. Abre el CMD (Menu Inicio > busca "cmd" o "Simbolo del sistema").
      2. Navega a la carpeta del proyecto con este comando (ajusta la ruta):
            cd C:\Users\TuUsuario\Desktop\img-converter
      3. Ejecuta:
            npm install
      4. Espera a que termine. Veras algo como "added X packages".

   macOS:
      1. Abre la Terminal (Aplicaciones > Utilidades > Terminal).
      2. Navega a la carpeta del proyecto:
            cd /Users/TuUsuario/Desktop/img-converter
      3. Ejecuta:
            npm install
      4. Espera a que termine. Veras algo como "added X packages".

IMPORTANTE: Si ves errores relacionados con "sharp" al hacer npm install:
   - Windows: necesitas instalar "Visual Studio Build Tools" con soporte C++.
              Descarga en: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - macOS (Apple Silicon, chip M1/M2/M3): ejecuta adicionalmente:
              npm rebuild sharp --verbose

====================================
3) INICIAR EL SERVIDOR
====================================

Una vez instaladas las dependencias, ya puedes lanzar la aplicacion.
En la carpeta del proyecto hay dos archivos de arranque segun tu sistema:

   iniciar.bat      -> para Windows   (doble clic)
   iniciar.command  -> para macOS     (doble clic)

Al ejecutarlos se abrira una ventana de terminal y el servidor arrancara.
Si el navegador no se abre automaticamente, abrete manualmente en:

   http://localhost:4000

La aplicacion estara disponible mientras esa ventana de terminal este abierta.

Alternativa manual (si el doble clic no funciona):
   Abre el CMD o Terminal, navega a la carpeta y ejecuta:
      node server.js

====================================
4) USAR LA APLICACION
====================================

Desde el navegador en http://localhost:4000 podras:

   - Arrastrar imagenes o seleccionarlas con el boton.
   - Elegir uno o varios formatos de salida: WEBP, AVIF, JPEG, PNG, TIFF.
   - Ajustar la calidad (1-100), el esfuerzo de compresion (0-9) y
     otros parametros avanzados.
   - Activar la opcion "Eliminar metadatos" para quitar datos EXIF, GPS
     e informacion del dispositivo o software de origen.
   - Presionar "Convertir y descargar ZIP" para procesar y descargar
     todas las imagenes convertidas en un archivo .zip con fecha y hora.

====================================
5) DETENER EL SERVIDOR
====================================

Cuando termines de usar la aplicacion, cierra el servidor para liberar recursos:

   Windows: en la ventana negra del CMD presiona CTRL + C
   macOS:   en la ventana de Terminal presiona CTRL + C

====================================
6) NOTAS Y SOLUCION DE PROBLEMAS
====================================

- "El puerto 4000 esta ocupado":
     Abre el archivo iniciar.bat (Windows) o iniciar.command (macOS)
     con un editor de texto y cambia el numero 4000 por otro, por ejemplo 5050.
     Luego accede en el navegador a http://localhost:5050.

- "npm install falla con errores de sharp en Windows":
     Instala Visual Studio Build Tools con el componente "Desarrollo de escritorio
     con C++". Descarga en: https://visualstudio.microsoft.com/visual-cpp-build-tools/
     Despues vuelve a ejecutar npm install.

- "npm install falla en macOS con chip Apple Silicon (M1/M2/M3)":
     Ejecuta en la Terminal:
        npm rebuild sharp --verbose

- "La pagina no carga en el navegador":
     Verifica que la ventana del servidor sigue abierta y sin errores.
     Asegurate de escribir exactamente http://localhost:4000 en el navegador.

- "Solo la primera vez necesito npm install":
     Correcto. En los siguientes usos solo necesitas ejecutar iniciar.bat
     o iniciar.command directamente.

====================================
CREDITOS
====================================

Aplicacion desarrollada por Conexion Digital MM
Lima, Peru - 2026
https://img-converter-7vuz.onrender.com
