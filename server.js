// 1) DEPENDENCIAS
const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const sharp    = require('sharp');
const fs       = require('fs');
const fsp      = require('fs/promises');
const path     = require('path');
const archiver = require('archiver');
const crypto   = require('crypto');

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

// Limpieza de ZIPs huérfanos al iniciar
try {
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (f.endsWith('.zip')) fs.unlinkSync(path.join(OUTPUT_DIR, f));
  }
} catch {}

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

// 5) HELPERS: nombres de salida
function baseWithoutExt(original) {
  return path.basename(fixName(original)).replace(/\.([^.]+)$/i, '');
}

function padNum(n, width) {
  return String(n).padStart(width, '0');
}

function sanitizePrefix(prefix) {
  return String(prefix)
    .trim()
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildOutputName({ prefix, baseOriginal, seq, padWidth, ext }) {
  if (prefix) {
    return `${prefix}-${padNum(seq, padWidth)}.${ext}`;
  }
  return `${baseOriginal}.${ext}`;
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

// 8) RUTA PRINCIPAL: /convert — convierte, guarda ZIP en disco, devuelve JSON
app.post('/convert', upload.array('images', 500), async (req, res) => {
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
    stripMeta           = 'false',
    maxWidth            = 0,
    renamePrefix        = '',
    renameStart         = 1
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

  // Redimensionado: 0 o inválido = no redimensionar
  let resizeWidth = parseInt(maxWidth, 10);
  if (!Number.isFinite(resizeWidth) || resizeWidth < 1) resizeWidth = 0;
  if (resizeWidth > 20000) resizeWidth = 20000;

  // Renombrado
  const cleanPrefix = sanitizePrefix(renamePrefix);
  let seqStart = parseInt(renameStart, 10);
  if (!Number.isFinite(seqStart) || seqStart < 0) seqStart = 1;

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

  // Ancho de padding para la numeración: basado en el número máximo alcanzable
  const maxSeqNum = seqStart + files.length - 1;
  const padWidth  = Math.max(2, String(maxSeqNum).length);

  // Preparar ZIP en disco
  const downloadId = crypto.randomUUID();
  const zipPath    = path.join(OUTPUT_DIR, `${downloadId}.zip`);
  const output     = fs.createWriteStream(zipPath);
  const archive    = archiver('zip', { zlib: { level: 9 } });

  const archiveDone = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  const stats = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const f             = files[i];
      const inputBuffer   = await fsp.readFile(f.path);
      const originalSize  = f.size;
      const originalName  = fixName(f.originalname);
      const baseOriginal  = baseWithoutExt(f.originalname);
      const seq           = seqStart + i;

      for (const fmt of formats) {
        const fmtLower = fmt.toLowerCase();
        const outName  = buildOutputName({
          prefix:       cleanPrefix,
          baseOriginal,
          seq,
          padWidth,
          ext: fmtLower
        });

        try {
          let img = sharp(inputBuffer, { failOn: 'none' });

          // Metadatos: por defecto sharp 0.33 los elimina.
          // Llamar withMetadata() los conserva. Solo llamamos si el usuario NO quiere eliminarlos.
          if (!options.stripMeta) img = img.withMetadata();

          // Redimensionado: solo reduce si la imagen es más ancha que el valor.
          // Se mantiene la proporción automáticamente (no se distorsiona).
          if (resizeWidth > 0) {
            img = img.resize({ width: resizeWidth, withoutEnlargement: true });
          }

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

          const buffer         = await img.toBuffer();
          const convertedSize  = buffer.length;
          const reduction      = originalSize > 0
            ? Math.round(((originalSize - convertedSize) / originalSize) * 1000) / 10
            : 0;

          archive.append(buffer, { name: outName });

          stats.push({
            originalName,
            outputName: outName,
            format: fmtLower,
            originalSize,
            convertedSize,
            reduction,
            error: null
          });
        } catch (imgErr) {
          console.error(`Error convirtiendo ${originalName} a ${fmtLower}:`, imgErr.message);
          archive.append(
            `Error al convertir este archivo: ${imgErr.message}`,
            { name: outName + '.error.txt' }
          );
          stats.push({
            originalName,
            outputName: outName + '.error.txt',
            format: fmtLower,
            originalSize,
            convertedSize: 0,
            reduction: null,
            error: imgErr.message
          });
        }
      }

      fsp.unlink(f.path).catch(() => {});
    }

    archive.finalize();
    await archiveDone;

    // Auto-cleanup por si el cliente nunca descarga: 10 minutos
    setTimeout(() => { fsp.unlink(zipPath).catch(() => {}); }, 10 * 60 * 1000).unref();

    res.json({ downloadId, stats });
  } catch (err) {
    console.error('Error general:', err);
    try { archive.abort(); } catch {}
    fsp.unlink(zipPath).catch(() => {});
    cleanup(files);
    if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 9) RUTA DE DESCARGA: /download/:id?name=xxx.zip — sirve el ZIP y lo borra.
//    El cliente pasa el nombre deseado (con timestamp) en ?name= para que el
//    navegador guarde con ese nombre y no con el genérico "convertidos.zip".
app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  const zipPath = path.join(OUTPUT_DIR, `${id}.zip`);
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'Archivo no encontrado o expirado.' });
  }

  // Nombre del archivo: respetar el enviado por el cliente si es seguro.
  const requested = String(req.query.name || '').trim();
  const safeName  = /^[\w.\-]+\.zip$/i.test(requested) ? requested : 'convertidos.zip';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  const stream = fs.createReadStream(zipPath);
  stream.pipe(res);

  const removeZip = () => { fsp.unlink(zipPath).catch(() => {}); };
  stream.on('close', removeZip);
  stream.on('error', removeZip);
  res.on('close', removeZip);
});

// 10) LEVANTA SERVIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor listo en http://localhost:${PORT}`);
  console.log(`   Diagnóstico: http://localhost:${PORT}/health`);
});
