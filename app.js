var histReady=false;
/* ---------- helpers ---------- */
const SEED=[{id:'O',name:'기본',c:['#081F5C','#3B6FD1','#2F7D5B','#B9660F','#C0323B','#6B4FB8','#0E8A8A','#8A6D3B']},{id:'A',name:'클래식 네이비',c:['#1F3A93','#3A7BD5','#2E8B6E','#D48A2F','#C94F58','#7A5AC8','#2A9D9F','#8C7351']},
  {id:'B',name:'애플 캘린더',c:['#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#007AFF','#5856D6','#AF52DE']},
  {id:'C',name:'뮤트 파스텔',c:['#5B6FB5','#6FA3D8','#7DB09A','#D9A36B','#D07C82','#A08BCB','#6FB3B8','#A89076']},
  {id:'E',name:'모노 블루',c:['#0B1F5C','#2A4A9C','#4F72C2','#7D9CD8','#A9BEE6','#C0323B','#2F7D5B','#6B7280']}];
let PRESET=SEED[0].c;let themes=[];
const saveThemes=()=>{if(histReady)pushHist();LS('planner.themes',JSON.stringify(themes))};
const themeById=id=>themes.find(t=>t.id===id);
const hex2rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
let dark=false;
const tint=h=>{if(dark){let[H,S,L]=rgb2hsl(...hex2rgb(h));return `hsl(${Math.round(H*360)} ${Math.round(Math.min(S,.32)*100)}% 21%)`}const[r,g,b]=hex2rgb(h);const m=v=>Math.round(255+(v-255)*.15);return `rgb(${m(r)},${m(g)},${m(b)})`};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromYmd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=fromYmd(s);d.setDate(d.getDate()+n);return ymd(d)};
const dayDiff=(a,b)=>Math.round((fromYmd(b)-fromYmd(a))/864e5);
const mins=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
const toT=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtT=t=>{let[h,m]=t.split(':').map(Number);const ap=h<12?'오전':'오후';h=h%12||12;return m?`${ap} ${h}:${pad(m)}`:`${ap} ${h}시`};
const DOW=['일','월','화','수','목','금','토'];
const fmtD=s=>{const d=fromYmd(s);return `${d.getMonth()+1}/${d.getDate()} ${DOW[d.getDay()]}`};
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=s=>document.querySelector(s);
const HH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'));
const WS=()=>(typeof prefs==='object'&&prefs.wstart)||0;
const startOfWeek=d=>{const s=new Date(d);s.setDate(d.getDate()-((d.getDay()-WS()+7)%7));s.setHours(0,0,0,0);return s};
const D0=()=>prefs.dayStart*60,D1=()=>prefs.dayEnd*60;
const topOf=m=>`calc(${(m-D0())/60} * var(--hh))`;
const hOf=m=>`calc(${m/60} * var(--hh))`;
const weekDays=d=>{const s=startOfWeek(d);return [...Array(7)].map((_,k)=>{const x=new Date(s);x.setDate(s.getDate()+k);return ymd(x)})};
const todayStr=ymd(new Date());
let lsFail=false;
function lsWarn(on){if(lsFail===on)return;lsFail=on;const b=document.getElementById('lsbar');if(b)b.classList.toggle('hide',!on)}
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);lsWarn(false)}catch(e){lsWarn(true);return null}};
try{localStorage.setItem('planner.probe','1');localStorage.removeItem('planner.probe')}catch(e){setTimeout(()=>lsWarn(true),0)}
const J=(k,def)=>{try{const v=JSON.parse(LS(k)||'null');return v==null?def:v}catch(e){return def}};

/* ---------- in-app dialogs (replace confirm/alert/prompt) ---------- */
function dlg(o){return new Promise(res=>{$('#d-title').textContent=o.title||'';$('#d-text').textContent=o.text||'';$('#d-text').classList.toggle('hide',!o.text);
  $('#d-inwrap').classList.toggle('hide',!o.input);$('#d-in').value=o.value||'';$('#d-ok').textContent=o.ok||'확인';$('#d-ok').classList.toggle('danger',!!o.danger);$('#d-ok').classList.toggle('primary',!o.danger);
  $('#d-cancel').classList.toggle('hide',!!o.alert);$('#dov').classList.add('on');
  const done=v=>{$('#dov').classList.remove('on');res(v)};
  $('#d-ok').onclick=()=>done(o.input?$('#d-in').value:true);$('#d-cancel').onclick=()=>done(o.input?null:false);$('#dov').onclick=e=>{if(e.target.id==='dov')done(o.input?null:false)};
  $('#d-in').onkeydown=e=>{if(e.key==='Enter')$('#d-ok').click()};setTimeout(()=>(o.input?$('#d-in'):$('#d-ok')).focus(),30)})}
const ask=(title,text,ok,danger)=>dlg({title,text,ok,danger});
const tell=(title,text)=>dlg({title,text,alert:true});
const askText=(title,value)=>dlg({title,input:true,value,ok:'저장'});

/* ---------- prefs / theme ---------- */
let prefs=Object.assign({theme:'auto',todoView:'list',pal:'O',def:'O',dayStart:0,dayEnd:24,wstart:0,holidays:true,terms:true,lunar:true,fold:{},tfold:{},subDel:[],mexpand:false,monthTime:true},J('planner.prefs',{}));
const savePrefs=()=>LS('planner.prefs',JSON.stringify(prefs));
themes=J('planner.themes',[]);if(prefs.seeded!==2){SEED.forEach((t,k)=>{if(!themes.some(x=>x.id===t.id))themes.splice(k,0,{...t,c:t.c.slice()})});prefs.seeded=2;savePrefs();saveThemes()}
if(!themeById(prefs.def))prefs.def=themes[0].id;if(!themeById(prefs.pal))prefs.pal=prefs.def;PRESET=themeById(prefs.pal).c;
const themeBg=()=>{const t=themeById(prefs.pal);return t&&t.bg||null};
const lum=h=>{const[r,g,b]=hex2rgb(h);return (0.2126*r+0.7152*g+0.0722*b)/255};
function applyBg(){const bg=themeBg();const r=document.documentElement.style;
  const vars=['--bg','--surface','--side','--hover','--hover-2','--sel','--line','--line-2','--fill','--fill-2'];if(!bg){vars.forEach(v=>r.removeProperty(v));return}
  const[R,G,B]=hex2rgb(bg);const mix=(amt,to)=>`rgb(${[R,G,B].map(v=>Math.round(v+(to-v)*amt)).join(',')})`;const k=dark?255:0;
  r.setProperty('--bg',bg);r.setProperty('--surface',dark?mix(.04,255):bg);r.setProperty('--side',mix(dark?.02:.03,k));r.setProperty('--hover',mix(dark?.03:.02,k));r.setProperty('--hover-2',mix(dark?.07:.05,k));
  r.setProperty('--sel',mix(dark?.1:.08,k));r.setProperty('--line',mix(dark?.07:.07,k));r.setProperty('--line-2',mix(dark?.12:.12,k));r.setProperty('--fill',mix(dark?.07:.05,k));r.setProperty('--fill-2',mix(dark?.11:.08,k))}
function applyPalette(key){const old=PRESET;const nw=themeById(key).c;
  cats.forEach(c=>{const k=old.indexOf(c.color);if(k>=0)c.color=nw[k]});
  items.forEach(i=>{if(i.color){const k=old.indexOf(i.color);if(k>=0)i.color=nw[k]}});
  prefs.pal=key;PRESET=nw;savePrefs();saveCats();save();applyTheme();render()}
function applyTheme(){dark=prefs.theme==='dark'||(prefs.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
  const bg=typeof themeBg==='function'?themeBg():null;if(bg)dark=lum(bg)<0.5;
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.querySelectorAll('#modeseg button').forEach(b=>b.classList.toggle('on',b.dataset.m===prefs.theme));if(typeof applyBg==='function')applyBg()}
document.querySelectorAll('#modeseg button').forEach(b=>b.onclick=()=>{prefs.theme=b.dataset.m;savePrefs();applyTheme();render()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{applyTheme();render()});
function paintPal(){const l=$('#pal-list');l.innerHTML='';themes.forEach(v=>{const k=v.id;const isDef=prefs.def===k;const r=document.createElement('div');r.className='pal-row'+(prefs.pal===k?' on':'');
  r.innerHTML=`<span class="nm">${esc(v.name)}${isDef?' <small style="color:var(--text-3);font-weight:500">기본</small>':''}</span><span class="sw">${v.bg?`<i style="background:${v.bg};border-radius:4px;box-shadow:inset 0 0 0 1px var(--line-2);margin-right:4px"></i>`:''}${v.c.map(c=>`<i style="background:${c}"></i>`).join('')}</span>`;r.onclick=()=>{applyPalette(k);paintPal()};
  const mo=document.createElement('button');mo.className='mo';mo.textContent='⋯';mo.onclick=e=>{e.stopPropagation();openMenu(mo,m=>{
    m.appendChild(menuItem('편집',()=>openThemeEditor(v)));
    m.appendChild(menuItem('복제',()=>{themes.push({id:uid(),name:v.name+' 복사',c:v.c.slice(),bg:v.bg});saveThemes();paintPal()}));
    if(!isDef){m.appendChild(menuItem('기본으로 설정',()=>{prefs.def=k;savePrefs();paintPal()}));m.appendChild(document.createElement('hr'));
      m.appendChild(menuItem('삭제',async()=>{if(await ask('테마 삭제',`"${v.name}"을(를) 삭제할까요?`,'삭제',true)){if(prefs.pal===k)applyPalette(prefs.def);themes=themes.filter(t=>t.id!==k);saveThemes();paintPal()}}))}})};
  r.appendChild(mo);l.appendChild(r)})}
let teTarget=null,teColors=[],teBg={};
function openThemeEditor(t){teTarget=t;teColors=t.c.slice();teBg={bg:t.bg||null};$('#te-name').value=t.name;$('#tev').classList.add('on');paintTE();setTimeout(()=>$('#te-name').focus(),30)}
function paintTE(){const w=$('#te-colors');w.innerHTML='';teColors.forEach((c,k)=>{const d=document.createElement('div');d.className='te-sw';d.style.background=c;d.innerHTML=`<input type="color" value="${c}">`;
  d.querySelector('input').oninput=e=>{teColors[k]=e.target.value.toUpperCase();d.style.background=teColors[k]};w.appendChild(d)});
  {const b=$('#te-bg');b.innerHTML='';const v=teBg.bg;const d=document.createElement('div');d.className='te-sw'+(v?'':' none');if(v)d.style.background=v;
    d.innerHTML=`<input type="color" value="${v||(dark?'#1A1A1D':'#FFFFFF')}">`;d.querySelector('input').oninput=e=>{teBg.bg=e.target.value.toUpperCase();paintTE()};b.appendChild(d);
    const r=document.createElement('button');r.textContent=v?'지우기':'없음';r.onclick=()=>{teBg.bg=null;paintTE()};b.appendChild(r)}}
$('#te-cancel').onclick=()=>$('#tev').classList.remove('on');$('#tev').onclick=e=>{if(e.target.id==='tev')$('#tev').classList.remove('on')};
$('#te-save').onclick=()=>{if(!teTarget)return;teTarget.name=$('#te-name').value.trim()||'테마';const wasActive=prefs.pal===teTarget.id;const old=teTarget.c.slice();teTarget.c=teColors.slice();teTarget.bg=teBg.bg||undefined;saveThemes();
  if(wasActive){cats.forEach(c=>{const k=old.indexOf(c.color);if(k>=0)c.color=teTarget.c[k]});items.forEach(i=>{if(i.color){const k=old.indexOf(i.color);if(k>=0)i.color=teTarget.c[k]}});PRESET=teTarget.c;saveCats();save();applyTheme();render()}
  $('#tev').classList.remove('on');paintPal()};
$('#pnew').onclick=()=>{const t={id:uid(),name:'새 테마',c:PRESET.slice()};themes.push(t);saveThemes();paintPal();openThemeEditor(t)};


/* ---------- categories / palette ---------- */
let cats=J('planner.cats',[]);
if(!cats.length)cats=[{id:'c1',name:'개인',color:'#081F5C',on:true},{id:'c2',name:'학교',color:'#3B6FD1',on:true},{id:'c3',name:'공부',color:'#2F7D5B',on:true}];
const saveCats=()=>{if(histReady)pushHist();LS('planner.cats',JSON.stringify(cats))};
const catOf=i=>cats.find(c=>c.id===i.cat)||cats[0];
const colorOf=i=>i.color||catOf(i).color;
const rgb2hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b);let h=0,s=0,l=(M+m)/2;if(M!==m){const d=M-m;s=l>.5?d/(2-M-m):d/(M+m);h=M===r?((g-b)/d+(g<b?6:0)):M===g?((b-r)/d+2):((r-g)/d+4);h/=6}return[h,s,l]};
const lift=h=>{let[H,S,L]=rgb2hsl(...hex2rgb(h));if(dark){L=Math.max(L,.7);S=Math.min(Math.max(S,.45),.75)}else{if(L<=.5)return h;L=Math.min(L,.42);S=Math.max(S,.4)}return `hsl(${Math.round(H*360)} ${Math.round(S*100)}% ${Math.round(L*100)}%)`};
const paint=(el,i)=>{const c=colorOf(i);el.style.setProperty('--evc',lift(c));el.style.setProperty('--evbg',tint(c))};
let palette=J('planner.palette',['#C0323B','#B9660F','#6B4FB8','#0E8A8A']);
const savePalette=()=>LS('planner.palette',JSON.stringify(palette));
let templates=J('planner.templates',[]);
const saveTemplates=()=>{if(histReady)pushHist();LS('planner.templates',JSON.stringify(templates))};
/* shared color picker: fixed = non-deletable list, auto = show category-color swatch */
function colorPicker(w,cur,onPick,opt){w.innerHTML='';
  if(opt.auto){const a=document.createElement('div');a.className='sw auto'+(cur?'':' on');a.style.setProperty('--c',opt.auto);a.title='카테고리 색';a.onclick=()=>onPick(null);w.appendChild(a)}
  (opt.fixed||[]).forEach(c=>{const b=document.createElement('div');b.className='sw'+(cur===c?' on':'');b.style.background=c;b.onclick=()=>onPick(c);w.appendChild(b)});
  palette.forEach(c=>{if((opt.fixed||[]).includes(c))return;const b=document.createElement('div');b.className='sw'+(cur===c?' on':'');b.style.background=c;b.title=c;b.onclick=()=>onPick(c);
    const x=document.createElement('span');x.className='x';x.textContent='✕';x.title='삭제';x.onclick=e=>{e.stopPropagation();palette=palette.filter(p=>p!==c);savePalette();onPick(cur===c?null:cur)};b.appendChild(x);w.appendChild(b)});
  if(cur&&!palette.includes(cur)&&!(opt.fixed||[]).includes(cur)){const b=document.createElement('div');b.className='sw on';b.style.background=cur;w.appendChild(b)}
  const l=document.createElement('label');l.innerHTML='+<input type="color" value="'+(cur||opt.auto||'#3B6FD1')+'">';
  l.querySelector('input').onchange=e=>{const c=e.target.value.toUpperCase();if(!palette.includes(c)&&!(opt.fixed||[]).includes(c))palette.push(c);savePalette();onPick(c)};w.appendChild(l)}

