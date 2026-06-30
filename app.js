const $ = s => document.querySelector(s);
const storeKey = 'creagroupe-v1';
let state = JSON.parse(localStorage.getItem(storeKey) || '{"classes":[],"currentClassId":null,"groups":[],"available":[]}');
let dragged = null;
let touchDrag = null;
const palette = ['#2563eb','#7c3aed','#059669','#ea580c','#dc2626','#0891b2','#db2777','#65a30d','#9333ea','#0f766e'];
const firstNameSex = {
  // Filles
  'emma':'F','chloe':'F','chloé':'F','jade':'F','lina':'F','manon':'F','zoe':'F','zoé':'F','camille':'F','sarah':'F','ines':'F','inès':'F','clara':'F','louise':'F','elise':'F','élise':'F','lea':'F','léa':'F','lucie':'F','nina':'F','anais':'F','anaïs':'F','eva':'F','juliette':'F','maelys':'F','maëlys':'F','margaux':'F','oceane':'F','océane':'F','alice':'F','romane':'F','agathe':'F','alice':'F','martin':'A',
  // Garçons
  'leo':'G','léo':'G','nathan':'G','louis':'G','hugo':'G','noah':'G','gabriel':'G','ethan':'G','mathis':'G','tom':'G','lucas':'G','mael':'G','maël':'G','adam':'G','sacha':'G','arthur':'G','enzo':'G','paul':'G','theo':'G','théo':'G','raphael':'G','raphaël':'G','milan':'G','axel':'G','valentin':'G','baptiste':'G','yanis':'G','maxime':'G','kylian':'G','tiago':'G','samir':'G'
};
function colorFor(i){ return palette[i % palette.length]; }
function normName(s){ return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function inferSex(fullName){
  const words=String(fullName||'').replace(/[-']/g,' ').split(/\s+/).filter(Boolean);
  for(const w of words){ const raw=w.toLowerCase(); if(firstNameSex[raw] && firstNameSex[raw]!=='A') return firstNameSex[raw]; }
  for(const w of words){ const n=normName(w); if(firstNameSex[n] && firstNameSex[n]!=='A') return firstNameSex[n]; }
  return 'A';
}

function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),1800); }
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden')); $(id).classList.remove('hidden'); }
function currentClass(){ return state.classes.find(c=>c.id===state.currentClassId); }

$('#enterApp').onclick=()=>{show('#classesScreen'); renderClasses();};
$('#backToClasses').onclick=()=>{show('#classesScreen'); renderClasses();};
$('#backToStudents').onclick=()=>{show('#studentsScreen'); renderStudents();};
$('#openCalculator').onclick=()=>$('#calculatorDialog').showModal();
$('#openOptions').onclick=()=>openOptions();
$('#newGroups').onclick=()=>openOptions();
$('#groupMode').onchange=()=>$('#mixedOptions').classList.toggle('hidden', $('#groupMode').value!=='mixed');

