// 1) DEPENDENCIAS
const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const sharp    = require('sharp');
const fs       = require('fs');
const fsp      = require('fs/promises');
const path     = require('path');
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

// 3) HELPER: corrige encoding Latin-1→UTF-8 (tildes, ñ)
function fixName(name) {
  try { return Buffer.from(name, 'latin1').toString('utf8'); }
  catch { return name; }
}

// 4) MULTER
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = fixName(file.originalname).replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

// 5) HELPER: nombre de salida
function outputName(original, newExt) {
  const base = path.basename(fixName(original)).replace(/\.([^.]+)$/i, '');
  return `${base}.${newExt}`;
}

// 6) OPCIONES POR FORMATO
function getFormatOptions(fmt, opts) {
  const { quality, effort, lossless, mozjpeg, pngCompressionLevel } = opts;
  switch (fmt) {
    case 'webp': return { quality: clampInt(quality,1,100,80), effort: clampInt(effort,0,6,4), lossless: !!lossless };
    case 'avif': return { quality: clampInt(quality,1,100,50), effort: clampInt(effort,0,9,4) };
    case 'jpeg': return { quality: clampInt(quality,1,100,85), mozjpeg: !!mozjpeg };
    case 'png':  return { compressionLevel: clampInt(pngCompressionLevel,0,9,6) };
    case 'tiff': return { quality: clampInt(quality,1,100,80) };
    default:     return {};
  }
}
function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

// 7) RUTA DE DIAGNÓSTICO — útil para verificar que sharp funciona
app.get('/health', (req, res) => {
  try {
    const v = sharp.versions;
    res.json({ status: 'ok', sharp: v });
  } catch(e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// 8) RUTA PRINCIPAL: /convert
app.post('/convert', upload.array('images', 500), async (req, res) => {
  // Limpia archivos temporales en caso de error
  const cleanup = (files) => {
    (files || []).forEach(f => fsp.unlink(f.path).catch(() => {}));
  };

  let {
    formats             = 'webp',
    quality             = 80,
    effort              = 4,
    lossless            = 'false',
    mozjpeg             = 'false',
    pngCompressionLevel = 6,
    stripMeta           = 'false'
  } = req.body;

  if (typeof formats === 'string') {
    formats = formats.split(',').map(s => s.trim()).filter(Boolean);
  }

  const options = {
    quality, effort,
    lossless:  lossless  === 'true',
    mozjpeg:   mozjpeg   === 'true',
    pngCompressionLevel,
    stripMeta: stripMeta === 'true'
  };

  const files = req.files || [];
  if (!files.length)   { return res.status(400).json({ error: 'No se recibieron imágenes.' }); }
  if (!formats.length) { cleanup(files); return res.status(400).json({ error: 'Selecciona al menos un formato de salida.' }); }

  // Verificar que sharp funciona antes de empezar
  try {
    await sharp({ create: { width: 1, height: 1, channels: 3, background: {r:0,g:0,b:0} } }).webp().toBuffer();
  } catch (sharpErr) {
    cleanup(files);
    console.error('Sharp no funciona:', sharpErr.message);
    return res.status(500).json({
      error: 'El módulo de conversión (sharp) no está instalado correctamente. Ejecuta "npm install" en la carpeta del proyecto y vuelve a intentarlo.'
    });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="convertidos.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    console.error('Archiver error:', err);
    res.status(500).end();
  });
  archive.pipe(res);

  try {
    for (const f of files) {
      const inputBuffer = await fsp.readFile(f.path);

      for (const fmt of formats) {
        const fmtLower = fmt.toLowerCase();
        const outName  = outputName(f.originalname, fmtLower);

        try {
          let img = sharp(inputBuffer, { failOn: 'none' });

          // Metadatos: por defecto sharp 0.33 los elimina.
          // Llamar withMetadata() los conserva. Solo llamamos si el usuario NO quiere eliminarlos.
          if (!options.stripMeta) img = img.withMetadata();

          const fmtOpts = getFormatOptions(fmtLower, options);

          switch (fmtLower) {
            case 'webp': img = img.webp(fmtOpts); break;
            case 'avif': img = img.avif(fmtOpts); break;
            case 'jpeg':
            case 'jpg':  img = img.jpeg(fmtOpts); break;
            case 'png':  img = img.png(fmtOpts);  break;
            case 'tiff':
            case 'tif':  img = img.tiff(fmtOpts); break;
            default: continue;
          }

          const buffer = await img.toBuffer();
          archive.append(buffer, { name: outName });
        } catch (imgErr) {
          // Si una imagen falla, la saltamos y continuamos con las demás
          console.error(`Error convirtiendo ${f.originalname} a ${fmtLower}:`, imgErr.message);
          archive.append(
            `Error al convertir este archivo: ${imgErr.message}`,
            { name: outName + '.error.txt' }
          );
        }
      }

      fsp.unlink(f.path).catch(() => {});
    }

    await archive.finalize();
  } catch (err) {
    console.error('Error general:', err);
    try { archive.abort(); } catch {}
    if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 9) LEVANTA SERVIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor listo en http://localhost:${PORT}`);
  console.log(`   Diagnóstico: http://localhost:${PORT}/health`);
});
