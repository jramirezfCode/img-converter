/* ── REFERENCIAS DOM ── */
const fileInput    = document.getElementById('fileInput');
const dropzone     = document.getElementById('dropzone');
const browseBtn    = document.getElementById('browseBtn');
const form         = document.getElementById('convertForm');
const statusEl     = document.getElementById('status');
const quality      = document.getElementById('quality');
const qualityVal   = document.getElementById('qualityVal');
const effort       = document.getElementById('effort');
const effortVal    = document.getElementById('effortVal');
const pngComp      = document.getElementById('pngCompressionLevel');
const pngCompVal   = document.getElementById('pngCompVal');
const fileList     = document.getElementById('fileList');
const fileQueue    = document.getElementById('fileQueue');
const queueCount   = document.getElementById('queueCount');
const clearBtn     = document.getElementById('clearBtn');
const convertBtn   = document.getElementById('convertBtn');
const btnLabel     = document.getElementById('btnLabel');
const btnSpinner   = document.getElementById('btnSpinner');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const progressPct  = document.getElementById('progressPct');
const progressLabel= document.getElementById('progressLabel');

/* ── SLIDERS ── */
quality.addEventListener('input', () => qualityVal.textContent = quality.value);
effort.addEventListener('input',  () => effortVal.textContent  = effort.value);
pngComp.addEventListener('input', () => pngCompVal.textContent = pngComp.value);

/* ── LISTA DE ARCHIVOS ── */
function formatBytes(bytes) {
  if (bytes < 1024)      return bytes + ' B';
  if (bytes < 1024*1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024*1024)).toFixed(1) + ' MB';
}

function refreshList(files) {
  if (!files || !files.length) { fileQueue.classList.add('hidden'); fileList.innerHTML = ''; return; }
  fileQueue.classList.remove('hidden');
  queueCount.textContent = `${files.length} archivo${files.length > 1 ? 's' : ''}`;
  fileList.innerHTML = '';
  [...files].forEach(f => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="f-dot"></span><span class="f-name">${f.name}</span><span class="f-size">${formatBytes(f.size)}</span>`;
    fileList.appendChild(li);
  });
}

fileInput.addEventListener('change', e => refreshList(e.target.files));
browseBtn.addEventListener('click',  () => fileInput.click());
clearBtn.addEventListener('click',   () => { fileInput.value = ''; refreshList(null); });

/* ── DRAG & DROP ── */
['dragenter','dragover'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('drag-over'); })
);
['dragleave','drop'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('drag-over'); })
);
dropzone.addEventListener('drop', e => { fileInput.files = e.dataTransfer.files; refreshList(fileInput.files); });

/* ── BARRA DE PROGRESO ── */
let progressTimer = null;

function showProgress() {
  progressWrap.classList.remove('hidden');
  progressBar.classList.remove('done');
  setProgress(0, 'Preparando archivos…');
}
function hideProgress() {
  clearInterval(progressTimer);
  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  progressPct.textContent = '0%';
}
function setProgress(pct, label) {
  progressBar.style.width = pct + '%';
  progressPct.textContent = Math.round(pct) + '%';
  if (label) progressLabel.textContent = label;
}
function completeProgress() {
  clearInterval(progressTimer);
  setProgress(100, '¡Conversión completada!');
  progressBar.classList.add('done');
}

function startFakeProgress() {
  // Fases: [hasta, incremento cada tick, ms entre ticks, mensaje]
  const phases = [
    [15, 3,   100, 'Subiendo imágenes…'],
    [45, 1.5, 180, 'Convirtiendo formatos…'],
    [75, 0.8, 250, 'Generando ZIP…'],
    [90, 0.3, 400, 'Casi listo…'],
  ];
  let current = 0;
  let phaseIdx = 0;
  clearInterval(progressTimer);

  function tick() {
    const [target, step, delay, label] = phases[phaseIdx];
    current = Math.min(current + step, target);
    setProgress(current, phaseIdx === 0 || current <= target ? label : null);
    if (current >= target) {
      clearInterval(progressTimer);
      phaseIdx++;
      if (phaseIdx < phases.length) {
        progressTimer = setInterval(tick, phases[phaseIdx][2]);
      }
    }
  }
  progressTimer = setInterval(tick, phases[0][2]);
}

/* ── NOMBRE ZIP CON FECHA Y HORA ── */
function zipFileName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `convertidos_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
}

/* ── ESTADO BOTÓN ── */
function setLoading(on) {
  convertBtn.disabled = on;
  btnLabel.textContent = on ? 'Convirtiendo…' : 'Convertir y descargar ZIP';
  btnSpinner.classList.toggle('hidden', !on);
}
function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (type ? ` ${type}` : '');
}

/* ── SUBMIT ── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');

  if (!fileInput.files.length) { setStatus('Primero selecciona al menos una imagen.', 'err'); return; }

  const formats = [...document.querySelectorAll('input[name="formats"]:checked')].map(i => i.value);
  if (!formats.length) { setStatus('Selecciona al menos un formato de salida.', 'err'); return; }

  const fd = new FormData();
  for (const f of fileInput.files) fd.append('images', f);
  fd.append('formats',             formats.join(','));
  fd.append('quality',             quality.value);
  fd.append('effort',              effort.value);
  fd.append('lossless',            document.getElementById('lossless').checked  ? 'true' : 'false');
  fd.append('mozjpeg',             document.getElementById('mozjpeg').checked   ? 'true' : 'false');
  fd.append('stripMeta',           document.getElementById('stripMeta').checked ? 'true' : 'false');
  fd.append('pngCompressionLevel', pngComp.value);

  setLoading(true);
  showProgress();
  startFakeProgress();

  try {
    const resp = await fetch('/convert', { method: 'POST', body: fd });

    if (!resp.ok) {
      let errMsg = 'Ocurrió un error durante la conversión.';
      try {
        const errData = await resp.json();
        errMsg = errData.error || errMsg;
      } catch {}

      hideProgress();

      // Si es error de sharp, mostrar instrucción clara
      if (errMsg.includes('sharp') || errMsg.includes('npm install')) {
        statusEl.innerHTML = `
          <div class="sharp-error">
            <strong>⚠️ El módulo de conversión no está listo</strong>
            Ejecuta este comando en la carpeta del proyecto y reinicia el servidor:<br>
            <code>npm install</code>
          </div>`;
        statusEl.className = 'status-msg';
      } else {
        setStatus(errMsg, 'err');
      }
      return;
    }

    const blob = await resp.blob();
    completeProgress();

    await new Promise(r => setTimeout(r, 600));

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = zipFileName();
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);

    setStatus('¡ZIP descargado correctamente!', 'ok');
    setTimeout(hideProgress, 3000);

  } catch (err) {
    console.error(err);
    hideProgress();
    setStatus('Error de red: asegúrate de que el servidor está corriendo en localhost:4000.', 'err');
  } finally {
    setLoading(false);
  }
});
