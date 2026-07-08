'use strict';

// ============================================================
// Produktivita – Fáze 1 + Fáze 2
// Vše se ukládá do localStorage, žádný server není potřeba.
// ============================================================

const ULOZNY_KLIC = 'produktivita_v1';

// ----- Pochvalné hlášky (losují se bez opakování) -----
const POCHVALY = [
  'Skvělá práce! 💪',
  'Paráda, jede ti to! 🚀',
  'Další úkol v kapse! 🎯',
  'Jsi mašina! ⚙️',
  'Takhle se to dělá! 👌',
  'Bomba! Pokračuj! 💥',
  'Máš to! 👏',
  'Jeden po druhém – přesně tak!',
  'Dneska ti to sype! ✨',
  'Výborně! Zasloužíš si kafe ☕',
  'Neskutečný výkon!',
  'Krok za krokem k cíli 🏁',
  'Tvoje budoucí já ti děkuje 🙏',
  'Hotovo a šmytec! ✂️',
  'Produktivita level 100! 📈',
  'To šlo jak po másle 🧈',
  'Kdo je tady šéf? Ty! 😎',
  'Zase o kousek dál!',
  'Úkoly se před tebou třesou 😄',
  'Čistá hlava, čistý seznam ✨',
  'Frajer! Jen tak dál! 🙌',
  'Disciplína vítězí! 🏆',
  'Malé kroky, velké výsledky!',
  'Dneska tě nic nezastaví! ⚡',
  'Hotovo! A vypadalo to tak těžce…',
  'Tvůj streak ti děkuje 🔥',
];

// ----- Úrovně (body potřebné k dosažení) -----
const UROVNE = [
  { body: 0,    nazev: 'Nováček' },
  { body: 100,  nazev: 'Začátečník' },
  { body: 250,  nazev: 'Učeň' },
  { body: 500,  nazev: 'Tahoun' },
  { body: 900,  nazev: 'Profík' },
  { body: 1400, nazev: 'Mistr' },
  { body: 2100, nazev: 'Velmistr' },
  { body: 3000, nazev: 'Šampion' },
  { body: 4200, nazev: 'Legenda' },
  { body: 6000, nazev: 'Titán produktivity' },
];

const BODY_BEZNY = 10;
const BODY_PRIORITA = 25;
const BODY_ZABA = 50;

const LIMIT_PRACE_SEKUND = 50 * 60; // po 50 minutách práce výzva k protažení

// Veřejný VAPID klíč pro push notifikace (soukromý je jen na serveru)
const VAPID_VEREJNY_KLIC = 'BI8ewQ7xVLEOwBLHtgC-3iuuov1YRyqZbcVbb5Lem0xv71Oc7a_Mad3pu2Nru-5Ik6t5ZROZ5EYHKyj9aBi-pIY';

// ----- Odznaky -----
const ODZNAKY = [
  { id: 'prvni-ukol',  emoji: '🌟', nazev: 'První krok',       popis: 'Splň první úkol',        kdyz: () => celkemSplneno() >= 1 },
  { id: 'ukoly-10',    emoji: '✅', nazev: 'Desítka',           popis: '10 splněných úkolů',     kdyz: () => celkemSplneno() >= 10 },
  { id: 'ukoly-50',    emoji: '💪', nazev: 'Padesátka',         popis: '50 splněných úkolů',     kdyz: () => celkemSplneno() >= 50 },
  { id: 'ukoly-100',   emoji: '💯', nazev: 'Stovkař',           popis: '100 splněných úkolů',    kdyz: () => celkemSplneno() >= 100 },
  { id: 'streak-3',    emoji: '🔥', nazev: 'Zahřívka',          popis: '3 dny streak',           kdyz: () => spocitejStreak() >= 3 },
  { id: 'streak-7',    emoji: '🚀', nazev: 'Týden v ohni',      popis: '7 dní streak',           kdyz: () => spocitejStreak() >= 7 },
  { id: 'streak-30',   emoji: '👑', nazev: 'Železná vůle',      popis: '30 dní streak',          kdyz: () => spocitejStreak() >= 30 },
  { id: 'zaba-rano',   emoji: '🐸', nazev: 'Ranní ptáče',       popis: 'Žába snědena před 9:00', kdyz: () => !!stav.udalosti.zabaPred9 },
  { id: 'pomodoro-1',  emoji: '🍅', nazev: 'První rajče',       popis: 'Dokonči pomodoro',       kdyz: () => celkemPomodor() >= 1 },
  { id: 'pomodoro-25', emoji: '🧑‍🌾', nazev: 'Rajčatová farma',  popis: '25 pomodor',             kdyz: () => celkemPomodor() >= 25 },
  { id: 'navyk-7',     emoji: '🌱', nazev: 'Pěstitel',          popis: 'Návyk 7 dní v řadě',     kdyz: () => nejdelsiRadaNavyku() >= 7 },
  { id: 'uzaverka-1',  emoji: '🌙', nazev: 'Večerníček',        popis: 'První večerní uzávěrka', kdyz: () => Object.values(stav.historie).some(z => z.uzaverkaHotova) },
];

// ----- Výchozí stav aplikace -----
let stav = {
  ukoly: [],           // {id, text, priorita, opakovani, hotovo, hotovoDatum, ziskaneBody, vytvoreno, termin, terminCas, pripomenuto}
  zaba: null,          // {ukolId, datum}
  body: 0,
  historie: {},        // 'YYYY-MM-DD' -> {splneno, pomodora, nalada, povedlo, uzaverkaHotova}
  pochvalyZasoba: [],
  motiv: 'dark',
  casovac: { rezim: 'fokus', trvani: 25 * 60, zbyva: 25 * 60, konecV: null, bezi: false },
  bloky: [],           // {id, datum, od, do, text}
  navyky: [],          // {id, nazev, vytvoreno}
  navykZaznamy: {},    // navykId -> {datum: true}
  odznaky: {},         // odznakId -> datum získání
  udalosti: {},        // jednorázové události pro odznaky (např. zabaPred9)
  prace: { sekundy: 0 },
  nastaveni: { notifikace: false },
  pohledUkolu: 'seznam', // 'seznam' | 'matice'
};

// Běhové proměnné (neukládají se)
let zobrazenyMesic = new Date();
let vybranyDen = dnes();
let fokusPoradi = 0;
let posledniTik = Date.now();
let toastCasovac = null;
let rozbalenoSplnene = false; // sekce „Splněné z minulých dní"
let swipe = null;             // rozpracované swipe gesto
let wakeLock = null;          // zámek displeje během časovače

// ============================================================
// Pomocné funkce
// ============================================================

function datumStr(d) {
  const r = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const den = String(d.getDate()).padStart(2, '0');
  return `${r}-${m}-${den}`;
}

function dnes() {
  return datumStr(new Date());
}

function zitra() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return datumStr(d);
}

