(function(){
"use strict";
const DAY=864e5, HOUR=36e5, KEY="sla-proto-v1";
const ME="أحمد كريم", MGR="م. سعاد الربيعي";
const TYPES={vurg:"عاجل جداً",urg:"عاجل",nor:"اعتيادي"};
const DEPTS={"الموارد البشرية":["أحمد كريم","زينب علي","مصطفى حسن"],"المالية":["علي جبار","نور الهدى"],"تقنية المعلومات":["حيدر سلمان","سارة فاضل"],"العقود":["كرار ناصر","هبة عباس"]};
const MANAGERS={"الموارد البشرية":MGR,"المالية":"م. رعد العبيدي","تقنية المعلومات":"م. ليث الجبوري","العقود":"م. إيمان الخفاجي"};
const deptOf=e=>Object.keys(DEPTS).find(d=>DEPTS[d].includes(e));
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function seed(){
  const now=Date.now();
  const raw=[
    ["٢٠٢٦/١٤٥٢","دائرة الشؤون الإدارية","طلب تزويد بيانات الموظفين","urg",ME,-1.7],
    ["٢٠٢٦/١٤٤٧","وزارة المالية","تعميم بشأن الموازنة التشغيلية","nor",ME,-6.2],
    ["٢٠٢٦/١٤٣٩","قسم تقنية المعلومات","تحديث صلاحيات المستخدمين","vurg",ME,-0.3],
    ["٢٠٢٦/١٤٢٨","هيئة النزاهة","استفسار حول عقد التوريد","urg",ME,-2.6],
    ["٢٠٢٦/١٤٦٠","مكتب المدير العام","توجيه بشأن الدوام الرسمي","nor",ME,-1],
    ["٢٠٢٦/١٤٦١","ديوان الرقابة المالية","طلب كشوفات الصرف للربع الثالث","vurg","علي جبار",-1.4],
    ["٢٠٢٦/١٤٥٥","وزارة التخطيط","استمارة المؤشرات الإحصائية","nor","نور الهدى",-10.5],
    ["٢٠٢٦/١٤٤٠","شركة الرافدين","عرض صيانة الشبكة","urg","حيدر سلمان",-4.9],
    ["٢٠٢٦/١٤٥٨","قسم العقود","مسودة عقد النظافة","nor","كرار ناصر",-3],
    ["٢٠٢٦/١٤٥٩","وزارة الكهرباء","تنسيق جدول القطع المبرمج","urg","هبة عباس",-1.2],
    ["٢٠٢٦/١٤٦٣","مجلس المحافظة","دعوة لاجتماع لجنة الخدمات","vurg","زينب علي",-0.85],
    ["٢٠٢٦/١٤٣٥","الأمانة العامة","تقرير الأداء الشهري","nor","مصطفى حسن",-12],
    ["٢٠٢٦/١٤٦٤","قسم تقنية المعلومات","طلب نسخة احتياطية للخادم","urg","سارة فاضل",-0.5],
  ];
  const books=raw.map((r,i)=>{
    const rec=now+r[5]*DAY;
    const reg="مسجل الوارد";
    const mv=[{at:rec,who:reg,dept:"قسم الوارد",act:"تسجيل الكتاب"},
              {at:rec+0.08*DAY,who:MANAGERS[deptOf(r[4])],dept:deptOf(r[4]),act:"إحالة للقسم مع هامش"},
              {at:rec+0.15*DAY,who:r[4],dept:deptOf(r[4]),act:"استلام للتنفيذ"}];
    return {id:i+1,num:r[0],from:r[1],subject:r[2],type:r[3],holder:r[4],received:rec,movements:mv,done:false,escalated:false,escHist:[],ext:null,dueOverride:null,flags:{}};
  });
  books[3].done=true; books[3].doneAt=now-0.2*DAY;
  return {now,speed:1,role:"emp",tab:"inbox",filter:"all",settings:{sla:{vurg:1,urg:2,nor:7},escDays:2,nearPct:25},books,notifs:[]};
}
let S;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.books) S=seed();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

const due=b=>b.dueOverride||b.received+S.settings.sla[b.type]*DAY;
const total=b=>due(b)-b.received;
function status(b){
  if(b.done) return "done";
  const left=due(b)-S.now;
  if(left<0) return "bad";
  if(left<total(b)*S.settings.nearPct/100) return "warn";
  return "ok";
}
const ST={ok:["ok","بالوقت"],warn:["warn","قرب الموعد"],bad:["bad","متأخر"],done:["done","منجز"]};
function fmtDur(ms){
  const a=Math.abs(ms), d=Math.floor(a/DAY), h=Math.floor(a%DAY/HOUR), m=Math.floor(a%HOUR/6e4), s=Math.floor(a%6e4/1e3);
  if(d) return `${d} ي ${h} س`;
  if(h) return `${h} س ${m} د`;
  return `${m} د ${String(s).padStart(2,"0")} ث`;
}
const fmtDate=t=>{const d=new Date(t);return d.toLocaleDateString("en-CA")+" "+d.toTimeString().slice(0,5)};
const visible=()=>S.role==="mgr"?S.books:S.books.filter(b=>b.holder===ME||(b.escHist[0]&&b.escHist[0].from===ME));

function notify(kind,title,text,bookId,toast=true){
  S.notifs.unshift({id:Date.now()+Math.random(),kind,title,text,bookId,at:S.now,read:false});
  S.notifs=S.notifs.slice(0,60);
  if(toast) showToast(title,text,kind);
}
function showToast(title,text,kind="ok"){
  const c={ok:"#10B981",warn:"#F59E0B",bad:"#EF4444",esc:"#7C3AED",info:"#2563EB"}[kind]||"#10B981";
  const el=document.createElement("div");el.className="toast";el.style.setProperty("--c",c);
  el.innerHTML=`<b>${esc(title)}</b>${esc(text)}`;$("#toasts").appendChild(el);
  setTimeout(()=>el.remove(),5000);
  while($("#toasts").children.length>4) $("#toasts").firstChild.remove();
}

// rules engine
function evaluate(){
  let changed=false;
  for(const b of S.books){
    if(b.done) continue;
    const st=status(b);
    if(st==="warn"&&!b.flags.near){b.flags.near=1;changed=true;notify("warn","قرب الموعد",`الكتاب ${b.num} «${b.subject}» باقي عليه ${fmtDur(due(b)-S.now)}`,b.id,b.holder===ME||S.role==="mgr")}
    if(st==="bad"&&!b.flags.over){b.flags.over=1;b.flags.near=1;changed=true;notify("bad","تأخر الكتاب",`تجاوز الكتاب ${b.num} الموعد المحدد — عند ${b.holder}`,b.id,b.holder===ME||S.role==="mgr")}
    if(st==="bad"&&!b.escalated&&S.now>due(b)+S.settings.escDays*DAY){
      const mgr=MANAGERS[deptOf(b.holder)];
      b.escalated=true;changed=true;
      const at=due(b)+S.settings.escDays*DAY;
      b.escHist.push({at,from:b.holder,to:mgr,reason:`تجاوز الموعد بـ ${S.settings.escDays} يوم بدون إجراء`});
      b.movements.push({at,who:mgr,dept:deptOf(b.holder),act:"تصعيد تلقائي للمدير",esc:true});
      notify("esc","تم التصعيد لمديرك",`الكتاب ${b.num} انرفع تلقائياً إلى ${mgr}`,b.id);
      flashRow(b.id);
    }
  }
  return changed;
}
function flashRow(id){setTimeout(()=>{const r=document.querySelector(`tr[data-id="${id}"]`);if(r){r.classList.remove("flash");void r.offsetWidth;r.classList.add("flash")}},30)}

// INBOX
function renderChips(){
  const list=visible(), c={all:list.length,ok:0,warn:0,bad:0,esc:0,done:0};
  list.forEach(b=>{c[status(b)]++;if(b.escalated&&!b.done)c.esc++});
  const defs=[["all","الكل"],["ok","بالوقت"],["warn","قرب الموعد"],["bad","متأخر"],["esc","مُصعَّد"],["done","منجز"]];
  $("#statusChips").innerHTML=defs.map(([k,l])=>`<button class="chip-f ${S.filter===k?"active":""}" data-f="${k}">${l}<span class="cnt">${c[k]}</span></button>`).join("");
}
function renderInbox(){
  renderChips();
  const q=$("#q").value.trim(), tf=$("#typeF").value, sort=$("#sortF").value;
  let list=visible().filter(b=>{
    if(tf&&b.type!==tf) return false;
    if(q&&!(b.num+b.subject+b.from+b.holder).includes(q)) return false;
    if(S.filter==="all") return true;
    if(S.filter==="esc") return b.escalated&&!b.done;
    return status(b)===S.filter;
  });
  list.sort(sort==="late"?(a,b)=>(a.done-b.done)||((due(a)-S.now)-(due(b)-S.now)):(a,b)=>b.received-a.received);
  $("#inboxTbl tbody").innerHTML=list.map(b=>{
    const st=status(b), left=due(b)-S.now, pct=Math.max(0,Math.min(100,left/total(b)*100));
    const col={ok:"#10B981",warn:"#F59E0B",bad:"#EF4444",done:"#94A3B8"}[st];
    const cd=b.done?`<span class="muted">أُنجز ${fmtDate(b.doneAt)}</span>`:
      `<div class="cd ${st}" data-cd="${b.id}">${left<0?"متأخر ":"باقي "}${fmtDur(left)}</div><div class="mini-bar"><i style="width:${st==="bad"?100:pct}%;background:${col}"></i></div>`;
    return `<tr data-id="${b.id}" class="${st==="bad"?"row-bad":""} ${b.done?"done":""}">
      <td class="num">${b.num}</td><td>${fmtDate(b.received)}</td><td>${esc(b.from)}</td><td>${esc(b.subject)}</td>
      <td><span class="type-chip t-${b.type}">${TYPES[b.type]} · ${S.settings.sla[b.type]} ي</span></td>
      <td>${esc(b.escalated&&!b.done?MANAGERS[deptOf(b.holder)]:b.holder)}</td>
      <td>${cd}</td>
      <td><span class="pill ${ST[st][0]}">${ST[st][1]}</span>${b.escalated&&!b.done?'<br><span class="badge-esc">⬆ مُصعَّد</span>':""}${b.ext&&b.ext.status==="pending"?'<br><span class="badge-pend">تمديد بانتظار الموافقة</span>':""}</td>
      <td><button class="view-btn" data-open="${b.id}">عرض</button></td></tr>`;
  }).join("");
  $("#emptyMsg").classList.toggle("hidden",list.length>0);
}

// DASH
function renderDash(){
  const open=S.books.filter(b=>!b.done), cnt={ok:0,warn:0,bad:0};
  open.forEach(b=>cnt[status(b)]++);
  const escN=open.filter(b=>b.escalated).length;
  const done=S.books.filter(b=>b.done);
  const avg=done.length?done.reduce((s,b)=>s+(b.doneAt-b.received),0)/done.length:0;
  const k=[["إجمالي المفتوحة",open.length,"#475569",""],["بالوقت",cnt.ok,"#10B981",""],["قرب الموعد",cnt.warn,"#F59E0B",""],["متأخرة",cnt.bad,"#EF4444",""],["مُصعَّدة",escN,"#7C3AED",""],["متوسط وقت الإنجاز",done.length?fmtDur(avg):"—","#9E1D15",`من ${done.length} كتاب منجز`]];
  $("#kpis").innerHTML=k.map(([l,v,c,s])=>`<div class="kpi" style="--c:${c}"><div class="k-l">${l}</div><div class="k-v" style="color:${c}">${v}</div><div class="k-s">${s||"&nbsp;"}</div></div>`).join("");
  const max=Math.max(1,...Object.keys(DEPTS).map(d=>open.filter(b=>deptOf(b.holder)===d).length));
  $("#deptChart").innerHTML=Object.keys(DEPTS).map(d=>{
    const bs=open.filter(b=>deptOf(b.holder)===d);
    const seg={ok:0,warn:0,bad:0,esc:0};bs.forEach(b=>{if(b.escalated)seg.esc++;else seg[status(b)]++});
    const w=n=>(n/max*100)+"%";
    return `<div class="bar-row"><span>${d}</span><div class="bar-track"><span class="seg-ok" style="width:${w(seg.ok)}" title="بالوقت ${seg.ok}"></span><span class="seg-warn" style="width:${w(seg.warn)}" title="قرب الموعد ${seg.warn}"></span><span class="seg-bad" style="width:${w(seg.bad)}" title="متأخر ${seg.bad}"></span><span class="seg-esc" style="width:${w(seg.esc)}" title="مُصعَّد ${seg.esc}"></span></div><b>${bs.length}</b></div>`;
  }).join("")+`<div class="legend"><span><i class="seg-ok"></i>بالوقت</span><span><i class="seg-warn"></i>قرب الموعد</span><span><i class="seg-bad"></i>متأخر</span><span><i class="seg-esc"></i>مُصعَّد</span></div>`;
  const emp={};
  open.filter(b=>status(b)==="bad").forEach(b=>{const e=emp[b.holder]||(emp[b.holder]={n:0,e:0,max:0});e.n++;if(b.escalated)e.e++;e.max=Math.max(e.max,S.now-due(b))});
  const rows=Object.entries(emp).sort((a,b)=>b[1].max-a[1].max);
  $("#lateEmp tbody").innerHTML=rows.length?rows.map(([n,e])=>`<tr><td><b>${n}</b></td><td>${deptOf(n)}</td><td><span class="pill bad">${e.n}</span></td><td>${e.e?`<span class="badge-esc">${e.e}</span>`:"—"}</td><td class="cd bad">${fmtDur(e.max)}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">ماكو موظفين متأخرين</td></tr>`;
  const stuck=open.filter(b=>status(b)!=="ok").sort((a,b)=>due(a)-due(b));
  $("#stuckTbl tbody").innerHTML=stuck.map(b=>{const st=status(b),l=due(b)-S.now;return `<tr data-id="${b.id}"><td class="num">${b.num}</td><td>${esc(b.subject)}</td><td>${b.holder}<div class="muted">${deptOf(b.holder)}</div></td><td class="cd ${st}">${l<0?"متأخر ":"باقي "}${fmtDur(l)}</td><td><span class="pill ${st}">${ST[st][1]}</span>${b.escalated?' <span class="badge-esc">⬆ مُصعَّد</span>':""}</td><td style="white-space:nowrap"><button class="btn ghost sm" data-remind="${b.id}">🔔 تذكير</button> <button class="btn ghost sm" data-redirect="${b.id}">↪ إعادة توجيه</button> <button class="btn ghost sm" data-open="${b.id}">عرض</button></td></tr>`}).join("");
  $("#stuckEmpty").classList.toggle("hidden",stuck.length>0);
  const reqs=S.books.filter(b=>b.ext&&b.ext.status==="pending");
  $("#extReqs").innerHTML=reqs.length?reqs.map(b=>`<div class="ext-req"><div><b>${b.num}</b> — ${esc(b.subject)}<div class="muted">من ${b.holder}: «${esc(b.ext.reason)}» · الموعد المقترح ${fmtDate(b.ext.newDue)}</div></div><div><button class="btn primary sm" data-approve="${b.id}">موافقة</button> <button class="btn ghost sm" data-reject="${b.id}">رفض</button></div></div>`).join(""):`<div class="muted">لا توجد طلبات</div>`;
}

// SETTINGS
function renderSettings(){
  $("#slaRows").innerHTML=Object.keys(TYPES).map(t=>`<div class="set-row"><span class="lbl"><span class="type-chip t-${t}">${TYPES[t]}</span></span><input type="number" min="0.5" step="0.5" data-sla="${t}" value="${S.settings.sla[t]}"><span>يوم</span></div>`).join("");
  $("#escDays").value=S.settings.escDays; $("#nearPct").value=S.settings.nearPct;
}

// DRAWER
let openId=null;
function openDrawer(id){openId=id;renderDrawer();$("#drawer").classList.add("open");$("#overlay").classList.remove("hidden");$("#drawer").setAttribute("aria-hidden","false")}
function closeDrawer(){openId=null;$("#drawer").classList.remove("open");$("#overlay").classList.add("hidden");$("#drawer").setAttribute("aria-hidden","true")}
function renderDrawer(){
  const b=S.books.find(x=>x.id===openId); if(!b) return;
  const st=status(b), left=due(b)-S.now, used=Math.min(100,Math.max(0,(S.now-b.received)/total(b)*100));
  const col={ok:"#10B981",warn:"#F59E0B",bad:"#EF4444",done:"#94A3B8"}[st];
  $("#drNum").textContent=b.num; $("#drSub").textContent=b.subject+" — "+b.from;
  const end=b.done?b.doneAt:S.now;
  const tl=b.movements.map((m,i)=>{const nx=b.movements[i+1],cur=!nx&&!b.done;const spent=(nx?nx.at:end)-m.at;
    return `<div class="tl-item ${cur?"cur":""} ${m.esc?"esc":""}"><div class="tl-t">${esc(m.act)} <span class="dur">${cur?"منذ ":"بقي "}${fmtDur(spent)}</span></div><div class="tl-d">${esc(m.who)} · ${esc(m.dept)} · ${fmtDate(m.at)}</div></div>`}).join("")
    +(b.done?`<div class="tl-item"><div class="tl-t">✓ تم اتخاذ الإجراء</div><div class="tl-d">${fmtDate(b.doneAt)}</div></div>`:"");
  const escH=b.escHist.length?b.escHist.map(e=>`<div class="esc-item">⬆ <b>${fmtDate(e.at)}</b> — من ${e.from} إلى ${e.to}<div class="muted">${e.reason}</div></div>`).join(""):`<div class="muted">لم يُصعَّد هذا الكتاب</div>`;
  const ext=b.ext?`<div class="sec"><div class="sec-t">طلب التمديد</div><div class="${b.ext.status==="pending"?"badge-pend":b.ext.status==="approved"?"pill ok":"pill bad"}">${{pending:"بانتظار موافقة المدير",approved:"تمت الموافقة",rejected:"مرفوض"}[b.ext.status]}</div><div class="muted" style="margin-top:6px">«${esc(b.ext.reason)}» — الموعد المقترح ${fmtDate(b.ext.newDue)}</div></div>`:"";
  $("#drBody").innerHTML=`
   <div class="sec meta"><div><span>نوع المدة</span><span class="type-chip t-${b.type}">${TYPES[b.type]} · ${S.settings.sla[b.type]} يوم</span></div><div><span>الحالة</span><span class="pill ${st}">${ST[st][1]}</span>${b.escalated&&!b.done?' <span class="badge-esc">⬆ مُصعَّد</span>':""}</div>
   <div><span>تاريخ الورود</span>${fmtDate(b.received)}</div><div><span>الموعد النهائي</span>${fmtDate(due(b))}${b.dueOverride?' <span class="muted">(ممدد)</span>':""}</div>
   <div><span>عند</span>${b.escalated&&!b.done?MANAGERS[deptOf(b.holder)]+" (مُصعَّد من "+b.holder+")":b.holder}</div><div><span>القسم</span>${deptOf(b.holder)}</div></div>
   <div class="sec"><div class="sec-t">مدة الإنجاز (SLA)</div><div class="sla-big"><i style="width:${b.done?100:used}%;background:${col}"></i></div>
   <div class="sla-lbl"><span>${b.done?"منجز":left<0?"متأخر "+fmtDur(left):"باقي "+fmtDur(left)}</span><span>${Math.round(used)}% من المدة مستهلكة</span></div></div>
   ${b.done?`<div class="sec done-box">✓ تم اتخاذ الإجراء وتوقف العدّاد</div>`:""}
   ${ext}
   <div class="sec"><div class="sec-t">مسار الكتاب والوقت عند كل محطة</div><div class="tl">${tl}</div></div>
   <div class="sec"><div class="sec-t">سجل التصعيد</div>${escH}</div>`;
  $("#actBtn").disabled=b.done; $("#extBtn").disabled=b.done||(b.ext&&b.ext.status==="pending");
}

// modal
function openExt(){const b=S.books.find(x=>x.id===openId);$("#extReason").value="";$("#extErr").classList.add("hidden");
  const d=new Date(Math.max(due(b),S.now)+2*DAY);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$("#extDate").value=d.toISOString().slice(0,16);$("#modal").classList.remove("hidden");$("#extReason").focus()}

// RENDER
function render(){
  document.body.className=S.role;
  $$(".role-switch button").forEach(x=>x.classList.toggle("active",x.dataset.role===S.role));
  if(S.role==="emp"&&S.tab==="dash") S.tab="inbox";
  $$("#mainTabs button").forEach(x=>x.classList.toggle("active",x.dataset.tab===S.tab));
  $$(".tab-pane").forEach(p=>p.classList.toggle("hidden",p.id!=="tab-"+S.tab));
  $("#userChip").textContent="👤 "+(S.role==="mgr"?MGR:ME);
  $("#simClock").textContent="الوقت الحالي بالمحاكاة: "+fmtDate(S.now);
  $("#speedSel").value=String(S.speed);
  if(S.tab==="inbox") renderInbox(); else if(S.tab==="dash") renderDash();
  if(openId) renderDrawer();
  renderNotifs();
}
function renderNotifs(){
  const mine=S.notifs;
  const unread=mine.filter(n=>!n.read).length;
  $("#bellCount").textContent=unread;$("#bellCount").classList.toggle("zero",!unread);
  const ico={warn:"⏳",bad:"⚠️",esc:"⬆️",ok:"✓",info:"↪"};
  $("#notifList").innerHTML=mine.length?mine.map(n=>`<div class="notif ${n.read?"":"unread"}" data-nid="${n.id}" data-open="${n.bookId}"><div class="n-ico ${n.kind}">${ico[n.kind]||"•"}</div><div><div class="n-t">${esc(n.title)}</div><div class="n-d">${esc(n.text)}</div><div class="n-d">${fmtDate(n.at)}</div></div></div>`).join(""):`<div class="empty">لا توجد تنبيهات</div>`;
}

// EVENTS
document.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-open],[data-f]"); 
  if(!$("#notifPanel").contains(e.target)&&!e.target.closest("#bellBtn")) $("#notifPanel").classList.add("hidden");
  if(!t) return;
  const d=t.dataset;
  if(d.role){S.role=d.role;save();render();return}
  if(d.tab){S.tab=d.tab;save();render();return}
  if(d.f){S.filter=d.f;save();renderInbox();return}
  if(d.jump){S.now+=+d.jump;evaluate();save();render();showToast("مرور الوقت","تم تقديم الساعة "+fmtDur(+d.jump),"info");return}
  if(d.nid){const n=S.notifs.find(x=>String(x.id)===d.nid);if(n)n.read=true;$("#notifPanel").classList.add("hidden");save();openDrawer(+d.open);render();return}
  if(d.open){openDrawer(+d.open);return}
  if(d.remind){const b=S.books.find(x=>x.id===+d.remind);showToast("تم إرسال التذكير",`وصل تذكير إلى ${b.holder} بخصوص الكتاب ${b.num}`,"ok");return}
  if(d.redirect){const b=S.books.find(x=>x.id===+d.redirect);const dept=deptOf(b.holder);const others=DEPTS[dept].filter(x=>x!==b.holder);const to=others[(b.id)%others.length]||b.holder;
    const old=b.holder;b.holder=to;b.movements.push({at:S.now,who:to,dept,act:"إعادة توجيه من المدير"});b.escalated=false;b.flags={};b.received=S.now;b.dueOverride=null;
    showToast("تمت إعادة التوجيه",`الكتاب ${b.num} انتقل من ${old} إلى ${to} وبدأ عدّاد جديد`,"info");evaluate();save();render();return}
  if(d.approve||d.reject){const b=S.books.find(x=>x.id===+(d.approve||d.reject));
    if(d.approve){b.ext.status="approved";b.dueOverride=b.ext.newDue;b.flags={};b.escalated=false;b.movements.push({at:S.now,who:MGR,dept:deptOf(b.holder),act:"موافقة على تمديد المدة"});showToast("تمت الموافقة","تم تمديد موعد الكتاب "+b.num,"ok")}
    else{b.ext.status="rejected";showToast("تم الرفض","رُفض طلب تمديد الكتاب "+b.num,"bad")}
    if(b.holder===ME) notify(d.approve?"ok":"bad",d.approve?"تمت الموافقة على التمديد":"رُفض طلب التمديد",`الكتاب ${b.num}`,b.id,false);
    evaluate();save();render();return}
});
$("#bellBtn").onclick=e=>{e.stopPropagation();$("#notifPanel").classList.toggle("hidden")};
$("#markRead").onclick=()=>{S.notifs.forEach(n=>n.read=true);save();renderNotifs()};
$("#drClose").onclick=closeDrawer;$("#overlay").onclick=closeDrawer;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("#modal").classList.contains("hidden"))$("#modal").classList.add("hidden");else closeDrawer()}});
$("#actBtn").onclick=()=>{const b=S.books.find(x=>x.id===openId);b.done=true;b.doneAt=S.now;save();render();showToast("تم اتخاذ الإجراء",`الكتاب ${b.num} أُنجز وتوقف العدّاد (${fmtDur(b.doneAt-b.received)})`,"ok")};
$("#extBtn").onclick=openExt;$("#extCancel").onclick=()=>$("#modal").classList.add("hidden");
$("#extSend").onclick=()=>{const b=S.books.find(x=>x.id===openId);const r=$("#extReason").value.trim(),dt=new Date($("#extDate").value).getTime();
  const err=!r?"اكتب سبب التمديد":isNaN(dt)||dt<=due(b)?"الموعد الجديد لازم يكون بعد الموعد الحالي":"";
  if(err){$("#extErr").textContent=err;$("#extErr").classList.remove("hidden");return}
  b.ext={status:"pending",reason:r,newDue:dt,at:S.now};$("#modal").classList.add("hidden");save();render();
  showToast("أُرسل طلب التمديد",`بانتظار موافقة ${MANAGERS[deptOf(b.holder)]}`,"warn")};
