import { MISSIONS, LANES, MILESTONES } from './instruments.js';
import { instrumentsHTML } from './inst-render.js';
import { ESA_3D } from './data.js';

const Y0 = 1955, Y1 = 2034, NOW = 2026.84;
const LANE_COLORS = { history: '#d0d6e0', nasa: '#4da3ff', weather: '#38d9c0', europe: '#ffc94d', asia: '#ff7a9c', commercial: '#b48cff' };
const pct = y => ((y - Y0) / (Y1 - Y0)) * 100;
const yearOf = y => Math.floor(y);
const $ = id => document.getElementById(id);

const state = { lanes: new Set(Object.keys(LANES)), q: '', open: null };

export function statusOf(m) {
  if (m.planned) return `Planned ${yearOf(m.start)}`;
  if (m.end == null) return 'Operating';
  if (m.proj) return `Operating · end of science projected ${yearOf(m.end)}`;
  return `Ended ${yearOf(m.end)}`;
}

// --- lane filter chips
for (const [k, label] of Object.entries(LANES)) {
  const b = document.createElement('button');
  b.className = 'chip on';
  b.style.setProperty('--c', LANE_COLORS[k]);
  b.innerHTML = `<i></i>${label}`;
  b.setAttribute('aria-pressed', 'true');
  b.onclick = () => {
    state.lanes.has(k) ? state.lanes.delete(k) : state.lanes.add(k);
    b.classList.toggle('on', state.lanes.has(k));
    b.setAttribute('aria-pressed', state.lanes.has(k));
    render();
  };
  $('lanes').appendChild(b);
}
$('search').oninput = e => { state.q = e.target.value.trim().toLowerCase(); render(); };

function matches(m) {
  if (!state.q) return true;
  const hay = [m.name, m.op, m.note || '', ...m.inst.map(i => i[0])].join(' ').toLowerCase();
  return hay.includes(state.q);
}

function axisHTML() {
  let ticks = '';
  for (let y = 1960; y <= 2030; y += 10) ticks += `<span class="tick" style="left:${pct(y)}%">${y}</span>`;
  for (let y = 1955; y <= 2034; y += 5) if (y % 10) ticks += `<span class="tick minor" style="left:${pct(y)}%"></span>`;
  const ms = MILESTONES.map(([y, t, tier]) => `<span class="ms" style="left:${pct(y)}%;top:${2 + tier * 15}px" title="${t} (${yearOf(y)})"><b></b><em>${t}</em></span>`).join('');
  return `<div class="tl-row tl-axis"><div class="tl-label"></div><div class="tl-track">${ms}${ticks}</div></div>`;
}

function render() {
  const chart = $('chart');
  let html = axisHTML();
  for (const [lane, label] of Object.entries(LANES)) {
    if (!state.lanes.has(lane)) continue;
    const rows = MISSIONS.filter(m => m.lane === lane && matches(m)).sort((a, b) => a.start - b.start);
    if (!rows.length) continue;
    html += `<div class="tl-row tl-lanehead" style="--c:${LANE_COLORS[lane]}"><div class="tl-label">${label}</div><div class="tl-track"></div></div>`;
    for (const m of rows) {
      const end = m.planned ? m.start + 1.6 : m.end == null ? NOW : m.end;
      const cls = m.planned ? 'plan' : m.end == null ? 'op' : m.proj ? 'op' : 'ended';
      const projTail = m.proj ? `<div class="bar proj" style="left:${pct(NOW)}%;width:${pct(m.end) - pct(NOW)}%"></div>` : '';
      const barEnd = m.proj ? NOW : end;
      const w = Math.max(pct(barEnd) - pct(m.start), 0.45);
      html += `<div class="tl-row mt-item${state.open === m.key ? ' open' : ''}" data-key="${m.key}" style="--c:${LANE_COLORS[lane]}" tabindex="0" role="button" aria-label="${m.name}, ${statusOf(m)}">
        <div class="tl-label"><span class="nm">${m.name}</span><span class="yr">${yearOf(m.start)}${m.planned ? '' : '–' + (m.end == null ? '' : yearOf(m.end))}</span></div>
        <div class="tl-track"><div class="bar ${cls}" style="left:${pct(m.start)}%;width:${w}%"></div>${projTail}<span class="bar-cap" style="left:calc(${pct(m.planned ? end : m.proj ? m.end : barEnd)}% + 6px)">${m.inst.length ? m.inst.length + ' instrument' + (m.inst.length > 1 ? 's' : '') : ''}</span></div>
      </div>`;
    }
  }
  html += `<div class="tl-now" style="--x:${pct(NOW)}"><span>Now · Nov 2026</span></div>`;
  chart.innerHTML = html;
  chart.querySelectorAll('.mt-item').forEach(r => {
    r.onclick = () => openDetail(r.dataset.key);
    r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.dataset.key); } };
  });
}

function openDetail(key) {
  const m = MISSIONS.find(x => x.key === key);
  if (!m) return;
  state.open = key;
  document.querySelectorAll('.mt-item').forEach(r => r.classList.toggle('open', r.dataset.key === key));
  const d = $('detail');
  d.style.setProperty('--c', LANE_COLORS[m.lane]);
  $('dLane').textContent = LANES[m.lane];
  $('dName').textContent = m.name;
  $('dMeta').textContent = `${m.op} · launched ${m.launched} · ${statusOf(m)}`;
  $('dNote').textContent = m.note || '';
  $('dNote').hidden = !m.note;
  $('dModel').hidden = !m.model;
  if (m.model) $('dModel').href = 'spacecraft.html#' + m.model;
  const esa = ESA_3D[m.esa3d];
  $('dEsa').hidden = !esa;
  if (esa) { $('dEsa').href = esa.url; $('dEsa').textContent = `${esa.label} in 3D on ESA Earth Online Visuals ↗`; }
  $('dInst').innerHTML = instrumentsHTML(m.inst);
  d.hidden = false;
  d.scrollTop = 0;
  history.replaceState(null, '', '#' + key);
}
$('detailClose').onclick = () => { $('detail').hidden = true; state.open = null; document.querySelectorAll('.mt-item.open').forEach(r => r.classList.remove('open')); history.replaceState(null, '', location.pathname); };
window.addEventListener('keydown', e => { if (e.key === 'Escape') $('detailClose').click(); });

render();
const initial = location.hash.slice(1);
if (initial && MISSIONS.some(m => m.key === initial)) {
  openDetail(initial);
  document.querySelector(`.mt-item[data-key="${initial}"]`)?.scrollIntoView({ block: 'center' });
}
