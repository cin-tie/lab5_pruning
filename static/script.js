const inputEl = document.getElementById('input');
const parseBtn = document.getElementById('parseBtn');
const clipBtn = document.getElementById('clipBtn');
const exampleBtn = document.getElementById('exampleBtn');
const info = document.getElementById('info');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let state = {
  segments: [],
  polygon: [],
  window: [0,0,100,100],
  scale: 1,
  offsetX: 50,
  offsetY: 50
};

function parseInputText(text){
  const tokens = text.trim().split(/\s+/).map(Number).filter(x=>!isNaN(x));
  if(tokens.length < 5) return null;
  const n = Math.floor(tokens[0]);
  let idx = 1;
  const segs = [];
  for(let i=0;i<n;i++){
    if(idx+3 >= tokens.length) break;
    segs.push([tokens[idx], tokens[idx+1], tokens[idx+2], tokens[idx+3]]);
    idx += 4;
  }
  if(idx+3 >= tokens.length) return {segments:segs, polygon:[], window:[0,0,100,100]};
  const xmin = tokens[idx], ymin = tokens[idx+1], xmax = tokens[idx+2], ymax = tokens[idx+3];
  return {segments:segs, polygon:[], window:[xmin,ymin,xmax,ymax]};
}

function drawAll(clippedSegments=[], clippedPolygon=[]){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const allX = [];
  const allY = [];
  state.segments.forEach(s => { allX.push(s[0], s[2]); allY.push(s[1], s[3]); });
  state.polygon.forEach(p => { allX.push(p[0]); allY.push(p[1]); });
  allX.push(state.window[0], state.window[2]); allY.push(state.window[1], state.window[3]);
  const xmin = Math.min(...allX), xmax = Math.max(...allX);
  const ymin = Math.min(...allY), ymax = Math.max(...allY);
  const padding = 40;
  const w = canvas.width - padding*2;
  const h = canvas.height - padding*2;
  const sx = (xmax - xmin) === 0 ? 1 : w / (xmax - xmin);
  const sy = (ymax - ymin) === 0 ? 1 : h / (ymax - ymin);
  const s = Math.min(sx, sy);
  state.scale = s;
  state.offsetX = padding - xmin * s;
  state.offsetY = padding + ymax * s;

  function toCanvas(pt){
    const x = pt[0]*state.scale + state.offsetX;
    const y = state.offsetY - pt[1]*state.scale;
    return [x,y];
  }

  ctx.strokeStyle = "#ddd";
  ctx.beginPath();
  ctx.moveTo(0, state.offsetY);
  ctx.lineTo(canvas.width, state.offsetY);
  ctx.moveTo(state.offsetX, 0);
  ctx.lineTo(state.offsetX, canvas.height);
  ctx.stroke();

  const [xminW,yminW,xmaxW,ymaxW] = state.window;
  const p1 = toCanvas([xminW,yminW]);
  const p2 = toCanvas([xmaxW,ymaxW]);
  const wx = Math.min(p1[0], p2[0]), wy = Math.min(p2[1], p1[1]);
  const ww = Math.abs(p2[0]-p1[0]), wh = Math.abs(p2[1]-p1[1]);
  ctx.fillStyle = "rgba(207,232,255,0.6)";
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = "#4a88c7";
  ctx.strokeRect(wx, wy, ww, wh);

  ctx.lineWidth = 1.5;
  state.segments.forEach(s => {
    const a = toCanvas([s[0], s[1]]), b = toCanvas([s[2], s[3]]);
    ctx.strokeStyle = "#ff6f6f";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  });

  clippedSegments.forEach(s => {
    const a = toCanvas([s[0], s[1]]), b = toCanvas([s[2], s[3]]);
    ctx.strokeStyle = "#b50000";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  });

  if(state.polygon && state.polygon.length>0){
    ctx.beginPath();
    state.polygon.forEach((p,i) => {
      const [x,y] = toCanvas(p);
      if(i==0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(182,240,182,0.5)";
    ctx.fill();
    ctx.strokeStyle = "#3ea83e";
    ctx.stroke();
  }

  if(clippedPolygon && clippedPolygon.length>0){
    ctx.beginPath();
    clippedPolygon.forEach((p,i) => {
      const [x,y] = toCanvas(p);
      if(i==0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(0,120,0,0.3)";
    ctx.fill();
    ctx.strokeStyle = "#004400";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

parseBtn.onclick = ()=> {
  const parsed = parseInputText(inputEl.value);
  if(!parsed){
    info.textContent = "Ошибка парсинга. См. пример в README.";
    return;
  }
  state.segments = parsed.segments;
  state.polygon = parsed.polygon || [];
  state.window = parsed.window;
  info.textContent = `Загружено ${state.segments.length} отрезков. Окно: ${state.window.join(', ')}`;
  drawAll();
};

clipBtn.onclick = async ()=> {
  try {
    const resp = await fetch('/api/clip', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        segments: state.segments,
        polygon: state.polygon,
        window: state.window
      })
    });
    const data = await resp.json();
    if(resp.ok){
      drawAll(data.clipped_segments, data.clipped_polygon);
      info.textContent = `Отсечение выполнено. Отсечённых отрезков: ${data.clipped_segments.length}. Полигон вершин: ${data.clipped_polygon.length}`;
    } else {
      info.textContent = 'Ошибка: ' + JSON.stringify(data);
    }
  } catch(e){
    info.textContent = 'Ошибка обращения к серверу: ' + e;
  }
};

exampleBtn.onclick = ()=>{
  inputEl.value = `5
-10 20  50 -30
-50 0   80 0
0  -40 0  60
-80 -20 -20 80
30 30  120 120
-40 -40 40 40`;
  state.polygon = [[-60,-10],[-10,70],[50,60],[90,10],[30,-40]];
  parseBtn.click();
  drawAll();
};
