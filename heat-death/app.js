/* ---------- CLOCK + TIMELINE (same semantics as before) ---------- */
const EPOCHS = [
  { label: "Big Bang", yBB: 0, blurb: "Hot dense beginning; spacetime expands.", url:"https://en.wikipedia.org/wiki/Big_Bang" },
  { label: "Recombination", yBB: 3.8e5, blurb: "CMB released; universe becomes transparent.", url:"https://en.wikipedia.org/wiki/Recombination_(cosmology)" },
  { label: "Milky Way–Andromeda Merger", yBB: 13.8e9 + 4.5e9, blurb: "Local galactic dance begins/settles.", url:"https://en.wikipedia.org/wiki/Andromeda%E2%80%93Milky_Way_collision" },
  { label: "Sun: Red Giant Phase", yBB: 13.8e9 + 5.0e9, blurb: "Inner planets scorched; outer system warms.", url:"https://en.wikipedia.org/wiki/Sun#Future" },
  { label: "Last Star Forms", yBB: 1e13, blurb: "Star formation winds down; dim era begins.", url:"https://en.wikipedia.org/wiki/Timeline_of_the_far_future#Stelliferous_Era" },
  { label: "Black Hole Era Onset", yBB: 1e14, blurb: "Remnants dominate; slow gravitational ballet.", url:"https://en.wikipedia.org/wiki/Timeline_of_the_far_future#Degenerate_Era" },
  { label: "Proton Decay (hyp.)", yBB: 1e34, blurb: "If true: baryonic matter dissolves.", url:"https://en.wikipedia.org/wiki/Proton_decay" },
  { label: "SMBH Evaporation", yBB: 1e100, blurb: "Hawking radiation empties the night.", url:"https://en.wikipedia.org/wiki/Black_hole_thermodynamics#Hawking_radiation_and_black-hole_evaporation" },
];

const YEARS_SINCE_BB_NOW = 13.8e9;
const HEAT_DEATH_YEARS_SINCE_BB = 1e100;
const SECONDS_PER_YEAR = 31556952;

const bigCounterEl = document.getElementById("bigCounter");
const counterUnitsEl = document.getElementById("counterUnits");
const entropyFillEl = document.getElementById("entropyFill");
const entropyPctEl = document.getElementById("entropyPct");
const jumpListEl = document.getElementById("jumpList");
const railEl = document.getElementById("rail");
const nowMarker = document.getElementById("nowMarker");
const timeline = document.getElementById("timeline");
const cursorYear = document.getElementById("cursorYear");
const returnNowBtn = document.getElementById("returnNow");
const contextStack = document.getElementById("contextStack");

const fmtThousands = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const formatBigIntWithGroups = (bi) => bi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const formatYears = (y) => {
  const abs = Math.abs(y);
  if (abs >= 1e9) {
    const e = Math.floor(Math.log10(abs));
    const m = abs / (10 ** e);
    return `${m.toFixed(3)}e${e}`;
  }
  return fmtThousands(Math.floor(y).toString());
};

const BI = (n)=> (typeof n==="bigint"?n:BigInt(Math.trunc(n)));
const toBigSeconds = (yearsFloat)=> BI(Math.floor(yearsFloat))*BI(SECONDS_PER_YEAR);
const nowUnixSec = ()=> BI(Math.floor(Date.now()/1000));
const yearsLeftNowFloat = HEAT_DEATH_YEARS_SINCE_BB - YEARS_SINCE_BB_NOW;
const targetUnix = nowUnixSec() + toBigSeconds(yearsLeftNowFloat);

function updateCountdown(){
  const now = nowUnixSec();
  let diff = targetUnix - now; if (diff<0) diff = 0n;
  const sPerMin=60n, sPerHour=3600n, sPerDay=86400n, sPerYear=BI(SECONDS_PER_YEAR);
  let rem = diff;
  const years = rem / sPerYear; rem %= sPerYear;
  const days  = rem / sPerDay;  rem %= sPerDay;
  const hours = rem / sPerHour; rem %= sPerHour;
  const mins  = rem / sPerMin;  rem %= sPerMin;
  const secs  = rem;

  bigCounterEl.textContent = formatBigIntWithGroups(diff);
  counterUnitsEl.textContent = "seconds";
  // sidebar countdown removed; only top odometer remains
}
updateCountdown();
setInterval(updateCountdown, 1000);

