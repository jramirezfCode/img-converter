@echo off
REM ==== Conversor Masivo Local - Windows ====
REM Ejecuta en el puerto 4000 y abre el navegador

REM Ir a la carpeta del script
cd /d "%~dp0"

REM Fijar puerto
set PORT=4000

REM Abrir el navegador por defecto en paralelo
start "" "http://localhost:4000"

REM Iniciar el servidor
npm start
