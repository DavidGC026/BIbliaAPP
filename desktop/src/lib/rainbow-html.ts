// Diagrama de arcos de referencias cruzadas (estilo "Visualizing the Bible"
// de Chris Harrison): eje x = capítulos en orden canónico, un arco por cada
// par de capítulos conectados, matiz según la distancia entre ambos.

export interface RainbowPayload {
  /** Etiqueta por capítulo, en orden canónico ("Génesis 1", …) */
  labels: string[];
  /** Índice de libro por capítulo (para franja alternada y selector) */
  bookIdx: number[];
  /** Nombre de cada libro, alineado con los valores de bookIdx */
  bookNames: string[];
  /** Número de capítulo dentro de su libro, por capítulo global */
  chap: number[];
  /** Tríos aplanados [i, j, conexiones] con índices de capítulo */
  arcs: number[];
}

export interface RainbowTheme {
  dark: boolean;
  background: string;
  text: string;
  textMuted: string;
  border: string;
}

export function getRainbowHtml(theme: RainbowTheme, payload: RainbowPayload): string {
  const { dark, background, text, textMuted, border } = theme;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: ${background}; overflow: hidden; }
  body { font-family: -apple-system, Roboto, sans-serif; }
  #info {
    position: fixed; top: 0; left: 0; right: 0; z-index: 2;
    display: flex; flex-direction: column; gap: 8px;
    padding: 8px 12px; background: ${background};
    border-bottom: 1px solid ${border};
  }
  #controls { display: flex; align-items: center; gap: 8px; }
  select {
    flex: 1; min-width: 0; height: 32px;
    background: ${background}; color: ${text};
    border: 1px solid ${border}; border-radius: 8px;
    font-size: 12px; padding: 0 6px;
  }
  #selBook { flex: 2; }
  .zbtn {
    width: 34px; height: 32px; flex: none;
    background: ${background}; color: ${text};
    border: 1px solid ${border}; border-radius: 8px;
    font-size: 16px; line-height: 30px; text-align: center;
  }
  .zbtn:active { opacity: 0.6; }
  #zoomLbl { color: ${textMuted}; font-size: 11px; width: 30px; flex: none; text-align: center; }
  #status { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  #infoText { color: ${textMuted}; font-size: 12px; line-height: 16px; flex: 1; }
  #infoText b { color: ${text}; font-size: 13px; }
  #legend { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  #legendBar {
    width: 96px; height: 6px; border-radius: 3px;
    background: linear-gradient(90deg,
      hsl(0,80%,55%), hsl(60,80%,50%), hsl(120,70%,45%),
      hsl(180,70%,45%), hsl(240,70%,55%), hsl(300,70%,55%));
  }
  #legendLbl { color: ${textMuted}; font-size: 9px; }
  #scroller { position: absolute; left: 0; right: 0; bottom: 0; overflow-x: auto; overflow-y: hidden; }
  canvas { display: block; transform-origin: 0 50%; }
  #progress {
    position: fixed; bottom: 10px; right: 12px; z-index: 2;
    color: ${textMuted}; font-size: 10px;
  }
</style>
</head>
<body>
<div id="info">
  <div id="controls">
    <select id="selBook"></select>
    <select id="selChap"></select>
    <button class="zbtn" id="zOut">−</button>
    <div id="zoomLbl">1×</div>
    <button class="zbtn" id="zIn">+</button>
  </div>
  <div id="status">
    <div id="infoText">Toca un capítulo para ver sus conexiones</div>
    <div id="legend">
      <div id="legendBar"></div>
      <div id="legendLbl">distancia entre capítulos</div>
    </div>
  </div>
</div>
<div id="scroller"><canvas id="cv"></canvas></div>
<div id="progress"></div>
<script>
var D = ${JSON.stringify(payload)};
var DARK = ${dark ? 'true' : 'false'};

