const STORAGE_KEY = 'dolarpulso_rates_v5';
const QR_LINK_KEY = 'dolarpulso_qr_link';
const ORDER = ['BCV', 'USDT', 'EUR', 'COP'];

const state = {
  rates: { BCV: 911.62, USDT: 1048.60, EUR: 1009.34, COP: 0.2185 },
  selected: 'BCV',
  selectedDate: '',
  isHistoric: false,
  deferredPrompt: null,
  camStream: null
};

const meta = {
  BCV: {
    name: 'Dólar BCV',
    badge: 'OFICIAL',
    sub: 'Banco Central de Venezuela',
    label: 'MONTO EN DÓLARES (BCV)',
    symbol: '$',
    icon: 'fa-landmark',
    colorClass: 'emerald',
    decimals: 2
  },
  USDT: {
    name: 'USDT',
    badge: 'P2P',
    sub: 'Dólar Paralelo / Cripto',
    label: 'MONTO EN USDT (P2P)',
    symbol: '₮',
    icon: 'fa-bolt',
    colorClass: 'gold',
    decimals: 2
  },
  EUR: {
    name: 'Euro BCV',
    badge: 'EURO',
    sub: 'Tasa Oficial Euro',
    label: 'MONTO EN EUROS (BCV)',
    symbol: '€',
    icon: 'fa-euro-sign',
    colorClass: 'sky',
    decimals: 2
  },
  COP: {
    name: 'Pesos Colombianos',
    badge: 'COP',
    sub: 'Bolívares por 1 Peso (COP)',
    label: 'MONTO EN PESOS COLOMBIANOS (COP)',
    symbol: 'COP',
    icon: 'fa-money-bill-wave',
    colorClass: 'purple',
    decimals: 4
  }
};

const foreignInput = document.getElementById('foreignInput');
const vesInput = document.getElementById('vesInput');
const refreshBtn = document.getElementById('refreshBtn');
const installBtn = document.getElementById('installBtn');
const rollerTrigger = document.getElementById('rollerTrigger');
const rollerDropdown = document.getElementById('rollerDropdown');
const rateDateInput = document.getElementById('rateDateInput');
const todayBtn = document.getElementById('todayBtn');

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().split('T')[0];
}

function fmt(num, dec = 2) {
  if (isNaN(num) || num === null) return dec === 4 ? '0,0000' : '0,00';
  return Number(num).toLocaleString('es-VE', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function showToast(htmlMsg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = htmlMsg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.BCV && saved.USDT && saved.EUR && saved.COP) {
      state.rates = saved;
    }
  } catch (e) {}
}

function saveRates() {
  if (!state.isHistoric) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rates));
  }
}

function render() {
  const curr = state.selected;
  const info = meta[curr];

  document.getElementById('rollerName').textContent = info.name;
  document.getElementById('rollerBadge').textContent = info.badge;
  document.getElementById('rollerSub').textContent = info.sub;
  document.getElementById('rollerPrice').textContent = fmt(state.rates[curr], info.decimals);

  const iconEl = document.getElementById('rollerIcon');
  iconEl.innerHTML = `<i class="fa-solid ${info.icon}"></i>`;
  iconEl.className = `roller-icon ${info.colorClass}`;

  ORDER.forEach(key => {
    document.getElementById(`dd-${key}`).textContent = `Bs. ${fmt(state.rates[key], meta[key].decimals)}`;
  });
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.toggle('active', item.dataset.currency === curr);
  });

  document.getElementById('foreignLabel').textContent = info.label;
  const sym = document.getElementById('foreignSymbol');
  sym.textContent = info.symbol;
  sym.className = `symbol ${info.colorClass}`;
  sym.style.fontSize = curr === 'COP' ? '1.1rem' : '1.45rem';
}