$('#addClass').onclick=()=>{
  const name=$('#className').value.trim();
  const raw=$('#classList').value.trim();
  if(!name) return toast('Nom de classe obligatoire');
  const students = raw ? raw.split(/\n+/).map(line=>parseStudent(line)).filter(Boolean) : [];
  state.classes.push({id:uid(), name, students, color: colorFor(state.classes.length)}); save();
  $('#className').value=''; $('#classList').value=''; renderClasses(); toast('Classe créée');
};
function parseStudent(line){
  const parts=line.split(/[;,\t]/).map(x=>x.trim()).filter(Boolean);
  if(!parts[0]) return null;
  const explicit=(parts[1]||'').toUpperCase();
  const sex=explicit.startsWith('F')?'F':(explicit.startsWith('G')||explicit.startsWith('M'))?'G':inferSex(parts[0]);
  const level=Math.min(5,Math.max(1,parseInt(parts[2]||'3',10)||3));
  return {id:uid(), name:parts[0], sex, level};
}
function renderClasses(){
  const grid=$('#classGrid'); grid.innerHTML='';
  if(!state.classes.length) grid.innerHTML='<div class="panel"><h3>Aucune classe</h3><p>Créez votre premier dossier classe en collant une liste.</p></div>';
  state.classes.forEach((c,i)=>{
    if(!c.color) c.color=colorFor(i);
    const card=document.createElement('article'); card.className='class-card';
    card.style.setProperty('--classColor', c.color);
    card.innerHTML=`<div class="folder"></div><h3>${escapeHtml(c.name)}</h3><p>${c.students.length} élèves</p>`;
    card.onclick=()=>{ state.currentClassId=c.id; save(); show('#studentsScreen'); renderStudents(); };
    grid.appendChild(card);
  });
}
function renderStudents(){
  const c=currentClass(); if(!c) return;
  $('#currentClassTitle').textContent=c.name;
  const body=$('#studentTable'); body.innerHTML='';
  c.students.forEach((s,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><input value="${escapeAttr(s.name)}" data-i="${i}" data-k="name"></td><td><select data-i="${i}" data-k="sex"><option ${s.sex==='G'?'selected':''}>G</option><option ${s.sex==='F'?'selected':''}>F</option><option ${s.sex==='A'?'selected':''}>A</option></select></td><td><select data-i="${i}" data-k="level">${[1,2,3,4,5].map(n=>`<option ${s.level==n?'selected':''}>${n}</option>`).join('')}</select></td><td><button class="btn danger" data-del="${i}">×</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('input,select').forEach(el=>el.onchange=e=>{ const s=c.students[e.target.dataset.i]; const k=e.target.dataset.k; s[k]=k==='level'?parseInt(e.target.value,10):e.target.value; if(k==='name' && (!s.sex || s.sex==='A')) s.sex=inferSex(s.name); save(); renderStudents(); });
  body.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=e=>{c.students.splice(+e.target.dataset.del,1);save();renderStudents();});
}
$('#addStudent').onclick=()=>{ const c=currentClass(); c.students.push({id:uid(),name:'Nouvel élève',sex:'A',level:3}); save(); renderStudents(); };
// Si le prénom est modifié, on tente une proposition automatique du sexe uniquement si l'élève était encore non attribué.

$('#saveStudents').onclick=()=>{ save(); toast('Liste sauvegardée'); };
$('#deleteClass').onclick=()=>{ if(confirm('Supprimer cette classe ?')){ state.classes=state.classes.filter(c=>c.id!==state.currentClassId); state.currentClassId=null; save(); show('#classesScreen'); renderClasses(); } };

function openOptions(){ const c=currentClass(); if(!c || !c.students.length) return toast('Ajoutez des élèves avant de créer des groupes'); $('#optionsDialog').showModal(); }
$('#generateGroups').onclick=e=>{ e.preventDefault(); generate(); $('#optionsDialog').close(); show('#groupsScreen'); renderGroups(); };
function generate(){
  const c=currentClass(), count=Math.max(1,+$('#groupCount').value||1), mode=$('#groupMode').value;
  let students=c.students.map(s=>({...s}));
  let groups=Array.from({length:count},(_,i)=>({id:uid(), name:`Groupe ${i+1}`, students:[], memo:'', color: colorFor(i)}));
  state.available = [];
  if(mode==='manual') { state.groups=groups; state.available=shuffle(students); $('#modeLabel').textContent='Manuel'; save(); return; }
  if(mode==='random') distribute(shuffle(students),groups);
  if(mode==='mixed') mixed(students,groups,$('#girlsRule').value,$('#boysRule').value);
  if(mode==='heterogeneous') heterogeneous(students,groups);
  if(mode==='homogeneous') homogeneous(students,groups);
  state.groups=groups; $('#modeLabel').textContent=label(mode); save();
}
function distribute(list,groups){ list.forEach((s,i)=>groups[i%groups.length].students.push(s)); }
function ruleInfo(rule){
  if(!rule || rule==='random') return {type:'random', n:null};
  const m=rule.match(/^(min|max|exact)(\d+)$/);
  return m ? {type:m[1], n:+m[2]} : {type:'random', n:null};
}
function countSex(group, sex){ return group.students.filter(x=>x.sex===sex).length; }
function smallestGroup(groups){ return [...groups].sort((a,b)=>a.students.length-b.students.length)[0]; }
function mixed(students,groups,girlsRule,boysRule){
  const girls=shuffle(students.filter(s=>s.sex==='F'));
  const boys=shuffle(students.filter(s=>s.sex==='G'));
  const other=shuffle(students.filter(s=>s.sex!=='G'&&s.sex!=='F'));
  const gr=ruleInfo(girlsRule), br=ruleInfo(boysRule);
  placeSex(girls, groups, 'F', gr);
  placeSex(boys, groups, 'G', br);
  const remaining=[...girls.splice(0),...boys.splice(0),...other];
  distributeRespectingRules(remaining,groups,gr,br);
}
function placeSex(list, groups, sex, rule){
  if(rule.type==='min' || rule.type==='exact'){
    groups.forEach(g=>{
      while(list.length && countSex(g,sex)<rule.n) g.students.push(list.shift());
    });
  }
}
function canAddByRules(group, student, gr, br){
  const sex=student.sex;
  if(sex==='F' && gr.type==='exact' && countSex(group,'F')>=gr.n) return false;
  if(sex==='G' && br.type==='exact' && countSex(group,'G')>=br.n) return false;
  if(sex==='F' && gr.type==='max' && countSex(group,'F')>=gr.n) return false;
  if(sex==='G' && br.type==='max' && countSex(group,'G')>=br.n) return false;
  return true;
}
function distributeRespectingRules(list, groups, gr, br){
  list.forEach(s=>{
    const candidates=[...groups].filter(g=>canAddByRules(g,s,gr,br)).sort((a,b)=>a.students.length-b.students.length);
    (candidates[0]||smallestGroup(groups)).students.push(s);
  });
}
function heterogeneous(students,groups){ const sorted=shuffle(students).sort((a,b)=>b.level-a.level); sorted.forEach((s,i)=>{ const wave=Math.floor(i/groups.length); const idx=wave%2===0?i%groups.length:groups.length-1-(i%groups.length); groups[idx].students.push(s); }); }
function homogeneous(students,groups){ const sorted=shuffle(students).sort((a,b)=>b.level-a.level); distribute(sorted,groups); groups.forEach(g=>g.students.sort((a,b)=>b.level-a.level)); }
function renderGroups(){
  const c=currentClass(); $('#groupTitle').textContent=c.name; const box=$('#groupsContainer'); box.innerHTML='';
  const isManual=($('#modeLabel').textContent||'').toLowerCase().includes('manuel');
  $('#manualBench').classList.toggle('hidden', !isManual);
  renderAvailable(isManual);
  state.groups.forEach((g,gi)=>{
    if(!g.color) g.color=colorFor(gi);
    const card=document.createElement('article'); card.className='group-card'; card.dataset.gi=gi; card.style.setProperty('--groupColor', g.color);
    card.innerHTML=`<h3>${g.name}<span>${g.students.length}</span></h3>${groupStatsHtml(g)}<div class="dropzone"></div><textarea class="memo" placeholder="Mémo : observations, score, rôle, points...">${escapeHtml(g.memo||'')}</textarea>`;
    const zone=card.querySelector('.dropzone');
    g.students.forEach((s,si)=>zone.appendChild(studentPill(s,{type:'group',gi,si})));
    card.dataset.dropType='group';
    card.dataset.dropGi=gi;
    card.addEventListener('dragover',e=>e.preventDefault());
    card.addEventListener('drop',()=>moveDragged({type:'group',gi}));
    card.querySelector('.memo').oninput=e=>{state.groups[gi].memo=e.target.value;save();};
    box.appendChild(card);
  });
}
function renderAvailable(active){
  const bench=$('#availableStudents'); if(!bench) return; bench.innerHTML='';
  if(!active) return;
  if(!state.available) state.available=[];
  if(!state.available.length) bench.innerHTML='<p class="empty-bench">Tous les élèves sont placés. Glissez un élève ici pour le rendre disponible.</p>';
  state.available.forEach((s,si)=>bench.appendChild(studentPill(s,{type:'available',si})));
  bench.dataset.dropType='available';
  bench.addEventListener('dragover',e=>e.preventDefault());
  bench.ondrop=()=>moveDragged({type:'available'});
}
function studentPill(s,origin){
  const p=document.createElement('div'); p.className='student-pill'; p.draggable=true;
  p.dataset.originType=origin.type;
  if(origin.type==='group'){ p.dataset.originGi=origin.gi; p.dataset.originSi=origin.si; }
  if(origin.type==='available'){ p.dataset.originSi=origin.si; }
  p.innerHTML=`<strong>${escapeHtml(s.name)}</strong><span>${s.sex} · ${s.level}</span>`;
  p.addEventListener('dragstart',()=>{dragged=origin; p.classList.add('dragging')});
  p.addEventListener('dragend',()=>p.classList.remove('dragging'));
  p.addEventListener('pointerdown', e=>startTouchDrag(e,p,origin));
  return p;
}
function groupStatsHtml(g){
  const total=g.students.length;
  const boys=g.students.filter(s=>s.sex==='G').length;
  const girls=g.students.filter(s=>s.sex==='F').length;
  const other=total-boys-girls;
  const avg=total ? (g.students.reduce((sum,s)=>sum+(+s.level||3),0)/total).toFixed(1).replace('.',',') : '—';
  return `<div class="group-stats"><span>👦 ${boys}</span><span>👧 ${girls}</span>${other?`<span>?</span>`:''}<span>Ø ${avg}</span></div>`;
}
function startTouchDrag(e, pill, origin){
  if(e.pointerType === 'mouse') return;
  if(touchDrag) return;
  const startX=e.clientX, startY=e.clientY;
  let ghost=null, active=false;
  const timer=setTimeout(()=>{
    active=true; dragged=origin;
    pill.classList.add('dragging','touch-source');
    ghost=pill.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width=pill.getBoundingClientRect().width+'px';
    document.body.appendChild(ghost);
    moveGhost(e.clientX,e.clientY);
    if(navigator.vibrate) navigator.vibrate(20);
  },220);
  function cleanup(){
    clearTimeout(timer);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', cleanup);
    pill.classList.remove('dragging','touch-source');
    document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
    if(ghost) ghost.remove();
    touchDrag=null;
  }
  function onMove(ev){
    if(!active && Math.hypot(ev.clientX-startX, ev.clientY-startY)>12){ cleanup(); return; }
    if(!active) return;
    ev.preventDefault();
    moveGhost(ev.clientX,ev.clientY);
    highlightDropTarget(ev.clientX,ev.clientY);
  }
  function onUp(ev){
    if(active){
      ev.preventDefault();
      const target=getDropTarget(ev.clientX,ev.clientY);
      cleanup();
      if(target) moveDragged(target); else { dragged=null; renderGroups(); }
    } else cleanup();
  }
  function moveGhost(x,y){ if(ghost){ ghost.style.left=x+'px'; ghost.style.top=y+'px'; } }
  touchDrag={origin};
  document.addEventListener('pointermove', onMove, {passive:false});
  document.addEventListener('pointerup', onUp, {passive:false});
  document.addEventListener('pointercancel', cleanup);
}
function getDropTarget(x,y){
  const ghost=document.querySelector('.drag-ghost'); if(ghost) ghost.style.pointerEvents='none';
  const el=document.elementFromPoint(x,y);
  if(ghost) ghost.style.pointerEvents='none';
  const bench=el?.closest('#availableStudents');
  if(bench && !$('#manualBench').classList.contains('hidden')) return {type:'available'};
  const card=el?.closest('.group-card');
  if(card) return {type:'group', gi:+card.dataset.gi};
  return null;
}
function highlightDropTarget(x,y){
  document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
  const t=getDropTarget(x,y);
  if(!t) return;
  if(t.type==='available') $('#availableStudents')?.classList.add('drop-target');
  if(t.type==='group') document.querySelector(`.group-card[data-gi="${t.gi}"]`)?.classList.add('drop-target');
}
function moveDragged(target){
  if(!dragged) return;
  let s=null;
  if(dragged.type==='available') s=state.available.splice(dragged.si,1)[0];
  if(dragged.type==='group') s=state.groups[dragged.gi].students.splice(dragged.si,1)[0];
  if(!s) return;
  if(target.type==='available') state.available.push(s);
  if(target.type==='group') state.groups[target.gi].students.push(s);
  dragged=null; save(); renderGroups();
}
function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
function label(m){ return {random:'Aléatoire',mixed:'Mixte',heterogeneous:'Hétérogène',homogeneous:'Homogène',manual:'Manuel'}[m]||'Groupes'; }
function escapeHtml(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;');}

let calc='0';
document.querySelectorAll('.calc-grid button').forEach(b=>b.onclick=()=>{ const v=b.textContent; if(v==='C') calc='0'; else if(v==='='){ try{ calc=String(Function('return '+calc.replace(/[^0-9+\-*/.()]/g,''))()); }catch{ calc='Erreur'; } } else calc=(calc==='0'||calc==='Erreur')?v:calc+v; $('#calcDisplay').value=calc; });
// Mise à jour douce des anciennes données stockées localement
if(!state.available) state.available=[]; state.classes.forEach((c,i)=>{ if(!c.color) c.color=colorFor(i); c.students?.forEach(s=>{ if(!s.sex || s.sex==='A') s.sex=inferSex(s.name); }); }); save();
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); }

// Aide disponible sur toutes les pages
function openHelp(){ const d = document.querySelector('#helpDialog'); if(d) d.showModal(); }
document.querySelectorAll('[data-help]').forEach(btn=>btn.addEventListener('click', openHelp));
const helpCover = document.querySelector('#helpCover');
if(helpCover) helpCover.addEventListener('click', openHelp);
