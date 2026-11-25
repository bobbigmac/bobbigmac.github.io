/* shared search: lunr over prebuilt link + video datasets */
var SEARCH=(()=>{const c={};
async function load(n){if(!c[n]){const d=await fetch('assets/search/'+n+'.json')
.then(r=>r.json());
c[n]={idx:lunr.Index.load(d.index),docs:new Map(d.docs.map(x=>[x.id,x]))};}
return c[n];}
async function run(n,q,lim){const {idx,docs}=await load(n);
const terms=q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
if(!terms.length)return [];
let hits=[];
try{hits=idx.search(terms.map(t=>t+'*').join(' '));}catch(e){}
if(!hits.length){try{hits=idx.search(terms.join(' '));}catch(e){}}
return hits.slice(0,lim||60).map(h=>docs.get(h.ref)).filter(Boolean);}
return {run};})();

function escH(s){return String(s||'').replace(/[&<>"]/g,
c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function searchHtml(ls,vs,more){
let h='<div class="ssec"><h3 class="stitle">links <b>· '+ls.length+'</b></h3>';
h+=ls.length?ls.map(d=>'<div class="srow"><a href="'+escH(d.u)
+'" target="_blank" rel="noopener">'+escH(d.t)
+'</a><span class="smeta">'+escH(d.p)+' · '+escH(d.h)+'</span></div>').join('')
:'<div class="mono">no matches</div>';
h+='</div><div class="ssec"><h3 class="stitle">videos <b>· '+vs.length
+'</b></h3>';
if(!vs.length)h+='<div class="mono">no matches</div>';
h+='<div class="sgrid">'+vs.map(d=>{
const pl=d.id.startsWith('pl:'),
href='liked-videos.html#'+(pl?'p=':'v=')+(pl?d.id.slice(3):d.id),
thumb=d.v||d.id;
return '<a class="svid" href="'+href+'"><div class="sart">'
+'<img loading="lazy" src="assets/yt/thumbs/'+thumb+'.jpg" alt="">'
+(pl?'<span class="sbadge">playlist</span>':'')
+'</div><span class="st">'+escH(d.t)+'</span>'
+'<span class="smeta">'+escH(d.c)+(d.y?' · '+d.y:'')+'</span></a>';})
.join('')+'</div></div>';
if(more)h+='<div class="mono"><a href="'+more+'">open full search →</a></div>';
return h;}

function searchInit(inputSel,resSel,restSel,lc,vc){
const inp=document.querySelector(inputSel),
res=document.querySelector(resSel),
rest=restSel&&document.querySelector(restSel);
let t;
async function go(q){
if(!q){res.innerHTML='';res.style.display='none';
if(rest)rest.style.display='';return;}
const [ls,vs]=await Promise.all(
[SEARCH.run('links',q,lc),SEARCH.run('videos',q,vc)]);
res.style.display='block';if(rest)rest.style.display='none';
res.innerHTML=searchHtml(ls,vs,
rest?'search.html?q='+encodeURIComponent(q):'');}
inp.addEventListener('input',()=>{clearTimeout(t);
t=setTimeout(()=>go(inp.value.trim()),150);});
const q=new URLSearchParams(location.search).get('q');
if(q){inp.value=q;go(q);}}