/* ---------- data ---------- */
let items=J('planner.items',[]);
items.forEach((i,k)=>{if(i.type==='rem'){i.type='todo';i.bucket='scheduled'}
  if(i.type==='todo'){if(i.bucket==='now'||i.bucket==='week'||!i.bucket)i.bucket=i.date?'scheduled':'later';if(i.bucket==='scheduled'&&!i.date)i.bucket='soon'}
  if(!i.cat||!cats.find(c=>c.id===i.cat)){const byColor=cats.find(c=>c.color===i.color);i.cat=byColor?byColor.id:cats[0].id;if(byColor)i.color=null}
  if(typeof i.color!=='string')i.color=null;if(i.order==null)i.order=k;if(!Array.isArray(i.subs))i.subs=[];i.draft=!!i.draft;
  if(i.type==='event'&&!i.style)i.style='normal';if(i.type==='todo'&&i.block===undefined){i.block=null;i.blockOcc=null}
  if(!Array.isArray(i.alerts)){i.alerts=[];if(i.alert!=null){const timed=i.start&&!i.allday;i.alerts.push(timed?{m:i.alert}:{d:Math.round(i.alert/720),t:'09:00'})}delete i.alert}});
if(!items.length){
  const ts=todayStr;const tm=addDays(ts,2);const wk=weekDays(new Date());
  items=[
    {type:'event',title:'수학',date:wk[1],start:'09:00',end:'09:50',cat:'c2',rep:{freq:'weekly',days:[1,3,5],until:null}},
    {type:'event',title:'영어',date:wk[2],start:'10:00',end:'10:50',cat:'c2',rep:{freq:'weekly',days:[2,4],until:null}},
    {type:'event',title:'운동',date:wk[0],start:'19:00',end:'20:00',cat:'c1',rep:{freq:'daily',days:[],until:null}},
    {type:'event',title:'기획 회의',date:ts,start:'14:00',end:'15:30',cat:'c1',note:'주간 로드맵 정리'},
    {type:'event',title:'프로젝트 데드라인',date:ts,allday:true,cat:'c2'},
    {type:'todo',bucket:'scheduled',title:'보고서 제출',date:ts,start:'11:00',cat:'c2'},
    {type:'todo',bucket:'scheduled',title:'치과 예약',date:tm,start:'15:00',cat:'c1'},
    {type:'todo',bucket:'scheduled',title:'도서 반납',date:addDays(ts,-3),start:'17:00',cat:'c1'},
    {type:'todo',bucket:'scheduled',title:'이메일 답장',date:ts,cat:'c1',done:true},
    {type:'todo',bucket:'soon',title:'수학 3단원',cat:'c3',subs:[{id:uid(),title:'개념 정리',done:true},{id:uid(),title:'연습문제 1~20',done:false},{id:uid(),title:'오답 노트',done:false}]},
    {type:'todo',bucket:'later',title:'포트폴리오 정리',cat:'c1'},
    {type:'todo',bucket:'soon',title:'발표 자료 초안',cat:'c2'},
    {type:'todo',bucket:'later',title:'독서 - 1장',cat:'c3'},
    {type:'event',title:'국어 복습',date:wk[3],start:'20:00',end:'21:00',cat:'c3',draft:true},
  ].map((i,k)=>Object.assign({id:uid(),done:false,order:k,subs:[],color:null,draft:false},i));
}
let hist=[],redoStack=[],lastSnap=null;
const snap=()=>JSON.stringify({items,cats,themes,templates});
function pushHist(){const cur=snap();if(lastSnap!==null&&cur!==lastSnap){hist.push(lastSnap);if(hist.length>60)hist.shift();redoStack=[]}lastSnap=cur}
function restore(str){const o=JSON.parse(str);items=o.items;cats=o.cats;if(o.themes)themes=o.themes;if(o.templates)templates=o.templates;
  LS('planner.items',JSON.stringify(items));LS('planner.cats',JSON.stringify(cats));saveThemes();saveTemplates();lastSnap=str;
  if(!themeById(prefs.pal))prefs.pal=prefs.def;PRESET=(themeById(prefs.pal)||{c:SEED[0].c}).c;applyTheme();render()}
function undo(){if(!hist.length)return;redoStack.push(snap());restore(hist.pop())}
function redo(){if(!redoStack.length)return;hist.push(snap());restore(redoStack.pop())}
const save=()=>{syncBlocks();pushHist();LS('planner.items',JSON.stringify(items))};
histReady=true;

let page='cal',mode='cal',view='month',span=1,filter={event:true,todo:true};
let navOpen=LS('planner.nav')==='1';
let cursor=new Date();cursor.setHours(0,0,0,0);

/* ---------- recurrence ---------- */
function occursOn(i,s){
  if(!i.date)return false;if(!i.rep)return i.date===s;
  if(s<i.date)return false;if(i.rep.until&&s>i.rep.until)return false;if((i.skip||[]).includes(s))return false;
  const d=fromYmd(s);
  if(i.rep.freq==='daily')return true;
  if(i.rep.freq==='weekly'){const days=i.rep.days&&i.rep.days.length?i.rep.days:[fromYmd(i.date).getDay()];return days.includes(d.getDay())}
  if(i.rep.freq==='monthly')return d.getDate()===fromYmd(i.date).getDate();
  if(i.rep.freq==='yearly'){const o=fromYmd(i.date);return d.getDate()===o.getDate()&&d.getMonth()===o.getMonth()}
  return false;
}
const spanOf=i=>i.dateEnd&&i.dateEnd>i.date?dayDiff(i.date,i.dateEnd):0;
function occStart(i,s){const n=spanOf(i);for(let k=0;k<=n;k++){const d=addDays(s,-k);if(occursOn(i,d))return d}return null}
const inst=(i,s)=>!i.rep?i:Object.assign(Object.create(i),{date:s,done:(i.doneDates||[]).includes(s),_src:i,_occ:s});
const src=i=>i._src||i;
function repText(i){if(!i.rep)return'';const r=i.rep;if(r.freq==='daily')return'매일';if(r.freq==='monthly')return'매월';if(r.freq==='yearly')return'매년';
  const days=r.days&&r.days.length?r.days:[fromYmd(i.date).getDay()];return'매주 '+days.map(d=>DOW[d]).join('·')}
function nextOcc(i,from){for(let k=0;k<(i.rep&&i.rep.freq==='yearly'?400:400);k++){const s=addDays(from,k);if(occursOn(i,s))return s}return null}
function setDone(i,v){const s=src(i);if(i._src){s.doneDates=s.doneDates||[];const has=s.doneDates.includes(i._occ);if(v&&!has)s.doneDates.push(i._occ);if(!v&&has)s.doneDates=s.doneDates.filter(x=>x!==i._occ)}else s.done=v}
function detach(i,changes){const s=src(i);s.skip=s.skip||[];s.skip.push(i._occ);
  const n=Object.assign(JSON.parse(JSON.stringify(s)),{id:uid(),rep:null,skip:[],doneDates:[],date:i._occ,done:(s.doneDates||[]).includes(i._occ)},changes);items.push(n);return n}
/* shift a recurring series so occurrence `occ` lands on `newDate` with new times */
function shiftSeries(s,occ,ch){const delta=ch.date?dayDiff(occ,ch.date):0;
  const _sp=(s.dateEnd&&s.dateEnd>s.date)?dayDiff(s.date,s.dateEnd):0;
  if(delta){
    if(s.rep.freq==='weekly'){const od=fromYmd(occ).getDay(),nd=fromYmd(ch.date).getDay();let days=s.rep.days&&s.rep.days.length?s.rep.days.slice():[fromYmd(s.date).getDay()];
      days=days.filter(d=>d!==od);if(!days.includes(nd))days.push(nd);s.rep.days=days.sort();if(ch.date<s.date)s.date=ch.date}
    else{s.date=addDays(s.date,delta);if(s.rep.until)s.rep.until=addDays(s.rep.until,delta);s.skip=(s.skip||[]).map(x=>addDays(x,delta));s.doneDates=(s.doneDates||[]).map(x=>addDays(x,delta))}
    if(_sp)s.dateEnd=addDays(s.date,_sp)}
  if(ch.start!=null)s.start=ch.start;if(ch.end!=null)s.end=ch.end}
async function moveItem(i,ch,label){
  if(!i._src){Object.assign(i,ch);return true}
  const scope=await askScope(label||'반복 항목 이동');if(!scope)return false;const s=i._src,occ=i._occ;
  if(scope==='one')detach(i,ch);
  else if(scope==='future'){const prev=addDays(occ,-1);if(prev<s.date)shiftSeries(s,occ,ch);else{s.rep.until=prev;const n=Object.assign(JSON.parse(JSON.stringify(s)),{id:uid(),skip:[],doneDates:[],date:occ});n.rep.until=null;items.push(n);shiftSeries(n,occ,ch)}}
  else shiftSeries(s,occ,ch);
  return true}

