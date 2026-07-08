'use strict';

// ============================================================
// Produktivita – Fáze 1
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

// ----- Výchozí stav aplikace -----
let stav = {
  ukoly: [],           // {id, text, priorita, opakovani(''|'denne'|'tydne'), hotovo, hotovoDatum, ziskaneBody, vytvoreno}
  zaba: null,          // {ukolId, datum}
  body: 0,
  historie: {},        // 'YYYY-MM-DD' -> {splneno, pomodora}
  pochvalyZasoba: [],  // zamíchané indexy pochval, aby se neopakovaly
  motiv: 'dark',
  casovac: { rezim: 'fokus', trvani: 25 * 60, zbyva: 25 * 60, konecV: null, bezi: false },
};

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

function dniMezi(datumA, datumB) {
  const a = new Date(datumA + 'T00:00:00');
  const b = new Date(datumB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      const nacteny = JSON.parse(data);
      stav = Object.assign(stav, nacteny);
      // pojistka, kdyby v uložených datech chyběl časovač
      if (!stav.casovac) stav.casovac = { rezim: 'fokus', trvani: 25 * 60, zbyva: 25 * 60, konecV: null, bezi: false };
    }
  } catch (e) {
    console.error('Nepodařilo se načíst data:', e);
  }
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

let toastCasovac = null;

function ukazToast(text, podtext) {
  const el = document.getElementById('toast');
  el.innerHTML = esc(text) + (podtext ? `<span class="toast-body">${esc(podtext)}</span>` : '');
  el.classList.add('zobrazit');
  clearTimeout(toastCasovac);
  toastCasovac = setTimeout(() => el.classList.remove('zobrazit'), 3000);
}

// ============================================================
// Úrovně a body
// ============================================================

function aktualniUroven() {
  let i = 0;
  while (i + 1 < UROVNE.length && stav.body >= UROVNE[i + 1].body) i++;
  return i; // index v poli UROVNE
}

// ============================================================
// Úkoly
// ============================================================

function pridejUkol(text, priorita, opakovani) {
  stav.ukoly.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text,
    priorita,
    opakovani,
    hotovo: false,
    hotovoDatum: null,
    ziskaneBody: 0,
    vytvoreno: Date.now(),
  });
  uloz();
  renderVse();
}

