#!/bin/bash
# ==== Conversor Masivo Local - macOS ====
# Ejecuta en el puerto 4000 y abre el navegador

# Ir a la carpeta del script
cd "$(dirname "$0")"

# Fijar puerto
export PORT=4000

# Abrir navegador por defecto en paralelo
open "http://localhost:4000"

# Iniciar el servidor
npm start