/* ---------- 음력 · 24절기 (천문 계산) ---------- */
const RAD=Math.PI/180, p2=v=>String(v).padStart(2,'0');
const jdOf=(y,m,d)=>{if(m<=2){y--;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5};
function ymdOfJd(jd){let z=Math.floor(jd+.5),a=z;
  if(z>=2299161){const al=Math.floor((z-1867216.25)/36524.25);a=z+1+al-Math.floor(al/4)}
  const b=a+1524,c=Math.floor((b-122.1)/365.25),dd=Math.floor(365.25*c),e=Math.floor((b-dd)/30.6001);
  const day=b-dd-Math.floor(30.6001*e),mo=e<14?e-1:e-13,yr=mo>2?c-4716:c-4715;return[yr,mo,day]};
const kday=jd=>Math.floor(jd+9/24+.5);                 /* 한국시 민간일 번호 */
const kjd=n=>n-.5-9/24;                                /* 그 날 0시(KST)의 JD */
const dnOf=s=>{const[y,m,d]=s.split('-').map(Number);return kday(jdOf(y,m,d)+.5)};
const ymdOfDn=n=>{const[y,m,d]=ymdOfJd(n);return `${y}-${p2(m)}-${p2(d)}`};
function sunLong(jd){const T=(jd-2451545)/36525;
  const L0=280.46646+36000.76983*T+.0003032*T*T;
  const M=(357.52911+35999.05029*T-.0001537*T*T)*RAD;
  const C=(1.914602-.004817*T-.000014*T*T)*Math.sin(M)+(.019993-.000101*T)*Math.sin(2*M)+.000289*Math.sin(3*M);
  const Om=(125.04-1934.136*T)*RAD;
  return ((L0+C-.00569-.00478*Math.sin(Om))%360+360)%360}
function termJD(approx,deg){let t=approx;
  for(let i=0;i<10;i++){let d=(deg-sunLong(t))%360;if(d>180)d-=360;if(d<-180)d+=360;t+=d/.9856473;if(Math.abs(d)<1e-7)break}
  return t}
function newMoonJD(k){const T=k/1236.85;
  let jd=2451550.09766+29.530588861*k+.00015437*T*T-.00000015*T*T*T+.00000000073*T*T*T*T;
  const E=1-.002516*T-.0000074*T*T;
  const M=(2.5534+29.1053567*k-.0000014*T*T-.00000011*T*T*T)*RAD;
  const P=(201.5643+385.81693528*k+.0107582*T*T+.00001238*T*T*T-.000000058*T*T*T*T)*RAD;
  const F=(160.7108+390.67050284*k-.0016118*T*T-.00000227*T*T*T+.000000011*T*T*T*T)*RAD;
  const O=(124.7746-1.56375588*k+.0020672*T*T+.00000215*T*T*T)*RAD;
  jd+=-.4072*Math.sin(P)+.17241*E*Math.sin(M)+.01608*Math.sin(2*P)+.01039*Math.sin(2*F)
    +.00739*E*Math.sin(P-M)-.00514*E*Math.sin(P+M)+.00208*E*E*Math.sin(2*M)
    -.00111*Math.sin(P-2*F)-.00057*Math.sin(P+2*F)+.00056*E*Math.sin(2*P+M)
    -.00042*Math.sin(3*P)+.00042*E*Math.sin(M+2*F)+.00038*E*Math.sin(M-2*F)
    -.00024*E*Math.sin(2*P-M)-.00017*Math.sin(O)-.00007*Math.sin(P+2*M)
    +.00004*Math.sin(2*P-2*F)+.00004*Math.sin(3*M)+.00003*Math.sin(P+M-2*F)
    +.00003*Math.sin(2*P+2*F)-.00003*Math.sin(P+M+2*F)+.00003*Math.sin(P-M+2*F)
    -.00002*Math.sin(P-M-2*F)-.00002*Math.sin(3*P+M)+.00002*Math.sin(4*P);
  return jd}
const nmK=k=>kday(newMoonJD(k));
function nmOnOrBefore(dn){let k=Math.round((kjd(dn)-2451550.09766)/29.530588861)+2;while(nmK(k)>dn)k--;return k}
/* 동지가 든 달을 11월로 삼아 한 해의 음력 달을 구성 (무중치윤법) */
const _lc={};
function lunarYear(y){if(_lc[y])return _lc[y];
  const ws0=kday(termJD(jdOf(y-1,12,22)+.5,270)),ws1=kday(termJD(jdOf(y,12,22)+.5,270));
  const k0=nmOnOrBefore(ws0),k1=nmOnOrBefore(ws1),n=k1-k0,ms=[];
  for(let k=k0;k<=k1;k++)ms.push(nmK(k));
  let leapAt=-1;
  if(n===13){for(let i=1;i<n;i++){const a=Math.floor(sunLong(kjd(ms[i]))/30),b=Math.floor(sunLong(kjd(ms[i+1])-1e-6)/30);
    if(a===b){leapAt=i;break}}if(leapAt<0)leapAt=1}
  const out=[];let num=11;
  for(let i=0;i<n;i++){if(i===leapAt)out.push({s:ms[i],e:ms[i+1]-1,n:(num+10)%12+1,leap:true});
    else{out.push({s:ms[i],e:ms[i+1]-1,n:num,leap:false});num=num%12+1}}
  _lc[y]={ms:out};return _lc[y]}
/* 음력 명절의 양력 날짜 */
const _fc={};
function lunarFest(y){if(_fc[y])return _fc[y];const L=lunarYear(y).ms;
  const at=(mo,da)=>{const m=L.find(x=>x.n===mo&&!x.leap&&ymdOfJd(x.s)[0]===y);return m?ymdOfDn(m.s+da-1):null};
  return _fc[y]={seol:at(1,1),chu:at(8,15),bud:at(4,8)}}
function lunarOf(dn){const y0=ymdOfJd(dn)[0];
  for(let y=y0;y<=y0+1;y++){for(const m of lunarYear(y).ms)if(dn>=m.s&&dn<=m.e)return{m:m.n,d:dn-m.s+1,leap:m.leap}}
  return null}
const lunStr=s=>{const l=lunarOf(dnOf(s));return l?`${l.leap?'윤':''}${l.m}.${l.d}`:''};
const TERMS=['춘분','청명','곡우','입하','소만','망종','하지','소서','대서','입추','처서','백로','추분','한로','상강','입동','소설','대설','동지','소한','대한','입춘','우수','경칩'];
const _tc={};
function termsOfYear(y){if(_tc[y])return _tc[y];const m={};
  let t=jdOf(y,1,1)+.5,deg=Math.ceil(sunLong(t)/15)*15;const end=jdOf(y+1,1,1)+.5;
  for(let i=0;i<26;i++){const d=((deg%360)+360)%360,tt=termJD(t+15,d);if(tt>=end)break;
    const dn=kday(tt);if(ymdOfJd(dn)[0]===y)m[ymdOfDn(dn)]=TERMS[d/15];t=tt;deg+=15}
  return _tc[y]=m}
const termOn=s=>(prefs.terms===false||subGone('terms'))?null:(termsOfYear(+s.slice(0,4))[s]||null);

/* ---------- 대한민국 공휴일 ---------- */
const FIXED=[[1,1,'신정'],[3,1,'삼일절'],[5,5,'어린이날'],[6,6,'현충일'],[8,15,'광복절'],[10,3,'개천절'],[10,9,'한글날'],[12,25,'성탄절']];
const SUBOK=['삼일절','어린이날','광복절','개천절','한글날','부처님오신날','성탄절'];
const _holc={};
function holMap(y){
  if(_holc[y])return _holc[y];
  const m={};const add=(s,n)=>{(m[s]=m[s]||[]);if(!m[s].includes(n))m[s].push(n)};
  FIXED.forEach(f=>add(`${y}-${p2(f[0])}-${p2(f[1])}`,f[2]));
  const L=lunarFest(y);
  if(L.seol){add(addDays(L.seol,-1),'설날 연휴');add(L.seol,'설날');add(addDays(L.seol,1),'설날 연휴')}
  if(L.chu){add(addDays(L.chu,-1),'추석 연휴');add(L.chu,'추석');add(addDays(L.chu,1),'추석 연휴')}
  if(L.bud)add(L.bud,'부처님오신날')
  const subs=[];
  Object.keys(m).sort().forEach(s=>{
    const w=fromYmd(s).getDay();let need=false;
    m[s].forEach(n=>{
      const big=n.indexOf('설날')===0||n.indexOf('추석')===0;
      if(big){if(w===0)need=true}
      else if(SUBOK.indexOf(n)>=0){if(w===0||w===6||m[s].length>1)need=true}});
    if(!need)return;
    let d=addDays(s,1),guard=0;
    while(guard++<20&&(m[d]||subs.indexOf(d)>=0||[0,6].indexOf(fromYmd(d).getDay())>=0))d=addDays(d,1);
    subs.push(d)});
  subs.forEach(d=>add(d,'대체공휴일'));
  _holc[y]=m;return m;
}
const holsOn=s=>(prefs.holidays===false||subGone('holidays'))?[]:(holMap(+s.slice(0,4))[s]||[]);
const isHoliday=s=>holsOn(s).length>0;
const SUBS=[{row:'holrow',key:'holidays',name:'대한민국 공휴일',ck:'holColor',get color(){return holColor}},
  {row:'trmrow',key:'terms',name:'24절기',ck:'trmColor',get color(){return trmColor}},
  {row:'lunrow',key:'lunar',name:'음력',ck:'lunColor',get color(){return lunColor}}];
const subGone=k=>(prefs.subDel||[]).includes(k);
const holColor=()=>prefs.holColor||'#D0453B';
const trmColor=()=>prefs.trmColor||'#6E7A8A';
const lunColor=()=>prefs.lunColor||'#98A0AC';
const trmItem=(s,n)=>({id:'trm:'+s,type:'event',title:n,date:s,allday:true,cat:null,color:trmColor(),_hol:true});
const holItem=(s,n)=>({id:'hol:'+s+':'+n,type:'event',title:n,date:s,allday:true,cat:null,color:holColor(),_hol:true});

/* ---------- queries ---------- */
const layerOK=i=>mode==='plan'?true:!i.draft;
const typeOK=i=>i.type==='event'&&i.style==='block'?(filter.event||filter.todo):filter[i.type];
const visible=()=>items.filter(i=>layerOK(i)&&typeOK(i)&&catOf(i).on);
function forDate(s){const out=[];holsOn(s).forEach(n=>out.push(holItem(s,n)));{const t=termOn(s);if(t)out.push(trmItem(s,t))}visible().forEach(i=>{if(i.type==='todo'&&i.block)return;
  if(spanOf(i)){const st=occStart(i,s);if(st===null)return;const o=inst(i,st);o._span={start:st,end:addDays(st,spanOf(i)),on:s};out.push(o);return}
  if(occursOn(i,s))out.push(inst(i,s))});
  return out.sort((a,b)=>{const ab=!!a._span,bb=!!b._span;if(ab!==bb)return ab?-1:1;const at=!!a.allday||!a.start,bt=!!b.allday||!b.start;if(at!==bt)return at?-1:1;return mins(a.start||'00:00')-mins(b.start||'00:00')})}
const byOrder=(a,b)=>a.order-b.order;
const byTime=(a,b)=>(a._nx||a.date||'9999').localeCompare(b._nx||b.date||'9999')||mins(a.start||'00:00')-mins(b.start||'00:00');
const isRef=i=>mode==='plan'&&!src(i).draft;
const blockTodos=(eid,occ)=>{const e=eventById(eid);if(!(filter.todo||(e&&e.style==='block')))return[];return items.filter(t=>t.type==='todo'&&t.block===eid&&t.blockOcc===occ&&layerOK(t)&&catOf(t).on).sort(byOrder)};
const eventById=id=>items.find(x=>x.id===id&&x.type==='event');
function unlink(t){Object.assign(t,{block:null,blockOcc:null,bucket:'soon',date:null,start:''})}
function syncBlocks(){items.forEach(t=>{if(t.type!=='todo'||!t.block)return;const e=eventById(t.block);if(!e){unlink(t);return}
  if(!e.rep){if(t.blockOcc!==e.date){t.blockOcc=e.date;t.date=e.date}}else if(!occursOn(e,t.blockOcc))unlink(t);
  if(t.bucket!=='scheduled'){t.bucket='scheduled';t.date=t.blockOcc}})}
const isDraft=i=>mode==='plan'&&src(i).draft;

/* ---------- nav / header ---------- */
$('#nav-cal').onclick=()=>{page='cal';mode='cal';render()};
$('#nav-plan').onclick=()=>{page='cal';mode='plan';render()};
$('#nav-todo').onclick=()=>{page='todo';render()};
$('#navset').onclick=()=>{page='set';render()};
const toggleNav=()=>{navOpen=!navOpen;LS('planner.nav',navOpen?'1':'0');$('#nav').classList.toggle('open',navOpen);setTimeout(()=>{if(page==='cal'&&view!=='month')render()},200)};
$('#tog').onclick=toggleNav;$('#tog2').onclick=toggleNav;$('#tog3').onclick=toggleNav;
function weekNo(d){const first=new Date(d.getFullYear(),d.getMonth(),1);return Math.ceil((d.getDate()+first.getDay())/7)}
let _mctx=null;
function measureTitle(txt){const el=$('#title');if(!_mctx)_mctx=document.createElement('canvas').getContext('2d');
  const cs=getComputedStyle(el);_mctx.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return Math.ceil(_mctx.measureText(txt).width)+2}
function renderTitle(){
  const y=cursor.getFullYear(),m=cursor.getMonth()+1,d=cursor.getDate();
  const t=view==='month'?`${y}년 ${m}월`:view==='week'?`${y}년 ${m}월 ${weekNo(cursor)}주차`:`${m}월 ${d}일 ${DOW[cursor.getDay()]}요일`;
  const el=$('#title');el.innerHTML=(mode==='plan'?'<span class="pre">계획</span><span class="dot">·</span>':'')+`<span class="tt">${esc(t)}</span>`;
  const longest=view==='month'?'2026년 10월':view==='week'?'2026년 10월 5주차':'10월 29일 토요일';
  const pre=el.querySelector('.pre');
  el.style.minWidth=(measureTitle(longest)+(pre?(pre.offsetWidth+el.querySelector('.dot').offsetWidth+12):0))+'px';
}
function shift(n){if(view==='month')cursor.setMonth(cursor.getMonth()+n);else if(view==='week')cursor.setDate(cursor.getDate()+7*n);else cursor.setDate(cursor.getDate()+n);render()}
$('#prev').onclick=()=>shift(-1);$('#next').onclick=()=>shift(1);
$('#sidetog').onclick=()=>{prefs.sideOpen=!(prefs.sideOpen!==false);savePrefs();render()};
$('#today').onclick=()=>{cursor=new Date();cursor.setHours(0,0,0,0);render()};
$('#seg').querySelectorAll('button').forEach(b=>b.onclick=()=>{view=b.dataset.v;render()});
$('#filter').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter[b.dataset.f]=!filter[b.dataset.f];render()});
document.addEventListener('keydown',e=>{
  if($('#dpop').classList.contains('on')&&e.key==='Escape'){closeDpop();return}
  if(document.querySelector('.ov.on')){if(e.key==='Escape'){if($('#dov').classList.contains('on'))$('#d-cancel').click();else if(!$('#sov').classList.contains('on'))document.querySelectorAll('.ov.on').forEach(o=>o.classList.remove('on'))}return}
  if($('#srch').classList.contains('on'))return;
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')){e.preventDefault();openSearch();return}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(page!=='cal')return;
  if(e.key==='ArrowLeft')shift(-1);if(e.key==='ArrowRight')shift(1);if(e.key==='t')$('#today').click();
});
function menuItem(label,fn,checked){const b=document.createElement('button');b.innerHTML=esc(label)+(checked?'<span class="chk">✓</span>':'');b.onclick=e=>{e.stopPropagation();closeMenus();fn()};return b}
let menuOwner=null;
function closeMenus(){$('#gmenu').classList.remove('on');menuOwner=null}
document.addEventListener('click',e=>{if(!e.target.closest('#gmenu'))closeMenus()});
window.addEventListener('resize',closeMenus);
function openMenu(btn,fill){const m=$('#gmenu');if(menuOwner===btn){closeMenus();return}closeMenus();m.innerHTML='';fill(m);menuOwner=btn;
  const r=btn.getBoundingClientRect();m.style.visibility='hidden';m.classList.add('on');const mw=m.offsetWidth,mh=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(r.right-mw,innerWidth-mw-8))+'px';m.style.top=(r.bottom+6+mh>innerHeight?r.top-6-mh:r.bottom+6)+'px';m.style.visibility=''}
function viewMenu(m){
  m.appendChild(menuItem('일정 보기',()=>{filter.event=!filter.event;render()},filter.event));
  m.appendChild(menuItem('할 일 보기',()=>{filter.todo=!filter.todo;render()},filter.todo));
  if(view==='month'){m.appendChild(document.createElement('hr'));
    m.appendChild(menuItem('시간 표시',()=>{prefs.monthTime=prefs.monthTime===false;savePrefs();render()},prefs.monthTime!==false))}
  if(view==='day'){m.appendChild(document.createElement('hr'));
    m.appendChild(menuItem('하루 보기',()=>{span=1;render()},span===1));
    m.appendChild(menuItem('이틀 보기',()=>{span=2;render()},span===2))}
}
$('#more').onclick=e=>{e.stopPropagation();openMenu($('#more'),m=>{
  viewMenu(m);
  m.appendChild(document.createElement('hr'));
  m.appendChild(menuItem('보기 초기화',()=>{filter.event=true;filter.todo=true;prefs.monthTime=true;span=1;savePrefs();render()}));
  if(mode!=='plan')return;
  m.appendChild(document.createElement('hr'));
  m.appendChild(menuItem('템플릿',openTemplates));
  m.appendChild(menuItem('모든 계획 확정',async()=>{const ds=items.filter(i=>i.draft);if(!ds.length){tell('확정할 계획이 없어요');return}if(await ask('모든 계획 확정',`모든 주의 계획 ${ds.length}개를 일정으로 확정할까요?`,'확정')){ds.forEach(confirmDraft);save();render()}}));
  m.appendChild(document.createElement('hr'));
  m.appendChild(menuItem('이 주 계획 삭제',async()=>{const w=weekDays(cursor);const n=items.filter(i=>i.draft&&w.includes(i.date)).length;if(!n){tell('이 주에 계획이 없어요');return}if(await ask('계획 삭제',`이 주의 계획 ${n}개를 삭제할까요?`,'삭제',true)){items=items.filter(i=>!(i.draft&&w.includes(i.date)));save();render()}}));
  m.appendChild(menuItem('전체 계획 삭제',async()=>{const n=items.filter(i=>i.draft).length;if(!n){tell('계획이 없어요');return}if(await ask('전체 계획 삭제',`모든 주의 계획 ${n}개를 삭제할까요?`,'삭제',true)){items=items.filter(i=>!i.draft);save();render()}}))})};
$('#more2').onclick=e=>{e.stopPropagation();openMenu($('#more2'),m=>{
  m.appendChild(menuItem('목록으로 보기',()=>{prefs.todoView='list';savePrefs();render()},prefs.todoView==='list'));
  m.appendChild(menuItem('보드로 보기',()=>{prefs.todoView='board';savePrefs();render()},prefs.todoView==='board'));
  m.appendChild(document.createElement('hr'));
  const dn=items.filter(i=>i.type==='todo'&&!i.draft&&i.done).length;
  m.appendChild(menuItem(`완료된 할 일 삭제${dn?` (${dn})`:''}`,async()=>{if(!dn){tell('완료된 할 일이 없어요');return}if(await ask('완료 삭제',`완료된 할 일 ${dn}개를 삭제할까요?`,'삭제',true)){items=items.filter(i=>!(i.type==='todo'&&!i.draft&&i.done));save();render()}}))})};

/* ---------- render ---------- */
function render(){
  $('#nav').classList.toggle('open',navOpen);
  $('#p-cal').classList.toggle('on',page==='cal');$('#p-todo').classList.toggle('on',page==='todo');$('#p-set').classList.toggle('on',page==='set');
  $('#nav-cal').classList.toggle('on',page==='cal'&&mode==='cal');$('#nav-plan').classList.toggle('on',page==='cal'&&mode==='plan');$('#nav-todo').classList.toggle('on',page==='todo');$('#navset').classList.toggle('on',page==='set');
  document.documentElement.style.setProperty('--dh',prefs.dayEnd-prefs.dayStart);
  $('#todo-cnt').textContent=items.filter(i=>i.type==='todo'&&!i.draft&&!i.done).length||'';
  renderCats();
  if(page==='set'){renderSettings();return}
  if(page==='todo'){renderTodo();return}
  renderTitle();
  $('#confirmAll').classList.toggle('hide',!(mode==='plan'&&view!=='month'));
  $('#seg').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  document.querySelectorAll('#filter button').forEach(b=>b.classList.toggle('on',!!filter[b.dataset.f]));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+view));
  const sideOn=page==='cal';const sideOpen=prefs.sideOpen!==false;
  $('#side').classList.toggle('on',sideOn);$('#side').classList.toggle('open',sideOn&&sideOpen);
  $('#sidetog').classList.toggle('hide',!sideOn);$('#sidetog').classList.toggle('on',sideOn&&sideOpen);
  $('#p-cal').classList.toggle('plan',mode==='plan');
  if(view==='month')renderMonth();else if(view==='week')renderWeek();else renderDay();
  if(sideOn)renderSide();
}
function renderCats(){
  const l=$('#catlist');l.innerHTML='';
  cats.forEach(c=>{const el=document.createElement('div');el.className='cat'+(c.on?' on':'');el.style.setProperty('--c',c.color);
    el.innerHTML=`<div class="cb"></div><div class="nm">${esc(c.name)}</div><span class="ed" title="편집">⋯</span>`;
    el.onclick=()=>{c.on=!c.on;saveCats();render()};el.querySelector('.ed').onclick=e=>{e.stopPropagation();openCat(c)};l.appendChild(el)});
  SUBS.forEach(x=>{const r=$('#'+x.row);const gone=subGone(x.key);r.classList.toggle('hide',gone);
    r.classList.toggle('on',prefs[x.key]!==false);r.style.setProperty('--c',x.color());
    r.onclick=()=>{prefs[x.key]=prefs[x.key]===false;savePrefs();render()};
    r.querySelector('.ed').onclick=e=>{e.stopPropagation();openCat(x)}});
  const gones=SUBS.filter(x=>subGone(x.key));
  $('#addsub').classList.toggle('hide',!gones.length);
  $('#addsub').onclick=e=>{e.stopPropagation();openMenu($('#addsub'),m=>gones.forEach(x=>m.appendChild(menuItem(x.name,()=>{
    prefs.subDel=(prefs.subDel||[]).filter(k=>k!==x.key);prefs[x.key]=true;savePrefs();render()}))))};
  const fold=prefs.fold||(prefs.fold={});
  [['h-cat','catlist','cat'],['h-sub','sublist','sub']].forEach(([h,sec,key])=>{
    const H=$('#'+h),S=$('#'+sec);H.classList.toggle('cl',!!fold[key]);S.classList.toggle('cl',!!fold[key]);
    H.onclick=()=>{fold[key]=!fold[key];savePrefs();render()}});
  $('#addcat').onclick=e=>{e.stopPropagation();openCat(null)};
}
function syncScrollbar(scrollEl){document.documentElement.style.setProperty('--sbw',(scrollEl.offsetWidth-scrollEl.clientWidth)+'px')}
const layerClass=i=>isRef(i)?' ref':'';
function cfBtn(i){const g=document.createElement('div');g.className='cfs';g.onpointerdown=e=>e.stopPropagation();g.onclick=e=>e.stopPropagation();
  const c=document.createElement('span');c.textContent='✓';c.title='확정';c.onclick=e=>{e.stopPropagation();confirmDraft(src(i));save();render()};
  const d=document.createElement('span');d.className='del';d.textContent='✕';d.title='삭제';d.onclick=e=>{e.stopPropagation();items=items.filter(x=>x!==src(i));save();render()};
  g.appendChild(c);g.appendChild(d);return g}
