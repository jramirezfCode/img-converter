📘 README - Conversor Masivo Local de Imágenes
================================================

Este proyecto permite convertir imágenes (JPG, PNG, WEBP, TIFF, AVIF, etc.)
a múltiples formatos con opciones de calidad y compresión.
Funciona en local: no sube nada a internet. 🚀

====================================
1) Instalar Node.js (Windows y macOS)
====================================
1. Ir a https://nodejs.org
2. Descargar la versión LTS (recomendada).
3. Instalar con doble clic (Siguiente → Finalizar).

Verificar (opcional):
   node -v
   npm -v

====================================
2) Copiar la carpeta del proyecto
====================================
Puedes poner la carpeta "img-converter" en tu Escritorio o en cualquier otra ruta.
Ejemplos:

   Windows:   C:\Users\TuUsuario\Desktop\img-converter
   macOS:     /Users/TuUsuario/Desktop/img-converter

(Puedes moverla a otra carpeta de tu preferencia).

====================================
3) Instalar dependencias (solo la primera vez)
====================================
Abrir una terminal (CMD en Windows o Terminal en macOS) y ejecutar:

   cd ruta/de/tu/carpeta/img-converter
   npm install

====================================
4) Ejecutar la app
====================================
En la carpeta del proyecto encontrarás dos archivos de arranque:

   • iniciar.bat      → para Windows
   • iniciar.command  → para macOS

Doble clic sobre el archivo correspondiente.

====================================
5) Abrir en el navegador
====================================
El programa abre automáticamente el navegador en:

   http://localhost:4000

Si no se abre, ábrelo manualmente.

====================================
6) Detener la app
====================================
Cuando quieras cerrar el servidor:
   - En Windows: ve a la ventana negra (CMD) y presiona CTRL + C
   - En macOS: ve a la ventana de Terminal y presiona CTRL + C

====================================
7) Notas útiles
====================================
- Si el puerto 4000 está ocupado, edita iniciar.bat o iniciar.command
  y cámbialo por otro (ej. 5050).
- Solo la primera vez debes correr "npm install".
- Si hay problemas con "sharp":
   - Windows: instalar "Visual Studio Build Tools (C++)".
   - macOS (Apple Silicon): ejecutar "npm rebuild sharp --verbose".

====================================
8) Créditos
====================================
🌐 App web realizada por Juan Ramírez, Yordan Hernández y Maribel Ruíz
📜 CopyRight 2025 - Grupo Whatsapp Diseñadores Web