function dniMezi(datumA, datumB) {
  const a = new Date(datumA + 'T00:00:00');
  const b = new Date(datumB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function denniZaznam(datum) {
  if (!stav.historie[datum]) stav.historie[datum] = { splneno: 0, pomodora: 0 };
  return stav.historie[datum];
}

function najdiUkol(id) {
  return stav.ukoly.find(u => u.id === id);
}

function jeZaba(ukolId) {
  return stav.zaba && stav.zaba.ukolId === ukolId && stav.zaba.datum === dnes();
}

function jeNalehave(u) {
  return !!u.termin && u.termin <= dnes();
}

function novyId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function celkemSplneno() {
  return Object.values(stav.historie).reduce((s, z) => s + (z.splneno || 0), 0);
}

function celkemPomodor() {
  return Object.values(stav.historie).reduce((s, z) => s + (z.pomodora || 0), 0);
}

function formatTermin(u) {
  const t = u.termin;
  const cas = u.terminCas ? ' ' + u.terminCas : '';
  if (t === dnes()) return 'dnes' + cas;
  if (t === zitra()) return 'zítra' + cas;
  const d = new Date(t + 'T00:00:00');
  return `${d.getDate()}. ${d.getMonth() + 1}.` + cas;
}

// ============================================================
// Ukládání a načítání
// ============================================================

function uloz() {
  try {
    localStorage.setItem(ULOZNY_KLIC, JSON.stringify(stav));
  } catch (e) {
    console.error('Nepodařilo se uložit data:', e);
  }
}

function nacti() {
  try {
    const data = localStorage.getItem(ULOZNY_KLIC);
    if (data) {
      stav = Object.assign(stav, JSON.parse(data));
    }
  } catch (e) {
    console.error('Nepodařilo se načíst data:', e);
  }
  // Pojistky pro data z Fáze 1 (nové klíče nemusí existovat)
  if (!stav.casovac) stav.casovac = { rezim: 'fokus', trvani: 25 * 60, zbyva: 25 * 60, konecV: null, bezi: false };
  if (!Array.isArray(stav.bloky)) stav.bloky = [];
  if (!Array.isArray(stav.navyky)) stav.navyky = [];
  if (!stav.navykZaznamy) stav.navykZaznamy = {};
  if (!stav.odznaky) stav.odznaky = {};
  if (!stav.udalosti) stav.udalosti = {};
  if (!stav.prace) stav.prace = { sekundy: 0 };
  if (!stav.nastaveni) stav.nastaveni = { notifikace: false };
  if (!stav.pohledUkolu) stav.pohledUkolu = 'seznam';
}

// Denní reset: opakující se úkoly se znovu odemknou, stará žába zmizí
function denniReset() {
  const t = dnes();
  for (const u of stav.ukoly) {
    if (u.hotovo && u.opakovani && u.hotovoDatum) {
      const odemknout =
        (u.opakovani === 'denne' && u.hotovoDatum !== t) ||
        (u.opakovani === 'tydne' && dniMezi(u.hotovoDatum, t) >= 7);
      if (odemknout) {
        u.hotovo = false;
        u.hotovoDatum = null;
        u.ziskaneBody = 0;
      }
    }
  }
  if (stav.zaba && stav.zaba.datum !== t) stav.zaba = null;
}

// ============================================================
// Pochvaly (losování bez opakování)
// ============================================================

function dalsiPochvala() {
  if (!Array.isArray(stav.pochvalyZasoba) || stav.pochvalyZasoba.length === 0) {
    const indexy = [...Array(POCHVALY.length).keys()];
    for (let i = indexy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexy[i], indexy[j]] = [indexy[j], indexy[i]];
    }
    stav.pochvalyZasoba = indexy;
  }
  return POCHVALY[stav.pochvalyZasoba.pop()];
}

// ============================================================
// Toast (bublina s hláškou)
// ============================================================

function ukazToast(text, podtext) {
  const el = document.getElementById('toast');
  el.innerHTML = esc(text) + (podtext ? `<span class="toast-body">${esc(podtext)}</span>` : '');
  el.classList.add('zobrazit');
  clearTimeout(toastCasovac);
  toastCasovac = setTimeout(() => el.classList.remove('zobrazit'), 3000);
}

// Toast s tlačítkem Zpět (např. po smazání úkolu)
function ukazToastZpet(text, priZpet) {
  const el = document.getElementById('toast');
  el.innerHTML = esc(text) + '<button id="toast-zpet-btn" class="toast-zpet">Zpět</button>';
  document.getElementById('toast-zpet-btn').addEventListener('click', () => {
    clearTimeout(toastCasovac);
    el.classList.remove('zobrazit');
    priZpet();
  });
  el.classList.add('zobrazit');
  clearTimeout(toastCasovac);
  toastCasovac = setTimeout(() => el.classList.remove('zobrazit'), 5000);
}

// ============================================================
// Úrovně, body, odznaky
// ============================================================

function aktualniUroven() {
  let i = 0;
  while (i + 1 < UROVNE.length && stav.body >= UROVNE[i + 1].body) i++;
  return i;
}

function nejdelsiRadaNavyku() {
  let max = 0;
  for (const n of stav.navyky) {
    const zaznamy = stav.navykZaznamy[n.id] || {};
    // řada může končit dneškem, nebo včerejškem (dnešek ještě nemusí být odškrtnutý)
    const d = new Date();
    if (!zaznamy[datumStr(d)]) d.setDate(d.getDate() - 1);
    let rada = 0;
    while (zaznamy[datumStr(d)]) {
      rada++;
      d.setDate(d.getDate() - 1);
    }
    max = Math.max(max, rada);
  }
  return max;
}

function zkontrolujOdznaky() {
  for (const o of ODZNAKY) {
    if (!stav.odznaky[o.id] && o.kdyz()) {
      stav.odznaky[o.id] = dnes();
      ukazToast(`🏅 Nový odznak: ${o.nazev}!`, o.popis);
    }
  }
}

// ============================================================
// Úkoly
// ============================================================

function pridejUkol(text, priorita, opakovani, termin, terminCas) {
  const ukol = {
    id: novyId(),
    text,
    priorita,
    opakovani,
    termin: termin || null,
    terminCas: terminCas || null,
    pripomenuto: false,
    pushId: null,
    hotovo: false,
    hotovoDatum: null,
    ziskaneBody: 0,
    vytvoreno: Date.now(),
  };
  stav.ukoly.push(ukol);
  naplanujPripominku(ukol);
  uloz();
  renderVse();
}

function prepniHotovo(id) {
  const u = najdiUkol(id);
  if (!u) return;

  if (!u.hotovo) {
    u.hotovo = true;
    u.hotovoDatum = dnes();
    let ziskane = BODY_BEZNY;
    if (u.priorita) ziskane = BODY_PRIORITA;
    if (jeZaba(u.id)) {
      ziskane = BODY_ZABA;
      if (new Date().getHours() < 9) stav.udalosti.zabaPred9 = true;
    }
    u.ziskaneBody = ziskane;

    const urovenPred = aktualniUroven();
    stav.body += ziskane;
    denniZaznam(dnes()).splneno++;

    if (aktualniUroven() > urovenPred) {
      ukazToast(`🎉 Nová úroveň: ${UROVNE[aktualniUroven()].nazev}!`, `+${ziskane} bodů`);
    } else {
      ukazToast(dalsiPochvala(), `+${ziskane} bodů`);
    }
    zrusPush(u.pushId);
    u.pushId = null;
    zkontrolujOdznaky();
  } else {
    stav.body = Math.max(0, stav.body - (u.ziskaneBody || 0));
    const zaznam = denniZaznam(u.hotovoDatum || dnes());
    zaznam.splneno = Math.max(0, zaznam.splneno - 1);
    u.hotovo = false;
    u.hotovoDatum = null;
    u.ziskaneBody = 0;
  }

  uloz();
  renderVse();
}

function smazUkol(id) {
  const index = stav.ukoly.findIndex(u => u.id === id);
  if (index === -1) return;
  const ukol = stav.ukoly[index];
  const bylaZaba = stav.zaba && stav.zaba.ukolId === id ? stav.zaba : null;

  stav.ukoly.splice(index, 1);
  if (bylaZaba) stav.zaba = null;
  zrusPush(ukol.pushId);
  ukol.pushId = null;
  uloz();
  renderVse();

  ukazToastZpet('🗑️ Úkol smazán.', () => {
    stav.ukoly.splice(Math.min(index, stav.ukoly.length), 0, ukol);
    if (bylaZaba) stav.zaba = bylaZaba;
    naplanujPripominku(ukol);
    uloz();
    renderVse();
  });
}

function prepniZabu(id) {
  if (jeZaba(id)) {
    stav.zaba = null;
  } else {
    stav.zaba = { ukolId: id, datum: dnes() };
    ukazToast('🐸 Žába dne vybrána! Sněz ji jako první.');
  }
  uloz();
  renderVse();
}

// ----- Vykreslení úkolů -----

function terminStitek(u) {
  if (!u.termin) return '';
  const prosly = !u.hotovo && u.termin < dnes();
  return `<span class="stitek stitek-termin${prosly ? ' prosly' : ''}">📅 ${prosly ? 'po termínu' : esc(formatTermin(u))}</span>`;
}

function ukolHTML(u, vZabaBoxu) {
  const stitky = [];
  if (u.priorita) stitky.push('<span class="stitek stitek-priorita">⭐ priorita</span>');
  if (u.opakovani === 'denne') stitky.push('<span class="stitek">🔁 denně</span>');
  if (u.opakovani === 'tydne') stitky.push('<span class="stitek">🔁 týdně</span>');
  const t = terminStitek(u);
  if (t) stitky.push(t);

  return `
    <li class="ukol${u.hotovo ? ' hotovo' : ''}${u.priorita ? ' prioritni' : ''}" data-id="${u.id}">
      <button class="check" data-akce="hotovo" aria-label="Označit jako splněný">${u.hotovo ? '✔' : ''}</button>
      <div class="ukol-telo">
        <span class="ukol-text">${esc(u.text)}</span>
        ${stitky.length ? `<span class="ukol-stitky">${stitky.join('')}</span>` : ''}
      </div>
      <button class="ikona-btn${jeZaba(u.id) ? ' je-zaba' : ''}" data-akce="zaba" title="${vZabaBoxu ? 'Zrušit žábu dne' : 'Označit jako žábu dne'}">🐸</button>
      <button class="ikona-btn" data-akce="smazat" title="Smazat úkol">🗑️</button>
    </li>`;
}

function renderUkoly() {
  const seznam = document.getElementById('seznam-ukolu');
  const prazdny = document.getElementById('prazdny-seznam');
  const zabaBox = document.getElementById('zaba-box');

  // Žába dne nahoře ve zvýrazněném rámečku
  const zabaUkol = stav.zaba && stav.zaba.datum === dnes() ? najdiUkol(stav.zaba.ukolId) : null;
  let zabaObsah = '<div class="zaba-titulek">🐸 Žába dne</div>';
  if (zabaUkol) {
    zabaObsah += `<ul class="seznam-ukolu">${ukolHTML(zabaUkol, true)}</ul>`;
    if (zabaUkol.hotovo) zabaObsah += '<div class="zaba-hotovo-text">Žába snědena! Nejtěžší úkol dne máš za sebou 🎉</div>';
  } else {
    zabaObsah += '<p class="zaba-napoveda">Každé ráno si vyber svůj nejdůležitější úkol – klepni na 🐸 u úkolu v seznamu.</p>';
  }
  zabaBox.innerHTML = zabaObsah;

  // Přepínač seznam/matice
  const jeMatice = stav.pohledUkolu === 'matice';
  document.getElementById('pohled-seznam-btn').classList.toggle('aktivni', !jeMatice);
  document.getElementById('pohled-matice-btn').classList.toggle('aktivni', jeMatice);
  document.getElementById('pohled-seznam').hidden = jeMatice;
  document.getElementById('pohled-matice').hidden = !jeMatice;

  // Seznam: aktivní (priorita první, nejnovější nahoře), pak dnes splněné.
  // Splněné z minulých dní jdou do sbalené sekce, ať se seznam nezanáší.
  const ostatni = stav.ukoly.filter(u => !zabaUkol || u.id !== zabaUkol.id);
  const aktivni = ostatni.filter(u => !u.hotovo);
  const hotoveDnes = ostatni.filter(u => u.hotovo && u.hotovoDatum === dnes());
  const hotoveStarsi = ostatni.filter(u => u.hotovo && u.hotovoDatum !== dnes());

  aktivni.sort((a, b) => {
    if (a.priorita !== b.priorita) return a.priorita ? -1 : 1;
    return b.vytvoreno - a.vytvoreno;
  });
  hotoveDnes.sort((a, b) => b.vytvoreno - a.vytvoreno);
  hotoveStarsi.sort((a, b) => (b.hotovoDatum || '').localeCompare(a.hotovoDatum || ''));

  seznam.innerHTML = [...aktivni, ...hotoveDnes].map(u => ukolHTML(u, false)).join('');
  prazdny.hidden = stav.ukoly.length > 0;

  const splneneSekce = document.getElementById('splnene-sekce');
  splneneSekce.hidden = hotoveStarsi.length === 0;
  document.getElementById('splnene-toggle').textContent =
    `${rozbalenoSplnene ? '▾' : '▸'} Splněné z minulých dní (${hotoveStarsi.length})`;
  const seznamSplnenych = document.getElementById('seznam-splnenych');
  seznamSplnenych.hidden = !rozbalenoSplnene;
  seznamSplnenych.innerHTML = rozbalenoSplnene ? hotoveStarsi.map(u => ukolHTML(u, false)).join('') : '';

  if (jeMatice) renderMatice();
}

// ----- Eisenhowerova matice -----

function miniUkolHTML(u) {
  return `
    <li class="mini-ukol" data-id="${u.id}">
      <button class="check" data-akce="hotovo" aria-label="Označit jako splněný"></button>
      <span>${jeZaba(u.id) ? '🐸 ' : ''}${esc(u.text)}</span>
    </li>`;
}

function renderMatice() {
  const nehotove = stav.ukoly.filter(u => !u.hotovo);
  const kvadranty = { 1: [], 2: [], 3: [], 4: [] };
  for (const u of nehotove) {
    const dulezite = u.priorita || jeZaba(u.id);
    const nalehave = jeNalehave(u);
    const q = dulezite ? (nalehave ? 1 : 2) : (nalehave ? 3 : 4);
    kvadranty[q].push(u);
  }
  for (const q of [1, 2, 3, 4]) {
    const el = document.getElementById('kvadrant-' + q);
    el.innerHTML = kvadranty[q].length
      ? kvadranty[q].map(miniUkolHTML).join('')
      : '<li class="kvadrant-prazdny">– nic –</li>';
  }
}

// ============================================================
// Kalendář + time blocking
// ============================================================

const MESICE = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

function renderKalendar() {
  const rok = zobrazenyMesic.getFullYear();
  const mesic = zobrazenyMesic.getMonth();
  document.getElementById('kal-mesic-nazev').textContent = `${MESICE[mesic]} ${rok}`;

  const prvniDen = new Date(rok, mesic, 1);
  const posun = (prvniDen.getDay() + 6) % 7; // pondělí = 0
  const pocetDni = new Date(rok, mesic + 1, 0).getDate();

  let html = '';
  for (let i = 0; i < posun; i++) html += '<div class="kal-den mimo"></div>';
  for (let den = 1; den <= pocetDni; den++) {
    const datum = datumStr(new Date(rok, mesic, den));
    const maBlok = stav.bloky.some(b => b.datum === datum);
    const maUkol = stav.ukoly.some(u => u.termin === datum && !u.hotovo);
    const tridy = ['kal-den'];
    if (datum === dnes()) tridy.push('dnesek');
    if (datum === vybranyDen) tridy.push('vybrany');
    html += `
      <div class="${tridy.join(' ')}" data-datum="${datum}">
        <span>${den}</span>
        <span class="kal-tecky">
          ${maBlok ? '<span class="kal-tecka blok"></span>' : ''}
          ${maUkol ? '<span class="kal-tecka ukol"></span>' : ''}
        </span>
      </div>`;
  }
  document.getElementById('kal-mrizka').innerHTML = html;
  renderDenDetail();
}

function renderDenDetail() {
  const d = new Date(vybranyDen + 'T00:00:00');
  const nazev = d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('den-titulek').textContent =
    `📋 Plán: ${nazev}` + (vybranyDen === dnes() ? ' (dnes)' : '');

  // Úkoly s termínem v tento den
  const ukolyDne = stav.ukoly.filter(u => u.termin === vybranyDen);
  document.getElementById('den-ukoly').innerHTML = ukolyDne
    .map(u => `<div class="den-ukol-radek">${u.hotovo ? '✅' : '📌'} ${esc(u.text)}${u.terminCas ? ' (' + u.terminCas + ')' : ''}</div>`)
    .join('');

  // Bloky času
  const bloky = stav.bloky.filter(b => b.datum === vybranyDen).sort((a, b) => a.od.localeCompare(b.od));
  document.getElementById('den-bloky').innerHTML = bloky.length
    ? bloky.map(b => `
        <div class="blok">
          <span class="blok-cas">${b.od}–${b.do}</span>
          <span class="blok-popis">${esc(b.text)}</span>
          <button class="blok-smazat" data-id="${b.id}" title="Smazat blok">🗑️</button>
        </div>`).join('')
    : '<p class="prazdny-text" style="margin:6px 0">Žádné bloky času. Naplánuj si den! 👇</p>';
}

function pridejBlok(od, doCasu, text) {
  if (od >= doCasu) {
    ukazToast('⚠️ Konec bloku musí být po začátku.');
    return false;
  }
  stav.bloky.push({ id: novyId(), datum: vybranyDen, od, do: doCasu, text });
  uloz();
  renderKalendar();
  return true;
}

// ============================================================
// Návyky
// ============================================================

function posledni7Dni() {
  const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const dny = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dny.push({ datum: datumStr(d), pismeno: DNY[d.getDay()], jeDnes: i === 0 });
  }
  return dny;
}

