(function () {
"use strict";
const DAY = 864e5, HOUR = 36e5, KEY = "asits-sla-proto-v2";
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const AR = (s) => String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

/* ---------- organisation (fake) ---------- */
const USERS = {
  ali:    { name: "علي حسين كاظم", hat: "موظف — شعبة الأنظمة", dept: "تقنية المعلومات", mgr: "suad", kind: "emp" },
  zainab: { name: "زينب عبد الكريم", hat: "موظف — شعبة الشبكات", dept: "تقنية المعلومات", mgr: "suad", kind: "emp" },
  suad:   { name: "م. سعاد الربيعي", hat: "رئيس قسم تقنية المعلومات", dept: "تقنية المعلومات", mgr: "gm", kind: "mgr" },
  mustafa:{ name: "مصطفى حسن", hat: "موظف", dept: "الموارد البشرية", mgr: "hrm", kind: "emp" },
  noor:   { name: "نور الهدى جاسم", hat: "موظف", dept: "المالية", mgr: "finm", kind: "emp" },
  karrar: { name: "كرار ناصر", hat: "موظف", dept: "العقود", mgr: "conm", kind: "emp" },
  hiba:   { name: "هبة عباس", hat: "موظف", dept: "العقود", mgr: "conm", kind: "emp" },
  hrm:    { name: "م. رعد العبيدي", hat: "رئيس قسم الموارد البشرية", dept: "الموارد البشرية", mgr: "gm", kind: "mgr" },
  finm:   { name: "م. ليث الجبوري", hat: "رئيس قسم المالية", dept: "المالية", mgr: "gm", kind: "mgr" },
  conm:   { name: "م. إيمان الخفاجي", hat: "رئيس قسم العقود", dept: "العقود", mgr: "gm", kind: "mgr" },
  gm:     { name: "المدير العام", hat: "المدير العام", dept: "مكتب المدير العام", mgr: null, kind: "gm" },
};
const HATS = ["ali", "zainab", "suad"];
const DEPTS = ["تقنية المعلومات", "الموارد البشرية", "المالية", "العقود"];
const PRIORITIES = [
  { v: "VIM", n: "عاجل جداً" }, { v: "IMP", n: "مهم" }, { v: "NOR", n: "اعتيادي" }, { v: "LOW", n: "منخفض" }];
const pName = (v) => (PRIORITIES.find((p) => p.v === v) || {}).n || "";
const TYPE = { INC: ["وارد", "incomming_chip"], OUT: ["صادر", "outgoing_chip"], INT: ["مذكرة داخلية", "internal_chip"] };
const STATUSES = ["قيد الإجراء", "مكتمل"];
const PRODUCERS = {
  emp: [{ v: "TOHEAD", n: "إعادة إلى رئيس القسم" }, { v: "TOUSERS", n: "إرسال إلى الموظفين" }],
  mgr: [{ v: "TOUSERS", n: "إرسال إلى الموظفين" }, { v: "SENDTOMANGER", n: "إرسال إلى المدير العام" }],
};

/* ---------- state ---------- */
function defaults() { return { sla: { VIM: 1, IMP: 3, NOR: 7, LOW: 14 }, near: 25, escDays: 2 }; }
function seed() {
  const now = Date.now();
  let n = 1440;
  const mk = (o) => {
    const b = Object.assign({ id: ++n, no: AR("2026/" + n), type: "INC", tags: ["متابعة"], complete: false, escalated: false, flags: {}, actions: [], secondary: "" }, o);
    const created = now + o.ago * DAY;
    b.date = ymd(created);
    b.actions.push({ at: created, by: "reg", byName: "مسجل الوارد", to: o.firstTo || USERS[o.holder].mgr || o.holder, statusText: "قيد الإجراء", producer: "تسجيل الكتاب", margin: "", kind: "create" });
    if (o.firstTo === undefined && USERS[o.holder].kind === "emp") {
      const m = USERS[o.holder].mgr, at = created + 0.1 * DAY;
      b.actions.push({ at, by: m, to: o.holder, statusText: "قيد الإجراء", producer: "إرسال إلى الموظفين", margin: o.margin, kind: "refer", days: o.days, due: at + o.days * DAY });
    }
    const last = b.actions[b.actions.length - 1];
    b.holder = o.holder; b.assignedAt = last.at; b.due = last.due || last.at + o.days * DAY; b.margin = o.margin;
    delete b.ago; return b;
  };
  const books = [
    mk({ holder: "ali", priority: "IMP", from: "وزارة الاتصالات", subject: "تحديث صلاحيات المستخدمين في نظام المراسلات", margin: "للتنفيذ وإعلامنا", secondary: "الأنظمة", ago: -1, days: 3, type: "INT" }),
    mk({ holder: "ali", priority: "NOR", from: "دائرة الشؤون الإدارية", subject: "طلب تزويد بيانات الموظفين", margin: "للاطلاع واتخاذ اللازم", secondary: "الموارد البشرية", ago: -5.6, days: 7 }),
    mk({ holder: "ali", priority: "VIM", from: "مكتب المدير العام", subject: "تقرير عطل منظومة البريد", margin: "عاجل — للإجابة", secondary: "الأنظمة", ago: -0.4, days: 1, type: "INT" }),
    mk({ holder: "zainab", priority: "IMP", from: "شركة الرافدين", subject: "عرض صيانة الشبكة", margin: "لدراسة العرض", secondary: "الشبكات", ago: -1.5, days: 3, type: "INC" }),
    mk({ holder: "zainab", priority: "LOW", from: "قسم المخازن", subject: "جرد الأجهزة الحاسوبية", margin: "يرجى المتابعة", secondary: "الشبكات", ago: -3, days: 14, type: "INT" }),
    mk({ holder: "suad", priority: "IMP", from: "وزارة المالية", subject: "تعميم بشأن الموازنة التشغيلية", margin: "", secondary: "المالية", ago: -0.6, days: 3, firstTo: "suad" }),
    mk({ holder: "suad", priority: "NOR", from: "هيئة النزاهة", subject: "استفسار حول عقد التوريد", margin: "", secondary: "العقود", ago: -2, days: 7, firstTo: "suad" }),
    mk({ holder: "mustafa", priority: "IMP", from: "الأمانة العامة", subject: "تقرير الأداء الشهري", margin: "للتنفيذ", ago: -6.5, days: 3, type: "INT" }),
    mk({ holder: "noor", priority: "VIM", from: "ديوان الرقابة المالية", subject: "طلب كشوفات الصرف للربع الثالث", margin: "عاجل", ago: -1.6, days: 1 }),
    mk({ holder: "noor", priority: "NOR", from: "وزارة التخطيط", subject: "استمارة المؤشرات الإحصائية", margin: "للإكمال", ago: -9.5, days: 7 }),
    mk({ holder: "karrar", priority: "IMP", from: "قسم العقود", subject: "مسودة عقد النظافة", margin: "للتدقيق", ago: -2.6, days: 3, type: "INT" }),
    mk({ holder: "hiba", priority: "NOR", from: "وزارة الكهرباء", subject: "تنسيق جدول القطع المبرمج", margin: "للتنسيق", ago: -2, days: 7 }),
  ];
  // one completed book so avg completion has data
  const done = mk({ holder: "ali", priority: "NOR", from: "قسم الحسابات", subject: "تحديث بيانات الحسابات البنكية", margin: "للتنفيذ", ago: -4, days: 7, type: "INT" });
  done.complete = true; done.actions.push({ at: now - 1.5 * DAY, by: "ali", to: null, statusText: "مكتمل", producer: "إنجاز", margin: "تم التحديث", kind: "action" });
  books.push(done);
  return { now, speed: 1, user: "ali", page: "MainPage", reportType: "INC", settings: defaults(), books, notifs: [], seq: n };
}
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || !S.books) S = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- helpers ---------- */
function ymd(t) { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function ymdhm(t) { const d = new Date(t); return ymd(t) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function dur(ms) {
  const a = Math.abs(ms), d = Math.floor(a / DAY), h = Math.floor((a % DAY) / HOUR), m = Math.floor((a % HOUR) / 6e4);
  if (d) return d + " ي " + h + " س"; if (h) return h + " س " + m + " د"; return m + " د";
}
const U = (k) => USERS[k] || { name: k, dept: "" };
const me = () => USERS[S.user];
const isMgr = () => me().kind !== "emp";
function slaState(b) {
  if (b.complete) return "done";
  const left = b.due - S.now, total = b.due - b.assignedAt;
  if (left < 0) return "bad";
  if (left < total * S.settings.near / 100) return "warn";
  return "ok";
}
const ST_LABEL = { ok: "ضمن المدة", warn: "قرب الموعد", bad: "متأخر", done: "مكتمل" };
function slaPill(b, withSub) {
  const st = slaState(b);
  if (st === "done") return `<span class="sla-pill sla-done">مكتمل</span>`;
  const left = b.due - S.now;
  let h = `<div class="sla-cell"><span class="sla-pill sla-${st}" data-sla="${b.id}">${left < 0 ? "متأخر " + dur(left) : "باقي " + dur(left)}</span>`;
  if (b.escalated) h += `<span class="sla-esc-badge">⬆ مُصعَّد</span>`;
  if (withSub) h += `<span class="sla-sub">الموعد ${ymdhm(b.due)}</span>`;
  return h + "</div>";
}
function alertMsg(kind, text) {
  const cls = { ok: "alert-success", bad: "alert-danger", warn: "alert-warning", esc: "alert-esc", info: "alert-primary" }[kind] || "alert-success";
  const el = document.createElement("div"); el.className = "alert " + cls; el.innerHTML = text;
  $("#AlertsMount").appendChild(el); setTimeout(() => el.remove(), 5200);
  while ($("#AlertsMount").children.length > 3) $("#AlertsMount").firstChild.remove();
}
function notify(to, kind, b, extra) {
  S.notifs.unshift({ id: Date.now() + Math.random(), to, kind, bookId: b.id, at: S.now, read: false, extra });
  S.notifs = S.notifs.slice(0, 80);
}

/* ---------- SLA engine ---------- */
function evaluate() {
  for (const b of S.books) {
    if (b.complete) continue;
    const st = slaState(b);
    if (st === "warn" && !b.flags.near) { b.flags.near = 1; notify(b.holder, "warn", b, "باقي على موعد الإنجاز " + dur(b.due - S.now)); if (b.holder === S.user) alertMsg("warn", `<b>قرب الموعد:</b> الكتاب ${b.no} باقي عليه ${dur(b.due - S.now)}`); }
    if (st === "bad" && !b.flags.over) { b.flags.over = 1; b.flags.near = 1; notify(b.holder, "bad", b, "تجاوز موعد الإنجاز " + ymdhm(b.due)); if (b.holder === S.user) alertMsg("bad", `<b>تأخر:</b> الكتاب ${b.no} تجاوز موعد الإنجاز`); }
    const holder = U(b.holder);
    if (st === "bad" && !b.escalated && holder.kind === "emp" && S.now > b.due + S.settings.escDays * DAY) {
      const at = b.due + S.settings.escDays * DAY, mgr = holder.mgr, from = b.holder;
      b.actions.push({ at, by: "system", byName: "النظام — تصعيد تلقائي", to: mgr, statusText: "قيد الإجراء", producer: "تصعيد تلقائي إلى " + U(mgr).name, margin: `تجاوز موعد الإنجاز بـ ${S.settings.escDays} يوم دون إجراء من ${holder.name}`, kind: "escalate", from, due: at + DAY });
      b.holder = mgr; b.escalated = true; b.assignedAt = at; b.due = at + 1 * DAY; b.flags = { esc: 1 };
      notify(from, "esc", b, "تم تصعيد الكتاب لمسؤولك " + U(mgr).name);
      notify(mgr, "esc", b, "كتاب مُصعَّد إليك من " + holder.name);
      if (S.user === from || S.user === mgr) alertMsg("esc", `<b>تم التصعيد:</b> الكتاب ${b.no} انرفع تلقائياً إلى ${U(mgr).name}`);
      flash(b.id);
    }
  }
}
function flash(id) { setTimeout(() => $$(`tr[data-book="${id}"]`).forEach((r) => { r.classList.remove("sla-flash"); void r.offsetWidth; r.classList.add("sla-flash"); }), 50); }

/* ---------- header / sidebar ---------- */
const NAV = () => {
  const items = [
    { c: "MainPage", l: "الواجهة الرئيسية", g: "الرئيسية", i: "home" },
    { c: "CreateInternalDocument", l: "انشاء مذكرة داخلية", g: "المراسلات", i: "filePlus" },
    { c: "IncomingReport", l: "تقرير الوارد", g: "التقارير", i: "inbox" },
    { c: "OutgoiningReport", l: "تقرير الصادر", g: "التقارير", i: "send" },
    { c: "InternalReport", l: "تقرير المذكرات الداخلية", g: "التقارير", i: "repeat" },
  ];
  if (isMgr()) {
    items.push({ c: "LateBooks", l: "متابعة الكتب المتأخرة", g: "التقارير", i: "clock", isNew: true });
    items.push({ c: "SlaSettings", l: "إعدادات مدد الإنجاز", g: "الإعدادات", i: "settings", isNew: true });
  }
  items.push({ c: "ChangePassword", l: "تغيير كلمة المرور", g: "الحساب", i: "key" });
  return items;
};
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6"/><path d="M9 15h6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  key: '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
};
function renderSidebar() {
  const q = ($("#sbnSearchInput").value || "").trim();
  const groups = {};
  NAV().filter((i) => !q || i.l.includes(q)).forEach((i) => (groups[i.g] = groups[i.g] || []).push(i));
  const activeC = S.page === "Report" ? { INC: "IncomingReport", OUT: "OutgoiningReport", INT: "InternalReport" }[S.reportType] : S.page;
  $("#sbnGroups").innerHTML = Object.entries(groups).map(([g, items]) =>
    `<div class="sbn-group"><div class="sbn-group__header"><span class="sbn-group__title">${g}</span><span class="sbn-group__count">${items.length}</span></div><ul class="sbn-group__list" role="list">` +
    items.map((i) => {
      const badge = i.c === "MainPage" ? inboxList().length : i.c === "LateBooks" ? S.books.filter((b) => !b.complete && slaState(b) === "bad").length : 0;
      return `<li><a class="sbn-item ${activeC === i.c ? "sbn-item--active" : ""}" data-nav="${i.c}"><span class="sbn-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[i.i]}</svg></span><span class="sbn-item__label">${i.l}</span>${i.isNew ? '<span class="sla-new-tag">جديد</span>' : ""}${badge ? `<span class="sbn-badge sbn-badge--count">${badge}</span>` : ""}</a></li>`;
    }).join("") + "</ul></div>").join("");
}
function renderHeader() {
  const titles = { MainPage: "الواجهة الرئيسية", CreateInternalDocument: "انشاء مذكرة داخلية", LateBooks: "متابعة الكتب المتأخرة", SlaSettings: "إعدادات مدد الإنجاز", Report: { INC: "تقرير الوارد", OUT: "تقرير الصادر", INT: "تقرير المذكرات الداخلية" }[S.reportType] };
  $("#HeaderReportTitle").textContent = " المراسلات  -  " + (titles[S.page] || "");
  $("#HeaderUserName").textContent = me().name;
  $("#ActiveRoleLabel").textContent = me().hat;
  $("#RoleSwitcherList").innerHTML = HATS.map((h) => `<li role="option" data-hat="${h}" class="${h === S.user ? "active" : ""}" aria-selected="${h === S.user}">${USERS[h].name} — ${USERS[h].hat}</li>`).join("");
  const unread = S.notifs.filter((n) => n.to === S.user && !n.read).length;
  const bb = $("#NotificationBellBadge"); bb.hidden = !unread; bb.textContent = unread > 99 ? "99+" : unread;
  $("#SimClock").textContent = ymdhm(S.now);
}

/* ---------- inbox (MainPage) ---------- */
function inboxList() { return S.books.filter((b) => !b.complete && b.holder === S.user); }
function rowActions(b) {
  return `<img src="img/more_action_icon.svg" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false" style="cursor:pointer" alt="الإجراءات" />
  <ul class="dropdown-menu" style="min-width:220px">
   <li class="dropdown_item" data-prev="${b.id}"><div><p>عرض الحالات السابقة</p><img width="34" src="img/display_eye_icon.svg" alt="" /></div></li>
   <li class="dropdown_item" data-move="${b.id}"><div><p>مسار العمل</p><img width="34" src="img/work_flow_icon.svg" alt="" /></div></li>
   <li class="dropdown_item" data-act="${b.id}"><div><p>اتخاذ إجراء</p><img width="34" src="img/left_arrow_icon.svg" alt="" /></div></li>
   <li class="dropdown_item"><div class="checkbox_add_customer_box dropdown_item_button"><button data-viewed="${b.id}" class="button_style_3 font_size_2m_button border_radius_actions_1 w-100">تأكيد الاطلاع</button></div></li>
  </ul>`;
}
function priorityCell(v) { return v ? `<span class="correspondence-priority-indicator correspondence-priority-${v}"><span class="correspondence-priority-dot"></span>${pName(v)}</span>` : ""; }
function viewChip(b) { const badge = !b.viewed; return `<div class="chip chips_icon document_chips display_Documents ${badge ? "document_chip_with_badge" : ""}" data-view="${b.id}">${badge ? '<span class="document_chip_badge"></span>' : ""}<img src="img/document_icon.svg" alt="" /><p>عرض</p></div>`; }
function lastMargin(b) { for (let i = b.actions.length - 1; i >= 0; i--) if (b.actions[i].margin) return b.actions[i].margin; return ""; }
function senderOf(b) { const a = b.actions[b.actions.length - 1]; return a.kind === "create" ? b.from : a.byName || U(a.by).name; }
function renderInbox() {
  const q = $("#SearchByForCorrecpondence").value.trim(), tf = $("#DocTypeFilter").value, pf = $("#PriorityFilter").value, sf = $("#SlaFilter").value;
  const all = inboxList();
  const list = all.filter((b) => (!tf || b.type === tf) && (!pf || b.priority === pf) && (!q || (b.no + b.subject + b.from).includes(q)) &&
    (!sf || (sf === "esc" ? b.escalated : slaState(b) === sf))).sort((a, b) => a.due - b.due);
  $("#MainOrgCategoryTabs").innerHTML = [["all", "الكل", all.length], ["generalManager", "المدير العام", 0], ["division", "الشعب", 0], ["section", "الوحدات", 0], ["department", "الأقسام", all.length], ["authority", "الهيئات", 0], ["committee", "اللجان", 0]]
    .map(([k, l, c], i) => `<button type="button" class="org-category-tab ${i ? "" : "active"}"><span class="org-category-tab-label">${l}</span><span class="org-category-tab-count">${c}</span></button>`).join("");
  $("#correspondencetbodyForMain").innerHTML = list.map((b) => {
    const st = slaState(b);
    return `<tr data-book="${b.id}" class="${st === "bad" ? "sla-row-bad" : ""}">
    <td>${b.no}</td><td>${b.date}</td><td class="bold_text"><div>${b.lastAnswer || ""}</div></td>
    <td><div class="chip ${TYPE[b.type][1]}">${TYPE[b.type][0]}</div></td><td>${priorityCell(b.priority)}</td>
    <td>${esc(senderOf(b))}</td><td>${esc(b.subject)}</td><td>${esc(lastMargin(b))}</td><td>${esc(b.secondary)}</td>
    <td><div class="chip chips_icon">قيد الإجراء</div></td>
    <td>${slaPill(b)}</td>
    <td><div class="correspondence-tags-cell">${(b.tags || []).map((t) => `<span class="correspondence-tag-badge" style="--tag-color:#2563eb;--tag-bg:rgba(37,99,235,.12);--tag-border:rgba(37,99,235,.36);--tag-text:#2563eb">${esc(t)}</span>`).join("")}</div></td>
    <td>${viewChip(b)}</td><td><div class="dropdown">${rowActions(b)}</div></td></tr>`;
  }).join("");
  $("#NoRecordMessage").hidden = list.length > 0;
}

/* ---------- reports ---------- */
function renderReport() {
  const t = S.reportType;
  $("#ReportHeading").textContent = { INC: "جميع المراسلات الواردة", OUT: "جميع المراسلات الصادرة", INT: "جميع المذكرات الداخلية" }[t];
  $("#RepNoLabel").textContent = { INC: "رقم الوارد", OUT: "رقم الصادر", INT: "رقم المذكرة" }[t];
  const list = S.books.filter((b) => b.type === t).sort((a, b) => b.id - a.id);
  $("#ReportTbody").innerHTML = list.map((b) => `<tr data-book="${b.id}"><td>${b.no}</td><td>${b.date}</td><td>${esc(b.from)}</td><td>${esc(b.subject)}</td><td>${priorityCell(b.priority)}</td>
   <td>${b.complete ? "—" : esc(U(b.holder).name)}</td><td><div class="chip chips_icon">${b.complete ? "مكتمل" : "قيد الإجراء"}</div></td><td>${slaPill(b)}</td><td>${viewChip(b)}</td>
   <td><div class="chip chips_icon" data-prev="${b.id}" style="cursor:pointer"><img src="img/display_eye_icon.svg" width="20" alt="" /><p>الحالات</p></div></td></tr>`).join("") ||
   `<tr><td colspan="10" class="text-center text-muted p-4">لا توجد نتائج</td></tr>`;
}

/* ---------- late books follow-up (NEW) ---------- */
function renderLate() {
  const sel = $("#LbDept");
  if (sel.options.length === 1) DEPTS.forEach((d) => sel.add(new Option(d, d)));
  const dept = sel.value, mode = $("#LbStatus").value;
  const open = S.books.filter((b) => !b.complete && (!dept || U(b.holder).dept === dept));
  const c = { ok: 0, warn: 0, bad: 0 }; open.forEach((b) => c[slaState(b)]++);
  const escN = open.filter((b) => b.escalated).length;
  const done = S.books.filter((b) => b.complete && (!dept || b.actions.some((a) => U(a.by).dept === dept)));
  const avg = done.length ? done.reduce((s, b) => s + (b.actions[b.actions.length - 1].at - b.actions[0].at), 0) / done.length : 0;
  $("#LbKpis").innerHTML = [["الكتب المفتوحة", open.length, "#475569", ""], ["ضمن المدة", c.ok, "#059669", ""], ["قرب الموعد", c.warn, "#D97706", ""], ["متأخرة", c.bad, "#DC2626", ""], ["مُصعَّدة", escN, "#7C3AED", ""], ["متوسط وقت الإنجاز", done.length ? dur(avg) : "—", "#9E1D15", "من " + done.length + " كتاب مكتمل"]]
    .map(([l, v, col, s]) => `<div class="sla-kpi" style="--c:${col}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s || "&nbsp;"}</div></div>`).join("");
  const max = Math.max(1, ...DEPTS.map((d) => S.books.filter((b) => !b.complete && U(b.holder).dept === d).length));
  $("#LbDeptChart").innerHTML = DEPTS.map((d) => {
    const bs = S.books.filter((b) => !b.complete && U(b.holder).dept === d), seg = { ok: 0, warn: 0, bad: 0, esc: 0 };
    bs.forEach((b) => (b.escalated ? seg.esc++ : seg[slaState(b)]++));
    const w = (n) => (n / max) * 100 + "%";
    return `<div class="sla-bar-row"><span>${d}</span><div class="sla-bar"><span class="seg-ok" style="width:${w(seg.ok)}"></span><span class="seg-warn" style="width:${w(seg.warn)}"></span><span class="seg-bad" style="width:${w(seg.bad)}"></span><span class="seg-esc" style="width:${w(seg.esc)}"></span></div><b>${bs.length}</b></div>`;
  }).join("") + `<div class="sla-legend"><span><i class="seg-ok"></i>ضمن المدة</span><span><i class="seg-warn"></i>قرب الموعد</span><span><i class="seg-bad"></i>متأخر</span><span><i class="seg-esc"></i>مُصعَّد</span></div>`;
  const emp = {};
  S.books.filter((b) => !b.complete && (!dept || U(b.holder).dept === dept)).forEach((b) => {
    const lateBy = b.escalated ? b.actions.filter((a) => a.kind === "escalate").pop().from : slaState(b) === "bad" ? b.holder : null;
    if (!lateBy) return;
    const e = (emp[lateBy] = emp[lateBy] || { n: 0, e: 0, max: 0 }); e.n++; if (b.escalated) e.e++;
    const escA = b.actions.filter((a) => a.kind === "escalate").pop();
    e.max = Math.max(e.max, b.escalated ? S.now - (escA.at - S.settings.escDays * DAY) : S.now - b.due);
  });
  const rows = Object.entries(emp).sort((a, b) => b[1].max - a[1].max);
  $("#LbEmpTbody").innerHTML = rows.length ? rows.map(([k, e]) => `<tr><td>${U(k).name}</td><td>${U(k).dept}</td><td><span class="sla-pill sla-bad">${e.n}</span></td><td>${e.e ? `<span class="sla-esc-badge">${e.e}</span>` : "—"}</td><td>${dur(e.max)}</td></tr>`).join("") : `<tr><td colspan="5" class="text-center text-muted">لا يوجد موظفون متأخرون</td></tr>`;
  const list = open.filter((b) => { const st = slaState(b); return mode === "all" || (mode === "late" && (st !== "ok" || b.escalated)) || (mode === "bad" && st === "bad") || (mode === "esc" && b.escalated); }).sort((a, b) => a.due - b.due);
  $("#LbTbody").innerHTML = list.map((b) => `<tr data-book="${b.id}" class="${slaState(b) === "bad" ? "sla-row-bad" : ""}"><td>${b.no}</td><td>${esc(b.subject)}</td><td>${priorityCell(b.priority)}</td><td>${U(b.holder).name}</td><td>${U(b.holder).dept}</td><td>${ymdhm(b.due)}</td><td>${slaPill(b)}</td><td>${viewChip(b)}</td>
   <td><div class="sla-act-btns"><button class="button_style_3 border_radius_actions_1" data-remind="${b.id}">تذكير</button><button class="button_style border_radius_actions_1" data-redirect="${b.id}">إعادة توجيه</button><button class="button_style_3 border_radius_actions_1" data-prev="${b.id}">الحالات</button></div></td></tr>`).join("");
  $("#LbEmpty").hidden = list.length > 0;
}

/* ---------- settings (NEW) ---------- */
function renderSettings() {
  $("#SetPriorityTbody").innerHTML = PRIORITIES.map((p) => `<tr><td>${priorityCell(p.v)}</td><td><input class="input_elem input_style input_height_style border_radius_actions_1" style="max-width:120px" type="number" min="0.5" step="0.5" data-set-sla="${p.v}" value="${S.settings.sla[p.v]}" /></td><td class="text-muted">عند بقاء ${S.settings.near}% (${dur(S.settings.sla[p.v] * DAY * S.settings.near / 100)})</td></tr>`).join("");
  $("#SetEscDays").value = S.settings.escDays; $("#SetNearPct").value = S.settings.near;
}

/* ---------- create memo (real page + مدة الإنجاز) ---------- */
function initCreate() {
  const pr = $("#PriorityForInternalDocumentEditor");
  pr.innerHTML = PRIORITIES.map((p) => `<option value="${p.v}" ${p.v === "IMP" ? "selected" : ""}>${p.n}</option>`).join("");
  $("#CidSubject").innerHTML = '<option value="">اضغط هنا لاختيار الموضوع...</option>' + ["تحديث منظومة الأرشفة الإلكترونية", "صيانة الشبكة الداخلية", "طلب تزويد بيانات", "تعميم إداري"].map((s) => `<option>${s}</option>`).join("");
  $("#CidProducer").innerHTML = '<option value="">بدون إجراء (يبقى في صندوقي)</option>' + PRODUCERS[isMgr() ? "mgr" : "emp"].map((p) => `<option value="${p.v}">${p.n}</option>`).join("");
  $("#CidStatus").innerHTML = STATUSES.slice(0, 1).map((s) => `<option>${s}</option>`).join("");
  fillUsers($("#CidUser"));
  $("#CidUsersBox").hidden = true;
  $("#CidSlaDays").value = S.settings.sla.IMP; $("#CidSlaDays").dataset.auto = "1";
  $("#CidSlaReasonBox").hidden = true; $("#CidSlaReason").value = "";
  updateCidDeadline();
}
function updateCidDeadline() {
  const p = $("#PriorityForInternalDocumentEditor").value, def = S.settings.sla[p], days = parseFloat($("#CidSlaDays").value) || def;
  const changed = Math.abs(days - def) > 1e-9;
  $("#CidSlaReasonBox").hidden = !changed;
  $("#CidSlaDeadline").innerHTML = `<span>${ymdhm(S.now + days * DAY)}</span><span class="sla-pill sla-ok">${days} يوم</span>${changed ? `<span class="sla-sub">الافتراضي ${def} يوم</span>` : `<span class="sla-sub">افتراضي حسب «${pName(p)}»</span>`}`;
}
function fillUsers(sel, exclude) {
  const opts = Object.entries(USERS).filter(([k, u]) => u.dept === me().dept && u.kind === "emp" && k !== S.user && k !== exclude);
  sel.innerHTML = opts.map(([k, u]) => `<option value="${k}">${u.name} — ${u.hat}</option>`).join("");
}
function submitCreate() {
  const subj = $("#CidSubject").value, p = $("#PriorityForInternalDocumentEditor").value, days = parseFloat($("#CidSlaDays").value), def = S.settings.sla[p];
  const reason = $("#CidSlaReason").value.trim();
  if (!subj) return alertMsg("bad", "يرجى اختيار الموضوع");
  if (!(days > 0)) return alertMsg("bad", "مدة الإنجاز غير صحيحة");
  if (Math.abs(days - def) > 1e-9 && !reason) return alertMsg("bad", "يرجى كتابة سبب تغيير مدة الإنجاز");
  const id = ++S.seq;
  const b = { id, no: AR("2026/" + id), type: "INT", priority: p, date: ymd(S.now), lastAnswer: $("#LastAnswerDateForInternalDocumentEditor").value, from: me().dept, subject: subj, secondary: $("#CidManualSubject").value.trim(), tags: [], complete: false, escalated: false, flags: {}, actions: [], slaDays: days, slaReason: reason };
  b.actions.push({ at: S.now, by: S.user, to: S.user, statusText: "قيد الإجراء", producer: "انشاء مذكرة داخلية", margin: $("#CidMargin").value.trim(), kind: "create", days, due: S.now + days * DAY, reason });
  b.holder = S.user; b.assignedAt = S.now; b.due = S.now + days * DAY; b.viewed = true;
  const prod = $("#CidProducer").value;
  S.books.push(b);
  if (prod) applyAction(b, { producer: prod, to: prod === "TOUSERS" ? $("#CidUser").value : prod === "TOHEAD" ? me().mgr : "gm", status: "قيد الإجراء", margin: $("#CidMargin").value.trim(), days, reason });
  save();
  alertMsg("ok", `تم حفظ المذكرة <b>${b.no}</b> — موعد الإنجاز ${ymdhm(b.due)}`);
  ["#CidManualSubject", "#CidMargin"].forEach((s) => ($(s).value = ""));
  go("MainPage");
}

/* ---------- take action (real modal + deadline) ---------- */
let taBook = null, taMode = "act";
function openTakeAction(id, mode) {
  taBook = S.books.find((b) => b.id === id); taMode = mode || "act";
  $("#TakeActionSubtitle").textContent = `${taBook.no} — ${taBook.subject}`;
  const prods = PRODUCERS[isMgr() ? "mgr" : "emp"];
  $("#TaProducer").innerHTML = '<option value="">— بدون إرسال (إنجاز الكتاب) —</option>' + prods.map((p) => `<option value="${p.v}">${p.n}</option>`).join("");
  $("#TaProducer").value = taMode === "redirect" ? "TOUSERS" : "";
  fillUsers($("#TaUser"), taMode === "redirect" ? lastEmployee(taBook) : null);
  $("#DescriptionInputForTakeActionModal").value = taMode === "redirect" ? "يرجى الإنجاز ضمن المدة المحددة" : "";
  $("#TaSlaReason").value = ""; $("#TaError").hidden = true;
  syncTa(true);
  bootstrap.Modal.getOrCreateInstance($("#TakeActionModal")).show();
}
function lastEmployee(b) { for (let i = b.actions.length - 1; i >= 0; i--) { const a = b.actions[i]; if (a.kind === "escalate") return a.from; } return null; }
function syncTa(resetDays) {
  const prod = $("#TaProducer").value;
  $("#TaStatus").innerHTML = (prod ? ["قيد الإجراء"] : ["مكتمل"]).map((s) => `<option>${s}</option>`).join("");
  $("#TaUsersBox").hidden = prod !== "TOUSERS";
  const sends = !!prod; $("#TaSlaBox").hidden = !sends;
  if (!sends) return;
  const def = S.settings.sla[taBook.priority];
  if (resetDays || !$("#TaSlaDays").value) $("#TaSlaDays").value = def;
  const days = parseFloat($("#TaSlaDays").value) || def, changed = Math.abs(days - def) > 1e-9;
  $("#TaSlaHint").textContent = `الافتراضي لأولوية «${pName(taBook.priority)}»: ${def} يوم`;
  $("#TaSlaReason").hidden = !changed;
  $("#TaSlaDeadline").innerHTML = `<span>يجب الإنجاز قبل ${ymdhm(S.now + days * DAY)}</span>`;
}
function submitTakeAction() {
  const prod = $("#TaProducer").value, days = parseFloat($("#TaSlaDays").value), def = S.settings.sla[taBook.priority], reason = $("#TaSlaReason").value.trim();
  const err = (m) => { $("#TaError").textContent = m; $("#TaError").hidden = false; };
  if (prod) {
    if (!(days > 0)) return err("يرجى تحديد مدة الإنجاز للمستلم");
    if (Math.abs(days - def) > 1e-9 && !reason) return err("يرجى كتابة سبب تغيير المدة الافتراضية");
  }
  const to = prod === "TOUSERS" ? $("#TaUser").value : prod === "TOHEAD" ? me().mgr : prod === "SENDTOMANGER" ? "gm" : null;
  applyAction(taBook, { producer: prod, to, status: $("#TaStatus").value, margin: $("#DescriptionInputForTakeActionModal").value.trim(), days, reason });
  bootstrap.Modal.getInstance($("#TakeActionModal")).hide();
  save(); renderAll();
  if (prod) alertMsg("ok", `تم إرسال الكتاب <b>${taBook.no}</b> إلى ${U(to).name} — موعد الإنجاز ${ymdhm(taBook.due)}`);
  else alertMsg("ok", `تم اتخاذ الإجراء — الكتاب <b>${taBook.no}</b> مكتمل وتوقف عداد المدة (${slaVerdict(taBook)})`);
}
function applyAction(b, o) {
  const pn = o.producer ? (PRODUCERS.emp.concat(PRODUCERS.mgr).find((p) => p.v === o.producer) || {}).n : "إنجاز";
  const a = { at: S.now, by: S.user, to: o.to, statusText: o.status, producer: pn, margin: o.margin, kind: o.producer ? "refer" : "action", heldFrom: b.assignedAt, heldDue: b.due };
  if (o.producer) { a.days = o.days; a.due = S.now + o.days * DAY; a.reason = o.reason; }
  b.actions.push(a);
  if (o.producer) {
    b.holder = o.to; b.assignedAt = S.now; b.due = a.due; b.escalated = false; b.flags = {}; b.viewed = false;
    notify(o.to, "new", b, `وصلك من ${me().name} — موعد الإنجاز ${ymdhm(b.due)}`);
  } else { b.complete = true; b.closedOnTime = S.now <= b.due; }
}
function slaVerdict(b) { const a = b.actions[b.actions.length - 1]; return a.at <= a.heldDue ? "أُنجز ضمن المدة" : "أُنجز متأخراً " + dur(a.at - a.heldDue); }

/* ---------- previous procedures (الحالات السابقة) + movement ---------- */
function stints(b) {
  // each action = one stop: actor held book from previous action's time until this action
  return b.actions.map((a, i) => {
    const prev = b.actions[i - 1];
    const heldFrom = prev ? prev.at : a.at, heldDue = prev ? prev.due || (prev.at + S.settings.sla[b.priority] * DAY) : null;
    return { a, heldFrom, heldDue, spent: i ? a.at - heldFrom : 0 };
  });
}
function verdictPill(spentEnd, due) {
  if (!due) return "—";
  return spentEnd <= due ? `<span class="sla-pill sla-ok">ضمن المدة</span>` : `<span class="sla-pill sla-bad">متأخر ${dur(spentEnd - due)}</span>`;
}
function openPrev(id) {
  const b = S.books.find((x) => x.id === id); curBook = id;
  const st = slaState(b), total = b.due - b.assignedAt, used = b.complete ? 100 : Math.min(100, Math.max(0, ((S.now - b.assignedAt) / total) * 100));
  const col = { ok: "#10B981", warn: "#F59E0B", bad: "#EF4444", done: "#94A3B8" }[st];
  $("#PrevSlaSummary").innerHTML = `<div class="sla-summary"><div><b>الكتاب</b>${b.no} — ${esc(b.subject)}</div><div><b>الأولوية / المدة</b>${pName(b.priority)} · ${S.settings.sla[b.priority]} يوم</div>
   <div><b>لدى حالياً</b>${b.complete ? "مكتمل" : U(b.holder).name}</div><div><b>موعد الإنجاز الحالي</b>${b.complete ? "—" : ymdhm(b.due)}</div>
   <div><b>المدة</b>${slaPill(b)}<div class="sla-progress"><i style="width:${used}%;background:${col}"></i></div></div></div>`;
  const rows = stints(b).map(({ a, heldFrom, heldDue, spent }, i) => {
    const who = a.byName || U(a.by).name;
    const status = `<div><b>${esc(a.producer)}</b>${a.to && a.kind !== "action" ? " ← " + esc(U(a.to).name) : ""}</div><div class="sla-sub">${esc(a.statusText)}${a.due ? " · موعد المستلم " + ymdhm(a.due) + (a.reason ? " (" + esc(a.reason) + ")" : "") : ""}</div>`;
    const timeCell = i ? dur(spent) : "—";
    const verdict = a.kind === "escalate" ? verdictPill(a.at, heldDue) + `<br><span class="sla-esc-badge">⬆ تصعيد تلقائي</span>` : i ? verdictPill(a.at, heldDue) : "—";
    return `<tr class="${a.kind === "escalate" ? "sla-row-bad" : ""}"><td>${esc(who)}</td><td>${ymdhm(a.at)}</td><td>${status}</td><td>${esc(a.margin) || "لا توجد"}</td><td>${timeCell}</td><td>${verdict}</td><td style="text-align:center"><img width="22" src="img/attachments_icon.svg" alt="" /></td></tr>`;
  });
  if (!b.complete) rows.push(`<tr><td>${U(b.holder).name}</td><td>${ymdhm(b.assignedAt)}</td><td><div><b>بانتظار الإجراء</b></div><div class="sla-sub">موعد الإنجاز ${ymdhm(b.due)}</div></td><td>—</td><td>${dur(S.now - b.assignedAt)} (جارٍ)</td><td>${slaPill(b)}</td><td></td></tr>`);
  $("#PreviousProceduresTBodyForPrevProcedModal").innerHTML = rows.join("");
  bootstrap.Modal.getOrCreateInstance($("#PreviousProceduresModal")).show();
}
let curBook = null;
function openMovement(id) {
  const b = S.books.find((x) => x.id === id); curBook = id;
  const nodes = [];
  stints(b).forEach(({ a }, i) => {
    const next = b.actions[i + 1];
    const end = next ? next.at : b.complete ? a.at : S.now;
    if (a.kind === "action") { nodes.push(`<div class="sla-node done"><div class="t">✓ ${esc(a.byName || U(a.by).name)} — ${esc(a.producer)} (مكتمل)</div><div class="r">${verdictPill(a.at, a.heldDue)}</div><div class="d">${ymdhm(a.at)} · ${esc(a.margin)}</div></div>`); return; }
    const holder = a.to;
    const isCur = !next && !b.complete;
    const due = a.due || (a.kind === "create" ? null : null);
    let right = `<span class="sla-pill sla-done">${isCur ? "منذ " : "بقي "}${dur(end - a.at)}</span>`;
    if (due) right += isCur ? slaPill(b) : verdictPill(end, due);
    nodes.push(`<div class="sla-node ${isCur ? "cur" : ""} ${a.kind === "escalate" ? "esc" : ""}"><div class="t">${a.kind === "escalate" ? "⬆ " : ""}${esc(U(holder).name)} <span class="sla-sub">${esc(U(holder).hat || "")}</span></div><div class="r">${right}</div>
     <div class="d">${esc(a.producer)} من ${esc(a.byName || U(a.by).name)} · ${ymdhm(a.at)}${due ? " · الموعد " + ymdhm(due) : ""}</div></div>`);
  });
  $("#MovementFlow").innerHTML = nodes.join('<div class="sla-arrow"></div>');
  bootstrap.Modal.getOrCreateInstance($("#DocumentMovmentModal")).show();
}
function openDisplay(id) {
  const b = S.books.find((x) => x.id === id); b.viewed = true; save();
  $("#DisplayBody").innerHTML = `<div class="sla-docbox"><div class="sla-docmeta"><div><span>رقم الكتاب</span>${b.no}</div><div><span>التاريخ</span>${b.date}</div><div><span>نوع الكتاب</span><div class="chip ${TYPE[b.type][1]}" style="display:inline-flex">${TYPE[b.type][0]}</div></div>
  <div><span>الجهة المرسلة</span>${esc(b.from)}</div><div><span>الأولوية</span>${priorityCell(b.priority)}</div><div><span>مدة الإنجاز <span class="sla-new-tag">جديد</span></span>${slaPill(b, true)}</div></div>
  <table class="table_style direction_rtl mb-3"><thead><tr><th>اسم المستند</th><th>التاريخ</th><th>الإصدارات</th><th>الحالات</th></tr></thead><tbody class="text_size_3x"><tr><td>${esc(b.subject)}.pdf</td><td>${b.date}</td><td>1</td><td><div class="chip chips_icon" data-prev="${b.id}" style="cursor:pointer"><p>الحالات</p></div></td></tr></tbody></table>
  <div class="sla-paper"><p style="text-align:center"><b>بسم الله الرحمن الرحيم</b></p><p>العدد: ${b.no}<br>التاريخ: ${b.date}</p><p><b>م / ${esc(b.subject)}</b></p><p>نص تجريبي للكتاب — بيانات وهمية لأغراض النموذج الأولي فقط.</p><p style="text-align:left">${esc(b.from)}</p></div>
  ${!b.complete && b.holder === S.user ? `<div class="mt-3"><button class="button_style button_color_danger font_size_2m_button border_radius_actions_1 text-white" data-act="${b.id}" style="width:auto;padding:0 24px">اتخاذ إجراء</button></div>` : ""}</div>`;
  bootstrap.Modal.getOrCreateInstance($("#DisplayDocumentsModal")).show();
}

/* ---------- notifications (real panel) ---------- */
const NKIND = { new: ["sla-type-new", "كتاب جديد"], warn: ["sla-type-warn", "قرب الموعد"], bad: ["sla-type-bad", "متأخر"], esc: ["sla-type-esc", "تم التصعيد"] };
function renderNotifs() {
  const list = S.notifs.filter((n) => n.to === S.user);
  const unread = list.filter((n) => !n.read).length;
  $("#NotificationHeaderMount").innerHTML = `<header class="notification-panel__header"><div class="notification-panel__header-content"><div class="notification-panel__header-text"><h2 class="notification-panel__title">الإشعارات</h2><p class="notification-panel__subtitle">الكتب الجديدة وتنبيهات مدد الإنجاز</p></div><span class="notification-panel__count-badge">${unread}</span></div><button type="button" class="notification-panel__close-btn" data-notification-action="close" aria-label="إغلاق"><img src="img/close_icon.svg" alt="" /></button></header>`;
  $("#NotificationEmptyMount").hidden = list.length > 0;
  $("#NotificationEmptyMount").innerHTML = `<div class="notification-empty-state"><img src="img/no_record_icon.svg" alt="" class="notification-empty-state__icon" /><h3 class="notification-empty-state__title">لا توجد إشعارات</h3><p class="notification-empty-state__description">ستظهر هنا الكتب الجديدة وتنبيهات المدد</p></div>`;
  $("#NotificationListMount").innerHTML = list.length ? `<div class="notification-list" role="list">` + list.map((n) => {
    const b = S.books.find((x) => x.id === n.bookId) || {};
    return `<article class="notification-card ${n.read ? "notification-card--read" : "notification-card--unread"}" data-nid="${n.id}" data-book="${n.bookId}" tabindex="0"><div class="notification-card__thumbnail"><img src="img/document_icon.svg" alt="" /></div><div class="notification-card__content"><div class="notification-card__meta">${n.read ? "" : '<span class="notification-card__unread-badge">جديد</span>'}<span class="notification-card__type ${NKIND[n.kind][0]}">${NKIND[n.kind][1]}</span></div><h3 class="notification-card__title">${esc(b.subject)}</h3><div class="notification-card__details"><span class="notification-card__detail"><span class="notification-card__detail-label">رقم الكتاب</span><span class="notification-card__detail-value">${b.no}</span></span><span class="notification-card__detail"><span class="notification-card__detail-label">تاريخ الوصول</span><span class="notification-card__detail-value">${ymdhm(n.at)}</span></span></div><div class="notif-extra">${esc(n.extra || "")}</div></div></article>`;
  }).join("") + "</div>" : "";
}
function openNotifs() { renderNotifs(); const r = $("#NotificationPanelRoot"); r.hidden = false; r.setAttribute("aria-hidden", "false"); requestAnimationFrame(() => r.classList.add("notification-panel-root--open")); }
function closeNotifs() { const r = $("#NotificationPanelRoot"); r.classList.remove("notification-panel-root--open"); setTimeout(() => { r.hidden = true; }, 200); }

/* ---------- routing / render ---------- */
function go(page, rep) {
  S.page = page; if (rep) S.reportType = rep;
  $$(".page").forEach((p) => (p.hidden = p.id !== "page-" + page));
  if (page === "CreateInternalDocument") initCreate();
  if (page === "SlaSettings") renderSettings();
  save(); renderAll(); window.scrollTo(0, 0);
}
function renderAll() {
  if (!isMgr() && (S.page === "LateBooks" || S.page === "SlaSettings")) { S.page = "MainPage"; $$(".page").forEach((p) => (p.hidden = p.id !== "page-MainPage")); }
  renderHeader(); renderSidebar();
  if (S.page === "MainPage") renderInbox();
  else if (S.page === "Report") renderReport();
  else if (S.page === "LateBooks") renderLate();
  if (!$("#NotificationPanelRoot").hidden) renderNotifs();
}
function lightTick() {
  $$("[data-sla]").forEach((el) => { const b = S.books.find((x) => x.id === +el.dataset.sla); if (!b || b.complete) return; const l = b.due - S.now; el.textContent = l < 0 ? "متأخر " + dur(l) : "باقي " + dur(l); });
  $("#SimClock").textContent = ymdhm(S.now);
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-nav],[data-hat],[data-view],[data-prev],[data-move],[data-act],[data-viewed],[data-remind],[data-redirect],[data-jump],[data-nid],[data-notification-action],[data-open-movement]");
  if (!t) { if (!e.target.closest(".header_role_chip_wrap")) $("#RoleSwitcherDropdown").hidden = true; return; }
  const d = t.dataset;
  if (d.nav) {
    const m = { IncomingReport: ["Report", "INC"], OutgoiningReport: ["Report", "OUT"], InternalReport: ["Report", "INT"] }[d.nav];
    if (d.nav === "ChangePassword") return alertMsg("info", "غير مشمولة بالنموذج الأولي");
    go(m ? m[0] : d.nav, m && m[1]); $("#sidenav-content").classList.add("dispalySide"); return;
  }
  if (d.hat) { S.user = d.hat; $("#RoleSwitcherDropdown").hidden = true; save(); go(S.page === "CreateInternalDocument" ? "CreateInternalDocument" : S.page); alertMsg("info", "تم تبديل الدور إلى: " + me().hat); return; }
  if (d.notificationAction === "close") return closeNotifs();
  if (d.nid) { const n = S.notifs.find((x) => String(x.id) === d.nid); if (n) n.read = true; save(); closeNotifs(); renderHeader(); return openPrev(+d.book); }
  if (d.view) return openDisplay(+d.view);
  if (d.prev) { hideAllModals(); return openPrev(+d.prev); }
  if (d.openMovement !== undefined) { hideAllModals(); return openMovement(curBook); }
  if (d.move) return openMovement(+d.move);
  if (d.act) { hideAllModals(); return openTakeAction(+d.act, "act"); }
  if (d.redirect) return openTakeAction(+d.redirect, "redirect");
  if (d.viewed) { const b = S.books.find((x) => x.id === +d.viewed); b.viewed = true; save(); renderAll(); return alertMsg("ok", "تم تأكيد الاطلاع"); }
  if (d.remind) { const b = S.books.find((x) => x.id === +d.remind); notify(b.holder, b.escalated ? "esc" : "bad", b, "تذكير من " + me().name + ": يرجى إنجاز الكتاب"); save(); return alertMsg("ok", `تم إرسال تذكير إلى ${U(b.holder).name} بخصوص الكتاب ${b.no}`); }
  if (d.jump) { S.now += +d.jump; evaluate(); save(); renderAll(); return; }
});
function hideAllModals() { $$(".modal.show").forEach((m) => bootstrap.Modal.getInstance(m) && bootstrap.Modal.getInstance(m).hide()); }
$("#NotificationBellTrigger").onclick = openNotifs;
$("#ActiveRoleChip").onclick = (e) => { e.stopPropagation(); $("#RoleSwitcherDropdown").hidden = !$("#RoleSwitcherDropdown").hidden; };
$("#navbar_toggle_btn").onclick = () => $("#sidenav-content").classList.toggle("dispalySide");
$("#close-btn").onclick = () => $("#sidenav-content").classList.add("dispalySide");
$("#sbnSearchInput").oninput = renderSidebar;
["#SearchByForCorrecpondence", "#DocTypeFilter", "#PriorityFilter", "#SlaFilter"].forEach((s) => $(s).addEventListener("input", renderInbox));
$("#PriorityFilter").innerHTML += PRIORITIES.map((p) => `<option value="${p.v}">${p.n}</option>`).join("");
$("#ApplyFilters").onclick = renderInbox;
$("#ClearFilters").onclick = () => { ["#SearchByForCorrecpondence", "#DocTypeFilter", "#PriorityFilter", "#SlaFilter"].forEach((s) => ($(s).value = "")); renderInbox(); };
$("#PriorityForInternalDocumentEditor").onchange = () => { $("#CidSlaDays").value = S.settings.sla[$("#PriorityForInternalDocumentEditor").value]; updateCidDeadline(); };
$("#CidSlaDays").oninput = updateCidDeadline;
$("#CidProducer").onchange = () => { $("#CidUsersBox").hidden = $("#CidProducer").value !== "TOUSERS"; };
$("#SubmitNewActionForInternalDocumentEditor").onclick = submitCreate;
$("#TaProducer").onchange = () => syncTa(true);
$("#TaSlaDays").oninput = () => syncTa(false);
$("#SubmitNewActionForTakeActionModal").onclick = submitTakeAction;
$("#LbApply").onclick = renderLate; $("#LbDept").onchange = renderLate; $("#LbStatus").onchange = renderLate;
$("#SaveSettings").onclick = () => {
  $$("[data-set-sla]").forEach((i) => { const v = parseFloat(i.value); if (v > 0) S.settings.sla[i.dataset.setSla] = v; });
  const e = parseFloat($("#SetEscDays").value), n = parseFloat($("#SetNearPct").value);
  if (e >= 0) S.settings.escDays = e; if (n >= 5 && n <= 90) S.settings.near = n;
  S.books.forEach((b) => { if (!b.complete && slaState(b) === "ok") b.flags = {}; });
  evaluate(); save(); renderSettings(); renderAll();
  alertMsg("ok", "تم حفظ إعدادات مدد الإنجاز — تُطبَّق على الكتب الجديدة والإحالات القادمة");
};
$("#ProtoSimToggle").onclick = () => ($("#ProtoSimBody").hidden = !$("#ProtoSimBody").hidden);
$("#SimSpeed").onchange = (e) => { S.speed = +e.target.value; save(); };
$("#ResetBtn").onclick = () => { localStorage.removeItem(KEY); S = seed(); evaluate(); S.notifs.forEach((n) => (n.read = false)); save(); hideAllModals(); go("MainPage"); alertMsg("info", "تمت إعادة ضبط البيانات التجريبية"); };

/* ---------- boot ---------- */
const silent = !S.notifs.length; evaluate(); if (silent) $("#AlertsMount").innerHTML = "";
$("#SimSpeed").value = String(S.speed);
go(S.page || "MainPage", S.reportType);
let last = Date.now();
setInterval(() => {
  const n = Date.now(); S.now += (n - last) * S.speed; last = n;
  const before = JSON.stringify(S.books.map((b) => [b.holder, b.escalated, b.flags]));
  evaluate();
  const changed = before !== JSON.stringify(S.books.map((b) => [b.holder, b.escalated, b.flags]));
  if (changed || S.speed > 1) { renderAll(); save(); } else lightTick();
}, 1000);
window.__proto = { get S() { return S; }, go, openTakeAction, openPrev, openMovement, openNotifs, evaluate, renderAll, save };
})();