["q","typeF","sortF"].forEach(id=>$("#"+id).addEventListener("input",renderInbox));
$("#typeF").innerHTML+=Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
$("#speedSel").onchange=e=>{S.speed=+e.target.value;save()};
$("#slaRows").addEventListener("change",e=>{const t=e.target.dataset.sla;const v=parseFloat(e.target.value);if(t&&v>0){S.settings.sla[t]=v;applied()}});
$("#escDays").onchange=e=>{const v=parseFloat(e.target.value);if(v>=0){S.settings.escDays=v;applied()}};
$("#nearPct").onchange=e=>{const v=parseFloat(e.target.value);if(v>=5&&v<=90){S.settings.nearPct=v;applied()}};
function applied(){S.books.forEach(b=>{if(!b.done&&status(b)==="ok")b.flags={}});evaluate();save();render();$("#setNote").textContent="✓ طُبِّقت الإعدادات على الكتب المفتوحة";showToast("تم حفظ الإعدادات","طُبِّقت المدد الجديدة مباشرة","ok")}
$("#resetBtn").onclick=()=>{localStorage.removeItem(KEY);S=seed();closeDrawer();evaluate();S.notifs.forEach(n=>n.read=false);save();renderSettings();render();showToast("تمت إعادة الضبط","رجعت البيانات التجريبية","info")};

// boot
const firstRun=!S.notifs.length; evaluate(); if(firstRun) $("#toasts").innerHTML="";
renderSettings(); render(); save();
let last=Date.now();
setInterval(()=>{const n=Date.now();S.now+=(n-last)*S.speed;last=n;const ch=evaluate();
  if(S.speed>1||ch){render()}else{ // light tick: countdown cells only
    if(S.tab==="inbox") $$("[data-cd]").forEach(el=>{const b=S.books.find(x=>x.id===+el.dataset.cd);const l=due(b)-S.now;el.textContent=(l<0?"متأخر ":"باقي ")+fmtDur(l)});
    else if(S.tab==="dash") renderDash();
    if(openId) renderDrawer();
    $("#simClock").textContent="الوقت الحالي بالمحاكاة: "+fmtDate(S.now);}
  if(Math.floor(n/5000)!==Math.floor((n-1000)/5000)) save();
},1000);
window.__S=()=>S;
})();