function chip(i,drag,ctx){
  if(i._hol){const h=document.createElement('div');h.className='chip event hol'+(mode==='plan'?' ref':'');paint(h,i);h.innerHTML=`<span>${esc(i.title)}</span>`;h.onclick=e=>e.stopPropagation();h.onpointerdown=e=>e.stopPropagation();return h}
  const el=document.createElement('div');el.className='chip '+i.type+(i.done?' done':'')+layerClass(i);paint(el,i);
  if(i._span){const sp=i._span;const first=sp.on===sp.start,last=sp.on===sp.end;
    el.classList.add('span');if(first)el.classList.add('s0');if(last)el.classList.add('e0');
    const head=first||(ctx&&ctx.weekStart===sp.on);
    el.innerHTML=head?((i.allday||!i.start?'':`<span class="t">${i.start}</span>`)+`<span>${esc(i.title)}</span>`):'<span>&nbsp;</span>';
    if(drag&&!isRef(i)){el.onclick=e=>e.stopPropagation();el.addEventListener('pointerdown',e=>todoDrag(e,i))}
    else el.onclick=e=>{e.stopPropagation();openModal(i)};
    return el}
  const noT=i.allday||!i.start||(view==='month'&&prefs.monthTime===false);
  el.innerHTML=(i.type==='todo'?'<span class="ck"></span>':'')+(noT?'':`<span class="t">${i.start}</span>`)+`<span>${esc(i.title)}</span>`;
  if(i.type==='todo'){const ck=el.querySelector('.ck');ck.onclick=e=>{e.stopPropagation();setDone(i,!i.done);save();render()};ck.onpointerdown=e=>e.stopPropagation()}
  if(drag&&!isRef(i)){el.onclick=e=>e.stopPropagation();el.addEventListener('pointerdown',e=>todoDrag(e,i))}
  else el.onclick=e=>{e.stopPropagation();openModal(i)};
  if(isDraft(i))el.appendChild(cfBtn(i));
  return el;
}
function ipin(t){const r=document.createElement('div');r.className='ipin'+(t.done?' done':'');r.dataset.id=t.id;paint(r,t);r.innerHTML=`<div class="ck"></div><b>${esc(t.title)}</b>`;
  const ck=r.querySelector('.ck');ck.onclick=e=>{e.stopPropagation();t.done=!t.done;save();render()};ck.onpointerdown=e=>e.stopPropagation();
  r.onclick=e=>e.stopPropagation();r.addEventListener('pointerdown',e=>{e.stopPropagation();todoDrag(e,t)});return r}
function openPopPins(anchor,ev,list){const po=$('#pop');po.innerHTML='';const h=document.createElement('div');h.className='ph';h.textContent=ev.title;po.appendChild(h);
  list.forEach(t=>po.appendChild(ipin(t)));const r=anchor.getBoundingClientRect();po.classList.add('on');const w=po.offsetWidth,hh=po.offsetHeight;
  let x=r.right+8;if(x+w>innerWidth-8)x=r.left-w-8;let y=r.top;if(y+hh>innerHeight-8)y=innerHeight-hh-8;po.style.left=x+'px';po.style.top=y+'px'}