function prepniHotovo(id) {
  const u = najdiUkol(id);
  if (!u) return;

  if (!u.hotovo) {
    // Splnění úkolu
    u.hotovo = true;
    u.hotovoDatum = dnes();
    let ziskane = BODY_BEZNY;
    if (u.priorita) ziskane = BODY_PRIORITA;
    if (jeZaba(u.id)) ziskane = BODY_ZABA;
    u.ziskaneBody = ziskane;

    const urovenPred = aktualniUroven();
    stav.body += ziskane;
    denniZaznam(dnes()).splneno++;

    if (aktualniUroven() > urovenPred) {
      ukazToast(`🎉 Nová úroveň: ${UROVNE[aktualniUroven()].nazev}!`, `+${ziskane} bodů`);
    } else {
      ukazToast(dalsiPochvala(), `+${ziskane} bodů`);
    }
  } else {
    // Odškrtnutí zpět – body i statistika se vrátí
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
  if (!confirm('Opravdu smazat tento úkol?')) return;
  stav.ukoly = stav.ukoly.filter(u => u.id !== id);
  if (stav.zaba && stav.zaba.ukolId === id) stav.zaba = null;
  uloz();
  renderVse();
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

function ukolHTML(u, vZabaBoxu) {
  const stitky = [];
  if (u.priorita) stitky.push('<span class="stitek stitek-priorita">⭐ priorita</span>');
  if (u.opakovani === 'denne') stitky.push('<span class="stitek">🔁 denně</span>');
  if (u.opakovani === 'tydne') stitky.push('<span class="stitek">🔁 týdně</span>');

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

  // Ostatní úkoly: nesplněné (priorita první), pak splněné
  const ostatni = stav.ukoly.filter(u => !zabaUkol || u.id !== zabaUkol.id);
  ostatni.sort((a, b) => {
    if (a.hotovo !== b.hotovo) return a.hotovo ? 1 : -1;
    if (a.priorita !== b.priorita) return a.priorita ? -1 : 1;
    return a.vytvoreno - b.vytvoreno;
  });

  seznam.innerHTML = ostatni.map(u => ukolHTML(u, false)).join('');
  prazdny.hidden = stav.ukoly.length > 0;
}

// ============================================================
// Časovač + Pomodoro
// ============================================================

const REZIMY = { fokus: 25 * 60, pauza: 5 * 60 };

function nastavRezim(rezim) {
  const c = stav.casovac;
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
  } else {
    if (c.zbyva <= 0) c.zbyva = c.trvani;
    c.konecV = Date.now() + c.zbyva * 1000;
    c.bezi = true;
  }
  uloz();
  renderCasovac();
}

function resetCasovace() {
  const c = stav.casovac;
  c.bezi = false;
  c.konecV = null;
  c.zbyva = c.trvani;
  uloz();
  renderCasovac();
}

function casovacDobehl() {
  const c = stav.casovac;
  c.bezi = false;
  c.konecV = null;

  zapipej();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  if (c.rezim === 'fokus') {
    denniZaznam(dnes()).pomodora++;
    ukazToast('🍅 Pomodoro hotovo! Dej si zaslouženou pauzu.');
    c.rezim = 'pauza';
    c.trvani = REZIMY.pauza;
  } else if (c.rezim === 'pauza') {
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
  const c = stav.casovac;
  if (!c.bezi) return;
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
// Streak a přehled
// ============================================================

function spocitejStreak() {
  let d = new Date();
  const dnesniZaznam = stav.historie[datumStr(d)];
  // Dnešek se počítá, jen pokud už jsou 3 úkoly splněné.
  // Jinak streak nezaniká – začne se počítat od včerejška.
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

  // Graf posledních 7 dní
  const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const dny = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const z = stav.historie[datumStr(d)];
    dny.push({ pismeno: DNY[d.getDay()], splneno: z ? z.splneno : 0, jeDnes: i === 0 });
  }
  const max = Math.max(3, ...dny.map(d => d.splneno));
  document.getElementById('tydenni-graf').innerHTML = dny.map(d => `
    <div class="graf-den">
      <div class="graf-sloupec${d.splneno >= 3 ? ' splneno' : ''}" style="height:${Math.max(4, (d.splneno / max) * 100)}%" title="${d.splneno} úkolů"></div>
      <div class="graf-popisek${d.jeDnes ? ' dnes' : ''}">${d.pismeno}</div>
    </div>`).join('');
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
  renderCasovac();
  renderPrehled();
}

// ============================================================
// Události
// ============================================================

function nastavUdalosti() {
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
    pridejUkol(text, prioritaBtn.getAttribute('aria-pressed') === 'true', document.getElementById('opakovani-select').value);
    input.value = '';
    prioritaBtn.setAttribute('aria-pressed', 'false');
    document.getElementById('opakovani-select').value = '';
    input.focus();
  });

  // Akce na úkolech (odškrtnutí, žába, smazání) – funguje i pro žábu nahoře
  document.querySelector('main').addEventListener('click', e => {
    const akceBtn = e.target.closest('[data-akce]');
    if (!akceBtn) return;
    const polozka = akceBtn.closest('.ukol');
    if (!polozka) return;
    const id = polozka.dataset.id;
    if (akceBtn.dataset.akce === 'hotovo') prepniHotovo(id);
    if (akceBtn.dataset.akce === 'zaba') prepniZabu(id);
    if (akceBtn.dataset.akce === 'smazat') smazUkol(id);
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

  // Service worker – díky němu aplikace funguje offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline režim nebude, aplikace ale funguje dál */ });
  }
}

start();
