const inputEl = document.getElementById('input');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');

const btnExample = document.getElementById('btnExample');
const btnDraw = document.getElementById('btnDraw');
const btnClip = document.getElementById('btnClip');
const btnClear = document.getElementById('btnClear');

let state = {
  segments: [],
  polygon: [],
  window: [],
  clippedSegments: [],
  clippedPolygon: []
};

const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;

function computeOutCode(x, y, xmin, ymin, xmax, ymax) {
  let code = INSIDE;
  if (x < xmin) code |= LEFT;
  else if (x > xmax) code |= RIGHT;
  if (y < ymin) code |= BOTTOM;
  else if (y > ymax) code |= TOP;
  return code;
}

function cohenSutherland(x1, y1, x2, y2, xmin, ymin, xmax, ymax) {
  let outcode1 = computeOutCode(x1, y1, xmin, ymin, xmax, ymax);
  let outcode2 = computeOutCode(x2, y2, xmin, ymin, xmax, ymax);
  let accept = false;

  while (true) {
    if ((outcode1 | outcode2) === 0) {
      accept = true;
      break;
    } else if (outcode1 & outcode2) {
      break;
    } else {
      let x, y;
      let outcodeOut = outcode1 ? outcode1 : outcode2;

      if (outcodeOut & TOP) {
        x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
        y = ymax;
      } else if (outcodeOut & BOTTOM) {
        x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
        y = ymin;
      } else if (outcodeOut & RIGHT) {
        y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
        x = xmax;
      } else if (outcodeOut & LEFT) {
        y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
        x = xmin;
      }

      if (outcodeOut === outcode1) {
        x1 = x; y1 = y; outcode1 = computeOutCode(x1, y1, xmin, ymin, xmax, ymax);
      } else {
        x2 = x; y2 = y; outcode2 = computeOutCode(x2, y2, xmin, ymin, xmax, ymax);
      }
    }
  }

  return accept ? [x1, y1, x2, y2] : null;
}


function inside(p, edge, rect) {
  const [x, y] = p;
  const [xmin, ymin, xmax, ymax] = rect;
  switch (edge) {
    case 'left': return x >= xmin;
    case 'right': return x <= xmax;
    case 'bottom': return y >= ymin;
    case 'top': return y <= ymax;
  }
  return true;
}

function intersection(p1, p2, edge, rect) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [xmin, ymin, xmax, ymax] = rect;
  let x, y;

  switch (edge) {
    case 'left':
      x = xmin;
      y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
      break;
    case 'right':
      x = xmax;
      y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
      break;
    case 'bottom':
      y = ymin;
      x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
      break;
    case 'top':
      y = ymax;
      x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
      break;
  }
  return [x, y];
}