function openPop(anchor,s,list){const po=$('#pop');po.innerHTML='';const d=fromYmd(s);
  const h=document.createElement('div');h.className='ph';h.textContent=`${d.getMonth()+1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;po.appendChild(h);
  list.forEach(i=>po.appendChild(chip(i,false)));
  const r=anchor.getBoundingClientRect();po.classList.add('on');const w=po.offsetWidth,hh=po.offsetHeight;
  let x=r.right+8;if(x+w>innerWidth-8)x=r.left-w-8;let y=r.top;if(y+hh>innerHeight-8)y=innerHeight-hh-8;po.style.left=x+'px';po.style.top=y+'px'}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#pop'))$('#pop').classList.remove('on')},true);
let mexp=null;
function renderMonth(){
  const g=$('#mgrid');g.innerHTML='';
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0);
  const start=startOfWeek(first);const nw=startOfWeek(first).getTime();
  const rows=Math.ceil((dayDiff(ymd(start),ymd(last))+1)/7);
  if(!prefs.mexpand)mexp=null;
  if(mexp!==null&&mexp>=rows)mexp=null;
  g.style.gridTemplateRows=[...Array(rows)].map((_,r)=>r===mexp?'auto':'minmax(0,1fr)').join(' ');
  for(let k=0;k<rows*7;k++){
    const row=Math.floor(k/7);const d=new Date(start);d.setDate(start.getDate()+k);const s=ymd(d);
    const cell=document.createElement('div');cell.className='mcell'+(row===mexp?' exp':'');cell.dataset.drop='allday';cell.dataset.date=s;
    if(d.getMonth()!==cursor.getMonth())cell.classList.add('out');if(s===todayStr)cell.classList.add('today');
    const hdr=document.createElement('div');hdr.className='dhdr';
    if(prefs.lunar!==false&&!subGone('lunar')){const lu=document.createElement('span');lu.className='lun'+(mode==='plan'?' ref':'');lu.style.setProperty('--lunc',dark?lift(lunColor()):lunColor());lu.textContent=lunStr(s);hdr.appendChild(lu)}
    const num=document.createElement('div');num.className='d';num.textContent=d.getDate();hdr.appendChild(num);
    hdr.onclick=e=>{e.stopPropagation();cursor=d;view='day';span=1;render()};cell.appendChild(hdr);
    const list=forDate(s);const max=row===mexp?99:4;const ctx={weekStart:ymd(startOfWeek(d))};
    list.slice(0,max).forEach(i=>cell.appendChild(chip(i,true,ctx)));
    if(list.length>max){const m=document.createElement('div');m.className='more';m.textContent=`+${list.length-max}`;m.onclick=e=>{e.stopPropagation();openPop(cell,s,list)};cell.appendChild(m)}
    cell.onclick=()=>{if(prefs.mexpand){mexp=mexp===row?null:row;render()}else{cursor=d;view='day';span=1;render()}};g.appendChild(cell);
  }
}
function buildTimeGrid(gridEl,headEl,alldayEl,days,isDay){
  gridEl.innerHTML='';headEl.innerHTML='';alldayEl.innerHTML='';
  headEl.appendChild(document.createElement('div'));
  const lab=document.createElement('div');lab.className='lab';lab.textContent='종일';alldayEl.appendChild(lab);
  const times=document.createElement('div');times.className='times';
  for(let h=prefs.dayStart+1;h<prefs.dayEnd;h++){const t=document.createElement('div');t.style.top=topOf(h*60);t.textContent=h===12?'정오':(h<12?'오전 ':'오후 ')+(h%12||12)+'시';times.appendChild(t)}
  gridEl.appendChild(times);const colsInfo=[];
  days.forEach((d,idx)=>{
    const s=ymd(d);
    const hc=document.createElement('div');hc.className='cell'+(s===todayStr?' today':'');hc.innerHTML=`<b>${d.getDate()}</b>${DOW[d.getDay()]}`;
    if(isDay&&idx===days.length-1){const ex=document.createElement('button');ex.className='ex';ex.textContent=span===1?'‹':'›';ex.title=span===1?'하루 더 보기':'접기';
      ex.onclick=e=>{e.stopPropagation();span=span===1?2:1;render()};hc.appendChild(ex)}
    hc.onclick=()=>{cursor=new Date(d);view='day';span=1;render()};headEl.appendChild(hc);
    const ad=document.createElement('div');ad.className='col';ad.dataset.drop='allday';ad.dataset.date=s;
    const adctx={weekStart:ymd(days[0])};
    forDate(s).filter(i=>i._span||i.allday||(i.type==='todo'&&!i.start)).forEach(i=>ad.appendChild(chip(i,true,adctx)));
    ad.onclick=()=>openModal(null,{date:s,allday:true});alldayEl.appendChild(ad);
    const col=document.createElement('div');col.className='col tcol';col.dataset.drop='time';col.dataset.date=s;colsInfo.push({el:col,date:s});
    for(let h=prefs.dayStart+1;h<prefs.dayEnd;h++){const l=document.createElement('div');l.className='hl';l.style.top=topOf(h*60);col.appendChild(l)}
    attachCreate(col,s);
    const timed=forDate(s).filter(i=>!i._span&&!i.allday&&i.start);const evs=timed.filter(i=>i.type==='event');
    evs.forEach(i=>{i._s=mins(i.start);i._e=Math.max(mins(i.end||i.start),i._s+30)});
    layoutOverlaps(evs);
    evs.forEach(i=>{const b=document.createElement('div');b.className='blk'+layerClass(i)+(src(i).style==='block'?' block':'');paint(b,i);
      b.style.top=topOf(i._s);b.style.height=`calc(${(i._e-i._s)/60} * var(--hh) - 1px)`;
      const ind=i._depth*10,n=i._n,k=i._col;b.style.setProperty('--z',i._depth+1);
      b.style.left=`calc(${ind}px + ${k?3:2}px + (100% - ${ind}px - 4px) * ${k/n})`;b.style.right=`calc(${k<n-1?3:2}px + (100% - ${ind}px - 4px) * ${(n-1-k)/n})`;
      const bts=blockTodos(src(i).id,i.date);const dn=bts.filter(t=>t.done).length;
      b.innerHTML=`<div class="tr"><b>${esc(i.title)}</b>${bts.length?`<span class="bd${dn===bts.length?' ok':''}">${dn===bts.length?'✓':dn+'/'+bts.length}</span>`:''}</div>`+((i._e-i._s)>=45?`<span>${fmtT(i.start)}${i.end?' – '+fmtT(i.end):''}</span>`:'')+`<div class="rs"></div>`;
      if(!isRef(i)){b.dataset.drop='block';b.dataset.eid=src(i).id;b.dataset.occ=i.date}
      if(bts.length){const hpx=(i._e-i._s)/60*HH()-1;const head=src(i).style==='block'?20:((i._e-i._s)>=45?36:20);const rowH=19;const avail=hpx-head-14;const fitAll=Math.floor(avail/rowH);
        const wrap=document.createElement('div');wrap.className='ipins';const show=bts.length<=fitAll?bts.length:Math.max(0,Math.floor((avail-14)/rowH));
        bts.slice(0,show).forEach(t=>wrap.appendChild(ipin(t)));
        if(bts.length>show){const m=document.createElement('div');m.className='ipin more';m.textContent=`+${bts.length-show}`;m.onpointerdown=e=>e.stopPropagation();m.onclick=e=>{e.stopPropagation();openPopPins(b,i,bts)};wrap.appendChild(m)}
        b.insertBefore(wrap,b.querySelector('.rs'))}
      b.onclick=e=>e.stopPropagation();if(!isRef(i))gridDrag(b,i,gridEl,colsInfo,true);if(isDraft(i))b.appendChild(cfBtn(i));col.appendChild(b)});
    timed.filter(i=>i.type==='todo').forEach(i=>{const r=document.createElement('div');r.className='pin'+(i.done?' done':'')+layerClass(i);paint(r,i);
      r.style.top=topOf(mins(i.start));r.innerHTML=`<div class="ck"></div><b>${esc(i.title)}</b><span>${i.start}</span>`;
      r.querySelector('.ck').onclick=e=>{e.stopPropagation();setDone(i,!i.done);save();render()};r.querySelector('.ck').onpointerdown=e=>e.stopPropagation();
      r.onclick=e=>e.stopPropagation();if(!isRef(i))gridDrag(r,i,gridEl,colsInfo,false);if(isDraft(i))r.appendChild(cfBtn(i));col.appendChild(r)});
    if(s===todayStr){const now=new Date();const nl=document.createElement('div');nl.className='now';nl.style.top=topOf(now.getHours()*60+now.getMinutes());col.appendChild(nl)}
    gridEl.appendChild(col);
  });
}
/* Apple-style overlaps: near-same start -> side by side; later start -> stacked on top with indent */
function layoutOverlaps(evs){
  evs.sort((a,b)=>a._s-b._s||b._e-a._e);const groups=[];evs.forEach(e=>{e._grp=undefined;e._depth=0});
  evs.forEach(e=>{
    const over=evs.filter(o=>o!==e&&o._s<=e._s&&o._e>e._s&&o._grp!==undefined);
    const par=over.filter(o=>e._s-o._s<=30);
    const anc=over.filter(o=>e._s-o._s>30);
    if(anc.length)e._depth=Math.max(...anc.map(o=>o._depth))+1;
    const g=par.length?par[0]._grp:groups.push([])-1;e._grp=g;groups[g].push(e);
    if(par.length)e._depth=par[0]._depth});
  groups.forEach(g=>g.forEach((e,k)=>{e._n=g.length;e._col=k}));
}
function attachCreate(col,dateStr){
  col.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target!==col&&!e.target.classList.contains('hl'))return;
    const hh=HH();const r=col.getBoundingClientRect();const s0=clamp(D0()+Math.floor((e.clientY-r.top)/hh*4)*15,D0(),D1()-15);
    let ghost=null,cur={s:s0,e:s0+60},moved=false;const sy=e.clientY;col.setPointerCapture(e.pointerId);
    const onMove=ev=>{if(!moved&&Math.abs(ev.clientY-sy)<4)return;moved=true;
      if(!ghost){ghost=document.createElement('div');ghost.className='blk ghost';col.appendChild(ghost)}
      const m=D0()+Math.round(clamp(ev.clientY-r.top,0,(D1()-D0())/60*hh)/hh*4)*15;const a=Math.min(s0,m),b=Math.max(s0,m);cur={s:a,e:Math.max(b,a+15)};
      ghost.style.top=topOf(cur.s);ghost.style.height=`calc(${(cur.e-cur.s)/60} * var(--hh) - 1px)`;
      ghost.innerHTML=`<b>새 일정</b><span>${fmtT(toT(cur.s))} – ${fmtT(toT(cur.e))}</span>`};
    const onUp=()=>{col.removeEventListener('pointermove',onMove);col.removeEventListener('pointerup',onUp);if(ghost)ghost.remove();
      openModal(null,{date:dateStr,start:toT(cur.s),end:toT(Math.min(cur.e,D1()-1))})};
    col.addEventListener('pointermove',onMove);col.addEventListener('pointerup',onUp);
  });
}
function gridDrag(el,item,gridEl,colsInfo,isEvent){
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.stopPropagation();
    const hh=HH();const resize=isEvent&&e.target.classList.contains('rs');
    const s0=mins(item.start),e0=isEvent?Math.max(mins(item.end||item.start),s0+30):s0;const dur=e0-s0;
    const sx=e.clientX,sy=e.clientY;const r0=el.getBoundingClientRect();const grab=e.clientY-r0.top;
    let moved=false,ghost=null,cur={s:s0,e:e0,date:item.date},blkT=null;el.setPointerCapture(e.pointerId);
    const onMove=ev=>{
      if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;moved=true;
      if(!isEvent){const under=document.elementFromPoint(ev.clientX,ev.clientY);const t=under&&under.closest('[data-drop="block"]');document.querySelectorAll('.blk.dropover').forEach(x=>x.classList.remove('dropover'));blkT=t||null;if(t)t.classList.add('dropover')}
      if(resize){cur.e=clamp(e0+Math.round((ev.clientY-sy)/hh*4)*15,s0+15,D1());el.style.height=`calc(${(cur.e-s0)/60} * var(--hh) - 1px)`;return}
      if(!ghost){ghost=el.cloneNode(true);ghost.classList.add('moving');ghost.style.left='';ghost.style.right='';gridEl.appendChild(ghost);el.classList.add('srcdrag')}
      const gr=gridEl.getBoundingClientRect();const rects=colsInfo.map(c=>({...c,r:c.el.getBoundingClientRect()}));
      const c=rects.find(c=>ev.clientX>=c.r.left&&ev.clientX<c.r.right)||rects.find(c=>c.date===cur.date);
      if(c){cur.date=c.date;ghost.style.left=(c.r.left-gr.left+2)+'px';ghost.style.width=(c.r.width-4)+'px'}
      const y=ev.clientY-grab-gr.top+(isEvent?0:r0.height/2);
      cur.s=clamp(D0()+Math.round(y/hh*4)*15,D0(),D1()-dur);cur.e=cur.s+dur;ghost.style.top=topOf(cur.s);
    };
    const onUp=async()=>{el.removeEventListener('pointermove',onMove);el.removeEventListener('pointerup',onUp);el.removeEventListener('pointercancel',onUp);
      if(ghost)ghost.remove();el.classList.remove('srcdrag');document.querySelectorAll('.blk.dropover').forEach(x=>x.classList.remove('dropover'));
      if(!moved){openModal(item);return}
      if(!isEvent&&blkT){const ev=eventById(blkT.dataset.eid);const choice=await askBlock(ev,fmtT(toT(cur.s)));if(!choice){render();return}
        if(choice==='in'){const s=src(item);if(item._src){detach(item,{})}const tg=item._src?items[items.length-1]:s;Object.assign(tg,{block:blkT.dataset.eid,blockOcc:blkT.dataset.occ,bucket:'scheduled',date:blkT.dataset.occ,start:'',order:Date.now()});save();render();return}}
      const ch=resize?{end:toT(Math.min(cur.e,D1()-1))}:{start:toT(cur.s),date:cur.date};
      if(!resize&&isEvent)ch.end=toT(Math.min(cur.e,D1()-1));
      if(await moveItem(item,ch,resize?'반복 항목 시간 변경':null))save();render()};
    el.addEventListener('pointermove',onMove);el.addEventListener('pointerup',onUp);el.addEventListener('pointercancel',onUp);
  });
}
function todoDrag(e,item){
  if(e.button!==0)return;e.stopPropagation();
  const srcEl=e.currentTarget;const sx=e.clientX,sy=e.clientY;let moved=false,ghost=null,target=null;
  srcEl.setPointerCapture(e.pointerId);
  const clear=()=>{document.querySelectorAll('.dropover,.ins').forEach(x=>{x.classList.remove('dropover');x.classList.remove('ins')})};
  const onMove=ev=>{
    if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;moved=true;
    if(!ghost){ghost=document.createElement('div');ghost.className='dragghost';ghost.textContent=item.title;document.body.appendChild(ghost);srcEl.classList.add('srcdrag')}
    ghost.style.left=ev.clientX+14+'px';ghost.style.top=ev.clientY+10+'px';
    clear();const el=document.elementFromPoint(ev.clientX,ev.clientY);const t=el&&el.closest('[data-drop]');target=null;
    if(t){target={el:t,kind:t.dataset.drop,x:ev.clientX,y:ev.clientY};t.classList.add('dropover');
      if(t.dataset.drop==='sec'&&!['scheduled','late'].includes(t.dataset.bucket)){const rows=[...t.querySelectorAll('.row-wrap')].filter(r=>r.dataset.id!==item.id);
        const hit=rows.find(r=>{const rr=r.getBoundingClientRect();return ev.clientY<rr.top+rr.height/2});if(hit)hit.classList.add('ins')}}
  };
  const onUp=async()=>{srcEl.removeEventListener('pointermove',onMove);srcEl.removeEventListener('pointerup',onUp);srcEl.removeEventListener('pointercancel',onUp);
    clear();if(ghost)ghost.remove();srcEl.classList.remove('srcdrag');
    if(!moved){openModal(item);return}if(target){if(await applyDrop(item,target))save();render()}};
  srcEl.addEventListener('pointermove',onMove);srcEl.addEventListener('pointerup',onUp);srcEl.addEventListener('pointercancel',onUp);
}
async function applyDrop(item,t){
  const el=t.el,k=t.kind;
  if(mode==='plan'&&!src(item).draft&&(k==='time'||k==='allday'||k==='block')){
    let d=items.find(x=>x.draft&&x.link===src(item).id);
    if(!d){d=Object.assign(JSON.parse(JSON.stringify(src(item))),{id:uid(),draft:true,link:src(item).id,rep:null,skip:[],doneDates:[]});items.push(d)}
    item=d;
  }
  if(k==='block'){if(item.type!=='todo')return false;const s=src(item);const eid=el.dataset.eid,occ=el.dataset.occ;
    const ev=eventById(eid);const col=el.closest('.tcol');const r0=col.getBoundingClientRect();const mm=clamp(D0()+Math.round((t.y-r0.top)/HH()*4)*15,D0(),D1()-15);
    const choice=await askBlock(ev,fmtT(toT(mm)));if(!choice)return false;
    if(choice==='at')return moveItem(item,{bucket:'scheduled',date:occ,start:toT(mm),block:null,blockOcc:null});
    const rows=[...el.querySelectorAll('.ipin[data-id]')].map(r=>r.dataset.id).filter(id=>id!==s.id);const idx=rows.findIndex(id=>{const rr=el.querySelector(`.ipin[data-id="${id}"]`).getBoundingClientRect();return t.y<rr.top+rr.height/2});
    rows.splice(idx<0?rows.length:idx,0,s.id);rows.forEach((id,n)=>{const it=items.find(i=>i.id===id);if(it)it.order=n});
    Object.assign(s,{block:eid,blockOcc:occ,bucket:'scheduled',date:occ,start:''});return true}
  if(k==='time'){if(item.type==='event')return false;const r=el.getBoundingClientRect();const m=clamp(D0()+Math.round((t.y-r.top)/HH()*4)*15,D0(),D1()-15);return moveItem(item,{bucket:'scheduled',date:el.dataset.date,start:toT(m),block:null,blockOcc:null})}
  if(k==='allday'){
    if(item.type==='event'){const nd=el.dataset.date,on=item._span?item._span.on:item.date;const dl=dayDiff(on,nd);if(!dl)return false;
      const s=src(item);const sp=(s.dateEnd&&s.dateEnd>s.date)?dayDiff(s.date,s.dateEnd):0;
      const nStart=addDays(item.date,dl);const ch={date:nStart};if(sp)ch.dateEnd=addDays(nStart,sp);
      return moveItem(item,ch,'반복 항목 이동')}
    return moveItem(item,{bucket:'scheduled',date:el.dataset.date,start:'',block:null,blockOcc:null})}
  if(k==='sec'){if(item.type!=='todo')return false;const b=el.dataset.bucket;const s=src(item);if(b==='late')return false;
    if(b==='scheduled'){if(s.bucket!=='scheduled')Object.assign(s,{bucket:'scheduled',date:s.date||todayStr,start:''})}
    else if(b==='soon')Object.assign(s,{bucket:'soon',date:null,start:'',rep:null,block:null,blockOcc:null});
    else if(b==='later')Object.assign(s,{bucket:'later',date:null,start:'',rep:null,block:null,blockOcc:null});
    else if(b==='done')s.done=true;
    if(b!=='done')s.done=false;
    const rows=[...el.querySelectorAll('.row-wrap')].filter(r=>r.dataset.id!==s.id);
    const idx=rows.findIndex(r=>{const rr=r.getBoundingClientRect();return t.y<rr.top+rr.height/2});
    const ids=rows.map(r=>r.dataset.id);ids.splice(idx<0?ids.length:idx,0,s.id);
    ids.forEach((id,n)=>{const it=items.find(i=>i.id===id);if(it)it.order=n});return true}
  return false;
}
const scrolled={};const autoScroll=(el,key)=>{if(scrolled[key])return;scrolled[key]=true;el.scrollTop=Math.max(0,(7.5-prefs.dayStart)*HH())};
function renderWeek(){const days=weekDays(cursor).map(fromYmd);buildTimeGrid($('#wgrid'),$('#whead'),$('#wallday'),days,false);syncScrollbar($('#wscroll'));autoScroll($('#wscroll'),'w')}
function renderDay(){const days=[...Array(span)].map((_,k)=>{const d=new Date(cursor);d.setDate(cursor.getDate()+k);return d});
  ['#dhead','#dallday','#dgrid'].forEach(id=>$(id).style.setProperty('--cols',span));
  buildTimeGrid($('#dgrid'),$('#dhead'),$('#dallday'),days,true);syncScrollbar($('#dscroll'));autoScroll($('#dscroll'),'d')}

/* ---------- side panel ---------- */
function renderSide(){
  const s=ymd(cursor);const side=$('#side-in');side.innerHTML='';
  const sec=(title,list,empty)=>{const h=document.createElement('h4');h.innerHTML=`${title}<small>${list.length||''}</small>`;side.appendChild(h);
    if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent=empty;side.appendChild(e)}return list};
  const row=(i,drag)=>{const el=document.createElement('div');el.className='sitem'+(i.done?' done':'')+(drag?' drag':'');paint(el,i);
    const meta=i.type==='event'?(i._span?`${fmtD(i._span.start)} – ${fmtD(i._span.end)}`:(i.allday?'종일':fmtT(i.start)+(i.end?' – '+fmtT(i.end):''))):(i.start?fmtT(i.start):'');
    el.innerHTML=(i.type==='event'?'<div class="bar"></div>':'<div class="ck"></div>')+`<div class="nm">${esc(i.title)}</div><div class="meta">${meta}</div>`;
    if(i.type==='todo'){const ck=el.querySelector('.ck');ck.onclick=e=>{e.stopPropagation();setDone(i,!i.done);save();render()};ck.onpointerdown=e=>e.stopPropagation()}
    if(drag){el.onclick=e=>e.stopPropagation();el.addEventListener('pointerdown',e=>todoDrag(e,i))}else el.onclick=()=>openModal(i);
    if(isDraft(i))el.appendChild(cfBtn(i));return el};
  if(view==='day'){const list=forDate(s).filter(i=>!isRef(i));
    sec('일정',list.filter(i=>i.type==='event'),'없음').forEach(i=>side.appendChild(row(i,false)));
    const bt=items.filter(t=>t.type==='todo'&&t.block&&t.blockOcc===s&&layerOK(t)&&catOf(t).on&&!(mode==='plan'&&!t.draft)).sort(byOrder);
    sec('할 일',[...list.filter(i=>i.type==='todo'),...bt],'없음').forEach(i=>{const r=row(i,true);if(i.block){const e=eventById(i.block);if(e)r.querySelector('.meta').textContent=e.title}side.appendChild(r)})}
  {
    const q=document.createElement('div');q.className='quick sq';q.innerHTML='<div class="pl"></div><input placeholder="할 일 추가">';
    q.querySelector('input').onkeydown=e=>{if(e.key!=='Enter')return;const t=e.target.value.trim();if(!t)return;
      items.push({id:uid(),type:'todo',bucket:'soon',title:t,date:null,cat:cats.find(c=>c.on)?.id||cats[0].id,color:null,done:false,order:-Date.now(),subs:[],draft:false});save();render();setTimeout(()=>$('#side .quick input')?.focus(),0)};
    side.appendChild(q);
    const rank={soon:0,later:1};
    const pool=items.filter(i=>i.type==='todo'&&!i.draft&&!i.done&&catOf(i).on&&!i.block&&(i.bucket==='soon'||i.bucket==='later')&&!items.some(x=>x.draft&&x.link===i.id))
      .sort((a,b)=>(rank[a.bucket]-rank[b.bucket])||byOrder(a,b));
    sec('할 일 목록',pool,'비어 있음').forEach(i=>side.appendChild(row(i,true)));
  }
}

/* ---------- plan: confirm & templates ---------- */
function confirmDraft(d){
  if(d.link){const t=items.find(x=>x.id===d.link);if(t){Object.assign(t,{bucket:'scheduled',date:d.date,start:d.start||'',cat:d.cat,color:d.color,block:d.block||null,blockOcc:d.blockOcc||null});items=items.filter(x=>x!==d);return}}
  d.draft=false;delete d.link;
  if(d.type==='event')items.filter(t=>t.draft&&t.type==='todo'&&t.block===d.id).forEach(confirmDraft);
}
$('#confirmAll').onclick=async()=>{const w=view==='week'?weekDays(cursor):[...Array(span)].map((_,k)=>addDays(ymd(cursor),k));
  const ds=items.filter(i=>i.draft&&w.includes(i.date));if(!ds.length){tell('확정할 계획이 없어요');return}
  if(!await ask('일정 확정',`이 ${view==='week'?'주':'날'}의 계획 ${ds.length}개를 일정으로 확정할까요?`,'확정'))return;ds.forEach(confirmDraft);save();render()};
function openTemplates(){$('#tov').classList.add('on');$('#t-name').value='';paintTemplates();setTimeout(()=>$('#t-name').focus(),30)}
function paintTemplates(){const l=$('#tlist');l.innerHTML='';$('#t-save').disabled=!snapshotWeek().length;
  if(!templates.length){l.innerHTML='<div class="empty" style="padding:8px 6px;font-size:12px;color:var(--text-3)">저장된 템플릿이 없어요</div>';return}
  templates.forEach(t=>{const r=document.createElement('div');r.className='trow';r.innerHTML=`<span class="nm">${esc(t.name)}</span><span class="cnt">${t.items.length}개</span>`;
    const ld=document.createElement('button');ld.className='ld';ld.textContent='불러오기';ld.onclick=()=>{loadTemplate(t);$('#tov').classList.remove('on')};r.appendChild(ld);
    const mo=document.createElement('button');mo.className='mo';mo.textContent='⋯';mo.onclick=e=>{e.stopPropagation();openMenu(mo,m=>{
      m.appendChild(menuItem('이 주 계획으로 덮어쓰기',async()=>{if(await ask('덮어쓰기',`"${t.name}"을(를) 지금 보고 있는 주의 계획으로 덮어쓸까요?`,'덮어쓰기')){t.items=snapshotWeek();saveTemplates();paintTemplates()}}));
      m.appendChild(menuItem('이름 변경',async()=>{const n=await askText('템플릿 이름',t.name);if(n&&n.trim()){t.name=n.trim();saveTemplates();paintTemplates()}}));
      m.appendChild(document.createElement('hr'));
      m.appendChild(menuItem('삭제',async()=>{if(await ask('템플릿 삭제',`"${t.name}"을(를) 삭제할까요?`,'삭제',true)){templates=templates.filter(x=>x!==t);saveTemplates();paintTemplates()}}))})};r.appendChild(mo);
    l.appendChild(r)})}
function snapshotWeek(){const w=weekDays(cursor);return items.filter(i=>i.draft&&w.includes(i.date)&&!(i.type==='todo'&&i.block)).map(i=>({dow:w.indexOf(i.date),type:i.type,title:i.title,start:i.start||'',end:i.end||'',allday:!!i.allday,cat:i.cat,color:i.color,bucket:i.bucket,style:i.style,note:i.note||'',subs:(i.subs||[]).map(s=>({id:uid(),title:s.title,done:false})),
  todos:i.type==='event'?items.filter(t=>t.type==='todo'&&t.block===i.id&&t.blockOcc===i.date).sort(byOrder).map(t=>({title:t.title,cat:t.cat,color:t.color,subs:(t.subs||[]).map(s=>({id:uid(),title:s.title,done:false}))})):[]}))}
function loadTemplate(t){const w=weekDays(cursor);t.items.forEach(x=>{const {todos,...rest}=x;const id=uid();items.push(Object.assign({id,done:false,order:Date.now(),draft:true,rep:null,skip:[],doneDates:[],block:null,blockOcc:null},rest,{date:w[x.dow],subs:JSON.parse(JSON.stringify(x.subs||[]))}));
  (todos||[]).forEach((td,k)=>items.push({id:uid(),type:'todo',title:td.title,cat:td.cat,color:td.color||null,subs:JSON.parse(JSON.stringify(td.subs||[])),done:false,order:k,draft:true,bucket:'scheduled',date:w[x.dow],start:'',block:id,blockOcc:w[x.dow],alerts:[]}))});save();render()}
const saveTpl=()=>{const n=$('#t-name').value.trim();if(!n)return;const snap=snapshotWeek();if(!snap.length)return;templates.push({id:uid(),name:n,items:snap});saveTemplates();$('#t-name').value='';paintTemplates()};
$('#t-save').onclick=saveTpl;$('#t-name').addEventListener('keydown',e=>{if(e.key==='Enter')saveTpl()});
$('#tclose').onclick=()=>$('#tov').classList.remove('on');$('#tov').onclick=e=>{if(e.target.id==='tov')$('#tov').classList.remove('on')};

/* ---------- todo page ---------- */
let showDone=false;const adding=new Set();
function subRow(i,s,inModal){
  const el=document.createElement('div');el.className='sub'+(s.done?' done':'');
  el.innerHTML=`<div class="sck"></div><span>${esc(s.title)}</span><button class="x">✕</button>`;
  el.querySelector('.sck').onclick=e=>{e.stopPropagation();s.done=!s.done;save();inModal?paintSubs():render()};
  el.querySelector('.x').onclick=e=>{e.stopPropagation();i.subs=i.subs.filter(x=>x!==s);save();inModal?paintSubs():render()};
  el.onpointerdown=e=>e.stopPropagation();el.onclick=e=>e.stopPropagation();return el;
}
function subInput(i,inModal){
  const el=document.createElement('div');el.className='sub';el.innerHTML=`<input placeholder="하위 항목">`;const inp=el.querySelector('input');
  const close=()=>{if(inModal)paintSubs();else{adding.delete(i.id);render()}};
  inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){const t=inp.value.trim();if(!t){close();return}i.subs.push({id:uid(),title:t,done:false});save();inp.value='';if(inModal)paintSubs(true);else{render();document.querySelector(`.row-wrap[data-id="${i.id}"] .subs input`)?.focus()}}
    if(e.key==='Escape')close()};
  inp.onblur=()=>{setTimeout(()=>{if(inp.isConnected&&!inp.value.trim()&&document.activeElement!==inp)close()},80)};
  el.onpointerdown=e=>e.stopPropagation();el.onclick=e=>e.stopPropagation();return el;
}
function todoRow(i){
  const wrap=document.createElement('div');wrap.className='row-wrap';wrap.dataset.id=i.id;
  const el=document.createElement('div');el.className='item'+(i.done?' done':'');paint(el,i);
  let meta='';const nx=i.rep?nextOcc(i,todayStr):null;
  if(i.rep){meta=repText(i)+(nx?' · '+(nx===todayStr?'오늘':fmtD(nx)):'')+(i.start?' '+fmtT(i.start):'')}
  else if(i.block){const e=eventById(i.block);meta=(i.date===todayStr?'오늘':fmtD(i.date))+(e?' · '+e.title:'')}
  else if(i.date){meta=(i.date===todayStr?'오늘':fmtD(i.date))+(i.start?' '+fmtT(i.start):'')}
  const sd=i.subs.filter(s=>s.done).length,st=i.subs.length;
  const doneNow=i.rep?(nx?(i.doneDates||[]).includes(nx):false):i.done;el.classList.toggle('done',doneNow);
  el.innerHTML=`<div class="ck"></div><div class="nm">${esc(i.title)}</div><div class="dt">${meta}</div><span class="sp" title="하위 항목">${st?`${sd}/${st}`:'+'}</span>`;
  const ck=el.querySelector('.ck');ck.onclick=e=>{e.stopPropagation();if(i.rep&&nx)setDone(inst(i,nx),!doneNow);else i.done=!i.done;save();render()};ck.onpointerdown=e=>e.stopPropagation();
  const sp=el.querySelector('.sp');sp.onpointerdown=e=>e.stopPropagation();sp.onclick=e=>{e.stopPropagation();adding.add(i.id);render();setTimeout(()=>document.querySelector(`.row-wrap[data-id="${i.id}"] .subs input`)?.focus(),0)};
  el.onclick=e=>e.stopPropagation();el.addEventListener('pointerdown',e=>todoDrag(e,i));wrap.appendChild(el);
  if(st||adding.has(i.id)){const sb=document.createElement('div');sb.className='subs';i.subs.forEach(s=>sb.appendChild(subRow(i,s,false)));if(adding.has(i.id))sb.appendChild(subInput(i,false));wrap.appendChild(sb)}
  return wrap;
}
function section(root,title,bucket,list,empty){
  const fold=prefs.tfold||(prefs.tfold={});
  const d=document.createElement('div');d.className='sec'+(bucket==='late'?' late':'')+(fold[bucket]?' cl':'');d.dataset.drop='sec';d.dataset.bucket=bucket;
  d.innerHTML=`<h4>${title}<span class="n">${list.length||''}</span><span class="act"></span></h4>`;
  d.querySelector('h4').onclick=e=>{if(e.target.closest('.act'))return;fold[bucket]=!fold[bucket];savePrefs();render()};
  if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent=empty;d.appendChild(e)}
  list.forEach(i=>d.appendChild(todoRow(i)));root.appendChild(d);return d;
}
function renderTodo(){
  const root=$('#todo-list');root.innerHTML='';const td=items.filter(i=>i.type==='todo'&&!i.draft&&catOf(i).on);
  td.forEach(i=>{i._nx=i.rep?nextOcc(i,todayStr):null});
  const board=prefs.todoView==='board';$('#todo-in').classList.toggle('wide',board);
  const host=board?document.createElement('div'):root;if(board){host.className='board';root.appendChild(host)}
  const isLate=i=>!i.done&&!i.rep&&i.date&&i.date<todayStr;
  const sortDone=(list,cmp)=>list.sort((a,b)=>(a.done-b.done)||cmp(a,b));
  const late=td.filter(isLate).sort(byTime);
  if(late.length)section(host,'지난','late',late,'');
  section(host,'곧','soon',sortDone(td.filter(i=>i.bucket==='soon'),byOrder),'');
  section(host,'나중에','later',sortDone(td.filter(i=>i.bucket==='later'),byOrder),'');
  section(host,'예정','scheduled',sortDone(td.filter(i=>i.bucket==='scheduled'&&!isLate(i)),byTime),'');
}
$('#quick').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const t=e.target.value.trim();if(!t)return;
  items.push({id:uid(),type:'todo',bucket:'soon',title:t,date:null,cat:cats.find(c=>c.on)?.id||cats[0].id,color:null,done:false,order:-Date.now(),subs:[],draft:false});e.target.value='';save();render()});

/* ---------- custom date / time pickers ---------- */
const fmtDateLong=v=>{if(!v)return'';const d=fromYmd(v);return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`};
const parseTime=t=>{t=String(t).trim();if(!t)return null;let pm=/오후|pm|p/i.test(t),am=/오전|am|a/i.test(t);const m=t.match(/(\d{1,2})(?:[:시.]\s*(\d{1,2})?)?/);if(!m)return null;let h=+m[1],mi=+(m[2]||0);
  if(pm&&h<12)h+=12;if(am&&h===12)h=0;if(h>23||mi>59)return null;return toT(h*60+mi)};