function renderNavyky() {
  const dny = posledni7Dni();
  document.getElementById('navyky-dny-nazvy').innerHTML =
    dny.map(d => `<span class="navyk-den-nazev">${d.pismeno}</span>`).join('');
  document.getElementById('navyky-hlavicka').hidden = stav.navyky.length === 0;
  document.getElementById('navyky-prazdne').hidden = stav.navyky.length > 0;

  document.getElementById('navyky-seznam').innerHTML = stav.navyky.map(n => {
    const zaznamy = stav.navykZaznamy[n.id] || {};
    const bunky = dny.map(d => `
      <button class="navyk-bunka${zaznamy[d.datum] ? ' splneno' : ''}${d.jeDnes ? ' dnesek' : ''}"
        data-navyk="${n.id}" data-datum="${d.datum}" title="${d.datum}">${zaznamy[d.datum] ? '✔' : ''}</button>`).join('');
    return `
      <div class="navyk-radek">
        <div class="navyk-nazev">${esc(n.nazev)}</div>
        <div class="navyk-dny">${bunky}</div>
        <div class="navyk-akce"><button class="navyk-smazat" data-id="${n.id}" title="Smazat návyk">🗑️</button></div>
      </div>`;
  }).join('');
}

function prepniNavyk(navykId, datum) {
  if (!stav.navykZaznamy[navykId]) stav.navykZaznamy[navykId] = {};
  if (stav.navykZaznamy[navykId][datum]) {
    delete stav.navykZaznamy[navykId][datum];
  } else {
    stav.navykZaznamy[navykId][datum] = true;
    zkontrolujOdznaky();
  }
  uloz();
  renderNavyky();
}