function calcFromForeign() {
  const v = parseFloat(foreignInput.value);
  if (isNaN(v) || foreignInput.value === '') {
    vesInput.value = '';
    updateSummary(0);
    return;
  }
  const totalVes = v * state.rates[state.selected];
  vesInput.value = totalVes.toFixed(2);
  updateSummary(totalVes);
}

function calcFromVes() {
  const b = parseFloat(vesInput.value);
  const rate = state.rates[state.selected];
  if (isNaN(b) || vesInput.value === '' || rate <= 0) {
    foreignInput.value = '';
    updateSummary(0);
    return;
  }
  const f = b / rate;
  foreignInput.value = state.selected === 'COP' ? f.toFixed(0) : f.toFixed(2);
  updateSummary(b);
}

function updateSummary(totalVes) {
  const bs = isNaN(totalVes) ? 0 : totalVes;
  const copVal = state.rates.COP > 0 ? bs / state.rates.COP : 0;

  document.getElementById('sum-BCV').textContent = `$ ${fmt(state.rates.BCV > 0 ? bs / state.rates.BCV : 0, 2)}`;
  document.getElementById('sum-USDT').textContent = `₮ ${fmt(state.rates.USDT > 0 ? bs / state.rates.USDT : 0, 2)}`;
  document.getElementById('sum-EUR').textContent = `€ ${fmt(state.rates.EUR > 0 ? bs / state.rates.EUR : 0, 2)}`;
  document.getElementById('sum-COP').textContent = `COP ${fmt(copVal, 0)}`;
}

function switchCurrency(curr) {
  state.selected = curr;
  rollerTrigger.classList.add('pop');
  setTimeout(() => rollerTrigger.classList.remove('pop'), 140);
  render();
  if (foreignInput.value) calcFromForeign();
  else if (vesInput.value) calcFromVes();
}

function stepCurrency(dir) {
  const idx = ORDER.indexOf(state.selected);
  const nextIdx = (idx + dir + ORDER.length) % ORDER.length;
  switchCurrency(ORDER[nextIdx]);
}

// Rueda del mouse & deslizar táctil
let wheelLock = false;
rollerTrigger.addEventListener('wheel', e => {
  e.preventDefault();
  if (wheelLock) return;
  wheelLock = true;
  stepCurrency(e.deltaY > 0 ? 1 : -1);
  setTimeout(() => (wheelLock = false), 140);
}, { passive: false });

let touchStartY = 0;
rollerTrigger.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

rollerTrigger.addEventListener('touchend', e => {
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) > 22) stepCurrency(diff > 0 ? 1 : -1);
});

document.getElementById('prevRateBtn').addEventListener('click', e => {
  e.stopPropagation();
  stepCurrency(-1);
});
document.getElementById('nextRateBtn').addEventListener('click', e => {
  e.stopPropagation();
  stepCurrency(1);
});

rollerTrigger.addEventListener('click', e => {
  if (e.target.closest('#editCurrentBtn') || e.target.closest('.step-arrows')) return;
  rollerDropdown.classList.toggle('hidden');
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    switchCurrency(item.dataset.currency);
    rollerDropdown.classList.add('hidden');
  });
});

document.addEventListener('click', e => {
  if (!e.target.closest('#rollerContainer')) rollerDropdown.classList.add('hidden');
});