const parseDate=t=>{t=String(t).trim();if(!t)return null;let m=t.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);if(m)return ymd(new Date(+m[1],m[2]-1,+m[3]));
  m=t.match(/(\d{1,2})\D+(\d{1,2})/);if(m){const y=new Date().getFullYear();return ymd(new Date(y,m[1]-1,+m[2]))}m=t.match(/^(\d{1,2})일?$/);if(m){const b=cursor;return ymd(new Date(b.getFullYear(),b.getMonth(),+m[1]))}return null};
function enhance(id,kind,opt){const inp=document.getElementById(id);const f=document.createElement('input');f.className='fld'+(opt&&opt.cls?' '+opt.cls:'');f.placeholder=opt&&opt.placeholder||'';f.autocomplete='off';inp.parentNode.insertBefore(f,inp);
  let typing=false;const paintF=()=>{if(typing)return;const v=inp.value;f.value=v?(kind==='date'?fmtDateLong(v):fmtT(v)):''};
  inp.addEventListener('change',paintF);inp.addEventListener('refresh',paintF);paintF();
  const commit=()=>{if(!typing)return;typing=false;const v=kind==='date'?parseDate(f.value):parseTime(f.value);if(v)setVal(inp,v);else if(!f.value.trim()&&opt&&opt.clearable)setVal(inp,'');else paintF()};
  f.oninput=()=>{typing=true};
  f.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){commit();closeDpop();f.blur()}if(e.key==='Escape'){typing=false;paintF();closeDpop();f.blur()}};
  f.onblur=()=>setTimeout(()=>{if(document.activeElement!==f)commit()},120);
  f.onfocus=()=>open();f.onclick=e=>{e.stopPropagation();if(!f.classList.contains('on'))open()};
  function open(){closeDpop();f.classList.add('on');dpopOwner=f;
    if(kind==='date')datePicker(inp,f,opt);else timePicker(inp,f);
    const po=$('#dpop');const r=f.getBoundingClientRect();po.classList.add('on');const w=po.offsetWidth,h=po.offsetHeight;
    let x=r.left,y=r.bottom+6;if(x+w>innerWidth-8)x=innerWidth-w-8;if(y+h>innerHeight-8)y=r.top-6-h;po.style.left=x+'px';po.style.top=y+'px'}}
let dpopOwner=null;
function closeDpop(){$('#dpop').classList.remove('on');if(dpopOwner)dpopOwner.classList.remove('on');dpopOwner=null}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#dpop')&&!e.target.closest('.fld')&&!e.target.closest('.hb'))closeDpop()},true);
$('#dpop').addEventListener('pointerdown',e=>{if(!e.target.closest('.wheel'))e.preventDefault()});
const setVal=(inp,v)=>{inp.value=v;inp.dispatchEvent(new Event('change'))};
function datePicker(inp,f,opt){const po=$('#dpop');po.className='dpop';let cur=inp.value?fromYmd(inp.value):new Date();cur=new Date(cur.getFullYear(),cur.getMonth(),1);
  const draw=()=>{po.innerHTML='';const h=document.createElement('div');h.className='dp-h';h.innerHTML=`<b>${cur.getFullYear()}년 ${cur.getMonth()+1}월</b><button>‹</button><button>›</button>`;
    const[pv,nx]=h.querySelectorAll('button');pv.onclick=()=>{cur.setMonth(cur.getMonth()-1);draw()};nx.onclick=()=>{cur.setMonth(cur.getMonth()+1);draw()};po.appendChild(h);
    const g=document.createElement('div');g.className='dp-g';DOW.forEach(d=>{const w=document.createElement('div');w.className='w';w.textContent=d;g.appendChild(w)});
    const st=startOfWeek(cur);for(let k=0;k<42;k++){const d=new Date(st);d.setDate(st.getDate()+k);const v=ymd(d);const b=document.createElement('button');b.textContent=d.getDate();
      if(d.getMonth()!==cur.getMonth())b.classList.add('out');if(v===todayStr)b.classList.add('td');if(v===inp.value)b.classList.add('sel');
      b.onclick=()=>{setVal(inp,v);closeDpop()};g.appendChild(b)}po.appendChild(g);
    const ft=document.createElement('div');ft.className='dp-f';const t=document.createElement('button');t.textContent='오늘';t.onclick=()=>{setVal(inp,todayStr);closeDpop()};ft.appendChild(t);
    if(opt&&opt.clearable){const c=document.createElement('button');c.textContent='없음';c.onclick=()=>{setVal(inp,'');closeDpop()};ft.appendChild(c)}po.appendChild(ft)};draw()}
function timePicker(inp,f){const po=$('#dpop');po.className='dpop tp';po.innerHTML='';
  let cur=inp.value?mins(inp.value):9*60;let ap=cur>=720?1:0,h=(Math.floor(cur/60)%12)||12,mi=Math.round((cur%60)/5)*5%60;
  const wrap=document.createElement('div');wrap.className='wheels';po.appendChild(wrap);const apply=()=>{setVal(inp,toT(((h%12)+ap*12)*60+mi))};
  mkWheel(wrap,['오전','오후'],ap,v=>v,v=>{ap=v==='오후'?1:0;apply()});const hs=[12,1,2,3,4,5,6,7,8,9,10,11];mkWheel(wrap,hs,hs.indexOf(h),v=>v+'시',v=>{h=v;apply()});
  const ms=[...Array(12)].map((_,k)=>k*5);mkWheel(wrap,ms,ms.indexOf(mi),v=>pad(v)+'분',v=>{mi=v;apply()})}
enhance('f-date','date',{placeholder:'날짜'});enhance('f-dateend','date',{placeholder:'날짜'});enhance('f-until','date',{clearable:true,placeholder:'계속 반복'});enhance('f-start','time',{placeholder:'시간',cls:'tm'});enhance('f-end','time',{placeholder:'시간',cls:'tm'});
const refreshFields=()=>['f-date','f-dateend','f-until','f-start','f-end'].forEach(id=>document.getElementById(id).dispatchEvent(new Event('refresh')));

/* ---------- settings ---------- */
/* ---------- 시간 범위 휠 ---------- */
const hLabel=h=>h+'시';
function paintHours(){$('#set-h0').textContent=hLabel(prefs.dayStart);$('#set-h1').textContent=hLabel(prefs.dayEnd)}
function hourWheel(btn,vals,get,set){
  if(btn.dataset.wired)return;btn.dataset.wired='1';
  btn.onclick=e=>{e.stopPropagation();
    if(btn.classList.contains('on')){closeDpop();return}
    closeDpop();btn.classList.add('on');dpopOwner=btn;
    const po=$('#dpop');po.className='dpop tp one';po.innerHTML='';
    const wrap=document.createElement('div');wrap.className='wheels';po.appendChild(wrap);
    const vs=vals();mkWheel(wrap,vs,Math.max(0,vs.indexOf(get())),hLabel,v=>{set(v);savePrefs();Object.keys(scrolled).forEach(k=>delete scrolled[k]);paintHours()});
    po.classList.add('on');const r=btn.getBoundingClientRect();const w=po.offsetWidth,h=po.offsetHeight;
    let x=r.left,y=r.bottom+6;if(x+w>innerWidth-8)x=innerWidth-w-8;if(y+h>innerHeight-8)y=r.top-6-h;
    po.style.left=x+'px';po.style.top=y+'px'}}
