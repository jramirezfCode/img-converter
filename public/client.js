/* ── REFERENCIAS DOM ── */
const fileInput      = document.getElementById('fileInput');
const dropzone       = document.getElementById('dropzone');
const browseBtn      = document.getElementById('browseBtn');
const form           = document.getElementById('convertForm');
const statusEl       = document.getElementById('status');
const quality        = document.getElementById('quality');
const qualityVal     = document.getElementById('qualityVal');
const effort         = document.getElementById('effort');
const effortVal      = document.getElementById('effortVal');
const pngComp        = document.getElementById('pngCompressionLevel');
const pngCompVal     = document.getElementById('pngCompVal');
const thumbGrid      = document.getElementById('thumbGrid');
const fileQueue      = document.getElementById('fileQueue');
const queueCount     = document.getElementById('queueCount');
const clearBtn       = document.getElementById('clearBtn');
const convertBtn     = document.getElementById('convertBtn');
const btnLabel       = document.getElementById('btnLabel');
const btnSpinner     = document.getElementById('btnSpinner');
const progressWrap   = document.getElementById('progressWrap');
const progressBar    = document.getElementById('progressBar');
const progressPct    = document.getElementById('progressPct');
const progressLabel  = document.getElementById('progressLabel');
const maxWidthInput  = document.getElementById('maxWidth');
const renamePrefix   = document.getElementById('renamePrefix');
const renameStart    = document.getElementById('renameStart');
const resultsWrap    = document.getElementById('resultsWrap');
const resultsBody    = document.getElementById('resultsBody');
const resultsSummary = document.getElementById('resultsSummary');
const resizeEnabled  = document.getElementById('resizeEnabled');
const renameEnabled  = document.getElementById('renameEnabled');
const resizeGroup    = document.getElementById('resizeGroup');
const renameGroup    = document.getElementById('renameGroup');
const previewEmpty   = document.getElementById('previewEmpty');

/* ── SLIDERS ── */
quality.addEventListener('input', () => qualityVal.textContent = quality.value);
effort.addEventListener('input',  () => effortVal.textContent  = effort.value);
pngComp.addEventListener('input', () => pngCompVal.textContent = pngComp.value);

/* ── TOGGLES DE SECCIONES OPCIONALES ── */
function syncResizeState() {
  const on = resizeEnabled.checked;
  maxWidthInput.disabled = !on;
  resizeGroup.classList.toggle('is-disabled', !on);
}
function syncRenameState() {
  const on = renameEnabled.checked;
  renamePrefix.disabled = !on;
  renameStart.disabled  = !on;
  renameGroup.classList.toggle('is-disabled', !on);
}
resizeEnabled.addEventListener('change', syncResizeState);
renameEnabled.addEventListener('change', syncRenameState);
syncResizeState();
syncRenameState();

/* ── UTILIDADES ── */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024)      return bytes + ' B';
  if (bytes < 1024*1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024*1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── ESTADO VACÍO DE LA COLUMNA 3 ──
   La sección 3 siempre está visible. Muestra el estado vacío si no hay
   archivos ni resultados; lo oculta cuando aparece uno de los dos. */
function updateEmptyState() {
  const hasFiles   = !fileQueue.classList.contains('hidden');
  const hasResults = !resultsWrap.classList.contains('hidden');
  previewEmpty.classList.toggle('hidden', hasFiles || hasResults);
}

/* ── MINIATURAS ── */
let activeThumbUrls = [];

function clearThumbnails() {
  for (const url of activeThumbUrls) {
    try { URL.revokeObjectURL(url); } catch {}
  }
  activeThumbUrls = [];
  thumbGrid.innerHTML = '';
}

function renderThumbnails(files) {
  clearThumbnails();

  if (!files || !files.length) {
    fileQueue.classList.add('hidden');
    updateEmptyState();
    return;
  }

  fileQueue.classList.remove('hidden');
  queueCount.textContent = `${files.length} archivo${files.length > 1 ? 's' : ''}`;

  const frag = document.createDocumentFragment();

  [...files].forEach((f) => {
    const card = document.createElement('div');
    card.className = 'thumb';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'thumb-img-wrap';

    const url = URL.createObjectURL(f);
    activeThumbUrls.push(url);

    const img = document.createElement('img');
    img.className = 'thumb-img';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = url;

    img.addEventListener('error', () => {
      img.remove();
      const fb = document.createElement('div');
      fb.className = 'thumb-fallback';
      fb.textContent = 'Sin vista previa';
      imgWrap.appendChild(fb);
    });

    imgWrap.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'thumb-meta';
    meta.innerHTML = `
      <span class="thumb-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
      <span class="thumb-size">${formatBytes(f.size)}</span>
    `;

    card.appendChild(imgWrap);
    card.appendChild(meta);
    frag.appendChild(card);
  });

  thumbGrid.appendChild(frag);
  updateEmptyState();
}

fileInput.addEventListener('change', e => {
  renderThumbnails(e.target.files);
  hideResults();
});

browseBtn.addEventListener('click', () => fileInput.click());

clearBtn.addEventListener('click', () => {
  fileInput.value = '';
  renderThumbnails(null);
  hideResults();
});

/* ── DRAG & DROP ── */
['dragenter','dragover'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('drag-over'); })
);
['dragleave','drop'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('drag-over'); })
);
dropzone.addEventListener('drop', e => {
  fileInput.files = e.dataTransfer.files;
  renderThumbnails(fileInput.files);
  hideResults();
});

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