// ================= TASAS EN VIVO Y POR FECHA =================
async function fetchLiveRates() {
  state.isHistoric = false;
  todayBtn.classList.add('hidden');
  const badge = document.getElementById('liveBadge');
  badge.classList.remove('historic');
  badge.innerHTML = `<span class="dot"></span> EN VIVO`;

  refreshBtn.classList.add('spinning');
  try {
    const [veRes, usdRatesRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares'),
      fetch('https://open.er-api.com/v6/latest/USD')
    ]);

    if (veRes.ok) {
      const data = await veRes.json();
      const ofi = data.find(d => d.fuente === 'oficial');
      const par = data.find(d => d.fuente === 'paralelo');
      if (ofi?.promedio) state.rates.BCV = Number(ofi.promedio);
      if (par?.promedio) state.rates.USDT = Number(par.promedio);
    }

    if (usdRatesRes.ok) {
      const usdData = await usdRatesRes.json();
      if (usdData?.rates?.EUR && state.rates.BCV) {
        state.rates.EUR = Number((state.rates.BCV / usdData.rates.EUR).toFixed(2));
      }
      if (usdData?.rates?.COP && state.rates.BCV) {
        state.rates.COP = Number((state.rates.BCV / usdData.rates.COP).toFixed(4));
      }
    }

    saveRates();
    render();
    if (foreignInput.value) calcFromForeign();
    else if (vesInput.value) calcFromVes();

    const hora = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('lastSync').textContent = `Actualizado hoy a las ${hora}`;
  } catch (e) {
    document.getElementById('lastSync').textContent = 'Modo sin conexión · Tasas guardadas';
  } finally {
    refreshBtn.classList.remove('spinning');
  }
}

async function fetchHistoricRates(dateStr) {
  const today = getTodayISO();
  if (!dateStr || dateStr === today) {
    rateDateInput.value = today;
    fetchLiveRates();
    return;
  }

  state.isHistoric = true;
  state.selectedDate = dateStr;
  todayBtn.classList.remove('hidden');

  const badge = document.getElementById('liveBadge');
  badge.classList.add('historic');
  badge.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> HISTÓRICO`;

  refreshBtn.classList.add('spinning');
  document.getElementById('lastSync').textContent = `Consultando tasas del ${dateStr}...`;

  try {
    const [histVeRes, histFxRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/historicos/dolares'),
      fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`)
    ]);

    let foundDate = false;
    if (histVeRes.ok) {
      const histList = await histVeRes.json();
      const ofiMatch = histList.find(d => d.fuente === 'oficial' && d.fecha?.startsWith(dateStr));
      const parMatch = histList.find(d => d.fuente === 'paralelo' && d.fecha?.startsWith(dateStr));

      if (ofiMatch?.promedio) {
        state.rates.BCV = Number(ofiMatch.promedio);
        foundDate = true;
      }
      if (parMatch?.promedio) {
        state.rates.USDT = Number(parMatch.promedio);
        foundDate = true;
      }
    }

    if (histFxRes.ok) {
      const fxData = await histFxRes.json();
      if (fxData?.usd?.eur && state.rates.BCV) {
        state.rates.EUR = Number((state.rates.BCV / fxData.usd.eur).toFixed(2));
      }
      if (fxData?.usd?.cop && state.rates.BCV) {
        state.rates.COP = Number((state.rates.BCV / fxData.usd.cop).toFixed(4));
      }
    }

    render();
    if (foreignInput.value) calcFromForeign();
    else if (vesInput.value) calcFromVes();

    document.getElementById('lastSync').textContent = foundDate
      ? `Mostrando tasas registradas el ${dateStr}`
      : `Sin registro exacto para ${dateStr} (puedes editar con ✎)`;
  } catch (e) {
    document.getElementById('lastSync').textContent = `No se pudo cargar historial de ${dateStr}`;
  } finally {
    refreshBtn.classList.remove('spinning');
  }
}

rateDateInput.addEventListener('change', e => {
  fetchHistoricRates(e.target.value);
});

todayBtn.addEventListener('click', () => {
  rateDateInput.value = getTodayISO();
  fetchLiveRates();
});

// ================= CÁMARA ESCÁNER DE NÚMEROS (OCR) =================
const camModal = document.getElementById('camModal');
const cameraVideo = document.getElementById('cameraVideo');
const ocrCanvas = document.getElementById('ocrCanvas');
const ocrStatus = document.getElementById('ocrStatus');