// timeline mapping
const minYear = 1e3;
const maxYear = HEAT_DEATH_YEARS_SINCE_BB;
const railHeight = railEl.clientHeight;
const yearToScrollY = (y)=>{
  const yy = Math.max(minYear, Math.min(maxYear, y));
  const t = (Math.log10(yy) - Math.log10(minYear)) / (Math.log10(maxYear) - Math.log10(minYear));
  return t * (railHeight - 100);
};
const scrollYToYear = (sy)=>{
  const t = Math.max(0, Math.min(1, sy / (railHeight - 100)));
  const logy = Math.log10(minYear) + t * (Math.log10(maxYear) - Math.log10(minYear));
  return 10**logy;
};
const yearToSlider = (y)=>{
  const t = (Math.log10(Math.max(minYear, y)) - Math.log10(minYear)) / (Math.log10(maxYear) - Math.log10(minYear));
  return Math.round(t * parseInt(timeline.max,10));
};
const sliderToYear = (v)=>{
  const t = v / parseInt(timeline.max,10);
  const logy = Math.log10(minYear) + t * (Math.log10(maxYear) - Math.log10(minYear));
  return 10**logy;
};

function placeNowMarker(){
  const y = YEARS_SINCE_BB_NOW;
  nowMarker.style.top = `${yearToScrollY(y)}px`;
}
placeNowMarker();

function createJumpList(){
  jumpListEl.innerHTML = "";
  EPOCHS.forEach((e, i)=>{
    const item = document.createElement("div");
    item.className = "jump-item";
    item.innerHTML = `<div class="label">#${i+1} — ${e.label}</div>
                      <div class="time">${formatYears(e.yBB)} years since Big Bang</div>`;
    item.addEventListener("click", ()=> animateToYear(e.yBB));
    jumpListEl.appendChild(item);

    const top = yearToScrollY(e.yBB);
    const note = document.createElement("div");
    note.className = "section-note";
    note.style.top = `${Math.max(24, Math.min(railHeight-200, top-30))}px`;
    note.innerHTML = `<h3>${e.label}</h3><p>${e.blurb}</p><div class="tooltip">y = ${formatYears(e.yBB)} after BB</div>`;
    railEl.appendChild(note);
  });
}
createJumpList();

let programmaticScroll = false;
let tempUniform = 1.0;
function setTempUniform(t){ tempUniform = t; }
function updateEntropyUI(currentYear){
  const frac = Math.max(0, Math.min(1, currentYear / HEAT_DEATH_YEARS_SINCE_BB));
  entropyFillEl.style.width = `${(frac*100).toFixed(3)}%`;
  entropyPctEl.textContent = `${(frac*100).toFixed(3)}%`;
  setTempUniform( Math.max(0.02, 1 - Math.pow(frac, 0.25)) );
}
function syncUIFromScroll(){
  if (programmaticScroll) return;
  const sy = window.scrollY || document.documentElement.scrollTop;
  const y = scrollYToYear(sy);
  timeline.value = yearToSlider(y);
  cursorYear.textContent = `Year: ${formatYears(y)} (since BB)`;
  updateEntropyUI(y);
  updateContextPanel(y);
}
window.addEventListener("scroll", ()=>syncUIFromScroll(), {passive:true});
timeline.addEventListener("input", ()=>{
  const y = sliderToYear(parseInt(timeline.value,10));
  animateScrollTo(yearToScrollY(y), 500);
  cursorYear.textContent = `Year: ${formatYears(y)} (since BB)`;
  updateEntropyUI(y);
  updateContextPanel(y);
});
function animateScrollTo(targetY, ms=800){
  programmaticScroll = true;
  const startY = window.scrollY || document.documentElement.scrollTop;
  const dy = targetY - startY;
  const t0 = performance.now();
  const ease = (t)=> t<.5 ? 2*t*t : -1+(4-2*t)*t;
  function step(t){
    const p = Math.min(1, (t - t0) / ms);
    const py = startY + dy * ease(p);
    window.scrollTo(0, py);
    if (p<1) requestAnimationFrame(step); else programmaticScroll=false;
  }
  requestAnimationFrame(step);
}
function animateToYear(y, ms=900){ animateScrollTo(yearToScrollY(y), ms); }
returnNowBtn.addEventListener("click", ()=> animateToYear(YEARS_SINCE_BB_NOW, 700));