function sutherlandHodgman(polygon, rect) {
  let outputList = polygon;
  ['left', 'right', 'bottom', 'top'].forEach(edge => {
    const inputList = outputList;
    outputList = [];
    if (!inputList.length) return;
    let S = inputList[inputList.length - 1];

    for (const E of inputList) {
      if (inside(E, edge, rect)) {
        if (inside(S, edge, rect)) {
          outputList.push(E);
        } else {
          outputList.push(intersection(S, E, edge, rect));
          outputList.push(E);
        }
      } else if (inside(S, edge, rect)) {
        outputList.push(intersection(S, E, edge, rect));
      }
      S = E;
    }
  });
  return outputList.map(([x, y]) => [parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3))]);
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const allX = [], allY = [];
  const pushCoords = arr => arr.forEach(p => { allX.push(p[0], p[2]); allY.push(p[1], p[3]); });
  pushCoords(state.segments);
  allX.push(state.window[0], state.window[2]);
  allY.push(state.window[1], state.window[3]);
  state.polygon.forEach(p => { allX.push(p[0]); allY.push(p[1]); });

  const xmin = Math.min(...allX), xmax = Math.max(...allX);
  const ymin = Math.min(...allY), ymax = Math.max(...allY);
  const s = Math.min(800 / (xmax - xmin + 1), 500 / (ymax - ymin + 1));
  const offsetX = 450 - (xmin + xmax) / 2 * s;
  const offsetY = 300 + (ymin + ymax) / 2 * s;

  const toCanvas = (x, y) => [x * s + offsetX, -y * s + offsetY];

  const [x1, y1] = toCanvas(state.window[0], state.window[1]);
  const [x2, y2] = toCanvas(state.window[2], state.window[3]);
  ctx.fillStyle = "rgba(100,150,255,0.2)";
  ctx.strokeStyle = "#4a88c7";
  ctx.lineWidth = 2;
  ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

  ctx.strokeStyle = "#ff9999";
  ctx.lineWidth = 1.5;
  for (const [a1, b1, a2, b2] of state.segments) {
    const [X1, Y1] = toCanvas(a1, b1);
    const [X2, Y2] = toCanvas(a2, b2);
    ctx.beginPath();
    ctx.moveTo(X1, Y1);
    ctx.lineTo(X2, Y2);
    ctx.stroke();
  }

  ctx.strokeStyle = "#e60000";
  ctx.lineWidth = 2.5;
  for (const seg of state.clippedSegments) {
    const [X1, Y1] = toCanvas(seg[0], seg[1]);
    const [X2, Y2] = toCanvas(seg[2], seg[3]);
    ctx.beginPath();
    ctx.moveTo(X1, Y1);
    ctx.lineTo(X2, Y2);
    ctx.stroke();
  }

  if (state.polygon.length > 0) {
    ctx.beginPath();
    state.polygon.forEach((p, i) => {
      const [X, Y] = toCanvas(p[0], p[1]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(183,245,183,0.4)";
    ctx.strokeStyle = "#009000";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }

  if (state.clippedPolygon.length > 0) {
    ctx.beginPath();
    state.clippedPolygon.forEach((p, i) => {
      const [X, Y] = toCanvas(p[0], p[1]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(0,120,0,0.4)";
    ctx.strokeStyle = "#004400";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
}


function parseInput() {
  const tokens = inputEl.value.trim().split(/\s+/).map(Number);
  if (tokens.length < 5) return null;

  let idx = 0;
  const n = tokens[idx++];
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push(tokens.slice(idx, idx + 4));
    idx += 4;
  }

  let polygon = [];
  if (idx < tokens.length) {
    const m = tokens[idx++];
    for (let i = 0; i < m; i++) {
      polygon.push(tokens.slice(idx, idx + 2));
      idx += 2;
    }
  }

  const win = tokens.slice(idx, idx + 4);
  idx += 4;

  return { segments: segs, window: win, polygon };
}

btnExample.onclick = () => {
  inputEl.value =
`5
-10 20 50 -30
-50 0 80 0
0 -40 0 60
-80 -20 -20 80
30 30 120 120
5
-60 -10
-10 70
50 60
90 10
30 -40
-40 -40 40 40`;
  info.textContent = "Пример загружен.";
};

btnDraw.onclick = () => {
  const parsed = parseInput();
  if (!parsed) {
    info.textContent = "Ошибка ввода данных.";
    return;
  }
  state.segments = parsed.segments;
  state.window = parsed.window;
  state.polygon = parsed.polygon || [];
  state.clippedSegments = [];
  state.clippedPolygon = [];
  drawScene();
  info.textContent = `Отрисовано ${state.segments.length} отрезков, вершин многоугольника: ${state.polygon.length}.`;
};


btnClip.onclick = () => {
  const [xmin, ymin, xmax, ymax] = state.window;

  state.clippedSegments = state.segments.map(s =>
    cohenSutherland(...s, xmin, ymin, xmax, ymax)
  ).filter(Boolean);

  state.clippedPolygon = sutherlandHodgman(state.polygon, state.window);

  drawScene();
  info.textContent = `Отсечено ${state.clippedSegments.length} отрезков, полигон: ${state.clippedPolygon.length} вершин.`;
};

btnClear.onclick = () => {
  inputEl.value = "";
  state = { segments: [], polygon: [], window: [-40, -40, 40, 40], clippedSegments: [], clippedPolygon: [] };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  info.textContent = "Поле очищено.";
};