// ============================================================
// Časovač + Pomodoro + připomínka přestávek
// ============================================================

const REZIMY = { fokus: 25 * 60, pauza: 5 * 60 };

// Wake Lock: dokud časovač běží, displej nezhasne
async function poridWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* prohlížeč to neumí nebo zakázal – nevadí */ }
}

function uvolniWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function pushTextCasovace() {
  const r = stav.casovac.rezim;
  if (r === 'fokus') return ['🍅 Pomodoro hotovo!', 'Dej si zaslouženou pauzu.'];
  if (r === 'pauza') return ['☕ Pauza skončila', 'Jdeme na to! 💪'];
  return ['⏰ Čas vypršel!', ''];
}

function nastavRezim(rezim) {
  const c = stav.casovac;
  zrusPush(c.pushId);
  c.pushId = null;
  uvolniWakeLock();
  c.rezim = rezim;
  c.bezi = false;
  c.konecV = null;
  c.trvani = rezim === 'vlastni'
    ? Math.max(1, parseInt(document.getElementById('vlastni-min').value, 10) || 10) * 60
    : REZIMY[rezim];
  c.zbyva = c.trvani;
  uloz();
  renderCasovac();
}

function startPauza() {
  const c = stav.casovac;
  if (c.bezi) {
    c.zbyva = Math.max(0, Math.round((c.konecV - Date.now()) / 1000));
    c.bezi = false;
    c.konecV = null;
    zrusPush(c.pushId);
    c.pushId = null;
    uvolniWakeLock();
  } else {
    if (c.zbyva <= 0) c.zbyva = c.trvani;
    c.konecV = Date.now() + c.zbyva * 1000;
    c.bezi = true;
    poridWakeLock();
    const [titulek, text] = pushTextCasovace();
    naplanujPush(titulek, text, c.zbyva).then(id => {
      if (id) {
        stav.casovac.pushId = id;
        uloz();
      }
    });
  }
  uloz();
  renderCasovac();
}