hourWheel($('#set-h0'),()=>[...Array(prefs.dayEnd-3)].map((_,k)=>k),()=>prefs.dayStart,v=>prefs.dayStart=v);
hourWheel($('#set-h1'),()=>[...Array(24-prefs.dayStart-3)].map((_,k)=>k+prefs.dayStart+4),()=>prefs.dayEnd,v=>prefs.dayEnd=v);

function renderSettings(){
  paintHours();
  $('#set-todoview').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.v===prefs.todoView);b.onclick=()=>{prefs.todoView=b.dataset.v;savePrefs();renderSettings()}});
  $('#set-wstart').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',+b.dataset.d===(prefs.wstart||0));b.onclick=()=>{prefs.wstart=+b.dataset.d;savePrefs();renderSettings()}});
  $('#set-mexp').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',(b.dataset.v==='1')===!!prefs.mexpand);b.onclick=()=>{prefs.mexpand=b.dataset.v==='1';savePrefs();renderSettings()}});
  paintPal();
}
const EXPORT_KEYS=['items','cats','themes','templates','prefs'];
$('#lsexport').onclick=()=>$('#set-export').click();
$('#set-export').onclick=()=>{const data={v:1,at:new Date().toISOString(),items,cats,themes,templates,prefs};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  a.download=`planner-${todayStr}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('#set-import').onclick=()=>$('#set-file').click();
$('#set-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';
  try{const o=JSON.parse(await f.text());if(!Array.isArray(o.items))throw 0;
    if(!await ask('가져오기',`일정·할 일 ${o.items.length}개를 불러옵니다. 지금 데이터는 덮어써져요.`,'가져오기'))return;
    items=o.items;if(Array.isArray(o.cats)&&o.cats.length)cats=o.cats;if(Array.isArray(o.themes))themes=o.themes;if(Array.isArray(o.templates))templates=o.templates;
    if(o.prefs)prefs=Object.assign(prefs,o.prefs);savePrefs();saveCats();saveThemes();saveTemplates();save();
    if(!themeById(prefs.pal))prefs.pal=prefs.def;PRESET=(themeById(prefs.pal)||{c:SEED[0].c}).c;applyTheme();render();tell('가져왔어요')}
  catch(err){tell('불러올 수 없는 파일이에요')}};
$('#set-reset').onclick=async()=>{if(!await ask('전체 초기화','모든 일정·할 일·테마·템플릿이 지워져요. 되돌릴 수 없어요.','초기화',true))return;
  try{Object.keys(localStorage).filter(k=>k.startsWith('planner.')).forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()};

/* ---------- search ---------- */
let srchIdx=0,srchHits=[];
function openSearch(){$('#srch').classList.add('on');const i=$('#srch-in');i.value='';paintSearch();setTimeout(()=>i.focus(),30)}
function closeSearch(){$('#srch').classList.remove('on')}
function paintSearch(){const q=$('#srch-in').value.trim().toLowerCase();const r=$('#srch-res');r.innerHTML='';srchHits=[];srchIdx=0;
  if(!q)return;
  srchHits=items.filter(i=>!i.draft&&(i.title.toLowerCase().includes(q)||(i.note||'').toLowerCase().includes(q))).slice(0,30)
    .sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  if(!srchHits.length){r.innerHTML='<div class="none">결과 없음</div>';return}
  srchHits.forEach((i,k)=>{const el=document.createElement('div');el.className='r'+(k===0?' on':'');paint(el,i);
    const nx=i.rep?nextOcc(i,todayStr):null;const when=i.rep?repText(i)+(nx?' · '+fmtD(nx):''):(i.date?(i.date===todayStr?'오늘':fmtD(i.date))+(i.start?' '+fmtT(i.start):''):(i.bucket==='later'?'나중에':'곧'));
    el.innerHTML=`<i></i><span class="nm">${esc(i.title)}</span><span class="mt">${when}</span>`;
    el.onclick=()=>goSearch(i);r.appendChild(el)})}
function goSearch(i){closeSearch();
  const d=i.rep?nextOcc(i,todayStr):i.date;
  if(d){page='cal';mode=i.draft?'plan':'cal';cursor=fromYmd(d);if(view==='month'){}else{view=view==='week'?'week':'day'}render();setTimeout(()=>openModal(i.rep?inst(i,d):i),60)}
  else{page='todo';render();setTimeout(()=>openModal(i),60)}}
$('#srch-in').oninput=paintSearch;
$('#srch-in').onkeydown=e=>{e.stopPropagation();
  if(e.key==='Escape')return closeSearch();
  if(e.key==='Enter'&&srchHits[srchIdx])return goSearch(srchHits[srchIdx]);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=$('#srch-res').children.length;if(!n)return;
    srchIdx=(srchIdx+(e.key==='ArrowDown'?1:-1)+n)%n;[...$('#srch-res').children].forEach((c,k)=>c.classList.toggle('on',k===srchIdx))}};
$('#srch').onclick=e=>{if(e.target.id==='srch')closeSearch()};
$('#srchbtn').onclick=openSearch;

/* ---------- item modal ---------- */
let editing=null,mtype='event',mbucket='soon',mcat=null,mcolor=null,msubs=[],mrep='',mdays=[],malerts=[],mstyle='normal',mblock=null,mBtAdd=[],mBtLink=[],mBtUnlink=[];
const STYT={normal:'일반',block:'블록'};
$('#f-stylewrap').onclick=e=>{e.stopPropagation();openMenu($('#f-stylewrap'),m=>Object.keys(STYT).forEach(k=>m.appendChild(menuItem(STYT[k],()=>{mstyle=k;paintStyle()},mstyle===k))))};
function paintStyle(){$('#f-styleval').textContent=STYT[mstyle]}
function curOcc(){return editing?(editing._occ||src(editing).date):null}
function paintBT(){const w=$('#f-bt');w.innerHTML='';const eid=editing?src(editing).id:null;const occ=curOcc();
  const linked=eid?items.filter(t=>t.type==='todo'&&t.block===eid&&t.blockOcc===occ&&!mBtUnlink.includes(t.id)).sort(byOrder):[];
  const rowEl=(title,t,onX)=>{const r=document.createElement('div');r.className='ipin'+(t&&t.done?' done':'');if(t)paint(r,t);else r.style.setProperty('--evc',(cats.find(c=>c.id===mcat)||cats[0]).color);
    r.innerHTML=`<div class="ck"></div><b>${esc(title)}</b><button class="x">✕</button>`;const ck=r.querySelector('.ck');if(t){ck.onclick=()=>{t.done=!t.done;paintBT()}}else ck.style.cursor='default';
    r.querySelector('.x').onclick=onX;r.onpointerdown=null;w.appendChild(r)};
  linked.forEach(t=>rowEl(t.title,t,()=>{mBtUnlink.push(t.id);paintBT()}));
  mBtLink.forEach((id,k)=>{const t=items.find(i=>i.id===id);if(t)rowEl(t.title,t,()=>{mBtLink.splice(k,1);paintBT()})});
  mBtAdd.forEach((tt,k)=>rowEl(tt,null,()=>{mBtAdd.splice(k,1);paintBT()}))}
$('#f-btadd').onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){const t=e.target.value.trim();if(!t)return;mBtAdd.push(t);e.target.value='';paintBT()}};
$('#f-btpick').onclick=e=>{e.stopPropagation();openMenu($('#f-btpick'),m=>{const pool=items.filter(i=>i.type==='todo'&&!i.done&&!i.block&&(i.bucket==='soon'||i.bucket==='later')&&!mBtLink.includes(i.id)&&(mode!=='plan'||!i.draft)).sort(byOrder).slice(0,25);
    if(!pool.length){const d=document.createElement('div');d.className='lbl';d.textContent='곧·나중에 목록이 비어 있어요';m.appendChild(d)}pool.forEach(t=>m.appendChild(menuItem(t.title,()=>{mBtLink.push(t.id);paintBT()})))})};
function applyBT(ev,occ){mBtUnlink.forEach(id=>{const t=items.find(i=>i.id===id);if(t)unlink(t)});
  mBtLink.forEach((id,k)=>{const t=items.find(i=>i.id===id);if(t){let target=t;if(ev.draft&&!t.draft){target=Object.assign(JSON.parse(JSON.stringify(t)),{id:uid(),draft:true,link:t.id});items.push(target)}Object.assign(target,{block:ev.id,blockOcc:occ,bucket:'scheduled',date:occ,start:'',order:Date.now()+k})}});
  mBtAdd.forEach((tt,k)=>items.push({id:uid(),type:'todo',title:tt,cat:ev.cat,color:null,subs:[],done:false,order:Date.now()+100+k,draft:!!ev.draft,bucket:'scheduled',date:occ,start:'',block:ev.id,blockOcc:occ,alerts:[]}));
  mBtAdd=[];mBtLink=[];mBtUnlink=[]}
function paintBlockField(){const f=$('#f-block');if(!mblock){f.value='';return}const e=eventById(mblock.id);f.value=e?`${e.title} · ${fmtD(mblock.occ)}`:''}
$('#f-block').onclick=e=>{e.stopPropagation();const d=$('#f-date').value||todayStr;openMenu($('#f-block'),m=>{
  const evs=items.filter(i=>i.type==='event'&&!i.allday&&i.start&&occursOn(i,d)&&(mode==='plan'?i.draft:!i.draft)&&!(editing&&i.id===src(editing).id));
  m.appendChild(menuItem('없음',()=>{mblock=null;paintBlockField()},!mblock));
  if(!evs.length){const x=document.createElement('div');x.className='lbl';x.textContent=fmtD(d)+'에 일정 없음';m.appendChild(x)}
  evs.sort((a,b)=>mins(a.start)-mins(b.start)).forEach(ev=>m.appendChild(menuItem(`${fmtT(ev.start)} ${ev.title}`,()=>{mblock={id:ev.id,occ:d};paintBlockField()},mblock&&mblock.id===ev.id)))})};
const AL_M=[0,5,10,15,30,45,60,90,120,180,360,720,1440,2880,10080];
const alMText=m=>m===0?'정시':m<60?`${m}분 전`:m<1440?`${m/60}시간 전`:m<10080?`${m/1440}일 전`:'1주 전';
const AL_D=[0,1,2,3,7];const alDText=d=>d===0?'당일':d===7?'1주 전':`${d}일 전`;
const isTimedForm=()=>mtype==='event'?!$('#f-allday').checked:(mbucket==='scheduled'&&!$('#f-allday').checked);
const alText=a=>a.m!=null?alMText(a.m):`${alDText(a.d)} ${fmtT(a.t)}`;
function paintAlert(){const w=$('#f-alerts');w.innerHTML='';const timed=isTimedForm();
  malerts=malerts.map(a=>timed?(a.m!=null?a:{m:a.d?a.d*1440:0}):(a.d!=null?a:{d:a.m>=1440?Math.round(a.m/1440):0,t:'09:00'}));
  malerts.forEach((a,k)=>{const r=document.createElement('div');r.className='crow arow';r.innerHTML='<span class="cl">알림</span>';const f=document.createElement('input');f.className='fld';f.readOnly=true;f.value=alText(a);
    f.onclick=e=>{e.stopPropagation();if(f.classList.contains('on')){closeDpop();return}closeDpop();f.classList.add('on');dpopOwner=f;alertPicker(a,()=>{f.value=alText(a)});
      const po=$('#dpop');const rc=f.getBoundingClientRect();po.classList.add('on');const w2=po.offsetWidth,h=po.offsetHeight;let x=rc.left,y=rc.bottom+6;if(x+w2>innerWidth-8)x=innerWidth-w2-8;if(y+h>innerHeight-8)y=rc.top-6-h;po.style.left=x+'px';po.style.top=y+'px'};
    const x=document.createElement('button');x.className='x';x.textContent='✕';x.onclick=()=>{malerts.splice(k,1);paintAlert()};r.appendChild(f);r.appendChild(x);w.appendChild(r)});
  $('#f-perm').classList.toggle('hide',!(malerts.length&&('Notification'in window)&&Notification.permission!=='granted'));sepFix()}
$('#f-addalert').onclick=()=>{malerts.push(isTimedForm()?{m:10}:{d:0,t:'09:00'});paintAlert();ensurePerm()};
function mkWheel(wrap,vals,idx,fmt,on){const w=document.createElement('div');w.className='wheel';vals.forEach((v,k)=>{const d=document.createElement('div');d.textContent=fmt(v);d.classList.toggle('sel',k===idx);d.onclick=()=>{w.scrollTo({top:k*28,behavior:'smooth'})};w.appendChild(d)});
  wrap.appendChild(w);let ready=false;requestAnimationFrame(()=>{w.scrollTop=Math.max(0,idx)*28;setTimeout(()=>ready=true,150)});let t;
  w.addEventListener('scroll',()=>{clearTimeout(t);const k=Math.round(w.scrollTop/28);[...w.children].forEach((c,i)=>c.classList.toggle('sel',i===k));if(ready)t=setTimeout(()=>{on(vals[k])},90)});return w}
function alertPicker(a,onChange){const po=$('#dpop');po.className='dpop tp';po.innerHTML='';const wrap=document.createElement('div');wrap.className='wheels';po.appendChild(wrap);
  if(a.m!=null){mkWheel(wrap,AL_M,Math.max(0,AL_M.indexOf(a.m)),alMText,v=>{a.m=v;onChange()})}
  else{let cur=mins(a.t);let ap=cur>=720?1:0,h=(Math.floor(cur/60)%12)||12,mi=Math.round((cur%60)/5)*5%60;const apply=()=>{a.t=toT(((h%12)+ap*12)*60+mi);onChange()};
    mkWheel(wrap,AL_D,Math.max(0,AL_D.indexOf(a.d)),alDText,v=>{a.d=v;onChange()});
    mkWheel(wrap,['오전','오후'],ap,v=>v,v=>{ap=v==='오후'?1:0;apply()});const hs=[12,1,2,3,4,5,6,7,8,9,10,11];mkWheel(wrap,hs,hs.indexOf(h),v=>v+'시',v=>{h=v;apply()});
    const ms=[...Array(12)].map((_,k)=>k*5);mkWheel(wrap,ms,ms.indexOf(mi),v=>pad(v)+'분',v=>{mi=v;apply()})}}
function ensurePerm(){if(!('Notification'in window))return;if(Notification.permission==='default')Notification.requestPermission().then(paintAlert)}
$('#f-permbtn').onclick=()=>{if(!('Notification'in window))return;Notification.requestPermission().then(paintAlert)};
function paintCats(){const c=cats.find(x=>x.id===mcat)||cats[0];$('#f-catval').innerHTML=`<span class="tag" style="background:${tint(c.color)};color:${lift(c.color)}">${esc(c.name)}</span>`}
$('#f-catrow').onclick=e=>{e.stopPropagation();openMenu($('#f-catrow'),m=>cats.forEach(c=>m.appendChild(menuItem(c.name,()=>{mcat=c.id;paintCats();paintColors()},c.id===mcat))))};
function paintColors(){colorPicker($('#f-colors'),mcolor,c=>{mcolor=c;paintColors()},{auto:(cats.find(c=>c.id===mcat)||cats[0]).color,fixed:PRESET})}
let subOpen=false;
function paintSubs(focus){const w=$('#f-subs');w.innerHTML='';const tmp={get subs(){return msubs},set subs(v){msubs=v}};
  msubs.forEach(s=>w.appendChild(subRow(tmp,s,true)));if(focus||subOpen){w.appendChild(subInput(tmp,true));subOpen=false;setTimeout(()=>w.querySelector('input')?.focus(),0)}}
$('#f-addsub').onclick=()=>{subOpen=true;paintSubs(true)};
const REPT={'':'안 함',daily:'매일',weekly:'매주',monthly:'매월',yearly:'매년'};
function paintRep(){$('#f-repval').textContent=REPT[mrep];
  $('#f-daysrow').classList.toggle('hide',mrep!=='weekly');$('#f-untilrow').classList.toggle('hide',!mrep);
  const d=$('#f-days');d.innerHTML='';DOW.forEach((n,k)=>{const b=document.createElement('button');b.textContent=n;b.classList.toggle('on',mdays.includes(k));b.onclick=()=>{mdays=mdays.includes(k)?mdays.filter(x=>x!==k):[...mdays,k].sort();paintRep()};d.appendChild(b)});
  sepFix()}
$('#f-reprow').onclick=e=>{e.stopPropagation();openMenu($('#f-reprow'),m=>Object.keys(REPT).forEach(k=>m.appendChild(menuItem(REPT[k],()=>{
  mrep=k;if(mrep==='weekly'&&!mdays.length){const dv=$('#f-date').value;mdays=[dv?fromYmd(dv).getDay():cursor.getDay()]}paintRep()},mrep===k))))};
$('#f-until').addEventListener('change',paintRep);
$('#mtype').querySelectorAll('button').forEach(b=>b.onclick=()=>{mtype=b.dataset.t;paintForm()});
$('#mbucket').querySelectorAll('button').forEach(b=>b.onclick=()=>{mbucket=b.dataset.b;paintForm()});
$('#f-allday').onchange=paintForm;
let _pstart='';
$('#f-date').addEventListener('change',()=>{const nv=$('#f-date').value,ed=$('#f-dateend').value;
  if(nv&&ed){const dl=_pstart?dayDiff(_pstart,nv):0;if(dl)setVal($('#f-dateend'),addDays(ed,dl));else if(ed<nv)setVal($('#f-dateend'),nv)}
  _pstart=nv;paintForm()});
$('#f-dateend').addEventListener('change',()=>{const sd=$('#f-date').value,ed=$('#f-dateend').value;if(sd&&ed&&ed<sd)setVal($('#f-dateend'),sd)});
function paintForm(){
  $('#mtype').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===mtype));
  $('#mbucket').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.b===mbucket));
  const ev=mtype==='event';const hasDate=ev||mbucket==='scheduled';const noTime=$('#f-allday').checked;
  $('#mbucket').classList.toggle('hide',ev);$('#f-alldaywrap').classList.toggle('hide',!hasDate);$('#f-endwrap').classList.toggle('hide',!ev);$('#f-subwrap').classList.toggle('hide',ev);
  $('#f-startlbl').textContent=ev?'시작':'날짜';$('#f-alldaylbl').textContent=ev?'하루 종일':'시간 없음';
  $('#f-daterow').classList.toggle('hide',!hasDate);$('#f-repwrap').classList.toggle('hide',!hasDate);
  $('#f-daterow').classList.toggle('notime',noTime);$('#f-endwrap').classList.toggle('notime',noTime);
  $('#f-alwrap').classList.toggle('hide',!hasDate);paintAlert();
  $('#f-dth').classList.toggle('hide',!hasDate);$('#f-dtcard').classList.toggle('hide',!hasDate);
  $('#f-stylewrap').classList.toggle('hide',!(ev&&!$('#f-allday').checked));$('#f-btwrap').classList.toggle('hide',!(ev&&!$('#f-allday').checked));
  $('#f-blockwrap').classList.toggle('hide',!(mtype==='todo'&&mbucket==='scheduled'));
  sepFix();
}
function sepFix(){document.querySelectorAll('#ov .card').forEach(c=>{let first=true;
  c.querySelectorAll('.crow').forEach(r=>{const vis=r.offsetParent!==null;r.classList.toggle('nosep',vis&&first);if(vis)first=false})})}
function openModal(item,preset){
  editing=item;$('#ov').classList.add('on');$('#mdel').classList.toggle('hide',!item);$('#mdup').classList.toggle('hide',!item);
  $('#mconfirm').classList.toggle('hide',!(item&&src(item).draft));
  if(item){const s=src(item);mtype=s.type;mbucket=s.bucket||'soon';mcat=s.cat;mcolor=s.color||null;msubs=JSON.parse(JSON.stringify(s.subs||[]));
    mrep=s.rep?s.rep.freq:'';mdays=s.rep&&s.rep.days?s.rep.days.slice():[];malerts=JSON.parse(JSON.stringify(s.alerts||[]));mstyle=s.style||'normal';mblock=s.block?{id:s.block,occ:s.blockOcc}:null;mBtAdd=[];mBtLink=[];mBtUnlink=[];
    $('#f-title').value=s.title;$('#f-date').value=item.date||ymd(cursor);$('#f-allday').checked=s.type==='event'?!!s.allday:!s.start;
    const _sp=(s.dateEnd&&s.dateEnd>s.date)?dayDiff(s.date,s.dateEnd):0;$('#f-dateend').value=addDays($('#f-date').value,_sp);
    $('#f-start').value=s.start||'09:00';$('#f-end').value=s.end||'';$('#f-note').value=s.note||'';$('#f-until').value=s.rep&&s.rep.until||''}
  else{const p=preset||{};mtype=(!filter.event&&filter.todo)?'todo':'event';mbucket=(p.date||p.start)?'scheduled':'soon';mcat=cats.find(c=>c.on)?.id||cats[0].id;mcolor=null;msubs=[];mrep='';mdays=[];malerts=[];mstyle='normal';mblock=null;mBtAdd=[];mBtLink=[];mBtUnlink=[];
    $('#f-title').value='';$('#f-date').value=p.date||(page==='cal'?ymd(cursor):todayStr);$('#f-allday').checked=!!p.allday;$('#f-dateend').value=$('#f-date').value;
    const st=p.start||'09:00';$('#f-start').value=st;$('#f-end').value=p.end||toT(Math.min(mins(st)+60,23*60+59));$('#f-note').value='';$('#f-until').value=''}
  _pstart=$('#f-date').value;refreshFields();paintForm();paintCats();paintColors();paintSubs();paintRep();paintStyle();paintBT();paintBlockField();sepFix();setTimeout(()=>$('#f-title').focus(),30);
}
function closeModal(){$('#ov').classList.remove('on');editing=null}
$('#mcancel').onclick=closeModal;$('#ov').onclick=e=>{if(e.target.id==='ov')closeModal()};
function askBlock(ev,timeText){return new Promise(res=>{$('#b-title').textContent='어디에 둘까요?';$('#b-in').textContent=`"${ev.title}"에 넣기`;$('#b-at').textContent=timeText?`${timeText}에 따로 두기`:'따로 두기';$('#bov').classList.add('on');
  const done=v=>{$('#bov').classList.remove('on');res(v)};$('#b-in').onclick=()=>done('in');$('#b-at').onclick=()=>done('at');$('#bcancel').onclick=()=>done(null);$('#bov').onclick=e=>{if(e.target.id==='bov')done(null)}})}
function askScope(title){return new Promise(res=>{$('#s-title').textContent=title;$('#sov').classList.add('on');
  const done=v=>{$('#sov').classList.remove('on');res(v)};
  $('#sov').querySelectorAll('.scope button').forEach(b=>b.onclick=()=>done(b.dataset.s));$('#scancel').onclick=()=>done(null);$('#sov').onclick=e=>{if(e.target.id==='sov')done(null)}})}
function formData(){
  const title=$('#f-title').value.trim()||(mtype==='event'?'새 일정':'새 할 일');
  const d={type:mtype,title,cat:mcat,color:mcolor,note:$('#f-note').value.trim(),allday:false,start:'',end:'',date:null,dateEnd:null,bucket:undefined,subs:mtype==='todo'?msubs:[],rep:null,alerts:malerts,style:mtype==='event'?mstyle:undefined,block:null,blockOcc:null};
  if(mtype==='event'){d.date=$('#f-date').value||ymd(cursor);d.allday=$('#f-allday').checked;
    const de=$('#f-dateend').value;d.dateEnd=(de&&de>d.date)?de:null;
    if(!d.allday){d.start=$('#f-start').value||'09:00';d.end=$('#f-end').value||'';if(d.end&&!d.dateEnd&&mins(d.end)<=mins(d.start))d.end=''}}
  else{d.bucket=mbucket;if(mbucket==='scheduled'){d.date=$('#f-date').value||todayStr;d.start=$('#f-allday').checked?'':($('#f-start').value||'09:00');
    if(mblock&&eventById(mblock.id)){d.block=mblock.id;d.blockOcc=mblock.occ;d.date=mblock.occ;d.start=''}}}
  if(d.date&&mrep)d.rep={freq:mrep,days:mrep==='weekly'?(mdays.length?mdays:[fromYmd(d.date).getDay()]):[],until:$('#f-until').value||null};
  return d;
}
$('#msave').onclick=async()=>{
  const d=formData();
  if(!editing){const n=Object.assign({id:uid(),order:Date.now(),done:false,draft:mode==='plan'&&page==='cal'},d);items.push(n);if(n.type==='event')applyBT(n,n.date);save();closeModal();render();return}
  const s=src(editing);
  if(!s.rep){Object.assign(s,d);if(s.type==='event')applyBT(s,s.date);save();closeModal();render();return}
  const scope=await askScope('반복 항목 수정');if(!scope)return;
  const occ=editing._occ||s.date;
  if(scope==='one'){detach(editing._src?editing:inst(s,occ),Object.assign({},d,{rep:null,date:d.date||occ}))}
  else if(scope==='future'){const prev=addDays(occ,-1);if(prev<s.date){Object.assign(s,d,{date:d.date||occ})}else{s.rep=Object.assign({},s.rep,{until:prev});items.push(Object.assign(JSON.parse(JSON.stringify(s)),{id:uid(),skip:[],doneDates:[]},d,{date:d.date||occ}))}}
  else{Object.assign(s,d,{date:s.date})}
  if(s.type==='event')applyBT(s,occ);
  save();closeModal();render();
};
$('#mdel').onclick=async()=>{const s=src(editing);
  if(s.rep){const scope=await askScope('반복 항목 삭제');if(!scope)return;const occ=editing._occ||s.date;
    if(scope==='one'){s.skip=s.skip||[];s.skip.push(occ)}else if(scope==='future'){const prev=addDays(occ,-1);if(prev<s.date)items=items.filter(i=>i!==s);else s.rep.until=prev}else items=items.filter(i=>i!==s)}
  else items=items.filter(i=>i!==s);
  save();closeModal();render()};
$('#mdup').onclick=()=>{const s=src(editing);const d=Object.assign(JSON.parse(JSON.stringify(s)),formData(),{id:uid(),order:Date.now(),done:false,doneDates:[],skip:[]});
  if(d.type==='todo'){d.block=null;d.blockOcc=null}items.push(d);
  if(s.type==='event'){const occ=curOcc();items.filter(t=>t.type==='todo'&&t.block===s.id&&t.blockOcc===occ).forEach((t,k)=>items.push(Object.assign(JSON.parse(JSON.stringify(t)),{id:uid(),block:d.id,blockOcc:d.date,order:k,done:false})))}
  save();closeModal();render()};
$('#mconfirm').onclick=()=>{const s=src(editing);Object.assign(s,formData());if(s.type==='event')applyBT(s,curOcc());confirmDraft(s);save();closeModal();render()};
$('#f-title').addEventListener('keydown',e=>{if(e.key==='Enter')$('#msave').click()});

/* ---------- category modal ---------- */
let ecat=null,ccolor=PRESET[0];
function paintCColors(){colorPicker($('#c-colors'),ccolor,c=>{ccolor=c||PRESET[0];paintCColors()},{fixed:PRESET})}
function openCat(c){ecat=c;const sub=c&&c.ck;$('#cov').classList.add('on');
  $('#cdel').classList.toggle('hide',sub?false:(!c||cats.length<=1));
  $('#c-namef').classList.toggle('hide',!!sub);$('#c-h').classList.toggle('hide',!sub);
  if(sub)$('#c-h').textContent=c.name;
  $('#c-name').value=sub?'':(c?c.name:'');
  ccolor=sub?c.color():(c?c.color:PRESET[cats.length%PRESET.length]);paintCColors();
  if(!sub)setTimeout(()=>$('#c-name').focus(),30)}
function closeCat(){$('#cov').classList.remove('on');ecat=null}
$('#ccancel').onclick=closeCat;$('#cov').onclick=e=>{if(e.target.id==='cov')closeCat()};
$('#csave').onclick=()=>{if(ecat&&ecat.ck){prefs[ecat.ck]=ccolor;savePrefs();closeCat();render();return}const name=$('#c-name').value.trim()||'카테고리';if(ecat){ecat.name=name;ecat.color=ccolor}else cats.push({id:uid(),name,color:ccolor,on:true});saveCats();closeCat();render()};
$('#cdel').onclick=async()=>{if(ecat&&ecat.ck){if(!await ask('구독 삭제',`"${ecat.name}" 구독을 삭제할까요? 구독 목록의 + 버튼으로 다시 추가할 수 있어요.`,'삭제',true))return;
    prefs.subDel=[...(prefs.subDel||[]),ecat.key];savePrefs();closeCat();render();return}
  if(!ecat||cats.length<=1)return;const n=items.filter(i=>i.cat===ecat.id).length;const fb=cats.find(c=>c!==ecat);
  if(!await ask('카테고리 삭제',`"${ecat.name}"을(를) 삭제할까요?${n?` 항목 ${n}개는 "${fb.name}"(으)로 옮겨져요.`:''}`,'삭제',true))return;
  items.forEach(i=>{if(i.cat===ecat.id)i.cat=fb.id});cats=cats.filter(c=>c!==ecat);saveCats();save();closeCat();render()};
$('#c-name').addEventListener('keydown',e=>{if(e.key==='Enter')$('#csave').click()});

/* ---------- notifications ---------- */
let fired=J('planner.fired',{});
function checkAlerts(){const now=new Date();const nowMs=now.getTime();let changed=false;
  const days=[-1,0,1,2,3,7].map(k=>addDays(todayStr,k));
  items.forEach(i=>{if(!(i.alerts&&i.alerts.length)||i.draft||!i.date)return;days.forEach(occ=>{if(!occursOn(i,occ))return;const timed=i.start&&!i.allday;
    i.alerts.forEach((a,k)=>{const base=fromYmd(occ).getTime();const at=a.m!=null?base+mins(i.start||'00:00')*60000-a.m*60000:base-a.d*864e5+mins(a.t)*60000;const key=i.id+'|'+occ+'|'+k;
      if(nowMs>=at&&nowMs<at+120000&&!fired[key]){fired[key]=nowMs;changed=true;notify(inst(i,occ),(occ===todayStr?'오늘':fmtD(occ))+(timed?' '+fmtT(i.start):''))}})})});
  const cut=nowMs-3*864e5;Object.keys(fired).forEach(k=>{if(fired[k]<cut){delete fired[k];changed=true}});if(changed)LS('planner.fired',JSON.stringify(fired))}
function notify(i,when){const body=`${when} · ${catOf(i).name}`;
  if('Notification'in window&&Notification.permission==='granted'){try{const n=new Notification(i.title,{body,tag:i.id+i.date});n.onclick=()=>{window.focus();openModal(i);n.close()}}catch(e){}}
  toast(i,body)}
function toast(i,body){const t=document.createElement('div');t.className='toast';paint(t,i);t.innerHTML=`<div class="bar"></div><div><b>${esc(i.title)}</b><span>${esc(body)}</span></div><button class="x">✕</button>`;
  t.onclick=()=>{openModal(i);t.remove()};t.querySelector('.x').onclick=e=>{e.stopPropagation();t.remove()};document.body.appendChild(t);setTimeout(()=>t.remove(),12000)}
setInterval(checkAlerts,20000);
applyTheme();lastSnap=snap();render();checkAlerts();
window.addEventListener('resize',()=>{if(page==='cal'&&view!=='month')render()});
setInterval(()=>{if(page==='cal'&&view!=='month')render()},60000);