async function startCamera() {
  camModal.classList.remove('hidden');
  ocrStatus.textContent = 'Iniciando cámara...';
  try {
    state.camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    cameraVideo.srcObject = state.camStream;
    ocrStatus.textContent = 'Enfoca el precio dentro del recuadro y pulsa Detectar';
  } catch (err) {
    ocrStatus.textContent = 'No se pudo abrir la cámara directa. Usa "Subir foto".';
  }
}

function stopCamera() {
  if (state.camStream) {
    state.camStream.getTracks().forEach(t => t.stop());
    state.camStream = null;
  }
  camModal.classList.add('hidden');
}

function extractAmountFromText(rawText) {
  // Busca números con decimales o enteros (ej: 12.50, 12,50, 1.250,00, 45)
  const matches = rawText.match(/\d+(?:[.,]\d+)*/g);
  if (!matches || matches.length === 0) return null;

  // Toma el número más largo/relevante encontrado
  const candidate = matches.sort((a, b) => b.length - a.length)[0];
  let normalized = candidate;

  // Normalizar formato europeo/latino (1.250,50 -> 1250.50) vs inglés (1,250.50 -> 1250.50)
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const num = parseFloat(normalized);
  return !isNaN(num) && num > 0 ? num : null;
}

async function runOcrOnSource(imageSource) {
  ocrStatus.textContent = 'Leyendo números con IA...';
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      tessedit_char_whitelist: '0123456789.,$'
    });
    const detected = extractAmountFromText(result.data.text);

    if (detected !== null) {
      foreignInput.value = detected;
      calcFromForeign();
      stopCamera();
      showToast(`<i class="fa-solid fa-camera"></i> Detectado: ${detected}`);
    } else {
      ocrStatus.textContent = 'No se detectó ningún número claro. Intenta acercarte más.';
    }
  } catch (e) {
    ocrStatus.textContent = 'Error al analizar la imagen.';
  }
}

document.getElementById('openCamBtn').addEventListener('click', startCamera);
document.getElementById('closeCamBtn').addEventListener('click', stopCamera);

document.getElementById('captureOcrBtn').addEventListener('click', () => {
  if (!cameraVideo.videoWidth) return;
  const ctx = ocrCanvas.getContext('2d');
  // Recortar solo la zona central del recuadro guía para mayor precisión
  const vw = cameraVideo.videoWidth;
  const vh = cameraVideo.videoHeight;
  const cropW = vw * 0.75;
  const cropH = vh * 0.35;
  const cropX = (vw - cropW) / 2;
  const cropY = (vh - cropH) / 2;

  ocrCanvas.width = cropW;
  ocrCanvas.height = cropH;
  ctx.drawImage(cameraVideo, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  runOcrOnSource(ocrCanvas);
});

document.getElementById('ocrFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) runOcrOnSource(file);
});

// ================= COMPARTIR COMO IMAGEN + QR =================
const shareModal = document.getElementById('shareModal');
const qrLinkInput = document.getElementById('qrLinkInput');
const qrcodeBox = document.getElementById('qrcodeBox');