function resetCasovace() {
  const c = stav.casovac;
  c.bezi = false;
  c.konecV = null;
  c.zbyva = c.trvani;
  zrusPush(c.pushId);
  c.pushId = null;
  uvolniWakeLock();
  uloz();
  renderCasovac();
}

function casovacDobehl() {
  const c = stav.casovac;
  c.bezi = false;
  c.konecV = null;
  // Doběhl v otevřené aplikaci – naplánovaný push už není potřeba
  zrusPush(c.pushId);
  c.pushId = null;
  uvolniWakeLock();

  zapipej();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  if (c.rezim === 'fokus') {
    denniZaznam(dnes()).pomodora++;
    ukazToast('🍅 Pomodoro hotovo! Dej si zaslouženou pauzu.');
    zkontrolujOdznaky();
    c.rezim = 'pauza';
    c.trvani = REZIMY.pauza;
  } else if (c.rezim === 'pauza') {
    stav.prace.sekundy = 0; // pauza proběhla, počítadlo práce začíná znovu
    ukazToast('☕ Pauza skončila. Jdeme na to! 💪');
    c.rezim = 'fokus';
    c.trvani = REZIMY.fokus;
  } else {
    ukazToast('⏰ Čas vypršel!');
  }
  c.zbyva = c.trvani;

  uloz();
  renderCasovac();
  renderPrehled();
}

function tikni() {
  const ted = Date.now();
  const delta = Math.min(2, (ted - posledniTik) / 1000);
  posledniTik = ted;

  const c = stav.casovac;
  if (!c.bezi) return;

  // Připomínka přestávek: počítá se práce v režimech soustředění a vlastní
  if (c.rezim !== 'pauza') {
    stav.prace.sekundy += delta;
    if (stav.prace.sekundy >= LIMIT_PRACE_SEKUND) {
      stav.prace.sekundy = 0;
      zapipej();
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      ukazToast('🤸 Pracuješ už 50 minut v kuse.', 'Vstaň a protáhni se!');
      uloz();
    }
  }

  const zbyva = Math.max(0, Math.round((c.konecV - Date.now()) / 1000));
  c.zbyva = zbyva;
  if (zbyva <= 0) {
    casovacDobehl();
  } else {
    renderCasovacDisplej();
  }
}

function formatCas(sekundy) {
  const m = Math.floor(sekundy / 60);
  const s = sekundy % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderCasovacDisplej() {
  const c = stav.casovac;
  document.getElementById('casovac-displej').textContent = formatCas(c.zbyva);
  const procent = c.trvani > 0 ? (c.zbyva / c.trvani) * 100 : 0;
  document.getElementById('casovac-pruh-vypln').style.width = procent + '%';
  document.title = c.bezi ? `${formatCas(c.zbyva)} – Produktivita` : 'Produktivita';

  const praceMin = Math.floor(stav.prace.sekundy / 60);
  document.getElementById('prace-info').textContent =
    praceMin > 0 ? `Práce bez přestávky: ${praceMin} min (po 50 min tě vyzvu k protažení)` : '';
}

function renderCasovac() {
  const c = stav.casovac;
  document.querySelectorAll('.rezim-btn').forEach(btn => {
    btn.classList.toggle('aktivni', btn.dataset.rezim === c.rezim);
  });
  document.getElementById('vlastni-radek').hidden = c.rezim !== 'vlastni';
  document.getElementById('start-btn').textContent = c.bezi ? '⏸ Pauza' : '▶ Start';
  document.getElementById('pomodora-pocet').textContent = denniZaznam(dnes()).pomodora;
  renderCasovacDisplej();
}

// Zvukové pípnutí přes Web Audio (funguje offline, žádný soubor)
function zapipej() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(zpozdeni => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + zpozdeni);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + zpozdeni + 0.2);
      osc.start(ctx.currentTime + zpozdeni);
      osc.stop(ctx.currentTime + zpozdeni + 0.22);
    });
  } catch (e) { /* zvuk není dostupný, nevadí */ }
}

// ============================================================
// Připomenutí úkolů s termínem (funguje při otevřené aplikaci)
// ============================================================

function zkontrolujPripominky() {
  if (!stav.nastaveni.notifikace) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const ted = new Date();
  let zmena = false;
  for (const u of stav.ukoly) {
    if (u.hotovo || !u.termin || u.pripomenuto) continue;
    const kdy = new Date(`${u.termin}T${u.terminCas || '09:00'}:00`);
    if (ted.getTime() >= kdy.getTime() - 15 * 60000) {
      u.pripomenuto = true;
      zmena = true;
      try {
        new Notification('⏰ Blíží se termín úkolu', { body: u.text, icon: 'icons/icon-192.png' });
      } catch (e) { /* notifikace se nepovedla, toast stačí */ }
      ukazToast('⏰ Blíží se termín: ' + u.text);
    }
  }
  if (zmena) uloz();
}

function prepniNotifikace() {
  if (!('Notification' in window)) {
    ukazToast('⚠️ Tenhle prohlížeč notifikace nepodporuje.');
    return;
  }
  if (stav.nastaveni.notifikace) {
    stav.nastaveni.notifikace = false;
    uloz();
    renderNastaveni();
    return;
  }
  Notification.requestPermission().then(povoleni => {
    if (povoleni === 'granted') {
      stav.nastaveni.notifikace = true;
      ukazToast('🔔 Notifikace zapnuty.');
      prihlasKPushum();
    } else {
      ukazToast('⚠️ Notifikace jsou v prohlížeči zakázané.');
    }
    uloz();
    renderNastaveni();
  });
}

// ----- Push notifikace přes server (fungují i při zamčeném telefonu) -----

function base64NaUint8Array(base64) {
  const doplneni = '='.repeat((4 - (base64.length % 4)) % 4);
  const upraveny = (base64 + doplneni).replace(/-/g, '+').replace(/_/g, '/');
  const surova = atob(upraveny);
  return Uint8Array.from([...surova].map(z => z.charCodeAt(0)));
}

async function prihlasKPushum() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const registrace = await navigator.serviceWorker.ready;
    const odber = await registrace.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64NaUint8Array(VAPID_VEREJNY_KLIC),
    });
    stav.nastaveni.pushSubscription = odber.toJSON();
    uloz();
  } catch (e) {
    console.warn('Push odběr se nepovedl (upozornění budou fungovat jen v otevřené aplikaci):', e);
  }
}