// show context when near an epoch (range-based)
function updateContextPanel(currentYear){
  // dynamic tolerance: larger windows later in time
  const tolerance = Math.max(1e6, currentYear * 0.02);
  // collect all epochs within tolerance
  const visible = EPOCHS.filter(e => Math.abs(e.yBB - currentYear) <= tolerance)
                        .sort((a,b)=> a.yBB - b.yBB);
  // render
  contextStack.innerHTML = '';
  visible.forEach(e=>{
    const card = document.createElement('div');
    card.className = 'context-card';
    card.innerHTML = `<div class="title">${e.label}</div>
                      <div class="text">${e.blurb}</div>
                      <a class="link" href="${e.url||'#'}" target="_blank" rel="noopener">Learn more</a>`;
    contextStack.appendChild(card);
  });
}

// init now
(function(){
  const nowY = YEARS_SINCE_BB_NOW;
  timeline.value = yearToSlider(nowY);
  cursorYear.textContent = `Year: ${formatYears(nowY)} (since BB)`;
  updateEntropyUI(nowY);
  setTimeout(()=>animateToYear(nowY, 0), 40);
})();

/* ---------- WEBGL2 / GLSL FIELD (uTemp uniform drives intensity/dynamics) ---------- */
const canvas = document.getElementById("gl");
let gl = canvas.getContext("webgl2", { antialias:false, depth:false, stencil:false, premultipliedAlpha:false, alpha:true, powerPreference:"high-performance" });

function resizeGL(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = Math.floor(window.innerWidth  * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  canvas.width = w; canvas.height = h;
  canvas.style.width = (w/dpr)+"px"; canvas.style.height = (h/dpr)+"px";
  gl.viewport(0,0,w,h);
}
window.addEventListener("resize", resizeGL); resizeGL();
async function loadText(url){
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.text();
}

let vertSrc = '';
let fragSrc = '';
Promise.all([
  loadText('heat-death/shaders/vert.glsl'),
  loadText('heat-death/shaders/frag.glsl')
]).then(([v, f])=>{
  vertSrc = v; fragSrc = f; initGL();
}).catch(err=>{
  console.error(err);
});

function compile(type, src){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh));
    throw new Error("Shader compile failed");
  }
  return sh;
}
function createProgram(vs, fs){
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    throw new Error("Program link failed");
  }
  return p;
}
function initGL(){
  const prog = createProgram(compile(gl.VERTEX_SHADER, vertSrc), compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.useProgram(prog);

  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uTemp = gl.getUniformLocation(prog, 'uTemp');
  const uSeed = gl.getUniformLocation(prog, 'uSeed');

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);

  let start = performance.now();

  gl.uniform1f(uSeed, Math.random()*1000.0);

  function frame(){
    const t = (performance.now() - start) * 0.001;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uTemp, tempUniform);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// energy burst on click/touch
function burst(){ tempUniform = Math.min(1.0, tempUniform + 0.25); }
window.addEventListener("click", burst, {passive:true});
window.addEventListener("touchstart", burst, {passive:true});
setInterval(()=>{ tempUniform = Math.max(0.02, tempUniform - 0.01); }, 120);

/* expose setTempUniform to timeline entropy mapper */
window.setTempUniform = setTempUniform;

/* ---------- Responsive sidebar toggle ---------- */
const menuBtn = document.getElementById('menuBtn');
const backdrop = document.getElementById('backdrop');
function openSidebar(){ document.body.classList.add('sidebar-open'); }
function closeSidebar(){ document.body.classList.remove('sidebar-open'); }
menuBtn.addEventListener('click', ()=>{
  if (document.body.classList.contains('sidebar-open')) closeSidebar();
  else openSidebar();
});
backdrop.addEventListener('click', closeSidebar);


