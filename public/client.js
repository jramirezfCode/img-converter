const fileInput = document.getElementById('fileInput');
const dropzone  = document.getElementById('dropzone');
const form      = document.getElementById('convertForm');
const statusEl  = document.getElementById('status');
const quality   = document.getElementById('quality');
const qualityVal= document.getElementById('qualityVal');
const effort    = document.getElementById('effort');
const effortVal = document.getElementById('effortVal');
const pngComp   = document.getElementById('pngCompressionLevel');
const pngCompVal= document.getElementById('pngCompVal');
const fileList  = document.getElementById('fileList');
const queueSec  = document.getElementById('queue');
const convertBtn= document.getElementById('convertBtn');

quality.addEventListener('input', () => qualityVal.textContent = quality.value);
effort.addEventListener('input', () => effortVal.textContent = effort.value);
pngComp.addEventListener('input', () => pngCompVal.textContent = pngComp.value);

function refreshList(files) {
  if (!files || !files.length) {
    queueSec.classList.add('hidden');
    fileList.innerHTML = '';
    return;
  }
  queueSec.classList.remove('hidden');
  fileList.innerHTML = '';
  [...files].forEach(f => {
    const li = document.createElement('li');
    li.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
    fileList.appendChild(li);
  });
}

fileInput.addEventListener('change', e => refreshList(e.target.files));

['dragenter','dragover'].forEach(evt =>
  dropzone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropzone.style.background = '#eef0ff';
  })
);
['dragleave','drop'].forEach(evt =>
  dropzone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropzone.style.background = '#fafaff';
  })
);
dropzone.addEventListener('drop', e => {
  const dt = e.dataTransfer;
  fileInput.files = dt.files;
  refreshList(fileInput.files);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  if (!fileInput.files.length) {
    statusEl.textContent = 'Primero selecciona al menos una imagen 🙃';
    return;
  }

  // Recolecta formatos seleccionados
  const formats = [...document.querySelectorAll('input[name="formats"]:checked')].map(i => i.value);
  if (!formats.length) {
    statusEl.textContent = 'Selecciona al menos un formato de salida.';
    return;
  }

  const fd = new FormData();
  // archivos
  for (const f of fileInput.files) fd.append('images', f);

  // opciones
  fd.append('formats', formats.join(','));
  fd.append('quality', quality.value);
  fd.append('effort', effort.value);
  fd.append('lossless', document.getElementById('lossless').checked ? 'true' : 'false');
  fd.append('mozjpeg', document.getElementById('mozjpeg').checked ? 'true' : 'false');
  fd.append('pngCompressionLevel', pngComp.value);

  convertBtn.disabled = true;
  statusEl.textContent = 'Convirtiendo... (armando ZIP)';

  try {
    const resp = await fetch('/convert', { method: 'POST', body: fd });
    if (!resp.ok) {
      statusEl.textContent = 'Ocurrió un error durante la conversión.';
      convertBtn.disabled = false;
      return;
    }
    const blob = await resp.blob();

    // descarga ZIP
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'convertidos.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent = '¡Listo! ZIP descargado ✅';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error de red o de servidor.';
  } finally {
    convertBtn.disabled = false;
  }
});