var N = D.labels.length;
var infoText = document.getElementById('infoText');
var progressEl = document.getElementById('progress');
var scroller = document.getElementById('scroller');
var canvas = document.getElementById('cv');
var ctx = canvas.getContext('2d');
var selBook = document.getElementById('selBook');
var selChap = document.getElementById('selChap');
var zoomLbl = document.getElementById('zoomLbl');

var infoH = document.getElementById('info').offsetHeight;
scroller.style.top = infoH + 'px';

var BASE_W = Math.max(Math.round(window.innerWidth * 2.2), 1200);
var ZOOMS = [1, 1.5, 2, 3, 4, 6, 8, 12];
var zoomIdx = 0;
var selected = -1;

var PAD = 16;
var STRIP_H = 10;
var CSS_W, CSS_H, DPR, SPAN, BASE_Y, K;

function layout() {
  CSS_W = Math.round(BASE_W * ZOOMS[zoomIdx]);
  CSS_H = Math.max(window.innerHeight - infoH, 260);
  // Limita los píxeles físicos del lienzo para no agotar memoria con zoom alto
  DPR = Math.min(window.devicePixelRatio || 1, 1.5, 12000 / CSS_W);
  canvas.style.width = CSS_W + 'px';
  canvas.style.height = CSS_H + 'px';
  canvas.width = Math.round(CSS_W * DPR);
  canvas.height = Math.round(CSS_H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  SPAN = CSS_W - PAD * 2;
  BASE_Y = CSS_H - STRIP_H - 8;
  K = (BASE_Y - 16) / (SPAN / 2); // achata los arcos para que el mayor quepa
}

function xOf(i) { return PAD + (SPAN * i) / (N - 1); }

// Conexiones por capítulo (para el texto informativo)
var perChapter = new Array(N).fill(0);
var totalArcs = D.arcs.length / 3;
for (var t0 = 0; t0 < D.arcs.length; t0 += 3) {
  perChapter[D.arcs[t0]] += D.arcs[t0 + 2];
  perChapter[D.arcs[t0 + 1]] += D.arcs[t0 + 2];
}

// Primer capítulo global de cada libro (para el selector)
var bookStart = [];
for (var b0 = 0; b0 < N; b0++) {
  if (bookStart[D.bookIdx[b0]] === undefined) bookStart[D.bookIdx[b0]] = b0;
}

// Orden de dibujo: arcos largos primero para que los cortos queden encima
var order = new Array(totalArcs);
for (var o = 0; o < totalArcs; o++) order[o] = o;
order.sort(function (p, q) {
  return Math.abs(D.arcs[q * 3] - D.arcs[q * 3 + 1]) - Math.abs(D.arcs[p * 3] - D.arcs[p * 3 + 1]);
});

// Matiz y opacidad cuantizados para poder agrupar miles de arcos en un
// mismo Path2D y reducir drásticamente las llamadas a stroke()
var HUES = 30;
var ALPHAS = 8;
function hueBucket(dist) { return Math.min(HUES - 1, Math.floor((HUES * dist) / N)); }
function alphaBucket(n) {
  var a = 0.05 + n * (DARK ? 0.015 : 0.012);
  var max = DARK ? 0.5 : 0.4;
  return Math.min(ALPHAS - 1, Math.round(((Math.min(a, max) - 0.05) / (max - 0.05)) * (ALPHAS - 1)));
}
function bucketStyle(h, aIdx) {
  var hue = Math.round((300 * (h + 0.5)) / HUES);
  var max = DARK ? 0.5 : 0.4;
  var a = 0.05 + (aIdx / (ALPHAS - 1)) * (max - 0.05);
  return 'hsla(' + hue + ',' + (DARK ? '90%,60%,' : '75%,42%,') + a.toFixed(3) + ')';
}

function addArcPath(path, i, j) {
  var x1 = xOf(Math.min(i, j));
  var x2 = xOf(Math.max(i, j));
  var rx = (x2 - x1) / 2;
  if (rx < 0.3) return;
  path.moveTo(x2, BASE_Y);
  path.ellipse(x1 + rx, BASE_Y, rx, Math.max(rx * K, 1), 0, 0, Math.PI, true);
}

function drawStrip(sel) {
  var w = SPAN / (N - 1);
  for (var i = 0; i < N; i++) {
    var odd = D.bookIdx[i] % 2 === 1;
    ctx.fillStyle = DARK ? (odd ? '#3a3a3f' : '#26262a') : (odd ? '#c9c9cf' : '#e2e2e8');
    ctx.fillRect(xOf(i) - w / 2, BASE_Y + 4, Math.max(w, 0.5), STRIP_H);
  }
  if (sel >= 0) {
    ctx.fillStyle = DARK ? '#ffffff' : '#111111';
    ctx.fillRect(xOf(sel) - 1.5, BASE_Y + 2, 3, STRIP_H + 4);
  }
}

var baseSnapshot = null;
var renderGen = 0;
var CHUNK = 12000;

function render() {
  var gen = ++renderGen;
  baseSnapshot = null;
  layout();
  drawStrip(-1);
  var drawn = 0;
  function drawChunk() {
    if (gen !== renderGen) return; // hay un render más nuevo en marcha
    ctx.lineWidth = 0.7;
    var end = Math.min(drawn + CHUNK, totalArcs);
    var paths = {};
    for (var c = drawn; c < end; c++) {
      var k = order[c] * 3;
      var i = D.arcs[k], j = D.arcs[k + 1], n = D.arcs[k + 2];
      var key = hueBucket(Math.abs(i - j)) * ALPHAS + alphaBucket(n);
      var p = paths[key];
      if (!p) p = paths[key] = new Path2D();
      addArcPath(p, i, j);
    }
    for (var key2 in paths) {
      ctx.strokeStyle = bucketStyle(Math.floor(key2 / ALPHAS), key2 % ALPHAS);
      ctx.stroke(paths[key2]);
    }
    drawn = end;
    if (drawn < totalArcs) {
      progressEl.textContent = Math.round((100 * drawn) / totalArcs) + '%';
      requestAnimationFrame(drawChunk);
    } else {
      progressEl.textContent = '';
      drawStrip(-1);
      baseSnapshot = document.createElement('canvas');
      baseSnapshot.width = canvas.width;
      baseSnapshot.height = canvas.height;
      baseSnapshot.getContext('2d').drawImage(canvas, 0, 0);
      if (selected >= 0) highlight(selected);
    }
  }
  requestAnimationFrame(drawChunk);
}

function highlight(sel) {
  if (!baseSnapshot) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = sel >= 0 ? 0.14 : 1;
  ctx.drawImage(baseSnapshot, 0, 0);
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (sel >= 0) {
    ctx.lineWidth = 1.1;
    for (var t = 0; t < D.arcs.length; t += 3) {
      var i = D.arcs[t], j = D.arcs[t + 1];
      if (i !== sel && j !== sel) continue;
      var hue = Math.round((300 * Math.abs(i - j)) / (N - 1));
      ctx.strokeStyle = 'hsla(' + hue + ',' + (DARK ? '95%,65%' : '80%,40%') + ',0.9)';
      var x1 = xOf(Math.min(i, j));
      var x2 = xOf(Math.max(i, j));
      var rx = Math.max((x2 - x1) / 2, 0.5);
      ctx.beginPath();
      ctx.ellipse(x1 + rx, BASE_Y, rx, Math.max(rx * K, 1), 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    drawStrip(sel);
    infoText.innerHTML = '<b>' + D.labels[sel] + '</b> · ' + perChapter[sel].toLocaleString() + ' conexiones';
  } else {
    drawStrip(-1);
    infoText.textContent = 'Toca un capítulo para ver sus conexiones';
  }
}

// — Selección: canvas y selectores sincronizados —

function fillChapters(book) {
  var opts = '<option value="">Cap.</option>';
  for (var i = 0; i < N; i++) {
    if (D.bookIdx[i] === book) {
      opts += '<option value="' + i + '">' + D.chap[i] + '</option>';
    }
  }
  selChap.innerHTML = opts;
}

var bookOpts = '<option value="">Libro…</option>';
for (var bn = 0; bn < D.bookNames.length; bn++) {
  bookOpts += '<option value="' + bn + '">' + D.bookNames[bn] + '</option>';
}
selBook.innerHTML = bookOpts;
fillChapters(-1);

function scrollToChapter(i) {
  scroller.scrollLeft = Math.max(0, xOf(i) - window.innerWidth / 2);
}

function setSelected(i, fromSelect) {
  selected = i;
  highlight(i);
  if (i >= 0) {
    selBook.value = String(D.bookIdx[i]);
    fillChapters(D.bookIdx[i]);
    selChap.value = String(i);
    if (fromSelect) scrollToChapter(i);
  } else {
    selBook.value = '';
    fillChapters(-1);
  }
}

selBook.addEventListener('change', function () {
  if (selBook.value === '') { setSelected(-1, false); return; }
  var book = Number(selBook.value);
  fillChapters(book);
  setSelected(bookStart[book], true);
});

selChap.addEventListener('change', function () {
  if (selChap.value === '') return;
  setSelected(Number(selChap.value), true);
});

canvas.addEventListener('click', function (e) {
  var rect = canvas.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var i = Math.round(((x - PAD) / SPAN) * (N - 1));
  if (i < 0) i = 0;
  if (i >= N) i = N - 1;
  setSelected(selected === i ? -1 : i, false);
});

// — Zoom: botones y gesto de pellizco —

function setZoomIdx(idx, centerFrac) {
  idx = Math.max(0, Math.min(ZOOMS.length - 1, idx));
  if (idx === zoomIdx) return;
  if (centerFrac === undefined) {
    centerFrac = (scroller.scrollLeft + window.innerWidth / 2) / CSS_W;
  }
  zoomIdx = idx;
  zoomLbl.textContent = ZOOMS[zoomIdx] + '×';
  canvas.style.transform = '';
  render();
  scroller.scrollLeft = Math.max(0, centerFrac * CSS_W - window.innerWidth / 2);
}

document.getElementById('zIn').addEventListener('click', function () { setZoomIdx(zoomIdx + 1); });
document.getElementById('zOut').addEventListener('click', function () { setZoomIdx(zoomIdx - 1); });

function touchDist(e) {
  var dx = e.touches[0].clientX - e.touches[1].clientX;
  var dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

var pinch = null;
scroller.addEventListener('touchstart', function (e) {
  if (e.touches.length === 2) {
    var midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    pinch = {
      d: touchDist(e),
      ratio: 1,
      frac: (scroller.scrollLeft + midX) / CSS_W,
    };
  }
}, { passive: true });

scroller.addEventListener('touchmove', function (e) {
  if (pinch && e.touches.length === 2) {
    e.preventDefault();
    pinch.ratio = touchDist(e) / pinch.d;
    // Vista previa barata mientras dura el gesto; el render real llega al soltar
    canvas.style.transform = 'scaleX(' + pinch.ratio + ')';
  }
}, { passive: false });

scroller.addEventListener('touchend', function (e) {
  if (pinch && e.touches.length < 2) {
    var target = ZOOMS[zoomIdx] * pinch.ratio;
    var best = 0;
    for (var z = 0; z < ZOOMS.length; z++) {
      if (Math.abs(ZOOMS[z] - target) < Math.abs(ZOOMS[best] - target)) best = z;
    }
    var frac = pinch.frac;
    pinch = null;
    canvas.style.transform = '';
    if (best !== zoomIdx) setZoomIdx(best, frac);
  }
}, { passive: true });

render();
</script>
</body>
</html>`;
}