/* ── TABLA DE RESULTADOS ── */
function hideResults() {
  resultsWrap.classList.add('hidden');
  resultsBody.innerHTML = '';
  resultsSummary.textContent = '';
  updateEmptyState();
}

function reductionBadgeClass(reduction) {
  if (reduction === null || reduction === undefined || Number.isNaN(reduction)) return 'reduction-error';
  if (reduction > 50) return 'reduction-good';
  if (reduction < 20) return 'reduction-bad';
  return 'reduction-medium';
}

function renderResults(stats) {
  if (!Array.isArray(stats) || !stats.length) {
    hideResults();
    return;
  }

  let totalOriginal  = 0;
  let totalConverted = 0;
  let validCount     = 0;

  const rows = stats.map(s => {
    const hasError = !!s.error;
    const reduction = (typeof s.reduction === 'number') ? s.reduction : null;
    const badgeClass = hasError ? 'reduction-error' : reductionBadgeClass(reduction);
    const badgeText  = hasError
      ? 'Error'
      : (reduction === null ? '—' : (reduction > 0 ? `−${reduction}%` : `${reduction}%`));

    if (!hasError) {
      totalOriginal  += Number(s.originalSize)  || 0;
      totalConverted += Number(s.convertedSize) || 0;
      validCount++;
    }

    const fmt = (s.format || '').toUpperCase();

    return `
      <tr>
        <td class="r-name" title="${escapeHtml(s.originalName)}">
          ${escapeHtml(s.originalName)}${fmt ? ` <em>· ${escapeHtml(fmt)}</em>` : ''}
        </td>
        <td class="r-num">${formatBytes(s.originalSize)}</td>
        <td class="r-num">${hasError ? '—' : formatBytes(s.convertedSize)}</td>
        <td class="r-badge"><span class="reduction-badge ${badgeClass}">${badgeText}</span></td>
      </tr>
    `;
  }).join('');

  resultsBody.innerHTML = rows;

  if (validCount > 0 && totalOriginal > 0) {
    const totalRed = Math.round(((totalOriginal - totalConverted) / totalOriginal) * 1000) / 10;
    const sign = totalRed > 0 ? '−' : (totalRed < 0 ? '+' : '');
    resultsSummary.textContent =
      `${validCount} archivo${validCount > 1 ? 's' : ''} · ` +
      `${formatBytes(totalOriginal)} → ${formatBytes(totalConverted)} · ` +
      `${sign}${Math.abs(totalRed)}% total`;
  } else {
    resultsSummary.textContent = `${stats.length} archivo${stats.length > 1 ? 's' : ''}`;
  }

  resultsWrap.classList.remove('hidden');
  updateEmptyState();
}

/* ── SUBMIT ── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');
  hideResults();

  if (!fileInput.files.length) { setStatus('Primero selecciona al menos una imagen.', 'err'); return; }

  const formats = [...document.querySelectorAll('input[name="formats"]:checked')].map(i => i.value);
  if (!formats.length) { setStatus('Selecciona al menos un formato de salida.', 'err'); return; }

  const resizeOn = resizeEnabled.checked;
  const renameOn = renameEnabled.checked;

  const fd = new FormData();
  for (const f of fileInput.files) fd.append('images', f);
  fd.append('formats',             formats.join(','));
  fd.append('quality',             quality.value);
  fd.append('effort',              effort.value);
  fd.append('lossless',            document.getElementById('lossless').checked  ? 'true' : 'false');
  fd.append('mozjpeg',             document.getElementById('mozjpeg').checked   ? 'true' : 'false');
  fd.append('stripMeta',           document.getElementById('stripMeta').checked ? 'true' : 'false');
  fd.append('pngCompressionLevel', pngComp.value);
  fd.append('maxWidth',            resizeOn ? (maxWidthInput.value || '0') : '0');
  fd.append('renamePrefix',        renameOn ? (renamePrefix.value || '').trim() : '');
  fd.append('renameStart',         renameOn ? (renameStart.value || '1') : '1');

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

    const data = await resp.json();
    if (!data || !data.downloadId) {
      hideProgress();
      setStatus('Respuesta inválida del servidor.', 'err');
      return;
    }

    completeProgress();
    await new Promise(r => setTimeout(r, 400));

    // Descargar pasando el nombre con timestamp al servidor
    const filename = zipFileName();
    const a = document.createElement('a');
    a.href = '/download/' + encodeURIComponent(data.downloadId) +
             '?name=' + encodeURIComponent(filename);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    renderResults(data.stats || []);

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

/* Inicializa el estado vacío visible */
updateEmptyState();