// Naplánuje push na serveru; vrátí messageId (pro případné storno), nebo null
async function naplanujPush(titulek, text, delaySekundy) {
  const odber = stav.nastaveni.pushSubscription;
  if (!odber || !stav.nastaveni.notifikace || delaySekundy < 5) return null;
  try {
    const odpoved = await fetch('api/naplanuj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: odber, titulek, text, delaySekundy }),
    });
    if (!odpoved.ok) return null;
    return (await odpoved.json()).messageId || null;
  } catch (e) {
    return null; // offline nebo server nedostupný – aplikace jede dál
  }
}

async function zrusPush(messageId) {
  if (!messageId) return;
  try {
    await fetch('api/zrus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    });
  } catch (e) { /* storno se nepovedlo – notifikace přijde navíc, nevadí */ }
}

// Naplánuje připomenutí úkolu s termínem a časem (15 minut předem)
function naplanujPripominku(ukol) {
  if (!ukol.termin || !ukol.terminCas || ukol.hotovo) return;
  const kdy = new Date(`${ukol.termin}T${ukol.terminCas}:00`).getTime() - 15 * 60000;
  const delay = (kdy - Date.now()) / 1000;
  if (delay < 5) return;
  naplanujPush('⏰ Blíží se termín úkolu', ukol.text, delay).then(id => {
    if (id) {
      ukol.pushId = id;
      uloz();
    }
  });
}

function renderNastaveni() {
  document.getElementById('notifikace-btn').textContent =
    stav.nastaveni.notifikace ? '🔔 Notifikace zapnuty – klepni pro vypnutí' : 'Zapnout notifikace';
}

// ============================================================
// Fokus režim (jeden úkol přes celou obrazovku)
// ============================================================

function fokusKandidati() {
  const nehotove = stav.ukoly.filter(u => !u.hotovo);
  nehotove.sort((a, b) => {
    const za = jeZaba(a.id) ? 1 : 0;
    const zb = jeZaba(b.id) ? 1 : 0;
    if (za !== zb) return zb - za;
    if (a.priorita !== b.priorita) return a.priorita ? -1 : 1;
    return a.vytvoreno - b.vytvoreno;
  });
  return nehotove;
}

function otevriFokus() {
  fokusPoradi = 0;
  renderFokus();
  document.getElementById('fokus-overlay').hidden = false;
}

function renderFokus() {
  const kandidati = fokusKandidati();
  const textEl = document.getElementById('fokus-ukol-text');
  const stitkyEl = document.getElementById('fokus-stitky');
  const hotovoBtn = document.getElementById('fokus-hotovo-btn');
  const dalsiBtn = document.getElementById('fokus-dalsi-btn');

  if (kandidati.length === 0) {
    textEl.textContent = 'Vše hotovo! 🎉';
    stitkyEl.innerHTML = '';
    hotovoBtn.hidden = true;
    dalsiBtn.hidden = true;
    return;
  }
  hotovoBtn.hidden = false;
  dalsiBtn.hidden = kandidati.length < 2;

  const u = kandidati[fokusPoradi % kandidati.length];
  textEl.textContent = u.text;
  const stitky = [];
  if (jeZaba(u.id)) stitky.push('<span class="stitek">🐸 žába dne</span>');
  if (u.priorita) stitky.push('<span class="stitek stitek-priorita">⭐ priorita</span>');
  const t = terminStitek(u);
  if (t) stitky.push(t);
  stitkyEl.innerHTML = stitky.join('');
}

function fokusHotovo() {
  const kandidati = fokusKandidati();
  if (kandidati.length === 0) return;
  const u = kandidati[fokusPoradi % kandidati.length];
  fokusPoradi = 0;
  prepniHotovo(u.id);
  renderFokus();
}

// ============================================================
// Nálada
// ============================================================

function nastavNaladu(hodnota) {
  denniZaznam(dnes()).nalada = hodnota;
  uloz();
  renderNalada();
  renderUzaverkaModal();
}

function renderNalada() {
  const dnesni = (stav.historie[dnes()] || {}).nalada;
  document.querySelectorAll('#nalada-tlacitka button').forEach(b => {
    b.classList.toggle('vybrana', Number(b.dataset.nalada) === dnesni);
  });

  // Graf nálady za posledních 14 dní
  const sloupce = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const z = stav.historie[datumStr(d)];
    const n = z ? z.nalada : null;
    sloupce.push(`
      <div class="nalada-sloupec-obal">
        <div class="nalada-sloupec${n ? ' n' + n : ''}" style="height:${n ? n * 20 : 4}%"></div>
        <span class="nalada-popisek">${d.getDate()}.</span>
      </div>`);
  }
  document.getElementById('nalada-graf').innerHTML = sloupce.join('');
}

// ============================================================
// Večerní uzávěrka
// ============================================================

function otevriUzaverku() {
  renderUzaverkaModal();
  document.getElementById('uzaverka-modal').hidden = false;
}

function renderUzaverkaModal() {
  const nedodelane = stav.ukoly.filter(u => !u.hotovo);
  document.getElementById('uzaverka-presun').innerHTML = nedodelane.length
    ? nedodelane.map(u => `
        <label class="presun-radek">
          <input type="checkbox" data-id="${u.id}" checked>
          <span>${esc(u.text)}</span>
        </label>`).join('')
    : '<p class="uzaverka-nic">Všechno splněno – dnešek byl dokonalý! 🎉</p>';

  const z = stav.historie[dnes()] || {};
  document.getElementById('povedlo-text').value = z.povedlo || '';
  document.querySelectorAll('#uzaverka-nalada button').forEach(b => {
    b.classList.toggle('vybrana', Number(b.dataset.nalada) === z.nalada);
  });
}

function ulozUzaverku() {
  // Přesun zaškrtnutých nedodělaných úkolů na zítra
  let presunuto = 0;
  document.querySelectorAll('#uzaverka-presun input[type="checkbox"]:checked').forEach(ch => {
    const u = najdiUkol(ch.dataset.id);
    if (u && !u.hotovo) {
      u.termin = zitra();
      u.pripomenuto = false;
      zrusPush(u.pushId);
      u.pushId = null;
      naplanujPripominku(u);
      presunuto++;
    }
  });

  const zaznam = denniZaznam(dnes());
  const povedlo = document.getElementById('povedlo-text').value.trim();
  if (povedlo) zaznam.povedlo = povedlo;
  zaznam.uzaverkaHotova = true;

  zkontrolujOdznaky();
  uloz();
  document.getElementById('uzaverka-modal').hidden = true;
  ukazToast('🌙 Den uzavřen. Dobrou noc!', presunuto ? `${presunuto} úkolů přesunuto na zítra` : undefined);
  renderVse();
}

function renderUzaverkaInfo() {
  const z = stav.historie[dnes()] || {};
  const info = document.getElementById('uzaverka-info');
  if (z.uzaverkaHotova) {
    info.innerHTML = '✅ Dnešek je uzavřený.' +
      (z.povedlo ? `<br>Povedlo se: <span class="povedlo-citace">„${esc(z.povedlo)}"</span>` : '');
    document.getElementById('uzaverka-btn').textContent = 'Upravit uzávěrku';
  } else {
    info.textContent = 'Večer si projdi den: přesuň nedodělané úkoly na zítřek a zapiš si, co se povedlo.';
    document.getElementById('uzaverka-btn').textContent = 'Uzavřít den';
  }
}

