// 1) DEPENDENCIAS
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const archiver = require('archiver');

// 2) APP Y CARPETAS
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR  = path.join(__dirname, 'output');

for (const d of [UPLOADS_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d);
}

// 3) MULTER (archivos a disco para no reventar la RAM con cargas grandes)
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // evita colisiones: timestamp + nombre original
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

// 4) HELPER: nombre de salida con nueva extensión
function outputName(original, newExt) {
  const base = path.basename(original).replace(/\.([^.]+)$/i, '');
  return `${base}.${newExt}`;
}

// 5) MAPA DE OPCIONES POR FORMATO para sharp
function getFormatOptions(fmt, opts) {
  const { quality, effort, lossless, mozjpeg, pngCompressionLevel } = opts;

  switch (fmt) {
    case 'webp':
      return {
        quality: clampInt(quality, 1, 100, 80),
        effort:  clampInt(effort, 0, 6, 4),  // 0 rápido ←→ 6 máximo
        lossless: !!lossless
      };
    case 'avif':
      return {
        quality: clampInt(quality, 1, 100, 50),
        effort:  clampInt(effort, 0, 9, 4)   // 0 rápido ←→ 9 máximo
      };
    case 'jpeg':
      return {
        quality: clampInt(quality, 1, 100, 85),
        mozjpeg: !!mozjpeg
      };
    case 'png':
      return {
        compressionLevel: clampInt(pngCompressionLevel, 0, 9, 6)
      };
    case 'tiff':
      return {
        quality: clampInt(quality, 1, 100, 80)
      };
    default:
      return {};
  }
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return def;
}

// 6) RUTA PRINCIPAL: /convert
app.post('/convert', upload.array('images', 500), async (req, res) => {
  // Campos del formulario
  let {
    formats = 'webp',
    quality = 80,
    effort = 4,
    lossless = 'false',
    mozjpeg = 'false',
    pngCompressionLevel = 6
  } = req.body;

  // Normaliza ‘formats’ a array
  if (typeof formats === 'string') {
    formats = formats.split(',').map(s => s.trim()).filter(Boolean);
  }

  const options = {
    quality,
    effort,
    lossless: lossless === 'true',
    mozjpeg: mozjpeg === 'true',
    pngCompressionLevel
  };

  // Valida archivos
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No se recibieron imágenes.' });
  }
  if (!formats.length) {
    return res.status(400).json({ error: 'Selecciona al menos un formato de salida.' });
  }

  // Prepara zip en streaming
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="convertidos.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { throw err; });
  archive.pipe(res);

  try {
    // Procesa cada archivo contra todos los formatos
    for (const f of files) {
      const inputPath = f.path;
      const inputBuffer = await fsp.readFile(inputPath);

      for (const fmt of formats) {
        const fmtLower = fmt.toLowerCase();
        const outName = outputName(f.originalname, fmtLower);

        // Construye pipeline sharp
        let img = sharp(inputBuffer, { failOn: 'none' }); // 'none' ignora metadatos corruptos leves
        const fmtOpts = getFormatOptions(fmtLower, options);

        // Convertir según formato
        switch (fmtLower) {
          case 'webp': img = img.webp(fmtOpts); break;
          case 'avif': img = img.avif(fmtOpts); break;
          case 'jpeg':
          case 'jpg':  img = img.jpeg(fmtOpts); break;
          case 'png':  img = img.png(fmtOpts); break;
          case 'tiff':
          case 'tif':  img = img.tiff(fmtOpts); break;
          default:
            continue; // formato no soportado → lo saltamos
        }

        const buffer = await img.toBuffer();
        archive.append(buffer, { name: outName });
      }

      // limpieza del archivo temporal subido
      fsp.unlink(inputPath).catch(() => {});
    }

    await archive.finalize();
    // Nota: no cerramos res aquí; se cierra cuando archiver termina y drena el stream
  } catch (err) {
    console.error(err);
    // Intento de cerrar correctamente
    try { await archive.abort(); } catch {}
    res.status(500).end();
  }
});

// 7) LEVANTA SERVIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor listo en http://localhost:${PORT}`);
});