function updateReceiptPreview() {
  const curr = state.selected;
  const info = meta[curr];
  const amount = parseFloat(foreignInput.value) || 1;
  const vesTotal = amount * state.rates[curr];

  document.getElementById('receiptDate').textContent = `Fecha: ${rateDateInput.value || getTodayISO()}`;
  document.getElementById('receiptRateTag').textContent = info.badge;
  document.getElementById('receiptRateVal').textContent = `Bs. ${fmt(state.rates[curr], info.decimals)}`;
  document.getElementById('receiptForeign').textContent = `${info.symbol} ${fmt(amount, curr === 'COP' ? 0 : 2)}`;
  document.getElementById('receiptVes').textContent = `Bs. ${fmt(vesTotal, 2)}`;

  const link = qrLinkInput.value.trim() || window.location.href;
  document.getElementById('receiptUrlText').textContent = link.replace(/^https?:\/\//, '');

  qrcodeBox.innerHTML = '';
  new QRCode(qrcodeBox, {
    text: link,
    width: 72,
    height: 72,
    colorDark: '#060e1f',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

document.getElementById('openShareBtn').addEventListener('click', () => {
  const savedLink = localStorage.getItem(QR_LINK_KEY) || window.location.href;
  qrLinkInput.value = savedLink;
  updateReceiptPreview();
  shareModal.classList.remove('hidden');
});

qrLinkInput.addEventListener('input', () => {
  localStorage.setItem(QR_LINK_KEY, qrLinkInput.value.trim());
  updateReceiptPreview();
});

document.getElementById('closeShareBtn').addEventListener('click', () => {
  shareModal.classList.add('hidden');
});

async function generateReceiptBlob() {
  const card = document.getElementById('shareReceiptCard');
  const canvas = await html2canvas(card, {
    backgroundColor: '#060e1f',
    scale: 2,
    useCORS: true
  });
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

document.getElementById('downloadImgBtn').addEventListener('click', async () => {
  const blob = await generateReceiptBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DolarPulso-${rateDateInput.value || getTodayISO()}.png`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('<i class="fa-solid fa-check"></i> Foto guardada');
});

document.getElementById('nativeShareBtn').addEventListener('click', async () => {
  const blob = await generateReceiptBlob();
  const file = new File([blob], `DolarPulso-${rateDateInput.value || getTodayISO()}.png`, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Cotización DólarPulso',
        text: `Tasa ${meta[state.selected].name} (${rateDateInput.value})`,
        files: [file]
      });
    } catch (e) {}
  } else {
    // Fallback si el navegador de PC no soporta compartir archivos: descarga directa
    document.getElementById('downloadImgBtn').click();
  }
});

// ================= EVENTOS GENERALES =================
foreignInput.addEventListener('input', calcFromForeign);
vesInput.addEventListener('input', calcFromVes);

document.getElementById('clearBtn').addEventListener('click', () => {
  foreignInput.value = '';
  vesInput.value = '';
  updateSummary(0);
  foreignInput.focus();
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const cur = parseFloat(foreignInput.value) || 0;
    const step = state.selected === 'COP' ? Number(chip.dataset.add) * 1000 : Number(chip.dataset.add);
    const total = cur + step;
    foreignInput.value = state.selected === 'COP' ? total.toFixed(0) : total.toFixed(2);
    calcFromForeign();
  });
});

document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset.target);
    if (!inp.value) return;
    navigator.clipboard.writeText(inp.value);
    showToast(`<i class="fa-solid fa-check"></i> Copiado: ${inp.value}`);
  });
});

// Edición manual
const modal = document.getElementById('modal');
const modalInput = document.getElementById('modalInput');

document.getElementById('editCurrentBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('modalTitle').textContent = `Editar ${meta[state.selected].name}`;
  document.getElementById('modalDesc').textContent = state.selected === 'COP'
    ? 'Ingresa cuántos Bolívares vale 1 Peso Colombiano (ej: 0.22):'
    : 'Escribe el monto personalizado en Bolívares:';
  modalInput.value = state.rates[state.selected];
  modal.classList.remove('hidden');
  modalInput.focus();
});

document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('saveModal').addEventListener('click', () => {
  const val = parseFloat(modalInput.value);
  if (!isNaN(val) && val > 0) {
    state.rates[state.selected] = val;
    saveRates();
    render();
    if (foreignInput.value) calcFromForeign();
    else if (vesInput.value) calcFromVes();
  }
  modal.classList.add('hidden');
});

refreshBtn.addEventListener('click', () => {
  if (state.isHistoric) fetchHistoricRates(rateDateInput.value);
  else fetchLiveRates();
});

// PWA Install
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  installBtn.classList.add('hidden');
});

// Inicializar
const today = getTodayISO();
rateDateInput.value = today;
rateDateInput.max = today;
loadSaved();
render();
fetchLiveRates();