// ============================================================
// Streak a přehled
// ============================================================

function spocitejStreak() {
  let d = new Date();
  const dnesniZaznam = stav.historie[datumStr(d)];
  if (!dnesniZaznam || dnesniZaznam.splneno < 3) d.setDate(d.getDate() - 1);

  let streak = 0;
  while (true) {
    const z = stav.historie[datumStr(d)];
    if (z && z.splneno >= 3) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderOdznaky() {
  document.getElementById('odznaky-mrizka').innerHTML = ODZNAKY.map(o => `
    <div class="odznak${stav.odznaky[o.id] ? ' ziskany' : ''}" title="${esc(o.popis)}">
      <div class="odznak-emoji">${o.emoji}</div>
      <div class="odznak-nazev">${esc(o.nazev)}</div>
      <div class="odznak-popis">${esc(o.popis)}</div>
    </div>`).join('');
}

function renderPrehled() {
  const urovenIdx = aktualniUroven();
  const uroven = UROVNE[urovenIdx];
  const dalsi = UROVNE[urovenIdx + 1];

  document.getElementById('uroven-nazev').textContent = uroven.nazev;
  document.getElementById('uroven-cislo').textContent = `Úroveň ${urovenIdx + 1} z ${UROVNE.length}`;

  const vypln = document.getElementById('uroven-pruh-vypln');
  const popis = document.getElementById('uroven-popis');
  if (dalsi) {
    const procent = ((stav.body - uroven.body) / (dalsi.body - uroven.body)) * 100;
    vypln.style.width = Math.min(100, procent) + '%';
    popis.textContent = `Do úrovně „${dalsi.nazev}" zbývá ${dalsi.body - stav.body} bodů.`;
  } else {
    vypln.style.width = '100%';
    popis.textContent = 'Dosáhl jsi nejvyšší úrovně! 👑';
  }

  const dnesniZaznam = stav.historie[dnes()] || { splneno: 0, pomodora: 0 };
  document.getElementById('stat-streak').textContent = spocitejStreak();
  document.getElementById('stat-body').textContent = stav.body;
  document.getElementById('stat-dnes').textContent = dnesniZaznam.splneno;
  document.getElementById('stat-pomodora').textContent = dnesniZaznam.pomodora;

  // Statistiky týdne: úkoly + pomodora po dnech
  const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const dny = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const z = stav.historie[datumStr(d)] || {};
    dny.push({ pismeno: DNY[d.getDay()], splneno: z.splneno || 0, pomodora: z.pomodora || 0, jeDnes: i === 0 });
  }
  const maxU = Math.max(3, ...dny.map(d => d.splneno));
  const maxP = Math.max(4, ...dny.map(d => d.pomodora));
  document.getElementById('tydenni-graf').innerHTML = dny.map(d => `
    <div class="graf-den">
      <div class="graf-skupina">
        <div class="graf-sloupec${d.splneno >= 3 ? ' splneno' : ''}" style="height:${Math.max(4, (d.splneno / maxU) * 100)}%" title="${d.splneno} úkolů"></div>
        <div class="graf-sloupec pomodora" style="height:${Math.max(4, (d.pomodora / maxP) * 100)}%" title="${d.pomodora} pomodor"></div>
      </div>
      <div class="graf-popisek${d.jeDnes ? ' dnes' : ''}">${d.pismeno}</div>
    </div>`).join('');

  renderNalada();
  renderOdznaky();
  renderUzaverkaInfo();
  renderNastaveni();
}

// ============================================================
// Hlavička a motiv
// ============================================================

function renderHlavicku() {
  document.getElementById('body-chip').textContent = `🏆 ${stav.body} b`;
  document.getElementById('motiv-btn').textContent = stav.motiv === 'dark' ? '☀️' : '🌙';
  document.documentElement.dataset.motiv = stav.motiv;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = stav.motiv === 'dark' ? '#0f1117' : '#f2f3f8';
}

function renderVse() {
  renderHlavicku();
  renderUkoly();
  renderKalendar();
  renderCasovac();
  renderNavyky();
  renderPrehled();
}

// ============================================================
// Swipe gesta na úkolech (doprava = splnit, doleva = smazat)
// ============================================================

function nastavSwipe() {
  const main = document.querySelector('main');

  main.addEventListener('touchstart', e => {
    const radek = e.target.closest('.ukol');
    if (!radek || e.touches.length !== 1) {
      swipe = null;
      return;
    }
    swipe = {
      el: radek,
      id: radek.dataset.id,
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      dx: 0,
      tazeni: false,
    };
  }, { passive: true });

  main.addEventListener('touchmove', e => {
    if (!swipe) return;
    const dx = e.touches[0].clientX - swipe.x;
    const dy = e.touches[0].clientY - swipe.y;
    if (!swipe.tazeni) {
      if (Math.abs(dy) > Math.abs(dx)) { swipe = null; return; } // svislé = skrolování
      if (Math.abs(dx) < 12) return;
      swipe.tazeni = true;
      swipe.el.classList.add('swipuje');
    }
    e.preventDefault();
    swipe.dx = dx;
    swipe.el.style.transform = `translateX(${dx}px)`;
    swipe.el.classList.toggle('swipe-vpravo', dx > 40);
    swipe.el.classList.toggle('swipe-vlevo', dx < -40);
  }, { passive: false });

  const konecSwipu = () => {
    if (!swipe) return;
    const { el, id, dx, tazeni } = swipe;
    swipe = null;
    el.classList.remove('swipuje', 'swipe-vpravo', 'swipe-vlevo');
    el.style.transform = '';
    if (!tazeni) return;
    if (dx > 80) prepniHotovo(id);
    else if (dx < -80) smazUkol(id);
  };
  main.addEventListener('touchend', konecSwipu);
  main.addEventListener('touchcancel', konecSwipu);
}

// ============================================================
// Události
// ============================================================

function nastavUdalosti() {
  nastavSwipe();

  // Sbalená sekce splněných z minulých dní
  document.getElementById('splnene-toggle').addEventListener('click', () => {
    rozbalenoSplnene = !rozbalenoSplnene;
    renderUkoly();
  });

  // Po návratu do aplikace obnovit zámek displeje, pokud časovač běží
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && stav.casovac.bezi) poridWakeLock();
  });

  // Přepínání sekcí spodní lištou
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('aktivni'));
      btn.classList.add('aktivni');
      document.querySelectorAll('.sekce').forEach(s => s.classList.remove('aktivni'));
      document.getElementById('sekce-' + btn.dataset.cil).classList.add('aktivni');
    });
  });

  // Přepnutí motivu
  document.getElementById('motiv-btn').addEventListener('click', () => {
    stav.motiv = stav.motiv === 'dark' ? 'light' : 'dark';
    uloz();
    renderHlavicku();
  });

  // Přepínač seznam/matice
  document.getElementById('pohled-seznam-btn').addEventListener('click', () => {
    stav.pohledUkolu = 'seznam';
    uloz();
    renderUkoly();
  });
  document.getElementById('pohled-matice-btn').addEventListener('click', () => {
    stav.pohledUkolu = 'matice';
    uloz();
    renderUkoly();
  });

  // Přidání úkolu
  const prioritaBtn = document.getElementById('priorita-btn');
  prioritaBtn.addEventListener('click', () => {
    prioritaBtn.setAttribute('aria-pressed', prioritaBtn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  document.getElementById('pridat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('novy-text');
    const text = input.value.trim();
    if (!text) return;
    pridejUkol(
      text,
      prioritaBtn.getAttribute('aria-pressed') === 'true',
      document.getElementById('opakovani-select').value,
      document.getElementById('termin-datum').value,
      document.getElementById('termin-cas').value
    );
    input.value = '';
    prioritaBtn.setAttribute('aria-pressed', 'false');
    document.getElementById('opakovani-select').value = '';
    document.getElementById('termin-datum').value = '';
    document.getElementById('termin-cas').value = '';
    input.focus();
  });

  // Akce na úkolech (odškrtnutí, žába, smazání) – seznam, žába nahoře i matice
  document.querySelector('main').addEventListener('click', e => {
    const akceBtn = e.target.closest('[data-akce]');
    if (!akceBtn) return;
    const polozka = akceBtn.closest('[data-id]');
    if (!polozka) return;
    const id = polozka.dataset.id;
    if (akceBtn.dataset.akce === 'hotovo') prepniHotovo(id);
    if (akceBtn.dataset.akce === 'zaba') prepniZabu(id);
    if (akceBtn.dataset.akce === 'smazat') smazUkol(id);
  });

  // Kalendář
  document.getElementById('kal-pred-btn').addEventListener('click', () => {
    zobrazenyMesic.setMonth(zobrazenyMesic.getMonth() - 1);
    renderKalendar();
  });
  document.getElementById('kal-dalsi-btn').addEventListener('click', () => {
    zobrazenyMesic.setMonth(zobrazenyMesic.getMonth() + 1);
    renderKalendar();
  });
  document.getElementById('kal-mrizka').addEventListener('click', e => {
    const den = e.target.closest('.kal-den[data-datum]');
    if (!den) return;
    vybranyDen = den.dataset.datum;
    renderKalendar();
  });
  document.getElementById('blok-form').addEventListener('submit', e => {
    e.preventDefault();
    const od = document.getElementById('blok-od').value;
    const doCasu = document.getElementById('blok-do').value;
    const text = document.getElementById('blok-text').value.trim();
    if (!od || !doCasu || !text) return;
    if (pridejBlok(od, doCasu, text)) {
      document.getElementById('blok-text').value = '';
    }
  });
  document.getElementById('den-bloky').addEventListener('click', e => {
    const btn = e.target.closest('.blok-smazat');
    if (!btn) return;
    stav.bloky = stav.bloky.filter(b => b.id !== btn.dataset.id);
    uloz();
    renderKalendar();
  });

  // Návyky
  document.getElementById('navyk-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('navyk-text');
    const nazev = input.value.trim();
    if (!nazev) return;
    stav.navyky.push({ id: novyId(), nazev, vytvoreno: Date.now() });
    input.value = '';
    uloz();
    renderNavyky();
  });
  document.getElementById('navyky-seznam').addEventListener('click', e => {
    const bunka = e.target.closest('.navyk-bunka');
    if (bunka) {
      prepniNavyk(bunka.dataset.navyk, bunka.dataset.datum);
      return;
    }
    const smazat = e.target.closest('.navyk-smazat');
    if (smazat) {
      if (!confirm('Opravdu smazat tento návyk i jeho historii?')) return;
      stav.navyky = stav.navyky.filter(n => n.id !== smazat.dataset.id);
      delete stav.navykZaznamy[smazat.dataset.id];
      uloz();
      renderNavyky();
    }
  });

  // Časovač
  document.querySelectorAll('.rezim-btn').forEach(btn => {
    btn.addEventListener('click', () => nastavRezim(btn.dataset.rezim));
  });
  document.getElementById('vlastni-min').addEventListener('change', () => {
    if (stav.casovac.rezim === 'vlastni' && !stav.casovac.bezi) nastavRezim('vlastni');
  });
  document.getElementById('start-btn').addEventListener('click', startPauza);
  document.getElementById('reset-btn').addEventListener('click', resetCasovace);

  // Nálada (v přehledu)
  document.getElementById('nalada-tlacitka').addEventListener('click', e => {
    const btn = e.target.closest('button[data-nalada]');
    if (btn) nastavNaladu(Number(btn.dataset.nalada));
  });
  // Nálada (v uzávěrce)
  document.getElementById('uzaverka-nalada').addEventListener('click', e => {
    const btn = e.target.closest('button[data-nalada]');
    if (btn) nastavNaladu(Number(btn.dataset.nalada));
  });

  // Fokus režim
  document.getElementById('fokus-btn').addEventListener('click', otevriFokus);
  document.getElementById('fokus-zavrit-btn').addEventListener('click', () => {
    document.getElementById('fokus-overlay').hidden = true;
  });
  document.getElementById('fokus-hotovo-btn').addEventListener('click', fokusHotovo);
  document.getElementById('fokus-dalsi-btn').addEventListener('click', () => {
    fokusPoradi++;
    renderFokus();
  });

  // Večerní uzávěrka
  document.getElementById('uzaverka-btn').addEventListener('click', otevriUzaverku);
  document.getElementById('uzaverka-zavrit-btn').addEventListener('click', () => {
    document.getElementById('uzaverka-modal').hidden = true;
  });
  document.getElementById('uzaverka-ulozit-btn').addEventListener('click', ulozUzaverku);

  // Notifikace
  document.getElementById('notifikace-btn').addEventListener('click', prepniNotifikace);
}

// ============================================================
// Start aplikace
// ============================================================

function start() {
  nacti();
  denniReset();

  // Pokud časovač doběhl, zatímco byla aplikace zavřená
  const c = stav.casovac;
  if (c.bezi && c.konecV) {
    const zbyva = Math.round((c.konecV - Date.now()) / 1000);
    if (zbyva <= 0) {
      c.zbyva = 0;
      casovacDobehl();
    } else {
      c.zbyva = zbyva;
    }
  }

  uloz();
  nastavUdalosti();
  renderVse();
  setInterval(tikni, 250);
  zkontrolujPripominky();
  setInterval(zkontrolujPripominky, 30000);

  // Service worker – díky němu aplikace funguje offline a přijímá push notifikace
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => {
        // obnovit push odběr (mohl se v prohlížeči změnit)
        if (stav.nastaveni.notifikace && Notification.permission === 'granted') prihlasKPushum();
      })
      .catch(() => { /* offline režim nebude, aplikace ale funguje dál */ });
  }

  // Časovač možná běží z minula – obnovit zámek displeje
  if (stav.casovac.bezi) poridWakeLock();
}

start();
