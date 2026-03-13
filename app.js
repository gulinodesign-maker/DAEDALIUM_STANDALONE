
// --- Icon palette (launcher icons) ---
const ICON_PALETTE_ALT = [
  "#FF7A1A", // arancio vivo
  "#0B1F3A", // blu notte
  "#43B5FF", // azzurro cielo
  "#A79C91", // tortora medio
  "#123E7A", // blu profondo
  "#FFB36B", // arancio morbido
  "#A9DCFF", // azzurro chiaro
  "#D8D0C7"  // tortora chiaro
];

function _hashStr(str){
  let h = 2166136261;
  for (let i=0;i<str.length;i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function applyIconPalette(){
  try{
    const HOME_ICON_COLORS = {
      goOspite: "#0B1F3A",
      goCalendario: "#245EA8",
      openLauncher: "#67BDEB",
      goTassaSoggiorno: "#9DD8F7",
      goPulizie: "#F29C50",
      goLavanderia: "#F6B67A",
      goOrePuliziaHome: "#C7B198",
      goStatistiche: "#D9CCC0",
      goProdotti: "#AFC9D8",
      goDbImport: "#67BDEB",
      goDbExport: "#245EA8"
    };
    const statsIconColors = {
      goStatGen: "#245EA8",
      goStatMensili: "#4D9CC5",
      goStatSpese: "#F29C50",
      goStatPrenotazioni: "#F6B67A",
      goStatPiscina: "#C7B198",
      goStatCancellazioni: "#D9CCC0"
    };
    document.querySelectorAll('#page-home .home-main').forEach((btn) => {
      const c = HOME_ICON_COLORS[btn.id] || "#4D9CC5";
      btn.style.setProperty('--ico-color', c);
      const svg = btn.querySelector('svg.ui-ico');
      if (svg){
        svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse').forEach((node) => {
          node.style.stroke = 'currentColor';
          node.style.fill = 'none';
        });
      }
    });
    document.querySelectorAll('#page-statistiche .home-main').forEach((btn) => {
      const c = statsIconColors[btn.id] || "#4D9CC5";
      btn.style.setProperty('--ico-color', c);
    });
  }catch(_){ }
}


// dDAE_1.020 — iOS BFCache: rebind tappable Home icons
try{
  window.addEventListener("pageshow", () => { try{ bindHomeStrongTap(); }catch(_){ } }, { passive:true });
}catch(_){ }
/* global API_BASE_URL, API_KEY */

/**
 * Build: 2.167
 */
const BUILD_VERSION = "2.191";

// Local DB keys (local-first)
const __DB_KEYS__ = {
  admin: "dDAE_local_admin_db",
  operator: "dDAE_local_operator_db"
};


// ===== Modalità LOCALE (IndexedDB) — build offline =====
const __LOCAL_MODE__ = true;
// Versione schema export/import (incrementare solo se cambia il formato datasets)
const __LOCAL_SCHEMA_VERSION__ = 1;

// IndexedDB: un unico store key-value con snapshot per tabella
const __IDB_NAME__ = "dDAE_LOCAL_DB_v1";
const __IDB_VER__ = 1;
const __IDB_STORE__ = "kv";

const __ALL_TABLES__ = [
  "utenti",
  "impostazioni",
  "ospiti",
  "stanze",
  "servizi",
  "spese",
  "pulizie",
  "lavanderia",
  "operatori",
  "motivazioni",
  "colazione",
  "prodotti_pulizia",
  "ospiti_eliminati"
];

// Dataset Amministratore (completo)
const __ADMIN_TABLES__ = __ALL_TABLES__.slice();

// Dataset Operatore (subset)
const __OP_TABLES__ = [
  "utenti",
  "impostazioni",
  "ospiti",
  "stanze",
  "servizi",
  "pulizie",
  "lavanderia",
  "operatori",
  "colazione",
  "prodotti_pulizia",
];

const __idbState = { p: null };

function __idbOpen__(){
  if (__idbState.p) return __idbState.p;
  __idbState.p = new Promise((resolve, reject) => {
    try{
      const req = indexedDB.open(__IDB_NAME__, __IDB_VER__);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(__IDB_STORE__)){
          db.createObjectStore(__IDB_STORE__, { keyPath: "k" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB error"));
    }catch(e){ reject(e); }
  });
  return __idbState.p;
}

async function __kvGet__(k){
  try{
    const db = await __idbOpen__();
    return await new Promise((resolve) => {
      try{
        const tx = db.transaction(__IDB_STORE__, "readonly");
        const st = tx.objectStore(__IDB_STORE__);
        const rq = st.get(k);
        rq.onsuccess = () => resolve(rq.result ? rq.result.v : null);
        rq.onerror = () => resolve(null);
      }catch(_){ resolve(null); }
    });
  }catch(_){ return null; }
}

async function __kvSet__(k, v){
  try{
    const db = await __idbOpen__();
    return await new Promise((resolve) => {
      try{
        const tx = db.transaction(__IDB_STORE__, "readwrite");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.objectStore(__IDB_STORE__).put({ k, v });
      }catch(_){ resolve(false); }
    });
  }catch(_){ return false; }
}

async function __kvDel__(k){
  try{
    const db = await __idbOpen__();
    return await new Promise((resolve) => {
      try{
        const tx = db.transaction(__IDB_STORE__, "readwrite");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.objectStore(__IDB_STORE__).delete(k);
      }catch(_){ resolve(false); }
    });
  }catch(_){ return false; }
}

function __tblKey__(name){
  // "utenti" deve essere globale sul dispositivo (serve per login dopo logout)
  try{ if (String(name||"").trim().toLowerCase() === "utenti") return `global:tbl:utenti`; }catch(_){ }
  return `ctx:${__ctxUid__()}:${__ctxYear__()}:tbl:${name}`;
}

async function __tblGet__(name, fallback){
  const v = await __kvGet__(__tblKey__(name));
  if (v === null || v === undefined) return fallback;
  return v;
}

async function __tblSet__(name, data){
  return __kvSet__(__tblKey__(name), data);
}

async function __tblDel__(name){
  return __kvDel__(__tblKey__(name));
}

function __nowIso__(){ return new Date().toISOString(); }

function __normIsoDate__(s){
  const v0 = String(s || "").trim();
  if (!v0) return "";

  // accetta YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v0)) return v0;

  // accetta DD/MM/YYYY o DD-MM-YYYY
  let m = v0.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m){
    const dd = String(m[1]).padStart(2,"0");
    const mm = String(m[2]).padStart(2,"0");
    const yy = String(m[3]);
    return `${yy}-${mm}-${dd}`;
  }

  // seriale Excel (giorni) -> YYYY-MM-DD (soglia: > 20000 ~ 1954)
  if (/^\d+(\.\d+)?$/.test(v0)){
    const n = Number(v0);
    if (isFinite(n) && n > 20000 && n < 90000){
      try{
        // Excel day 0: 1899-12-30 (compatibile con Sheets)
        const base = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(base.getTime() + Math.round(n)*24*3600*1000);
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth()+1).padStart(2,"0");
        const da = String(d.getUTCDate()).padStart(2,"0");
        return `${y}-${mo}-${da}`;
      }catch(_){}
    }
  }

  // fallback: prova parse
  try{
    const d = new Date(v0);
    if (!isNaN(d.getTime())){
      const y = d.getFullYear();
      const m2 = String(d.getMonth()+1).padStart(2,"0");
      const da = String(d.getDate()).padStart(2,"0");
      return `${y}-${m2}-${da}`;
    }
  }catch(_){}
  return v0;
}

// =========================
// Spese: data di riferimento = quella mostrata nella card (dataSpesa || data || data_spesa)
// =========================
function __spesaCardDateISO__(row){
  try{
    return __normIsoDate__((row && (row.dataSpesa || row.data || row.data_spesa)) || "");
  }catch(_){
    return "";
  }
}
function __filterSpeseByCardDateRange__(rows, fromISO, toISO){
  const list = Array.isArray(rows) ? rows : [];
  const from = __normIsoDate__(fromISO);
  const to = __normIsoDate__(toISO);
  if (!from || !to) return list.slice();
  return list.filter((r)=>{
    const d = __spesaCardDateISO__(r);
    if (!d) return false;
    return d >= from && d <= to;
  });
}



function __dateInRange__(d, from, to){
  if (!d) return true;
  const x = __normIsoDate__(d);
  const a = from ? __normIsoDate__(from) : "";
  const b = to ? __normIsoDate__(to) : "";
  if (a && x < a) return false;
  if (b && x > b) return false;
  return true;
}

function __overlapRange__(start, end, from, to){
  const s = __normIsoDate__(start);
  const e = __normIsoDate__(end);
  const a = from ? __normIsoDate__(from) : "";
  const b = to ? __normIsoDate__(to) : "";
  if (!a && !b) return true;
  // overlap: e >= a && s <= b (se mancano, considera aperti)
  if (a && e && e < a) return false;
  if (b && s && s > b) return false;
  return true;
}

function __normBool01(v){
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v ?? "").trim().toLowerCase();
  return (s === "1" || s === "true" || s === "yes" || s === "y");
}

async function __localApiUtenti__(method, body){
  const op = String(body?.op || "").trim();
  const rows0 = await __tblGet__("utenti", []);
  const rows = Array.isArray(rows0) ? rows0 : [];

  const findUser = (username) => {
    const u = String(username || "").trim();
    return rows.find(r => String(r?.username || r?.user || "").trim() === u) || null;
  };

  const saveAll = async () => { await __tblSet__("utenti", rows); return true; };

  const okLogin = (u) => {
    const user_id = String(u?.id || u?.user_id || u?.userId || "").trim() || String(u?.username || "").trim();
    const ruolo = String(u?.ruolo || u?.role || "").trim() || (String(u?.isOperatore||"")==="1" ? "operatore" : "amministratore");
    return {
      user_id,
      username: String(u?.username || "").trim(),
      ruolo
    };
  };

  if (method === "POST" && op === "login"){
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const u = findUser(username);
    if (!u) throw new Error("Credenziali non valide");
    if (String(u?.password || "").trim() !== password) throw new Error("Credenziali non valide");
    return { user: okLogin(u) };
  }

  if (method === "POST" && op === "create"){
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const roleIn = String(body?.role || body?.ruolo || "").trim().toLowerCase();
    const ruolo = (roleIn.startsWith("op")) ? "operatore" : "admin";
    if (!username || !password) throw new Error("Username e password obbligatori");
    if (findUser(username)) throw new Error("Username già esistente");
    const u = {
      id: String(body?.id || "") || (typeof genId === "function" ? genId("u") : ("u-"+Date.now())),
      username,
      password,
      ruolo,
      createdAt: __nowIso__(),
      updatedAt: __nowIso__(),
    };
    rows.push(u);
    await saveAll();
    return { user: okLogin(u) };
  }

  if (method === "POST" && op === "update"){
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const u = findUser(username);
    if (!u) throw new Error("Account non trovato");
    if (String(u?.password || "").trim() !== password) throw new Error("Credenziali non valide");
    const newPassword = String(body?.newPassword || "").trim();
    if (newPassword) u.password = newPassword;
    u.updatedAt = __nowIso__();
    await saveAll();
    return { user: okLogin(u) };
  }

  if (method === "POST" && op === "delete"){
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const u = findUser(username);
    if (!u) throw new Error("Account non trovato");
    if (String(u?.password || "").trim() !== password) throw new Error("Credenziali non valide");
    // elimina anche operatori legati (tenant__*) se l'utente è owner/admin? qui: elimina solo quell'account
    const idx = rows.indexOf(u);
    if (idx >= 0) rows.splice(idx, 1);
    await saveAll();
    return { ok: true };
  }

  if (method === "POST" && op === "create_operator"){
    const ownerUsername = String(body?.username || "").trim();
    const ownerPassword = String(body?.password || "").trim();
    const owner = findUser(ownerUsername);
    if (!owner) throw new Error("Owner non trovato");
    if (String(owner?.password || "").trim() !== ownerPassword) throw new Error("Credenziali non valide");
    if (String(owner?.ruolo || "").toLowerCase().includes("oper")) throw new Error("Owner non valido");

    const operator_username = String(body?.operator_username || "").trim();
    const operator_password = String(body?.operator_password || "").trim();
    if (!operator_username || !operator_password) throw new Error("Credenziali operatore mancanti");
    if (findUser(operator_username)) throw new Error("Operatore già esistente");

    const u = {
      id: (typeof genId === "function" ? genId("op") : ("op-"+Date.now())),
      username: operator_username,
      password: operator_password,
      ruolo: "operatore",
      createdAt: __nowIso__(),
      updatedAt: __nowIso__(),
    };
    rows.push(u);
    await saveAll();
    return { ok: true };
  }

  if (method === "POST" && op === "update_operator"){
    const ownerUsername = String(body?.username || "").trim();
    const ownerPassword = String(body?.password || "").trim();
    const owner = findUser(ownerUsername);
    if (!owner) throw new Error("Owner non trovato");
    if (String(owner?.password || "").trim() !== ownerPassword) throw new Error("Credenziali non valide");

    const operator_username = String(body?.operator_username || "").trim();
    const newPassword = String(body?.newPassword || "").trim();
    const u = findUser(operator_username);
    if (!u) throw new Error("Operatore non trovato");
    if (!String(u?.ruolo || "").toLowerCase().includes("oper")) throw new Error("Account non è operatore");
    if (!newPassword) throw new Error("Nuova password mancante");
    u.password = newPassword;
    u.updatedAt = __nowIso__();
    await saveAll();
    return { ok: true };
  }

  if (method === "POST" && op === "delete_operator"){
    const ownerUsername = String(body?.username || "").trim();
    const ownerPassword = String(body?.password || "").trim();
    const owner = findUser(ownerUsername);
    if (!owner) throw new Error("Owner non trovato");
    if (String(owner?.password || "").trim() !== ownerPassword) throw new Error("Credenziali non valide");

    const operator_username = String(body?.operator_username || "").trim();
    const u = findUser(operator_username);
    if (!u) throw new Error("Operatore non trovato");
    if (!String(u?.ruolo || "").toLowerCase().includes("oper")) throw new Error("Account non è operatore");
    const idx = rows.indexOf(u);
    if (idx >= 0) rows.splice(idx, 1);
    await saveAll();
    return { ok: true };
  }

  // fallback: restituisce lista utenti (usata in alcune viste)
  return rows;
}

async function __localApiImpostazioni__(method, body){
  const rows0 = await __tblGet__("impostazioni", []);
  let rows = Array.isArray(rows0) ? rows0 : [];

  if (method === "GET"){
    return { rows };
  }

  if (method === "POST"){
    const now = __nowIso__();
    const upsert = (nextRow) => {
      const key = String(nextRow?.key || "").trim().toLowerCase();
      if (!key) return;
      const idx = rows.findIndex(r => String(r?.key || r?.Key || "").trim().toLowerCase() === key);
      const prev = idx >= 0 ? rows[idx] : null;
      const merged = Object.assign({}, prev || {}, nextRow || {});
      merged.key = nextRow.key;
      merged.createdAt = prev?.createdAt || nextRow.createdAt || now;
      merged.updatedAt = now;
      if (idx >= 0) rows[idx] = merged;
      else rows.push(merged);
    };

    try{
      if (Array.isArray(body?.operatori)){
        const ops = body.operatori;
        upsert({
          key: "operatori",
          operatore_1: String(ops[0] || "").trim(),
          operatore_2: String(ops[1] || "").trim(),
          operatore_3: String(ops[2] || "").trim(),
          createdAt: now,
        });
      }
    }catch(_){}

    const numKeys = ["tariffa_oraria","costo_benzina","tassa_soggiorno","tassa_soggiorno_max_notti","numero_stanze"];
    numKeys.forEach((k)=>{
      if (!body || body[k] === undefined) return;
      upsert({ key:k, value: String(body[k] ?? "").trim(), createdAt: now });
    });

    if (body && body.operatori_catalogo !== undefined){
      const raw = typeof body.operatori_catalogo === "string"
        ? body.operatori_catalogo
        : JSON.stringify(body.operatori_catalogo ?? []);
      upsert({ key:"operatori_catalogo", value: raw, createdAt: now });
    }

    if (body && body.channel_catalogo !== undefined){
      const raw = typeof body.channel_catalogo === "string"
        ? body.channel_catalogo
        : JSON.stringify(body.channel_catalogo ?? []);
      upsert({ key:"channel_catalogo", value: raw, createdAt: now });
    }

    if (body && body.laundry_catalogo !== undefined){
      const raw = typeof body.laundry_catalogo === "string"
        ? body.laundry_catalogo
        : JSON.stringify(body.laundry_catalogo ?? []);
      upsert({ key:"laundry_catalogo", value: raw, createdAt: now });
    }

    if (body && body.laundry_prices !== undefined){
      const raw = typeof body.laundry_prices === "string"
        ? body.laundry_prices
        : JSON.stringify(body.laundry_prices ?? {});
      upsert({ key:"laundry_prices", value: raw, createdAt: now });
    }

    await __tblSet__("impostazioni", rows);
    return { rows };
  }

  return { rows };
}

async function __localApiSpesaList__(tableName, method, body){
  const tName = String(tableName || "").trim() || "colazione";
  const rows0 = await __tblGet__(tName, []);
  const rows = Array.isArray(rows0) ? rows0 : [];

  const save = async ()=>{ await __tblSet__(tName, rows); };

  if (method === "GET"){
    return rows;
  }

  if (method === "PUT"){
    const id = String(body?.id || "").trim();
    const it = rows.find(r => String(r?.id||"").trim() === id);
    if (!it) return { ok:true };
    Object.keys(body||{}).forEach((k)=>{
      if (k === "id") return;
      it[k] = body[k];
    });
    it.updatedAt = __nowIso__();
    await save();
    return { ok:true };
  }

  if (method === "POST"){
    const op = String(body?.op || "").trim();
    if (op === "create"){
      const prodotto = String(body?.prodotto || "").trim().toUpperCase();
      if (!prodotto) throw new Error("Prodotto mancante");
      const exist = rows.find(r => String(r?.prodotto||"").trim().toUpperCase() === prodotto && !__normBool01(r?.isDeleted));
      if (exist) return { ok:true };
      const prefix = (tName === "prodotti_pulizia") ? "p" : "c";
      rows.push({
        id: (typeof genId === "function" ? genId(prefix) : (prefix+"-"+Date.now())),
        prodotto,
        qty: 0,
        saved: 0,
        checked: 0,
        isDeleted: 0,
        createdAt: __nowIso__(),
        updatedAt: __nowIso__(),
      });
      await save();
      return { ok:true };
    }
    if (op === "resetQty"){
      rows.forEach(r => { if (!__normBool01(r?.isDeleted)) { r.qty = 0; r.saved = 0; r.checked = 0; r.updatedAt = __nowIso__(); } });
      await save();
      return { ok:true };
    }
    if (op === "save"){
      rows.forEach(r => { if (!__normBool01(r?.isDeleted)) { const q = parseInt(String(r.qty||0),10); r.saved = (isNaN(q)?0:(q>0?1:0)); r.updatedAt = __nowIso__(); } });
      await save();
      return { ok:true };
    }
    return { ok:true };
  }

  return { ok:true };
}

async function __localApiColazione__(method, body){
  return __localApiSpesaList__("colazione", method, body);
}

async function __localApiLavanderia__(method, params, body){
  const list0 = await __tblGet__("lavanderia", []);
  const list = Array.isArray(list0) ? list0 : [];

  const save = async ()=>{ await __tblSet__("lavanderia", list); };

  if (method === "GET"){
    return list;
  }

  if (method === "PUT"){
    const id = String((body && body.id) || (params && params.id) || "").trim();
    if (!id) return { ok:true };
    const now = __nowIso__();
    const idx = list.findIndex(it => String(it?.id||"").trim() === id);
    if (idx < 0) return { ok:true };
    const prev = list[idx] || {};
    const patch = Object.assign({}, body || {});
    delete patch.id;
    list[idx] = Object.assign({}, prev, patch, {
      id: (prev.id || id),
      updatedAt: now,
      createdAt: (prev.createdAt || prev.created_at || now)
    });
    if (__normBool01(list[idx]?.isDeleted ?? list[idx]?.is_deleted ?? list[idx]?.deleted)){
      list[idx].isDeleted = true;
      list[idx].is_deleted = true;
      list[idx].deletedAt = String(list[idx].deletedAt || list[idx].deleted_at || now);
      list[idx].deleted_at = String(list[idx].deleted_at || list[idx].deletedAt || now);
    }
    await save();
    return { ok:true };
  }

  if (method === "DELETE"){
    const id = String((body && body.id) || (params && params.id) || "").trim();
    if (!id) return { ok:true };
    const now = __nowIso__();
    const idx = list.findIndex(it => String(it?.id||"").trim() === id);
    if (idx >= 0){
      try{
        const prev = list[idx] || {};
        list[idx] = Object.assign({}, prev, {
          id: (prev.id || id),
          isDeleted: true,
          is_deleted: true,
          deletedAt: now,
          deleted_at: now,
          updatedAt: now,
          createdAt: (prev.createdAt || prev.created_at || now)
        });
      }catch(_){
        list[idx] = { id, isDeleted: true, is_deleted: true, deletedAt: now, deleted_at: now, createdAt: now, updatedAt: now };
      }
    } else {
      list.push({ id, isDeleted: true, is_deleted: true, deletedAt: now, deleted_at: now, createdAt: now, updatedAt: now });
    }
    await save();
    return { ok:true };
  }


if (method === "POST"){
    const startDate = __normIsoDate__(body?.startDate || body?.start_date || body?.from);
    const endDate = __normIsoDate__(body?.endDate || body?.end_date || body?.to);

    if (!startDate || !endDate) throw new Error("Date mancanti");
    if (startDate > endDate) throw new Error("Intervallo non valido");

    // Aggrega da pulizie
    const pul0 = await __tblGet__("pulizie", []);
    const pul = Array.isArray(pul0) ? pul0 : [];
    const cols = getLaundryComponentCodes();
    // Recupera l'elenco delle stanze valide (stanza_num) dalla tabella "stanze" per filtrare
    // eventuali righe con stanza non riconosciuta (es. stanza "7" fantasma).
    let validRooms = null;
    try{
      const stanzeList = await __tblGet__("stanze", []);
      if (Array.isArray(stanzeList)){
        validRooms = new Set();
        stanzeList.forEach((r) => {
          const sn = r?.stanza_num ?? r?.stanzaNum ?? r?.room_number ?? r?.roomNumber ?? r?.stanza ?? r?.room;
          if (sn !== undefined && sn !== null){
            const v = String(sn).trim().toUpperCase();
            if (v) validRooms.add(v);
          }
        });
      }
    }catch(_){ validRooms = null; }

    // Inizializza accumulatori per pezzi e resi.  I resi sono
    // rappresentati nelle pulizie come una riga separata con stanza
    // "RES".  Dobbiamo sommare i valori di tale riga separatamente e
    // non conteggiarli nel totale pagabile.  Inoltre, trattiamo
    // qualsiasi valore negativo come reso.
    const sums = {};
    const resi = {};
    cols.forEach(k => { sums[k] = 0; resi[k] = 0; });

    pul.forEach(r => {
      // Salta le righe eliminate (soft-delete) per evitare conteggi fantasma.
      try{
        const del = __normBool01(r?.isDeleted ?? r?.is_deleted ?? r?.deleted);
        if (del) return;
      }catch(_){ }
      const d = __normIsoDate__(r?.data || r?.date || "");
      if (!d) return;
      if (d < startDate || d > endDate) return;
      const s = String(r?.stanza || r?.room || "").trim().toUpperCase();
      const isResRow = (s === 'RES');
      // Se non è una riga di resi, verifica che la stanza sia valida; altrimenti scarta.
      if (!isResRow && validRooms && validRooms.size > 0){
        if (!validRooms.has(s)) return;
      }
      cols.forEach(k => {
        let n = Number(r?.[k] ?? 0);
        if (!isFinite(n)) return;
        n = Math.floor(n);
        // Se la riga rappresenta i resi o la quantità è negativa,
        // accumula nei resi; altrimenti nei pezzi.
        if (isResRow || n < 0){
          resi[k] += Math.abs(n);
        } else {
          sums[k] += Math.max(0, n);
        }
      });
    });

    const catalog = getLaundryCatalogFromSettings();
    const priceMap = getLaundryPricesFromSettings();
    const laundryPrices = {};
    cols.forEach((k) => {
      const n = Number(priceMap?.[k] || 0) || 0;
      laundryPrices[k] = Math.round(n * 100) / 100;
    });

    const item = {
      id: (typeof genId === "function" ? genId("l") : ("l-"+Date.now())),
      startDate,
      endDate,
      createdAt: __nowIso__(),
      updatedAt: __nowIso__(),
      laundryPrices,
      laundryCatalog: catalog.map((row) => ({
        id: String(row?.id || ''),
        titolo: String(row?.titolo || '').trim(),
        abbreviazione: String(row?.abbreviazione || '').trim(),
        prezzo: Math.round((Number(row?.prezzo || 0) || 0) * 100) / 100,
        colore: __normalizeLaundryColor__(row?.colore || 'blue'),
      })),
    };
    // Copia i pezzi (sums) e i resi nel record.  I resi sono
    // salvati con suffisso "_resi" per ogni colonna.
    cols.forEach(k => {
      item[k] = sums[k] || 0;
      item[`${k}_resi`] = resi[k] || 0;
    });
    // Calcola il costo totale utilizzando solo i pezzi (sums) e non i resi.
    item.totalCost = Math.round(cols.reduce((acc, k) => acc + ((Number(sums[k] || 0) || 0) * (Number(laundryPrices?.[k] || 0) || 0)), 0) * 100) / 100;

    list.push(item);
    await save();
    return item;
  }

  return { ok:true };
}

async function __localApiTable__(action, method, params, body){
  const rows0 = await __tblGet__(action, []);
  let rows = Array.isArray(rows0) ? rows0 : [];

  const save = async ()=>{ await __tblSet__(action, rows); };

  const delById = async (id)=>{
    const x = String(id || "").trim();
    if (!x) return;
    const idx = rows.findIndex(r => String(r?.id || "").trim() === x);
    if (idx >= 0) rows.splice(idx, 1);
    await save();
  };

  if (method === "GET"){
    // filtri comuni
    if (action === "servizi"){
      const gid = String(params?.ospite_id || params?.ospiteId || "").trim();
      if (!gid) return [];
      return rows.filter(r => String(r?.ospite_id ?? r?.ospiteId ?? "").trim() === gid);
    }

    if (action === "ospiti"){
      const from = params?.from || params?.da || "";
      const to = params?.to || params?.a || "";
      return rows.filter(r => __overlapRange__(r?.check_in, r?.check_out, from, to));
    }

    if (action === "ospiti_eliminati"){
      const from = params?.from || params?.da || "";
      const to = params?.to || params?.a || "";
      return rows.filter(r => __dateInRange__(r?.deletedAt || r?.deleted_at || r?.data || "", from, to));
    }

    if (action === "spese"){
      const from = params?.from || "";
      const to = params?.to || "";
      return rows.filter(r => __dateInRange__(r?.dataSpesa || r?.data_spesa || r?.data || "", from, to));
    }

    if (action === "pulizie"){
      const d = __normIsoDate__(params?.data || "");
      if (!d) return rows;
      return rows.filter(r => __normIsoDate__(r?.data || "") === d);
    }

    if (action === "operatori"){
      const d = __normIsoDate__(params?.data || "");
      if (!d) return { rows };
      const dayRows = rows.filter(r => __normIsoDate__(r?.data || "") === d);
      return dayRows;
    }

    return rows;
  }

  // scritture specifiche
  if (action === "motivazioni" && method === "POST"){
    const motivazione = String(body?.motivazione || "").trim();
    if (!motivazione) return { ok:true };
    const key = motivazione.toLowerCase();
    const exist = rows.find(r => String(r?.motivazione||"").trim().toLowerCase() === key);
    if (!exist){
      rows.push({ id: (typeof genId==="function"?genId("m"):("m-"+Date.now())), motivazione, attiva: 1, createdAt: __nowIso__(), updatedAt: __nowIso__() });
      await save();
    }
    return { ok:true };
  }

  if (action === "stanze" && method === "POST"){
    const gid = String(body?.ospite_id || "").trim();
    const list = Array.isArray(body?.stanze) ? body.stanze : [];
    if (!gid) return { ok:true };
    rows = rows.filter(r => String(r?.ospite_id || "").trim() !== gid);
    list.forEach(r => {
      const it = Object.assign({}, r);
      it.id = it.id || (typeof genId==="function"?genId("st"):("st-"+Date.now()+Math.random()));
      it.ospite_id = gid;
      it.createdAt = it.createdAt || __nowIso__();
      it.updatedAt = __nowIso__();
      rows.push(it);
    });
    await __tblSet__("stanze", rows);
    return { ok:true };
  }

  if (action === "servizi" && method === "POST"){
    const gid = String(body?.ospite_id || "").trim();
    const list = Array.isArray(body?.servizi) ? body.servizi : [];
    if (!gid) return { ok:true };
    rows = rows.filter(r => String(r?.ospite_id || "").trim() !== gid);
    list.forEach(r => {
      const it = Object.assign({}, r);
      it.id = it.id || (typeof genId==="function"?genId("sv"):("sv-"+Date.now()+Math.random()));
      it.ospite_id = gid;
      it.createdAt = it.createdAt || __nowIso__();
      it.updatedAt = __nowIso__();
      rows.push(it);
    });
    await __tblSet__("servizi", rows);
    return { ok:true };
  }

  if (action === "pulizie" && method === "POST"){
    const data = __normIsoDate__(body?.data || "");
    const list = Array.isArray(body?.rows) ? body.rows : [];
    if (!data) return { ok:true };
    // upsert per stanza
    const byKey = new Map();
    rows.forEach(r => {
      const k = `${__normIsoDate__(r?.data||"")}|${String(r?.stanza||"").trim()}`;
      byKey.set(k, r);
    });
    list.forEach(r => {
      const stanza = String(r?.stanza || "").trim();
      if (!stanza) return;
      const k = `${data}|${stanza}`;
      const ex = byKey.get(k);
      const it = ex ? ex : {};
      it.id = it.id || (typeof genId==="function"?genId("p"):("p-"+Date.now()+Math.random()));
      it.data = data;
      it.stanza = stanza;
      // copia colonne
      Object.keys(r||{}).forEach((kk)=>{
        if (kk === "id") return;
        it[kk] = r[kk];
      });
      it.updatedAt = __nowIso__();
      if (!it.createdAt) it.createdAt = __nowIso__();
      if (!ex) rows.push(it);
      byKey.set(k, it);
    });
    await __tblSet__("pulizie", rows);
    return { ok:true };
  }

  if (action === "operatori" && method === "POST"){
    const data = __normIsoDate__(body?.data || "");
    const list = Array.isArray(body?.operatori) ? body.operatori : [];
    if (!data) return { ok:true };
    const replaceDay = !!body?.replaceDay;
    if (replaceDay){
      rows = rows.filter(r => __normIsoDate__(r?.data||"") !== data);
    }
    list.forEach(r => {
      const it = Object.assign({}, r);
      it.id = it.id || (typeof genId==="function"?genId("opd"):("opd-"+Date.now()+Math.random()));
      it.data = data;
      it.createdAt = it.createdAt || __nowIso__();
      it.updatedAt = __nowIso__();
      rows.push(it);
    });
    await __tblSet__("operatori", rows);
    return { ok:true };
  }

  if (action === "spese" && method === "POST"){
    const it = Object.assign({}, body || {});
    it.id = it.id || (typeof genId==="function"?genId("s"):("s-"+Date.now()));
    it.createdAt = it.createdAt || __nowIso__();
    it.updatedAt = __nowIso__();
    rows.unshift(it);
    await save();
    return { id: it.id };
  }

  if (action === "spese" && method === "DELETE"){
    await delById(params?.id);
    return { ok:true };
  }

  if (action === "ospiti" && (method === "POST" || method === "PUT")){
    const it = Object.assign({}, body || {});
    it.id = String(it.id || "").trim() || (typeof genId==="function"?genId("o"):("o-"+Date.now()));
    // preserve createdAt if provided
    it.createdAt = it.createdAt || it.created_at || __nowIso__();
    it.created_at = it.createdAt;
    it.updatedAt = __nowIso__();
    it.updated_at = it.updatedAt;

    const idx = rows.findIndex(r => String(r?.id||"").trim() === it.id);
    if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], it);
    else rows.unshift(it);
    await save();
    return { id: it.id };
  }

  if (action === "ospiti" && method === "DELETE"){
    const id = String(params?.id || "").trim();
    if (!id) return { ok:true };
    const idx = rows.findIndex(r => String(r?.id||"").trim() === id);
    if (idx >= 0){
      const removed = rows[idx];
      rows.splice(idx, 1);
      await save();

      // sposta in eliminati
      try{
        const del0 = await __tblGet__("ospiti_eliminati", []);
        const delRows = Array.isArray(del0) ? del0 : [];
        delRows.unshift(Object.assign({}, removed, { deletedAt: __nowIso__(), isDeleted: 1 }));
        await __tblSet__("ospiti_eliminati", delRows);
      }catch(_){}

      // pulisci relazioni
      try{
        const st0 = await __tblGet__("stanze", []);
        const st = Array.isArray(st0) ? st0 : [];
        await __tblSet__("stanze", st.filter(r => String(r?.ospite_id||"").trim() !== id));
      }catch(_){}
      try{
        const sv0 = await __tblGet__("servizi", []);
        const sv = Array.isArray(sv0) ? sv0 : [];
        await __tblSet__("servizi", sv.filter(r => String(r?.ospite_id||"").trim() !== id));
      }catch(_){}
    }
    return { ok:true };
  }

  // fallback generico PUT/DELETE per id
  if (method === "PUT"){
    const id = String(body?.id || "").trim();
    if (!id) return { ok:true };
    const idx = rows.findIndex(r => String(r?.id||"").trim() === id);
    if (idx < 0) return { ok:true };
    rows[idx] = Object.assign({}, rows[idx], body, { updatedAt: __nowIso__() });
    await save();
    return { ok:true };
  }

  if (method === "DELETE"){
    await delById((params && params.id) || (body && body.id));
    return { ok:true };
  }

  if (method === "POST"){
    // append generico
    const it = Object.assign({}, body || {});
    it.id = it.id || (typeof genId==="function"?genId("r"):("r-"+Date.now()+Math.random()));
    it.createdAt = it.createdAt || __nowIso__();
    it.updatedAt = __nowIso__();
    rows.push(it);
    await save();
    return { id: it.id };
  }

  return { ok:true };
}

async function __localApi__(action, { method="GET", params={}, body=null } = {}){
  const m = String(method || "GET").toUpperCase();
  const a = String(action || "").trim();
  if (a === "utenti") return __localApiUtenti__(m, body || {});
  if (a === "impostazioni") return __localApiImpostazioni__(m, body || {});
  if (a === "colazione") return __localApiColazione__(m, body || {});
  if (a === "prodotti_pulizia") return __localApiSpesaList__("prodotti_pulizia", m, body || {});
  if (a === "lavanderia") return __localApiLavanderia__(m, params || {}, body || {});
  return __localApiTable__(a, m, params || {}, body || {});
}

// Import/Export DB (JSON unico) — Admin vs Operatore
/* Legacy localStorage DB Import/Export removed (LOCAL build uses IndexedDB) */

// ================================
// __FIREBASE_SYNC__ (Firestore-only, no Storage)
// Sync Admin <-> Operatori tramite Firebase, attivato SOLO su tap Import/Export.
// Nessun blocco della Home se offline.
// ================================
const __FB_STATE__ = { token:null, exp:0, teamId:null, teamKey:null };

function __fbLoadLink__(){
  try{
    __FB_STATE__.teamId = localStorage.getItem("ddae_fb_teamId") || "";
    __FB_STATE__.teamKey = localStorage.getItem("ddae_fb_teamKey") || "";
  }catch(_){}
}
function __fbSaveLink__(teamId, teamKey){
  try{
    localStorage.setItem("ddae_fb_teamId", String(teamId||""));
    localStorage.setItem("ddae_fb_teamKey", String(teamKey||""));
  }catch(_){}
  __FB_STATE__.teamId = String(teamId||"");
  __FB_STATE__.teamKey = String(teamKey||"");
}

function __randStr__(n){
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i=0;i<n;i++) s += a[(Math.random()*a.length)|0];
  return s;
}
function __qrCodeText__(teamId, teamKey){
  return `DDAE|${teamId}|${teamKey}`;
}
function __parseQr__(txt){
  const s = String(txt||"").trim();
  const m = s.match(/^DDAE\|([^|]+)\|([^|]+)$/i);
  if (!m) return null;
  return { teamId: m[1], teamKey: m[2] };
}

async function __fbGetIdToken__(){
  try{
    if (!FIREBASE_ENABLED || !FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) throw new Error("Firebase non configurato");
    const now = Date.now();
    if (__FB_STATE__.token && __FB_STATE__.exp && now < (__FB_STATE__.exp - 15000)) return __FB_STATE__.token;

    // anonymous signUp (REST)
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`;
    const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ returnSecureToken:true }) });
    if (!res.ok) throw new Error("Auth Firebase fallita");
    const data = await res.json();
    __FB_STATE__.token = data.idToken;
    const sec = parseInt(String(data.expiresIn||"3600"),10);
    __FB_STATE__.exp = Date.now() + (isNaN(sec)?3600:sec)*1000;
    return __FB_STATE__.token;
  }catch(e){
    throw e;
  }
}

function __fsBase__(){
  const pid = FIREBASE_CONFIG.projectId;
  return `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
}
function __fsDocUrl__(path){
  return `${__fsBase__()}/${path}`;
}
function __fsEncode__(obj){
  // only simple string/timestamp/array<string>
  const out = { fields:{} };
  const f = out.fields;
  for (const k of Object.keys(obj||{})){
    const v = obj[k];
    if (v === undefined) continue;
    if (v === null){ f[k] = { nullValue: null }; continue; }
    if (typeof v === "string"){ f[k] = { stringValue: v }; continue; }
    if (typeof v === "number"){ f[k] = { doubleValue: v }; continue; }
    if (typeof v === "boolean"){ f[k] = { booleanValue: v }; continue; }
    if (v && v.__ts){ f[k] = { timestampValue: v.__ts }; continue; }
    if (Array.isArray(v)){
      f[k] = { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } };
      continue;
    }
    // fallback: stringify
    f[k] = { stringValue: JSON.stringify(v) };
  }
  return out;
}
function __fsDecode__(doc){
  try{
    const f = (doc && doc.fields) ? doc.fields : {};
    const out = {};
    for (const k of Object.keys(f)){
      const v = f[k];
      if (v.stringValue !== undefined) out[k] = v.stringValue;
      else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
      else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue,10);
      else if (v.booleanValue !== undefined) out[k] = !!v.booleanValue;
      else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
      else if (v.arrayValue && Array.isArray(v.arrayValue.values)) out[k] = v.arrayValue.values.map(it => it.stringValue);
    }
    return out;
  }catch(_){ return {}; }
}

async function __fsGet__(path){
  const token = await __fbGetIdToken__();
  __syncLedBegin("GET");
  try{
    const res = await fetch(__fsDocUrl__(path), { headers: { "Authorization": `Bearer ${token}` }, cache:"no-store" });
    if (!res.ok) return null;
    return await res.json();
  }finally{
    __syncLedEnd("GET");
  }
}
async function __fsPatch__(path, data){
  const token = await __fbGetIdToken__();
  __syncLedBegin("POST");
  try{
    const res = await fetch(__fsDocUrl__(path) + "?currentDocument.exists=true", {
      method:"PATCH",
      headers:{ "Authorization": `Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify(__fsEncode__(data))
    });
    if (res.ok) return await res.json();
    // if missing, create
    const res2 = await fetch(__fsDocUrl__(path), {
      method:"POST",
      headers:{ "Authorization": `Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify(__fsEncode__(data))
    });
    if (!res2.ok) throw new Error("Scrittura Firebase fallita");
    return await res2.json();
  }finally{
    __syncLedEnd("POST");
  }
}
async function __fsSet__(path, data){
  const token = await __fbGetIdToken__();
  __syncLedBegin("POST");
  try{
    const res = await fetch(__fsDocUrl__(path), {
      method:"PATCH",
      headers:{ "Authorization": `Bearer ${token}`, "Content-Type":"application/json" },
      body: JSON.stringify(__fsEncode__(data))
    });
    if (!res.ok) throw new Error("Scrittura Firebase fallita");
    return await res.json();
  }finally{
    __syncLedEnd("POST");
  }
}

async function __fsList__(collectionPath){
  const token = await __fbGetIdToken__();
  __syncLedBegin("GET");
  try{
    const res = await fetch(__fsBase__() + "/" + collectionPath, { headers:{ "Authorization": `Bearer ${token}` }, cache:"no-store" });
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j.documents) ? j.documents : [];
  }finally{
    __syncLedEnd("GET");
  }
}

async function __ensureAdminTeam__(){
  __fbLoadLink__();
      // QR modal close
      try{
        const qc = document.getElementById("qrClose");
        const qm = document.getElementById("qrModal");
        if (qc && qm) bindFastTap(qc, ()=>{ qm.hidden = true; try{ qm.setAttribute("aria-hidden","true"); }catch(_){} });
      }catch(_){}

  if (__FB_STATE__.teamId && __FB_STATE__.teamKey) return { teamId: __FB_STATE__.teamId, teamKey: __FB_STATE__.teamKey };

  const teamId = "T" + __randStr__(10);
  const teamKey = __randStr__(24);
  __fbSaveLink__(teamId, teamKey);
  return { teamId, teamKey };
}

async function __adminGenerateCode__(){
  // ensure team
  const { teamId, teamKey } = await __ensureAdminTeam__();

  // update team doc (include operator names from impostazioni if available)
  let ops = [];
  try{
    await ensureSettingsLoaded({ force:false, showLoader:false });
    ops = (getOperatorNamesFromSettings ? getOperatorNamesFromSettings() : []).map(x=>String(x||"").trim()).filter(Boolean);
  }catch(_){}

  const nowIso = new Date().toISOString();
  await __fsSet__(`teams/${teamId}`, { key: teamKey, operators: ops, updatedAt: { __ts: nowIso } });

  const code = __qrCodeText__(teamId, teamKey);
  try{ __showQrModal__(code); }catch(_){ alert(code); }
}

function __showQrModal__(code){
  const modal = document.getElementById("qrModal");
  const txt = document.getElementById("qrCodeText");

  if (txt){
    txt.textContent = code;

    // Tap per copiare (iOS-friendly)
    try{
      txt.onclick = async () => {
        try{
          if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(String(code||""));
            try{ toast("Codice copiato", "blue"); }catch(_){}
          }else{
            // fallback: seleziona e copia via execCommand
            const r = document.createRange();
            r.selectNodeContents(txt);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            document.execCommand("copy");
            sel.removeAllRanges();
            try{ toast("Codice copiato", "blue"); }catch(_){}
          }
        }catch(_e){
          try{ toast("Copia non disponibile", "orange"); }catch(_){}
        }
      };
    }catch(_){}
  }

  if (modal){
    modal.hidden = false;
    try{ modal.setAttribute("aria-hidden","false"); }catch(_){}
  }
}

function __openCodeLinkModal__(){
  return new Promise((resolve)=>{
    const modal = document.getElementById("qrScanModal");
    const input = document.getElementById("qrScanInput");
    const ok = document.getElementById("qrScanConfirm");
    const close = document.getElementById("qrScanClose");

    const finish = (val)=>{
      try{
        if (modal){
          modal.hidden = true;
          try{ modal.setAttribute("aria-hidden","true"); }catch(_){}
        }
      }catch(_){}
      resolve(String(val||"").trim());
    };

    // open
    try{
      if (modal){
        modal.hidden = false;
        try{ modal.setAttribute("aria-hidden","false"); }catch(_){}
      }
    }catch(_){}

    try{
      if (input){
        input.value = "";
        setTimeout(()=>{ try{ input.focus(); }catch(_){ } }, 80);
      }
    }catch(_){}

    const onOk = (e)=>{ try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){ } finish(input ? input.value : ""); };
    const onClose = (e)=>{ try{ if(e && e.preventDefault) e.preventDefault(); }catch(_){ } finish(""); };

    if (ok) ok.onclick = onOk;
    if (close) close.onclick = onClose;
    if (input){
      input.onkeydown = (e)=>{ if (e && e.key === "Enter") onOk(e); };
    }
  });
}

async function __qrScanAndLink__(){
  // Ora: inserimento codice (no QR)
  let code = "";
  try{
    code = await __openCodeLinkModal__();
  }catch(_){ code = ""; }

  if (!code){
    try{ code = String(prompt("Incolla codice (DDAE|...)") || "").trim(); }catch(_){ code = ""; }
  }
  if (!code) return;

  const parsed = __parseQr__(code);
  if (!parsed) { try{ toast("Codice non valido", "orange"); }catch(_){ } return; }

  // validate team key matches
  const doc = await __fsGet__(`teams/${parsed.teamId}`);
  if (!doc){ try{ toast("Team non trovato", "orange"); }catch(_){ } return; }
  const data = __fsDecode__(doc);
  if (String(data.key||"") !== String(parsed.teamKey||"")){ try{ toast("Codice non valido", "orange"); }catch(_){ } return; }

  __fbSaveLink__(parsed.teamId, parsed.teamKey);
  try{ toast("Collegato", "green"); }catch(_){ }
}

function __isAdmin__(){
  return !!(state && state.session && !isOperatoreSession(state.session));
}
function __operatorName__(){
  try{ return String(state?.session?.username || "").trim(); }catch(_){ return ""; }
}


// --- Spesa Board (bacheca condivisa) ---
// La bacheca vive su Firebase in: sync/{teamId}/boards/spesa
// Contiene SOLO colazione + prodotti_pulizia e viene aggiornata da admin e operatori.
// Precedenza: ultimo aggiornamento per singolo prodotto (LWW) usando updatedAt/deletedAt.
function __spesaKeyShared__(it){
  const p = String(it?.prodotto || it?.nome || "").trim().toUpperCase();
  return p || String(it?.id || "").trim();
}
function __spesaIsDeleted__(it){
  const d = (it && (it.isDeleted ?? it.is_deleted ?? it.deleted));
  return (d === true) || (String(d) === "1");
}
function __spesaEffTs__(it){
  const u = String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
  if (__spesaIsDeleted__(it)){
    const d = String(it?.deletedAt || it?.deleted_at || "") || u;
    return d || u;
  }
  return u;
}
function __mergeSpesaLWW__(base, inc){
  const out = [];
  const best = new Map();
  const put = (r)=>{
    if (!r || typeof r !== "object") return;
    const k = __spesaKeyShared__(r);
    if (!k) return;
    const prev = best.get(k);
    if (!prev){ best.set(k, r); return; }
    const ta = __spesaEffTs__(prev);
    const tb = __spesaEffTs__(r);
    if (tb && (!ta || tb > ta)){
      best.set(k, r);
      return;
    }
    if (ta && tb && tb === ta){
      // tie-break: prefer tombstone (evita resurrezioni a parità di timestamp)
      if (__spesaIsDeleted__(r) && !__spesaIsDeleted__(prev)){
        best.set(k, r);
        return;
      }
      if (!__spesaIsDeleted__(r) && __spesaIsDeleted__(prev)){
        return;
      }
      // else keep prev
    }
  };
  (Array.isArray(base)?base:[]).forEach(put);
  (Array.isArray(inc)?inc:[]).forEach(put);
  best.forEach(v=>out.push(v));
  return out;
}

async function __fbExportSpesaBoard__(opts){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) return false;
  try{
    const colazione = await __tblGet__("colazione", []);
    const prodotti = await __tblGet__("prodotti_pulizia", []);
    const payload = {
      kind:"DDAE_SPESA_BOARD",
      build: BUILD_VERSION,
      at: __nowIso__(),
      datasets:{
        colazione: Array.isArray(colazione)?colazione:[],
        prodotti_pulizia: Array.isArray(prodotti)?prodotti:[]
      }
    };
    await __fsSet__(`sync/${__FB_STATE__.teamId}/boards/spesa`, {
      spesa_json: JSON.stringify(payload),
      updatedAt: { __ts: __nowIso__() }
    });
    return true;
  }catch(_){
    return false;
  }
}

async function __fbReadSpesaBoardPayload__(){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) return null;
  try{
    const doc = await __fsGet__(`sync/${__FB_STATE__.teamId}/boards/spesa`);
    if (!doc) return null;
    const data = __fsDecode__(doc);
    const raw = String(data?.spesa_json || "");
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && p.datasets) return p;
  }catch(_){}
  return null;
}
// --- /Spesa Board ---
async function __fbExportAdmin__(opts){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) { try{ if(!opts?.silent) toast("Genera prima il codice in Impostazioni", "orange"); }catch(_){ } return false; }

  const tables = __OP_TABLES__.filter(t => t !== 'utenti');
  const datasets = {};
  for (const t of tables){ datasets[t] = await __tblGet__(t, (t==="impostazioni"?[]:[])); }
  const payload = { kind:"DDAE_SYNC_ADMIN", build: BUILD_VERSION, at: __nowIso__(), datasets };

  await __fsSet__(`sync/${__FB_STATE__.teamId}`, { admin_json: JSON.stringify(payload), updatedAt:{ __ts: __nowIso__() } });
  try{ await __fbExportSpesaBoard__({ silent:true }); }catch(_){ }
  try{ if(!opts?.silent) toast("Operazione completata", "blue"); }catch(_){}
  return true;

}

async function __fbImportOperator__(opts){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) { try{ if(!opts?.silent) toast("Inserisci prima il codice", "orange"); }catch(_){ } return false; }

// Carica dati condivisi SENZA dipendere dall'admin:
// - admin_json (se presente)
// - export di tutti gli operatori (collection operators)
let payloads = [];
try{
  const docAdmin = await __fsGet__(`sync/${__FB_STATE__.teamId}`);
  if (docAdmin){
    const dataA = __fsDecode__(docAdmin);
    const rawA = String(dataA.admin_json||"");
    if (rawA){
      try{
        const pA = JSON.parse(rawA);
        if (pA && pA.datasets) payloads.push(pA);
      }catch(_){}
    }
  }
}catch(_){}

try{
  const docsOps = await __fsList__(`sync/${__FB_STATE__.teamId}/operators`);
  (docsOps||[]).forEach(d=>{
    try{
      const dd = __fsDecode__(d);
      const rawO = String(dd.operator_json||"");
      if (!rawO) return;
      const pO = JSON.parse(rawO);
      if (pO && pO.datasets) payloads.push(pO);
    }catch(_){}
  });
}catch(_){}


// bacheca spesa condivisa (opzionale)
try{
  const b = await __fbReadSpesaBoardPayload__();
  if (b && b.datasets) payloads.push(b);
}catch(_){}
if (!payloads.length){ try{ if(!opts?.silent) toast("Nessun dato disponibile", "orange"); }catch(_){ } return false; }

// Combina tutti i dataset in un unico payload remoto
let payload = { kind:"DDAE_SYNC_COMBINED", build: BUILD_VERSION, at: __nowIso__(), datasets: {} };
try{
  for (const p of payloads){
    const ds = (p && p.datasets && typeof p.datasets === "object") ? p.datasets : {};
    for (const k of Object.keys(ds)){
      const v = ds[k];
      if (Array.isArray(v)){
        if (!Array.isArray(payload.datasets[k])) payload.datasets[k] = [];
        payload.datasets[k] = payload.datasets[k].concat(v);
      } else if (v && typeof v === "object") {
        // oggetti: merge shallow
        payload.datasets[k] = Object.assign({}, payload.datasets[k]||{}, v);
      } else {
        if (payload.datasets[k] === undefined) payload.datasets[k] = v;
      }
    }
  }
}catch(_){}


// Normalizza liste spesa (evita duplicati e applica precedenza cronologica per prodotto)
try{
  if (payload.datasets){
    if (Array.isArray(payload.datasets.colazione)){
      payload.datasets.colazione = __mergeSpesaLWW__([], payload.datasets.colazione);
    }
    if (Array.isArray(payload.datasets.prodotti_pulizia)){
      payload.datasets.prodotti_pulizia = __mergeSpesaLWW__([], payload.datasets.prodotti_pulizia);
    }
  }
}catch(_){}
if (!payload || !payload.datasets){ try{ if(!opts?.silent) toast("Dati non validi", "orange"); }catch(_){ } return false; }

// Import subset operatore
  // Import subset operatore (NON sovrascrivere credenziali locali)
  // - Evita di perdere l'account operatore dopo logout su device che importano da Firebase
  // - Per sicurezza: se nel payload arriva 'utenti', lo mergiamo con quelli già presenti
  try{
    if (payload && payload.datasets && Array.isArray(payload.datasets.utenti)) {
      const existingUsers = await __tblGet__("utenti", []);
      await __tblSet__("utenti", __mergeUsers__(existingUsers, payload.datasets.utenti));
    }
  }catch(_){ }

  // Merge helper: unisce per id scegliendo la versione più recente (updatedAt/createdAt)
  const __mergeByIdLatest__ = (localArr, remoteArr) => {
    try{
      const loc = Array.isArray(localArr) ? localArr : [];
      const rem = Array.isArray(remoteArr) ? remoteArr : [];
      const pickT = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
      const map = new Map();
      let anon = 0;

      const put = (it) => {
        if (!it) return;
        const id = String(it?.id || "").trim();
        if (!id){
          map.set(`__anon_${anon++}`, it);
          return;
        }
        const prev = map.get(id);
        if (!prev){ map.set(id, it); return; }
        const tp = pickT(prev);
        const tn = pickT(it);
        // se "it" è più recente, sovrascrive prev; altrimenti mantiene prev
        if (tn && (!tp || tn > tp)){
          map.set(id, Object.assign({}, prev, it));
        } else {
          map.set(id, Object.assign({}, it, prev));
        }
      };

      loc.forEach(put);
      rem.forEach(put);

      return Array.from(map.values());
    }catch(_){
      return Array.isArray(remoteArr) ? remoteArr : (Array.isArray(localArr) ? localArr : []);
    }
  };

  for (const t of __OP_TABLES__){
    if (t === "utenti") continue;

    // Dati operativi: MERGE smart (key-based) per evitare di perdere lavoro locale
    // e per garantire che ogni operatore veda anche i dati degli altri.
    if (t === "pulizie"){
  if (payload.datasets[t] !== undefined){
    const local = await __tblGet__(t, []);
    const remote = Array.isArray(payload.datasets[t]) ? payload.datasets[t] : [];

    const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
    const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
    const key = (r) => {
      const d = String(r?.data || r?.date || "").slice(0,10);
      const s = String(r?.stanza || r?.room || "").trim();
      return (d && s) ? (d + "|" + s) : "";
    };
    const isNum = (v)=> typeof v === "number" && !Number.isNaN(v);
    const asNum = (v)=> {
      if (isNum(v)) return v;
      if (typeof v === "string" && v.trim()!=="" && !isNaN(Number(v))) return Number(v);
      return null;
    };
    const mergeMax = (a,b)=>{
      // LWW (Last-Write-Wins): vince SEMPRE l'ultima modifica, anche se è una cancellazione (valori a 0).
      const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
      const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
      const isDel = (o) => !!(o && (o.isDeleted || o.deleted));
      const effT = (o) => {
        const u = pickU(o);
        if (isDel(o)){ const d = pickD(o) || u; return d || u; }
        return u;
      };
      const ta = effT(a);
      const tb = effT(b);
      const newerIsB = (!ta && !tb) ? true : (tb && (!ta || tb >= ta));
      const newer = newerIsB ? (b||{}) : (a||{});
      const older = newerIsB ? (a||{}) : (b||{});
      return Object.assign({}, older, newer);
    };

    const best = new Map();
    const put = (it) => {
      if (!it || typeof it !== "object") return;
      const k = key(it);
      if (!k){ best.set("__anon_"+best.size, it); return; }
      const prev = best.get(k);
      if (!prev){ best.set(k, it); return; }
      best.set(k, mergeMax(prev, it));
    };
    (Array.isArray(local)?local:[]).forEach(put);
    remote.forEach(put);
    await __tblSet__(t, Array.from(best.values()));
  }
  continue;
}

    if (t === "operatori"){
  if (payload.datasets[t] !== undefined){
    const local = await __tblGet__(t, []);
    const remote = Array.isArray(payload.datasets[t]) ? payload.datasets[t] : [];
    const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
    const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
    const normOp = (s) => String(s||"").trim().toLowerCase();
    const normD  = (s) => __normIsoDate__(s);
    const key = (r) => {
      const d = normD(r?.data || r?.date || "");
      const o = normOp(r?.operatore || r?.nome || "");
      return (d && o) ? (d + "|" + o) : "";
    };
    const asNum = (v)=> {
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      if (typeof v === "string" && v.trim()!=="" && !isNaN(Number(v))) return Number(v);
      return null;
    };
    const mergeMax = (a,b)=>{
      // LWW (Last-Write-Wins): vince SEMPRE l'ultima modifica, anche se è una cancellazione (valori a 0).
      const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
      const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
      const isDel = (o) => !!(o && (o.isDeleted || o.deleted));
      const effT = (o) => {
        const u = pickU(o);
        if (isDel(o)){ const d = pickD(o) || u; return d || u; }
        return u;
      };
      const ta = effT(a);
      const tb = effT(b);
      const newerIsB = (!ta && !tb) ? true : (tb && (!ta || tb >= ta));
      const newer = newerIsB ? (b||{}) : (a||{});
      const older = newerIsB ? (a||{}) : (b||{});
      return Object.assign({}, older, newer);
    };

    const best = new Map();
    const put = (it) => {
      if (!it || typeof it !== "object") return;
      const k = key(it);
      if (!k){ best.set("__anon_"+best.size, it); return; }
      const prev = best.get(k);
      if (!prev){ best.set(k, it); return; }
      best.set(k, mergeMax(prev, it));
    };
    (Array.isArray(local)?local:[]).forEach(put);
    remote.forEach(put);
    await __tblSet__(t, Array.from(best.values()));
  }
  continue;
}

    if (t === "lavanderia"){
  if (payload.datasets[t] !== undefined){
    const local = await __tblGet__(t, []);
    const remote = Array.isArray(payload.datasets[t]) ? payload.datasets[t] : [];
    const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
    const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
    const key = (it) => {
      const id = String(it?.id || "").trim();
      if (id) return "id:" + id;
      const a = __normIsoDate__(it?.startDate || it?.start_date || it?.from || "");
      const b = __normIsoDate__(it?.endDate || it?.end_date || it?.to || "");
      return (a && b) ? ("rng:" + a + "|" + b) : "";
    };
    const asNum = (v)=> {
      if (typeof v === "number" && !Number.isNaN(v)) return v;
      if (typeof v === "string" && v.trim()!=="" && !isNaN(Number(v))) return Number(v);
      return null;
    };
    const mergeMax = (a,b)=>{
      // LWW (Last-Write-Wins): vince SEMPRE l'ultima modifica, anche se è una cancellazione (valori a 0).
      const pickU = (o) => String(o?.updatedAt || o?.updated_at || o?.createdAt || o?.created_at || "");
      const pickD = (o) => String(o?.deletedAt || o?.deleted_at || "");
      const isDel = (o) => !!(o && (o.isDeleted || o.deleted));
      const effT = (o) => {
        const u = pickU(o);
        if (isDel(o)){ const d = pickD(o) || u; return d || u; }
        return u;
      };
      const ta = effT(a);
      const tb = effT(b);
      const newerIsB = (!ta && !tb) ? true : (tb && (!ta || tb >= ta));
      const newer = newerIsB ? (b||{}) : (a||{});
      const older = newerIsB ? (a||{}) : (b||{});
      return Object.assign({}, older, newer);
    };
    const best = new Map();
    const put = (it) => {
      if (!it || typeof it !== "object") return;
      const k = key(it);
      if (!k){ best.set("__anon_"+best.size, it); return; }
      const prev = best.get(k);
      if (!prev){ best.set(k, it); return; }
      best.set(k, mergeMax(prev, it));
    };
    (Array.isArray(local)?local:[]).forEach(put);
    remote.forEach(put);
    await __tblSet__(t, Array.from(best.values()));
  }
  continue;
}

    if (t === "colazione" || t === "prodotti_pulizia"){
      if (payload.datasets[t] !== undefined){
        const local = await __tblGet__(t, []);
        const remote = Array.isArray(payload.datasets[t]) ? payload.datasets[t] : [];
        await __tblSet__(t, __mergeSpesaLWW__(local, remote));
      }
      continue;
    }

    if (payload.datasets[t] !== undefined){
      await __tblSet__(t, payload.datasets[t]);
    }
  }

    try{ await __fbExportSpesaBoard__({ silent:true }); }catch(_){ }

try{ if(!opts?.silent) toast("Operazione completata", "green"); }catch(_){}
  const __restoreAfterSync = opts?.restoreState || __captureSyncRestoreState();
  try{ await __refreshAfterSync__(__restoreAfterSync); }catch(_){
    if(!opts?.skipReload){ setTimeout(()=>{ try{ __writeRestoreState(__restoreAfterSync); }catch(_){ } try{ location.reload(); }catch(_){ } }, 250); }
  }
  return true;
}

async function __fbExportOperator__(opts){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) { try{ if(!opts?.silent) toast("Inserisci prima il codice", "orange"); }catch(_){ } return false; }
  const name = (__operatorName__() || "operatore").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_\-]/g,"");
  if (!name){ try{ if(!opts?.silent) toast("Nome operatore mancante", "orange"); }catch(_){ } return false; }

  const datasets = {
    pulizie: await __tblGet__("pulizie", []),
    operatori: await __tblGet__("operatori", []),
    lavanderia: await __tblGet__("lavanderia", []),
    colazione: await __tblGet__("colazione", []),
    prodotti_pulizia: await __tblGet__("prodotti_pulizia", [])
  };
  const payload = { kind:"DDAE_SYNC_OPERATOR", operator:name, build: BUILD_VERSION, at: __nowIso__(), datasets };
  await __fsSet__(`sync/${__FB_STATE__.teamId}/operators/${name}`, { operator_json: JSON.stringify(payload), updatedAt:{ __ts: __nowIso__() } });
  try{ await __fbExportSpesaBoard__({ silent:true }); }catch(_){ }
  try{ if(!opts?.silent) toast("Operazione completata", "blue"); }catch(_){}
  return true;

}

function __pickLatestLaundry__(list){
  try{
    const arr = Array.isArray(list)?list:[];
    if (!arr.length) return null;
    // pick max updatedAt or endDate
    return arr.slice().sort((a,b)=>{
      const ua = String(a.updatedAt||a.updated_at||a.endDate||a.end_date||"");
      const ub = String(b.updatedAt||b.updated_at||b.endDate||b.end_date||"");
      return ua < ub ? 1 : (ua > ub ? -1 : 0);
    })[0];
  }catch(_){ return null; }
}

async function __fbImportAdmin__(opts){
  __fbLoadLink__();
  if (!__FB_STATE__.teamId) { try{ if(!opts?.silent) toast("Genera prima il codice in Impostazioni", "orange"); }catch(_){ } return false; }

  // get operator list from settings if present
  let ops = [];
  try{
    await ensureSettingsLoaded({ force:false, showLoader:false });
    ops = (getOperatorNamesFromSettings ? getOperatorNamesFromSettings() : []).map(x=>String(x||"").trim()).filter(Boolean);
  }catch(_){}
  // normalize
  ops = ops.map(n => String(n).toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_\-]/g,"")).filter(Boolean);

  // Sempre includi TUTTI i documenti presenti nella collection operators (non dipendere solo dal roster/settings)
  // per evitare che un operatore venga "saltato" e che l'admin esporti solo un sottoinsieme dei dati.
  try{
    const docsAll = await __fsList__(`sync/${__FB_STATE__.teamId}/operators`);
    const fromDocs = (docsAll||[]).map(d => String(d.name||"").split("/").pop()).map(x=>String(x||"").trim()).filter(Boolean);
    if (!ops.length) ops = fromDocs;
    else {
      const set = new Set(ops);
      fromDocs.forEach(n=>{ if(n) set.add(n); });
      ops = Array.from(set);
    }
  }catch(_){ }

  if (!ops.length){
    try{ if(!opts?.silent) toast("Nessun operatore trovato", "orange"); }catch(_){ }
  }

  // merge
  let mergedPulizie = await __tblGet__("pulizie", []);
  const basePulizie = Array.isArray(mergedPulizie) ? mergedPulizie : [];
  mergedPulizie = basePulizie.slice();

  let mergedOperatori = await __tblGet__("operatori", []);
  const baseOperatori = Array.isArray(mergedOperatori) ? mergedOperatori : [];
  mergedOperatori = baseOperatori.slice();


  // merge colazione + prodotti pulizia (lista spesa) da operatori
  let mergedColazione = await __tblGet__("colazione", []);
  mergedColazione = Array.isArray(mergedColazione) ? mergedColazione.slice() : [];

  let mergedProdottiPulizia = await __tblGet__("prodotti_pulizia", []);
  mergedProdottiPulizia = Array.isArray(mergedProdottiPulizia) ? mergedProdottiPulizia.slice() : [];

  // merge bacheca condivisa spesa (se presente)
  try{
    const b = await __fbReadSpesaBoardPayload__();
    if (b && b.datasets){
      mergedColazione = __mergeSpesaLWW__(mergedColazione, b.datasets.colazione);
      mergedProdottiPulizia = __mergeSpesaLWW__(mergedProdottiPulizia, b.datasets.prodotti_pulizia);
    }
  }catch(_){}

  const __spesaKey__ = (it) => {
    const p = String(it?.prodotto || it?.nome || "").trim().toUpperCase();
    return p || String(it?.id || "").trim();
  };
  const __spesaUAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
  const __mergeSpesaList__ = (base, inc) => {
    const out = Array.isArray(base) ? base.slice() : [];
    const idxByKey = new Map();
    out.forEach((r, i) => { const k = __spesaKey__(r); if (k) idxByKey.set(k, i); });
    (Array.isArray(inc) ? inc : []).forEach((r) => {
      const k = __spesaKey__(r);
      if (!k) return;
      const i = idxByKey.get(k);
      if (i === undefined){
        out.push(r);
        idxByKey.set(k, out.length - 1);
        return;
      }
      const a = out[i];
      const ua = __spesaUAt__(a);
      const ub = __spesaUAt__(r);
      if (ub && (!ua || ub > ua)){
        out[i] = r;
      }else if (!ub && !ua){
        // fallback: conserva qty più alta
        const qa = parseInt(String(a?.qty ?? 0), 10);
        const qb = parseInt(String(r?.qty ?? 0), 10);
        if ((isNaN(qa)?0:qa) < (isNaN(qb)?0:qb)) out[i] = Object.assign({}, a, r);
      }
    });
    return out;
  };

  let mergedLavanderia = await __tblGet__("lavanderia", []);
  mergedLavanderia = Array.isArray(mergedLavanderia) ? mergedLavanderia.slice() : [];
  const __lavKey__ = (it) => {
    const id = String(it?.id || "").trim();
    if (id) return "id:" + id;
    const a = __normIsoDate__(it?.startDate || it?.start_date || it?.from || "");
    const b = __normIsoDate__(it?.endDate || it?.end_date || it?.to || "");
    return (a && b) ? ("rng:" + a + "|" + b) : "";
  };
  const __lavUAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
  const __lavIdx__ = new Map();
  mergedLavanderia.forEach((it, i) => { const k = __lavKey__(it); if (k && !__lavIdx__.has(k)) __lavIdx__.set(k, i); });

  for (const op of ops){

    const doc = await __fsGet__(`sync/${__FB_STATE__.teamId}/operators/${op}`);
    if (!doc) continue;
    const d = __fsDecode__(doc);
    const raw = String(d.operator_json||"");
    if (!raw) continue;
    let payload=null; try{ payload=JSON.parse(raw); }catch(_){ payload=null; }
    if (!payload || !payload.datasets) continue;

    // merge pulizie entries (merge by id or by key data+stanza; max per-col)
    try{
      const cols = getLaundryComponentCodes();
      const listP = Array.isArray(payload.datasets.pulizie) ? payload.datasets.pulizie : [];
      const byId = new Map();
      mergedPulizie.forEach(r=>{ const id = String(r?.id||"").trim(); if (id) byId.set(id, r); });
      const byKey = new Map();
      mergedPulizie.forEach(r=>{
        const d = String(r?.data||r?.date||"").slice(0,10);
        const s = String(r?.stanza||r?.room||"").trim();
        if (d && s) byKey.set(d+"|"+s, r);
      });
      listP.forEach(r=>{
        if (!r) return;
        const id = String(r?.id||"").trim();
        const d = String(r?.data||r?.date||"").slice(0,10);
        const s = String(r?.stanza||r?.room||"").trim();
        const key = (d && s) ? (d+"|"+s) : "";
        const target = (id && byId.has(id)) ? byId.get(id) : (key && byKey.has(key) ? byKey.get(key) : null);
        if (!target){
          mergedPulizie.push(r);
          if (id) byId.set(id, r);
          if (key) byKey.set(key, r);
          return;
        }
        const ua = String(target.updatedAt||target.updated_at||target.createdAt||target.created_at||"");
        const ub = String(r.updatedAt||r.updated_at||r.createdAt||r.created_at||"");
        const should = (!ua && !ub) ? true : (ub && (!ua || ub > ua));
        if (should){
          try{ Object.keys(r||{}).forEach(k=>{ target[k] = r[k]; }); }catch(_){ }
        }
      });
    }catch(_){ }

    // merge operatori entries (LWW by data+operatore; consente decrementi/cancellazioni)
    try{
      const list = Array.isArray(payload.datasets.operatori) ? payload.datasets.operatori : [];
      const __opKey__ = (it) => {
        const d = __normIsoDate__(it?.data || it?.date || "");
        const op = String(it?.operatore || it?.nome || "").trim().toLowerCase();
        return (d && op) ? (d + "|" + op) : "";
      };
      const __opUAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
      const idxByKey = new Map();
      // indicizza base (dedupe interno: tieni la più recente)
      mergedOperatori.forEach((it, i) => {
        const k = __opKey__(it);
        if (!k) return;
        if (!idxByKey.has(k)) { idxByKey.set(k, i); return; }
        const j = idxByKey.get(k);
        const a = mergedOperatori[j];
        const ua = __opUAt__(a);
        const ub = __opUAt__(it);
        const should = (!ua && !ub) ? false : (ub && (!ua || ub > ua));
        if (should) idxByKey.set(k, i);
      });

      list.forEach((it) => {
        const k = __opKey__(it);
        if (!k){ mergedOperatori.push(it); return; }
        const i = idxByKey.get(k);
        if (i === undefined){
          mergedOperatori.push(it);
          idxByKey.set(k, mergedOperatori.length - 1);
          return;
        }
        const a = mergedOperatori[i];
        const ua = __opUAt__(a);
        const ub = __opUAt__(it);
        const should = (!ua && !ub) ? true : (ub && (!ua || ub > ua));
        if (should){
          mergedOperatori[i] = Object.assign({}, (mergedOperatori[i]||{}), (it||{}));
        }
      });
    }catch(_){}
// merge lista spesa (colazione + prodotti pulizia)
    try{
      if (payload.datasets.colazione !== undefined){
        mergedColazione = __mergeSpesaLWW__(mergedColazione, payload.datasets.colazione);
      }
      if (payload.datasets.prodotti_pulizia !== undefined){
        mergedProdottiPulizia = __mergeSpesaLWW__(mergedProdottiPulizia, payload.datasets.prodotti_pulizia);
      }
    }catch(_){}

    // merge lavanderia entries (LWW; supporta eliminazioni via isDeleted)
    try{
      const listL = Array.isArray(payload.datasets.lavanderia) ? payload.datasets.lavanderia : [];
      (Array.isArray(listL) ? listL : []).forEach((it) => {
        const k = __lavKey__(it);
        if (!k){ mergedLavanderia.push(it); return; }
        const i = __lavIdx__.get(k);
        if (i === undefined){
          mergedLavanderia.push(it);
          __lavIdx__.set(k, mergedLavanderia.length - 1);
          return;
        }
        const a = mergedLavanderia[i];
        const ua = __lavUAt__(a);
        const ub = __lavUAt__(it);
        const should = (!ua && !ub) ? true : (ub && (!ua || ub > ua));
        if (should){
          mergedLavanderia[i] = it;
        }
      });
    }catch(_){}
  }

  // merge impostazioni dall'admin_json per preservare catalogo operatori (colore/tariffa/benzina) anche dopo sync
  try{
    const docAdminSync = await __fsGet__(`sync/${__FB_STATE__.teamId}`);
    if (docAdminSync){
      const dataAdminSync = __fsDecode__(docAdminSync);
      const rawAdminSync = String(dataAdminSync?.admin_json || "");
      if (rawAdminSync){
        const payloadAdminSync = JSON.parse(rawAdminSync);
        const remoteImp = Array.isArray(payloadAdminSync?.datasets?.impostazioni) ? payloadAdminSync.datasets.impostazioni : [];
        if (remoteImp.length){
          const localImp = await __tblGet__("impostazioni", []);
          const pickKey = (r) => String(r?.key || r?.Key || "").trim().toLowerCase();
          const pickU = (r) => String(r?.updatedAt || r?.updated_at || r?.createdAt || r?.created_at || "");
          const byKey = new Map();
          (Array.isArray(localImp) ? localImp : []).forEach((row) => {
            const k = pickKey(row) || `__local_${byKey.size}`;
            byKey.set(k, row);
          });
          remoteImp.forEach((row) => {
            const k = pickKey(row) || `__remote_${byKey.size}`;
            const prev = byKey.get(k);
            if (!prev){ byKey.set(k, row); return; }
            const up = pickU(prev);
            const ur = pickU(row);
            const takeRemote = (!up && !ur) ? true : (!!ur && (!up || ur >= up));
            byKey.set(k, takeRemote ? Object.assign({}, prev, row) : Object.assign({}, row, prev));
          });
          await __tblSet__("impostazioni", Array.from(byKey.values()));
          try{ state.settings.loaded = false; }catch(_){ }
          try{ await ensureSettingsLoaded({ force:true, showLoader:false }); }catch(_){ }
        }
      }
    }
  }catch(_){ }

  // cleanup: dedupe pulizie/operatori/lavanderia con logica LWW (evita che i vecchi valori "restino appiccicati")
  try{
    const __uAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
    const __pKey__ = (it) => {
      const d = String(it?.data || it?.date || "").slice(0,10);
      const s = String(it?.stanza || it?.room || "").trim();
      return (d && s) ? (d + "|" + s) : "";
    };
    const bestP = new Map();
    (Array.isArray(mergedPulizie) ? mergedPulizie : []).forEach(it => {
      const k = __pKey__(it);
      if (!k) return;
      const prev = bestP.get(k);
      if (!prev){ bestP.set(k, it); return; }
      const ua = __uAt__(prev);
      const ub = __uAt__(it);
      const should = (!ua && !ub) ? false : (ub && (!ua || ub > ua));
      if (should) bestP.set(k, it);
    });
    mergedPulizie = Array.from(bestP.values());
  }catch(_){}

  try{
    const __uAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
    const __oKey__ = (it) => {
      const d = __normIsoDate__(it?.data || it?.date || "");
      const op = String(it?.operatore || it?.nome || "").trim().toLowerCase();
      return (d && op) ? (d + "|" + op) : "";
    };
    const bestO = new Map();
    (Array.isArray(mergedOperatori) ? mergedOperatori : []).forEach(it => {
      const k = __oKey__(it);
      if (!k) return;
      const prev = bestO.get(k);
      if (!prev){ bestO.set(k, it); return; }
      const ua = __uAt__(prev);
      const ub = __uAt__(it);
      const should = (!ua && !ub) ? false : (ub && (!ua || ub > ua));
      if (should) bestO.set(k, it);
    });
    mergedOperatori = Array.from(bestO.values());
  }catch(_){}

  try{
    const __uAt__ = (it) => String(it?.updatedAt || it?.updated_at || it?.createdAt || it?.created_at || "");
    const __lKey__ = (it) => {
      const id = String(it?.id || "").trim();
      if (id) return "id:" + id;
      const a = __normIsoDate__(it?.startDate || it?.start_date || it?.from || "");
      const b = __normIsoDate__(it?.endDate || it?.end_date || it?.to || "");
      return (a && b) ? ("rng:" + a + "|" + b) : "";
    };
    const bestL = new Map();
    (Array.isArray(mergedLavanderia) ? mergedLavanderia : []).forEach(it => {
      const k = __lKey__(it);
      if (!k) return;
      const prev = bestL.get(k);
      if (!prev){ bestL.set(k, it); return; }
      const ua = __uAt__(prev);
      const ub = __uAt__(it);
      const should = (!ua && !ub) ? false : (ub && (!ua || ub > ua));
      if (should) bestL.set(k, it);
    });
    mergedLavanderia = Array.from(bestL.values());
  }catch(_){}
// write merged pulizie
  await __tblSet__("pulizie", mergedPulizie);

  // write merged operatori
  await __tblSet__("operatori", mergedOperatori);

  // write merged spesa (colazione + prodotti pulizia)
  await __tblSet__("colazione", mergedColazione);
  await __tblSet__("prodotti_pulizia", mergedProdottiPulizia);

  // write merged lavanderia (include tombstones; UI filtra isDeleted)
  await __tblSet__("lavanderia", mergedLavanderia);


    try{ await __fbExportSpesaBoard__({ silent:true }); }catch(_){ }

try{ if(!opts?.silent) toast("Operazione completata", "green"); }catch(_){}
  const __restoreAfterSync = opts?.restoreState || __captureSyncRestoreState();
  try{ await __refreshAfterSync__(__restoreAfterSync); }catch(_){
    if(!opts?.skipReload){ setTimeout(()=>{ try{ __writeRestoreState(__restoreAfterSync); }catch(_){ } try{ location.reload(); }catch(_){ } }, 250); }
  }
  return true;
}

async function __handleSyncImport__(){
  const restoreState = __captureSyncRestoreState();
  if (__isAdmin__()) return __fbImportAdmin__({ restoreState });
  return __fbImportOperator__({ restoreState });
}
async function __handleSyncExport__(){
  const restoreState = __captureSyncRestoreState();
  if (__isAdmin__()) return __fbExportAdmin__({ restoreState });
  return __fbExportOperator__({ restoreState });
}


async function __handleSyncBoth__(){
  __fbLoadLink__();
  const restoreState = __captureSyncRestoreState();
  try{ toast("Sync in corso...", "blue"); }catch(_){}
  const __sleep__ = (ms) => new Promise(r => setTimeout(r, ms));
  const __attemptSync__ = async (fn, tries = 2, delay = 350) => {
    let last = false;
    for (let i = 0; i < tries; i++){
      try{
        last = await fn();
        if (last !== false) return last;
      }catch(_){
        last = false;
      }
      if (i < (tries - 1)) await __sleep__(delay);
    }
    return last;
  };
  let exported = false, imported = false;
  try{
    if (__isAdmin__()){
      exported = await __attemptSync__(()=>__fbExportAdmin__({ silent:true, restoreState }), 2, 350);
      imported = await __attemptSync__(()=>__fbImportAdmin__({ silent:true, skipReload:true, restoreState }), 3, 450);
    }else{
      exported = await __attemptSync__(()=>__fbExportOperator__({ silent:true, restoreState }), 2, 350);
      imported = await __attemptSync__(()=>__fbImportOperator__({ silent:true, skipReload:true, restoreState }), 3, 450);
    }
  }catch(_){ }
  const ok = (exported !== false) || (imported !== false);
  try{ toast(ok ? "Sync completata" : "Sync non riuscita", ok ? "green" : "orange"); }catch(_){}
  setTimeout(()=>{ try{ __writeRestoreState(restoreState); }catch(_){ } try{ location.reload(); }catch(_){ } }, 900);
  return ok;
}

// Bind sync buttons once DOM is ready
try{
  window.addEventListener("load", ()=>{
    try{
      __fbLoadLink__();
      const btn = document.getElementById("goDbSync");
      if (btn && !btn.__syncBound){ btn.__syncBound = true; bindFastTap(btn, async ()=>{ try{ await __handleSyncBoth__(); }catch(e){ try{ toast("Sync non disponibile", "orange"); }catch(_){ } } }); }
      try{ setTimeout(()=>{ try{ __fitHomeSyncBtn__(); }catch(_){ } }, 0); }catch(_){ }
      try{
        if (!window.__homeSyncFitBound){
          window.__homeSyncFitBound = true;
          let __homeSyncFitTO__ = null;
          window.addEventListener("resize", ()=>{
            try{ clearTimeout(__homeSyncFitTO__); }catch(_){ }
            __homeSyncFitTO__ = setTimeout(()=>{ try{ __fitHomeSyncBtn__(); }catch(_){ } }, 80);
          }, { passive:true });
        }
      }catch(_){ }
    }catch(_){}
  }, { passive:true });
}catch(_){}


// Dialog a due azioni (riusa il modal Sì/No esistente con label dinamiche)
// Ritorna "yes" o "no".
async function __confirmTwoActions__(message, yesLabel, noLabel){
  try{
    const yesBtn = document.getElementById("confirmYesNoYes");
    const noBtn  = document.getElementById("confirmYesNoNo");
    const prevYes = yesBtn ? yesBtn.textContent : null;
    const prevNo  = noBtn  ? noBtn.textContent  : null;

    if (yesBtn) yesBtn.textContent = String(yesLabel || "Sì");
    if (noBtn)  noBtn.textContent  = String(noLabel  || "No");

    const ok = await confirmYesNo(String(message || "Confermare?"));

    // restore
    if (yesBtn && prevYes !== null) yesBtn.textContent = prevYes;
    if (noBtn  && prevNo  !== null) noBtn.textContent  = prevNo;

    return ok ? "yes" : "no";
  }catch(_){
    // fallback
    try{ return (confirm(String(message || "Confermare?")) ? "yes" : "no"); }catch(__){ return "no"; }
  }
}


async function __openDbPopup__(kind){
  const k = String(kind||"admin").toLowerCase().startsWith("op") ? "operator" : "admin";
  const label = (k==="admin") ? "DB Amministratore" : "DB Operatore";
  const choice = await __confirmTwoActions__(label + ": scegli operazione", "Importa", "Esporta");
  if (choice === "yes") return __dbImport__(k);
  // best-effort preopen for iOS download
  let w=null; try{ w = window.open("", "_blank"); }catch(_){ w=null; }
  return __dbExport__(k, w);
}


// Nuovo menu DB: un solo popup con selezione Admin/Operatore + Import/Export
function __setDbMenuSelected__(kind){
  const a = document.getElementById("dbMenuOptAdmin");
  const o = document.getElementById("dbMenuOptOperator");
  if (!a || !o) return;
  const k = String(kind||"admin").toLowerCase().startsWith("op") ? "operator" : "admin";
  if (k === "admin"){
    a.classList.add("selected"); o.classList.remove("selected");
    try{ a.setAttribute("aria-pressed","true"); o.setAttribute("aria-pressed","false"); }catch(_){}
  }else{
    o.classList.add("selected"); a.classList.remove("selected");
    try{ o.setAttribute("aria-pressed","true"); a.setAttribute("aria-pressed","false"); }catch(_){}
  }
  try{ window.__dbMenuKind = k; }catch(_){}
}

function __closeDbMenuModal__(){
  try{
    const modal = document.getElementById("dbMenuModal");
    if (modal){ modal.hidden = true; try{ modal.setAttribute("aria-hidden","true"); }catch(_){ } }
  }catch(_){}
}

function __openDbMenuModal__(){
  try{
    const modal = document.getElementById("dbMenuModal");
    const closeBtn = document.getElementById("dbMenuClose");
    const importBtn = document.getElementById("dbMenuImportBtn");
    const exportBtn = document.getElementById("dbMenuExportBtn");
    if (!modal || !importBtn || !exportBtn){
      return __openDbPopup__("admin");
    }

    // bind once
    if (!modal.__bound){
      modal.__bound = true;
      const bind = (el, fn) => { try{ if (el) bindFastTap(el, fn); }catch(_){ try{ el.addEventListener("click", fn); }catch(__){} } };

      bind(closeBtn, ()=>{ __closeDbMenuModal__(); });

      // Import/Export LOCAL (FILE OFFLINE) — solo Admin
      bind(importBtn, async ()=>{ __closeDbMenuModal__(); await __dbImport__("admin"); });
      bind(exportBtn, async ()=>{
        __closeDbMenuModal__();
        // Pre-open window to keep iOS user gesture for download (best-effort)
        let w=null; try{ w = window.open("", "_blank"); }catch(_){ w=null; }
        await __dbExport__("admin", w);
      });
      // click outside to close
      try{
        modal.addEventListener("click", (e)=>{ if (e.target === modal) __closeDbMenuModal__(); });
      }catch(_){}
    }

    modal.hidden = false;
    try{ modal.setAttribute("aria-hidden","false"); }catch(_){}
  }catch(e){
    try{ toast(e.message || String(e)); }catch(_){}
  }
}




// ===== DB Import/Export (LOCAL) =====
const __DB_EXPORT_KIND__ = "dDAE_export";
const __DB_SCHEMA_VERSION__ = 1;

function __dbTablesForKind__(kind){
  const k = String(kind || "").toLowerCase();
  return (k.startsWith("admin") ? __ADMIN_TABLES__ : __OP_TABLES__);
}

function __safeFileName__(base){
  return String(base || "backup").replace(/[^\w\-\.]+/g, "_");
}

function __dbFmtDateDdMmYy__(){
  try{
    const ts = new Date();
    const d = String(ts.getDate()).padStart(2,"0");
    const m = String(ts.getMonth()+1).padStart(2,"0");
    const y = String(ts.getFullYear()).slice(-2);
    return `${d}-${m}-${y}`;
  }catch(_){ return "00-00-00"; }
}

function __dbAccountNameForKind__(kind){
  // admin/operator name for filenames. Prefer current session username; fallback to app label.
  try{
    const k = String(kind||"").toLowerCase();
    const sess = (typeof loadSession === "function") ? loadSession() : null;
    const uname = String(sess?.username || "").trim();
    if (uname) return uname.toUpperCase();
    if (k.startsWith("admin")) return "DAEDALIUM";
    return "OPERATORE";
  }catch(_){
    return "DAEDALIUM";
  }
}




function __sessionFromUserRow__(u){
  try{
    if (!u || typeof u !== "object") return null;
    const user_id = String(u?.id || u?.user_id || u?.userId || u?.username || "").trim();
    const username = String(u?.username || u?.user || u?.email || "").trim();
    const ruoloRaw = String(u?.ruolo || u?.role || u?.tipo || "").trim().toLowerCase();
    const ruolo = ruoloRaw
      ? (ruoloRaw.startsWith("op") ? "operatore" : "admin")
      : ((String(u?.isOperatore || u?.is_operatore || "").trim() === "1" || u?.isOperatore === true) ? "operatore" : "admin");
    if (!user_id || !username) return null;
    return {
      user_id,
      username,
      ruolo,
      name: String(u?.name || u?.nome || username).trim()
    };
  }catch(_){ return null; }
}

function __mergeUsers__(existing, incoming){
  const out = [];
  const seen = new Set();
  const add = (u) => {
    if (!u || typeof u !== "object") return;
    const id = String(u.id || u.user_id || u.userId || "").trim();
    const un = String(u.username || "").trim().toLowerCase();
    const key = (id ? `id:${id}` : "") + "|" + (un ? `u:${un}` : "");
    if (key === "|" ) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(u);
  };
  try{ (Array.isArray(existing)?existing:[]).forEach(add); }catch(_){}
  try{ (Array.isArray(incoming)?incoming:[]).forEach(add); }catch(_){}
  return out;
}

async function __dbImport__(kind){
  try{
    const label = (String(kind||"").toLowerCase().startsWith("admin")) ? "DB Amministratore" : "DB Operatore";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    const file = await new Promise((resolve)=>{
      input.onchange = () => resolve((input.files && input.files[0]) ? input.files[0] : null);
      input.click();
    });

    try{ document.body.removeChild(input); }catch(_){}

    if (!file){
      try{ toast("Import annullato"); }catch(_){}
      return;
    }

    const text = await file.text();
    let data = null;
    try{ data = JSON.parse(text); }catch(e){
      try{ toast("JSON non valido", "orange"); }catch(_){}
      return;
    }

    const kindOk = String(data?.kind || "").trim() === __DB_EXPORT_KIND__;
    const sv = data?.schemaVersion;
    const svNum = (typeof sv === "number") ? sv : parseInt(String(sv||"").trim(), 10);
    const hasDatasets = data && typeof data === "object" && data.datasets && typeof data.datasets === "object";

    if (!kindOk || !hasDatasets || !(svNum >= 1)){
      try{ toast("File non compatibile", "orange"); }catch(_){}
      return;
    }


    const allowedTables = new Set(__dbTablesForKind__(kind));
    const ds = data.datasets || {};
    const tablesToWrite = Object.keys(ds).filter(t => allowedTables.has(t));

    if (!tablesToWrite.length){
      try{ toast("Nessun dataset da importare", "orange"); }catch(_){}
      return;
    }

    // Precompute auth-page imported session BEFORE writing datasets so the backup
    // gets stored in the correct account context instead of the anonymous login context.
    const __isAuthPageImport__ = String(state?.page || "").trim() === "auth";
    const __isAdminImport__ = String(kind||"").toLowerCase().startsWith("admin");
    let __authImportedSession__ = null;
    try{
      const importedUsers = Array.isArray(ds?.utenti) ? ds.utenti : [];
      if (__isAuthPageImport__ && importedUsers.length){
        const preferred = __isAdminImport__
          ? (importedUsers.find(u => !isOperatoreSession(u)) || importedUsers[0])
          : (importedUsers.find(u => isOperatoreSession(u)) || importedUsers[0]);
        __authImportedSession__ = __sessionFromUserRow__(preferred);
        if (__authImportedSession__){
          try{ state.session = __authImportedSession__; }catch(_){ }
          try{ saveSession(__authImportedSession__); }catch(_){ }
          try{ await __kvSet__("auth:lastImportedAccount", { at: __nowIso__(), username: __authImportedSession__.username || "", role: __authImportedSession__.ruolo || (__isAdminImport__ ? "admin" : "operatore") }); }catch(_){ }
        }
      }
    }catch(_){ }

    // Pre-merge "utenti" for operator import to avoid losing existing accounts
    try{
      if (!__isAdminImport__ && Array.isArray(ds?.utenti)){
        const existingUsers = await __tblGet__("utenti", []);
        ds.utenti = __mergeUsers__(existingUsers, ds.utenti);
      }
    }catch(_){ }

    // Write datasets (only allowed tables)
    for (const t of tablesToWrite){
      const v = ds[t];
      await __tblSet__(t, v);
    }

    // Ensure missing tables exist as empty (prevents UI from seeing old leftovers)
    for (const t of allowedTables){
      if (!(t in ds)){
        // non cancellare utenti/impostazioni se non presenti? per sicurezza admin/operator:
        if (t === "utenti" || t === "impostazioni") continue;
        await __tblSet__(t, []);
      }
    }

    
    // IMPORT_SESSION_RECONCILE: solo per import ADMIN (l'import operatore non deve forzare logout)
    try{
      const __isAdminImport__ = String(kind||"").toLowerCase().startsWith("admin");
      if (__isAdminImport__){
        const importedUsers = Array.isArray(ds?.utenti) ? ds.utenti : null;
        if (importedUsers){
          const sess = loadSession();
          if (sess && sess.user_id){
            const stillExists = importedUsers.some(u => String(u?.id||"") === String(sess.user_id)) || importedUsers.some(u => String(u?.username||"").trim() === String(sess?.username||"").trim());
            if (!stillExists){
              clearSession();
            }
          }
        }
      }
    }catch(_){}
    // Login import from auth page: sessione già predisposta prima della scrittura dei dataset.
    // Manteniamo qui solo un fallback difensivo per backup legacy o sessioni incomplete.
    try{
      const isAuthPage = String(state?.page || "").trim() === "auth";
      const importedUsers = Array.isArray(ds?.utenti) ? ds.utenti : [];
      if (isAuthPage && !__authImportedSession__ && importedUsers.length){
        const preferred = __isAdminImport__
          ? (importedUsers.find(u => !isOperatoreSession(u)) || importedUsers[0])
          : (importedUsers.find(u => isOperatoreSession(u)) || importedUsers[0]);
        const importedSession = __sessionFromUserRow__(preferred);
        if (importedSession){
          try{ state.session = importedSession; }catch(_){ }
          try{ saveSession(importedSession); }catch(_){ }
          try{ await __kvSet__("auth:lastImportedAccount", { at: __nowIso__(), username: importedSession.username || "", role: importedSession.ruolo || (__isAdminImport__ ? "admin" : "operatore") }); }catch(_){ }
        }
      }
    }catch(_){ }

// Mark last import
    await __kvSet__(`db:lastImport:${String(kind||"")}`, { at: __nowIso__(), fileName: file.name || "" });

    let __isAuthAutoLogin__ = false;
    try{
      __isAuthAutoLogin__ = String(state?.page || "").trim() === "auth" && !!loadSession();
      toast(__isAuthAutoLogin__ ? "Backup importato: account creato e accesso eseguito" : `${label}: import completato`, "blue");
    }catch(_){ }

    if (__isAuthAutoLogin__){
      setTimeout(()=>{
        try{
          state.session = loadSession() || state.session || null;
          state.exerciseYear = loadExerciseYear();
        }catch(_){ }
        try{ updateYearPill(); }catch(_){ }
        try{ __applyContext__({ force:true }); }catch(_){ }
        try{ applyRoleMode(); }catch(_){ }
        try{
          const __targetAfterImport__ = (state.session && isOperatoreSession(state.session)) ? "pulizie" : "home";
          __writeRestoreState({ page: __targetAfterImport__ });
        }catch(_){ }
        try{ location.reload(); }catch(__){
          try{ showPage((state.session && isOperatoreSession(state.session)) ? "pulizie" : "home"); }catch(___){}
        }
      }, 150);
      return;
    }

    setTimeout(()=>{ try{ __writeRestoreState(__captureUiState()); }catch(_){ } try{ location.reload(); }catch(_){ } }, 400);

  }catch(e){
    try{ toast("Errore import", "orange"); }catch(_){}
  }
}


async function __extractRosterNames__(data){
  try{
    if (!data || typeof data !== "object") return [];
    // direct arrays
    if (Array.isArray(data.operatori)) return data.operatori.map(x=>String(x||"").trim()).filter(Boolean).slice(0,3);
    if (Array.isArray(data.operators)) return data.operators.map(x=>String(x||"").trim()).filter(Boolean).slice(0,3);
    if (Array.isArray(data.roster)) return data.roster.map(x=>String(x||"").trim()).filter(Boolean).slice(0,3);

    // nested: { operatori: {operatore_1,...}}
    if (data.operatori && typeof data.operatori === "object" && !Array.isArray(data.operatori)){
      const o=data.operatori;
      const arr=[o.operatore_1,o.operatore_2,o.operatore_3].map(x=>String(x||"").trim()).filter(Boolean);
      if (arr.length) return arr.slice(0,3);
    }

    // db export: datasets.impostazioni row key=operatori
    const ds = data.datasets || {};
    const imp = ds.impostazioni;
    if (Array.isArray(imp)){
      const row = imp.find(r => String(r?.key || r?.Key || "").trim().toLowerCase() === "operatori");
      if (row){
        const arr=[row.operatore_1,row.operatore_2,row.operatore_3,row.Operatore_1,row.Operatore_2,row.Operatore_3].map(x=>String(x||"").trim()).filter(Boolean);
        // arr contains duplicates; keep first 3 unique in order
        const out=[];
        for (const n of arr){ if (!out.includes(n)) out.push(n); if (out.length>=3) break; }
        if (out.length) return out;
      }
    }

    // settings-like: {operatore_1,...}
    const arr=[data.operatore_1,data.operatore_2,data.operatore_3,data.Operatore_1,data.Operatore_2,data.Operatore_3].map(x=>String(x||"").trim()).filter(Boolean);
    if (arr.length){
      const out=[];
      for (const n of arr){ if (!out.includes(n)) out.push(n); if (out.length>=3) break; }
      return out;
    }
  }catch(_){ }
  return [];
}

async function __importRosterOperators__(){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);

  const file = await new Promise((resolve)=>{
    input.onchange = () => resolve((input.files && input.files[0]) ? input.files[0] : null);
    input.click();
  });

  try{ document.body.removeChild(input); }catch(_){}

  if (!file) return;

  let data = null;
  try{
    const txt = await file.text();
    data = JSON.parse(txt);
  }catch(_){
    try{ toast("File non compatibile", "orange"); }catch(__){}
    return;
  }

  const names = await __extractRosterNames__(data);
  if (!names || !names.length){
    try{ toast("Roster vuoto o non valido", "orange"); }catch(_){}
    return;
  }

  // salva nella tabella impostazioni (row key=operatori)
  try{
    await api("impostazioni", { method:"POST", body:{ operatori: names }, showLoader:true });
    try{ await ensureSettingsLoaded({ force:true, showLoader:false }); }catch(_){}
    try{ toast("Roster operatori importato", "green"); }catch(_){}
    // refresh UI (pulizie ecc.)
    try{ renderSettingsOperatorsNames?.(); }catch(_){}
    try{ if (state.page === "pulizie") renderPuliziePage?.(); }catch(_){}
  }catch(e){
    try{ toast("Errore import roster", "orange"); }catch(_){}
  }
}

async function __exportRosterOperators__(){
  try{
    await ensureSettingsLoaded({ force:false, showLoader:true });
    const names = (getOperatorNamesFromSettings ? getOperatorNamesFromSettings() : []).map(x=>String(x||"").trim()).filter(Boolean);
    if (!names.length){
      try{ toast("Nessun operatore impostato", "orange"); }catch(_){}
      return;
    }

    const payload = {
      kind: "DDAE_ROSTER_OPERATORS",
      schemaVersion: 1,
      exportedAt: __nowIso__(),
      operatori: names
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth()+1).padStart(2,"0");
    const d = String(ts.getDate()).padStart(2,"0");
    a.href = url;
    a.download = __safeFileName__(`dDAE_Roster_Operatori_${y}${m}${d}_${BUILD_VERSION}.json`);
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){}
      try{ document.body.removeChild(a); }catch(_){}
    }, 0);

    try{ toast("Roster operatori: export pronto", "blue"); }catch(_){}
  }catch(e){
    try{ toast("Errore export roster", "orange"); }catch(_){}
  }
}


async function __dbExport__(kind, preopenWin){
  try{
    const label = (String(kind||"").toLowerCase().startsWith("admin")) ? "DB Amministratore" : "DB Operatore";
    const tables = __dbTablesForKind__(kind);
    const datasets = {};
    for (const t of tables){
      datasets[t] = await __tblGet__(t, (t==="impostazioni" ? {} : []));
    }
    const payload = {
      kind: __DB_EXPORT_KIND__,
      schemaVersion: __DB_SCHEMA_VERSION__,
      exportedAt: __nowIso__(),
      datasets,
      meta: {}
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    // Nome file export: dd-mm-yyyy_nome_account.json
    const dtObj = new Date();
    const dd = String(dtObj.getDate()).padStart(2, "0");
    const mm = String(dtObj.getMonth() + 1).padStart(2, "0");
    const yyyy = String(dtObj.getFullYear());
    const dt = `${dd}-${mm}-${yyyy}`;
    let accountName = "";
    try{
      accountName =
        String(
          state?.session?.account_name ||
          state?.session?.accountName ||
          state?.session?.nome_account ||
          state?.session?.nomeAccount ||
          state?.session?.name ||
          state?.session?.username ||
          ""
        ).trim();
    }catch(_){ accountName = ""; }
    if (!accountName){
      try{
        accountName = String(
          payload?.meta?.account_name ||
          payload?.meta?.accountName ||
          ""
        ).trim();
      }catch(_){ accountName = ""; }
    }
    const accountTag = __safeFileName__(accountName || "nome_account");
    const filename = `${dt}_${accountTag}.json`;

    // iOS/Safari: se abbiamo una finestra aperta nel gesto utente, forziamo il download da lì
    if (preopenWin && typeof preopenWin === "object"){
      try{
        const doc = preopenWin.document;
        doc.open();
        doc.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,system-ui;padding:16px">
          <a id="dl" download="${filename}" href="${url}" style="display:inline-block;padding:12px 14px;border:1px solid #ccc;border-radius:10px;text-decoration:none">Download</a>
          <script>
            (function(){
              var a=document.getElementById('dl');
              try{ a.click(); }catch(e){}
              setTimeout(function(){ try{ window.close(); }catch(e){} }, 600);
            })();
          </script>
        </body></html>`);
        doc.close();
      }catch(_){ }
    }

    // iOS/PWA: per garantire il download serve un gesto utente *dopo* che il file è pronto.
    // Mostra una conferma con pulsante 'Salva' e avvia il download solo su tap.
    let doSave = true;
    try{
      const choice = await __confirmTwoActions__(`${label}: backup pronto`, "Salva", "Chiudi");
      doSave = (choice === "yes");
    }catch(_){ doSave = true; }

    if (doSave){
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      try{ a.click(); }catch(_){ }
      setTimeout(()=>{
        try{ document.body.removeChild(a); }catch(_){ }
        try{ URL.revokeObjectURL(url); }catch(_){ }
      }, 800);
      try{ toast("Backup creato", "green"); }catch(_){ }
    } else {
      try{ URL.revokeObjectURL(url); }catch(_){ }
    }

  }catch(e){
    try{ toast("Errore export", "orange"); }catch(_){}
  }
}
// ===== /DB Import/Export (LOCAL) =====


// Utility: parse importi (usato anche in guest list)
function money(v){
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (typeof v === 'string'){
    const s = v.trim().replace(/\./g,'').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

/* Audio SFX (iOS-friendly, no assets) */
const AUDIO_PREF_KEY = "ddae_audio_enabled";
let __audioEnabled = false;
let __audioCtx = null;
let __lastTapSfxAt = 0;

function __loadAudioPref(){
  try{ __audioEnabled = (localStorage.getItem(AUDIO_PREF_KEY) === "1"); }
  catch(_){ __audioEnabled = false; }
}
function __setAudioPref(v){
  __audioEnabled = !!v;
  try{ localStorage.setItem(AUDIO_PREF_KEY, __audioEnabled ? "1" : "0"); }catch(_){}
  try{
    const t = document.getElementById("audioToggle");
    if (t) t.checked = __audioEnabled;
  }catch(_){}
}
function __ensureAudioCtx(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!__audioCtx) __audioCtx = new AC();
    if (__audioCtx && __audioCtx.state === "suspended"){
      __audioCtx.resume().catch(()=>{});
    }
    return __audioCtx;
  }catch(_){ return null; }
}
function __sfxTap(){
  if (!__audioEnabled) return;
  const ctx = __ensureAudioCtx();
  if (!ctx) return;
  const __now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  if (__now - __lastTapSfxAt < 70) return;
  __lastTapSfxAt = __now;
  try{
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.03);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.06);
  }catch(_){} 
}
function __sfxGlass(){
  // "Carta stropicciata" (usato per cancellazioni/long-press)
  if (!__audioEnabled) return;
  const ctx = __ensureAudioCtx();
  if (!ctx) return;
  try{
    const sr = ctx.sampleRate || 44100;
    const dur = 0.28;
    const buf = ctx.createBuffer(1, Math.max(1, (sr * dur)|0), sr);
    const ch = buf.getChannelData(0);

    for (let i=0;i<ch.length;i++){
      const x = i / ch.length;
      const env = Math.pow(1 - x, 1.8);
      const flutter = (Math.random() < 0.18 ? 1.0 : 0.35);
      ch[i] = (Math.random()*2 - 1) * env * flutter;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(80, ctx.currentTime);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1200, ctx.currentTime);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(420, ctx.currentTime);
    bp.Q.setValueAtTime(0.8, ctx.currentTime);

    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);

    src.start(t);
    src.stop(t + dur);
  }catch(_){} 
}
function __sfxSave(){
  if (!__audioEnabled) return;
  const ctx = __ensureAudioCtx();
  if (!ctx) return;
  try{
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.setValueAtTime(180, t);
    o2.frequency.setValueAtTime(90, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.6);
    o2.stop(t + 0.6);
  }catch(_){}
}

function setupAudioUI(){
  __loadAudioPref();

  // Aggancia toggle in Impostazioni (se presente)
  try{
    const t = document.getElementById("audioToggle");
    if (t){
      t.checked = __audioEnabled;
      t.addEventListener("change", () => {
        __ensureAudioCtx(); // unlock su gesto utente
        __setAudioPref(!!t.checked);
        if (__audioEnabled) __sfxTap();
      }, { passive:true });
    }
  }catch(_){}

  // iOS: sblocca/resume AudioContext sul primo gesto (anche senza suono)
  const unlock = () => { try{ if (__audioEnabled) __ensureAudioCtx(); }catch(_){ } };
  try{ document.addEventListener("pointerdown", unlock, { capture:true, passive:true }); }catch(_){}
  try{ document.addEventListener("touchstart", unlock, { capture:true, passive:true }); }catch(_){}

  // Tap SFX: click su bottoni/icone e focus su input
  try{
    document.addEventListener("click", (e) => {
      if (!__audioEnabled) return;
      try{
        const t = e.target;
        if (!t) return;
        if (t.closest && t.closest("button, a, .icon-btn, [role='button']")) { __sfxTap(); return; }
        if (t.closest && t.closest("input, textarea, select, label")) { __sfxTap(); return; }
      }catch(_){}
    }, true);
  }catch(_){}

  try{
    let __lastFocusTapAt = 0;
    document.addEventListener("focusin", (e) => {
      if (!__audioEnabled) return;
      const now = Date.now();
      if (now - __lastFocusTapAt < 120) return;
      __lastFocusTapAt = now;
      try{
        const t = e.target;
        if (t && t.matches && t.matches("input, textarea, select")) __sfxTap();
      }catch(_){}
    }, true);
  }catch(_){}
}


// Ruoli: "user" (default) | "operatore"
function isOperatoreSession(sess){
  try{ return String(sess?.ruolo || "").trim().toLowerCase() === "operatore"; }
  catch(_){ return false; }
}

function __fitHomeSyncBtn__(){
  try{
    const bar = document.getElementById("homeSyncBar");
    const btn = document.getElementById("goDbSync");
    if (!bar || !btn) return;

    // Layout vincolato: linea sopra + tasto SYNC sotto (stack verticale).
    // Resetta eventuali override inline che potevano mettere gli elementi "affiancati".
    try{
      bar.style.display = "";
      bar.style.alignItems = "";
      bar.style.justifyContent = "";
    }catch(_){}

    try{
      btn.style.width = "";
      btn.style.marginLeft = "";
      btn.style.marginRight = "";
    }catch(_){}
  }catch(_){}
}

function applyRoleMode(){
  const isOp = !!(state && state.session && isOperatoreSession(state.session));
  try{ document.body.dataset.role = isOp ? "operatore" : "user"; }catch(_){ }
  try{
    const shoppingBtn = document.getElementById("goProdotti");
    if (shoppingBtn){
      shoppingBtn.setAttribute("aria-label", isOp ? "Lista spesa" : "Spesa");
      const shoppingLbl = shoppingBtn.querySelector(".home-main-label");
      if (shoppingLbl){
        shoppingLbl.textContent = isOp ? "Lista spesa" : "Spesa";
        shoppingLbl.classList.toggle("small", !!isOp);
      }
    }
  }catch(_){ }

  // Home: SYNC Firebase — tasto unico (Admin sempre; Operatore solo dopo collegamento Roster)
  try{
    const impTile = document.getElementById("goDbImport");
    const expTile = document.getElementById("goDbExport");
    if (impTile){ try{ impTile.hidden = true; impTile.style.display = "none"; }catch(_){ } }
    if (expTile){ try{ expTile.hidden = true; expTile.style.display = "none"; }catch(_){ } }
    const row = document.getElementById("operatorDbRow");
    if (row) row.hidden = true;

    const bar = document.getElementById("homeSyncBar");
    if (bar){
      try{ bar.hidden = false; bar.style.display = ""; }catch(_){ }
    }
  }catch(_){ }
// HOME operatore: mostra solo Pulizie / Lavanderia / Calendario / Spesa in griglia 2x2
  if (isOp){
    const hideIds = [
      "goOspite",
      "goTassaSoggiorno",
      "goStatistiche",
      "homeSettingsTop",
      "goOrePuliziaHome",
            // icone/shortcuts ospiti duplicati (se presenti)
      "goOspiti",
    ];
    hideIds.forEach((id)=>{
      const el = document.getElementById(id);
      if (!el) return;
      try{ el.hidden = true; }catch(_){ }
      try{ el.style.display = "none"; }catch(_){ }
    });


    // Impostazioni: per Operatore non mostrare il popup Database locale (solo Admin)
    try{
      const sdb = document.getElementById("settingsDbBtn");
      if (sdb){ sdb.hidden = true; try{ sdb.style.display = "none"; }catch(_){ } }
    }catch(_){}
    // Header tools: nascondi tools non consentiti
    try{ const ospitiTopTools = document.getElementById("ospitiTopTools"); if (ospitiTopTools) ospitiTopTools.hidden = true; }catch(_){ }
    try{ const speseTopTools = document.getElementById("speseTopTools"); if (speseTopTools) speseTopTools.hidden = true; }catch(_){ }
    try{ const statGenTopTools = document.getElementById("statGenTopTools"); if (statGenTopTools) statGenTopTools.hidden = true; }catch(_){ }
    try{ const statMensiliTopTools = document.getElementById("statMensiliTopTools"); if (statMensiliTopTools) statMensiliTopTools.hidden = true; }catch(_){ }
    try{ const statSpeseTopTools = document.getElementById("statSpeseTopTools"); if (statSpeseTopTools) statSpeseTopTools.hidden = true; }catch(_){ }
    try{ const statPrenTopTools = document.getElementById("statPrenTopTools"); if (statPrenTopTools) statPrenTopTools.hidden = true; }catch(_){ }
    try{ const statCancTopTools = document.getElementById("statCancTopTools"); if (statCancTopTools) statCancTopTools.hidden = true; }catch(_){ }
  }
}


function __parseBuildVersion(v){
  try{
    const m = String(v||'').match(/dDAE_(\d+)\.(\d+)/);
    if(!m) return null;
    return {maj:Number(m[1]), min:Number(m[2])};
  }catch(_){ return null; }
}
function __isRemoteNewer(remote, local){
  const r = __parseBuildVersion(remote);
  const l = __parseBuildVersion(local);
  if(!r || !l) return String(remote).trim() !== String(local).trim();
  if(r.maj !== l.maj) return r.maj > l.maj;
  return r.min > l.min;
}

// =========================
// AUTH + SESSION (dDAE_1.020)
// =========================

const __SESSION_KEY = "dDAE_session_v2";
const __YEAR_KEY = "dDAE_exerciseYear";

function loadSession(){
  try{
    const raw = localStorage.getItem(__SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.user_id) return null;
    return s;
  } catch(_){ return null; }
}

function saveSession(session){
  try{ localStorage.setItem(__SESSION_KEY, JSON.stringify(session || null)); } catch(_){ }
}

function clearSession(){
  try{ localStorage.removeItem(__SESSION_KEY); } catch(_){ }
}

function loadExerciseYear(){
  try{
    const v = String(localStorage.getItem(__YEAR_KEY) || "").trim();
    const n = Number(v);
    if (isFinite(n) && n >= 2000 && n <= 2100) return String(n);
  } catch(_){ }
  return String(new Date().getFullYear());
}

function saveExerciseYear(year){
  try{ localStorage.setItem(__YEAR_KEY, String(year || "")); } catch(_){ }
}

function __applyExerciseYearChange__(nextYear){
  const y = String(nextYear || "").trim();
  if (!y) return false;
  state.exerciseYear = y;
  saveExerciseYear(state.exerciseYear);
  updateYearPill();
  try{ __applyContext__({ force:true }); }catch(_){ }
  try{
    if (y){
      setPresetValue("ytd");
      setPeriod(`${y}-01-01`, `${y}-12-31`);
    }
  }catch(_){ }
  invalidateApiCache();
  try{ refreshHome(); }catch(_){ }
  try{ if (state.page==="spese") ensurePeriodData({showLoader:true,force:true}).then(()=>{ try{ renderSpese(); }catch(_){ } }); }catch(_){ }
  try{ if (state.page==="ospiti") ensureGuestsForPeriod(true); }catch(_){ }
  try{ if (state.page==="statistiche") loadStatistichePage({ force:true }); }catch(_){ }
  try{ if (state.page==="pulizie") loadPuliziePage(); }catch(_){ }
  try{ if (state.page==="lavanderia") loadLavanderiaPage(); }catch(_){ }
  try{ if (state.page==="calendario") renderCalendar(); }catch(_){ }
  try{ updateSettingsAccountName(); }catch(_){ }
  return true;
}

function __openSettingsYearModal__(){
  const modal = document.getElementById("settingsYearModal");
  const input = document.getElementById("settingsYearInput");
  if (!modal || !input) return;
  const current = String(state.exerciseYear || loadExerciseYear() || new Date().getFullYear());
  input.value = current;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  try{ refreshFloatingLabels(); }catch(_){ }
  try{ input.focus({ preventScroll:true }); }catch(_){ try{ input.focus(); }catch(__){ } }
  try{ input.select(); }catch(_){ }
}

function __closeSettingsYearModal__(){
  const modal = document.getElementById("settingsYearModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function __saveSettingsYearModal__(){
  const input = document.getElementById("settingsYearInput");
  const current = String(state.exerciseYear || loadExerciseYear() || new Date().getFullYear());
  const clean = String(input?.value || "").trim();
  const n = Number(clean);
  if (!Number.isInteger(n) || n < 2000 || n > 2100){
    toast("Anno non valido");
    return;
  }
  if (String(n) !== current){
    __applyExerciseYearChange__(String(n));
    toast("Anno esercizio aggiornato");
  }
  __closeSettingsYearModal__();
}

function __pickExerciseYearFromSettings__(){
  __openSettingsYearModal__();
}

// =========================
// Context change (account / anno) — reset cache + state
// =========================
function __resetInMemoryData__(){
  try{
    for (const k of Object.keys(state || {})){
      const v = state[k];
      if (!v || typeof v !== "object") continue;
      if (Array.isArray(v.items)) v.items.length = 0;
      if (Array.isArray(v.rows)) v.rows.length = 0;
      if ("loadedAt" in v) try{ v.loadedAt = 0; }catch(_){}
      if ("loaded" in v) try{ v.loaded = false; }catch(_){}
      if ("byId" in v && v.byId && typeof v.byId === "object" && !Array.isArray(v.byId)) try{ v.byId = {}; }catch(_){}
      if ("map" in v && v.map && typeof v.map === "object" && !Array.isArray(v.map)) try{ v.map = {}; }catch(_){}
      if ("cache" in v && v.cache && typeof v.cache === "object") try{ v.cache = {}; }catch(_){}
    }
  }catch(_){}
}

function __applyContext__({ force } = {}){
  try{
    const sig = __ctxSig__();
    if (force || state.__ctxSig !== sig){
      state.__ctxSig = sig;
      try{ __resetInMemoryData__(); }catch(_){}
      try{ invalidateApiCache(); }catch(_){}
    }
  }catch(_){}
}

// Cancella COMPLETAMENTE i dati locali del browser (tutti account/anni)
async function __wipeBrowserDb__(){
  try{ invalidateApiCache(); }catch(_){}
  try{ __lsClearAll(); }catch(_){}

  try{
    const toDel = [];
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(__lsPrefixBase) || k.startsWith("ddae_") || k.startsWith("dDAE_")) toDel.push(k);
    }
    toDel.forEach(k => { try{ localStorage.removeItem(k); }catch(_){ }});
  }catch(_){}

  try{ localStorage.removeItem(__SESSION_KEY); }catch(_){}
  try{ localStorage.removeItem(__YEAR_KEY); }catch(_){}

  try{
    await new Promise((resolve)=> {
      try{
        const rq = indexedDB.deleteDatabase(__IDB_NAME__);
        rq.onsuccess = () => resolve(true);
        rq.onerror = () => resolve(false);
        rq.onblocked = () => resolve(false);
      }catch(_){ resolve(false); }
    });
  }catch(_){}

  try{
    if (window.caches && caches.keys){
      const ks = await caches.keys();
      await Promise.all(ks.map(k => {
        if (k && (String(k).toLowerCase().includes("ddae") || String(k).toLowerCase().includes("daed"))) {
          return caches.delete(k);
        }
        return Promise.resolve(false);
      }));
    }
  }catch(_){}

  try{
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => {
        try{
          const url = String(r && r.active && r.active.scriptURL ? r.active.scriptURL : "");
          if (!url || url.includes("service-worker")) return r.unregister();
        }catch(_){}
        return Promise.resolve(false);
      }));
    }
  }catch(_){}
}

function formatPulizieTopbarDateIT(d){
  try{
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt)) return "";
    const wd = __capitalizeLocale__(__getWeekdayLongForLocale__(dt));
    const month = __capitalizeLocale__(dt.toLocaleDateString(__getCurrentLocale__(), { month:"long" }));
    return `${wd} ${dt.getDate()} ${month}`.trim();
  }catch(_){ return ""; }
}

function __setTopbarCenterLabel__(){
  try{
    const el = document.getElementById("topbarYear");
    if (!el) return;
    if (state && state.page === "calendario"){
      const a = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
      el.textContent = monthNameIT(a).toUpperCase();
    } else if (state && state.page === "pulizie"){
      const base = (state && state.session && isOperatoreSession(state.session)) ? new Date() : (state.cleanDay ? new Date(state.cleanDay) : new Date());
      el.textContent = formatPulizieTopbarDateIT(startOfLocalDay(base)) || "Daedalium";
    } else {
      el.textContent = "Daedalium";
    }
  }catch(_){ }
}

function updateYearPill(){
  const y = state.exerciseYear;
  const pill = document.getElementById("yearPill");
  if (pill){
    if (!y){ pill.hidden = true; }
    else{
      pill.textContent = `${y}`;
      pill.hidden = false;
    }
  }

  // Topbar: anno (default) o mese (solo Calendario)
  try{ __setTopbarCenterLabel__(); }catch(_){ }

  try{ updateSettingsTabs(); }catch(_){ }
}

function updateSettingsTabs(){
  try{
    const y = String(state.exerciseYear || loadExerciseYear() || new Date().getFullYear() || "").trim();
    const yLabel = y || "—";
    const el = document.getElementById("settingsAccountYearTab");
    if (el){
      const s = state.session || {};
      const raw = (s.username || s.user || s.nome || s.name || s.email || "").toString().trim();
      const userLabel = raw ? raw : "—";
      el.textContent = `${userLabel} - ${yLabel}`;
    }
    const yearPill = document.getElementById("settingsYearPill");
    if (yearPill) yearPill.textContent = yLabel;
  }catch(_){ }
  try{ updateSettingsAccountName(); }catch(_){ }
}

function updateSettingsAccountName(){
  try{
    const el = document.getElementById("settingsAccountName");
    if (!el) return;
    const s = state.session || {};
    const raw = String(s.accountName || s.username || s.user || s.nome || s.name || s.email || "").trim();
    el.textContent = raw || "—";
  }catch(_){ }
}


// Mostra la build a runtime (se il JS è vecchio, lo vedi subito)
(function syncBuildLabel(){
  try{
    ["buildText","settingsBuildText"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `dDAE_${BUILD_VERSION}`;
    });
    try{
      const box = document.getElementById("homeOperatorDbBox");
      if (box){
        const role = String((state && state.session && (state.session.ruolo || state.session.role || state.session.tipo || state.session.account_type)) || "").toLowerCase();
        box.hidden = !(role.includes("oper"));
      }
    }catch(_){}

  }catch(_){}
})();
// Aggiornamento "hard" anti-cache iOS:
// Legge ./version.json (sempre no-store) e se il build remoto è diverso
// svuota cache, deregistra SW e ricarica con cache-bust.
async function hardUpdateCheck(){
  try{
    const res = await fetch(`./version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const remote = String((data && (data.build || data.version || data.ver)) || "").trim();
    if (!remote || !__isRemoteNewer(remote, BUILD_VERSION)) return;

    try{ toast(`Aggiornamento ${remote}…`); } catch(_) {}

    try{
      if ("serviceWorker" in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    }catch(_){}

    try{
      if (window.caches){
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    }catch(_){}

    location.href = `./?v=${encodeURIComponent(remote)}&r=${Date.now()}`;
  }catch(_){}
}
// ===== Performance mode (iOS/Safari PWA) =====
const IS_IOS = (() => {
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
  return iOS || iPadOS;
})();

// Marca l'ambiente iOS (utile per CSS mirati)
try{ document.documentElement.classList.toggle("is-ios", IS_IOS); }catch(_){ }

function applyPerfMode(){
  try{
    const saved = localStorage.getItem("ddae_perf_mode"); // "full" | "lite"
    const mode = saved ? saved : (IS_IOS ? "lite" : "full");
    document.body.classList.toggle("perf-lite", mode === "lite");
  } catch(_){
    // fallback: su iOS attiva comunque lite
    if (IS_IOS) document.body.classList.add("perf-lite");
  }
}




// ===== Stato UI: evita "torna in HOME" quando iOS aggiorna il Service Worker =====
const __RESTORE_KEY = "__ddae_restore_state";
const __LAST_PAGE_KEY = "__ddae_last_page";
const __HASH_PREFIX = "#p=";

function __sanitizePage(p){
  try{
    if (!p) return null;
    const page = String(p).trim();
    if (!page) return null;
    const el = document.getElementById(`page-${page}`);
    return el ? page : null;
  } catch(_) { return null; }
}

function __readHashPage(){
  try{
    const h = (location.hash || "").trim();
    if (!h.startsWith(__HASH_PREFIX)) return null;
    const p = decodeURIComponent(h.slice(__HASH_PREFIX.length));
    return __sanitizePage(p);
  } catch(_) { return null; }
}

function __writeHashPage(page){
  try{
    const p = __sanitizePage(page) || "home";
    const newHash = __HASH_PREFIX + encodeURIComponent(p);
    if (location.hash !== newHash){
      history.replaceState(null, document.title, newHash);
    }
  } catch(_) {}
}

function __readRestoreState(){
  try{
    // 1) restore "one-shot" (session -> local)
    let raw = null;
    try { raw = sessionStorage.getItem(__RESTORE_KEY); } catch(_) {}
    if (!raw){
      try { raw = localStorage.getItem(__RESTORE_KEY); } catch(_) {}
    }
    if (raw){
      try { sessionStorage.removeItem(__RESTORE_KEY); } catch(_) {}
      try { localStorage.removeItem(__RESTORE_KEY); } catch(_) {}
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object"){
        if (!obj.page){
          let last = null;
          try { last = __sanitizePage(localStorage.getItem(__LAST_PAGE_KEY)); } catch(_) {}
          obj.page = __readHashPage() || last || "home";
        } else {
          obj.page = __sanitizePage(obj.page) || "home";
        }
        return obj;
      }
    }

    // 2) fallback: hash / last page (persistente)
    const pHash = __readHashPage();
    if (pHash) return { page: pHash };
    let pLast = null;
    try { pLast = __sanitizePage(localStorage.getItem(__LAST_PAGE_KEY)); } catch(_) {}
    if (pLast) return { page: pLast };
    return null;
  } catch(_) { return null; }
}

function __writeRestoreState(obj){
  const o = (obj && typeof obj === "object") ? obj : {};
  const page = __sanitizePage(o.page) || __sanitizePage(state.page) || "home";
  o.page = page;

  // 1) one-shot restore for SW reload (session + local for iOS reliability)
  try { sessionStorage.setItem(__RESTORE_KEY, JSON.stringify(o)); } catch(_) {}
  try { localStorage.setItem(__RESTORE_KEY, JSON.stringify(o)); } catch(_) {}

  // 2) persistent page memory (so even if iOS drops sessionStorage we stay on page)
  try { localStorage.setItem(__LAST_PAGE_KEY, page); } catch(_) {}
  __writeHashPage(page);
}

function __rememberPage(page){
  const p = __sanitizePage(page) || "home";
  try { localStorage.setItem(__LAST_PAGE_KEY, p); } catch(_) {}
  __writeHashPage(p);
}


// ===== Service Worker reload "safe": non interrompere i caricamenti DB =====
let __SW_RELOAD_PENDING = false;
let __SW_RELOADING = false;

function __performSwReload(){
  if (__SW_RELOADING) return;
  __SW_RELOADING = true;
  try { __writeRestoreState(__captureUiState()); } catch (_) {}
  location.reload();
}

function __requestSwReload(){
  try { __writeRestoreState(__captureUiState()); } catch (_) {}
  // Se stiamo caricando dati (API), rimanda il reload a fine richieste
  if (loadingState && loadingState.requestCount > 0){
    __SW_RELOAD_PENDING = true;
    return;
  }
  __performSwReload();
}

function __captureFormValue(id){
  try {
    const el = document.getElementById(id);
    if (!el) return null;
    return (el.type === "checkbox") ? !!el.checked : (el.value ?? "");
  } catch (_) { return null; }
}

function __applyFormValue(id, v){
  try {
    const el = document.getElementById(id);
    if (!el || v == null) return;
    if (el.type === "checkbox") el.checked = !!v;
    else el.value = String(v);
  } catch (_) {}
}

function __captureSyncRestoreState(){
  try{
    const out = __captureUiState();
    const currentPage = __sanitizePage(state.page)
      || __sanitizePage(document.body?.dataset?.page)
      || __readHashPage()
      || "home";
    out.page = currentPage;
    return out;
  }catch(_){
    return { page: (__sanitizePage(state.page) || "home") };
  }
}

function __captureUiState(){
  // IMPORTANT:
  // Salviamo lo stato della scheda ospite SOLO se l'utente e' davvero nella pagina "ospite".
  // Su iOS/PWA un reload/restore puo' riportare in primo piano una scheda vecchia (mode/view + layout diverso)
  // anche se non e' stata richiamata.
  const shouldPersistGuest = (state.page === "ospite");

  const out = {
    page: state.page || "home",
    period: state.period || { from:"", to:"" },
    preset: state.periodPreset || "this_month",
    guest: shouldPersistGuest ? {
      mode: state.guestMode || "create",
      editId: state.guestEditId || null,
      depositType: state.guestDepositType || "contante",
      saldoType: state.guestSaldoType || "contante",
      depositReceipt: !!state.guestDepositReceipt,
      saldoReceipt: !!state.guestSaldoReceipt,
      marriage: !!state.guestMarriage,
      group: !!state.guestGroup,
      colc: !!state.guestColC,
      rooms: Array.from(state.guestRooms || []),
      lettiPerStanza: state.lettiPerStanza || {},
      form: {
        guestName: __captureFormValue("guestName"),
        guestAdults: __captureFormValue("guestAdults"),
        guestKidsU10: __captureFormValue("guestKidsU10"),
        guestCheckIn: __captureFormValue("guestCheckIn"),
        guestCheckOut: __captureFormValue("guestCheckOut"),
        guestTotal: __captureFormValue("guestTotal"),
        guestChannel: __captureFormValue("guestChannel"),
        guestChannelCommission: __captureFormValue("guestChannelCommission"),
        guestBooking: __captureFormValue("guestBooking"),
        guestDeposit: __captureFormValue("guestDeposit"),
        guestSaldo: __captureFormValue("guestSaldo"),
      }
    } : null,
    calendar: {
      anchor: (state.calendar && state.calendar.anchor) ? toISO(state.calendar.anchor) : ""
    }
  };
  return out;
}

function __applyUiState(restore){
  if (!restore || typeof restore !== "object") return;

  try {
    // periodo
    const p = restore.period || null;
    if (p && p.from && p.to) {
      setPeriod(p.from, p.to);
    }

    if (restore.preset) setPresetValue(restore.preset);

    // calendario
    if (restore.calendar?.anchor) {
      if (!state.calendar) state.calendar = { anchor: new Date(), ready:false, guests:[], rangeKey:"" };
      state.calendar.anchor = new Date(restore.calendar.anchor + "T00:00:00");
      state.calendar.ready = false;
    }

    // ospite (solo se eri in quella sezione)
    if (restore.guest) {
      state.guestMode = restore.guest.mode || state.guestMode;
      state.guestEditId = restore.guest.editId || state.guestEditId;
      state.guestDepositType = restore.guest.depositType || state.guestDepositType;
      state.guestSaldoType = restore.guest.saldoType || state.guestSaldoType;
      state.guestDepositReceipt = !!restore.guest.depositReceipt;
      state.guestSaldoReceipt = !!restore.guest.saldoReceipt;
      state.guestMarriage = !!restore.guest.marriage;
      state.guestGroup = !!(restore.guest.group);
      state.guestColC = !!(restore.guest.colc);

      // stanze selezionate
      try {
        state.guestRooms = new Set((restore.guest.rooms || []).map(n=>parseInt(n,10)).filter(n=>isFinite(n)));
        state.lettiPerStanza = restore.guest.lettiPerStanza || {};
      } catch (_) {}

      // campi form
      const f = restore.guest.form || {};
      __applyFormValue("guestName", f.guestName);
      __applyFormValue("guestAdults", f.guestAdults);
      __applyFormValue("guestKidsU10", f.guestKidsU10);
      __applyFormValue("guestCheckIn", f.guestCheckIn);
      __applyFormValue("guestCheckOut", f.guestCheckOut);
      __applyFormValue("guestTotal", f.guestTotal);
      __applyFormValue("guestChannel", f.guestChannel);
      __applyFormValue("guestChannelCommission", f.guestChannelCommission);
      __applyFormValue("guestBooking", f.guestBooking);
      try { applySelectedChannelToGuestForm(f.guestChannel, { preserveManual:true }); } catch (_) {}
      __applyFormValue("guestDeposit", f.guestDeposit);
      __applyFormValue("guestSaldo", f.guestSaldo);
      try { updateGuestRemaining(); } catch (_) {}

      // UI rooms + pills
      try {
        document.querySelectorAll("#roomsPicker .room-dot").forEach(btn => {
          const n = parseInt(btn.getAttribute("data-room"), 10);
          const on = state.guestRooms.has(n);
          btn.classList.toggle("selected", on);
          btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
      } catch (_) {}
      try { setPayType("depositType", state.guestDepositType); } catch (_) {}
      try { setPayType("saldoType", state.guestSaldoType); } catch (_) {}
      try { setPayReceipt("depositType", state.guestDepositReceipt); } catch (_) {}
      try { setPayReceipt("saldoType", state.guestSaldoReceipt); } catch (_) {}
      try { setMarriage(state.guestMarriage);
    setGroup(state.guestGroup);
    setColC(state.guestColC); } catch (_) {}
      try { setGroup(state.guestGroup); } catch (_) {}
    }

  } catch (_) {}
}


function genId(prefix){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
}

const $ = (sel) => document.querySelector(sel);

function setMarriage(on){
  state.guestMarriage = !!on;
  const btn = document.getElementById("roomMarriage");
  if (!btn) return;
  btn.classList.toggle("selected", state.guestMarriage);
  btn.setAttribute("aria-pressed", state.guestMarriage ? "true" : "false");
}

function setGroup(on){
  state.guestGroup = !!on;
  const btn = document.getElementById("roomGroup");
  if (!btn) return;
  btn.classList.toggle("selected", state.guestGroup);
  btn.setAttribute("aria-pressed", state.guestGroup ? "true" : "false");
}


function setColC(on){
  state.guestColC = !!on;
  const btn = document.getElementById("roomColC");
  if (!btn) return;
  btn.classList.toggle("selected", state.guestColC);
  btn.setAttribute("aria-pressed", state.guestColC ? "true" : "false");
}



function setPayType(containerId, type){
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const t = (type || "contante").toString().toLowerCase();
  wrap.querySelectorAll(".pay-dot[data-type]").forEach(b => {
    const v = (b.getAttribute("data-type") || "").toLowerCase();
    const on = v === t;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}


function setPayReceipt(containerId, on){
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const btn = wrap.querySelector('.pay-dot[data-receipt]');
  if (!btn) return;
  const active = !!on;
  btn.classList.toggle("selected", active);
  btn.setAttribute("aria-pressed", active ? "true" : "false");
}



function setRegFlag(containerId, flag, on){
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const btn = wrap.querySelector(`.pay-dot[data-flag="${flag}"]`);
  if (!btn) return;
  const active = !!on;
  btn.classList.toggle("selected", active);
  btn.setAttribute("aria-pressed", active ? "true" : "false");
}

function setRegFlags(containerId, psOn, istatOn){
  setRegFlag(containerId, "ps", psOn);
  setRegFlag(containerId, "istat", istatOn);
}

function truthy(v){
  if (v === true) return true;
  if (v === false || v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return (s === "1" || s === "true" || s === "yes" || s === "si" || s === "on");
}

// dDAE_1.020 — error overlay: evita blocchi silenziosi su iPhone PWA
window.addEventListener("error", (e) => {
  try {
    const msg = (e?.message || "Errore JS") + (e?.filename ? ` @ ${e.filename.split("/").pop()}:${e.lineno||0}` : "");
    console.error("JS error", e?.error || e);
    toast(msg);
  } catch (_) {}
});
window.addEventListener("unhandledrejection", (e) => {
  try {
    console.error("Unhandled promise rejection", e?.reason || e);
    const msg = (e?.reason?.message || e?.reason || "Promise rejection").toString();
    toast("Errore: " + msg);
  } catch (_) {}
});

const state = {
  navId: 0,
  cleanDay: null,

  motivazioni: [],
  spese: [],
  report: null,
  _dataKey: "",
  period: { from: "", to: "" },
  deletedGuests: [],
  periodPreset: "this_month",
  page: "home",
  speseView: "list",
  guests: [],
  stanzeRows: [],
  stanzeByKey: {},
  guestRooms: new Set(),
  guestDepositType: "contante",

  // HOME: ricevute mancanti (check a ogni riavvio)
  pendingReceipts: [],
  pendingReceiptsGuests: [],
  pendingReceiptsCount: 0,

  guestEditId: null,
  guestMode: "create",
  lettiPerStanza: {},
    bedsDirty: false,
  stanzeSnapshotOriginal: "",
guestMarriage: false,
  guestGroup: false,
  guestColC: false,
  guestSaldoType: "contante",
  guestPSRegistered: false,
  guestISTATRegistered: false,
  // Scheda ospite (sola lettura): ultimo ospite aperto
  guestViewItem: null,

  // Servizi (scheda ospite)
  guestServicesItems: [],
  guestServicesComputedTotal: 0,
  guestServicesManualOverride: false,
  guestServicesLoadedFor: null,
  guestServicesCacheById: {},


  // Lavanderia (resoconti settimanali)
  laundry: { list: [], current: null },
  // Impostazioni (foglio "impostazioni")
  settings: { loaded: false, byKey: {}, rows: [], loadedAt: 0 },

  // Colazione (lista spesa permanente)
  colazione: { loaded: false, loadedAt: 0, items: [] },

  // Prodotti pulizia (lista spesa permanente)
  prodotti_pulizia: { loaded: false, loadedAt: 0, items: [] },

  // UI prodotti
  prodottiUI: { list: "colazione", sort: "frequent" },

  // Auth/session + anno esercizio
  session: null,
  exerciseYear: null,
};

const COLORS = {
  CONTANTI: "#2b7cb4",          // palette
  TASSA_SOGGIORNO: "#bfbea9",   // palette
  IVA_22: "#c9772b",            // palette
  IVA_10: "#6fb7d6",            // palette
  IVA_4: "#4d9cc5",             // palette
};


// Loader globale (gestisce richieste parallele + anti-flicker)
const loadingState = {
  requestCount: 0,
  showTimer: null,
  hideTimer: null,
  shownAt: 0,
  isVisible: false,
  delayMs: 800,       // evita loader per richieste brevi
  minVisibleMs: 450,  // se compare, resta un minimo (evita “lampeggi”)
  hideGraceMs: 260,   // unisce richieste sequenziali (evita molte comparse)
};


// ===== Sync LED (read/write) =====
const __syncState = { reads: 0, writes: 0 };

function __syncLedUpdate(){
  const elRead = document.getElementById("dbLedRead");
  const elWrite = document.getElementById("dbLedWrite");

  const w = __syncState.writes|0;
  const r = __syncState.reads|0;

  if (elRead) elRead.classList.toggle("is-on", r > 0);
  if (elWrite) elWrite.classList.toggle("is-on", w > 0);

  // Compat (se esiste ancora in vecchi markup)
  const legacy = document.getElementById("syncLed");
  if (legacy){
    const mode = (w>0) ? "write" : (r>0 ? "read" : "off");
    legacy.setAttribute("data-sync", mode);
  }
}

function __syncLedBegin(method){
  const m = String(method||"GET").toUpperCase();
  if (m === "GET") __syncState.reads += 1;
  else __syncState.writes += 1;
  __syncLedUpdate();
}
function __syncLedEnd(method){
  const m = String(method||"GET").toUpperCase();
  if (m === "GET") __syncState.reads = Math.max(0, (__syncState.reads|0) - 1);
  else __syncState.writes = Math.max(0, (__syncState.writes|0) - 1);
  __syncLedUpdate();
}

function showLoading(){
  // Loader overlay disabilitato: usiamo LED sync in topbar
  try{ const ov = document.getElementById("loadingOverlay"); if (ov) ov.hidden = true; }catch(_){}
  loadingState.isVisible = false;
}

function hideLoading(){
  try{ const ov = document.getElementById("loadingOverlay"); if (ov) ov.hidden = true; }catch(_){}
  loadingState.isVisible = false;
}

function beginRequest(){
  loadingState.requestCount += 1;
  if (loadingState.requestCount !== 1) return;

  // Se stavamo per nascondere il loader, annulla: richieste ravvicinate = una sola sessione di loading
  if (loadingState.hideTimer){
    clearTimeout(loadingState.hideTimer);
    loadingState.hideTimer = null;
  }

  // Programma la comparsa dopo delayMs
  if (loadingState.showTimer) clearTimeout(loadingState.showTimer);
  loadingState.showTimer = setTimeout(() => {
    if (loadingState.requestCount > 0 && !loadingState.isVisible) {
      showLoading();
    }
  }, loadingState.delayMs);
}

function endRequest(){
  loadingState.requestCount = Math.max(0, loadingState.requestCount - 1);
  if (loadingState.requestCount !== 0) return;

  if (loadingState.showTimer) {
    clearTimeout(loadingState.showTimer);
    loadingState.showTimer = null;
  }

  // Se il SW ha chiesto un reload mentre caricavamo, fallo ora che siamo "idle"
  if (__SW_RELOAD_PENDING && !__SW_RELOADING){
    __SW_RELOAD_PENDING = false;
    // micro-delay: lascia aggiornare UI/loader
    setTimeout(() => __performSwReload(), 50);
    // non serve gestire ulteriormente il loader
    return;
  }

  // Se non è mai comparso, fine.
  if (!loadingState.isVisible) return;

  const elapsed = performance.now() - (loadingState.shownAt || performance.now());
  const minRemain = loadingState.minVisibleMs - elapsed;
  const delay = Math.max(loadingState.hideGraceMs || 0, minRemain > 0 ? minRemain : 0);

  if (loadingState.hideTimer) {
    clearTimeout(loadingState.hideTimer);
    loadingState.hideTimer = null;
  }

  loadingState.hideTimer = setTimeout(() => {
    loadingState.hideTimer = null;
    if (loadingState.requestCount === 0) hideLoading();
  }, delay);
}

function euro(n){
  const x = Number(n || 0);
  try{ return x.toLocaleString(__getCurrentLocale__(), { style:"currency", currency:"EUR" }); }catch(_){ return `${(Math.round(x * 100) / 100).toFixed(2)} €`; }
}

let __toastTimer = null;
function toast(msg, kind){
  const t = $("#toast");
  if (!t) return;
  try{ msg = __translateText__ ? __translateText__(msg) : msg; }catch(_){ }
  t.textContent = msg;
  // kind: "blue" | "orange" | "" (default)
  t.dataset.kind = kind ? String(kind) : "";
  t.classList.add("show");
  try{ if (__toastTimer) clearTimeout(__toastTimer); }catch(_ ){}
  __toastTimer = setTimeout(() => {
    t.classList.remove("show");
    t.dataset.kind = "";
  }, 1700);
}


const __I18N_STORAGE_KEY__ = "ddae:app-language";
const __I18N_LOCALES__ = { it:"it-IT", en:"en-GB", fr:"fr-FR", de:"de-DE", es:"es-ES" };
let __appLanguage__ = "it";
let __applyingLanguage__ = false;
let __languageObserver__ = null;
let __MONTHS_IT = [];
const __I18N_PHRASES__ = {
  "crea account": {
    "en": "create account",
    "fr": "créer un compte",
    "de": "Konto erstellen",
    "es": "crear cuenta"
  },
  "modifica account": {
    "en": "edit account",
    "fr": "modifier le compte",
    "de": "Konto bearbeiten",
    "es": "editar cuenta"
  },
  "amministratore": {
    "en": "administrator",
    "fr": "administrateur",
    "de": "Administrator",
    "es": "administrador"
  },
  "operatore": {
    "en": "operator",
    "fr": "opérateur",
    "de": "Mitarbeiter",
    "es": "operador"
  },
  "Struttura": {
    "en": "Property",
    "fr": "Structure",
    "de": "Unterkunft",
    "es": "Alojamiento"
  },
  "Ricorda struttura": {
    "en": "Remember property",
    "fr": "Mémoriser la structure",
    "de": "Unterkunft merken",
    "es": "Recordar alojamiento"
  },
  "Username": {
    "en": "Username",
    "fr": "Nom d'utilisateur",
    "de": "Benutzername",
    "es": "Usuario"
  },
  "Password": {
    "en": "Password",
    "fr": "Mot de passe",
    "de": "Passwort",
    "es": "Contraseña"
  },
  "Conferma password": {
    "en": "Confirm password",
    "fr": "Confirmer le mot de passe",
    "de": "Passwort bestätigen",
    "es": "Confirmar contraseña"
  },
  "Nuova password": {
    "en": "New password",
    "fr": "Nouveau mot de passe",
    "de": "Neues Passwort",
    "es": "Nueva contraseña"
  },
  "Conferma nuova password": {
    "en": "Confirm new password",
    "fr": "Confirmer le nouveau mot de passe",
    "de": "Neues Passwort bestätigen",
    "es": "Confirmar nueva contraseña"
  },
  "Nome": {
    "en": "Name",
    "fr": "Nom",
    "de": "Name",
    "es": "Nombre"
  },
  "Telefono": {
    "en": "Phone",
    "fr": "Téléphone",
    "de": "Telefon",
    "es": "Teléfono"
  },
  "Email": {
    "en": "Email",
    "fr": "E-mail",
    "de": "E-Mail",
    "es": "Correo"
  },
  "indietro": {
    "en": "back",
    "fr": "retour",
    "de": "zurück",
    "es": "volver"
  },
  "continua": {
    "en": "continue",
    "fr": "continuer",
    "de": "weiter",
    "es": "continuar"
  },
  "Ospiti": {
    "en": "Guests",
    "fr": "Clients",
    "de": "Gäste",
    "es": "Huéspedes"
  },
  "Calendario": {
    "en": "Calendar",
    "fr": "Calendrier",
    "de": "Kalender",
    "es": "Calendario"
  },
  "Spese": {
    "en": "Expenses",
    "fr": "Dépenses",
    "de": "Ausgaben",
    "es": "Gastos"
  },
  "Tassa": {
    "en": "Tax",
    "fr": "Taxe",
    "de": "Steuer",
    "es": "Tasa"
  },
  "Pulizie": {
    "en": "Cleaning",
    "fr": "Ménage",
    "de": "Reinigung",
    "es": "Limpieza"
  },
  "Lavanderia": {
    "en": "Laundry",
    "fr": "Blanchisserie",
    "de": "Wäscherei",
    "es": "Lavandería"
  },
  "Ore Pulizia": {
    "en": "Cleaning Hours",
    "fr": "Heures de ménage",
    "de": "Reinigungsstunden",
    "es": "Horas de limpieza"
  },
  "Ore Pulizia Mensili": {
    "en": "Monthly Cleaning Hours",
    "fr": "Heures de ménage mensuelles",
    "de": "Monatliche Reinigungsstunden",
    "es": "Horas de limpieza mensuales"
  },
  "Statistiche": {
    "en": "Stats",
    "fr": "Statistiques",
    "de": "Statistiken",
    "es": "Estadísticas"
  },
  "Spesa": {
    "en": "Shopping",
    "fr": "Achats",
    "de": "Einkauf",
    "es": "Compras"
  },
  "IMPORTA": {
    "en": "IMPORT",
    "fr": "IMPORTER",
    "de": "IMPORT",
    "es": "IMPORTAR"
  },
  "ESPORTA": {
    "en": "EXPORT",
    "fr": "EXPORTER",
    "de": "EXPORT",
    "es": "EXPORTAR"
  },
  "Lista della spesa": {
    "en": "Shopping List",
    "fr": "Liste des achats",
    "de": "Einkaufsliste",
    "es": "Lista de compras"
  },
  "Colazione": {
    "en": "Breakfast",
    "fr": "Petit-déjeuner",
    "de": "Frühstück",
    "es": "Desayuno"
  },
  "Prodotti": {
    "en": "Products",
    "fr": "Produits",
    "de": "Produkte",
    "es": "Productos"
  },
  "Aggiungi prodotto": {
    "en": "Add product",
    "fr": "Ajouter un produit",
    "de": "Produkt hinzufügen",
    "es": "Añadir producto"
  },
  "Generali": {
    "en": "General",
    "fr": "Générales",
    "de": "Allgemein",
    "es": "Generales"
  },
  "Mensili": {
    "en": "Monthly",
    "fr": "Mensuelles",
    "de": "Monatlich",
    "es": "Mensuales"
  },
  "Grafici": {
    "en": "Charts",
    "fr": "Graphiques",
    "de": "Diagramme",
    "es": "Gráficos"
  },
  "Piscina": {
    "en": "Pool",
    "fr": "Piscine",
    "de": "Pool",
    "es": "Piscina"
  },
  "Cancellazioni": {
    "en": "Cancellations",
    "fr": "Annulations",
    "de": "Stornierungen",
    "es": "Cancelaciones"
  },
  "Impostazioni": {
    "en": "Settings",
    "fr": "Paramètres",
    "de": "Einstellungen",
    "es": "Ajustes"
  },
  "AUDIO": {
    "en": "AUDIO",
    "fr": "AUDIO",
    "de": "AUDIO",
    "es": "AUDIO"
  },
  "Anno": {
    "en": "Year",
    "fr": "Année",
    "de": "Jahr",
    "es": "Año"
  },
  "Backup": {
    "en": "Backup",
    "fr": "Sauvegarde",
    "de": "Backup",
    "es": "Copia de seguridad"
  },
  "Stanze": {
    "en": "Rooms",
    "fr": "Chambres",
    "de": "Zimmer",
    "es": "Habitaciones"
  },
  "Operatori": {
    "en": "Operators",
    "fr": "Opérateurs",
    "de": "Mitarbeiter",
    "es": "Operadores"
  },
  "Channel": {
    "en": "Channel",
    "fr": "Canal",
    "de": "Kanal",
    "es": "Canal"
  },
  "Tassa Sogg...": {
    "en": "Tourist Tax",
    "fr": "Taxe séjour",
    "de": "Kurtaxe",
    "es": "Tasa turíst."
  },
  "Codice Ope...": {
    "en": "Operator Code",
    "fr": "Code op.",
    "de": "Mitarbeiter-Code",
    "es": "Código op."
  },
  "Lingua": {
    "en": "Language",
    "fr": "Langue",
    "de": "Sprache",
    "es": "Idioma"
  },
  "Logout": {
    "en": "Logout",
    "fr": "Déconnexion",
    "de": "Abmelden",
    "es": "Cerrar sesión"
  },
  "Tassa di soggiorno": {
    "en": "Tourist Tax",
    "fr": "Taxe de séjour",
    "de": "Kurtaxe",
    "es": "Tasa turística"
  },
  "Stima": {
    "en": "Estimate",
    "fr": "Estimation",
    "de": "Schätzung",
    "es": "Estimación"
  },
  "Da": {
    "en": "From",
    "fr": "De",
    "de": "Von",
    "es": "Desde"
  },
  "A": {
    "en": "To",
    "fr": "À",
    "de": "Bis",
    "es": "Hasta"
  },
  "Totale tassa": {
    "en": "Total tax",
    "fr": "Taxe totale",
    "de": "Gesamtsteuer",
    "es": "Impuesto total"
  },
  "Ospiti paganti": {
    "en": "Paying guests",
    "fr": "Clients payants",
    "de": "Zahlende Gäste",
    "es": "Huéspedes que pagan"
  },
  "Bambini (<10)": {
    "en": "Children (<10)",
    "fr": "Enfants (<10)",
    "de": "Kinder (<10)",
    "es": "Niños (<10)"
  },
  "Altri (ridotti)": {
    "en": "Others (reduced)",
    "fr": "Autres (réduit)",
    "de": "Andere (ermäßigt)",
    "es": "Otros (reducidos)"
  },
  "Inserisci spesa": {
    "en": "Add expense",
    "fr": "Ajouter une dépense",
    "de": "Ausgabe erfassen",
    "es": "Añadir gasto"
  },
  "Motivazione": {
    "en": "Reason",
    "fr": "Motif",
    "de": "Grund",
    "es": "Motivo"
  },
  "Data": {
    "en": "Date",
    "fr": "Date",
    "de": "Datum",
    "es": "Fecha"
  },
  "Seleziona…": {
    "en": "Select…",
    "fr": "Sélectionner…",
    "de": "Auswählen…",
    "es": "Selecciona…"
  },
  "Categoria": {
    "en": "Category",
    "fr": "Catégorie",
    "de": "Kategorie",
    "es": "Categoría"
  },
  "Salva": {
    "en": "Save",
    "fr": "Enregistrer",
    "de": "Speichern",
    "es": "Guardar"
  },
  "Nessun operatore inserito": {
    "en": "No operator added",
    "fr": "Aucun opérateur saisi",
    "de": "Kein Mitarbeiter vorhanden",
    "es": "No hay operadores"
  },
  "Nessun channel inserito": {
    "en": "No channel added",
    "fr": "Aucun canal saisi",
    "de": "Kein Kanal vorhanden",
    "es": "No hay canales"
  },
  "Componenti lavanderia": {
    "en": "Laundry Components",
    "fr": "Composants blanchisserie",
    "de": "Wäscherei-Komponenten",
    "es": "Componentes de lavandería"
  },
  "Nessun componente lavanderia inserito": {
    "en": "No laundry component added",
    "fr": "Aucun composant blanchisserie saisi",
    "de": "Keine Wäscherei-Komponente vorhanden",
    "es": "No hay componentes de lavandería"
  },
  "Ordina: data": {
    "en": "Sort: date",
    "fr": "Trier : date",
    "de": "Sortieren: Datum",
    "es": "Ordenar: fecha"
  },
  "Ordina: inserimento": {
    "en": "Sort: entry",
    "fr": "Trier : saisie",
    "de": "Sortieren: Eingabe",
    "es": "Ordenar: ingreso"
  },
  "Ordina: motivazione": {
    "en": "Sort: reason",
    "fr": "Trier : motif",
    "de": "Sortieren: Grund",
    "es": "Ordenar: motivo"
  },
  "Nuovo ospite": {
    "en": "New guest",
    "fr": "Nouveau client",
    "de": "Neuer Gast",
    "es": "Nuevo huésped"
  },
  "Modifica": {
    "en": "Edit",
    "fr": "Modifier",
    "de": "Bearbeiten",
    "es": "Editar"
  },
  "Elimina": {
    "en": "Delete",
    "fr": "Supprimer",
    "de": "Löschen",
    "es": "Eliminar"
  },
  "Nome ospite": {
    "en": "Guest name",
    "fr": "Nom du client",
    "de": "Name des Gasts",
    "es": "Nombre del huésped"
  },
  "Adulti": {
    "en": "Adults",
    "fr": "Adultes",
    "de": "Erwachsene",
    "es": "Adultos"
  },
  "Bambini < 10": {
    "en": "Children < 10",
    "fr": "Enfants < 10",
    "de": "Kinder < 10",
    "es": "Niños < 10"
  },
  "Check-in": {
    "en": "Check-in",
    "fr": "Arrivée",
    "de": "Check-in",
    "es": "Check-in"
  },
  "Check-out": {
    "en": "Check-out",
    "fr": "Départ",
    "de": "Check-out",
    "es": "Check-out"
  },
  "Note": {
    "en": "Notes",
    "fr": "Notes",
    "de": "Notizen",
    "es": "Notas"
  },
  "Servizi": {
    "en": "Services",
    "fr": "Services",
    "de": "Services",
    "es": "Servicios"
  },
  "Oggi": {
    "en": "Today",
    "fr": "Aujourd'hui",
    "de": "Heute",
    "es": "Hoy"
  },
  "Matrimoniale": {
    "en": "Double",
    "fr": "Double",
    "de": "Doppelbett",
    "es": "Doble"
  },
  "Singolo": {
    "en": "Single",
    "fr": "Simple",
    "de": "Einzelbett",
    "es": "Individual"
  },
  "Culla": {
    "en": "Cot",
    "fr": "Berceau",
    "de": "Kinderbett",
    "es": "Cuna"
  },
  "Chiudi": {
    "en": "Close",
    "fr": "Fermer",
    "de": "Schließen",
    "es": "Cerrar"
  },
  "Annulla": {
    "en": "Cancel",
    "fr": "Annuler",
    "de": "Abbrechen",
    "es": "Cancelar"
  },
  "Conferma": {
    "en": "Confirm",
    "fr": "Confirmer",
    "de": "Bestätigen",
    "es": "Confirmar"
  },
  "Importa": {
    "en": "Import",
    "fr": "Importer",
    "de": "Importieren",
    "es": "Importar"
  },
  "Esporta": {
    "en": "Export",
    "fr": "Exporter",
    "de": "Exportieren",
    "es": "Exportar"
  },
  "Nuovo channel": {
    "en": "New channel",
    "fr": "Nouveau canal",
    "de": "Neuer Kanal",
    "es": "Nuevo canal"
  },
  "Nome channel": {
    "en": "Channel name",
    "fr": "Nom du canal",
    "de": "Kanalname",
    "es": "Nombre del canal"
  },
  "Commissione (%)": {
    "en": "Commission (%)",
    "fr": "Commission (%)",
    "de": "Provision (%)",
    "es": "Comisión (%)"
  },
  "Iniziale": {
    "en": "Initial",
    "fr": "Initiale",
    "de": "Initiale",
    "es": "Inicial"
  },
  "Tag colore": {
    "en": "Color tag",
    "fr": "Étiquette couleur",
    "de": "Farbetikett",
    "es": "Etiqueta de color"
  },
  "Nuovo operatore": {
    "en": "New operator",
    "fr": "Nouvel opérateur",
    "de": "Neuer Mitarbeiter",
    "es": "Nuevo operador"
  },
  "Nome operatore": {
    "en": "Operator name",
    "fr": "Nom de l'opérateur",
    "de": "Name des Mitarbeiters",
    "es": "Nombre del operador"
  },
  "Tariffa (€ / ora)": {
    "en": "Rate (€ / hour)",
    "fr": "Tarif (€ / heure)",
    "de": "Satz (€ / Stunde)",
    "es": "Tarifa (€ / hora)"
  },
  "Benzina (€)": {
    "en": "Fuel (€)",
    "fr": "Carburant (€)",
    "de": "Kraftstoff (€)",
    "es": "Combustible (€)"
  },
  "Nuovo componente lavanderia": {
    "en": "New laundry component",
    "fr": "Nouveau composant blanchisserie",
    "de": "Neue Wäscherei-Komponente",
    "es": "Nuevo componente de lavandería"
  },
  "Titolo componente": {
    "en": "Component title",
    "fr": "Titre du composant",
    "de": "Komponententitel",
    "es": "Título del componente"
  },
  "Abbreviazione": {
    "en": "Abbreviation",
    "fr": "Abréviation",
    "de": "Abkürzung",
    "es": "Abreviatura"
  },
  "Prezzo pulizia (€)": {
    "en": "Cleaning price (€)",
    "fr": "Prix nettoyage (€)",
    "de": "Reinigungspreis (€)",
    "es": "Precio de limpieza (€)"
  },
  "Azzurro": {
    "en": "Sky blue",
    "fr": "Bleu ciel",
    "de": "Hellblau",
    "es": "Azul cielo"
  },
  "Arancione": {
    "en": "Orange",
    "fr": "Orange",
    "de": "Orange",
    "es": "Naranja"
  },
  "Verde": {
    "en": "Green",
    "fr": "Vert",
    "de": "Grün",
    "es": "Verde"
  },
  "Rosso": {
    "en": "Red",
    "fr": "Rouge",
    "de": "Rot",
    "es": "Rojo"
  },
  "Viola": {
    "en": "Purple",
    "fr": "Violet",
    "de": "Lila",
    "es": "Morado"
  },
  "Sabbia": {
    "en": "Sand",
    "fr": "Sable",
    "de": "Sand",
    "es": "Arena"
  },
  "Tariffa": {
    "en": "Rate",
    "fr": "Tarif",
    "de": "Satz",
    "es": "Tarifa"
  },
  "Benzina": {
    "en": "Fuel",
    "fr": "Carburant",
    "de": "Kraftstoff",
    "es": "Combustible"
  },
  "Modifica operatore": {
    "en": "Edit operator",
    "fr": "Modifier l'opérateur",
    "de": "Mitarbeiter bearbeiten",
    "es": "Editar operador"
  },
  "Eliminare questo operatore?": {
    "en": "Delete this operator?",
    "fr": "Supprimer cet opérateur ?",
    "de": "Diesen Mitarbeiter löschen?",
    "es": "¿Eliminar este operador?"
  },
  "Inserisci il nome operatore": {
    "en": "Enter the operator name",
    "fr": "Saisissez le nom de l'opérateur",
    "de": "Namen des Mitarbeiters eingeben",
    "es": "Introduce el nombre del operador"
  },
  "Tariffa non valida": {
    "en": "Invalid rate",
    "fr": "Tarif non valide",
    "de": "Ungültiger Satz",
    "es": "Tarifa no válida"
  },
  "Benzina non valida": {
    "en": "Invalid fuel amount",
    "fr": "Montant carburant non valide",
    "de": "Ungültiger Kraftstoffwert",
    "es": "Importe de combustible no válido"
  },
  "Operatore salvato": {
    "en": "Operator saved",
    "fr": "Opérateur enregistré",
    "de": "Mitarbeiter gespeichert",
    "es": "Operador guardado"
  },
  "Operatore eliminato": {
    "en": "Operator deleted",
    "fr": "Opérateur supprimé",
    "de": "Mitarbeiter gelöscht",
    "es": "Operador eliminado"
  },
  "Nessun dato": {
    "en": "No data",
    "fr": "Aucune donnée",
    "de": "Keine Daten",
    "es": "Sin datos"
  },
  "Ricevute mancanti": {
    "en": "Missing receipts",
    "fr": "Reçus manquants",
    "de": "Fehlende Belege",
    "es": "Recibos faltantes"
  },
  "Calendario settimanale": {
    "en": "Weekly calendar",
    "fr": "Calendrier hebdomadaire",
    "de": "Wochenkalender",
    "es": "Calendario semanal"
  },
  "Calendario mensile": {
    "en": "Monthly calendar",
    "fr": "Calendrier mensuel",
    "de": "Monatskalender",
    "es": "Calendario mensual"
  },
  "Forza lettura database": {
    "en": "Force database refresh",
    "fr": "Forcer la lecture de la base",
    "de": "Datenbank neu laden",
    "es": "Forzar lectura de la base de datos"
  },
  "Reset pulizie": {
    "en": "Reset cleaning",
    "fr": "Réinitialiser le ménage",
    "de": "Reinigung zurücksetzen",
    "es": "Restablecer limpieza"
  },
  "Ore lavoro pulizie": {
    "en": "Cleaning work hours",
    "fr": "Heures de travail ménage",
    "de": "Reinigungsarbeitsstunden",
    "es": "Horas de trabajo de limpieza"
  },
  "Riepilogo ore pulizia": {
    "en": "Cleaning hours summary",
    "fr": "Résumé des heures de ménage",
    "de": "Zusammenfassung Reinigungsstunden",
    "es": "Resumen de horas de limpieza"
  },
  "Filtri ore pulizia": {
    "en": "Cleaning hours filters",
    "fr": "Filtres heures ménage",
    "de": "Filter Reinigungsstunden",
    "es": "Filtros horas de limpieza"
  },
  "Mese": {
    "en": "Month",
    "fr": "Mois",
    "de": "Monat",
    "es": "Mes"
  },
  "Operatore": {
    "en": "Operator",
    "fr": "Opérateur",
    "de": "Mitarbeiter",
    "es": "Operador"
  },
  "Totali ore e benzina": {
    "en": "Hours and fuel totals",
    "fr": "Totaux heures et carburant",
    "de": "Stunden- und Kraftstoffsummen",
    "es": "Totales de horas y combustible"
  },
  "Calendario ore pulizia": {
    "en": "Cleaning hours calendar",
    "fr": "Calendrier des heures de ménage",
    "de": "Kalender Reinigungsstunden",
    "es": "Calendario de horas de limpieza"
  },
  "Genera report lavanderia": {
    "en": "Generate laundry report",
    "fr": "Générer le rapport blanchisserie",
    "de": "Wäscherei-Bericht erstellen",
    "es": "Generar informe de lavandería"
  },
  "Intervallo report lavanderia": {
    "en": "Laundry report range",
    "fr": "Période du rapport blanchisserie",
    "de": "Zeitraum Wäscherei-Bericht",
    "es": "Intervalo del informe de lavandería"
  },
  "Data inizio": {
    "en": "Start date",
    "fr": "Date de début",
    "de": "Startdatum",
    "es": "Fecha de inicio"
  },
  "Data fine": {
    "en": "End date",
    "fr": "Date de fin",
    "de": "Enddatum",
    "es": "Fecha de fin"
  },
  "Condividi": {
    "en": "Share",
    "fr": "Partager",
    "de": "Teilen",
    "es": "Compartir"
  },
  "Caricamento": {
    "en": "Loading",
    "fr": "Chargement",
    "de": "Laden",
    "es": "Cargando"
  },
  "Costi lavanderia": {
    "en": "Laundry costs",
    "fr": "Coûts blanchisserie",
    "de": "Wäschereikosten",
    "es": "Costes de lavandería"
  },
  "Importa database": {
    "en": "Import database",
    "fr": "Importer la base",
    "de": "Datenbank importieren",
    "es": "Importar base de datos"
  },
  "Esporta database": {
    "en": "Export database",
    "fr": "Exporter la base",
    "de": "Datenbank exportieren",
    "es": "Exportar base de datos"
  },
  "Database": {
    "en": "Database",
    "fr": "Base de données",
    "de": "Datenbank",
    "es": "Base de datos"
  },
  "Aggiungi servizio": {
    "en": "Add service",
    "fr": "Ajouter un service",
    "de": "Service hinzufügen",
    "es": "Añadir servicio"
  },
  "Servizio": {
    "en": "Service",
    "fr": "Service",
    "de": "Service",
    "es": "Servicio"
  },
  "Cancella": {
    "en": "Clear",
    "fr": "Effacer",
    "de": "Leeren",
    "es": "Borrar"
  },
  "Eliminare definitivamente questa spesa?": {
    "en": "Delete this expense permanently?",
    "fr": "Supprimer définitivement cette dépense ?",
    "de": "Diese Ausgabe endgültig löschen?",
    "es": "¿Eliminar definitivamente este gasto?"
  },
  "Spesa eliminata": {
    "en": "Expense deleted",
    "fr": "Dépense supprimée",
    "de": "Ausgabe gelöscht",
    "es": "Gasto eliminado"
  },
  "Mese corrente": {
    "en": "Current month",
    "fr": "Mois en cours",
    "de": "Aktueller Monat",
    "es": "Mes actual"
  },
  "Mese precedente": {
    "en": "Previous month",
    "fr": "Mois précédent",
    "de": "Vorheriger Monat",
    "es": "Mes anterior"
  },
  "Mese successivo": {
    "en": "Next month",
    "fr": "Mois suivant",
    "de": "Nächster Monat",
    "es": "Mes siguiente"
  },
  "Giorno precedente": {
    "en": "Previous day",
    "fr": "Jour précédent",
    "de": "Vorheriger Tag",
    "es": "Día anterior"
  },
  "Giorno successivo": {
    "en": "Next day",
    "fr": "Jour suivant",
    "de": "Nächster Tag",
    "es": "Día siguiente"
  },
  "Navigazione giorno": {
    "en": "Day navigation",
    "fr": "Navigation jour",
    "de": "Tagesnavigation",
    "es": "Navegación por día"
  },
  "Navigazione calendario": {
    "en": "Calendar navigation",
    "fr": "Navigation calendrier",
    "de": "Kalendernavigation",
    "es": "Navegación del calendario"
  },
  "Legenda letti": {
    "en": "Bed legend",
    "fr": "Légende des lits",
    "de": "Bettenlegende",
    "es": "Leyenda de camas"
  },
  "Filtri ospiti": {
    "en": "Guest filters",
    "fr": "Filtres clients",
    "de": "Gästefilter",
    "es": "Filtros de huéspedes"
  },
  "Ordinamento": {
    "en": "Sorting",
    "fr": "Tri",
    "de": "Sortierung",
    "es": "Ordenación"
  },
  "Ordina ospiti per": {
    "en": "Sort guests by",
    "fr": "Trier les clients par",
    "de": "Gäste sortieren nach",
    "es": "Ordenar huéspedes por"
  },
  "Direzione ordinamento": {
    "en": "Sort direction",
    "fr": "Sens du tri",
    "de": "Sortierrichtung",
    "es": "Dirección de ordenación"
  },
  "Registrazioni": {
    "en": "Registrations",
    "fr": "Enregistrements",
    "de": "Registrierungen",
    "es": "Registros"
  },
  "Polizia di Stato": {
    "en": "State Police",
    "fr": "Police d'État",
    "de": "Staatspolizei",
    "es": "Policía del Estado"
  },
  "ISTAT": {
    "en": "ISTAT",
    "fr": "ISTAT",
    "de": "ISTAT",
    "es": "ISTAT"
  },
  "Ricevuta": {
    "en": "Receipt",
    "fr": "Reçu",
    "de": "Beleg",
    "es": "Recibo"
  },
  "Tipo acconto": {
    "en": "Deposit type",
    "fr": "Type d'acompte",
    "de": "Art der Anzahlung",
    "es": "Tipo de depósito"
  },
  "Elettronico": {
    "en": "Electronic",
    "fr": "Électronique",
    "de": "Elektronisch",
    "es": "Electrónico"
  },
  "Saldo": {
    "en": "Balance",
    "fr": "Solde",
    "de": "Saldo",
    "es": "Saldo"
  },
  "SI": {
    "en": "YES",
    "fr": "OUI",
    "de": "JA",
    "es": "SÍ"
  },
  "NO": {
    "en": "NO",
    "fr": "NON",
    "de": "NEIN",
    "es": "NO"
  },
  "Confermare?": {
    "en": "Confirm?",
    "fr": "Confirmer ?",
    "de": "Bestätigen?",
    "es": "¿Confirmar?"
  },
  "Sì": {
    "en": "Yes",
    "fr": "Oui",
    "de": "Ja",
    "es": "Sí"
  },
  "TUTTI": {
    "en": "ALL",
    "fr": "TOUS",
    "de": "ALLE",
    "es": "TODOS"
  },
  "Tutti": {
    "en": "All",
    "fr": "Tous",
    "de": "Alle",
    "es": "Todos"
  },
  "Lingua aggiornata": {
    "en": "Language updated",
    "fr": "Langue mise à jour",
    "de": "Sprache aktualisiert",
    "es": "Idioma actualizado"
  },
  "Seleziona la lingua dell'app": {
    "en": "Select the app language",
    "fr": "Sélectionnez la langue de l'application",
    "de": "App-Sprache auswählen",
    "es": "Selecciona el idioma de la app"
  }
};
const __I18N_WORD_MAPS__ = {
  "en": {
    "Nuovo": "New",
    "Nuova": "New",
    "Modifica": "Edit",
    "Salva": "Save",
    "Elimina": "Delete",
    "Chiudi": "Close",
    "Annulla": "Cancel",
    "Nome": "Name",
    "operatore": "operator",
    "operatori": "operators",
    "ospite": "guest",
    "ospiti": "guests",
    "channel": "channel",
    "lavanderia": "laundry",
    "componente": "component",
    "componenti": "components",
    "Tariffa": "Rate",
    "tariffa": "rate",
    "Benzina": "Fuel",
    "benzina": "fuel",
    "Prezzo": "Price",
    "prezzo": "price",
    "Titolo": "Title",
    "titolo": "title",
    "Importo": "Amount",
    "importo": "amount",
    "Commissione": "Commission",
    "commissione": "commission",
    "Acconto": "Deposit",
    "Saldo": "Balance",
    "Servizi": "Services",
    "servizi": "services",
    "Spese": "Expenses",
    "spese": "expenses",
    "Spesa": "Shopping",
    "spesa": "shopping",
    "Pulizie": "Cleaning",
    "pulizie": "cleaning",
    "Calendario": "Calendar",
    "calendario": "calendar",
    "Impostazioni": "Settings",
    "Lingua": "Language",
    "lingua": "language",
    "Stanze": "Rooms",
    "stanze": "rooms",
    "Tassa": "Tax",
    "tassa": "tax",
    "soggiorno": "stay",
    "Data": "Date",
    "Mese": "Month",
    "mese": "month",
    "Anno": "Year",
    "anno": "year",
    "Oggi": "Today",
    "oggi": "today",
    "Giorno": "Day",
    "giorno": "day",
    "ricevuta": "receipt",
    "Ricevuta": "Receipt",
    "Contanti": "Cash",
    "Elettronico": "Electronic",
    "Database": "Database",
    "Codice": "Code",
    "Report": "Report",
    "Filtro": "Filter",
    "Filtri": "Filters",
    "Ordina": "Sort",
    "Operatore": "Operator",
    "Ore": "Hours",
    "ore": "hours",
    "Pulizia": "Cleaning",
    "pulizia": "cleaning",
    "Totale": "Total",
    "totali": "totals",
    "Totali": "Totals"
  },
  "fr": {
    "Nuovo": "Nouveau",
    "Nuova": "Nouvelle",
    "Modifica": "Modifier",
    "Salva": "Enregistrer",
    "Elimina": "Supprimer",
    "Chiudi": "Fermer",
    "Annulla": "Annuler",
    "Nome": "Nom",
    "operatore": "opérateur",
    "operatori": "opérateurs",
    "ospite": "client",
    "ospiti": "clients",
    "channel": "canal",
    "lavanderia": "blanchisserie",
    "componente": "composant",
    "componenti": "composants",
    "Tariffa": "Tarif",
    "tariffa": "tarif",
    "Benzina": "Carburant",
    "benzina": "carburant",
    "Prezzo": "Prix",
    "prezzo": "prix",
    "Titolo": "Titre",
    "titolo": "titre",
    "Importo": "Montant",
    "importo": "montant",
    "Commissione": "Commission",
    "commissione": "commission",
    "Acconto": "Acompte",
    "Saldo": "Solde",
    "Servizi": "Services",
    "servizi": "services",
    "Spese": "Dépenses",
    "spese": "dépenses",
    "Spesa": "Achats",
    "spesa": "achats",
    "Pulizie": "Ménage",
    "pulizie": "ménage",
    "Calendario": "Calendrier",
    "calendario": "calendrier",
    "Impostazioni": "Paramètres",
    "Lingua": "Langue",
    "lingua": "langue",
    "Stanze": "Chambres",
    "stanze": "chambres",
    "Tassa": "Taxe",
    "tassa": "taxe",
    "soggiorno": "séjour",
    "Data": "Date",
    "Mese": "Mois",
    "mese": "mois",
    "Anno": "Année",
    "anno": "année",
    "Oggi": "Aujourd'hui",
    "oggi": "aujourd'hui",
    "Giorno": "Jour",
    "giorno": "jour",
    "ricevuta": "reçu",
    "Ricevuta": "Reçu",
    "Contanti": "Espèces",
    "Elettronico": "Électronique",
    "Database": "Base de données",
    "Codice": "Code",
    "Report": "Rapport",
    "Filtro": "Filtre",
    "Filtri": "Filtres",
    "Ordina": "Trier",
    "Operatore": "Opérateur",
    "Ore": "Heures",
    "ore": "heures",
    "Pulizia": "Ménage",
    "pulizia": "ménage",
    "Totale": "Total",
    "totali": "totaux",
    "Totali": "Totaux"
  },
  "de": {
    "Nuovo": "Neu",
    "Nuova": "Neu",
    "Modifica": "Bearbeiten",
    "Salva": "Speichern",
    "Elimina": "Löschen",
    "Chiudi": "Schließen",
    "Annulla": "Abbrechen",
    "Nome": "Name",
    "operatore": "Mitarbeiter",
    "operatori": "Mitarbeiter",
    "ospite": "Gast",
    "ospiti": "Gäste",
    "channel": "Kanal",
    "lavanderia": "Wäscherei",
    "componente": "Komponente",
    "componenti": "Komponenten",
    "Tariffa": "Satz",
    "tariffa": "Satz",
    "Benzina": "Kraftstoff",
    "benzina": "Kraftstoff",
    "Prezzo": "Preis",
    "prezzo": "Preis",
    "Titolo": "Titel",
    "titolo": "Titel",
    "Importo": "Betrag",
    "importo": "Betrag",
    "Commissione": "Provision",
    "commissione": "Provision",
    "Acconto": "Anzahlung",
    "Saldo": "Saldo",
    "Servizi": "Services",
    "servizi": "Services",
    "Spese": "Ausgaben",
    "spese": "Ausgaben",
    "Spesa": "Einkauf",
    "spesa": "Einkauf",
    "Pulizie": "Reinigung",
    "pulizie": "Reinigung",
    "Calendario": "Kalender",
    "calendario": "Kalender",
    "Impostazioni": "Einstellungen",
    "Lingua": "Sprache",
    "lingua": "Sprache",
    "Stanze": "Zimmer",
    "stanze": "Zimmer",
    "Tassa": "Steuer",
    "tassa": "Steuer",
    "soggiorno": "Aufenthalt",
    "Data": "Datum",
    "Mese": "Monat",
    "mese": "Monat",
    "Anno": "Jahr",
    "anno": "Jahr",
    "Oggi": "Heute",
    "oggi": "heute",
    "Giorno": "Tag",
    "giorno": "Tag",
    "ricevuta": "Beleg",
    "Ricevuta": "Beleg",
    "Contanti": "Bar",
    "Elettronico": "Elektronisch",
    "Database": "Datenbank",
    "Codice": "Code",
    "Report": "Bericht",
    "Filtro": "Filter",
    "Filtri": "Filter",
    "Ordina": "Sortieren",
    "Operatore": "Mitarbeiter",
    "Ore": "Stunden",
    "ore": "Stunden",
    "Pulizia": "Reinigung",
    "pulizia": "Reinigung",
    "Totale": "Gesamt",
    "totali": "Summen",
    "Totali": "Summen"
  },
  "es": {
    "Nuovo": "Nuevo",
    "Nuova": "Nueva",
    "Modifica": "Editar",
    "Salva": "Guardar",
    "Elimina": "Eliminar",
    "Chiudi": "Cerrar",
    "Annulla": "Cancelar",
    "Nome": "Nombre",
    "operatore": "operador",
    "operatori": "operadores",
    "ospite": "huésped",
    "ospiti": "huéspedes",
    "channel": "canal",
    "lavanderia": "lavandería",
    "componente": "componente",
    "componenti": "componentes",
    "Tariffa": "Tarifa",
    "tariffa": "tarifa",
    "Benzina": "Combustible",
    "benzina": "combustible",
    "Prezzo": "Precio",
    "prezzo": "precio",
    "Titolo": "Título",
    "titolo": "título",
    "Importo": "Importe",
    "importo": "importe",
    "Commissione": "Comisión",
    "commissione": "comisión",
    "Acconto": "Depósito",
    "Saldo": "Saldo",
    "Servizi": "Servicios",
    "servizi": "servicios",
    "Spese": "Gastos",
    "spese": "gastos",
    "Spesa": "Compras",
    "spesa": "compras",
    "Pulizie": "Limpieza",
    "pulizie": "limpieza",
    "Calendario": "Calendario",
    "calendario": "calendario",
    "Impostazioni": "Ajustes",
    "Lingua": "Idioma",
    "lingua": "idioma",
    "Stanze": "Habitaciones",
    "stanze": "habitaciones",
    "Tassa": "Tasa",
    "tassa": "tasa",
    "soggiorno": "turística",
    "Data": "Fecha",
    "Mese": "Mes",
    "mese": "mes",
    "Anno": "Año",
    "anno": "año",
    "Oggi": "Hoy",
    "oggi": "hoy",
    "Giorno": "Día",
    "giorno": "día",
    "ricevuta": "recibo",
    "Ricevuta": "Recibo",
    "Contanti": "Efectivo",
    "Elettronico": "Electrónico",
    "Database": "Base de datos",
    "Codice": "Código",
    "Report": "Informe",
    "Filtro": "Filtro",
    "Filtri": "Filtros",
    "Ordina": "Ordenar",
    "Operatore": "Operador",
    "Ore": "Horas",
    "ore": "horas",
    "Pulizia": "Limpieza",
    "pulizia": "limpieza",
    "Totale": "Total",
    "totali": "totales",
    "Totali": "Totales"
  }
};
function __getAppLanguage__(){ const v = String(__appLanguage__ || "it").trim().toLowerCase(); return __I18N_LOCALES__[v] ? v : "it"; }
function __getCurrentLocale__(){ return __I18N_LOCALES__[__getAppLanguage__()] || "it-IT"; }
function __capitalizeLocale__(s){ const raw = String(s || ""); return raw ? (raw.charAt(0).toUpperCase() + raw.slice(1)) : ""; }
function __normalizeI18nWhitespace__(text){ return String(text || "").replace(/\s+/g, " ").trim(); }
function __getMonthNamesForLocale__(locale, capitalize = false){ try{ const out=[]; for(let i=0;i<12;i+=1){ let label=new Date(2026, i, 1).toLocaleDateString(locale || __getCurrentLocale__(), { month:"long" }); out.push(capitalize ? __capitalizeLocale__(label) : label); } return out; }catch(_){ return []; } }
function __refreshMonthNamesCache__(){ __MONTHS_IT = __getMonthNamesForLocale__(__getCurrentLocale__(), true); }
function __getWeekdayShortForLocale__(date){ try{ return new Date(date).toLocaleDateString(__getCurrentLocale__(), { weekday:"short" }); }catch(_){ return ""; } }
function __getWeekdayLongForLocale__(date){ try{ return new Date(date).toLocaleDateString(__getCurrentLocale__(), { weekday:"long" }); }catch(_){ return ""; } }
function __translateExactText__(value){ const lang=__getAppLanguage__(); if(lang==="it") return String(value||""); const key=__normalizeI18nWhitespace__(value); const row=__I18N_PHRASES__[key]; return row && row[lang] ? String(row[lang]) : String(value||""); }
function __escapeRegExp__(s){ return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function __applyWordMap__(value){ let out=String(value||""); const lang=__getAppLanguage__(); const map=__I18N_WORD_MAPS__[lang]; if(!map) return out; const entries=Object.entries(map).sort((a,b)=>String(b[0]).length-String(a[0]).length); entries.forEach(([src,dst])=>{ const rx=new RegExp(`\\b${__escapeRegExp__(src)}\\b`,"gi"); out=out.replace(rx,(match)=>{ if(!match) return dst; if(match===match.toUpperCase()) return String(dst).toUpperCase(); if(match.charAt(0)===match.charAt(0).toUpperCase()) return __capitalizeLocale__(dst); return dst; }); }); return out; }
function __translateText__(value){ const original=String(value??""); const lang=__getAppLanguage__(); if(lang==="it") return original; const trimmed=original.trim(); if(!trimmed) return original; const exact=__translateExactText__(trimmed); const translated=(exact!==trimmed)?exact:__applyWordMap__(trimmed); return (!translated || translated===trimmed) ? original : original.replace(trimmed, translated); }
function __setOriginalAttr__(el, attr){ try{ if(!el.__i18nOriginalAttrs) el.__i18nOriginalAttrs={}; if(!(attr in el.__i18nOriginalAttrs)) el.__i18nOriginalAttrs[attr]=el.getAttribute(attr); }catch(_){} }
function __translateElementAttributes__(el){ try{ if(!el || !el.getAttribute || el.closest?.("[data-no-i18n='1']")) return; ["aria-label","placeholder","title"].forEach((attr)=>{ if(!el.hasAttribute(attr)) return; __setOriginalAttr__(el, attr); const base=el.__i18nOriginalAttrs ? el.__i18nOriginalAttrs[attr] : el.getAttribute(attr); const next=(__getAppLanguage__()==="it") ? String(base ?? "") : __translateText__(base); if(String(next ?? "") !== String(el.getAttribute(attr) ?? "")) el.setAttribute(attr, String(next ?? "")); }); }catch(_){} }
function __translateTextNode__(node){ try{ if(!node || !node.parentElement) return; const parent=node.parentElement; if(parent.closest?.("[data-no-i18n='1']")) return; if(/^(SCRIPT|STYLE|TEXTAREA)$/i.test(parent.tagName)) return; if(parent.closest?.("svg")) return; const current=String(node.nodeValue ?? ""); if(!current.trim()) return; if(typeof node.__i18nOriginal !== "string") node.__i18nOriginal=current; const base=String(node.__i18nOriginal ?? current); const next=(__getAppLanguage__()==="it") ? base : __translateText__(base); if(next !== current) node.nodeValue=next; }catch(_){} }
function __translateTree__(root){ try{ if(!root || __applyingLanguage__) return; __applyingLanguage__=true; if(root.nodeType===Node.TEXT_NODE){ __translateTextNode__(root); return; } const start=(root.nodeType===Node.ELEMENT_NODE)?root:document.body; if(start && start.nodeType===Node.ELEMENT_NODE){ __translateElementAttributes__(start); const walker=document.createTreeWalker(start, NodeFilter.SHOW_TEXT, null); let textNode=walker.nextNode(); while(textNode){ __translateTextNode__(textNode); textNode=walker.nextNode(); } start.querySelectorAll?.("*").forEach((el)=>__translateElementAttributes__(el)); } }catch(_){} finally{ __applyingLanguage__=false; } }
function __applyAppLanguageToDom__(){ try{ document.documentElement.lang=__getAppLanguage__(); }catch(_){} __refreshMonthNamesCache__(); __translateTree__(document.body); try{ document.querySelectorAll?.("#languageGrid .language-option").forEach((btn)=>btn.classList.toggle("is-selected", String(btn?.dataset?.lang || "")===__getAppLanguage__())); }catch(_){} }
window.__applyAppLanguageToDom__ = __applyAppLanguageToDom__;
function __ensureLanguageObserver__(){ try{ if(__languageObserver__ || !document.body) return; __languageObserver__ = new MutationObserver((mutations)=>{ if(__applyingLanguage__) return; mutations.forEach((m)=>{ if(m.type==="characterData"){ __translateTextNode__(m.target); return; } if(m.type==="attributes"){ __translateElementAttributes__(m.target); return; } if(m.type==="childList"){ m.addedNodes.forEach((node)=>{ if(node.nodeType===Node.TEXT_NODE) __translateTextNode__(node); else if(node.nodeType===Node.ELEMENT_NODE) __translateTree__(node); }); } }); }); __languageObserver__.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:["aria-label","placeholder","title"] }); }catch(_){} }
async function __persistAppLanguage__(lang){ try{ localStorage.setItem(__I18N_STORAGE_KEY__, String(lang || "it")); }catch(_){} try{ if(state && state.settings && state.settings.byKey) state.settings.byKey.app_language={ key:"app_language", value:String(lang || "it") }; }catch(_){} try{ if(state && state.session && state.session.user_id) await api("impostazioni", { method:"POST", body:{ app_language:String(lang || "it") }, showLoader:false }); }catch(_){} }
async function __setAppLanguage__(lang, { persist = true, silent = false } = {}){ const next=__I18N_LOCALES__[String(lang || "").trim().toLowerCase()] ? String(lang || "").trim().toLowerCase() : "it"; __appLanguage__=next; if(persist) await __persistAppLanguage__(next); __applyAppLanguageToDom__(); try{ window.dispatchEvent(new CustomEvent("ddae:language-change", { detail:{ lang:next } })); }catch(_){} if(!silent){ try{ toast("Lingua aggiornata", "blue"); }catch(_){} } }
async function __hydrateAppLanguageFromSettings__(){ let next="it"; try{ const local=String(localStorage.getItem(__I18N_STORAGE_KEY__) || "").trim().toLowerCase(); if(__I18N_LOCALES__[local]) next=local; }catch(_){} try{ const fromSettings=getSettingText ? String(getSettingText("app_language", next) || "").trim().toLowerCase() : next; if(__I18N_LOCALES__[fromSettings]) next=fromSettings; }catch(_){} __appLanguage__=next; __applyAppLanguageToDom__(); }
function __openLanguageModal__(){ const modal=document.getElementById("languageModal"); if(!modal) return; modal.hidden=false; modal.setAttribute("aria-hidden","false"); __applyAppLanguageToDom__(); }
function __closeLanguageModal__(){ const modal=document.getElementById("languageModal"); if(!modal) return; modal.hidden=true; modal.setAttribute("aria-hidden","true"); }
function setupLanguageModal(){ const modal=document.getElementById("languageModal"); if(!modal || modal.dataset.bound==="1") return; modal.dataset.bound="1"; const closeBtn=document.getElementById("languageModalClose"); const closeFooterBtn=document.getElementById("languageModalCloseBtn"); if(closeBtn) bindFastTap(closeBtn, __closeLanguageModal__); if(closeFooterBtn) bindFastTap(closeFooterBtn, __closeLanguageModal__); modal.addEventListener("click",(ev)=>{ try{ if(ev.target===modal) __closeLanguageModal__(); }catch(_){} }); document.querySelectorAll?.("#languageGrid .language-option").forEach((btn)=>bindFastTap(btn, async()=>{ try{ await __setAppLanguage__(btn.dataset.lang || "it"); __closeLanguageModal__(); }catch(_){} })); }
try{ const __nativeConfirm__=(typeof window!=="undefined" && typeof window.confirm==="function") ? window.confirm.bind(window) : null; const __nativeAlert__=(typeof window!=="undefined" && typeof window.alert==="function") ? window.alert.bind(window) : null; if(__nativeConfirm__) window.confirm=(message)=>__nativeConfirm__(__translateText__(message)); if(__nativeAlert__) window.alert=(message)=>__nativeAlert__(__translateText__(message)); }catch(_){}
try{ if(typeof window!=="undefined") window.addEventListener("DOMContentLoaded", ()=>{ try{ __ensureLanguageObserver__(); }catch(_){} try{ __hydrateAppLanguageFromSettings__(); }catch(_){} }); }catch(_){}
__refreshMonthNamesCache__();


// Conferma con modal Sì/No (label esplicite)
let __confirmYesNoResolve = null;
function confirmYesNo(message){
  return new Promise((resolve)=>{
    try{
      const modal = document.getElementById("confirmYesNoModal");
      const textEl = document.getElementById("confirmYesNoText");
      const yesBtn = document.getElementById("confirmYesNoYes");
      const noBtn  = document.getElementById("confirmYesNoNo");
      if (!modal || !textEl || !yesBtn || !noBtn){
        // fallback
        try{ resolve(!!confirm(__translateText__(String(message || "Confermare?")))); }catch(_){ resolve(false); }
        return;
      }

      // chiude eventuale precedente
      try{ if (__confirmYesNoResolve){ __confirmYesNoResolve(false); } }catch(_){ }
      __confirmYesNoResolve = resolve;

      textEl.textContent = __translateText__(String(message || "Confermare?"));
      modal.hidden = false;
      try{ modal.setAttribute("aria-hidden", "false"); }catch(_){ }

      const cleanup = (val) => {
        if (__confirmYesNoResolve){
          const r = __confirmYesNoResolve;
          __confirmYesNoResolve = null;
          try{ r(!!val); }catch(_){ }
        }
        try{ modal.hidden = true; }catch(_){ }
        try{ modal.setAttribute("aria-hidden", "true"); }catch(_){ }
        try{ yesBtn.removeEventListener("click", onYes, true); }catch(_){ }
        try{ noBtn.removeEventListener("click", onNo, true); }catch(_){ }
        try{ modal.removeEventListener("click", onBackdrop, true); }catch(_){ }
      };

      const onYes = (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } cleanup(true); };
      const onNo  = (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } cleanup(false); };
      const onBackdrop = (e) => {
        try{
          if (e && e.target === modal){ cleanup(false); }
        }catch(_){ }
      };

      yesBtn.addEventListener("click", onYes, true);
      noBtn.addEventListener("click", onNo, true);
      modal.addEventListener("click", onBackdrop, true);

      // focus sul "No" per sicurezza (evita reset accidentale)
      try{ noBtn.focus(); }catch(_){ }

    }catch(_){
      try{ resolve(false); }catch(__){}
    }
  });
}


function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

// --- Guest status LED (scheda ospiti) ---
function _dayNumFromISO(iso){
  if (!iso || typeof iso !== 'string') return null;

  // ISO datetime (es: 2026-01-05T23:00:00.000Z) -> converti in data locale (YYYY-MM-DD)
  if (iso.includes("T")) {
    const dt = new Date(iso);
    if (!isNaN(dt)) {
      return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
    }
    iso = iso.split("T")[0];
  }

  // Support both YYYY-MM-DD and DD/MM/YYYY
  if (iso.includes('/')) {
    const parts = iso.split('/').map(n=>parseInt(n,10));
    if (parts.length === 3 && parts.every(n=>isFinite(n))) {
      const [dd,mm,yy] = parts;
      return Math.floor(Date.UTC(yy, mm-1, dd) / 86400000);
    }
  }

  const parts = iso.split('-').map(n=>parseInt(n,10));
  if (parts.length !== 3 || parts.some(n=>!isFinite(n))) return null;
  const [y,m,d] = parts;
  // day number in UTC to avoid DST issues
  return Math.floor(Date.UTC(y, m-1, d) / 86400000);
}

function guestLedStatus(item){
  const ci = item?.check_in || item?.checkIn || "";
  const co = item?.check_out || item?.checkOut || "";

  const t = _dayNumFromISO(todayISO());
  const dIn = _dayNumFromISO(ci);
  const dOut = _dayNumFromISO(co);

  const isOneNight = (dIn != null && dOut != null && (dOut - dIn) === 1);

  if (t == null) return { cls: "led-gray", label: "Nessuna scadenza" };

  // Priorità: check-out (rosso) > giorno prima check-out (arancione) > dopo check-in (verde) > grigio
  if (dOut != null) {
    if (t === dOut) return { cls: "led-red", label: "Check-out oggi" };
    if (t > dOut) return { cls: "led-red", label: "Check-out passato" };

    // Giorno prima del check-out
    if (t === (dOut - 1)) {
      // Caso speciale: 1 notte -> il giorno prima del check-out coincide col check-in
      if (isOneNight && dIn === (dOut - 1)) {
        return { cls: "led-yellow", label: "1 notte: arrivo oggi (LED giallo)" };
      }
      return { cls: "led-orange", label: "Check-out domani" };
    }
  }

  if (dIn != null) {
    if (t === dIn) return { cls: "led-green", label: "Check-in oggi" };
    if (t > dIn) return { cls: "led-green", label: "In soggiorno" };
    return { cls: "led-gray", label: "In arrivo" };
  }

  return { cls: "led-gray", label: "Nessuna data" };
}





function toISO(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatISODateLocal(value){
  if (!value) return "";
  const s = String(value);

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO datetime -> local date
  if (s.includes("T")) {
    const dt = new Date(s);
    if (!isNaN(dt)) return toISO(dt); // toISO usa date locale
    return s.split("T")[0];
  }

  // Fallback: DD/MM/YYYY
  if (s.includes("/")) {
    const parts = s.split("/").map(x=>parseInt(x,10));
    if (parts.length === 3 && parts.every(n=>isFinite(n))) {
      const [dd,mm,yy] = parts;
      const dt = new Date(yy, mm-1, dd);
      return toISO(dt);
    }
  }

  // Last resort: cut
  return s.slice(0,10);
}

// 2026-01-01 -> "1 Gennaio 2026" (mese con iniziale maiuscola)
function formatLongDateIT(value){
  const iso = formatISODateLocal(value);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y,m,d] = iso.split("-").map(n=>parseInt(n,10));
  const dt = new Date(y, (m-1), d);
  if (isNaN(dt)) return "";
  return __capitalizeLocale__(dt.toLocaleDateString(__getCurrentLocale__(), { day: "numeric", month: "long", year: "numeric" }));
}

function formatRangeCompactIT(checkInValue, checkOutValue){
  const ciIso = formatISODateLocal(checkInValue);
  const coIso = formatISODateLocal(checkOutValue);
  if (!ciIso || !coIso) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ciIso) || !/^\d{4}-\d{2}-\d{2}$/.test(coIso)) return "";

  const ci = new Date(ciIso + "T00:00:00");
  const co = new Date(coIso + "T00:00:00");
  if (isNaN(ci) || isNaN(co)) return "";

  // Range soggiorno: mostra check-in e check-out
  let end = new Date(co);
  if (end < ci) end = new Date(ci);

  const d1 = ci.getDate();
  const d2 = end.getDate();
  const m1 = ci.getMonth();
  const m2 = end.getMonth();
  const y1 = ci.getFullYear();
  const y2 = end.getFullYear();

  const monthCap = (dt) => {
    const s = dt.toLocaleDateString("it-IT", { month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // stesso mese/anno -> "21-24 Agosto"
  if (y1 === y2 && m1 === m2){
    return `${d1}-${d2} ${monthCap(ci)}`;
  }

  // mesi diversi -> "28 Agosto-2 Settembre"
  if (y1 === y2){
    return `${d1} ${monthCap(ci)}-${d2} ${monthCap(end)}`;
  }

  // anni diversi (raro): mantieni compatto senza anno
  return `${d1} ${monthCap(ci)}-${d2} ${monthCap(end)}`;
}

function formatShortDateIT(input){
  try{
    if (!input) return "";
    const s = String(input).trim();

    // ISO datetime (con T/Z): non usare slice(0,10) perché può "scalare" di 1 giorno
    if (s.includes("T")) {
      const dt = new Date(s);
      if (!isNaN(dt)){
        const dd = String(dt.getDate()).padStart(2,"0");
        const mm = String(dt.getMonth()+1).padStart(2,"0");
        const yy = String(dt.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      }
    }

    // YYYY-MM-DD
    const iso = s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const [y,m,d] = iso.split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    }

    // fallback Date parse
    const dt = new Date(s);
    if (!isNaN(dt)){
      const dd = String(dt.getDate()).padStart(2,"0");
      const mm = String(dt.getMonth()+1).padStart(2,"0");
      const yy = String(dt.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
    return iso;
  }catch(_){
    return "";
  }
}


function formatFullDateIT(d){
  try{
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt)) return "";
    return __capitalizeLocale__(dt.toLocaleDateString(__getCurrentLocale__(), { weekday:"long", day:"numeric", month:"long", year:"numeric" }));
  }catch(_){ return ""; }
}

function startOfLocalDay(d){
  const dt = (d instanceof Date) ? new Date(d) : new Date(d);
  dt.setHours(0,0,0,0);
  return dt;
}

function toISODateLocal(d){
  const dt = startOfLocalDay(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const da = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}



function spesaCategoryClass(s){
  // "campo X": categoria (fallback: aliquotaIva)
  const catRaw = (s?.categoria ?? s?.cat ?? "").toString().trim().toLowerCase();
  const aliq = (s?.aliquotaIva ?? s?.aliquota_iva ?? "").toString().trim();

  // Normalizza varianti
  if (catRaw.includes("contant")) return "spesa-bg-contanti";
  if (catRaw.includes("tassa") && catRaw.includes("sogg")) return "spesa-bg-tassa";

  // IVA
  if (catRaw.includes("iva")){
    if (catRaw.includes("22")) return "spesa-bg-iva22";
    if (catRaw.includes("10")) return "spesa-bg-iva10";
    if (catRaw.includes("4")) return "spesa-bg-iva4";
  }

  // Fallback su aliquota numerica
  const n = parseFloat(String(aliq).replace(",", "."));
  if (!isNaN(n)){
    if (n >= 21.5) return "spesa-bg-iva22";
    if (n >= 9.5 && n < 11.5) return "spesa-bg-iva10";
    if (n >= 3.5 && n < 5.5) return "spesa-bg-iva4";
  }

  return ""; // nessun colore
}





function calcStayNights(ospite){
  // Calcola le notti tra check-in e check-out (date ISO), robusto per Safari/iOS (usa Date.UTC)
  const inRaw  = ospite?.check_in ?? ospite?.checkIn ?? "";
  const outRaw = ospite?.check_out ?? ospite?.checkOut ?? "";
  const inISO  = formatISODateLocal(inRaw);
  const outISO = formatISODateLocal(outRaw);

  if (!inISO || !outISO) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inISO) || !/^\d{4}-\d{2}-\d{2}$/.test(outISO)) return null;

  const [yi, mi, di] = inISO.split("-").map(n => parseInt(n, 10));
  const [yo, mo, do_] = outISO.split("-").map(n => parseInt(n, 10));

  const tIn  = Date.UTC(yi, mi - 1, di);
  const tOut = Date.UTC(yo, mo - 1, do_);

  const diff = Math.round((tOut - tIn) / 86400000);
  if (!isFinite(diff) || diff <= 0) return null;
  return diff;
}

function formatEUR(value){
  const n = Number(value || 0);
  try{
    return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  }catch(_){
    // fallback
    return "€" + (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
  }
}

function calcTouristTax(ospite, nights){
  // Tassa di soggiorno: per persona > 10 anni (usa 'adulti'), max notti configurabile
  const adultsRaw = ospite?.adulti ?? ospite?.adults ?? 0;
  const adults = Math.max(0, parseInt(adultsRaw, 10) || 0);

  const nNights = Math.max(0, parseInt(nights, 10) || 0);
  const maxTaxableNightsRaw = (state.settings && state.settings.loaded) ? getSettingNumber("tassa_soggiorno_max_notti", 3) : 3;
  const maxTaxableNights = Math.max(0, parseInt(maxTaxableNightsRaw, 10) || 0);
  const taxableDays = Math.min(nNights, maxTaxableNights);

  const rate = (state.settings && state.settings.loaded) ? getSettingNumber("tassa_soggiorno", (typeof TOURIST_TAX_EUR_PPN !== "undefined" ? TOURIST_TAX_EUR_PPN : 0)) : ((typeof TOURIST_TAX_EUR_PPN !== "undefined") ? Number(TOURIST_TAX_EUR_PPN) : 0);
  const r = isFinite(rate) ? Math.max(0, rate) : 0;

  const total = adults * taxableDays * r;
  return { total, adults, taxableDays, rate: r };
}

function buildNightsDotHTML(nights){
  const n = Math.max(0, parseInt(nights, 10) || 0);
  if (!n) return ``;
  return `<span class="nights-dot" aria-label="Notti">${n}</span>`;
}

function updateGuestTaxTotalPill(){
  try{
    // dDAE: in modalità 'create' non mostrare la tassa di soggiorno
    if (String(state.guestMode||'').toLowerCase()==='create'){
      const el0 = document.getElementById('guestTaxTotal');
      if (el0) el0.hidden = true;
      return;
    }

    const el = document.getElementById("guestTaxTotal");
    if (!el) return;
    const valEl = document.getElementById("guestTaxTotalVal");

    const list = (Array.isArray(state.guestGroupBookings) && state.guestGroupBookings.length)
      ? state.guestGroupBookings
      : (state.guestViewItem ? [state.guestViewItem] : []);

    let sum = 0;
    for (const g of (list || [])){
      const nights = calcStayNights(g);
      if (nights == null) continue;
      const tt = calcTouristTax(g, nights);
      sum += Number(tt?.total || 0) || 0;
    }

    if (!isFinite(sum) || sum <= 0){
      if (valEl) valEl.textContent = "€0,00";
      el.hidden = true;
      return;
    }

    el.hidden = false;
    const txt = formatEUR(sum);
    if (valEl) valEl.textContent = txt;
    else el.textContent = txt;
  }catch(_){}
}


function monthRangeISO(date = new Date()){
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m+1, 0);
  return [toISO(start), toISO(end)];
}


// Period preset (scroll picker iOS) — nessuna API extra
let periodSyncLock = 0;
let presetSyncLock = 0;

function addDaysISO(iso, delta){
  const [y,m,d] = iso.split("-").map(n=>parseInt(n,10));
  const dt = new Date(y, (m-1), d);
  dt.setDate(dt.getDate() + delta);
  return toISO(dt);
}

function monthRangeFromYM(ym){
  const [yy,mm] = ym.split("-").map(n=>parseInt(n,10));
  const start = new Date(yy, mm-1, 1);
  const end = new Date(yy, mm, 0);
  return [toISO(start), toISO(end)];
}

function recentMonths(n=8){
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i=0;i<n;i++){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    out.push(`${y}-${m}`);
    d.setMonth(d.getMonth()-1);
  }
  return out;
}

function buildPeriodPresetOptions(){
  const opts = [
    { value:"this_month", label:"Questo mese" },
    { value:"last_month", label:"Mese scorso" },
    { value:"last_7", label:"Ultimi 7 giorni" },
    { value:"last_30", label:"Ultimi 30 giorni" },
    { value:"ytd", label:"Anno corrente" },
    { value:"all", label:"Tutto" },
  ];
  for (const ym of recentMonths(8)){
    opts.push({ value:`month:${ym}`, label: ym });
  }
  opts.push({ value:"custom", label:"Personalizzato" });
  return opts;
}

function fillPresetSelect(selectEl){
  if (!selectEl) return;
  const opts = buildPeriodPresetOptions();
  selectEl.innerHTML = "";
  for (const o of opts){
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    selectEl.appendChild(opt);
  }
}

function setPresetValue(value){
  state.periodPreset = value;
  presetSyncLock += 1;
  try {
    const sels = ["#periodPreset1","#periodPreset2","#periodPreset3"]
      .map(s => document.querySelector(s))
      .filter(Boolean);
    for (const s of sels) s.value = value;
  } finally {
    presetSyncLock -= 1;
  }
}

function presetToRange(value){
  const today = todayISO();
  const ySel = Number(state.exerciseYear || new Date().getFullYear());
  const y = (isFinite(ySel) && ySel >= 2000 && ySel <= 2100) ? ySel : new Date().getFullYear();

  // Helpers: month range for selected exercise year
  const monthRangeForExerciseYear = (dateObj)=>{
    const d = new Date(dateObj);
    try{ d.setFullYear(y); }catch(_){}
    return monthRangeISO(d);
  };

  if (value === "this_month") return monthRangeForExerciseYear(new Date());

  if (value === "last_month"){
    const d = new Date();
    d.setMonth(d.getMonth()-1);
    return monthRangeForExerciseYear(d);
  }

  if (value === "last_7") return [addDaysISO(today, -6), today];
  if (value === "last_30") return [addDaysISO(today, -29), today];

  // "Anno corrente" = anno di esercizio selezionato (tutto l'anno)
  if (value === "ytd" || value === "all"){
    return [`${y}-01-01`, `${y}-12-31`];
  }

  if (value && value.startsWith("month:")){
    const ym = value.split(":")[1]; // YYYY-MM
    return monthRangeFromYM(ym);
  }

  return null;
}

function bindPresetSelect(sel){
  const el = document.querySelector(sel);
  if (!el) return;
  fillPresetSelect(el);
  el.value = state.periodPreset || "this_month";

  el.addEventListener("change", async () => {
    if (presetSyncLock > 0) return;
    const v = el.value;
    const range = presetToRange(v);
    setPresetValue(v);
    if (!range) return;
    const [from,to] = range;

    setPeriod(from,to);

    try { await onPeriodChanged({ showLoader:false }); } catch (e) { toast(e.message); }
  });
}

function categoriaLabel(cat){
  return ({
    CONTANTI: "Contanti",
    TASSA_SOGGIORNO: "Tassa soggiorno",
    IVA_22: "IVA 22%",
    IVA_10: "IVA 10%",
    IVA_4: "IVA 4%",
  })[cat] || cat;
}

function __apiProfile(action, method, body){
  const a = String(action || "").trim().toLowerCase();
  const m = String(method || "").trim().toUpperCase();
  // Default: breve per evitare loader infinito su iOS
  let timeoutMs = 15000;
  let retries = 0;

  // Lista spesa (colazione + prodotti pulizia): più lenta su rete iOS / Apps Script
  if (a === "colazione" || a === "prodotti_pulizia"){
    timeoutMs = (m === "GET") ? 45000 : 60000;
    retries = 2;
  }

  return { timeoutMs, retries };
}

async function api(action, { method="GET", params={}, body=null, showLoader=true } = {}){
  if (showLoader) beginRequest();
  let realMethod = method; // definito subito per evitare ReferenceError nel finally
  try {
  // LOCAL: nessuna chiamata a Google/Apps Script
  if (typeof __LOCAL_MODE__ !== "undefined" && __LOCAL_MODE__) {
    try{ __syncLedBegin(realMethod); }catch(_){ }
    return await __localApi__(action, { method: realMethod, params: (params||{}), body });
  }
  if (!API_BASE_URL || API_BASE_URL.includes("INCOLLA_QUI")) {
    throw new Error("Config mancante: imposta API_BASE_URL in config.js");
  }

  const url = new URL(API_BASE_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("apiKey", API_KEY);
  // Cache-busting for iOS/Safari aggressive caching
  url.searchParams.set("_ts", String(Date.now()));

  // Context multi-account (user + anno)
  try{
    if (state && state.session && state.session.user_id && action !== "utenti" && action !== "ping"){
      if (!params) params = {};
      if (params.user_id === undefined || params.user_id === null || String(params.user_id).trim() === "") {
        params.user_id = String(state.session.user_id);
      }
      if (params.anno === undefined || params.anno === null || String(params.anno).trim() === "") {
        params.anno = String(state.exerciseYear || new Date().getFullYear());
      }
    }
  }catch(_){ }

  Object.entries(params || {}).forEach(([k,v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v);
  });
  if (method === "PUT" || method === "DELETE") {
    url.searchParams.set("_method", method);
    realMethod = "POST";
  }
  const { timeoutMs, retries } = __apiProfile(action, realMethod, body);

  // Sync LED: verde=lettura, rosso=scrittura
  try{ __syncLedBegin(realMethod); }catch(_){}


  const baseFetchOpts = {
    method: realMethod,
    cache: "no-store",
  };

  // Headers/body solo quando serve (riduce rischi di preflight su Safari iOS)
  if (realMethod !== "GET") {
    baseFetchOpts.headers = { "Content-Type": "text/plain;charset=utf-8" };
    let payload = body;
    // Inietta user_id/anno su POST/PUT (se mancano)
    try{
      if (state && state.session && state.session.user_id && action !== "utenti"){
        const uid = String(state.session.user_id);
        const yr = String(state.exerciseYear || new Date().getFullYear());
        const addCtx = (o)=>{
          if (!o || typeof o !== "object") return o;
          if (o.user_id === undefined || o.user_id === null || String(o.user_id).trim() === "") o.user_id = uid;
          if (o.anno === undefined || o.anno === null || String(o.anno).trim() === "") o.anno = yr;
          return o;
        };

        const deep = (x, depth = 0)=>{
          if (!x || typeof x !== "object") return x;
          if (Array.isArray(x)) return x.map(v => deep(v, depth));
          addCtx(x);
          if (depth >= 1) return x;
          // pattern comuni: bulk payloads
          ["rows","items","records","data","list"].forEach((k)=>{
            const v = x[k];
            if (Array.isArray(v)) x[k] = v.map(r => deep(r, depth + 1));
          });
          return x;
        };

        payload = deep(payload, 0);
      }
    }catch(_){ }
    baseFetchOpts.body = payload ? JSON.stringify(payload) : "{}";
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let res;
  for (let attempt = 0; attempt <= retries; attempt++){
    // Timeout concreto: evita loader infinito su iOS quando la rete “si pianta”
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try{
      res = await fetch(url.toString(), Object.assign({}, baseFetchOpts, { signal: controller.signal }));
      break;
    }catch(err){
      const msg = String((err && err.message) || err || "");
      const low = msg.toLowerCase();
      const name = String((err && err.name) || "").toLowerCase();

      const isAbort = name === "aborterror" || low.includes("fetch is aborted") || low.includes("aborted");
      const isNet = low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed");
      const retryable = isAbort || isNet;

      if (attempt < retries && retryable){
        const backoff = Math.min(8000, 700 * (2 ** attempt));
        const jitter = Math.floor(Math.random() * 200);
        await sleep(backoff + jitter);
        continue;
      }

      if (isAbort){
        throw new Error("Operazione annullata: connessione lenta o instabile (timeout). Riprova.");
      }

      if (isNet){
        throw new Error("Connessione assente o instabile. Verifica la rete e riprova. Se il problema persiste: 1) Web App Apps Script distribuita come 'Chiunque', 2) URL /exec corretto, 3) hai ridistribuito una nuova versione dello script dopo modifiche.");
      }

      throw err;
    }finally{
      clearTimeout(t);
    }
  }

  let json;
try {
  json = await res.json();
} catch (_) {
  throw new Error("Risposta non valida dal server");
}

if (!json.ok) throw new Error(json.error || "API error");
return json.data;
  } finally { try{ __syncLedEnd(realMethod); }catch(_){}
  if (showLoader) endRequest(); }
}


// =========================
// IMPOSTAZIONI (foglio Google "impostazioni")
// Chiavi usate:
// - operatori  -> colonne operatore_1/2/3
// - tariffa_oraria -> value (number)
// - costo_benzina  -> value (number)
// - tassa_soggiorno -> value (number)
// - tassa_soggiorno_max_notti -> value (integer, max notti tassabili)
// =========================

function __normKey(k) {
  return String(k || "").trim().toLowerCase();
}

function __parseSettingsRows(rows) {
  const byKey = {};
  (Array.isArray(rows) ? rows : []).forEach(r => {
    const key = __normKey(r?.key ?? r?.Key ?? r?.KEY);
    if (!key) return;
    byKey[key] = r;
  });
  return byKey;
}

function getSettingRow(key) {
  const k = __normKey(key);
  return (state.settings && state.settings.byKey && state.settings.byKey[k]) ? state.settings.byKey[k] : null;
}

function getSettingText(key, fallback = "") {
  const row = getSettingRow(key);
  const v = row ? (row.value ?? row.Value ?? row.val ?? "") : "";
  const s = String(v ?? "").trim();
  return s ? s : String(fallback ?? "");
}

function getSettingNumber(key, fallback = 0) {
  const row = getSettingRow(key);
  let v = row ? (row.value ?? row.Value ?? row.val ?? "") : "";
  if (v === null || v === undefined) v = "";
  const s = String(v).trim().replace(",", ".");
  if (!s) return Number(fallback) || 0;
  const n = Number(s);
  return isFinite(n) ? n : (Number(fallback) || 0);
}

const __LAUNDRY_DEFAULT_COMPONENTS__ = [
  { id: "lc-mat", titolo: "Lenzuolo Matrimoniale", abbreviazione: "MAT", prezzo: 0, colore: "blue" },
  { id: "lc-sin", titolo: "Lenzuolo Singolo", abbreviazione: "SIN", prezzo: 0, colore: "blue" },
  { id: "lc-fed", titolo: "Federe", abbreviazione: "FED", prezzo: 0, colore: "blue" },
  { id: "lc-tdo", titolo: "Telo Doccia", abbreviazione: "TDO", prezzo: 0, colore: "orange" },
  { id: "lc-tfa", titolo: "Telo Faccia", abbreviazione: "TFA", prezzo: 0, colore: "orange" },
  { id: "lc-tbi", titolo: "Telo Bidet", abbreviazione: "TBI", prezzo: 0, colore: "orange" },
  { id: "lc-tap", titolo: "Tappeto", abbreviazione: "TAP", prezzo: 0, colore: "sand" },
  { id: "lc-tpi", titolo: "Telo Piscina", abbreviazione: "TPI", prezzo: 0, colore: "purple" },
];

const __LAUNDRY_RESERVED_KEYS__ = new Set([
  "id","startdate","start_date","enddate","end_date","from","to","createdat","created_at","updatedat","updated_at","deletedat","deleted_at","isdeleted","is_deleted","deleted","totalcost","laundryprices","laundry_prices","laundrycatalog","laundry_catalog"
]);

function __normalizeLaundryColor__(value){
  return __normalizeOperatoreColor__(value);
}

function __normalizeLaundryCode__(value){
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10);
}

function __laundryLegacyPriceMap__(){
  const row = getSettingRow("laundry_prices");
  const raw = row ? (row.value ?? row.Value ?? "") : "";
  const out = {};
  if (!String(raw || '').trim()) return out;
  try{
    const parsed = JSON.parse(String(raw || '{}'));
    Object.keys(parsed || {}).forEach((key) => {
      const code = __normalizeLaundryCode__(key);
      if (!code) return;
      const n = Number(String(parsed?.[key] ?? '').replace(',', '.'));
      out[code] = (isFinite(n) && n >= 0) ? Math.round(n * 100) / 100 : 0;
    });
  }catch(_){ }
  return out;
}

function __defaultLaundryCatalogFromLegacy__(){
  const priceMap = __laundryLegacyPriceMap__();
  return __LAUNDRY_DEFAULT_COMPONENTS__.map((item, idx) => ({
    id: String(item.id || `lc-${idx+1}`),
    titolo: String(item.titolo || '').trim(),
    abbreviazione: __normalizeLaundryCode__(item.abbreviazione || item.code || item.sigla),
    prezzo: (() => { const n = Number(priceMap?.[__normalizeLaundryCode__(item.abbreviazione)] ?? item.prezzo ?? 0); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
    colore: __normalizeLaundryColor__(item.colore || 'blue'),
  }));
}

function __sanitizeLaundryCatalogList__(list, { fallbackToDefault = true } = {}){
  const baseMap = new Map(__LAUNDRY_DEFAULT_COMPONENTS__.map(item => [__normalizeLaundryCode__(item.abbreviazione), item]));
  const input = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];
  input.forEach((item, idx) => {
    const code = __normalizeLaundryCode__(item?.abbreviazione ?? item?.code ?? item?.sigla ?? item?.key);
    const legacy = code ? baseMap.get(code) : null;
    const titolo = String(item?.titolo ?? item?.nome ?? item?.label ?? item?.title ?? legacy?.titolo ?? code).trim();
    if (!code || !titolo || seen.has(code)) return;
    const rawPrice = item?.prezzo ?? item?.price ?? item?.prezzo_pulizia ?? item?.unitPrice ?? item?.costo;
    const priceNum = Number(String(rawPrice ?? legacy?.prezzo ?? 0).replace(',', '.'));
    out.push({
      id: String(item?.id || `lc-${Date.now()}-${idx}`),
      titolo,
      abbreviazione: code,
      prezzo: isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : 0,
      colore: __normalizeLaundryColor__(item?.colore ?? item?.color ?? legacy?.colore ?? 'blue'),
    });
    seen.add(code);
  });
  return out.length ? out : (fallbackToDefault ? __defaultLaundryCatalogFromLegacy__() : []);
}

function getLaundryCatalogFromSettings(){
  const row = getSettingRow("laundry_catalogo");
  const raw = row ? (row.value ?? row.Value ?? "") : "";
  if (!String(raw || '').trim()) return __defaultLaundryCatalogFromLegacy__();
  try{
    const parsed = JSON.parse(String(raw || '[]'));
    return __sanitizeLaundryCatalogList__(parsed, { fallbackToDefault: true });
  }catch(_){
    return __defaultLaundryCatalogFromLegacy__();
  }
}

function getLaundryComponentCodes(){
  return getLaundryCatalogFromSettings().map(item => String(item?.abbreviazione || '').trim()).filter(Boolean);
}

function __laundryCatalogMapByCode__(catalog){
  const map = new Map();
  (Array.isArray(catalog) ? catalog : []).forEach((item) => {
    const code = __normalizeLaundryCode__(item?.abbreviazione ?? item?.code);
    if (!code || map.has(code)) return;
    map.set(code, {
      id: String(item?.id || code),
      titolo: String(item?.titolo ?? item?.nome ?? item?.label ?? item?.title ?? code).trim() || code,
      abbreviazione: code,
      prezzo: (() => { const n = Number(String(item?.prezzo ?? item?.price ?? item?.unitPrice ?? 0).replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
      colore: __normalizeLaundryColor__(item?.colore ?? item?.color ?? 'blue'),
    });
  });
  return map;
}

function __detectLaundryCodesFromRecord__(it){
  const set = new Set();
  try{ getLaundryComponentCodes().forEach(code => { if (code) set.add(code); }); }catch(_){ }
  try{ __LAUNDRY_DEFAULT_COMPONENTS__.forEach(item => set.add(__normalizeLaundryCode__(item.abbreviazione))); }catch(_){ }
  Object.keys(it || {}).forEach((rawKey) => {
    const lowered = String(rawKey || '').trim().toLowerCase();
    if (!lowered || __LAUNDRY_RESERVED_KEYS__.has(lowered)) return;
    let candidate = lowered;
    if (/_resi$/i.test(rawKey)) candidate = lowered.slice(0, -5);
    else if (/_r$/i.test(rawKey)) candidate = lowered.slice(0, -2);
    else if (/r$/i.test(rawKey) && lowered.length > 1) candidate = lowered.slice(0, -1);
    const code = __normalizeLaundryCode__(candidate);
    if (code) set.add(code);
  });
  return Array.from(set).filter(Boolean);
}

function __getLaundryCatalogForRecord__(it){
  const settingsCatalog = getLaundryCatalogFromSettings();
  const settingsMap = __laundryCatalogMapByCode__(settingsCatalog);
  const snapshot = __sanitizeLaundryCatalogList__(Array.isArray(it?.laundryCatalog) ? it.laundryCatalog : (Array.isArray(it?.laundry_catalog) ? it.laundry_catalog : []), { fallbackToDefault: false });
  const map = __laundryCatalogMapByCode__(snapshot.length ? snapshot : settingsCatalog);
  const extras = __detectLaundryCodesFromRecord__(it);
  extras.forEach((code, idx) => {
    if (map.has(code)) return;
    const fromSettings = settingsMap.get(code);
    const fromLegacy = __LAUNDRY_DEFAULT_COMPONENTS__.find(item => __normalizeLaundryCode__(item.abbreviazione) === code);
    map.set(code, {
      id: String(fromSettings?.id || fromLegacy?.id || `lc-extra-${idx}`),
      titolo: String(fromSettings?.titolo || fromLegacy?.titolo || code).trim() || code,
      abbreviazione: code,
      prezzo: (() => { const n = Number(fromSettings?.prezzo ?? fromLegacy?.prezzo ?? 0); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
      colore: __normalizeLaundryColor__(fromSettings?.colore || fromLegacy?.colore || 'blue'),
    });
  });
  const ordered = [];
  const pushFrom = (arr) => {
    (Array.isArray(arr) ? arr : []).forEach((item) => {
      const code = __normalizeLaundryCode__(item?.abbreviazione ?? item?.code);
      if (!code || !map.has(code) || ordered.some(row => row.abbreviazione === code)) return;
      ordered.push(map.get(code));
    });
  };
  pushFrom(snapshot.length ? snapshot : settingsCatalog);
  Array.from(map.keys()).forEach((code) => {
    if (!ordered.some(row => row.abbreviazione === code)) ordered.push(map.get(code));
  });
  return ordered.filter(item => item && item.abbreviazione);
}

function getLaundryPricesFromSettings(){
  const out = {};
  getLaundryCatalogFromSettings().forEach((item) => {
    const code = __normalizeLaundryCode__(item?.abbreviazione);
    if (!code) return;
    const n = Number(item?.prezzo || 0);
    out[code] = isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  });
  return out;
}

async function saveLaundryCatalogToSettings(list){
  const clean = __sanitizeLaundryCatalogList__(list, { fallbackToDefault: false });
  const priceMap = {};
  clean.forEach((item) => {
    priceMap[item.abbreviazione] = Math.round((Number(item.prezzo || 0) || 0) * 100) / 100;
  });
  await api("impostazioni", {
    method: "POST",
    body: {
      laundry_catalogo: clean,
      laundry_prices: priceMap,
    },
    showLoader: true,
  });
  await ensureSettingsLoaded({ force: true, showLoader: false });
  return clean;
}

async function saveLaundryPricesToSettings(prices){
  const map = prices && typeof prices === 'object' ? prices : {};
  const next = getLaundryCatalogFromSettings().map((item) => {
    const code = __normalizeLaundryCode__(item?.abbreviazione);
    const raw = Number(String(map?.[code] ?? item?.prezzo ?? 0).replace(',', '.'));
    return { ...item, prezzo: isFinite(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : 0 };
  });
  await saveLaundryCatalogToSettings(next);
  return getLaundryPricesFromSettings();
}

function __laundryMoneyFmt__(value){
  const n = Number(value || 0);
  return euro(isFinite(n) ? n : 0);
}

function __laundryComputeTotalCost__(item, prices){
  const priceMap = (prices && typeof prices === 'object') ? prices : getLaundryPricesFromSettings();
  const defs = __getLaundryCatalogForRecord__(item);
  let total = 0;
  defs.forEach((def) => {
    const code = String(def?.abbreviazione || '').trim();
    if (!code) return;
    const qty = Math.max(0, Number(item?.[code] || 0) || 0);
    const unit = Math.max(0, Number(priceMap?.[code] ?? def?.prezzo ?? 0) || 0);
    total += qty * unit;
  });
  return Math.round(total * 100) / 100;
}

function getOperatorNamesFromSettings() {
  try{
    const catalog = getOperatoriCatalogFromSettings ? getOperatoriCatalogFromSettings() : [];
    const names = (Array.isArray(catalog) ? catalog : []).map(item => String(item?.nome || '').trim()).filter(Boolean);
    if (names.length) return names;
  }catch(_){ }
  const row = getSettingRow("operatori");
  const op1 = String(row?.operatore_1 ?? row?.Operatore_1 ?? row?.operatore1 ?? "").trim();
  const op2 = String(row?.operatore_2 ?? row?.Operatore_2 ?? row?.operatore2 ?? "").trim();
  const op3 = String(row?.operatore_3 ?? row?.Operatore_3 ?? row?.operatore3 ?? "").trim();
  return [op1, op2, op3].filter(Boolean);
}



const __OPERATORI_COLOR_KEYS__ = ["blue","orange","green","red","purple","sand"];

function __normalizeOperatoreColor__(value){
  const key = String(value || "blue").trim().toLowerCase();
  return __OPERATORI_COLOR_KEYS__.includes(key) ? key : "blue";
}


function __operatoreColorHex__(color){
  switch(__normalizeOperatoreColor__(color)){
    case 'orange': return '#f29c50';
    case 'green': return '#4caf7d';
    case 'red': return '#e25d4b';
    case 'purple': return '#8f78d4';
    case 'sand': return '#d6b276';
    case 'blue':
    default: return '#6fb7d6';
  }
}

function __normalizeOperatoreNameKey__(value){
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function __operatoreCatalogMapByName__(){
  const map = new Map();
  try{
    (getOperatoriCatalogFromSettings() || []).forEach((item) => {
      const name = String(item?.nome || '').trim();
      const key = __normalizeOperatoreNameKey__(name);
      if (!key) return;
      map.set(key, { ...item, nome: name });
    });
  }catch(_){ }
  return map;
}

function getActiveOperatorNames(){
  return Array.from(__operatoreCatalogMapByName__().values()).map(item => String(item?.nome || '').trim()).filter(Boolean);
}

function getCanonicalActiveOperatorName(name){
  const key = __normalizeOperatoreNameKey__(name);
  if (!key) return '';
  try{
    const map = __operatoreCatalogMapByName__();
    if (map.has(key)) return String(map.get(key)?.nome || '').trim();
  }catch(_){ }
  return '';
}

function isActiveOperatorName(name){
  return !!getCanonicalActiveOperatorName(name);
}

function getOperatoreCatalogItemByName(name){
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  try{
    const map = __operatoreCatalogMapByName__();
    if (map.has(key)) return map.get(key) || null;
    for (const [k, item] of map.entries()){
      if (!k) continue;
      if (k === key || k.includes(key) || key.includes(k)) return item || null;
    }
  }catch(_){ }
  return null;
}

function getOperatoreColorHexByName(name, fallbackColor){
  const item = getOperatoreCatalogItemByName(name);
  return __operatoreColorHex__(item?.colore || fallbackColor || 'blue');
}

function getOperatoreTariffaByName(name, fallbackValue = 0){
  const item = getOperatoreCatalogItemByName(name);
  const val = Number(item?.tariffa);
  if (isFinite(val) && val >= 0) return Math.round(val * 100) / 100;
  const fb = Number(fallbackValue || 0);
  return isFinite(fb) && fb >= 0 ? Math.round(fb * 100) / 100 : 0;
}

function getOperatoreBenzinaByName(name, fallbackValue = 0){
  const item = getOperatoreCatalogItemByName(name);
  const val = Number(item?.benzina);
  if (isFinite(val) && val >= 0) return Math.round(val * 100) / 100;
  const fb = Number(fallbackValue || 0);
  return isFinite(fb) && fb >= 0 ? Math.round(fb * 100) / 100 : 0;
}


function __normalizeChannelColor__(color){
  const raw = String(color || '').trim().toLowerCase();
  return __OPERATORI_COLOR_KEYS__.includes(raw) ? raw : 'orange';
}

function __channelInitialFromName__(name){
  const clean = String(name || '').trim();
  return clean ? clean.charAt(0).toUpperCase() : 'C';
}

function getChannelCatalogFromSettings(){
  const row = getSettingRow("channel_catalogo");
  const raw = row ? (row.value ?? row.Value ?? "") : "";
  if (!String(raw || "").trim()) return [];
  try{
    const parsed = JSON.parse(String(raw || '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, idx) => ({
      id: String(item?.id || `ch-${idx+1}-${Date.now()}`),
      nome: String(item?.nome || item?.name || '').trim(),
      commissione: (() => { const n = Number(String(item?.commissione ?? item?.commission ?? item?.percentuale ?? '').replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
      iniziale: String(item?.iniziale || item?.initial || '').trim().slice(0,1).toUpperCase(),
      colore: __normalizeChannelColor__(item?.colore),
    })).filter(item => item.nome).map(item => ({ ...item, iniziale: item.iniziale || __channelInitialFromName__(item.nome) }));
  }catch(_){
    return [];
  }
}

async function saveChannelCatalogToSettings(list){
  const clean = (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: String(item?.id || `ch-${Date.now()}-${idx}`),
    nome: String(item?.nome || '').trim(),
    commissione: (() => { const n = Number(String(item?.commissione ?? item?.commission ?? '').replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
    iniziale: String(item?.iniziale || item?.initial || '').trim().slice(0,1).toUpperCase() || __channelInitialFromName__(item?.nome),
    colore: __normalizeChannelColor__(item?.colore),
  })).filter(item => item.nome);
  await api("impostazioni", { method:"POST", body:{ channel_catalogo: clean }, showLoader:true });
  await ensureSettingsLoaded({ force:true, showLoader:false });
  try{ populateGuestChannelOptions(); }catch(_){ }
  return clean;
}

function getChannelCatalogItemById(id){
  const key = String(id || '').trim();
  if (!key) return null;
  return getChannelCatalogFromSettings().find(item => String(item.id) === key) || null;
}

function populateGuestChannelOptions(selectedId = null){
  const sel = document.getElementById('guestChannel');
  if (!sel) return;
  const current = (selectedId == null) ? String(sel.value || '').trim() : String(selectedId || '').trim();
  const items = getChannelCatalogFromSettings();
  sel.innerHTML = `<option value="">Seleziona…</option>` + items.map(item => `<option value="${String(item.id).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]||s))}">${String(item.nome || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]||s))}</option>`).join('');
  if (current && items.some(item => String(item.id) === current)) sel.value = current;
}

function applySelectedChannelToGuestForm(channelId, { preserveManual=false } = {}){
  const sel = document.getElementById('guestChannel');
  const pctEl = document.getElementById('guestChannelCommission');
  const item = getChannelCatalogItemById(channelId || sel?.value || '');
  if (sel && item) sel.value = String(item.id);
  if (pctEl) pctEl.value = item ? String(item.commissione) : '';
  try{ state.guestChannelId = item ? String(item.id) : ''; }catch(_){ }
  try{ state.guestChannelName = item ? String(item.nome) : ''; }catch(_){ }
  try{ state.guestChannelColor = item ? String(item.colore) : ''; }catch(_){ }
  try{ state.guestChannelInitial = item ? String(item.iniziale || __channelInitialFromName__(item.nome)) : ''; }catch(_){ }
  try{ state.guestChannelCommissionPct = item ? Number(item.commissione || 0) : 0; }catch(_){ }
  try{ recalcGuestCommission(); }catch(_){ }
  if (!preserveManual){ try{ refreshFloatingLabels(); }catch(_){ } }
}

function getGuestChannelBadgeData(item){
  const id = String(item?.channel_id ?? item?.channelId ?? '').trim();
  const catalogItem = id ? getChannelCatalogItemById(id) : null;
  const color = __normalizeChannelColor__(catalogItem?.colore || item?.channel_colore || item?.channelColor || 'orange');
  const initial = String(catalogItem?.iniziale || item?.channel_iniziale || item?.channelInitial || __channelInitialFromName__(catalogItem?.nome || item?.channel_nome || item?.channelName || '')).trim().slice(0,1).toUpperCase() || 'C';
  const name = String(catalogItem?.nome || item?.channel_nome || item?.channelName || '').trim();
  return { color, initial, name };
}

function __operatoriCatalogDefaultFromLegacy__(){
  const names = getOperatorNamesFromSettings().filter(Boolean);
  if (!names.length) return [];
  const tariffa = getSettingNumber("tariffa_oraria", 0);
  const benzina = getSettingNumber("costo_benzina", 0);
  return names.map((nome, idx) => ({
    id: `legacy-${idx+1}`,
    nome,
    tariffa,
    benzina,
    colore: __OPERATORI_COLOR_KEYS__[idx] || "blue",
  }));
}

function getOperatoriCatalogFromSettings(){
  const row = getSettingRow("operatori_catalogo");
  const raw = row ? (row.value ?? row.Value ?? "") : "";
  if (!String(raw || "").trim()) return __operatoriCatalogDefaultFromLegacy__();
  try{
    const parsed = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(parsed)) return __operatoriCatalogDefaultFromLegacy__();
    return parsed.map((item, idx) => ({
      id: String(item?.id || `op-${idx+1}-${Date.now()}`),
      nome: String(item?.nome || item?.name || "").trim(),
      tariffa: (() => { const n = Number(String(item?.tariffa ?? "").replace(",", ".")); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
      benzina: (() => { const n = Number(String(item?.benzina ?? "").replace(",", ".")); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
      colore: __normalizeOperatoreColor__(item?.colore),
    })).filter(item => item.nome);
  }catch(_){
    return __operatoriCatalogDefaultFromLegacy__();
  }
}

async function saveOperatoriCatalogToSettings(list){
  const clean = (Array.isArray(list) ? list : []).map((item, idx) => ({
    id: String(item?.id || `op-${Date.now()}-${idx}`),
    nome: String(item?.nome || "").trim(),
    tariffa: (() => { const n = Number(String(item?.tariffa ?? "").replace(",", ".")); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
    benzina: (() => { const n = Number(String(item?.benzina ?? "").replace(",", ".")); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; })(),
    colore: __normalizeOperatoreColor__(item?.colore),
  })).filter(item => item.nome);
  const firstThree = clean.slice(0, 3).map(item => item.nome);
  await api("impostazioni", {
    method: "POST",
    body: {
      operatori_catalogo: clean,
      operatori: firstThree,
    },
    showLoader: true,
  });
  await ensureSettingsLoaded({ force: true, showLoader: false });
  try{ if (window.__syncCleanOperators__) window.__syncCleanOperators__(); }catch(_){ }
  return clean;
}

async function ensureSettingsLoaded({ force = false, showLoader = false } = {}) {
  try {
    if (!force && state.settings?.loaded) return state.settings;
    const data = await api("impostazioni", { method: "GET", showLoader });
    const rows = data?.rows || data?.items || [];
    state.settings.rows = Array.isArray(rows) ? rows : [];
    state.settings.byKey = __parseSettingsRows(state.settings.rows);
    state.settings.loaded = true;
    state.settings.loadedAt = Date.now();

    try{ if (typeof window.__syncCleanOperators__ === "function") window.__syncCleanOperators__(); }catch(_){ }
    try{ refreshFloatingLabels(); }catch(_){ }
    try{ updateSettingsRoomsButtonLabel(); }catch(_){ }
    try{ ensureRoomsPickerButtons(); }catch(_){ }
    try{ populateGuestChannelOptions(); }catch(_){ }
    try{ __hydrateAppLanguageFromSettings__(); }catch(_){ }
    try{ if (state && state.page === "pulizie") window.__ddae_refreshPulizieGrid?.({ forceReload:true }); }catch(_){ }
    try{ if (state && state.page === "lavanderia") renderLaundry_(state?.laundry?.current || null); }catch(_){ }
    try{ if (state && state.page === "laundrycatalog") renderLaundryCatalogPage(); }catch(_){ }

    return state.settings;
  } catch (e) {
    // Non bloccare l'app se il foglio non è ancora pronto
    console.warn("Impostazioni: load failed", e);
    return state.settings;
  }
}

const __settingsTaxCapUi = {
  value: 0,
  holdTimer: null,
  holdTriggered: false,
  holdDelay: 500,
};

function getTouristTaxMaxNightsSetting(fallback = 3) {
  const raw = getSettingNumber("tassa_soggiorno_max_notti", fallback);
  return Math.max(0, parseInt(raw, 10) || 0);
}

function renderTassaMaxNottiButton() {
  const btn = document.getElementById("setTassaMaxNottiBtn");
  const val = document.getElementById("setTassaMaxNottiVal");
  const n = Math.max(0, parseInt(__settingsTaxCapUi.value, 10) || 0);
  if (btn) {
    btn.dataset.value = String(n);
    btn.classList.toggle("is-empty", n <= 0);
  }
  if (val) val.textContent = n > 0 ? String(n) : "—";
}

function setTassaMaxNottiValue(next, { silent = false } = {}) {
  __settingsTaxCapUi.value = Math.max(0, parseInt(next, 10) || 0);
  renderTassaMaxNottiButton();
  if (!silent) refreshFloatingLabels();
}

function bindTassaMaxNottiButton() {
  const btn = document.getElementById("setTassaMaxNottiBtn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  const clearHold = () => {
    if (__settingsTaxCapUi.holdTimer) {
      clearTimeout(__settingsTaxCapUi.holdTimer);
      __settingsTaxCapUi.holdTimer = null;
    }
  };

  const startHold = () => {
    clearHold();
    __settingsTaxCapUi.holdTriggered = false;
    __settingsTaxCapUi.holdTimer = setTimeout(() => {
      __settingsTaxCapUi.holdTriggered = true;
      setTassaMaxNottiValue(0);
      try { toast("Massimo notti azzerato"); } catch(_) {}
    }, __settingsTaxCapUi.holdDelay);
  };

  const endHold = () => {
    clearHold();
    setTimeout(() => { __settingsTaxCapUi.holdTriggered = false; }, 0);
  };

  btn.addEventListener("pointerdown", startHold, { passive: true });
  btn.addEventListener("pointerup", endHold, { passive: true });
  btn.addEventListener("pointerleave", endHold, { passive: true });
  btn.addEventListener("pointercancel", endHold, { passive: true });

  btn.addEventListener("click", () => {
    if (__settingsTaxCapUi.holdTriggered) return;
    setTassaMaxNottiValue((__settingsTaxCapUi.value || 0) + 1);
  });
}

function __openSettingsConfigModal__(){
  const modal = document.getElementById("settingsConfigModal");
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  try{ loadImpostazioniPage({ force:false }); }catch(_){ }
  try{ refreshFloatingLabels(); }catch(_){ }
}

function __closeSettingsConfigModal__(){
  const modal = document.getElementById("settingsConfigModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function __openSettingsBackupModal__(){
  const modal = document.getElementById("settingsBackupModal");
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function __closeSettingsBackupModal__(){
  const modal = document.getElementById("settingsBackupModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

async function loadImpostazioniPage({ force = false } = {}) {
  await ensureSettingsLoaded({ force, showLoader: true });
  try {
    const ts = document.getElementById("setTassa");
    if (ts) ts.value = String(getSettingNumber("tassa_soggiorno", (typeof TOURIST_TAX_EUR_PPN !== "undefined" ? TOURIST_TAX_EUR_PPN : 0)) || "");

    bindTassaMaxNottiButton();
    setTassaMaxNottiValue(getTouristTaxMaxNightsSetting(3), { silent: true });
    try{ updateSettingsAccountName(); }catch(_){ }
    try{ updateSettingsRoomsButtonLabel(); }catch(_){ }
    try{ ensureRoomsPickerButtons(); }catch(_){ }

    refreshFloatingLabels();
  } catch (e) {
    toast(e.message);
  }
}

function __readNumInput(id) {
  const el = document.getElementById(id);
  const raw = el ? String(el.value || "").trim() : "";
  if (!raw) return "";
  const n = Number(raw.replace(",", "."));
  if (!isFinite(n) || n < 0) return "";
  return Math.round(n * 100) / 100;
}

async function saveImpostazioniPage() {
  const tassa = __readNumInput("setTassa");
  const tassaMaxNotti = Math.max(0, parseInt(__settingsTaxCapUi.value, 10) || 0);

  const payload = {
    tassa_soggiorno: tassa,
    tassa_soggiorno_max_notti: tassaMaxNotti,
  };

  await api("impostazioni", { method: "POST", body: payload, showLoader: true });
  await ensureSettingsLoaded({ force: true, showLoader: false });

  try{ __closeSettingsConfigModal__(); }catch(_){ }
  toast("Impostazioni salvate");
}

const __operatoriPageUi = {
  color: "blue",
  editingId: "",
};

function __operatoriFormatMoney__(value){
  const n = Number(value || 0);
  const safe = isFinite(n) ? n : 0;
  return `€ ${safe.toFixed(2)}`;
}

function __operatoriSetSelectedColor__(color){
  __operatoriPageUi.color = __normalizeOperatoreColor__(color);
  try{
    document.querySelectorAll('#operatoriColorGrid .operatori-color-option').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.color === __operatoriPageUi.color);
    });
  }catch(_){ }
}

function __operatoriOpenModal__(item){
  const modal = document.getElementById('operatoriEditorModal');
  if (!modal) return;
  const current = item || null;
  __operatoriPageUi.editingId = current?.id ? String(current.id) : '';
  const title = document.getElementById('operatoriEditorTitle');
  const idEl = document.getElementById('operatoriEditorId');
  const nomeEl = document.getElementById('operatoriEditorNome');
  const tariffaEl = document.getElementById('operatoriEditorTariffa');
  const benzinaEl = document.getElementById('operatoriEditorBenzina');
  const delBtn = document.getElementById('operatoriEditorDelete');
  if (title) title.textContent = current ? 'Modifica operatore' : 'Nuovo operatore';
  if (idEl) idEl.value = current?.id ? String(current.id) : '';
  if (nomeEl) nomeEl.value = current?.nome ? String(current.nome) : '';
  if (tariffaEl) tariffaEl.value = current && isFinite(Number(current.tariffa)) ? String(Number(current.tariffa)) : '';
  if (benzinaEl) benzinaEl.value = current && isFinite(Number(current.benzina)) ? String(Number(current.benzina)) : '';
  if (delBtn) delBtn.hidden = !current;
  __operatoriSetSelectedColor__(current?.colore || 'blue');
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  try{ refreshFloatingLabels(); }catch(_){ }
}

function __operatoriCloseModal__(){
  const modal = document.getElementById('operatoriEditorModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  const ids = ['operatoriEditorId','operatoriEditorNome','operatoriEditorTariffa','operatoriEditorBenzina'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  __operatoriPageUi.editingId = '';
  __operatoriSetSelectedColor__('blue');
}

async function renderOperatoriPage(){
  await ensureSettingsLoaded({ force:false, showLoader:false });
  const listEl = document.getElementById('operatoriList');
  const emptyEl = document.getElementById('operatoriEmpty');
  if (!listEl) return;
  const items = getOperatoriCatalogFromSettings();
  if (!items.length){
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = items.map((item) => `
    <article class="operatori-item" data-id="${item.id}">
      <div class="operatori-item-top">
        <div class="operatori-item-left">
          <span class="operatori-tag color-${item.colore}"></span>
          <div class="operatori-name">${String(item.nome || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))}</div>
        </div>
        <div class="operatori-item-actions">
          <button aria-label="Modifica operatore" class="operatori-mini-btn" data-action="edit" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg></button>
          <button aria-label="Elimina operatore" class="operatori-mini-btn is-delete" data-action="delete" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path><path d="M10 11v6M14 11v6"></path></svg></button>
        </div>
      </div>
      <div class="operatori-metrics">
        <div class="operatori-metric">
          <div class="operatori-metric-label">Tariffa</div>
          <div class="operatori-metric-value">${__operatoriFormatMoney__(item.tariffa)}</div>
        </div>
        <div class="operatori-metric">
          <div class="operatori-metric-label">Benzina</div>
          <div class="operatori-metric-value">${__operatoriFormatMoney__(item.benzina)}</div>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadOperatoriPage(){
  await renderOperatoriPage();
}

function setupOperatoriPage(){
  const goBtn = document.getElementById('settingsOperatoriBtn');
  if (goBtn) bindFastTap(goBtn, () => { hideLauncher(); showPage('operatori'); });

  const addBtn = document.getElementById('btnAddOperatoreCard');
  if (addBtn) bindFastTap(addBtn, () => { __operatoriOpenModal__(null); });

  const closeBtn = document.getElementById('operatoriEditorClose');
  if (closeBtn) bindFastTap(closeBtn, __operatoriCloseModal__);
  const cancelBtn = document.getElementById('operatoriEditorCancel');
  if (cancelBtn) bindFastTap(cancelBtn, __operatoriCloseModal__);

  try{
    document.querySelectorAll('#operatoriColorGrid .operatori-color-option').forEach(btn => {
      bindFastTap(btn, () => { __operatoriSetSelectedColor__(btn.dataset.color || 'blue'); });
    });
  }catch(_){ }

  const saveBtn = document.getElementById('operatoriEditorSave');
  if (saveBtn) bindFastTap(saveBtn, async () => {
    try{
      const nome = String(document.getElementById('operatoriEditorNome')?.value || '').trim();
      if (!nome){ toast('Inserisci il nome operatore'); return; }
      const tariffaRaw = String(document.getElementById('operatoriEditorTariffa')?.value || '').trim().replace(',', '.');
      const benzinaRaw = String(document.getElementById('operatoriEditorBenzina')?.value || '').trim().replace(',', '.');
      const tariffa = tariffaRaw ? Number(tariffaRaw) : 0;
      const benzina = benzinaRaw ? Number(benzinaRaw) : 0;
      if (!isFinite(tariffa) || tariffa < 0){ toast('Tariffa non valida'); return; }
      if (!isFinite(benzina) || benzina < 0){ toast('Benzina non valida'); return; }
      const id = String(document.getElementById('operatoriEditorId')?.value || '').trim();
      const list = getOperatoriCatalogFromSettings();
      const nextItem = {
        id: id || `op-${Date.now()}`,
        nome,
        tariffa: Math.round(tariffa * 100) / 100,
        benzina: Math.round(benzina * 100) / 100,
        colore: __operatoriPageUi.color || 'blue',
      };
      const idx = list.findIndex(item => String(item.id) === nextItem.id);
      if (idx >= 0) list[idx] = nextItem;
      else list.push(nextItem);
      await saveOperatoriCatalogToSettings(list);
      __operatoriCloseModal__();
      await renderOperatoriPage();
      toast('Operatore salvato');
    }catch(e){
      toast(e?.message || 'Errore');
    }
  });

  const deleteBtn = document.getElementById('operatoriEditorDelete');
  if (deleteBtn) bindFastTap(deleteBtn, async () => {
    try{
      const id = String(document.getElementById('operatoriEditorId')?.value || '').trim();
      if (!id) return;
      const ok = confirm('Eliminare questo operatore?');
      if (!ok) return;
      const list = getOperatoriCatalogFromSettings().filter(item => String(item.id) !== id);
      await saveOperatoriCatalogToSettings(list);
      __operatoriCloseModal__();
      await renderOperatoriPage();
      toast('Operatore eliminato');
    }catch(e){
      toast(e?.message || 'Errore');
    }
  });

  const listEl = document.getElementById('operatoriList');
  if (listEl) listEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest?.('button[data-action]');
    const card = ev.target.closest?.('.operatori-item');
    if (!card) return;
    const id = String(card.getAttribute('data-id') || '').trim();
    const item = getOperatoriCatalogFromSettings().find(row => String(row.id) === id);
    if (!item) return;
    const action = btn ? String(btn.getAttribute('data-action') || '') : 'edit';
    if (action === 'delete'){
      const ok = confirm('Eliminare questo operatore?');
      if (!ok) return;
      const list = getOperatoriCatalogFromSettings().filter(row => String(row.id) !== id);
      await saveOperatoriCatalogToSettings(list);
      await renderOperatoriPage();
      toast('Operatore eliminato');
      return;
    }
    __operatoriOpenModal__(item);
  });
}


const __channelPageUi = {
  color: "orange",
  editingId: "",
};

function __channelFormatPct__(value){
  const n = Number(value || 0);
  const safe = isFinite(n) ? n : 0;
  return `${safe.toFixed(2)}%`;
}

function __channelSetSelectedColor__(color){
  __channelPageUi.color = __normalizeChannelColor__(color);
  try{
    document.querySelectorAll('#channelColorGrid .operatori-color-option').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.color === __channelPageUi.color);
    });
  }catch(_){ }
}

function __channelOpenModal__(item){
  const modal = document.getElementById('channelEditorModal');
  if (!modal) return;
  const current = item || null;
  __channelPageUi.editingId = current?.id ? String(current.id) : '';
  const title = document.getElementById('channelEditorTitle');
  const idEl = document.getElementById('channelEditorId');
  const nomeEl = document.getElementById('channelEditorNome');
  const commEl = document.getElementById('channelEditorCommission');
  const iniEl = document.getElementById('channelEditorInitial');
  const delBtn = document.getElementById('channelEditorDelete');
  if (title) title.textContent = current ? 'Modifica channel' : 'Nuovo channel';
  if (idEl) idEl.value = current?.id ? String(current.id) : '';
  if (nomeEl) nomeEl.value = current?.nome ? String(current.nome) : '';
  if (commEl) commEl.value = current && isFinite(Number(current.commissione)) ? String(Number(current.commissione)) : '';
  if (iniEl) iniEl.value = current?.iniziale ? String(current.iniziale).slice(0,1).toUpperCase() : '';
  if (delBtn) delBtn.hidden = !current;
  __channelSetSelectedColor__(current?.colore || 'orange');
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  try{ refreshFloatingLabels(); }catch(_){ }
}

function __channelCloseModal__(){
  const modal = document.getElementById('channelEditorModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  ['channelEditorId','channelEditorNome','channelEditorCommission','channelEditorInitial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  __channelPageUi.editingId = '';
  __channelSetSelectedColor__('orange');
}

async function renderChannelPage(){
  await ensureSettingsLoaded({ force:false, showLoader:false });
  const listEl = document.getElementById('channelList');
  const emptyEl = document.getElementById('channelEmpty');
  if (!listEl) return;
  const items = getChannelCatalogFromSettings();
  if (!items.length){
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = items.map((item) => `
    <article class="operatori-item channel-item" data-id="${item.id}">
      <div class="operatori-item-top">
        <div class="operatori-item-left">
          <span class="operatori-tag color-${item.colore}"><span class="channel-tag-letter">${String(item.iniziale || __channelInitialFromName__(item.nome)).slice(0,1).toUpperCase()}</span></span>
          <div class="operatori-name">${String(item.nome || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]||s))}</div>
        </div>
        <div class="operatori-item-actions">
          <button aria-label="Modifica channel" class="operatori-mini-btn" data-action="edit" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg></button>
          <button aria-label="Elimina channel" class="operatori-mini-btn is-delete" data-action="delete" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path><path d="M10 11v6M14 11v6"></path></svg></button>
        </div>
      </div>
      <div class="operatori-metrics channel-metrics-single">
        <div class="operatori-metric">
          <div class="operatori-metric-label">Commissione</div>
          <div class="operatori-metric-value">${__channelFormatPct__(item.commissione)}</div>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadChannelPage(){
  await renderChannelPage();
}

function setupChannelPage(){
  const goBtn = document.getElementById('settingsChannelBtn');
  if (goBtn) bindFastTap(goBtn, () => { hideLauncher(); showPage('channel'); });
  const addBtn = document.getElementById('btnAddChannelCard');
  if (addBtn) bindFastTap(addBtn, () => { __channelOpenModal__(null); });
  const closeBtn = document.getElementById('channelEditorClose');
  if (closeBtn) bindFastTap(closeBtn, __channelCloseModal__);
  const cancelBtn = document.getElementById('channelEditorCancel');
  if (cancelBtn) bindFastTap(cancelBtn, __channelCloseModal__);
  try{
    document.querySelectorAll('#channelColorGrid .operatori-color-option').forEach(btn => {
      bindFastTap(btn, () => { __channelSetSelectedColor__(btn.dataset.color || 'orange'); });
    });
  }catch(_){ }
  const saveBtn = document.getElementById('channelEditorSave');
  if (saveBtn) bindFastTap(saveBtn, async () => {
    try{
      const nome = String(document.getElementById('channelEditorNome')?.value || '').trim();
      if (!nome){ toast('Inserisci il nome channel'); return; }
      const commissionRaw = String(document.getElementById('channelEditorCommission')?.value || '').trim().replace(',', '.');
      const commissione = commissionRaw ? Number(commissionRaw) : 0;
      if (!isFinite(commissione) || commissione < 0){ toast('Commissione non valida'); return; }
      const id = String(document.getElementById('channelEditorId')?.value || '').trim();
      const initialRaw = String(document.getElementById('channelEditorInitial')?.value || '').trim();
      const list = getChannelCatalogFromSettings();
      const nextItem = {
        id: id || `ch-${Date.now()}`,
        nome,
        commissione: Math.round(commissione * 100) / 100,
        iniziale: (initialRaw || __channelInitialFromName__(nome)).slice(0,1).toUpperCase(),
        colore: __channelPageUi.color || 'orange',
      };
      const idx = list.findIndex(item => String(item.id) === nextItem.id);
      if (idx >= 0) list[idx] = nextItem;
      else list.push(nextItem);
      await saveChannelCatalogToSettings(list);
      __channelCloseModal__();
      await renderChannelPage();
      toast('Channel salvato');
    }catch(e){ toast(e?.message || 'Errore'); }
  });
  const deleteBtn = document.getElementById('channelEditorDelete');
  if (deleteBtn) bindFastTap(deleteBtn, async () => {
    try{
      const id = String(document.getElementById('channelEditorId')?.value || '').trim();
      if (!id) return;
      if (!confirm('Eliminare questo channel?')) return;
      const list = getChannelCatalogFromSettings().filter(item => String(item.id) !== id);
      await saveChannelCatalogToSettings(list);
      __channelCloseModal__();
      await renderChannelPage();
      toast('Channel eliminato');
    }catch(e){ toast(e?.message || 'Errore'); }
  });
  const listEl = document.getElementById('channelList');
  if (listEl) listEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest?.('button[data-action]');
    const card = ev.target.closest?.('.channel-item');
    if (!card) return;
    const id = String(card.getAttribute('data-id') || '').trim();
    const item = getChannelCatalogFromSettings().find(row => String(row.id) === id);
    if (!item) return;
    const action = btn ? String(btn.getAttribute('data-action') || '') : 'edit';
    if (action === 'delete'){
      if (!confirm('Eliminare questo channel?')) return;
      const list = getChannelCatalogFromSettings().filter(row => String(row.id) !== id);
      await saveChannelCatalogToSettings(list);
      await renderChannelPage();
      toast('Channel eliminato');
      return;
    }
    __channelOpenModal__(item);
  });
}

function __applyHomeIconGradients__(){
  try{
    document.querySelectorAll('#page-home .home-grid .home-main svg.ui-ico').forEach((svg) => {
      svg.querySelectorAll('defs').forEach((d) => d.remove());
      svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse').forEach((node) => {
        node.style.stroke = 'currentColor';
        node.style.fill = 'none';
      });
    });
  }catch(_){ }
}

const __laundryCatalogPageUi = {
  color: "blue",
  editingId: "",
};

function __laundryCatalogSetSelectedColor__(color){
  __laundryCatalogPageUi.color = __normalizeLaundryColor__(color);
  try{
    document.querySelectorAll('#laundryCatalogColorGrid .operatori-color-option').forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.color === __laundryCatalogPageUi.color);
    });
  }catch(_){ }
}

function __laundryCatalogOpenModal__(item){
  const modal = document.getElementById('laundryCatalogEditorModal');
  if (!modal) return;
  const current = item || null;
  __laundryCatalogPageUi.editingId = current?.id ? String(current.id) : '';
  const title = document.getElementById('laundryCatalogEditorTitle');
  const idEl = document.getElementById('laundryCatalogEditorId');
  const titleEl = document.getElementById('laundryCatalogEditorTitleInput');
  const codeEl = document.getElementById('laundryCatalogEditorCode');
  const priceEl = document.getElementById('laundryCatalogEditorPrice');
  const delBtn = document.getElementById('laundryCatalogEditorDelete');
  if (title) title.textContent = current ? 'Modifica componente lavanderia' : 'Nuovo componente lavanderia';
  if (idEl) idEl.value = current?.id ? String(current.id) : '';
  if (titleEl) titleEl.value = current?.titolo ? String(current.titolo) : '';
  if (codeEl) codeEl.value = current?.abbreviazione ? String(current.abbreviazione) : '';
  if (priceEl) priceEl.value = current && isFinite(Number(current.prezzo)) ? String(Number(current.prezzo)) : '';
  if (delBtn) delBtn.hidden = !current;
  __laundryCatalogSetSelectedColor__(current?.colore || 'blue');
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  try{ refreshFloatingLabels(); }catch(_){ }
}

function __laundryCatalogCloseModal__(){
  const modal = document.getElementById('laundryCatalogEditorModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  ['laundryCatalogEditorId','laundryCatalogEditorTitleInput','laundryCatalogEditorCode','laundryCatalogEditorPrice'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  __laundryCatalogPageUi.editingId = '';
  __laundryCatalogSetSelectedColor__('blue');
}

async function renderLaundryCatalogPage(){
  await ensureSettingsLoaded({ force:false, showLoader:false });
  const listEl = document.getElementById('laundryCatalogList');
  const emptyEl = document.getElementById('laundryCatalogEmpty');
  if (!listEl) return;
  const items = getLaundryCatalogFromSettings();
  if (!items.length){
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = items.map((item) => `
    <article class="operatori-item laundry-component-item" data-id="${item.id}">
      <div class="operatori-item-top">
        <div class="operatori-item-left">
          <span class="operatori-tag color-${item.colore}"></span>
          <div class="operatori-name">${String(item.titolo || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))}</div>
        </div>
        <div class="operatori-item-actions">
          <button aria-label="Modifica componente lavanderia" class="operatori-mini-btn" data-action="edit" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg></button>
          <button aria-label="Elimina componente lavanderia" class="operatori-mini-btn is-delete" data-action="delete" type="button"><svg aria-hidden="true" class="ui-ico" viewbox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path><path d="M10 11v6M14 11v6"></path></svg></button>
        </div>
      </div>
      <div class="operatori-metrics">
        <div class="operatori-metric">
          <div class="operatori-metric-label">Abbreviazione</div>
          <div class="operatori-metric-value">${String(item.abbreviazione || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))}</div>
        </div>
        <div class="operatori-metric">
          <div class="operatori-metric-label">Prezzo pulizia</div>
          <div class="operatori-metric-value">${__laundryMoneyFmt__(item.prezzo)}</div>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadLaundryCatalogPage(){
  await renderLaundryCatalogPage();
}

function setupLaundryCatalogPage(){
  const goBtn = document.getElementById('settingsLaundryCatalogBtn');
  if (goBtn) bindFastTap(goBtn, () => { hideLauncher(); showPage('laundrycatalog'); });
  const addBtn = document.getElementById('btnAddLaundryComponentCard');
  if (addBtn) bindFastTap(addBtn, () => { __laundryCatalogOpenModal__(null); });
  const closeBtn = document.getElementById('laundryCatalogEditorClose');
  if (closeBtn) bindFastTap(closeBtn, __laundryCatalogCloseModal__);
  const cancelBtn = document.getElementById('laundryCatalogEditorCancel');
  if (cancelBtn) bindFastTap(cancelBtn, __laundryCatalogCloseModal__);
  try{
    document.querySelectorAll('#laundryCatalogColorGrid .operatori-color-option').forEach((btn) => {
      bindFastTap(btn, () => { __laundryCatalogSetSelectedColor__(btn.dataset.color || 'blue'); });
    });
  }catch(_){ }
  const saveBtn = document.getElementById('laundryCatalogEditorSave');
  if (saveBtn) bindFastTap(saveBtn, async () => {
    try{
      const titolo = String(document.getElementById('laundryCatalogEditorTitleInput')?.value || '').trim();
      const abbreviazione = __normalizeLaundryCode__(document.getElementById('laundryCatalogEditorCode')?.value || '');
      const priceRaw = String(document.getElementById('laundryCatalogEditorPrice')?.value || '').trim().replace(',', '.');
      const prezzo = priceRaw ? Number(priceRaw) : 0;
      if (!titolo){ toast('Inserisci il titolo componente'); return; }
      if (!abbreviazione){ toast("Inserisci l'abbreviazione"); return; }
      if (!isFinite(prezzo) || prezzo < 0){ toast('Prezzo non valido'); return; }
      const id = String(document.getElementById('laundryCatalogEditorId')?.value || '').trim();
      const list = getLaundryCatalogFromSettings();
      const duplicate = list.find((item) => String(item.id) !== id && String(item.abbreviazione || '').trim().toUpperCase() === abbreviazione);
      if (duplicate){ toast('Abbreviazione già presente'); return; }
      const nextItem = {
        id: id || `lc-${Date.now()}`,
        titolo,
        abbreviazione,
        prezzo: Math.round(prezzo * 100) / 100,
        colore: __laundryCatalogPageUi.color || 'blue',
      };
      const idx = list.findIndex((item) => String(item.id) === nextItem.id);
      if (idx >= 0) list[idx] = nextItem;
      else list.push(nextItem);
      await saveLaundryCatalogToSettings(list);
      __laundryCatalogCloseModal__();
      await renderLaundryCatalogPage();
      try{ window.__ddae_refreshPulizieGrid?.({ forceReload:true }); }catch(_){ }
      try{ if (state && state.page === 'lavanderia') await loadLavanderia(); }catch(_){ }
      toast('Componente lavanderia salvato');
    }catch(e){ toast(e?.message || 'Errore'); }
  });
  const deleteBtn = document.getElementById('laundryCatalogEditorDelete');
  if (deleteBtn) bindFastTap(deleteBtn, async () => {
    try{
      const id = String(document.getElementById('laundryCatalogEditorId')?.value || '').trim();
      if (!id) return;
      if (!confirm('Eliminare questo componente lavanderia?')) return;
      const list = getLaundryCatalogFromSettings().filter((item) => String(item.id) !== id);
      await saveLaundryCatalogToSettings(list);
      __laundryCatalogCloseModal__();
      await renderLaundryCatalogPage();
      try{ window.__ddae_refreshPulizieGrid?.({ forceReload:true }); }catch(_){ }
      try{ if (state && state.page === 'lavanderia') await loadLavanderia(); }catch(_){ }
      toast('Componente lavanderia eliminato');
    }catch(e){ toast(e?.message || 'Errore'); }
  });
  const listEl = document.getElementById('laundryCatalogList');
  if (listEl) listEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest?.('button[data-action]');
    const card = ev.target.closest?.('.laundry-component-item');
    if (!card) return;
    const id = String(card.getAttribute('data-id') || '').trim();
    const item = getLaundryCatalogFromSettings().find((row) => String(row.id) === id);
    if (!item) return;
    const action = btn ? String(btn.getAttribute('data-action') || '') : 'edit';
    if (action === 'delete'){
      if (!confirm('Eliminare questo componente lavanderia?')) return;
      const list = getLaundryCatalogFromSettings().filter((row) => String(row.id) !== id);
      await saveLaundryCatalogToSettings(list);
      await renderLaundryCatalogPage();
      try{ window.__ddae_refreshPulizieGrid?.({ forceReload:true }); }catch(_){ }
      try{ if (state && state.page === 'lavanderia') await loadLavanderia(); }catch(_){ }
      toast('Componente lavanderia eliminato');
      return;
    }
    __laundryCatalogOpenModal__(item);
  });
}

function setupImpostazioni() {
  try{ setupLanguageModal(); }catch(_){ }
  const back = document.getElementById("settingsBackBtn");
  if (back) back.addEventListener("click", () => showPage("home"));

  const save = document.getElementById("settingsSaveBtn");
  if (save) bindFastTap(save, () => { __openSettingsYearModal__(); });


  const operatoriGo = document.getElementById("settingsOperatoriBtn");
  if (operatoriGo) bindFastTap(operatoriGo, () => { hideLauncher(); showPage("operatori"); });
  const laundryCatalogGo = document.getElementById("settingsLaundryCatalogBtn");
  if (laundryCatalogGo) bindFastTap(laundryCatalogGo, () => { hideLauncher(); showPage("laundrycatalog"); });
  const channelGo = document.getElementById("settingsChannelBtn");
  if (channelGo) bindFastTap(channelGo, () => { hideLauncher(); showPage("channel"); });
  const languageBtn = document.getElementById("settingsLanguageBtn");
  if (languageBtn) bindFastTap(languageBtn, () => { try{ __openLanguageModal__(); }catch(_){ } });


  // DB Import/Export (LOCAL) - nuovo accesso unico dal pulsante Database (icona verde)
  try{
    const dbBtn = document.getElementById("settingsDbBtn");
    if (dbBtn) bindFastTap(dbBtn, async () => { try{ if (__isAdmin__()) { __openSettingsBackupModal__(); } }catch(e){ try{ toast("Errore backup", "orange"); }catch(_){ } } });
    const rosterBtn = document.getElementById("settingsExportRosterBtn");
    if (rosterBtn) bindFastTap(rosterBtn, async () => {
      try{
        if (__isAdmin__()) await __adminGenerateCode__();
        else await __qrScanAndLink__();
      }catch(e){
        try{ toast(String((e && e.message) ? e.message : "Errore codice"), "orange"); }catch(_){ }
        try{ console.error("Roster/Firebase error:", e); }catch(_){ }
      }
    });

    // fallback (se presenti in DOM, ma di norma nascosti)
    const dbA = document.getElementById("dbAdminBtn");
    if (dbA) bindFastTap(dbA, () => { __openDbPopup__("admin"); });
    const dbO = document.getElementById("dbOperatorBtn");
    if (dbO) bindFastTap(dbO, () => { __openDbPopup__("operator"); });
  }catch(_){ }
const cfg = document.getElementById("settingsConfigBtn");
  if (cfg) bindFastTap(cfg, () => { __openSettingsConfigModal__(); });

  const roomsBtn = document.getElementById("settingsRoomsBtn");
  const langBtn = document.getElementById("settingsLanguageBtn");
  if (langBtn && !langBtn.__boundLangTap){
    langBtn.__boundLangTap = true;
    bindFastTap(langBtn, () => { try{ __openLanguageModal__(); }catch(_){ } });
  }
  if (roomsBtn && !roomsBtn.__boundRoomsTap){
    roomsBtn.__boundRoomsTap = true;
    let __roomsPressTimer = null;
    let __roomsLongFired = false;
    let __roomsTouchAt = 0;
    const __roomsClearPress = () => {
      try{ if (__roomsPressTimer) clearTimeout(__roomsPressTimer); }catch(_){ }
      __roomsPressTimer = null;
      __roomsLongFired = false;
    };
    const __roomsSaveValue = async (next) => {
      try{
        const current = getConfiguredRoomsCount(6);
        if (Number(next) === Number(current)) { updateSettingsRoomsButtonLabel(); return; }
        await saveRoomsCountSetting(next);
      }catch(e){ try{ toast(e?.message || 'Errore numero stanze'); }catch(_){ } }
    };
    const __roomsTap = async () => {
      try{ __sfxTap(); }catch(_){ }
      const current = getConfiguredRoomsCount(6);
      const next = (current >= 12) ? 1 : (current + 1);
      await __roomsSaveValue(next);
    };
    const __roomsLong = async () => {
      try{ __sfxGlass(); }catch(_){ }
      __roomsLongFired = true;
      await __roomsSaveValue(0);
    };
    roomsBtn.addEventListener('touchstart', (e) => {
      __roomsTouchAt = Date.now();
      __roomsClearPress();
      __roomsPressTimer = setTimeout(() => { __roomsLong(); }, 500);
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    }, { passive:false, capture:true });
    roomsBtn.addEventListener('touchend', async (e) => {
      try{ if (__roomsPressTimer) clearTimeout(__roomsPressTimer); }catch(_){ }
      if (!__roomsLongFired) await __roomsTap();
      __roomsClearPress();
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    }, { passive:false, capture:true });
    roomsBtn.addEventListener('touchcancel', (e) => {
      __roomsClearPress();
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    }, { passive:false, capture:true });
    roomsBtn.addEventListener('click', async (e) => {
      if (Date.now() - __roomsTouchAt < 450) { try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } return; }
      await __roomsTap();
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    }, true);
  }

  const cfgClose = document.getElementById("settingsConfigClose");
  if (cfgClose) bindFastTap(cfgClose, __closeSettingsConfigModal__);
  const cfgCancel = document.getElementById("settingsConfigCancel");
  if (cfgCancel) bindFastTap(cfgCancel, __closeSettingsConfigModal__);
  const cfgSave = document.getElementById("settingsConfigSave");
  if (cfgSave) bindFastTap(cfgSave, async () => {
    try { await saveImpostazioniPage(); __closeSettingsConfigModal__(); } catch (e) { toast(e.message || "Errore"); }
  });
  const cfgModal = document.getElementById("settingsConfigModal");
  if (cfgModal && !cfgModal.__boundClose){
    cfgModal.__boundClose = true;
    cfgModal.addEventListener("click", (e) => { if (e.target === cfgModal) __closeSettingsConfigModal__(); });
  }

  const yearClose = document.getElementById("settingsYearClose");
  if (yearClose) bindFastTap(yearClose, __closeSettingsYearModal__);
  const yearCancel = document.getElementById("settingsYearCancel");
  if (yearCancel) bindFastTap(yearCancel, __closeSettingsYearModal__);
  const yearSave = document.getElementById("settingsYearSave");
  if (yearSave) bindFastTap(yearSave, __saveSettingsYearModal__);
  const yearModal = document.getElementById("settingsYearModal");
  if (yearModal && !yearModal.__boundClose){
    yearModal.__boundClose = true;
    yearModal.addEventListener("click", (e) => { if (e.target === yearModal) __closeSettingsYearModal__(); });
  }
  const yearInput = document.getElementById("settingsYearInput");
  if (yearInput && !yearInput.__boundEnter){
    yearInput.__boundEnter = true;
    yearInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter"){
        e.preventDefault();
        __saveSettingsYearModal__();
      }
    });
  }

  const backupClose = document.getElementById("settingsBackupClose");
  if (backupClose) bindFastTap(backupClose, __closeSettingsBackupModal__);
  const backupCancel = document.getElementById("settingsBackupCancel");
  if (backupCancel) bindFastTap(backupCancel, __closeSettingsBackupModal__);
  const backupImport = document.getElementById("settingsBackupImport");
  if (backupImport) bindFastTap(backupImport, async () => {
    try{
      __closeSettingsBackupModal__();
      await __dbImport__("admin");
    }catch(e){
      try{ toast("Errore backup", "orange"); }catch(_){ }
    }
  });
  const backupExport = document.getElementById("settingsBackupExport");
  if (backupExport) bindFastTap(backupExport, async () => {
    try{
      __closeSettingsBackupModal__();
      let w = null; try{ w = window.open("", "_blank"); }catch(_){ w = null; }
      await __dbExport__("admin", w);
    }catch(e){
      try{ toast("Errore backup", "orange"); }catch(_){ }
    }
  });
  const backupModal = document.getElementById("settingsBackupModal");
  if (backupModal && !backupModal.__boundClose){
    backupModal.__boundClose = true;
    backupModal.addEventListener("click", (e) => { if (e.target === backupModal) __closeSettingsBackupModal__(); });
  }


  const logout = document.getElementById("settingsLogoutBtn");
  if (logout) logout.addEventListener("click", () => {
    try{ clearSession(); }catch(_){ }
    try{ state.session = null; }catch(_){ }
    try{ applyRoleMode(); }catch(_){ }
    try{ __resetInMemoryData__(); }catch(_){ }
    try{ invalidateApiCache(); }catch(_){ }
    try{ showPage("auth"); }catch(_){ }
  });


  // Anno di esercizio (gestito dal pulsante calendario in pagina Impostazioni)
  const selAnno = document.getElementById("setAnno");
  if (selAnno){
    const cy = new Date().getFullYear();
    const years = [];
    for (let y = cy - 3; y <= cy + 2; y++) years.push(String(y));
    selAnno.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    selAnno.value = String(state.exerciseYear || loadExerciseYear());
    selAnno.addEventListener("change", () => { __applyExerciseYearChange__(String(selAnno.value || "")); });
  }

  // =========================
  // OPERATORE: popup crea / modifica
  // =========================
  const opBtn = document.getElementById("settingsCreateOperatorBtn");
  const opModal = document.getElementById("operatorModal");
  const opModalClose = document.getElementById("operatorModalClose");
  const opMenu = document.getElementById("operatorModalMenu");
  const opForm = document.getElementById("operatorModalForm");
  const opCreate = document.getElementById("operatorCreateBtn");
  const opEdit = document.getElementById("operatorEditBtn");
  const opDelete = document.getElementById("operatorDeleteBtn");
  const opBack = document.getElementById("opFormBack");
  const opConfirm = document.getElementById("opFormConfirm");
  const opUser = document.getElementById("opFormUsername");
  const opPass = document.getElementById("opFormPassword");
  const opOwnerPass = document.getElementById("opFormOwnerPassword");
  const opPassLabel = document.getElementById("opFormPasswordLabel");
  const opMsg = document.getElementById("operatorModalMsg");
  const opPassWrap = opPass ? (opPass.closest?.(".field") || opPass.parentElement) : null;

  let __opMode = ""; // "create" | "edit" | "delete"

  function __opSetMsg(msg, kind){
    try{
      if (!opMsg) return;
      opMsg.textContent = String(msg || "");
      opMsg.classList.remove("is-ok","is-err");
      if (kind === "ok") opMsg.classList.add("is-ok");
      if (kind === "err") opMsg.classList.add("is-err");
      opMsg.hidden = !opMsg.textContent;
    }catch(_){ }
  }

  function __opShowMenu(){
    __opMode = "";
    if (opMenu) opMenu.hidden = false;
    if (opForm) opForm.hidden = true;
    if (opUser) opUser.value = "";
    if (opPass) opPass.value = "";
    if (opOwnerPass) opOwnerPass.value = "";
    if (opPassWrap) opPassWrap.hidden = false;
    __opSetMsg("", null);
    try{ refreshFloatingLabels(); }catch(_){ }
  }

  function __opShowForm(mode){
    __opMode = mode;
    if (opMenu) opMenu.hidden = true;
    if (opForm) opForm.hidden = false;
    if (opUser) opUser.value = "";
    if (opPass) opPass.value = "";
    if (opOwnerPass) opOwnerPass.value = "";
    if (opPassLabel) opPassLabel.textContent = (mode === "edit") ? "Nuova password" : (mode === "delete" ? "Password operatore" : "Password operatore");
    if (opConfirm) opConfirm.textContent = (mode === "edit") ? "Salva" : (mode === "delete" ? "Elimina" : "Crea");
    if (opPassWrap) opPassWrap.hidden = (mode === "delete");
    __opSetMsg("", null);
    try{ refreshFloatingLabels(); }catch(_){ }
    try{ setTimeout(()=>{ try{ opUser && opUser.focus(); }catch(_){ } }, 30); }catch(_){ }
  }

  function __opOpen(){
    const s = state.session || loadSession();
    if (!s || !s.username){ toast("Nessun account"); return; }
    if (isOperatoreSession(s)){ toast("Non disponibile per operatori"); return; }
    if (!opModal) return;
    __opShowMenu();
    try{ opModal.hidden = false; opModal.setAttribute("aria-hidden","false"); }catch(_){ }
  }

  function __opClose(){
    if (!opModal) return;
    try{ opModal.hidden = true; opModal.setAttribute("aria-hidden","true"); }catch(_){ }
  }

  async function __opSubmit(){
    try{
      const s = state.session || loadSession();
      if (!s || !s.username){ __opSetMsg("Nessun account", "err"); return; }
      if (isOperatoreSession(s)){ __opSetMsg("Non disponibile per operatori", "err"); return; }

      const ownerUsername = String(s.username || "").trim();
      const operatorUsername = String(opUser?.value || "").trim();
      const __composeOpUser = (tenant, opu)=>{
        const t = String(tenant || '').trim();
        const o = String(opu || '').trim();
        if (!t || !o) return o;
        if (o.includes('__')) return o;
        return `${t}__${o}`;
      };
      const operatorFullUsername = __composeOpUser(ownerUsername, operatorUsername);
      const operatorPassword = String(opPass?.value || "");
      const ownerPassword = String(opOwnerPass?.value || "");

      __opSetMsg("", null);
      if (!operatorUsername) { __opSetMsg("Username operatore mancante", "err"); return; }
      if (__opMode !== "delete" && !operatorPassword) { __opSetMsg((__opMode === "edit") ? "Nuova password mancante" : "Password operatore mancante", "err"); return; }
      if (!ownerPassword) { __opSetMsg("Password owner mancante", "err"); return; }

      if (__opMode === "create"){
        await api("utenti", {
          method:"POST",
          body:{
            op:"create_operator",
            username: ownerUsername,
            password: ownerPassword,
            operator_username: operatorFullUsername,
            operator_password: operatorPassword,
          },
          showLoader:true,
        });
        __opSetMsg("Operatore creato", "ok");
        try{ if (opPass) opPass.value = ""; }catch(_){ }
        try{ if (opOwnerPass) opOwnerPass.value = ""; }catch(_){ }
        try{ refreshFloatingLabels(); }catch(_){ }
        return;
      }

      if (__opMode === "edit"){
        await api("utenti", {
          method:"POST",
          body:{
            op:"update_operator",
            username: ownerUsername,
            password: ownerPassword,
            operator_username: operatorFullUsername,
            newPassword: operatorPassword,
          },
          showLoader:true,
        });
        __opSetMsg("Operatore aggiornato", "ok");
        try{ if (opPass) opPass.value = ""; }catch(_){ }
        try{ if (opOwnerPass) opOwnerPass.value = ""; }catch(_){ }
        try{ refreshFloatingLabels(); }catch(_){ }
        return;
      }

      if (__opMode === "delete"){
        const ok = confirm(`Eliminare l'operatore "${operatorUsername}"?`);
        if (!ok) return;
        await api("utenti", {
          method:"POST",
          body:{
            op:"delete_operator",
            username: ownerUsername,
            password: ownerPassword,
            operator_username: operatorFullUsername,
          },
          showLoader:true,
        });
        __opSetMsg("Operatore eliminato", "ok");
        try{ if (opOwnerPass) opOwnerPass.value = ""; }catch(_){ }
        try{ refreshFloatingLabels(); }catch(_){ }
        return;
      }

      __opSetMsg("Operazione non valida", "err");
    }catch(e){
      const msg = String(e && e.message ? e.message : "Errore");
      if (msg.toLowerCase().includes("username operatore già esistente")){
        __opSetMsg(`Nella struttura "${ownerUsername}" questo username operatore è già in uso. Scegli un nome diverso.`, "err");
      } else {
        __opSetMsg(msg, "err");
      }
    }
  }

  if (opBtn) bindFastTap(opBtn, __opOpen);
  if (opModalClose) bindFastTap(opModalClose, __opClose);
  if (opCreate) bindFastTap(opCreate, ()=>__opShowForm("create"));
  if (opEdit) bindFastTap(opEdit, ()=>__opShowForm("edit"));
  if (opDelete) bindFastTap(opDelete, ()=>__opShowForm("delete"));
  if (opBack) bindFastTap(opBack, __opShowMenu);
  if (opConfirm) bindFastTap(opConfirm, __opSubmit);
}


function setupAuth(){
  const menu = document.getElementById("authMenu");
  const form = document.getElementById("authForm");

  // Menu (landing login) — 4 pulsanti
  const btnCreate = document.getElementById("btnMenuCreate");
  const btnUpdate = document.getElementById("btnMenuUpdate");
  const btnLoginAdmin = document.getElementById("btnMenuLoginAdmin");
  const btnLoginOperator = document.getElementById("btnMenuLoginOperator");

  const btnBack = document.getElementById("btnAuthBack");
  const btnSubmit = document.getElementById("btnAuthSubmit");

  // Crea account: selezione tipologia + tag
  const createRoleWrap = document.getElementById("authCreateRoleWrap");
  const createRoleAdmin = document.getElementById("authCreateRoleAdmin");
  const createRoleOperator = document.getElementById("authCreateRoleOperator");
  const createTypeTag = document.getElementById("authCreateTypeTag");

  const tenantWrap = document.getElementById("authOperatorTenant");
  const credsWrap = document.getElementById("authCredsWrap");
  const u = document.getElementById("authUsername");
  const p = document.getElementById("authPassword");
  const uLabel = document.getElementById("authUsernameLabel");
  const pLabel = document.getElementById("authPasswordLabel");

  const extra = document.getElementById("authExtra");
  const p2Wrap = document.getElementById("authConfirmPasswordWrap");
  const npWrap = document.getElementById("authNewPasswordWrap");

  const p2 = document.getElementById("authPassword2");
  const np1 = document.getElementById("authNewPassword");
  const np2 = document.getElementById("authNewPassword2");

  const hint = document.getElementById("authHint");
  const setHint = (msg)=>{ try{ if (hint) hint.textContent = msg || ""; }catch(_ ){} };

  let mode = "menu"; // menu | create | update | login_admin | login_operator

  const getCreateRole = ()=>{
    try{ if (createRoleOperator && createRoleOperator.checked) return "operatore"; }catch(_ ){}
    return "admin";
  };

  const syncCreateTag = ()=>{
    try{
      if (!createTypeTag) return;
      const role = getCreateRole();
      if (role === "operatore"){
        createTypeTag.textContent = "OPERATORE";
        createTypeTag.classList.add("is-operator");
      } else {
        createTypeTag.textContent = "ADMIN";
        createTypeTag.classList.remove("is-operator");
      }
    }catch(_ ){}
  };

  const clearFields = ()=>{
    try{
      if (u) u.value = "";
      if (p) p.value = "";
      if (p2) p2.value = "";
      if (np1) np1.value = "";
      if (np2) np2.value = "";
      try{ if (createRoleAdmin) createRoleAdmin.checked = true; }catch(_ ){}
      try{ if (createRoleOperator) createRoleOperator.checked = false; }catch(_ ){}
      try{ refreshFloatingLabels(); }catch(_ ){}
    }catch(_ ){}
  };

  const showMenu = ()=>{
    mode = "menu";
    try{ if (menu) menu.hidden = false; }catch(_ ){}
    try{ if (form) form.hidden = true; }catch(_ ){}
    setHint("");
    try{ if (createRoleWrap) createRoleWrap.hidden = true; }catch(_ ){}
    try{ if (tenantWrap) tenantWrap.hidden = true; }catch(_ ){}
    try{ if (extra) extra.hidden = true; }catch(_ ){}
    try{ if (p2Wrap) p2Wrap.hidden = true; }catch(_ ){}
    try{ if (npWrap) npWrap.hidden = true; }catch(_ ){}
    try{ if (credsWrap) credsWrap.hidden = false; }catch(_ ){}
    clearFields();
  };

  const setMode = (m)=>{
    mode = m;
    try{ if (menu) menu.hidden = true; }catch(_ ){}
    try{ if (form) form.hidden = false; }catch(_ ){}
    setHint("");

    // base reset
    try{ if (createRoleWrap) createRoleWrap.hidden = true; }catch(_ ){}
    try{ if (tenantWrap) tenantWrap.hidden = true; }catch(_ ){}
    try{ if (extra) extra.hidden = true; }catch(_ ){}
    try{ if (p2Wrap) p2Wrap.hidden = true; }catch(_ ){}
    try{ if (npWrap) npWrap.hidden = true; }catch(_ ){}
    try{ if (credsWrap) credsWrap.hidden = false; }catch(_ ){}
    try{ if (uLabel) uLabel.textContent = "User"; }catch(_ ){}
    try{ if (pLabel) pLabel.textContent = "Password"; }catch(_ ){}

    clearFields();

    if (m === "create"){
      try{ if (btnSubmit) btnSubmit.textContent = "crea account"; }catch(_ ){}
      try{ if (createRoleWrap) createRoleWrap.hidden = false; }catch(_ ){}
      try{ if (p2Wrap) p2Wrap.hidden = false; }catch(_ ){}
      try{ syncCreateTag(); }catch(_ ){}
      try{ u && u.focus(); }catch(_ ){}
      return;
    }

    if (m === "update"){
      try{ if (btnSubmit) btnSubmit.textContent = "modifica account"; }catch(_ ){}
      try{ if (npWrap) npWrap.hidden = false; }catch(_ ){}
      try{ if (pLabel) pLabel.textContent = "Password attuale"; }catch(_ ){}
      try{ u && u.focus(); }catch(_ ){}
      return;
    }

    if (m === "login_admin"){
      try{ if (btnSubmit) btnSubmit.textContent = "accedi"; }catch(_ ){}
      try{ u && u.focus(); }catch(_ ){}
      return;
    }

    if (m === "login_operator"){
      try{ if (btnSubmit) btnSubmit.textContent = "accedi"; }catch(_ ){}
      try{ u && u.focus(); }catch(_ ){}
      return;
    }
  };

  const goAfterLogin = ()=>{
    try{ state.exerciseYear = loadExerciseYear(); }catch(_ ){}
    try{ updateYearPill(); }catch(_ ){}
    try{ __applyContext__({ force:true }); }catch(_ ){}
    try{ applyRoleMode(); }catch(_ ){}
    try{ if (window.__syncCleanOperators__) window.__syncCleanOperators__(); }catch(_ ){}
    showPage(isOperatoreSession(state.session) ? "pulizie" : "home");
  };

  const mapAuthError = (msg)=>{
    const m = String(msg || "").trim();
    return m || "Errore";
  };

  // Bind menu
  if (btnCreate) bindFastTap(btnCreate, ()=>setMode("create"));
  if (btnUpdate) bindFastTap(btnUpdate, ()=>setMode("update"));
  if (btnLoginAdmin) bindFastTap(btnLoginAdmin, ()=>setMode("login_admin"));
  if (btnLoginOperator) bindFastTap(btnLoginOperator, ()=>setMode("login_operator"));
  if (btnBack) bindFastTap(btnBack, showMenu);

  // Radio create role -> tag
  try{
    if (createRoleAdmin) createRoleAdmin.addEventListener("change", syncCreateTag);
    if (createRoleOperator) createRoleOperator.addEventListener("change", syncCreateTag);
  }catch(_ ){}

  if (btnSubmit) bindFastTap(btnSubmit, async ()=>{
    try{
      const username = String(u ? u.value : "").trim();
      const password = String(p ? p.value : "");
      if (!username || !password){ setHint("Inserisci user e password"); return; }

      if (mode === "create"){
        const confirm = String(p2 ? p2.value : "");
        if (!confirm){ setHint("Conferma password"); return; }
        if (confirm !== password){ setHint("Le password non coincidono"); return; }
        setHint("...");
        const role = getCreateRole();
        const data = await api("utenti", { method:"POST", body:{ op:"create", role, username, password } });
        if (!data || !data.user) throw new Error("Errore creazione account");
        state.session = data.user;
        saveSession(state.session);
        setHint("");
        goAfterLogin();
        return;
      }

      if (mode === "update"){
        const newPassword = String(np1 ? np1.value : "");
        const newPassword2 = String(np2 ? np2.value : "");
        if (!newPassword || !newPassword2){ setHint("Inserisci e conferma la nuova password"); return; }
        if (newPassword !== newPassword2){ setHint("Le nuove password non coincidono"); return; }
        setHint("...");
        const data = await api("utenti", { method:"POST", body:{ op:"update", username, password, newPassword } });
        if (!data || !data.user) throw new Error("Errore modifica account");
        state.session = data.user;
        saveSession(state.session);
        setHint("");
        goAfterLogin();
        return;
      }

      if (mode === "login_admin" || mode === "login_operator"){
        setHint("...");
        const data = await api("utenti", { method:"POST", body:{ op:"login", username, password } });
        if (!data || !data.user) throw new Error("Credenziali non valide");
        if (mode === "login_admin" && isOperatoreSession(data.user)) { setHint("Questo account è un operatore. Accedi come operatore."); return; }
        if (mode === "login_operator" && !isOperatoreSession(data.user)) { setHint("Questo account è un admin. Accedi come admin."); return; }
        state.session = data.user;
        saveSession(state.session);
        setHint("");
        goAfterLogin();
        return;
      }

      showMenu();
    }catch(e){
      setHint(mapAuthError(e && e.message ? e.message : e));
    }
  });

  showMenu();
}
// ===== API Cache (speed + dedupe richieste) =====
const __apiCache = new Map();      // key -> { t:number, data:any }
const __apiInflight = new Map();   // key -> Promise

function __applyCtxToParams(action, params){
  const p = Object.assign({}, params || {});
  try{
    if (state && state.session && state.session.user_id && action !== "utenti" && action !== "ping"){
      if (p.user_id === undefined || p.user_id === null || String(p.user_id).trim() === "") {
        p.user_id = String(state.session.user_id);
      }
      if (p.anno === undefined || p.anno === null || String(p.anno).trim() === "") {
        p.anno = String(state.exerciseYear || "");
      }
    }
  }catch(_){ }
  return p;
}

function __cacheKey(action, params){
  try { return action + "|" + JSON.stringify(params || {}); }
  catch (_) { return action + "|{}"; }
}

function invalidateApiCache(prefix){
  try{
    for (const k of Array.from(__apiCache.keys())){
      if (!prefix || k.startsWith(prefix)) __apiCache.delete(k);
    }
  } catch (_) {}
  try{ __lsClearCtx(); }catch(_){ }
}

function __invalidateSyncCaches__(opts = {}){
  try{ invalidateApiCache(); }catch(_){}
  try{ __apiInflight.clear(); }catch(_){}
  try{ if (state && state.calendar) state.calendar.ready = false; }catch(_){}
  try{
    if (opts && opts.resetHomeRefresh){
      __homeRefreshInFlight = false;
      __homeRefreshLastAt = 0;
    }
  }catch(_){}
}

async function __refreshAfterSync__(restoreState){
  const targetPage = __sanitizePage(restoreState?.page) || __sanitizePage(state?.page) || "home";
  try{ __invalidateSyncCaches__({ resetHomeRefresh:true }); }catch(_){}
  try{ __writeRestoreState(Object.assign({}, restoreState || {}, { page: targetPage })); }catch(_){}

  try{ showPage(targetPage); }catch(_){}

  try{
    if (targetPage === "pulizie"){
      try{ if (typeof loadPulizieForDay === "function") await loadPulizieForDay({ clearFirst:false }); }catch(_){}
      try{ if (typeof loadOperatoriForDay === "function") await loadOperatoriForDay({ clearFirst:false }); }catch(_){}
      try{ if (typeof renderPuliziePage === "function") renderPuliziePage(); }catch(_){}
      return true;
    }

    if (targetPage === "home"){
      try{ refreshAllDataInBackground(); }catch(_){}
      try{ updateHomeReceiptsIndicator(); }catch(_){}
      return true;
    }

    if (targetPage === "orepulizia"){
      try{ await initOrePuliziaPage(); }catch(_){}
      return true;
    }

    if (targetPage === "calendario"){
      try{ if (state && state.calendar) state.calendar.ready = false; }catch(_){}
      try{ await ensureCalendarData({ force:true, showLoader:false }); }catch(_){}
      try{ renderCalendario(); }catch(_){}
      return true;
    }

    if (targetPage === "lavanderia"){
      try{ await loadLavanderia(); }catch(_){}
      return true;
    }

    return true;
  }catch(_){ }
  return true;
}


// ===== HOME: refresh totale dati in background (non blocca UI) =====
let __homeRefreshInFlight = false;
let __homeRefreshLastAt = 0;
function refreshAllDataInBackground(){
  try{
    if (!state || !state.session || !state.session.user_id) return;
    const now = Date.now();
    // evita loop/trigger ravvicinati
    if (__homeRefreshInFlight) return;
    if (now - __homeRefreshLastAt < 1500) return;
    __homeRefreshLastAt = now;
    __homeRefreshInFlight = true;

    // Avvio async non bloccante
    setTimeout(() => {
      (async () => {
        try{
          // Svuota cache dati (in-memory + localStorage cache)
          try{ invalidateApiCache(); }catch(_){}

          // Caricamenti principali (tutti senza loader) — ognuno protetto
          try{ await ensureSettingsLoaded({ force:true, showLoader:false }); }catch(_){}
          try{ await loadMotivazioni(); }catch(_){}
          try{ await load({ showLoader:false }); }catch(_){}

          try{ await ensurePeriodData({ showLoader:false, force:true }); }catch(_){}

          try{ await loadOspiti({ from:"", to:"", force:true }); }catch(_){}
          try{ await loadSpesaAll({ force:true, showLoader:false }); }catch(_){ }

          try{ if (typeof loadPulizieForDay === "function") await loadPulizieForDay({ clearFirst:false }); }catch(_){}
          try{ if (typeof loadOperatoriForDay === "function") await loadOperatoriForDay({ clearFirst:false }); }catch(_){}
          try{ await loadLavanderia(); }catch(_){}

          // Check ricevute (solo acconto+saldo)
          try{ checkReceiptsOnStartup(); }catch(_){}
        }catch(_){}
        finally{
          __homeRefreshInFlight = false;
          try{ __syncLedUpdate(); }catch(_){}
        }
      })();
    }, 0);
  }catch(_){ __homeRefreshInFlight = false; }
}

// ===== LocalStorage cache (perceived speed on iOS) =====
const __lsPrefixBase = "ddae_local_cache_v2:";

// Context (account + anno esercizio) — serve per isolare cache e DB per anno/account
function __ctxUid__(){
  try{
    const s = (state && state.session) ? state.session : loadSession();
    const uid = s && (s.user_id !== undefined ? s.user_id : s.id);
    if (uid !== undefined && uid !== null && String(uid).trim() !== "") return String(uid);
  }catch(_ ){}
  return "anon";
}

function __ctxYear__(){
  try{
    const y = String((state && state.exerciseYear) ? state.exerciseYear : loadExerciseYear()).trim();
    if (y) return y;
  }catch(_ ){}
  return String(new Date().getFullYear());
}

function __ctxSig__(){ return `${__ctxUid__()}|${__ctxYear__()}`; }



// ===== Year filtering (client-side) =====
// Some backend endpoints may ignore anno/from/to; enforce exercise year on the client.
function __yearFromAnyDate__(v){
  try{
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (!s) return null;
    // ISO: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const m1 = s.match(/^([0-9]{4})[-\/]/);
    if (m1) return m1[1];
    // IT: DD/MM/YYYY
    const m2 = s.match(/^[0-9]{1,2}[-\/]([0-9]{1,2})[-\/]([0-9]{4})$/);
    if (m2) return m2[2];
    // fallback: Date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) return String(d.getFullYear());
  }catch(_){ }
  return null;
}

function __filterByExerciseYear__(rows, year, candidateFields){
  try{
    const y = String(year||"").trim();
    if (!y) return Array.isArray(rows) ? rows : [];
    const list = Array.isArray(rows) ? rows : [];
    const fields = Array.isArray(candidateFields) && candidateFields.length ? candidateFields : [];
    if (!fields.length) return list;
    return list.filter(r => {
      if (!r || typeof r !== "object") return false;
      for (const f of fields){
        if (!f) continue;
        const val = r[f];
        const yr = __yearFromAnyDate__(val);
        if (yr === y) return true;
      }
      return false;
    });
  }catch(_){ }
  return Array.isArray(rows) ? rows : [];
}

function __lsPrefixNow__(){ return `${__lsPrefixBase}${__ctxUid__()}:${__ctxYear__()}:`; }

function __lsClearAll(){
  // cancella TUTTE le cache dell'app (tutti account/anni)
  try{
    const keys = [];
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(__lsPrefixBase)) keys.push(k);
    }
    keys.forEach(k => { try{ localStorage.removeItem(k); }catch(_ ){} });
  } catch(_ ){ }
}

function __lsClearCtx(){
  // cancella solo la cache del contesto corrente (account+anno)
  try{
    const p = __lsPrefixNow__();
    const keys = [];
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(p)) keys.push(k);
    }
    keys.forEach(k => { try{ localStorage.removeItem(k); }catch(_ ){} });
  } catch(_ ){ }
}

function __lsGet(key){
  try{
    const raw = localStorage.getItem(__lsPrefixNow__() + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(_ ){ return null; }
}

function __lsSet(key, data){
  try{
    localStorage.setItem(__lsPrefixNow__() + key, JSON.stringify({ t: Date.now(), data }));
  } catch(_ ){}
}



// GET con cache in-memory (non tocca SW): evita chiamate duplicate e loader continui
async function cachedGet(action, params = {}, { ttlMs = 30000, swrMs = null, showLoader = true, force = false } = {}){
  const ctxParams = __applyCtxToParams(action, params);
  const key = __cacheKey(action, ctxParams);
  const now = Date.now();
  const swrWindow = (swrMs === null || swrMs === undefined) ? ttlMs : swrMs;

  if (!force) {
    const hit = __apiCache.get(key);
    if (hit) {
      const age = now - hit.t;
      if (age < ttlMs) return hit.data;

      // Stale-while-revalidate: torna subito il dato “stale” e aggiorna in background
      if (age < swrWindow) {
        if (!__apiInflight.has(key)) {
          const bg = (async () => {
            const data = await api(action, { params: ctxParams, showLoader:false });
            __apiCache.set(key, { t: Date.now(), data });
            return data;
          })();
          __apiInflight.set(key, bg);
          bg.finally(() => { try{ __apiInflight.delete(key); }catch(_){ } });
        }
        return hit.data;
      }
    }
  }

  if (__apiInflight.has(key)) return __apiInflight.get(key);

  const p = (async () => {
    const data = await api(action, { params: ctxParams, showLoader });
    __apiCache.set(key, { t: Date.now(), data });
    return data;
  })();

  __apiInflight.set(key, p);

  try {
    return await p;
  } finally {
    __apiInflight.delete(key);
  }
}

/* Launcher modal (popup) */



// iOS/PWA: elimina i “tap” persi (click non sempre affidabile su Safari PWA)
function bindFastTap(el, fn){
  if (!el) return;
  let last = 0;
  const handler = (e)=>{
    const now = Date.now();
    if (now - last < 450) return;
    last = now;
    try{ e.preventDefault(); }catch(_){ }
    try{ e.stopPropagation(); }catch(_){ }
    try{ __sfxTap(); }catch(_){ }
    fn();
  };

  // In PWA iOS/Safari: evita doppi trigger (touch/pointer/click)
  const usePointer = (typeof window !== "undefined") && ("PointerEvent" in window);
  const events = usePointer ? ["pointerup", "click"] : ["touchend", "click"];

  for (const evt of events){
    try{ el.addEventListener(evt, handler, { passive:false }); }
    catch(_){ el.addEventListener(evt, handler); }
  }
}


/* dDAE_1.020 — iOS hardening: Home icons always tappable (fallback binding) */
function bindHomeStrongTap(){
  // evita doppio binding
  try{
    if (bindHomeStrongTap.__bound) return;
    bindHomeStrongTap.__bound = true;
  }catch(_){ }

  const go = (id, page, { before } = {}) => {
    const el = document.getElementById(id);
    if (!el) return;

    const handler = (e) => {
      try{ e && e.preventDefault && e.preventDefault(); }catch(_){}
      try{ e && e.stopPropagation && e.stopPropagation(); }catch(_){}
      try{ hideLauncher(); }catch(_){}

      try{ if (typeof before === "function") before(); }catch(_){}
      try{ showPage(page); }catch(_){}
    };

    // per evitare che un overlay "invisibile" o una mancata emissione di click blocchi il tap,
    // ascolta anche gli eventi touch/pointer in anticipo.
    const opts = { passive:false };
    try{ el.addEventListener("pointerdown", handler, opts); }catch(_){ try{ el.addEventListener("pointerdown", handler); }catch(__){} }
    try{ el.addEventListener("touchstart", handler, opts); }catch(_){ try{ el.addEventListener("touchstart", handler); }catch(__){} }
    try{ el.addEventListener("click", handler, opts); }catch(_){ try{ el.addEventListener("click", handler); }catch(__){} }
  };

  go("goOspite", "ospiti");
  go("goOspiti", "ospiti");
  go("goCalendario", "calendario");
  go("goTassaSoggiorno", "tassa");
  go("goPulizie", "pulizie");
  go("goLavanderia", "lavanderia");
  go("goStatistiche", "statistiche");
  go("openLauncher", "spese", { before: ()=>{ try{ setSpeseView("list"); }catch(_){} } });
}


/* dDAE_1.020 — Tap counters: Adulti / Bambini <10 (tap increment, long press 0.5s = reset) */
function bindGuestTapCounters(){
  const ids = ["guestAdults","guestKidsU10"];
  const fireRecalc = ()=>{ try{ updateGuestRemaining(); }catch(_){ } try{ updateGuestTaxTotalPill(); }catch(_){ } };
  const setVal = (el, v)=>{
    try{
      const vv = Math.max(0, parseInt(String(v||"0"),10)||0);
      el.value = String(vv);
      try{ el.dispatchEvent(new Event("input", { bubbles:true })); }catch(_){
        try{ const ev=document.createEvent("Event"); ev.initEvent("input", true, true); el.dispatchEvent(ev); }catch(_){}
      }
      try{ el.dispatchEvent(new Event("change", { bubbles:true })); }catch(_){
        try{ const ev2=document.createEvent("Event"); ev2.initEvent("change", true, true); el.dispatchEvent(ev2); }catch(_){}
      }
      fireRecalc();
    }catch(_){}
  };

  ids.forEach((id)=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (el.__tapCounterBound) return;
    el.__tapCounterBound = true;

    try{ el.setAttribute("readonly","readonly"); }catch(_){}
    try{ el.setAttribute("inputmode","none"); }catch(_){}
    try{ el.classList.add("tap-counter"); }catch(_){}

    let t = null;
    let longFired = false;
    const clearT = ()=>{ if (t){ clearTimeout(t); t=null; } };

    const onDown = (e)=>{
      longFired = false;
      clearT();
      try{ e.preventDefault(); }catch(_){}
      try{ e.stopPropagation(); }catch(_){}
      t = setTimeout(()=>{
        longFired = true;
        try{ __sfxGlass(); }catch(_){ }
        setVal(el, 0);
      }, 500);
    };
    const onUp = (e)=>{
      clearT();
      try{ e.preventDefault(); }catch(_){}
      try{ e.stopPropagation(); }catch(_){}
      if (longFired){ longFired=false; return; }
      const cur = parseInt(el.value || "0", 10) || 0;
      setVal(el, cur + 1);
    };
    const onCancel = ()=>{ clearT(); };

    const usePointer = (typeof window !== "undefined") && ("PointerEvent" in window);
    if (usePointer){
      try{ el.addEventListener("pointerdown", onDown, { passive:false }); }catch(_){ el.addEventListener("pointerdown", onDown); }
      try{ el.addEventListener("pointerup", onUp, { passive:false }); }catch(_){ el.addEventListener("pointerup", onUp); }
      try{ el.addEventListener("pointercancel", onCancel, { passive:true }); }catch(_){ el.addEventListener("pointercancel", onCancel); }
    } else {
      try{ el.addEventListener("touchstart", onDown, { passive:false }); }catch(_){ el.addEventListener("touchstart", onDown); }
      try{ el.addEventListener("touchend", onUp, { passive:false }); }catch(_){ el.addEventListener("touchend", onUp); }
      try{ el.addEventListener("touchcancel", onCancel, { passive:true }); }catch(_){ el.addEventListener("touchcancel", onCancel); }
      try{ el.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); onUp(e); }, { passive:false }); }catch(_){ el.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); onUp(e); }); }
    }

    // Evita doppio incremento (click dopo pointerup)
    try{ el.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); }, { passive:false }); }catch(_){ el.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); }); }
    try{ el.addEventListener("contextmenu", (e)=>{ e.preventDefault(); }); }catch(_){}
    try{ el.addEventListener("focus", ()=>{ try{ el.blur(); }catch(_){ } }); }catch(_){}
  });
}


let launcherDelegationBound = false;
let homeDelegationBound = false;
function bindHomeDelegation(){
  if (homeDelegationBound) return;
  homeDelegationBound = true;
  document.addEventListener("click", (e)=>{
    const o = e.target.closest && e.target.closest("#goOspite");
    if (o){ hideLauncher(); showPage("ospiti"); return; }
    const cal = e.target.closest && e.target.closest("#goCalendario");
    if (cal){ hideLauncher(); showPage("calendario"); return; }
    const tassa = e.target.closest && e.target.closest("#goTassaSoggiorno");
    if (tassa){
      hideLauncher();
      (async ()=>{ try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){} showPage("tassa"); try{ initTassaPage(); }catch(_){} })();
      return;
    }
    const pul = e.target.closest && e.target.closest("#goPulizie");
    if (pul){ hideLauncher(); showPage("pulizie"); return; }
        const opcal = e.target.closest && e.target.closest("#goOrePulizia") || e.target.closest("#goOrePuliziaTop");
    if (opcal){ hideLauncher(); showPage("orepulizia"); return; }

const lav = e.target.closest && e.target.closest("#goLavanderia") || e.target.closest("#goLavanderiaTop");
    if (lav){ hideLauncher(); showPage("lavanderia"); return; }

    const imp = e.target.closest && e.target.closest("#goImpostazioni");
    if (imp){ hideLauncher(); showPage("impostazioni"); return; }

    const g = e.target.closest && e.target.closest("#goStatistiche");
    if (g){ hideLauncher(); showPage("statistiche"); return; }

    // STATISTICHE (icone)
    const s1 = e.target.closest && e.target.closest("#goStatGen");
    if (s1){ hideLauncher(); showPage("statgen"); return; }
    const s2 = e.target.closest && e.target.closest("#goStatMensili");
    if (s2){ hideLauncher(); showPage("statmensili"); return; }
    const s3 = e.target.closest && e.target.closest("#goStatSpese");
    if (s3){ hideLauncher(); showPage("statspese"); return; }
    const s4 = e.target.closest && e.target.closest("#goStatPrenotazioni");
    if (s4){ hideLauncher(); showPage("statprenotazioni"); return; }

  
    const s5 = e.target.closest && e.target.closest("#goStatAzienda");
    if (s5){ hideLauncher(); showPage("statazienda"); return; }
    const s6 = e.target.closest && e.target.closest("#goStatAmministratore");
    if (s6){ hideLauncher(); showPage("statamministratore"); return; }
    const s7 = e.target.closest && e.target.closest("#goStatPiscina");
    if (s7){ hideLauncher(); showPage("statpiscina"); return; }
    const s8 = e.target.closest && e.target.closest("#goStatCancellazioni");
    if (s8){ hideLauncher(); showPage("statcancellazioni"); return; }
});
}

function bindLauncherDelegation(){
  if (launcherDelegationBound) return;
  launcherDelegationBound = true;

  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest && e.target.closest("#launcherModal [data-go]");
    if (goBtn){
      const page = goBtn.getAttribute("data-go");
      hideLauncher();
      showPage(page);
      return;
    }
    const close = e.target.closest && e.target.closest("#launcherModal [data-close], #closeLauncher");
    if (close){
      hideLauncher();
    }
  });
}

function showLauncher(){
  const m = document.getElementById("launcherModal");
  if (!m) return;
  m.hidden = false;
  m.setAttribute("aria-hidden", "false");
}
function hideLauncher(){
  const m = document.getElementById("launcherModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden", "true");
}


function setSpeseView(view, { render=false } = {}){
  state.speseView = "list";
  const list = document.getElementById("speseViewList");
  const ins = document.getElementById("speseViewInsights");
  if (list) list.hidden = false;
  if (ins) ins.hidden = true;

  const btn = document.getElementById("btnSpeseInsights");
  if (btn){
    btn.setAttribute("aria-pressed", "false");
    btn.classList.remove("is-active");
    btn.hidden = true;
  }

  if (render){
    try{ renderSpese(); }catch(_){}
  }
}

/* NAV pages (5 pagine interne: home + 4 funzioni) */


// dDAE_1.020 — Fix contrast icone topbar: se un tasto appare bianco su iOS, l'icona bianca diventa invisibile.
// Applichiamo una classe .is-light ai pulsanti con background chiaro, così CSS forza icone scure.
function __parseRGBA__(s){
  try{
    const m = String(s||"").match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const parts = m[1].split(",").map(x=>x.trim());
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    let a = null;
    if (parts.length > 3) a = parseFloat(parts[3]);
    return {
      r: (isFinite(r) ? r : 0),
      g: (isFinite(g) ? g : 0),
      b: (isFinite(b) ? b : 0),
      a: (a != null && isFinite(a) ? a : null),
    };
  }catch(_){ return null; }
}

function ensureTopbarIconContrast(){
  try{
    const btns = document.querySelectorAll('.topbar .icon-btn');
    btns.forEach((btn)=>{
      if (!btn || btn.hidden) return;
      const cs = getComputedStyle(btn);
      const bg = cs.backgroundColor || '';
      const rgba = __parseRGBA__(bg);
      let isLight = false;
      if (!rgba){
        // con backdrop/trasparenza Safari può dare valori inattesi: trattiamo come "chiaro" (glass)
        isLight = true;
      } else {
        const r = rgba.r, g = rgba.g, b = rgba.b;
        const a = (rgba.a == null ? 1 : rgba.a);
        const lum = 0.2126*r + 0.7152*g + 0.0722*b;
        isLight = (lum >= 210) || (a <= 0.25);
      }
      btn.classList.toggle('is-light', !!isLight);
    });
  }catch(_){ }
}
function showPage(page){
  // Back-compat: vecchia pagina "colazione" ora è "prodotti"
  if (page === "colazione") page = "prodotti";

  // Redirect: grafico/riepilogo ora sono dentro "Spese" (videata unica)
  if (page === "riepilogo" || page === "grafico"){
    page = "spese";
    state.speseView = "list";
  }
  if (page === "spese" && !state.speseView) state.speseView = "list";

  // Gate: senza sessione si rimane in AUTH
  try{
    if (page !== "auth" && (!state.session || !state.session.user_id)) {
      page = "auth";
    }
  }catch(_){ page = "auth"; }

  // Gate ruolo: operatore vede solo Pulizie / Lavanderia / Calendario
  try{
    if (state.session && isOperatoreSession(state.session)){
      const allowed = new Set(["home","pulizie","lavanderia","calendario","auth","prodotti","colazione","statistiche","statpiscina","laundrycatalog"]);
      if (!allowed.has(page)) page = "pulizie";
    }
  }catch(_){ }


  // Token navigazione: impedisce render/loader fuori contesto quando cambi pagina durante fetch
  const navId = ++state.navId;

  const prevPage = state.page;
  if (page === "calendario" && prevPage && prevPage !== "calendario") {
    state._calendarPrev = prevPage;
  }

  try{ closeIrapModal(); }catch(_){ }

state.page = page;
  document.body.dataset.page = page;

  // Sync footer: nascosto SOLO in Calendario (admin + operatore)
  try{
    const sb = document.getElementById("homeSyncBar");
    const hideSync = (page === "calendario") || (page === "impostazioni") || (page === "operatori") || (page === "channel") || (page === "laundrycatalog") || String(page || "").startsWith("stat");
    if (sb) sb.hidden = !!hideSync;
  }catch(_){ }


  try{ __setTopbarCenterLabel__(); }catch(_){}

  try { __rememberPage(page); } catch (_) {}
  document.querySelectorAll(".page").forEach(s => s.hidden = true);
  const el = $(`#page-${page}`);
  if (el) el.hidden = false;
  if (page === "home"){
    // HOME: ricalcola sempre la visibilità del SYNC dopo operazioni in Impostazioni (es. generazione codice Roster)
    try{ __fbLoadLink__(); }catch(_){ }
    try{ applyRoleMode(); }catch(_){ }
    try{ setTimeout(()=>{ try{ __fitHomeSyncBtn__(); }catch(_){ } }, 0); }catch(_){ }
  }

  // Init pagine dinamiche (listener)
  if (page === "tassa"){
    try{ setTimeout(() => { try{ initTassaPage(); }catch(_){} }, 0); }catch(_){ }
  }

  // Impostazioni: aggiorna tabs (account + anno)
  if (page === "impostazioni"){
    try{ updateSettingsTabs(); }catch(_){ }
    try{ loadImpostazioniPage({ force:true }); }catch(_){ }
  }
  if (page === "operatori"){
    try{ loadOperatoriPage(); }catch(_){ }
  }
  if (page === "channel"){
    try{ loadChannelPage(); }catch(_){ }
  }
  if (page === "laundrycatalog"){
    try{ loadLaundryCatalogPage(); }catch(_){ }
  }

  // Sotto-viste della pagina Spese (lista ↔ grafico+riepilogo)
  if (page === "spese") {
    try { setSpeseView(state.speseView || "list"); } catch (_) {}
  }

  // Period chip: nascosto in HOME (per rispettare "nessun altro testo" sulla home)
  const chip = $("#periodChip");
  if (chip){
    if (page === "home" || page === "ospite" || page === "ospiti") {
      chip.hidden = true;
    } else {
      chip.hidden = false;
      chip.textContent = `${state.period.from} → ${state.period.to}`;
    }
  }

  try{ setTimeout(() => { try{ __applyAppLanguageToDom__(); }catch(_){ } }, 0); }catch(_){ }

  // Topbar: in HOME il tasto "Home" non serve → mostra Impostazioni
  try{
    const hb2 = document.getElementById("hamburgerBtn");
    const hs2 = document.getElementById("homeSettingsTop");
    const leds2 = document.getElementById("prodTopLeds");
    const authImportTop = document.getElementById("authImportBackupTop");
    const isHome = (page === "home");
    const isAuth = (page === "auth");
    const isOp = !!(state.session && isOperatoreSession(state.session));
    if (hb2) hb2.hidden = isHome || isAuth;
    if (hs2) hs2.hidden = (!isHome) || isOp;
    if (authImportTop) authImportTop.hidden = !isAuth;
    if (leds2) leds2.hidden = (page !== "home") || isOp;

    // HOME: refresh totale dati in background (non blocca UI)
    try{ if (isHome){ try{ updateProdottiHomeBlink(); }catch(_){ } refreshAllDataInBackground(); } }catch(_){}

    const ir = document.getElementById("btnIrapTop");
    if (ir) ir.hidden = (page !== "statazienda");

  }catch(_){ }

  // HOME: ricevute indicator
  try{ updateHomeReceiptsIndicator(); }catch(_){ }

  // Top back button (Ore pulizia + Calendario)
  const backBtnTop = $("#backBtnTop");
  if (backBtnTop){
    backBtnTop.hidden = !(page === "orepulizia" || page === "calendario" || page === "operatori" || page === "channel" || page === "laundrycatalog");
    backBtnTop.classList.toggle("icon-btn-whiteblue", page === "operatori" || page === "channel" || page === "laundrycatalog");
    backBtnTop.classList.toggle("icon-btn-whiteorange", page !== "operatori" && page !== "channel" && page !== "laundrycatalog");
    try{ backBtnTop.setAttribute("aria-label", (page === "operatori" || page === "channel" || page === "laundrycatalog") ? "Torna a Impostazioni" : "Indietro"); }catch(_){ }
  }

  // Top guest list button (solo scheda Ospite) — torna alla lista ospiti accanto al tasto Home
  const guestBackTop = $("#guestBackTop");
  if (guestBackTop){
    guestBackTop.hidden = (page !== "ospite");
  }

  // Logout top (solo HOME operatore)
  try{
    const opLogout = document.getElementById("opLogoutTop");
    if (opLogout){
      const isOp = !!(state.session && isOperatoreSession(state.session));
      opLogout.hidden = !(isOp && page === "home");
    }
  }catch(_){ }


// Import Roster Operatori top (solo HOME operatore)
  try{
    const opImp = document.getElementById("opImportRosterTop");
    if (opImp){
      const isOp = !!(state.session && isOperatoreSession(state.session));
      opImp.hidden = !(isOp && page === "home");
    }
  }catch(_){ }

  // Top tools (solo Pulizie) — lavanderia + ore lavoro accanto al tasto Home
  const pulizieTopTools = $("#pulizieTopTools");
  if (pulizieTopTools){
    pulizieTopTools.hidden = true;
  }
  const goOrePulizia = $("#goOrePulizia");
  if (goOrePulizia){
    goOrePulizia.hidden = (page !== "pulizie" || (state && state.session && isOperatoreSession(state.session)));
  }

  // Top tools (Lavanderia) — genera report accanto al tasto Home
  const lavanderiaTopTools = $("#lavanderiaTopTools");
  if (lavanderiaTopTools){
    lavanderiaTopTools.hidden = (page !== "lavanderia");
  }


  // Top tools (Ospiti) — nuovo ospite + calendario accanto al tasto Home
  const ospitiTopTools = $("#ospitiTopTools");
  if (ospitiTopTools){
    ospitiTopTools.hidden = (page !== "ospiti");
  }

  
  // Top tools (Spese) — + e grafico accanto al tasto Home
  const speseTopTools = $("#speseTopTools");
  if (speseTopTools){
    speseTopTools.hidden = (page !== "spese");
  }

  

  // Top tools (Prodotti) — inserisci/azzera/salva accanto al tasto Home
  const prodottiTopTools = $("#prodottiTopTools");
  if (prodottiTopTools){
    prodottiTopTools.hidden = (page !== "prodotti");
  }

// Top tools (Statistiche → Conteggio generale)
  const statGenTopTools = $("#statGenTopTools");
  if (statGenTopTools){
    statGenTopTools.hidden = (page !== "statgen");
  }

  // Top tools (Statistiche → Fatturati mensili)
  const statMensiliTopTools = $("#statMensiliTopTools");
  if (statMensiliTopTools){
    statMensiliTopTools.hidden = (page !== "statmensili");
  }

  // Top tools (Statistiche → Spese generali)
  const statSpeseTopTools = $("#statSpeseTopTools");
  if (statSpeseTopTools){
    statSpeseTopTools.hidden = (page !== "statspese");
  }

  const statPrenTopTools = $("#statPrenTopTools");
  if (statPrenTopTools){
    statPrenTopTools.hidden = (page !== "statprenotazioni");
  }



  const statCancTopTools = $("#statCancTopTools");
  if (statCancTopTools){
    statCancTopTools.hidden = (page !== "statcancellazioni");
  }


  const statAziendaTopTools = $("#statAziendaTopTools");
  if (statAziendaTopTools){
    statAziendaTopTools.hidden = (page !== "statazienda");
  }

  const statAmmTopTools = $("#statAmmTopTools");
  if (statAmmTopTools){
    statAmmTopTools.hidden = (page !== "statamministratore");
  }

  const statPiscinaTopTools = $("#statPiscinaTopTools");
  if (statPiscinaTopTools){
    statPiscinaTopTools.hidden = (page !== "statpiscina");
  }

  try{ ensureTopbarIconContrast(); }catch(_){ }

// render on demand
  if (page === "prodotti") {
    const _nav = navId;
    loadProdotti({ force:false, showLoader:true })
      .then(()=>{ if (state.navId !== _nav || state.page !== "prodotti") return; renderProdotti(); })
      .catch(e=>toast(e.message));
  }

  if (page === "spese") {
    const _nav = navId;
    ensurePeriodData({ showLoader:true })
      .then(()=>{ if (state.navId !== _nav || state.page !== "spese") return; renderSpese(); })
      .catch(e=>toast(e.message));
  }
  if (page === "riepilogo") {
    const _nav = navId;
    ensurePeriodData({ showLoader:true })
      .then(()=>{ if (state.navId !== _nav || state.page !== "riepilogo") return; renderRiepilogo(); })
      .catch(e=>toast(e.message));
  }
  if (page === "grafico") {
    const _nav = navId;
    ensurePeriodData({ showLoader:true })
      .then(()=>{ if (state.navId !== _nav || state.page !== "grafico") return; renderGrafico(); })
      .catch(e=>toast(e.message));
  }
  if (page === "calendario") {
    const _nav = navId;
    // Entrando in Calendario vogliamo SEMPRE dati freschi.
    // 1) invalida lo stato "ready" e bypassa la cache in-memory (ttl) con force:true.
    try{ if (state.calendar) state.calendar.ready = false; }catch(_){ }
    ensureCalendarData({ force:true, showLoader:false })
      .then(()=>{ if (state.navId !== _nav || state.page !== "calendario") return; renderCalendario(); })
      .catch(e=>toast(e.message));
  }
  if (page === "ospiti") {
    // Difesa anti-stato sporco: quando torno alla lista, la scheda ospite NON deve restare in "view"
    // (layout diverso) o con valori vecchi.
    try { enterGuestCreateMode(); } catch (_) {}
    loadOspiti(state.period || {}).catch(e => toast(e.message));
  }
  if (page === "lavanderia") loadLavanderia().catch(e => toast(e.message));

  if (page === "statistiche") {
    try{ closeStatPieModal(); }catch(_){ }
    try{ closeStatSpesePieModal(); }catch(_){ }
    try{ closeStatMensiliPieModal(); }catch(_){ }
  }

  if (page === "statgen") {
    const _nav = navId;
    Promise.all([
      ensureStatsAllData({ showLoader:true }),
      loadOspiti({ ...(state.period || {}), force:false }),
      cachedGet("servizi", {}, { showLoader:false, ttlMs: 2*60*1000, swrMs: 10*60*1000, force:false }),
    ])
      .then(([, , servizi])=>{ if (state.navId !== _nav || state.page !== "statgen") return; try{ state.servizi = normalizeServiziResponse(servizi); }catch(_){ state.servizi = []; } renderStatGen(); })
      .catch(e=>toast(e.message));
  }

  if (page === "statmensili") {
    const _nav = navId;
    Promise.all([
      ensureStatsAllData({ showLoader:true }),
      loadOspiti({ ...(state.period || {}), force:false }),
      cachedGet("servizi", {}, { showLoader:false, ttlMs: 2*60*1000, swrMs: 10*60*1000, force:false }),
    ])
      .then(([, , servizi])=>{ if (state.navId !== _nav || state.page !== "statmensili") return; try{ state.servizi = normalizeServiziResponse(servizi); }catch(_){ state.servizi = []; } renderStatMensili(); })
      .catch(e=>toast(e.message));
  }


  if (page === "statspese") {
    const _nav = navId;
    ensureStatsAllData({ showLoader:true })
      .then(()=>{ if (state.navId !== _nav || state.page !== "statspese") return; renderStatSpese(); })
      .catch(e=>toast(e.message));
  }

  if (page === "statprenotazioni") {
    const _nav = navId;
    Promise.all([
      ensureStatsAllData({ showLoader:true }),
      loadOspiti({ ...(state.period || {}), force:false }),
      loadOspitiEliminati({ from: `${state.exerciseYear||new Date().getFullYear()}-01-01`, to: `${state.exerciseYear||new Date().getFullYear()}-12-31`, force:true }),
      __loadOperatoriRows_().catch(()=>[])
    ])
      .then((res)=>{ if (state.navId !== _nav || state.page !== "statprenotazioni") return; renderStatGrafici(Array.isArray(res && res[3]) ? res[3] : []); })
      .catch(e=>toast(e.message));
  }

  if (page === "statcancellazioni") {
    const _nav = navId;
    Promise.all([
      ensureStatsAllData({ showLoader:true }),
      loadOspiti({ ...(state.period || {}), force:false }),
      loadOspitiEliminati({ ...(state.period || {}), force:false }),
    ])
      .then(()=>{ if (state.navId !== _nav || state.page !== "statcancellazioni") return; renderStatCancellazioni(); })
      .catch(e=>toast(e.message));
  }

  if (page === "statazienda") {
    const _nav = navId;
    Promise.all([
      ensureStatsAllData({ showLoader:true }),
      loadOspiti({ ...(state.period || {}), force:false }),
      loadOspitiEliminati({ ...(state.period || {}), force:false }),
    ])
      .then(()=>{ if (state.navId !== _nav || state.page !== "statazienda") return; renderStatAzienda(); })
      .catch(e=>toast(e.message));
  }

  if (page === "statamministratore") {
    const _nav = navId;
    Promise.resolve()
      .then(()=>{ if (state.navId !== _nav || state.page !== "statamministratore") return; renderStatAmministratore(); })
      .catch(e=>toast(e.message));
  }

  if (page === "statpiscina") {
    const _nav = navId;
    // Render immediato (anche se il fetch fallisce, la pagina deve aprirsi)
    try { renderPiscinaCalendar(); } catch (_) {}
    Promise.resolve(loadPiscinaAll({ force:false, showLoader:true }))
      .then(()=>{ if (state.navId !== _nav || state.page !== "statpiscina") return; renderPiscinaCalendar(); })
      .catch(e=>toast(e.message));
  }


if (page === "orepulizia") { initOrePuliziaPage().catch(e=>toast(e.message)); }


  // dDAE_1.020: fallback visualizzazione Pulizie
  try{
    if (page === "pulizie"){
      const el = document.getElementById("page-pulizie");
      if (el) el.style.display = "block";
      try{ if (window.__syncCleanOperators__) window.__syncCleanOperators__(); }catch(_){ }
    }
  }catch(_){}

  // Palette icone (launcher)
  applyIconPalette();


}

function setupHeader(){
  const hb = $("#hamburgerBtn");
  if (hb) hb.addEventListener("click", () => { hideLauncher(); showPage("home"); });

  const authImportTop = document.getElementById("authImportBackupTop");
  if (authImportTop) bindFastTap(authImportTop, async () => {
    try{ await __dbImport__("admin"); }catch(e){ try{ toast("Errore import", "orange"); }catch(_){ } }
  });

  const opImpRoster = document.getElementById("opImportRosterTop");
  if (opImpRoster) bindFastTap(opImpRoster, async () => { try{ await __qrScanAndLink__(); }catch(e){ try{ toast("Codice non disponibile", "orange"); }catch(_){ } } });

// HOME: ricevute mancanti (solo in HOME)
  const btnRec = document.getElementById("homeReceiptsTop");
  if (btnRec) bindFastTap(btnRec, () => { openReceiptDueModal(); });

  const recClose = document.getElementById("receiptDueClose");
  if (recClose) bindFastTap(recClose, () => closeReceiptDueModal());
  const recModal = document.getElementById("receiptDueModal");
  if (recModal) recModal.addEventListener("click", (e)=>{ if (e.target === recModal) closeReceiptDueModal(); });

  // AMMINISTRATORE: popup dati + grafico
  const btnAdminInputsTop = document.getElementById("btnAdminInputsTop");
  if (btnAdminInputsTop) bindFastTap(btnAdminInputsTop, () => { openAdminInputsModal(); });
  const btnAdminChartTop = document.getElementById("btnAdminChartTop");
  if (btnAdminChartTop) bindFastTap(btnAdminChartTop, () => { openAdminChartModal(); });
  const adminInputsClose = document.getElementById("adminInputsClose");
  if (adminInputsClose) bindFastTap(adminInputsClose, () => closeAdminInputsModal());
  const adminChartClose = document.getElementById("adminChartClose");
  if (adminChartClose) bindFastTap(adminChartClose, () => closeAdminChartModal());
  const adminInputsModal = document.getElementById("adminInputsModal");
  if (adminInputsModal) adminInputsModal.addEventListener("click", (e)=>{ if (e.target === adminInputsModal) closeAdminInputsModal(); });
  const adminChartModal = document.getElementById("adminChartModal");
  if (adminChartModal) adminChartModal.addEventListener("click", (e)=>{ if (e.target === adminChartModal) closeAdminChartModal(); });

  const btnIrapTop = document.getElementById("btnIrapTop");
  if (btnIrapTop) bindFastTap(btnIrapTop, () => { openIrapModal(); });



  const opLogout = document.getElementById("opLogoutTop");
  if (opLogout) bindFastTap(opLogout, async () => {
    let ok = false;
    try{ ok = await confirmYesNo("Vuoi uscire?"); }catch(_){ ok = false; }
    if (!ok) return;
    try{ clearSession(); }catch(_){ }
    try{ state.session = null; }catch(_){ }
    try{ applyRoleMode(); }catch(_){ }
    try{ __resetInMemoryData__(); }catch(_){ }
    try{ invalidateApiCache(); }catch(_){ }
    try{ showPage("auth"); }catch(_){ }
  });

  // Back (ore pulizia + calendario + operatori)
  const bb = $("#backBtnTop");
  if (bb) bb.addEventListener("click", () => {
    if (state.page === "orepulizia") { showPage("pulizie"); return; }
    if (state.page === "operatori" || state.page === "channel" || state.page === "laundrycatalog") { showPage("impostazioni"); return; }
    if (state.page === "calendario") {
      if (state.session && isOperatoreSession(state.session)) { showPage("pulizie"); return; }
      showPage("ospiti");
      return;
    }
    showPage("home");
  });
}
function setupHome(){
  bindLauncherDelegation();
  bindHomeDelegation();
  // iOS hardening: fallback binding for Home icons
  try{ bindHomeStrongTap(); }catch(_){ }
  // stampa build
  const build = $("#buildText");
  if (build) build.textContent = `dDAE_${BUILD_VERSION}`;

  
  // Home: Import/Export SYNC (Firebase) — silente (no file)
  try{
    const imp = document.getElementById("goDbImport");
    if (imp && !imp.__syncBound){ imp.__syncBound = true; bindFastTap(imp, async ()=>{ try{ await __handleSyncImport__(); }catch(e){ try{ toast("Sync non disponibile", "orange"); }catch(_){ } } }); }
    const exp = document.getElementById("goDbExport");
    if (exp && !exp.__syncBound){ exp.__syncBound = true; bindFastTap(exp, async ()=>{ try{ await __handleSyncExport__(); }catch(e){ try{ toast("Sync non disponibile", "orange"); }catch(_){ } } }); }
  }catch(_){ }
// SPESE: pulsante + (nuova spesa) e pulsante grafico+riepilogo e pulsante grafico+riepilogo
  const btnAdd = $("#btnAddSpesa");
  if (btnAdd){
    bindFastTap(btnAdd, () => { hideLauncher(); showPage("inserisci"); });
  }
  const btnInsights = $("#btnSpeseInsights");
  if (btnInsights){
    btnInsights.hidden = true;
  }

  // HOME: tasto Spese apre direttamente la pagina "spese" (senza launcher)
  const openBtn = $("#openLauncher");
  if (openBtn){
    bindFastTap(openBtn, () => { try{ setSpeseView("list"); }catch(_){} hideLauncher(); showPage("spese"); });
  }

  // HOME: icona Ospite va alla pagina ospite
  const goO = $("#goOspite");
  if (goO){
    bindFastTap(goO, () => { hideLauncher(); showPage("ospiti"); });
  }
  // HOME: icona Ospiti va alla pagina elenco ospiti
  const goOs = $("#goOspiti");
  if (goOs){
    bindFastTap(goOs, () => { hideLauncher(); showPage("ospiti"); });
  }


// OSPITI: pulsante + (nuovo ospite)
const btnNewGuestOspiti = $("#btnNewGuestOspiti");
if (btnNewGuestOspiti){
  btnNewGuestOspiti.addEventListener("click", () => { enterGuestCreateMode(); showPage("ospite"); });
}


// OSPITI: topbar — nuovo ospite + calendario
const btnNewGuestTop = $("#btnNewGuestTop");
if (btnNewGuestTop){
  btnNewGuestTop.addEventListener("click", () => { enterGuestCreateMode(); showPage("ospite"); });
}
const goCalendarioTopOspiti = $("#goCalendarioTopOspiti");
if (goCalendarioTopOspiti){
  bindFastTap(goCalendarioTopOspiti, () => showPage("calendario"));
}



  

  // OSPITE: topbar — torna alla lista ospiti (guest list)
  const guestBackTop = $("#guestBackTop");
  if (guestBackTop){
    const goGuestBack = () => {
      // Se stai modificando un ospite: torna alla scheda in sola lettura dello stesso record
      try{
        if (state.page === "ospite" && String(state.guestMode || "") === "edit"){
          const src = state.guestEditSourceItem || null;
          if (src){
            try{ enterGuestViewMode(src); }catch(_){ }
            try{ showPage("ospite"); }catch(_){ }
            return;
          }

          // fallback: prova a recuperare il record da multi-booking o lista ospiti
          const id = String(state.guestEditId || "").trim();
          let found = null;
          if (id){
            try{
              const arr = Array.isArray(state.guestGroupBookings) ? state.guestGroupBookings : [];
              found = arr.find(x => String(guestIdOf(x) || x?.id || "") === id) || null;
            }catch(_){ }
            if (!found){
              try{
                const arr2 = Array.isArray(state.ospiti) ? state.ospiti : [];
                found = arr2.find(x => String(x?.id || "") === id) || null;
              }catch(_){ }
            }
          }
          if (found){
            try{ enterGuestViewMode(found); }catch(_){ }
            try{ showPage("ospite"); }catch(_){ }
            return;
          }
        }
      }catch(_){ }

      // Default: torna alla lista ospiti
      try{ state.guestGroupBookings = null; state.guestGroupActiveId = null; state.guestGroupKey = null; clearGuestMulti(); }catch(_){ }
      showPage("ospiti");
    };
    bindFastTap(guestBackTop, goGuestBack);
    guestBackTop.addEventListener("click", (e) => { try{ e.preventDefault(); }catch(_){ } });
  }
// HOME: icona Colazione
  const goCol = $("#goProdotti");
  if (goCol){
    bindFastTap(goCol, () => { hideLauncher(); showPage("prodotti"); });
  }


  // HOME: Impostazioni (top)
  const hsTop = document.getElementById("homeSettingsTop");
  if (hsTop){
    bindFastTap(hsTop, () => { hideLauncher(); showPage("impostazioni"); });
  }

  // HOME: icona Calendario (tap-safe su iOS PWA)
  const goCal = $("#goCalendario");
  if (goCal){
    goCal.disabled = false;
    goCal.removeAttribute("aria-disabled");
    bindFastTap(goCal, () => { hideLauncher(); showPage("calendario"); });
  }

  // HOME: icona Pulizie
  const goPul = $("#goPulizie");
  if (goPul){
    bindFastTap(goPul, () => { hideLauncher(); showPage("pulizie"); });
  }

  // HOME: icona Lavanderia (anche pulsante top)
  const goLav = $("#goLavanderia");
  if (goLav){
    bindFastTap(goLav, () => { hideLauncher(); showPage("lavanderia"); });
  }
  const goOrePulHome = $("#goOrePuliziaHome");
  if (goOrePulHome){
    bindFastTap(goOrePulHome, () => { hideLauncher(); showPage("orepulizia"); });
  }
  try{ __applyHomeIconGradients__(); }catch(_){ }
  try{
    const laundryDetailClose = document.getElementById('laundryDetailClose');
    const laundryDetailModal = document.getElementById('laundryDetailModal');
    if (laundryDetailClose && !laundryDetailClose.__boundLaundryDetail){
      laundryDetailClose.__boundLaundryDetail = true;
      bindFastTap(laundryDetailClose, () => { __closeLaundryDetailModal__(); });
    }
    if (laundryDetailModal && !laundryDetailModal.__boundLaundryBackdrop){
      laundryDetailModal.__boundLaundryBackdrop = true;
      laundryDetailModal.addEventListener('click', (ev) => { if (ev.target === laundryDetailModal) __closeLaundryDetailModal__(); });
    }
    if (!document.body.__boundLaundryDetailEsc){
      document.body.__boundLaundryDetailEsc = true;
      document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { __closeLaundryDetailModal__(); __closeLaundryPricesModal__(); } });
    }
  }catch(_){ }
  const goLavTop = $("#goLavanderiaTop");
  if (goLavTop){
    bindFastTap(goLavTop, () => { hideLauncher(); showPage("lavanderia"); });
  }

  // HOME: ore pulizie (se presente)
  const goOrePul = $("#goOrePulizia");
  if (goOrePul){
    bindFastTap(goOrePul, () => { hideLauncher(); showPage("orepulizia"); });
  }
  const goOrePulTop = $("#goOrePuliziaTop");
  if (goOrePulTop){
    bindFastTap(goOrePulTop, () => { hideLauncher(); showPage("orepulizia"); });
  }

  // HOME: tassa soggiorno (se presente)
  const goTassa = $("#goTassaSoggiorno");
  if (goTassa){
    bindFastTap(goTassa, async () => {
      hideLauncher();
      try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){ }
      showPage("tassa");
      try{ initTassaPage(); }catch(_){ }
    });
  }

  // HOME: Statistiche
  const goG = $("#goStatistiche");
  if (goG){
    bindFastTap(goG, () => { hideLauncher(); showPage("statistiche"); });
  }

  // STATISTICHE: icone
  const s1 = $("#goStatGen");
  if (s1){ bindFastTap(s1, () => { hideLauncher(); showPage("statgen"); }); }
  const s2 = $("#goStatMensili");
  if (s2){ bindFastTap(s2, () => { hideLauncher(); showPage("statmensili"); }); }
  const s3 = $("#goStatSpese");
  if (s3){ bindFastTap(s3, () => { hideLauncher(); showPage("statspese"); }); }
  const s4 = $("#goStatPrenotazioni");
  if (s4){ bindFastTap(s4, () => { hideLauncher(); showPage("statprenotazioni"); }); }

  
  const s5 = $("#goStatAzienda");
  if (s5){ bindFastTap(s5, () => { hideLauncher(); showPage("statazienda"); }); }
  const s6 = $("#goStatAmministratore");
  if (s6){ bindFastTap(s6, () => { hideLauncher(); showPage("statamministratore"); }); }
  const s8 = $("#goStatCancellazioni");
  if (s8){ bindFastTap(s8, () => { hideLauncher(); showPage("statcancellazioni"); }); }
// STATGEN: topbar tools
  const btnBackStats = $("#btnBackStatistiche");
  if (btnBackStats){ bindFastTap(btnBackStats, () => { closeStatPieModal(); showPage("statistiche"); }); }
  // STATMENSILI: topbar tools
  const btnBackStatsMensili = $("#btnBackStatisticheMensili");
  if (btnBackStatsMensili){ bindFastTap(btnBackStatsMensili, () => { closeStatMensiliPieModal(); showPage("statistiche"); }); }

  const btnPieMensili = $("#btnStatMensiliPie");
  if (btnPieMensili){ bindFastTap(btnPieMensili, () => { openStatMensiliPieModal(); }); }
  const statMensiliPieClose = $("#statMensiliPieClose");
  if (statMensiliPieClose){ bindFastTap(statMensiliPieClose, () => closeStatMensiliPieModal()); }
  const statMensiliPieModal = $("#statMensiliPieModal");
  if (statMensiliPieModal){
    statMensiliPieModal.addEventListener("click", (e)=>{
      if (e.target === statMensiliPieModal) closeStatMensiliPieModal();
    });
  }




  const btnPie = $("#btnStatPie");
  if (btnPie){ bindFastTap(btnPie, () => { openStatPieModal(); }); }
  const statPieClose = $("#statPieClose");
  if (statPieClose){ bindFastTap(statPieClose, () => closeStatPieModal()); }
  const statPieModal = $("#statPieModal");
  if (statPieModal){
    statPieModal.addEventListener("click", (e)=>{
      if (e.target === statPieModal) closeStatPieModal();
    });
  }

  // STATISTICHE: Spese generali topbar tools
  const btnBackStatsSpese = $("#btnBackStatisticheSpese");
  if (btnBackStatsSpese){ bindFastTap(btnBackStatsSpese, () => { closeStatSpesePieModal(); showPage("statistiche"); }); }
  const btnBackStatsPren = $("#btnBackStatistichePrenotazioni");
  if (btnBackStatsPren){ bindFastTap(btnBackStatsPren, () => { showPage("statistiche"); }); }
  const btnBackStatsCanc = $("#btnBackStatisticheCancellazioni");
  if (btnBackStatsCanc){ bindFastTap(btnBackStatsCanc, () => { showPage("statistiche"); }); }
  const btnBackStatsAzienda = $("#btnBackStatisticheAzienda");
  if (btnBackStatsAzienda){ bindFastTap(btnBackStatsAzienda, () => { showPage("statistiche"); }); }
  const btnBackStatsAmm = $("#btnBackStatisticheAmministratore");
  if (btnBackStatsAmm){ bindFastTap(btnBackStatsAmm, () => { showPage("statistiche"); }); }

  // STATPISCINA: topbar tools
  const btnBackStatsPiscina = $("#btnBackStatistichePiscina");
  if (btnBackStatsPiscina){ bindFastTap(btnBackStatsPiscina, () => { showPage("statistiche"); }); }
  const btnPiscinaBackfillTop = $("#btnPiscinaBackfillTop");
  const btnPiscinaSimToday = $("#piscinaSimTodayBtn");
  if (btnPiscinaSimToday){
    bindFastTap(btnPiscinaSimToday, () => {
      (async ()=>{
        try{
          const dayKey = __isoDayLocal(new Date());
          await piscinaCreateReportForDay(dayKey, { origine:"manual" });
          piscinaOpenModal(dayKey);
        }catch(e){
          toast(e?.message || "Errore");
        }
      })();
    });
  }


  if (btnPiscinaBackfillTop){ bindFastTap(btnPiscinaBackfillTop, () => { try{ piscinaBackfillCurrentMonth(); }catch(e){ toast(e.message||"Errore"); } }); }

const btnPieSpese = $("#btnStatSpesePie");
  if (btnPieSpese){ bindFastTap(btnPieSpese, () => { openStatSpesePieModal(); }); }

  const statSpesePieClose = $("#statSpesePieClose");
  if (statSpesePieClose){ bindFastTap(statSpesePieClose, () => closeStatSpesePieModal()); }
  const statSpesePieModal = $("#statSpesePieModal");
  if (statSpesePieModal){
    statSpesePieModal.addEventListener("click", (e)=>{
      if (e.target === statSpesePieModal) closeStatSpesePieModal();
    });
  }


  // Escape chiude il launcher
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideLauncher();
  });
}


function setupGuestListControls(){
  const sortSel = $("#guestSortBy");
  const dirBtn = $("#guestSortDir");
  const todayBtn = $("#guestToday");
  if (!sortSel) return;

  const savedBy = localStorage.getItem("dDAE_guestSortBy");
  const savedDir = localStorage.getItem("dDAE_guestSortDir");
  state.guestSortBy = savedBy || state.guestSortBy || "arrivo";
  state.guestSortDir = savedDir || state.guestSortDir || "asc";

  try { sortSel.value = state.guestSortBy; } catch(_) {}

  const paintDir = () => {
    if (!dirBtn) return;
    const asc = (state.guestSortDir !== "desc");
    dirBtn.textContent = asc ? "↑" : "↓";
    dirBtn.setAttribute("aria-pressed", asc ? "false" : "true");
  };
  paintDir();
  // Filtro rapido: Oggi (arrivo = oggi)
  const savedToday = localStorage.getItem("dDAE_guestTodayOnly");
  state.guestTodayOnly = (savedToday === "1") ? true : (savedToday === "0") ? false : (state.guestTodayOnly || false);

  const paintToday = () => {
    if (!todayBtn) return;
    todayBtn.classList.toggle("is-active", !!state.guestTodayOnly);
    todayBtn.setAttribute("aria-pressed", state.guestTodayOnly ? "true" : "false");
  };
  paintToday();

  if (todayBtn){
    todayBtn.addEventListener("click", () => {
      state.guestTodayOnly = !state.guestTodayOnly;
      try { localStorage.setItem("dDAE_guestTodayOnly", state.guestTodayOnly ? "1" : "0"); } catch(_){}
      paintToday();
      renderGuestCards();
    });
  }


  sortSel.addEventListener("change", () => {
    state.guestSortBy = sortSel.value;
    try { localStorage.setItem("dDAE_guestSortBy", state.guestSortBy); } catch(_){}
    renderGuestCards();
  });

  if (dirBtn){
    dirBtn.addEventListener("click", () => {
      state.guestSortDir = (state.guestSortDir === "desc") ? "asc" : "desc";
      try { localStorage.setItem("dDAE_guestSortDir", state.guestSortDir); } catch(_){}
      paintDir();
      renderGuestCards();
    });
  }


  // IRAP modal buttons
  const irapModal = document.getElementById("irapModal");
  if (irapModal){
    irapModal.addEventListener("click", (e)=>{ if (e.target === irapModal) closeIrapModal(); });
  }
  const btnIrapCancel = document.getElementById("btnIrapCancel");
  if (btnIrapCancel) bindFastTap(btnIrapCancel, () => closeIrapModal());
  const btnIrapSave = document.getElementById("btnIrapSave");
  if (btnIrapSave) bindFastTap(btnIrapSave, () => saveIrapModal());

  // Amministratore: salva compenso/TFM
  const btnAdminSave = document.getElementById("btnAdminSave");
  if (btnAdminSave) bindFastTap(btnAdminSave, () => saveStatAmministratore());

}

function guestIdOf(g){
  return String(g?.id ?? g?.ID ?? g?.ospite_id ?? g?.ospiteId ?? g?.guest_id ?? g?.guestId ?? "").trim();
}

function parseDateTs(v){
  const s = String(v ?? "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function computeInsertionMap(guests){
  const pickSeq = (g) => {
    const v = Number(g?.seq);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const pickIns = (g) => {
    const vals = [g?.insertion_no, g?.insertionNo, g?.ordineInserimento, g?.ins_no];
    for (const raw of vals){
      const v = Number(raw);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
  };

  const arr = (guests || []).map((g, idx) => {
    const id = guestIdOf(g);
    const seq = pickSeq(g);
    const ins = pickIns(g);
    const c = g?.created_at ?? g?.createdAt ?? "";
    const t = parseDateTs(c);
    const bucket = (seq != null) ? 0 : (ins != null ? 1 : 2);
    return { id, idx, seq, ins, t, bucket };
  }).filter(x => !!x.id);

  // Ordine misto stabile:
  // 1) seq quando presente
  // 2) insertion_no / ordineInserimento / ins_no come fallback
  // 3) createdAt solo come ulteriore fallback
  // updatedAt non influenza mai l'ordine di inserimento.
  arr.sort((a,b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;

    if (a.bucket === 0){
      if (a.seq !== b.seq) return a.seq - b.seq;
    }else if (a.bucket === 1){
      if (a.ins !== b.ins) return a.ins - b.ins;
    }

    const at = a.t;
    const bt = b.t;
    if (at != null && bt != null && at !== bt) return at - bt;
    if (at == null && bt != null) return 1;
    if (at != null && bt == null) return -1;
    return a.idx - b.idx;
  });

  const map = {};
  let n = 1;
  for (const x of arr){
    map[x.id] = n++;
  }
  return map;
}

function sortGuestsList(items){
  const by = state.guestSortBy || "arrivo";
  const dir = (state.guestSortDir === "desc") ? -1 : 1;
  const nameKey = (s) => String(s ?? "").trim().toLowerCase();

  const out = items.slice();
  out.sort((a,b) => {
    if (by === "nome") {
      return nameKey(a.nome).localeCompare(nameKey(b.nome), "it") * dir;
    }
    if (by === "inserimento") {
      const aa = Number(a._insNo) || 1e18;
      const bb = Number(b._insNo) || 1e18;
      return (aa - bb) * dir;
    }
    const ta = parseDateTs(a.check_in ?? a.checkIn);
    const tb = parseDateTs(b.check_in ?? b.checkIn);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return (ta - tb) * dir;
  });
  return out;
}

/* PERIOD SYNC */
function setPeriod(from, to){
  state.period = { from, to };

  periodSyncLock += 1;
  try {
    const map = [
      ["#fromDate", "#toDate"],
      ["#fromDate2", "#toDate2"],
      ["#fromDate3", "#toDate3"],
      ["#fromDate4", "#toDate4"],
    ];
    for (const [fSel,tSel] of map){
      const f = $(fSel), t = $(tSel);
      if (f) f.value = from;
      if (t) t.value = to;
    }
  } finally {
    periodSyncLock -= 1;
  }

  const chip = $("#periodChip");
  if (chip && state.page !== "home") chip.textContent = `${from} → ${to}`;
}


async function onPeriodChanged({ showLoader=false } = {}){
  // Quando cambia il periodo, i dati “period-based” vanno considerati obsoleti
  state._dataKey = "";

  // Aggiorna solo ciò che serve (evita chiamate inutili e loader continui)
  if (state.page === "ospiti") {
    await loadOspiti({ ...(state.period || {}), force:true });
    return;
  }
  if (state.page === "calendario") {
    if (state.calendar) state.calendar.ready = false;
    await ensureCalendarData();
    renderCalendario();
    return;
  }
  if (state.page === "spese") {
    await ensurePeriodData({ showLoader });
    // Se siamo nella sotto-vista "grafico+riepilogo", aggiorna anche quella
    if (state.speseView === "insights") {
      renderRiepilogo();
      renderGrafico();
    } else {
      renderSpese();
    }
    return;
  }
  if (state.page === "riepilogo") {
    await ensurePeriodData({ showLoader });
    renderRiepilogo();
    return;
  }
  if (state.page === "grafico") {
    await ensurePeriodData({ showLoader });
    renderGrafico();
    return;
  }
}

/* DATA LOAD */
async function loadMotivazioni(){
  const data = await cachedGet("motivazioni", {}, { showLoader:false, ttlMs: 5*60*1000 });
  state.motivazioni = data;

  const list = $("#motivazioniList");
  if (list) {
    list.innerHTML = "";
    data.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.motivazione;
      list.appendChild(opt);
    });
  }
}


async function load({ showLoader=true } = {}){
  // Prefill rapido da cache locale (aiuta dopo reload PWA)
  if (!state.stanzeRows || !state.stanzeRows.length){
    const hit = __lsGet("stanze");
    if (hit && Array.isArray(hit.data) && hit.data.length){
      try{
        const rows0 = hit.data;
        state.stanzeRows = rows0;
        // ricostruisci indicizzazione
        const map0 = {};
        for (const r of rows0){
          const gid = String(r.ospite_id ?? r.ospiteId ?? r.guest_id ?? r.guestId ?? "").trim();
          const sn = String(r.stanza_num ?? r.stanzaNum ?? r.room_number ?? r.roomNumber ?? r.stanza ?? r.room ?? "").trim();
          if (!gid || !sn) continue;
          const key = `${gid}:${sn}`;
          map0[key] = {
            letto_m: Number(r.letto_m ?? r.lettoM ?? 0) || 0,
            letto_s: Number(r.letto_s ?? r.lettoS ?? 0) || 0,
            culla: Number(r.culla ?? r.crib ?? 0) || 0,
          };
        }
        state.stanzeByKey = map0;
      } catch(_){}
    }
  }
  const data = await cachedGet("stanze", {}, { showLoader, ttlMs: 60*1000 });
  const rows = Array.isArray(data) ? data : [];
  state.stanzeRows = rows;

  // indicizza per ospite_id + stanza_num
  const map = {};
  for (const r of rows){
    const gid = String(r.ospite_id ?? r.ospiteId ?? r.guest_id ?? r.guestId ?? "").trim();
    const sn = String(r.stanza_num ?? r.stanzaNum ?? r.room_number ?? r.roomNumber ?? r.stanza ?? r.room ?? "").trim();
    if (!gid || !sn) continue;
    const key = `${gid}:${sn}`;
    map[key] = {
      letto_m: Number(r.letto_m ?? r.lettoM ?? 0) || 0,
      letto_s: Number(r.letto_s ?? r.lettoS ?? 0) || 0,
      culla: Number(r.culla ?? r.crib ?? 0) || 0,
    };
  }
  state.stanzeByKey = map;
  __lsSet("stanze", rows);
}

async function loadOspiti({ from="", to="", force=false } = {}){
  // Prefill rapido da cache locale (poi refresh in background)
  const lsKey = `ospiti|${from}|${to}`;
  const hit = __lsGet(lsKey);
  if (hit && Array.isArray(hit.data) && hit.data.length){
    state.guests = hit.data;
    // render subito (perceived speed)
    try{ requestAnimationFrame(renderGuestCards); } catch(_){ renderGuestCards(); }
  }

  // ✅ Necessario per mostrare i "pallini letti" stanza-per-stanza nelle schede ospiti
  const p = load({ showLoader:false });
  const hasLocal = !!(hit && Array.isArray(hit.data) && hit.data.length);

  // Se ho già dati locali, aggiorna in background (senza loader e senza bloccare la navigazione)
  const refresh = async () => {
    const data = await cachedGet("ospiti", { from, to }, {
      showLoader: !hasLocal,
      ttlMs: 2*60*1000,
      swrMs: 10*60*1000,
      force,
    });
    return data;
  };

  if (hasLocal && !force) {
    // fire-and-forget
    Promise.all([p, refresh()])
      .then(([ , data ]) => {
        // aggiorna solo se l'utente è ancora nella lista ospiti
        if (state.page !== "ospiti") return;
        const nextRaw = Array.isArray(data) ? data : [];
        const next = __filterByExerciseYear__(nextRaw, state.exerciseYear || loadExerciseYear(), [
          "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
          "createdAt","created_at","updatedAt","updated_at"
        ]);
        // Evita di sovrascrivere con vuoto se ho già dati (flash → scomparsa)
        if (next.length || !(Array.isArray(state.guests) && state.guests.length)) {
          state.guests = next;
          __lsSet(lsKey, state.guests);
        }
        try{ requestAnimationFrame(renderGuestCards); }catch(_){ renderGuestCards(); }
      })
      .catch((err) => {
        try{
          if (state && (state.page === "spese" || state.page === "statspese")) {
            toast((err && err.message) ? err.message : "Errore lettura spese");
          }
        }catch(_){ }
        try{ state._dataKey = ""; }catch(_){ }
      });
    return;
  }

  const [ , data ] = await Promise.all([p, refresh()]);
  const nextRaw = Array.isArray(data) ? data : [];
        const next = __filterByExerciseYear__(nextRaw, state.exerciseYear || loadExerciseYear(), [
          "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
          "createdAt","created_at","updatedAt","updated_at"
        ]);
  // Evita di sovrascrivere con vuoto se ho già dati (flash → scomparsa)
  if (next.length || !(Array.isArray(state.guests) && state.guests.length)) {
    state.guests = next;
    __lsSet(lsKey, state.guests);
  }
  renderGuestCards();
}


async function ensurePeriodData({ showLoader=true, force=false } = {}){
  const { from, to } = state.period;
  const uid = (state && state.session && state.session.user_id) ? String(state.session.user_id) : "";
  const anno = (state && state.exerciseYear) ? String(state.exerciseYear) : "";
  const key = `${uid}|${anno}|${from}|${to}`;

  if (!force && state._dataKey === key && state.report && Array.isArray(state.spese)) {
    return;
  }

  // Prefill immediato da cache locale (perceived speed) — poi refresh SWR
  const lsSpeseKey = `spese|${uid}|${anno}|${from}|${to}`;
  const lsReportKey = `report|${uid}|${anno}|${from}|${to}`;
  const lsGuestsKey = `ospiti|${uid}|${anno}|${from}|${to}`;
  const hitS = !force ? __lsGet(lsSpeseKey) : null;
  const hitR = !force ? __lsGet(lsReportKey) : null;
  const hitG = !force ? __lsGet(lsGuestsKey) : null;
  const hasLocal = !!((hitS && hitS.data) || (hitR && hitR.data) || (hitG && hitG.data));

  if (!force) {
    if (hitS && Array.isArray(hitS.data)) {
      state.spese = __filterByExerciseYear__(__filterSpeseByCardDateRange__(hitS.data, from, to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
      state.report = buildReportFromSpese(state.spese);
    } else if (hitR && hitR.data) {
      state.report = hitR.data;
    }
    if (hasLocal) state._dataKey = key;
  }

  const fetchAll = () => Promise.all([
    cachedGet("spese", { from, to }, { showLoader: showLoader && !hasLocal, ttlMs: 2*60*1000, swrMs: 10*60*1000, force }),
    cachedGet("ospiti", { from, to }, { showLoader:false, ttlMs: 2*60*1000, swrMs: 10*60*1000, force }),
  ]);

  // Se ho cache locale e non forzo, non bloccare la navigazione: aggiorna in background
  if (hasLocal && !force) {
    fetchAll()
      .then(([spese]) => {
                const uidNow = (state && state.session && state.session.user_id) ? String(state.session.user_id) : "";
        const annoNow = (state && state.exerciseYear) ? String(state.exerciseYear) : "";
        const kNow = `${uidNow}|${annoNow}|${state.period.from}|${state.period.to}`;
        if (kNow !== key) return;
        state.spese = __filterByExerciseYear__(__filterSpeseByCardDateRange__(Array.isArray(spese) ? spese : [], state.period.from, state.period.to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
        state.report = buildReportFromSpese(state.spese);
        state._dataKey = key;
        __lsSet(lsReportKey, state.report);
        __lsSet(lsSpeseKey, state.spese);

        // refresh UI se siamo su pagine che dipendono da questi dati
        try{
          if (state.page === "spese") {
            if (state.speseView === "list") renderSpese();
            else { renderRiepilogo(); renderGrafico(); }
          }
          if (state.page === "statgen") renderStatGen();
          if (state.page === "statmensili") renderStatMensili();
          if (state.page === "statspese") renderStatSpese();
        }catch(_){ }
      })
      .catch(() => {});
    return;
  }

  const [spese, ospiti] = await fetchAll();
  state.spese = __filterByExerciseYear__(__filterSpeseByCardDateRange__(Array.isArray(spese) ? spese : [], state.period.from, state.period.to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
  state.report = buildReportFromSpese(state.spese);
  state._dataKey = key;
  __lsSet(lsReportKey, state.report);
  __lsSet(lsSpeseKey, state.spese);
}


// =========================
// STATISTICHE: dati NON filtrati dai periodi di "Spese"
// (carica tutte le spese dell'anno esercizio, indipendente da state.period)
// =========================
function __getExerciseYearRangeISO(){
  const y = Number(state.exerciseYear || new Date().getFullYear());
  const yy = String(isFinite(y) ? y : new Date().getFullYear());
  return { from: `${yy}-01-01`, to: `${yy}-12-31` };
}

async function ensureStatsAllData({ showLoader=true, force=false } = {}){
  const { from, to } = __getExerciseYearRangeISO();
  const uid = (state && state.session && state.session.user_id) ? String(state.session.user_id) : "";
  const anno = (state && state.exerciseYear) ? String(state.exerciseYear) : "";
  const key = `${uid}|${anno}|ALL|${from}|${to}`;

  if (!force && state._statsDataKey === key && Array.isArray(state.speseAll) && state.reportAll) {
    return;
  }

  const lsSpeseKey = `speseALL|${uid}|${anno}|${from}|${to}`;
  const lsReportKey = `reportALL|${uid}|${anno}|${from}|${to}`;
  const lsGuestsKey = `ospitiALL|${uid}|${anno}|${from}|${to}`;
  const hitS = !force ? __lsGet(lsSpeseKey) : null;
  const hitR = !force ? __lsGet(lsReportKey) : null;
  const hitG = !force ? __lsGet(lsGuestsKey) : null;
  const hasLocal = !!((hitS && hitS.data) || (hitR && hitR.data) || (hitG && hitG.data));

  if (!force) {
    if (hitS && Array.isArray(hitS.data)) {
      state.speseAll = __filterByExerciseYear__(__filterSpeseByCardDateRange__(hitS.data, from, to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
      state.reportAll = buildReportFromSpese(state.speseAll);
    } else if (hitR && hitR.data) {
      state.reportAll = hitR.data;
    }
    if (hitG && Array.isArray(hitG.data)) {
      state.statsGuests = __filterByExerciseYear__(hitG.data, state.exerciseYear || loadExerciseYear(), [
        "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
        "createdAt","created_at","updatedAt","updated_at"
      ]);
    }
    if (hasLocal) state._statsDataKey = key;
  }

  const fetchAll = () => Promise.all([
    cachedGet("spese", { from, to }, { showLoader: showLoader && !hasLocal, ttlMs: 2*60*1000, swrMs: 10*60*1000, force }),
    cachedGet("ospiti", { from, to }, { showLoader: false, ttlMs: 2*60*1000, swrMs: 10*60*1000, force }),
  ]);

  if (hasLocal && !force) {
    fetchAll()
      .then(([spese, ospiti]) => {
        const uidNow = (state && state.session && state.session.user_id) ? String(state.session.user_id) : "";
        const annoNow = (state && state.exerciseYear) ? String(state.exerciseYear) : "";
        const kNow = `${uidNow}|${annoNow}|ALL|${from}|${to}`;
        if (kNow !== key) return;
        state.speseAll = __filterByExerciseYear__(__filterSpeseByCardDateRange__(Array.isArray(spese) ? spese : [], from, to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
        state.reportAll = buildReportFromSpese(state.speseAll);
        state._statsDataKey = key;
        __lsSet(lsReportKey, state.reportAll);
        __lsSet(lsSpeseKey, state.speseAll);
        state.statsGuests = __filterByExerciseYear__(Array.isArray(ospiti) ? ospiti : [], state.exerciseYear || loadExerciseYear(), [
          "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
          "createdAt","created_at","updatedAt","updated_at"
        ]);
        __lsSet(lsGuestsKey, state.statsGuests);

        try{
          if (state.page === "statgen") renderStatGen();
          if (state.page === "statmensili") renderStatMensili();
          if (state.page === "statspese") renderStatSpese();
          if (state.page === "statprenotazioni") renderStatPrenotazioni();
          if (state.page === "statazienda") renderStatAzienda();
          if (state.page === "statamministratore") renderStatAmministratore();
        }catch(_){ }
      })
      .catch(() => {});
    return;
  }

  const [spese, ospiti] = await fetchAll();
  state.speseAll = __filterByExerciseYear__(__filterSpeseByCardDateRange__(Array.isArray(spese) ? spese : [], from, to), state.exerciseYear || loadExerciseYear(), ["dataSpesa","data","data_spesa"]);
  state.reportAll = buildReportFromSpese(state.speseAll);
  state._statsDataKey = key;
  __lsSet(lsReportKey, state.reportAll);
  __lsSet(lsSpeseKey, state.speseAll);
  state.statsGuests = __filterByExerciseYear__(Array.isArray(ospiti) ? ospiti : [], state.exerciseYear || loadExerciseYear(), [
    "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
    "createdAt","created_at","updatedAt","updated_at"
  ]);
  __lsSet(lsGuestsKey, state.statsGuests);
}


function loadOspitiEliminati({ from="", to="", force=false } = {}){
  const lsKey = `ospiti_eliminati|${from}|${to}`;
  const hit = __lsGet(lsKey);
  if (hit && Array.isArray(hit.data)){
    state.deletedGuests = hit.data;
  }

  if (!force && hit && Array.isArray(hit.data) && hit.data.length){
    // refresh in background
    api("ospiti_eliminati", { method:"GET", params:{ from, to }, showLoader:false })
      .then((rows)=>{
        if (Array.isArray(rows)){
          state.deletedGuests = rows;
          __lsSet(lsKey, { data: rows, ts: Date.now() });
        }
      })
      .catch(()=>{});
    return Promise.resolve(state.deletedGuests);
  }

  return api("ospiti_eliminati", { method:"GET", params:{ from, to }, showLoader:false })
    .then((rows)=>{
      if (Array.isArray(rows)){
        state.deletedGuests = rows;
        __lsSet(lsKey, { data: rows, ts: Date.now() });
        return rows;
      }
      state.deletedGuests = [];
      __lsSet(lsKey, { data: [], ts: Date.now() });
      return [];
    })
    .catch((e)=>{
      state.deletedGuests = state.deletedGuests || [];
      return state.deletedGuests;
    });
}


function __getStatsReport(){
  return (state && state.reportAll) ? state.reportAll : state.report;
}
function __getStatsSpese(){
  return Array.isArray(state && state.speseAll) ? state.speseAll : (Array.isArray(state && state.spese) ? state.spese : []);
}

// Compat: vecchi call-site
async function loadData({ showLoader=true } = {}){
  return ensurePeriodData({ showLoader });
}


/* 1) INSERISCI */
function resetInserisci(){
  $("#spesaImporto").value = "";
  $("#spesaMotivazione").value = "";
  $("#spesaCategoria").value = "";
  $("#spesaData").value = todayISO();

  // Motivazione: se l'utente scrive una variante già esistente, usa la versione canonica
  const mot = $("#spesaMotivazione");
  if (mot) {
    mot.addEventListener("blur", () => {
      const v = collapseSpaces((mot.value || "").trim());
      if (!v) return;
      const canonical = findCanonicalMotivazione(v);
      if (canonical) mot.value = canonical;
      else mot.value = v; // pulizia spazi multipli
    });
  } // lascia oggi
}


function collapseSpaces(s){
  return String(s || "").replace(/\s+/g, " ");
}

// Normalizza SOLO per confronto (non altera la stringa salvata se già esistente)
function normalizeMotivazioneForCompare(s){
  let x = collapseSpaces(String(s || "").trim()).toLowerCase();
  // rimuove accenti SOLO per confronto
  try {
    x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (_) {}
  return x;
}

function findCanonicalMotivazione(input){
  const needle = normalizeMotivazioneForCompare(input);
  for (const m of (state.motivazioni || [])){
    const val = m?.motivazione ?? "";
    if (normalizeMotivazioneForCompare(val) === needle) return val;
  }
  return null;
}

async function saveSpesa(){
  const dataSpesa = $("#spesaData").value;
  const categoria = $("#spesaCategoria").value;
  const importoLordo = Number($("#spesaImporto").value);
  const motivazione = ($("#spesaMotivazione").value || "").trim();

  if (!isFinite(importoLordo) || importoLordo <= 0) return toast("Importo non valido");
  if (!motivazione) return toast("Motivazione obbligatoria");
  if (!dataSpesa) return toast("Data obbligatoria");
  if (!categoria) return toast("Categoria obbligatoria");

  // se motivazione nuova => salva per futuro
  const canonical = findCanonicalMotivazione(motivazione);
  // Se esiste già (spazi/case/accenti diversi), non salvare duplicati
  if (canonical) {
    $("#spesaMotivazione").value = canonical; // versione canonica
  } else {
    try {
      await api("motivazioni", { method:"POST", body:{ motivazione }, showLoader:false });
      await loadMotivazioni();
    } catch (_) {}
  }

  // Salva spesa
  const res = await api("spese", { method:"POST", body:{ dataSpesa, categoria, motivazione, importoLordo, note: "" } });

  // UX: ritorno IMMEDIATO alla lista spese (senza attendere refresh dati)
  try { setSpeseView("list"); } catch (_) {}
  try { showPage("spese"); } catch (_) {}

  // Aggiornamento ottimistico: mostra subito il nuovo record in lista
  try{
    const newId = (res && (res.id || res.spesaId || (res.data && (res.data.id || res.data.spesaId)))) || ("tmp-" + Date.now());
    const newItem = { id: newId, dataSpesa, categoria, motivazione, importoLordo };
    if (Array.isArray(state.spese)) state.spese = [newItem, ...state.spese];
    else state.spese = [newItem];
    if (state.page === "spese" && state.speseView === "list") {
      try{ renderSpese(); }catch(_){ }
    }
  }catch(_){ }

  toast("Salvato");
  resetInserisci();

  // refresh dati in background (non blocca il ritorno alla lista)
  try {
    invalidateApiCache("spese|");
    invalidateApiCache("report|");
    ensurePeriodData({ showLoader:false, force:true })
      .then(() => {
        try{
          if (state.page === "spese" && state.speseView === "list") renderSpese();
          if (state.page === "riepilogo") renderRiepilogo();
          if (state.page === "grafico") renderGrafico();
        }catch(_){ }
      })
      .catch(()=>{});
  } catch(_) {}

}

/* 2) SPESE */
function renderSpese(){
  const list = document.getElementById("speseList");
  if (!list) return;
  list.innerHTML = "";

  const items = __getStatsSpese();
  if (!items.length){
    list.innerHTML = '<div style="font-size:13px; opacity:.75; padding:8px 2px;">Nessuna spesa nel periodo.</div>';
    return;
  }

  items.forEach(s => {
    const el = document.createElement("div");
    el.className = "item";

    const importo = Number(s.importoLordo || 0);
    const data = formatShortDateIT(s.dataSpesa || s.data || s.data_spesa || "");
    const motivo = escapeHtml((s.motivazione || s.motivo || "").toString());

    el.innerHTML = `
      <div class="item-top">
        <div class="spesa-line" title="${motivo}">
          <span class="spesa-imp">${euro(importo)}</span>
          <span class="spesa-sep">·</span>
          <span class="spesa-date">${data}</span>
          <span class="spesa-sep">·</span>
          <span class="spesa-motivo">${motivo}</span>
        </div>
        <button class="delbtn delbtn-x" type="button" aria-label="Elimina record" data-del="${s.id}">Elimina</button>
      </div>
    `;

    const btn = el.querySelector("[data-del]");
    if (btn){
      // iOS/Safari: tap affidabile anche su PWA (Operatore)
      bindFastTap(btn, async (ev) => {
        try{
          ev && ev.preventDefault && ev.preventDefault();
          ev && ev.stopPropagation && ev.stopPropagation();
          ev && ev.stopImmediatePropagation && ev.stopImmediatePropagation();
        }catch(_){}
        if (!confirm("Eliminare definitivamente questa spesa?")) return;
        await api("spese", { method:"DELETE", params:{ id: s.id } });
        toast("Spesa eliminata");
        invalidateApiCache("spese|");
        invalidateApiCache("report|");
        await ensurePeriodData({ showLoader:false, force:true });
        renderSpese();
      });
    }

    list.appendChild(el);
  });
}


/* 3) RIEPILOGO */
function renderRiepilogo(){
  const r = buildReportFromSpese(state.spese);
  state.report = r;

  $("#kpiTotSpese").textContent = euro(r.totals.importoLordo);
  $("#kpiIvaDetraibile").textContent = euro(r.totals.ivaDetraibile);
  $("#kpiImponibile").textContent = euro(r.totals.imponibile);

  // Lista semplice: 5 righe (categoria + totale lordo)
  const container = $("#byCat");
  if (!container) return;

  const by = r.byCategoria || {};
  const order = ["CONTANTI","TASSA_SOGGIORNO","IVA_22","IVA_10","IVA_4"];

  container.innerHTML = "";
  for (const k of order){
    const o = by[k] || { importoLordo: 0 };
    const row = document.createElement("div");
    row.className = "catitem";
    row.innerHTML = `
      <div class="catitem-left">
        <span class="badge" style="background:${hexToRgba(COLORS[k] || "#d8bd97", 0.20)}">${categoriaLabel(k)}</span>
        <div class="catitem-name">Totale</div>
      </div>
      <div class="catitem-total">${euro(o.importoLordo)}</div>
    `;
    container.appendChild(row);
  }
}

/* 4) GRAFICO */
function renderGrafico(){
  // Usa report locale calcolato dalle spese correnti (evita mix multi-account)
  const r = buildReportFromSpese(state.spese);
  state.report = r;

  const by = r.byCategoria || {};
  const order = ["CONTANTI","TASSA_SOGGIORNO","IVA_22","IVA_10","IVA_4"];
  const values = order.map(k => Number(by[k]?.importoLordo || 0));
  const total = values.reduce((a,b)=>a+b,0);

  drawPie("pieCanvas", order.map((k,i)=>({
    key: k,
    label: categoriaLabel(k),
    value: values[i],
    color: COLORS[k] || "#999999"
  })));

  const leg = $("#pieLegend");
  if (!leg) return;
  leg.innerHTML = "";

  order.forEach((k,i) => {
    const v = values[i];
    const pct = total > 0 ? (v/total*100) : 0;
    const row = document.createElement("div");
    row.className = "legrow";
    row.innerHTML = `
      <div class="legleft">
        <div class="dot" style="background:${COLORS[k] || "#999"}"></div>
        <div class="legname">${categoriaLabel(k)}</div>
      </div>
      <div class="legright">${pct.toFixed(1)}% · ${euro(v)}</div>
    `;
    leg.appendChild(row);
  });
}

/* PIE DRAW (no librerie) */
function drawPie(canvasId, slices, opts){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  opts = opts || {};
  const centerTitle = (opts.centerTitle != null ? String(opts.centerTitle) : "Totale");
  const centerFormatter = (typeof opts.centerFormatter === "function") ? opts.centerFormatter : euro;
  const showCenter = (opts.showCenter !== false);

  const parentW = (canvas.parentElement && canvas.parentElement.clientWidth) ? canvas.parentElement.clientWidth : 0;
  const baseW = parentW || Math.floor(window.innerWidth * 0.78);
  const cssSize = Math.min((opts.maxSize || 320), Math.max((opts.minSize || 120), Math.floor((opts.size || baseW) - 8)));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssSize,cssSize);

  const total = slices.reduce((a,s)=>a+Math.max(0,Number(s.value||0)),0);
  const cx = cssSize/2, cy = cssSize/2;
  const r = cssSize/2 - 10;

  // Glass ring background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,23,42,0.08)";
  ctx.stroke();

  let ang = -Math.PI/2;
  if (total <= 0){
    ctx.beginPath();
    ctx.arc(cx, cy, r-8, 0, Math.PI*2);
    ctx.fillStyle = "rgba(43,124,180,0.10)";
    ctx.fill();
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.font = "600 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Nessun dato", cx, cy+4);
    return;
  }

  slices.forEach(s => {
    const v = Math.max(0, Number(s.value||0));
    const a = (v/total) * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r-8,ang,ang+a);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ang += a;
  });

  // inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, r*0.58, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(15,23,42,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (showCenter){
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(centerTitle, cx, cy-4);
    ctx.fillStyle = "rgba(15,23,42,0.92)";
    ctx.font = "950 14px system-ui";
    ctx.fillText(centerFormatter(total), cx, cy+14);
  }
}


function drawMonthlyPctBars(canvasId, pctValues, colors, opts){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  opts = opts || {};
  const parentW = (canvas.parentElement && canvas.parentElement.clientWidth) ? canvas.parentElement.clientWidth : 0;
  const baseW = parentW || Math.floor(window.innerWidth * 0.86);
  const cssW = Math.min(340, Math.max(140, Math.floor(baseW - 4)));
  const cssH = 180;
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssW,cssH);

  const vals = Array.isArray(pctValues) ? pctValues : [];
  const v12 = new Array(12).fill(0).map((_,i)=>Math.max(0, Math.min(100, Number(vals[i]||0)||0)));
  const cols = Array.isArray(colors) ? colors : [];
  const padL = 22, padR = 10, padT = 12, padB = 26;

  // background panel
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = "rgba(15,23,42,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, 6, 6, cssW-12, cssH-12, 16);
  ctx.fill();
  ctx.stroke();

  const chartW = cssW - padL - padR;
  const chartH = cssH - padT - padB;

  // baseline
  ctx.beginPath();
  ctx.moveTo(padL, padT + chartH);
  ctx.lineTo(padL + chartW, padT + chartH);
  ctx.strokeStyle = "rgba(15,23,42,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const barGap = 6;
  const barW = Math.max(6, Math.floor((chartW - barGap*11) / 12));

  for (let i=0;i<12;i++){
    const x = padL + i*(barW + barGap);
    const h = (v12[i] / 100) * chartH;
    const y = padT + (chartH - h);

    ctx.fillStyle = cols[i] || "#2b7cb4";
    roundRect(ctx, x, y, barW, h, Math.min(10, barW/2));
    ctx.fill();

    // month label (1 letter)
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.font = "700 10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const label = (opts.labels && opts.labels[i]) ? String(opts.labels[i]) : String((__MONTHS_IT[i]||"").slice(0,1)).toUpperCase();
    ctx.fillText(label, x + barW/2, padT + chartH + 18);
  }

  // 100% label
  ctx.fillStyle = "rgba(15,23,42,0.55)";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("100%", padL + chartW, padT + 10);
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}


function __renderLegendRows__(containerId, slices, valueFormatter){
  const leg = document.getElementById(containerId);
  if (!leg) return;
  const fmt = (typeof valueFormatter === "function") ? valueFormatter : ((v)=>String(v));
  const total = (Array.isArray(slices) ? slices : []).reduce((a,x)=>a+Math.max(0, Number((x && x.value) || 0)), 0);
  leg.innerHTML = "";
  (Array.isArray(slices) ? slices : []).forEach((sl)=>{
    const v = Math.max(0, Number((sl && sl.value) || 0));
    const pct = total > 0 ? (v / total * 100) : 0;
    const row = document.createElement("div");
    row.className = "legrow";
    row.innerHTML = `
      <div class="legleft">
        <div class="dot" style="background:${sl.color}"></div>
        <div class="legname">${escapeHtml(sl.label)}</div>
      </div>
      <div class="legright">${pct.toFixed(1)}% · ${fmt(v)}</div>
    `;
    leg.appendChild(row);
  });
}

function __getStatGraphCard__(canvasId){
  const canvas = document.getElementById(canvasId);
  return canvas && canvas.closest ? canvas.closest(".stats-graph-card") : null;
}

function __bindStatGraphPopup__(canvasId, payload){
  const card = __getStatGraphCard__(canvasId);
  const canvas = document.getElementById(canvasId);
  const target = card || canvas;
  if (!target || !payload) return;
  try{
    target.classList.add("is-tappable");
    target.setAttribute("role", "button");
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", payload.title || "Grafico");
  }catch(_){ }
  const open = ()=>{ try{ __openStatGraphPopup__(payload); }catch(_){ } };
  target.onclick = open;
  target.onkeydown = (e)=>{
    const k = e && (e.key || e.code);
    if (k === "Enter" || k === " " || k === "Spacebar"){
      try{ e.preventDefault(); }catch(_){ }
      open();
    }
  };
}

function __openStatGraphPopup__(payload){
  const modal = document.getElementById("statGraphModal");
  if (!modal || !payload) return;
  const titleEl = document.getElementById("statGraphModalTitle");
  const detailEl = document.getElementById("statGraphModalDetail");
  const legendEl = document.getElementById("statGraphModalLegend");
  if (titleEl) titleEl.textContent = String(payload.title || "Grafico");
  if (detailEl) detailEl.textContent = String(payload.detail || "");
  __renderLegendRows__("statGraphModalLegend", Array.isArray(payload.slices) ? payload.slices : [], payload.valueFormatter);
  drawPie("statGraphModalCanvas", Array.isArray(payload.slices) ? payload.slices : [], {
    centerTitle: payload.centerTitle != null ? payload.centerTitle : "Totale",
    centerFormatter: (typeof payload.centerFormatter === "function") ? payload.centerFormatter : euro,
    showCenter: true,
    maxSize: 340,
    minSize: 180
  });
  modal.hidden = false;
  try{ modal.setAttribute("aria-hidden", "false"); }catch(_){ }
}

function __closeStatGraphPopup__(){
  const modal = document.getElementById("statGraphModal");
  if (!modal) return;
  modal.hidden = true;
  try{ modal.setAttribute("aria-hidden", "true"); }catch(_){ }
}

function __ensureStatGraphPopupBound__(){
  const modal = document.getElementById("statGraphModal");
  const closeBtn = document.getElementById("statGraphModalClose");
  if (!modal || modal.__bound) return;
  modal.__bound = true;
  if (closeBtn) closeBtn.addEventListener("click", __closeStatGraphPopup__);
  modal.addEventListener("click", (e)=>{ if (e.target === modal) __closeStatGraphPopup__(); });
}

function __occupazioneMensileSlices__(mensili){
  const vals = Array.isArray(mensili && mensili.occPctByMonth) ? mensili.occPctByMonth : [];
  const colors = __mensiliPalette12();
  return new Array(12).fill(0).map((_,i)=>({
    label: String(__MONTHS_IT[i] || `Mese ${i+1}`),
    value: Math.max(0, Math.min(100, Number(vals[i] || 0) || 0)),
    color: colors[i % colors.length] || "#2b7cb4"
  })).filter(x=>x.value > 0);
}

function __operatorGraphColors__(){
  try{
    const catalog = getOperatoriCatalogFromSettings ? (getOperatoriCatalogFromSettings() || []) : [];
    const palette = catalog.map(item => getOperatoreColorHexByName(item?.nome || '', item?.colore || 'blue')).filter(Boolean);
    if (palette.length) return palette;
  }catch(_){ }
  return ['#6fb7d6', '#f29c50', '#4caf7d', '#e25d4b', '#8f78d4', '#d6b276'];
}
function __operatorGraphColors(){
  return __operatorGraphColors__();
}
// Compatibilità difensiva: alcune build/client possono richiamare un alias errato
// e bloccare il rendering dei grafici operatori con "... is not defined".
function operatorgraphicColor(){
  return __operatorGraphColors__();
}
function operatorGraphicColor(){
  return __operatorGraphColors__();
}

function computeStatOrePuliziaGrafico(rows){
  const listRaw = Array.isArray(rows) ? rows : [];
  const list = __filterByExerciseYear__(listRaw, state.exerciseYear || loadExerciseYear(), ["data","date","Data","createdAt","created_at","updatedAt","updated_at"]);
  const totals = new Map();
  for (const r of list){
    const name = getCanonicalActiveOperatorName(r?.operatore || r?.nome || '');
    if (!name) continue;
    const ore = Number(String(r?.ore ?? r?.Ore ?? 0).replace(",", "."));
    if (!isFinite(ore) || ore <= 0) continue;
    totals.set(name, (totals.get(name) || 0) + ore);
  }
  let fromSet = [];
  try{ fromSet = getActiveOperatorNames ? (getActiveOperatorNames() || []) : []; }catch(_){ fromSet = []; }
  const ordered = [];
  const pushUnique = (v)=>{ const s = String(v||"").trim(); if (s && !ordered.includes(s)) ordered.push(s); };
  fromSet.forEach(pushUnique);
  const palette = __operatorGraphColors();
  const slices = ordered.map((name, i)=>({
    label: name,
    value: Number(totals.get(name) || 0),
    color: getOperatoreColorHexByName(name, palette[i % palette.length] || 'blue')
  })).filter(x=>x.value > 0);
  return slices;
}

function renderStatGrafici(operatoriRows){
  __ensureStatGraphPopupBound__();
  const year = String(state.exerciseYear || loadExerciseYear() || new Date().getFullYear());
  const mensili = computeStatMensili();
  state.statMensili = mensili;
  const statGen = computeStatGen();
  state.statGen = statGen;
  const pren = computeStatPrenotazioni();
  const cancRows = Array.isArray(state.deletedGuests) ? state.deletedGuests.filter(r => String(r.delete_reason || "").toLowerCase() === "cancellazione" || String(r.delete_reason || "").trim() === "") : [];
  const activeRows = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);
  const cancSlices = [
    { label: "Attive", value: activeRows.length, color: "#2b7cb4" },
    { label: "Cancellate", value: cancRows.length, color: "#ff3b30" }
  ];
  const statSpese = computeStatSpese();
  state.statSpese = statSpese;
  const speseSlices = [
    { label: categoriaLabel("CONTANTI"), value: statSpese.contanti, color: (COLORS.CONTANTI || "#2b7cb4") },
    { label: categoriaLabel("TASSA_SOGGIORNO"), value: statSpese.tassaSoggiorno, color: (COLORS.TASSA_SOGGIORNO || "#d8bd97") },
    { label: categoriaLabel("IVA_22"), value: statSpese.iva22, color: (COLORS.IVA_22 || "#c9772b") },
    { label: categoriaLabel("IVA_10"), value: statSpese.iva10, color: (COLORS.IVA_10 || "#7ac0db") },
    { label: categoriaLabel("IVA_4"), value: statSpese.iva4, color: (COLORS.IVA_4 || "#1f2937") }
  ].filter(x=>Number(x.value || 0) > 0);
  const pulizieSlices = computeStatOrePuliziaGrafico(operatoriRows);
  const ricevuteSlices = [
    { label: "Senza ricevuta", value: statGen.senzaRicevuta, color: "#bfbea9" },
    { label: "Con ricevuta", value: statGen.conRicevuta, color: "#6fb7d6" }
  ];
  const bookingSlices = [
    { label: "Con Booking", value: pren.withBooking, color: "#2b7cb4" },
    { label: "Senza Booking", value: pren.withoutBooking, color: "#c9772b" }
  ];
  const occSlices = __occupazioneMensileSlices__(mensili);

  drawPie("statGrafOccCanvas", occSlices.length ? occSlices : [{ label: "Nessun dato", value: 0, color: "#2b7cb4" }], { centerTitle: "Occup.", centerFormatter: (n)=>`${Number(n || 0).toFixed(1)}%`, showCenter: false, maxSize: 170, minSize: 120 });
  drawPie("statGrafRicevuteCanvas", ricevuteSlices, { centerTitle: "Totale", centerFormatter: euro, showCenter: false, maxSize: 170, minSize: 120 });
  drawPie("statGrafBookingCanvas", bookingSlices, { centerTitle: "Prenot.", centerFormatter: (n)=>String(Math.round(Number(n || 0))), showCenter: false, maxSize: 170, minSize: 120 });
  drawPie("statGrafCancCanvas", cancSlices, { centerTitle: "Totale", centerFormatter: (n)=>String(Math.round(Number(n || 0))), showCenter: false, maxSize: 170, minSize: 120 });
  drawPie("statGrafSpeseCanvas", speseSlices.length ? speseSlices : [{ label: "Nessuna spesa", value: 0, color: "#2b7cb4" }], { centerTitle: "Spese", centerFormatter: euro, showCenter: false, maxSize: 170, minSize: 120 });
  drawPie("statGrafPulizieCanvas", pulizieSlices.length ? pulizieSlices : [{ label: "Nessun dato", value: 0, color: "#2b7cb4" }], { centerTitle: "Ore", centerFormatter: (n)=>__fmtHours_(n) || "0", showCenter: false, maxSize: 170, minSize: 120 });

  __bindStatGraphPopup__("statGrafOccCanvas", {
    title: "Occupazione mensile",
    detail: `Anno solare ${year} · percentuale media mensile di occupazione`,
    slices: occSlices,
    valueFormatter: (v)=>`${Number(v || 0).toFixed(1)}%`,
    centerTitle: "Media",
    centerFormatter: (n)=>`${Number(n || 0).toFixed(1)}%`
  });
  __bindStatGraphPopup__("statGrafRicevuteCanvas", {
    title: "Con ricevuta / Senza ricevuta",
    detail: `Anno solare ${year} · distribuzione degli incassi`,
    slices: ricevuteSlices,
    valueFormatter: euro,
    centerTitle: "Totale",
    centerFormatter: euro
  });
  __bindStatGraphPopup__("statGrafBookingCanvas", {
    title: "Prenotazioni con / senza Booking",
    detail: `Anno solare ${year} · numero prenotazioni`,
    slices: bookingSlices,
    valueFormatter: (v)=>String(Math.round(Number(v || 0))),
    centerTitle: "Prenot.",
    centerFormatter: (n)=>String(Math.round(Number(n || 0)))
  });
  __bindStatGraphPopup__("statGrafCancCanvas", {
    title: "Cancellazioni",
    detail: `Anno solare ${year} · attive vs cancellate`,
    slices: cancSlices,
    valueFormatter: (v)=>String(Math.round(Number(v || 0))),
    centerTitle: "Totale",
    centerFormatter: (n)=>String(Math.round(Number(n || 0)))
  });
  __bindStatGraphPopup__("statGrafSpeseCanvas", {
    title: "Spese",
    detail: `Anno solare ${year} · distribuzione per categoria`,
    slices: speseSlices,
    valueFormatter: euro,
    centerTitle: "Spese",
    centerFormatter: euro
  });
  __bindStatGraphPopup__("statGrafPulizieCanvas", {
    title: "Ore pulizia operatori",
    detail: `Anno solare ${year} · ripartizione percentuale ore operatori`,
    slices: pulizieSlices,
    valueFormatter: (v)=>`${__fmtHours_(v) || "0"}h`,
    centerTitle: "Ore",
    centerFormatter: (n)=>`${__fmtHours_(n) || "0"}h`
  });
}



/* Helpers */
function hexToRgba(hex, a){
  const h = (hex || "").replace("#","");
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

// =========================
// STATISTICHE (dDAE_1.020)
// =========================

function computeStatGen(){
  const guests = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);
  const report = __getStatsReport() || null;

  const money = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    // Normalizza numeri tipo "1.234,56" o "1234,56"
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  // Fatturato totale = somma di tutte le voci "importo prenotazione"
  let fatturato = 0;

  // Giacenza in cassa = somma di tutti gli importi "acconto + saldo"
  let giacenza = 0;

  // (Restano utili per le righe con/senza ricevuta)
  let conRicevuta = 0;
  let senzaRicevuta = 0;


  // Servizi (foglio "servizi"): somma importi (importo * qty) per gli ospiti del periodo
  const servizi = Array.isArray(state.servizi) ? state.servizi : [];
  const guestIdsSet = new Set();
  for (const g of guests){
    const _gid = guestIdOf(g) ?? g?.id ?? g?.ID ?? g?.Id ?? "";
    if (_gid !== null && _gid !== undefined && String(_gid).trim() !== "") guestIdsSet.add(String(_gid));
    const pren = money(g?.importo_prenotazione ?? g?.importo_prenota ?? g?.importoPrenotazione ?? g?.importoPrenota ?? 0);
    fatturato += pren;

    const dep = money(g?.acconto_importo ?? g?.accontoImporto ?? 0);
    const saldo = money(g?.saldo_pagato ?? g?.saldoPagato ?? g?.saldo ?? 0);

    giacenza += (dep + saldo);

    // receipt flags
    const depRec = truthy(g?.acconto_ricevuta ?? g?.accontoRicevuta ?? g?.ricevuta_acconto ?? g?.ricevutaAcconto ?? g?.acconto_ricevutain);
    const saldoRec = truthy(g?.saldo_ricevuta ?? g?.saldoRicevuta ?? g?.ricevuta_saldo ?? g?.ricevutaSaldo ?? g?.saldo_ricevutain);

    if (dep > 0){
      if (depRec) conRicevuta += dep;
      else senzaRicevuta += dep;
    }
    if (saldo > 0){
      if (saldoRec) conRicevuta += saldo;
      else senzaRicevuta += saldo;
    }
  }

  // Aggiungi servizi al fatturato totale
  try{
    let sumServizi = 0;
    for (const s of (servizi || [])){
      if (!s) continue;
      const del = s.isDeleted ?? s.is_deleted ?? s.deleted;
      if (String(del) === "1" || del === true) continue;
      const ospiteId = s.ospite_id ?? s.ospiteId ?? s.guest_id ?? s.guestId ?? "";
      if (ospiteId === null || ospiteId === undefined || String(ospiteId).trim() === "") continue;
      if (!guestIdsSet.has(String(ospiteId))) continue;

      const qtyRaw = money(s.qty ?? 1);
      const qty = (isFinite(qtyRaw) && qtyRaw > 0) ? qtyRaw : 1;
      const amt = money(s.importo ?? s.amount ?? 0);
      if (!isFinite(amt) || amt === 0) continue;

      sumServizi += (qty * amt);
    }
    if (isFinite(sumServizi) && sumServizi !== 0){
      fatturato += sumServizi;
    }
  }catch(_){ }

  let speseTot = 0;

  try{
    const items = __getStatsSpese();
    let sum = 0;
    for (const it of items){
      sum += money(it?.importoLordo ?? it?.lordo ?? 0);
    }
    speseTot = sum;
  }catch(_){
    speseTot = 0;
  }


  // dDAE_1.020+ — Giacenza in cassa = (con ricevuta + senza ricevuta) - spese totali
  try{
    giacenza = (money(conRicevuta) + money(senzaRicevuta)) - money(speseTot);
  }catch(_){ }

  let ivaSpese = 0;
  if (!isFinite(ivaSpese) || ivaSpese === 0){
    ivaSpese = money(report?.totals?.ivaDetraibile ?? 0);
  }

  if (!isFinite(ivaSpese) || ivaSpese === 0){
    try{
      const items = __getStatsSpese();
      let sum = 0;
      for (const s of items){
        // Se c'e' gia' un campo iva, usa quello
        const ivaField = money(s?.iva ?? s?.IVA ?? 0);
        if (ivaField > 0){
          sum += ivaField;
          continue;
        }

        const lordo = money(s?.importoLordo ?? s?.lordo ?? 0);
        if (!isFinite(lordo) || lordo <= 0) continue;

        const catRaw = (s?.categoria ?? s?.cat ?? "").toString().trim().toLowerCase();
        let rate = 0;
        if (catRaw.includes("iva")) {
          if (catRaw.includes("22")) rate = 22;
          else if (catRaw.includes("10")) rate = 10;
          else if (catRaw.includes("4")) rate = 4;
        } else {
          const n = parseFloat(String(s?.aliquotaIva ?? s?.aliquota_iva ?? "").replace(",", "."));
          if (!isNaN(n)) {
            if (n >= 21.5) rate = 22;
            else if (n >= 9.5 && n < 11.5) rate = 10;
            else if (n >= 3.5 && n < 5.5) rate = 4;
          }
        }

        if (rate > 0){
          const imponibile = lordo / (1 + rate/100);
          const iva = lordo - imponibile;
          if (isFinite(iva)) sum += iva;
        }
      }
      if (sum > 0) ivaSpese = sum;
    }catch(_){ }
  }

  const ivaDaVersare = (fatturato * 0.10) - (money(ivaSpese) || 0);
  const guadagno = fatturato - speseTot;

  return {
    fatturatoTotale: fatturato,
    speseTotali: speseTot,
    senzaRicevuta,
    conRicevuta,
    ivaDaVersare,
    guadagnoTotale: guadagno,
    giacenzaCassa: giacenza,
  };
}

function renderStatGen(){
  const s = computeStatGen();
  state.statGen = s;

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = euro(Number(v || 0));
  };

  set("sgFatturato", s.fatturatoTotale);
  set("sgSpese", s.speseTotali);
  set("sgNoRicevuta", s.senzaRicevuta);
  set("sgRicevuta", s.conRicevuta);
  set("sgIva", s.ivaDaVersare);
  set("sgGuadagno", s.guadagnoTotale);
  set("sgCassa", s.giacenzaCassa);
}



// ===== Statistiche: Fatturati mensili =====
function __hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2*l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));

  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hh && hh < 1){ r1 = c; g1 = x; b1 = 0; }
  else if (1 <= hh && hh < 2){ r1 = x; g1 = c; b1 = 0; }
  else if (2 <= hh && hh < 3){ r1 = 0; g1 = c; b1 = x; }
  else if (3 <= hh && hh < 4){ r1 = 0; g1 = x; b1 = c; }
  else if (4 <= hh && hh < 5){ r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const m = l - c/2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  const toHex = (n) => {
    const v = Math.max(0, Math.min(255, n|0));
    return v.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function __mensiliPalette12(){
  if (__mensiliPalette12._cache) return __mensiliPalette12._cache;
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const pick = (name, fallback) => {
    try{
      const v = (cs.getPropertyValue(name) || "").trim();
      return v || fallback;
    }catch(_){ return fallback; }
  };

  // Palette coerente con l'app (CSS variables in :root)
  const base = [
    pick("--p1", "#2B7CB4"),
    pick("--p2", "#4D9CC5"),
    pick("--p3", "#6FB7D6"),
    pick("--p4", "#96BFC7"),
    pick("--p5", "#BFBEA9"),
    pick("--p6", "#D6B286"),
    pick("--p7", "#CF9458"),
    pick("--p8", "#C9772B"),
  ];

  const out = [];
  for (let i = 0; i < 12; i++) out.push(base[i % base.length]);
  __mensiliPalette12._cache = out;
  return out;
}

// month labels are refreshed by i18n
__refreshMonthNamesCache__();

function computeStatMensili(){
  const guests = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);
  const servizi = Array.isArray(state.servizi) ? state.servizi : [];
  const byMonth = new Array(12).fill(0);

  const money = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    // Normalizza numeri tipo "1.234,56" o "1234,56"
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  // Mappa ospite_id -> mese (basato su check-in/check-out)
  const guestMonthById = {};

  for (const gg of guests){
    let iso = "";
    try{
      if (typeof __parseDateFlexibleToISO === "function"){
        iso = __parseDateFlexibleToISO(gg?.check_in ?? gg?.checkIn ?? gg?.arrivo ?? gg?.data_arrivo ?? gg?.checkin ?? "");
      }
    }catch(_){ iso = ""; }

    if (!iso){
      // fallback: prova check-out se manca check-in
      try{
        if (typeof __parseDateFlexibleToISO === "function"){
          iso = __parseDateFlexibleToISO(gg?.check_out ?? gg?.checkOut ?? gg?.partenza ?? gg?.data_partenza ?? "");
        }
      }catch(_){ iso = ""; }
    }

    if (!iso || !/^(\d{4})-(\d{2})-(\d{2})$/.test(iso)) continue;
    const mm = parseInt(iso.slice(5,7), 10);
    if (!Number.isFinite(mm) || mm < 1 || mm > 12) continue;

    const gid = guestIdOf(gg) ?? gg?.id ?? gg?.ID ?? gg?.Id ?? "";
    if (gid !== null && gid !== undefined && String(gid).trim() !== "") {
      guestMonthById[String(gid)] = mm;
    }

    // Base: importo prenotazione
    const pren = money(gg?.importo_prenotazione ?? gg?.importo_prenota ?? gg?.importoPrenotazione ?? gg?.importoPrenota ?? 0);
    if (isFinite(pren) && pren !== 0) byMonth[mm - 1] += pren;
  }

  // Aggiungi servizi al mese dell'ospite (ospite_id -> mese)
  for (const s of (servizi || [])){
    if (!s) continue;
    const del = s.isDeleted ?? s.is_deleted ?? s.deleted;
    if (String(del) === "1" || del === true) continue;

    const ospiteId = s.ospite_id ?? s.ospiteId ?? s.guest_id ?? s.guestId ?? "";
    if (ospiteId === null || ospiteId === undefined || String(ospiteId).trim() === "") continue;
    const mm = guestMonthById[String(ospiteId)];
    if (!Number.isFinite(mm) || mm < 1 || mm > 12) continue;

    const qtyRaw = money(s.qty ?? 1);
    const qty = (isFinite(qtyRaw) && qtyRaw > 0) ? qtyRaw : 1;
    const amt = money(s.importo ?? s.amount ?? 0);
    if (!isFinite(amt) || amt === 0) continue;

    byMonth[mm - 1] += (qty * amt);
  }

  // Normalizza a 2 decimali
  for (let i = 0; i < byMonth.length; i++){
    const v = byMonth[i];
    byMonth[i] = isFinite(v) ? (Math.round(v * 100) / 100) : 0;
  }

  
  // ===== Occupazione mensile (% room-nights) =====
  // 100% = (giorni del mese) * (numero stanze totali)
  // Numeratore = room-nights occupati (notti * stanze) calcolati dai soggiorni (check-in/check-out)
  const occRoomNights = new Array(12).fill(0);

  // Prova a ricavare numero stanze dalla tabella "stanze"; fallback 6 (esempio struttura)
  const __getTotalRooms = () => {
    try{
      const rows = Array.isArray(state.stanzeRows) ? state.stanzeRows : [];
      const set = new Set();
      for (const r of rows){
        const sn = r?.stanza_num ?? r?.stanzaNum ?? r?.room_number ?? r?.roomNumber ?? r?.stanza ?? r?.room ?? "";
        const n = parseInt(String(sn).trim(),10);
        if (Number.isFinite(n) && n > 0) set.add(n);
      }
      if (set.size > 0) return set.size;
    }catch(_){}
    return getConfiguredRoomsCount(6);
  };

  const totalRooms = __getTotalRooms();

  // Mappa ospite_id -> numero stanze associate (da foglio stanze); fallback a campo "stanze" nell'ospite
  const roomsCountByGuestId = {};
  try{
    const rows = Array.isArray(state.stanzeRows) ? state.stanzeRows : [];
    const map = {};
    for (const r of rows){
      const gid = String(r?.ospite_id ?? r?.ospiteId ?? r?.guest_id ?? r?.guestId ?? "").trim();
      if (!gid) continue;
      const sn = String(r?.stanza_num ?? r?.stanzaNum ?? r?.room_number ?? r?.roomNumber ?? r?.stanza ?? r?.room ?? "").trim();
      const n = parseInt(sn,10);
      if (!Number.isFinite(n) || n<=0) continue;
      if (!map[gid]) map[gid] = new Set();
      map[gid].add(n);
    }
    for (const k in map){
      roomsCountByGuestId[k] = map[k].size || 0;
    }
  }catch(_){}

  const __nightsByMonthFromStay = (checkInISO, checkOutISO, roomsCount) => {
    if (!checkInISO || !checkOutISO) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInISO) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOutISO)) return;
    const ci = new Date(checkInISO + "T00:00:00Z");
    const co = new Date(checkOutISO + "T00:00:00Z");
    if (!isFinite(ci.getTime()) || !isFinite(co.getTime())) return;
    if (co <= ci) return;

    let d = new Date(ci.getTime());
    const rooms = Math.max(1, Number(roomsCount||0) || 0);
    while (d < co){
      const m = d.getUTCMonth(); // 0..11
      if (m>=0 && m<12) occRoomNights[m] += rooms;
      d.setUTCDate(d.getUTCDate() + 1);
    }
  };

  // Somma room-nights da soggiorni
  for (const gg of guests){
    const gid = String(guestIdOf(gg) ?? gg?.id ?? gg?.ID ?? gg?.Id ?? "").trim();
    let roomsCount = 0;
    if (gid && roomsCountByGuestId[gid]) roomsCount = roomsCountByGuestId[gid];
    if (!roomsCount){
      const raw = Number(gg?.stanze ?? gg?.rooms ?? gg?.roomCount ?? 0);
      roomsCount = (isFinite(raw) && raw>0) ? Math.round(raw) : 0;
    }
    if (!roomsCount) roomsCount = 1;

    let ciISO = "";
    let coISO = "";
    try{
      ciISO = (typeof __parseDateFlexibleToISO === "function") ? __parseDateFlexibleToISO(gg?.check_in ?? gg?.checkIn ?? gg?.arrivo ?? gg?.data_arrivo ?? gg?.checkin ?? "") : "";
    }catch(_){ ciISO=""; }
    try{
      coISO = (typeof __parseDateFlexibleToISO === "function") ? __parseDateFlexibleToISO(gg?.check_out ?? gg?.checkOut ?? gg?.partenza ?? gg?.data_partenza ?? "") : "";
    }catch(_){ coISO=""; }

    if (ciISO && coISO) __nightsByMonthFromStay(ciISO, coISO, roomsCount);
  }

  // Capacita per mese: usa sempre l'anno di esercizio selezionato
  const y = Number(state.exerciseYear || loadExerciseYear() || new Date().getFullYear());
  const capacityRoomNights = new Array(12).fill(0).map((_,i)=>{
    const days = new Date(Date.UTC(y, i+1, 0)).getUTCDate(); // giorni nel mese
    return days * totalRooms;
  });

  const occPctByMonth = new Array(12).fill(0).map((_,i)=>{
    const cap = Number(capacityRoomNights[i]||0) || 0;
    const occ = Number(occRoomNights[i]||0) || 0;
    if (cap <= 0) return 0;
    return Math.max(0, Math.min(100, (occ / cap) * 100));
  });


  return { byMonth, occPctByMonth };

}



function renderStatMensili(){
  const wrap = document.getElementById("smList");
  if (!wrap) return;

  const s = computeStatMensili();
  state.statMensili = s;

  const months = s.byMonth || new Array(12).fill(0);
  const max = Math.max(0, ...months.map(v => Number(v || 0)));
  const colors = __mensiliPalette12();
  const occPcts = (s.occPctByMonth && Array.isArray(s.occPctByMonth)) ? s.occPctByMonth : new Array(12).fill(0);

  wrap.innerHTML = "";

  const fills = [];
  for (let i = 0; i < 12; i++){
    const val = Number(months[i] || 0) || 0;
    const pct = (max > 0) ? Math.max(0, Math.min(100, (val / max) * 100)) : 0;

    const row = document.createElement("div");
    row.className = "month-row";
    row.style.setProperty("--mcol", colors[i] || "#ff3b30");
    const occ = Number(occPcts[i] || 0) || 0;
    const occDisp = Math.round(Math.max(0, Math.min(100, occ)));

    row.innerHTML = `
      <div class="month-left">
        <div class="month-head">
          <div class="month-name">${escapeHtml(__MONTHS_IT[i] || ("Mese " + (i+1)))}</div>
          <div class="month-val">${euro(val)}</div>
        </div>
        <div class="month-bar">
          <div class="month-fill" style="width:0%"></div>
        </div>
      </div>
      <div class="month-occ">${occDisp}%</div>
    `;

    wrap.appendChild(row);
    const fill = row.querySelector(".month-fill");
    if (fill) fills.push({ el: fill, pct });
  }

  // animazione riempimento
  requestAnimationFrame(() => {
    for (const f of fills){
      try{ f.el.style.width = `${f.pct.toFixed(2)}%`; }catch(_){ }
    }
  });
}


// ===== Statistiche: Prenotazioni (booking compilato vs non compilato) =====
function computeStatPrenotazioni(){
  const guests = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);

  const money = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  let withBooking = 0;
  let withoutBooking = 0;

  for (const g of guests){
    const pren = money(g?.importo_prenotazione ?? g?.importo_prenota ?? g?.importoPrenotazione ?? g?.importoPrenota ?? 0);
    const rawBooking = (g?.importo_booking ?? g?.importoBooking ?? g?.booking ?? null);
    const bookingVal = money(rawBooking);
    const bookingFilled = bookingVal > 0;
    if (bookingFilled) withBooking += pren;
    else withoutBooking += pren;
  }

  return { withBooking, withoutBooking };
}

function renderStatPrenotazioni(){
  const s = computeStatPrenotazioni();
  state.statPrenotazioni = s;

  const slices = [
    { label: "Con importo booking", value: s.withBooking, color: "#2b7cb4" },
    { label: "Senza importo booking", value: s.withoutBooking, color: "#cf9458" },
  ];

  drawPie("statPrenCanvas", slices);

  const leg = document.getElementById("statPrenLegend");
  if (leg){
    const total = slices.reduce((a,x)=>a+Math.max(0,Number(x.value||0)),0);
    leg.innerHTML = "";
    slices.forEach((sl)=>{
      const v = Math.max(0, Number(sl.value || 0));
      const pct = total > 0 ? (v/total*100) : 0;
      const row = document.createElement("div");
      row.className = "legrow";
      row.innerHTML = `
        <div class="legleft">
          <div class="dot" style="background:${sl.color}"></div>
          <div class="legname">${escapeHtml(sl.label)}</div>
        </div>
        <div class="legright">${pct.toFixed(1)}% · ${euro(v)}</div>
      `;
      leg.appendChild(row);
    });
  }
}
function openStatPieModal(){
  try{
    if (!state.statGen) state.statGen = computeStatGen();
  }catch(_){ state.statGen = state.statGen || null; }

  const m = document.getElementById("statPieModal");
  if (!m) return;
  m.hidden = false;
  m.setAttribute("aria-hidden", "false");

  const s = state.statGen || computeStatGen();
  const slices = [
    { label: "Senza ricevuta", value: s.senzaRicevuta, color: "#bfbea9" },
    { label: "Con ricevuta", value: s.conRicevuta, color: "#6fb7d6" },
  ];

  drawPie("statPieCanvas", slices);

  const leg = document.getElementById("statPieLegend");
  if (leg){
    const total = slices.reduce((a,x)=>a+Math.max(0,Number(x.value||0)),0);
    leg.innerHTML = "";
    slices.forEach((sl)=>{
      const v = Math.max(0, Number(sl.value || 0));
      const pct = total > 0 ? (v/total*100) : 0;
      const row = document.createElement("div");
      row.className = "legrow";
      row.innerHTML = `
        <div class="legleft">
          <div class="dot" style="background:${sl.color}"></div>
          <div class="legname">${escapeHtml(sl.label)}</div>
        </div>
        <div class="legright">${pct.toFixed(1)}% · ${euro(v)}</div>
      `;
      leg.appendChild(row);
    });
  }
}

function closeStatPieModal(){
  const m = document.getElementById("statPieModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden", "true");
}



function openStatMensiliPieModal(){
  try{
    if (!state.statMensili) state.statMensili = computeStatMensili();
  }catch(_){ state.statMensili = state.statMensili || null; }

  const m = document.getElementById("statMensiliPieModal");
  if (!m) return;
  m.hidden = false;
  m.setAttribute("aria-hidden", "false");

  const s = state.statMensili || computeStatMensili();
  const months = (s.byMonth && Array.isArray(s.byMonth)) ? s.byMonth : new Array(12).fill(0);
  const colors = __mensiliPalette12();
  const slices = months.map((v,i)=>({
    label: __MONTHS_IT[i] || ("Mese " + (i+1)),
    value: Number(v || 0) || 0,
    color: colors[i] || "#2b7cb4"
  }));

  drawPie("statMensiliPieCanvas", slices);

  const occPcts = (s.occPctByMonth && Array.isArray(s.occPctByMonth)) ? s.occPctByMonth : new Array(12).fill(0);
  drawMonthlyPctBars("statMensiliOccCanvas", occPcts, colors, { labels: (__MONTHS_IT || []).map(m=>String(m||"").slice(0,1)) });

  const leg = document.getElementById("statMensiliPieLegend");
  if (leg){
    leg.innerHTML = "";
    leg.style.display = "none";
    leg.setAttribute("aria-hidden", "true");
  }
}

function closeStatMensiliPieModal(){
  const m = document.getElementById("statMensiliPieModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden", "true");
}


/* =========================
 * Statistiche: Azienda / Amministratore (tassazione stimata)
 * Regole:
 * - Fatturato netto IVA: somma incassi CON ricevuta (acconto+saldo), al netto del 10% IVA
 * - Spese operative: esclude categorie "contanti" (e "tassa soggiorno"), al netto dell'IVA
 * - IRAP: percentuale editabile (stima)
 * ========================= */

const LS_ADMIN_COMPENSO = "ddae_admin_compenso";
const LS_ADMIN_TFM = "ddae_admin_tfm";
const LS_IRAP_PCT = "ddae_irap_pct";

function _num(v){
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
function _lsGetNum(key, fallback){
  try{
    const v = localStorage.getItem(key);
    if (v === null || v === undefined || v === "") return fallback;
    const n = _num(v);
    return isFinite(n) ? n : fallback;
  }catch(_){ return fallback; }
}
function _lsSetNum(key, value){
  try{ localStorage.setItem(key, String(value)); }catch(_){}
}

function _isRicevutaFlag(g, kind){
  try{
    if (kind === "acconto"){
      const b = truthy(g?.acconto_ricevuta ?? g?.accontoRicevuta ?? g?.ricevuta_acconto ?? g?.ricevutaAcconto ?? g?.acconto_ricevutain);
      if (b) return true;
      const t = (g?.acconto_tipo ?? g?.accontoTipo ?? "").toString().toLowerCase();
      if (t.includes("ricev")) return true;
      if (t.includes("contant")) return false;
    } else {
      const b = truthy(g?.saldo_ricevuta ?? g?.saldoRicevuta ?? g?.ricevuta_saldo ?? g?.ricevutaSaldo ?? g?.saldo_ricevutain);
      if (b) return true;
      const t = (g?.saldo_tipo ?? g?.saldoTipo ?? "").toString().toLowerCase();
      if (t.includes("ricev")) return true;
      if (t.includes("contant")) return false;
    }
  }catch(_){}
  return false;
}



/* RICEVUTE MANCANTI (HOME) */
function _isElectronicTypeStr_(s){
  const t = String(s ?? "").toLowerCase();
  return t.includes("elet");
}

function computePendingReceipts(guests){
  const now = Date.now();
  const out = [];
  const src = Array.isArray(guests) ? guests : [];
  for (const g of src){
    const checkout = parseDateTs(g?.check_out ?? g?.checkOut ?? g?.checkout ?? g?.data_check_out ?? "");
    if (!checkout) continue;
    if (now < (checkout + 24*60*60*1000)) continue;

    const dep = _num(g?.acconto_importo ?? g?.accontoImporto ?? 0);
    const depType = (g?.acconto_tipo ?? g?.accontoTipo ?? "");
    const depRec = truthy(g?.acconto_ricevuta ?? g?.accontoRicevuta ?? g?.ricevuta_acconto ?? g?.ricevutaAcconto ?? false);

    const saldo = _num(g?.saldo_pagato ?? g?.saldoPagato ?? g?.saldo ?? 0);
    const saldoType = (g?.saldo_tipo ?? g?.saldoTipo ?? "");
    const saldoRec = truthy(g?.saldo_ricevuta ?? g?.saldoRicevuta ?? g?.ricevuta_saldo ?? g?.ricevutaSaldo ?? false);

    const missing = [];
    if (dep > 0 && _isElectronicTypeStr_(depType) && !depRec) missing.push("Acconto");
    if (saldo > 0 && _isElectronicTypeStr_(saldoType) && !saldoRec) missing.push("Saldo");

    if (!missing.length) continue;

    const rawName = g?.nome ?? g?.name ?? "";
    const name = collapseSpaces(String(rawName || "").trim()) || "Prenotazione";
    out.push({
      id: guestIdOf(g),
      name,
      missing,
      checkout,
      guest: g
    });
  }

  out.sort((a,b)=> (b.checkout||0) - (a.checkout||0));
  return out;
}

function updateHomeReceiptsIndicator(){
  try{
    const btn = document.getElementById("homeReceiptsTop");
    const dot = document.getElementById("homeReceiptsDot");
    if (!btn) return;

    const isHome = (state.page === "home");
    const isOp = !!(state.session && isOperatoreSession(state.session));
    const has = (state.pendingReceiptsCount || 0) > 0;

    // visibile SOLO in HOME e solo admin
    btn.hidden = (!isHome) || isOp;

    btn.classList.toggle("is-alert", has);
    if (dot) dot.hidden = !has;

    // accessibilità
    if (has){
      btn.setAttribute("aria-label", `Ricevute mancanti (${state.pendingReceiptsCount})`);
    }else{
      btn.setAttribute("aria-label", "Ricevute");
    }
  }catch(_){}
}

function openReceiptDueModal(){
  const modal = document.getElementById("receiptDueModal");
  const list = document.getElementById("receiptDueList");
  const title = document.getElementById("receiptDueTitle");
  if (!modal || !list) return;

  const items = Array.isArray(state.pendingReceipts) ? state.pendingReceipts : [];
  const n = items.length;

  if (title){
    title.textContent = n ? `Ricevute mancanti (${n})` : "Ricevute mancanti";
  }

  list.innerHTML = "";
  if (!n){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "8px 2px";
    empty.textContent = "Nessuna ricevuta da emettere.";
    list.appendChild(empty);
  } else {
    for (const it of items){
      const row = document.createElement("button");
      row.type = "button";
      row.className = "receipt-row";
      const miss = (it.missing || []).join(", ");
      row.innerHTML = `<div>
          <div class="rr-name">${escapeHtml(it.name)}</div>
          <div class="rr-meta">${escapeHtml(miss)}</div>
        </div>
        <div class="rr-meta">apri</div>`;
      bindFastTap(row, () => {
        try{ closeReceiptDueModal(); }catch(_){}
        try{
          if (it.guest){
            enterGuestViewMode(it.guest);
            showPage("ospite");
            return;
          }
          // fallback: cerca tra ospiti già in memoria
          const id = String(it.id || "").trim();
          const g = (Array.isArray(state.pendingReceiptsGuests) ? state.pendingReceiptsGuests : [])
            .find(x => guestIdOf(x) === id);
          if (g){
            enterGuestViewMode(g);
            showPage("ospite");
          }
        }catch(e){
          console.error(e);
        }
      });
      list.appendChild(row);
    }
  }

  modal.hidden = false;
  modal.setAttribute("aria-hidden","false");
  updateHomeReceiptsIndicator();
}

function closeReceiptDueModal(){
  const modal = document.getElementById("receiptDueModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden","true");
}

async function checkReceiptsOnStartup(){
  try{
    if (!(state.session && state.session.user_id)) { state.pendingReceipts = []; state.pendingReceiptsCount = 0; updateHomeReceiptsIndicator(); return; }
    if (state.session && isOperatoreSession(state.session)) { state.pendingReceipts = []; state.pendingReceiptsCount = 0; updateHomeReceiptsIndicator(); return; }

    // dati ospiti (no popup, no loader)
    let rows = [];
    try{
      const data = await cachedGet("ospiti", {}, { showLoader:false, ttlMs: 0, force:true });
      rows = Array.isArray(data) ? data : [];
    }catch(_){ rows = []; }

    state.pendingReceiptsGuests = rows;
    state.pendingReceipts = computePendingReceipts(rows);
    state.pendingReceiptsCount = state.pendingReceipts.length;

    updateHomeReceiptsIndicator();
  }catch(e){
    console.error(e);
    try{ updateHomeReceiptsIndicator(); }catch(_){}
  }
}

function computeAziendaBilancio(){
  const guests = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);
  const spese = Array.isArray(state.spese) ? state.spese : [];

  // Incassi con/senza ricevuta: acconto + saldo
  let incassiCon = 0;
  let incassiSenza = 0;

  for (const g of guests){
    const dep = _num(g?.acconto_importo ?? g?.accontoImporto ?? 0);
    const saldo = _num(g?.saldo_pagato ?? g?.saldoPagato ?? g?.saldo ?? 0);

    if (dep > 0){
      if (_isRicevutaFlag(g, "acconto")) incassiCon += dep;
      else incassiSenza += dep;
    }
    if (saldo > 0){
      if (_isRicevutaFlag(g, "saldo")) incassiCon += saldo;
      else incassiSenza += saldo;
    }
  }

  // Fatturato netto IVA (assumiamo IVA 10%)
  const fatturatoNettoIva = incassiCon / 1.10;

  // Spese operative nette IVA: escludi contanti e tassa soggiorno; togli IVA
  let speseNetteIva = 0;

  for (const s of spese){
    const lordo = _num(s?.importoLordo ?? s?.lordo ?? 0);
    if (!isFinite(lordo) || lordo <= 0) continue;

    const cat = (s?.categoria ?? s?.cat ?? "").toString().trim().toLowerCase();
    if (cat.includes("contant")) continue;
    if (cat.includes("tassa") && cat.includes("sogg")) continue;

    let rate = 0;
    if (cat.includes("iva")){
      if (cat.includes("22")) rate = 22;
      else if (cat.includes("10")) rate = 10;
      else if (cat.includes("4")) rate = 4;
    } else {
      const n = parseFloat(String(s?.aliquotaIva ?? s?.aliquota_iva ?? s?.aliquota ?? "").replace(",", "."));
      if (!isNaN(n)) {
        if (n >= 21.5) rate = 22;
        else if (n >= 9.5 && n < 11.5) rate = 10;
        else if (n >= 3.5 && n < 5.5) rate = 4;
      }
    }

    const imponibile = rate > 0 ? (lordo / (1 + rate/100)) : lordo;
    if (isFinite(imponibile)) speseNetteIva += imponibile;
  }

  const compenso = _lsGetNum(LS_ADMIN_COMPENSO, 25000);
  const tfm = _lsGetNum(LS_ADMIN_TFM, 15000);
  const irapPct = _lsGetNum(LS_IRAP_PCT, 3.9);

  const inps = compenso * 0.16;

  const ebt = fatturatoNettoIva - speseNetteIva - compenso - inps - tfm;
  const ires = Math.max(0, ebt * 0.24);
  const irap = Math.max(0, ebt * (irapPct/100));
  const utileNetto = ebt - ires - irap;

  return {
    incassiConRicevuta: incassiCon,
    incassiSenzaRicevuta: incassiSenza,
    fatturatoNettoIva,
    speseOperativeNetteIva: speseNetteIva,
    compensoAmministratore: compenso,
    tfmAccantonamento: tfm,
    inpsQuotaAzienda: inps,
    ebt,
    ires,
    irapPct,
    irap,
    utileNetto,
  };
}

function _euroSigned(n){
  const v = Number(n || 0);
  if (!isFinite(v) || v === 0) return euro(0);
  if (v < 0) return "− " + euro(Math.abs(v));
  return "+ " + euro(v);
}


function renderStatCancellazioni(){
  const root = document.getElementById("page-statcancellazioni");
  if (!root) return;

  const delRows = Array.isArray(state.deletedGuests) ? state.deletedGuests : [];
  const cancRows = delRows.filter(r => String(r.delete_reason || "").toLowerCase() === "cancellazione" || String(r.delete_reason || "").trim() === "");
  const cancN = cancRows.length;

  const activeRows = Array.isArray(state.statsGuests) ? state.statsGuests : (Array.isArray(state.guests) ? state.guests : []);
  const activeN = activeRows.length;

  const total = activeN + cancN;
  const pctCanc = total > 0 ? (cancN / total * 100) : 0;

  const elTot = document.getElementById("cancTot");
  const elCanc = document.getElementById("cancN");
  const elPct = document.getElementById("cancPct");
  if (elTot) elTot.textContent = String(total);
  if (elCanc) elCanc.textContent = String(cancN);
  if (elPct) elPct.textContent = pctCanc.toFixed(1) + "%";

  const slices = [
    { label: "Attive", value: activeN, color: "#2b7cb4" },
    { label: "Cancellate", value: cancN, color: "#ff3b30" },
  ];

  drawPie("statCancCanvas", slices, { centerTitle: "Totale", centerFormatter: (n)=> String(Math.round(Number(n||0))) });

  const leg = document.getElementById("statCancLegend");
  if (leg){
    const t = slices.reduce((a,x)=>a+Math.max(0,Number(x.value||0)),0);
    leg.innerHTML = "";
    slices.forEach((sl)=>{
      const v = Math.max(0, Number(sl.value || 0));
      const pct = t > 0 ? (v/t*100) : 0;
      const row = document.createElement("div");
      row.className = "legrow";
      row.innerHTML = `
        <div class="legleft">
          <div class="dot" style="background:${sl.color}"></div>
          <div class="legname">${escapeHtml(sl.label)}</div>
        </div>
        <div class="legright">${pct.toFixed(1)}% · ${String(Math.round(v))}</div>
      `;
      leg.appendChild(row);
    });
  }
}


function renderStatAzienda(){
  const rowsWrap = document.getElementById("aziendaRows");
  if (!rowsWrap) return;

  const s = computeAziendaBilancio();
  state.statAzienda = s;

  const totalTasse = (
    Number(s.ires || 0) +
    Number(s.irap || 0) +
    Number(s.inpsQuotaAzienda || 0)
  );

  const rows = [
    { k: "FATTURATO NETTO IVA", v: +s.fatturatoNettoIva, cls: "c-blue" },
    { k: "Spese Operative nette IVA", v: -s.speseOperativeNetteIva, cls: "c-bordeaux" },
    { k: "Compenso Amministratore (Lordo)", v: -s.compensoAmministratore },
    { k: "INPS (Quota Azienda 2/3)", v: -s.inpsQuotaAzienda },
    { k: "Accantonamento TFM", v: -s.tfmAccantonamento },
    { k: "UTILE ANTE TASSE (EBT)", v: +s.ebt },
    { k: "IRES (24%)", v: -s.ires },
    { k: `IRAP (${Number(s.irapPct || 0).toFixed(1)}%)`, v: -s.irap },
    { k: "TOTALE TASSE", v: -totalTasse, cls: "c-red" },
    { k: "UTILE NETTO SRL", v: +s.utileNetto, cls: "c-green" },
  ];

  rowsWrap.innerHTML = rows.map(r => {
    const extra = r.cls ? (" " + r.cls) : "";
    return `<div class="fin-row${extra}">
      <div class="fin-label">${escapeHtml(r.k)}</div>
      <div class="fin-val">${_euroSigned(r.v)}</div>
    </div>`;
  }).join("");
}



function openAdminInputsModal(){
  const m = document.getElementById("adminInputsModal");
  if (!m) return;
  try{ renderStatAmministratore(); }catch(_){}
  m.hidden = false;
  m.setAttribute("aria-hidden","false");
  setTimeout(()=>{ try{ const c = document.getElementById("adminCompensoInput"); if (c) c.focus(); }catch(_){ } }, 50);
}
function closeAdminInputsModal(){
  const m = document.getElementById("adminInputsModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden","true");
}

function _buildLegend_(el, slices){
  if (!el) return;
  const total = slices.reduce((a,x)=>a+Math.max(0,Number(x.value||0)),0);
  el.innerHTML = "";
  slices.forEach((sl)=>{
    const v = Math.max(0, Number(sl.value || 0));
    const pct = total > 0 ? (v/total*100) : 0;
    const row = document.createElement("div");
    row.className = "legrow";
    row.innerHTML = `
      <div class="legleft">
        <div class="dot" style="background:${sl.color}"></div>
        <div class="legname">${escapeHtml(sl.label)}</div>
      </div>
      <div class="legval">${_euroNoSign(v)}</div>
      <div class="legpct">${pct.toFixed(1)}%</div>
    `;
    el.appendChild(row);
  });
}

async function openAdminChartModal(){
  const m = document.getElementById("adminChartModal");
  if (!m) return;

  try{ await ensurePeriodData({ showLoader:true, force:false }); }catch(_){}

  // Usa i dati di bilancio azienda (IRES / IRAP / INPS quota azienda / totale tasse)
  let s = null;
  try{ s = computeAziendaBilancio(); }catch(_){ s = null; }
  if (!s) s = { ires:0, irap:0, inpsQuotaAzienda:0 };

  const slices = [
    { label: "IRES", value: Math.max(0, Number(s.ires||0)), color: "#2b7cb4" },
    { label: "IRAP", value: Math.max(0, Number(s.irap||0)), color: "#c9772b" },
    { label: "INPS (Quota Azienda)", value: Math.max(0, Number(s.inpsQuotaAzienda||0)), color: "#7a3d9b" },
  ];

  drawPie("adminPieCanvas", slices);
  try{ _buildLegend_(document.getElementById("adminPieLegend"), slices); }catch(_){}

  m.hidden = false;
  m.setAttribute("aria-hidden","false");
}

function closeAdminChartModal(){
  const m = document.getElementById("adminChartModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden","true");
}

function renderStatAmministratore(){
  const compenso = _lsGetNum(LS_ADMIN_COMPENSO, 25000);
  const tfm = _lsGetNum(LS_ADMIN_TFM, 15000);

  // Se presenti, aggiorna gli input nel popup (dati amministratore)
  const cIn = document.getElementById("adminCompensoInput");
  const tIn = document.getElementById("adminTfmInput");
  if (cIn) cIn.value = String(compenso).replace(".", ",");
  if (tIn) tIn.value = String(tfm).replace(".", ",");

  // Se presente, renderizza la tabella nella pagina "Amministratore"
  const rowsWrap = document.getElementById("amministratoreRows");
  if (!rowsWrap) return;

  const inpsPct = 0.08; // quota tua (1/3) ~ 8% (default)
  const irpefPct = _lsGetNum("dDAE_IRPEF_PCT", 15) / 100; // % salvabile, default 15%

  const inpsQuotaTua = Math.round((compenso * inpsPct) * 100) / 100;
  const imponibileIrpef = Math.round((compenso - inpsQuotaTua) * 100) / 100;
  const irpefNetta = Math.round((imponibileIrpef * irpefPct) * 100) / 100;

  const totaleTasse = Math.round((inpsQuotaTua + irpefNetta) * 100) / 100;
  const nettoInTasca = Math.round((compenso - totaleTasse) * 100) / 100;

  const rows = [
    { k: "COMPENSO LORDO", v: +compenso, cls: "c-blue" },
    { k: "INPS (Quota tua 1/3)", v: -inpsQuotaTua },
    { k: "Imponibile IRPEF", v: +imponibileIrpef },
    // IRPEF Netta richiesta in nero (nessuna classe colore)
    { k: "IRPEF Netta", v: -irpefNetta },
    { k: "TOTALE TASSE", v: -totaleTasse, cls: "c-red" },
    { k: "NETTO IN TASCA", v: +nettoInTasca, cls: "c-green" },
    { k: "ACCANTONAMENTO TFM", v: +tfm },
  ];

  rowsWrap.innerHTML = rows.map(r => {
    const extra = r.cls ? (" " + r.cls) : "";
    return `<div class="fin-row${extra}">
      <div class="fin-label">${escapeHtml(r.k)}</div>
      <div class="fin-val">${_euroSigned(r.v)}</div>
    </div>`;
  }).join("");
}

function saveStatAmministratore(){
  const cIn = document.getElementById("adminCompensoInput");
  const tIn = document.getElementById("adminTfmInput");
  if (!cIn || !tIn) return;

  const compenso = _num(cIn.value);
  const tfm = _num(tIn.value);

  _lsSetNum(LS_ADMIN_COMPENSO, compenso);
  _lsSetNum(LS_ADMIN_TFM, tfm);

  toast("Salvato");
  try{ if (state.page === "statazienda") renderStatAzienda(); }catch(_){ }
  try{ if (state.page === "statamministratore") renderStatAmministratore(); }catch(_){ }
}

/* IRAP modal */
function openIrapModal(){
  const m = document.getElementById("irapModal");
  const input = document.getElementById("irapPctInput");
  if (!m || !input) return;
  const v = _lsGetNum(LS_IRAP_PCT, 3.9);
  input.value = String(v).replace(".", ",");
  m.hidden = false;
  m.setAttribute("aria-hidden","false");
  setTimeout(()=>{ try{ input.focus(); input.select(); }catch(_){ } }, 0);
}
function closeIrapModal(){
  const m = document.getElementById("irapModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden","true");
}
function saveIrapModal(){
  const input = document.getElementById("irapPctInput");
  if (!input) return;
  const v = _num(input.value);
  _lsSetNum(LS_IRAP_PCT, v);
  closeIrapModal();
  toast("IRAP salvata");
  try{ if (state.page === "statazienda") renderStatAzienda(); }catch(_){ }
  try{ if (state.page === "statamministratore") renderStatAmministratore(); }catch(_){ }
}

function computeStatSpese(){
  const items = __getStatsSpese();
  const acc = { CONTANTI:0, TASSA_SOGGIORNO:0, IVA_22:0, IVA_10:0, IVA_4:0 };

  const money = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  for (const s of items){
    const lordo = money(s?.importoLordo ?? s?.lordo ?? 0);
    if (!isFinite(lordo) || lordo === 0) continue;

    const catRaw = (s?.categoria ?? s?.cat ?? "").toString().trim().toLowerCase();

    if (catRaw.includes("contant")) { acc.CONTANTI += lordo; continue; }
    if (catRaw.includes("tassa") && catRaw.includes("sogg")) { acc.TASSA_SOGGIORNO += lordo; continue; }

    if (catRaw.includes("iva")){
      if (catRaw.includes("22")) { acc.IVA_22 += lordo; continue; }
      if (catRaw.includes("10")) { acc.IVA_10 += lordo; continue; }
      if (catRaw.includes("4")) { acc.IVA_4 += lordo; continue; }
    }

    // fallback su aliquota numerica
    const n = parseFloat(String(s?.aliquotaIva ?? s?.aliquota_iva ?? "").replace(",","."));
    if (!isNaN(n)){
      if (n >= 21.5) acc.IVA_22 += lordo;
      else if (n >= 9.5 && n < 11.5) acc.IVA_10 += lordo;
      else if (n >= 3.5 && n < 5.5) acc.IVA_4 += lordo;
    }
  }

  return {
    totale: (acc.CONTANTI + acc.TASSA_SOGGIORNO + acc.IVA_22 + acc.IVA_10 + acc.IVA_4),
    contanti: acc.CONTANTI,
    tassaSoggiorno: acc.TASSA_SOGGIORNO,
    iva22: acc.IVA_22,
    iva10: acc.IVA_10,
    iva4: acc.IVA_4,
  };
}// ===== Report locale (per-account): calcolato dalla lista spese corrente =====
function buildReportFromSpese(items){
  const list = Array.isArray(items) ? items : [];
  const money = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  };

  const normCat = (row) => {
    const catRaw = (row?.categoria ?? row?.cat ?? "").toString().trim().toLowerCase();
    const aliqRaw = (row?.aliquotaIva ?? row?.aliquota_iva ?? "").toString().trim();

    if (catRaw.includes("contant")) return "CONTANTI";
    if (catRaw.includes("tassa") && catRaw.includes("sogg")) return "TASSA_SOGGIORNO";

    if (catRaw.includes("iva")){
      if (catRaw.includes("22")) return "IVA_22";
      if (catRaw.includes("10")) return "IVA_10";
      if (catRaw.includes("4")) return "IVA_4";
    }

    const n = parseFloat(aliqRaw.replace(",", "."));
    if (!isNaN(n)){
      if (n >= 21.5) return "IVA_22";
      if (n >= 9.5 && n < 11.5) return "IVA_10";
      if (n >= 3.5 && n < 5.5) return "IVA_4";
    }
    return null;
  };

  const totals = { importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 };
  const byCategoria = {
    CONTANTI:{ importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 },
    TASSA_SOGGIORNO:{ importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 },
    IVA_22:{ importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 },
    IVA_10:{ importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 },
    IVA_4:{ importoLordo:0, imponibile:0, iva:0, ivaDetraibile:0 },
  };

  for (const row of list){
    const lordo = money(row?.importoLordo ?? row?.lordo ?? row?.importo ?? 0);
    let imponibile = money(row?.imponibile ?? 0);
    let iva = money(row?.iva ?? 0);
    let ivaDet = money(row?.ivaDetraibile ?? row?.iva_detraibile ?? 0);

    // Se mancano imponibile/iva ma ho aliquota e lordo, ricava
    if ((imponibile === 0 && iva === 0) && lordo > 0){
      const aliqRaw = (row?.aliquotaIva ?? row?.aliquota_iva ?? "").toString().trim();
      const rate = parseFloat(aliqRaw.replace(",", "."));
      if (!isNaN(rate) && rate > 0){
        const imp = lordo / (1 + rate/100);
        const iv = lordo - imp;
        if (isFinite(imp)) imponibile = imp;
        if (isFinite(iv)) iva = iv;
      }
    }

    // Se non c'e' ivaDetraibile, usa iva come fallback (mantiene KPI coerenti)
    if (!ivaDet && iva) ivaDet = iva;

    totals.importoLordo += lordo;
    totals.imponibile += imponibile;
    totals.iva += iva;
    totals.ivaDetraibile += ivaDet;

    const k = normCat(row);
    if (k && byCategoria[k]){
      byCategoria[k].importoLordo += lordo;
      byCategoria[k].imponibile += imponibile;
      byCategoria[k].iva += iva;
      byCategoria[k].ivaDetraibile += ivaDet;
    }
  }

  return { totals, byCategoria, source: "local_spese" };
}


function renderStatSpese(){
  const s = computeStatSpese();
  state.statSpese = s;

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = euro(Number(v || 0));
  };

  set("ssTotaleSpese", s.totale);

  set("ssContanti", s.contanti);
  set("ssTassa", s.tassaSoggiorno);
  set("ssIva22", s.iva22);
  set("ssIva10", s.iva10);
  set("ssIva4", s.iva4);

  // Dettaglio elenco spese (visibile in Statistiche → Spese)
  const list = document.getElementById("statSpeseList");
  if (list){
    list.innerHTML = "";
    let items = Array.isArray(state.speseAll) ? [...state.speseAll] : [];

    const toTime = (v) => {
      if (!v) return null;
      const s = String(v);
      const iso = s.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)){
        const t = Date.parse(iso + "T00:00:00Z");
        return isNaN(t) ? null : t;
      }
      const t = Date.parse(s);
      return isNaN(t) ? null : t;
    };

    items.sort((a,b) => {
      const da = toTime(a.dataSpesa || a.data || a.data_spesa);
      const db = toTime(b.dataSpesa || b.data || b.data_spesa);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db - da;
    });

    if (!items.length){
      list.innerHTML = '<div style="font-size:13px; opacity:.75; padding:8px 2px;">Nessuna spesa nel periodo.</div>';
    } else {
      items.forEach((sp) => {
        const el = document.createElement("div");
        el.className = "item spesa-bg";
        const cls = spesaCategoryClass(sp);
        if (cls) el.classList.add(cls);

        const importo = Number(sp.importoLordo || 0);
        const data = formatShortDateIT(sp.dataSpesa || sp.data || sp.data_spesa || "");
        const motivoTxt = (sp.motivazione || sp.motivo || "").toString();
        const motivo = escapeHtml(motivoTxt);

        el.innerHTML = `
          <div class="item-top" style="align-items:center;">
            <div class="spesa-line" title="${motivo}">
              <span class="spesa-imp">${euro(importo)}</span>
              <span class="spesa-sep">·</span>
              <span class="spesa-date">${data}</span>
              <span class="spesa-sep">·</span>
              <span class="spesa-motivo">${motivo}</span>
            </div>
          </div>
        `;
        list.appendChild(el);
      });
    }
  }
}

function openStatSpesePieModal(){
  try{
    if (!state.statSpese) state.statSpese = computeStatSpese();
  }catch(_){ state.statSpese = state.statSpese || null; }

  const m = document.getElementById("statSpesePieModal");
  if (!m) return;
  m.hidden = false;
  m.setAttribute("aria-hidden", "false");

  const s = state.statSpese || computeStatSpese();
  const slices = [
    { key:"CONTANTI", label: categoriaLabel("CONTANTI"), value:s.contanti, color:(COLORS.CONTANTI || "#2b7cb4") },
    { key:"TASSA_SOGGIORNO", label: categoriaLabel("TASSA_SOGGIORNO"), value:s.tassaSoggiorno, color:(COLORS.TASSA_SOGGIORNO || "#d8bd97") },
    { key:"IVA_22", label: categoriaLabel("IVA_22"), value:s.iva22, color:(COLORS.IVA_22 || "#c9772b") },
    { key:"IVA_10", label: categoriaLabel("IVA_10"), value:s.iva10, color:(COLORS.IVA_10 || "#7ac0db") },
    { key:"IVA_4", label: categoriaLabel("IVA_4"), value:s.iva4, color:(COLORS.IVA_4 || "#1f2937") },
  ];

  drawPie("statSpesePieCanvas", slices);

  const leg = document.getElementById("statSpesePieLegend");
  if (leg){
    const total = slices.reduce((a,x)=>a+Math.max(0,Number(x.value||0)),0);
    leg.innerHTML = "";
    slices.forEach((sl)=>{
      const v = Math.max(0, Number(sl.value || 0));
      const pct = total > 0 ? (v/total*100) : 0;
      const row = document.createElement("div");
      row.className = "legrow";
      row.innerHTML = `
        <div class="legleft">
          <div class="dot" style="background:${sl.color}"></div>
          <div class="legname">${escapeHtml(sl.label)}</div>
        </div>
        <div class="legright">${pct.toFixed(1)}% · ${euro(v)}</div>
      `;
      leg.appendChild(row);
    });
  }
}

function closeStatSpesePieModal(){
  const m = document.getElementById("statSpesePieModal");
  if (!m) return;
  m.hidden = true;
  m.setAttribute("aria-hidden", "true");
}

/* Wire buttons */


function bindPeriodAuto(fromSel, toSel){
  const fromEl = document.querySelector(fromSel);
  const toEl = document.querySelector(toSel);
  if (!fromEl || !toEl) return;

  let timer = null;

  const schedule = () => {
    if (periodSyncLock > 0) return; // update programmatici: ignora
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (periodSyncLock > 0) return;
      const from = fromEl.value;
      const to = toEl.value;

      if (!from || !to) return;
      if (from > to) {
        toast("Periodo non valido");
        return;
      }

      setPresetValue("custom");
      setPeriod(from, to);

      try { await onPeriodChanged({ showLoader:false }); } catch (e) { toast(e.message); }
    }, 220);
  };

  fromEl.addEventListener("change", schedule);
  toEl.addEventListener("change", schedule);
}

function bindPeriodAutoGuests(fromSel, toSel){
  const fromEl = document.querySelector(fromSel);
  const toEl = document.querySelector(toSel);
  if (!fromEl || !toEl) return;

  let timer = null;

  const schedule = () => {
    if (periodSyncLock > 0) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (periodSyncLock > 0) return;
      const from = fromEl.value;
      const to = toEl.value;
      if (!from || !to) return;

      // valida
      if (from > to){
        toast("Periodo non valido");
        return;
      }

      setPresetValue("custom");
      setPeriod(from, to);

      try { await loadOspiti({ from, to }); } catch (e) { toast(e.message); }
    }, 220);
  };

  fromEl.addEventListener("change", schedule);
  toEl.addEventListener("change", schedule);
}






function updateGuestRemaining(){
  const out = document.getElementById("guestRemaining");
  if (!out) return;

  const totalEl = document.getElementById("guestTotal");
  const servicesEl = document.getElementById("guestServices");
  const depEl = document.getElementById("guestDeposit");
  const saldoEl = document.getElementById("guestSaldo");

  const totalStr = (totalEl?.value ?? "");
  const servicesStr = (servicesEl?.value ?? "");
  const depStr = (depEl?.value ?? "");
  const saldoStr = (saldoEl?.value ?? "");

  const anyFilled = [totalStr, servicesStr, depStr, saldoStr].some(s => String(s).trim().length > 0);
  if (!anyFilled) {
    out.value = "";
    try { refreshFloatingLabels(); } catch (_) {}
    return;
  }

  const total = parseFloat(totalStr || "0") || 0;
  const services = parseFloat(servicesStr || "0") || 0;
  const deposit = parseFloat(depStr || "0") || 0;
  const saldo = parseFloat(saldoStr || "0") || 0;
  const remaining = (total + services) - deposit - saldo;

  out.value = (isFinite(remaining) ? remaining.toFixed(2) : "");
  try { refreshFloatingLabels(); } catch (_) {}
}

function recalcGuestCommission(){
  const totalEl = document.getElementById("guestTotal");
  const pctEl = document.getElementById("guestChannelCommission");
  const outEl = document.getElementById("guestBooking");
  if (!outEl) return;
  const totalRaw = String(totalEl?.value ?? "").trim();
  const pctRaw = String(pctEl?.value ?? "").trim();
  if (!totalRaw && !pctRaw){
    outEl.value = "";
    try { refreshFloatingLabels(); } catch (_) {}
    return;
  }
  const total = parseFloat(totalRaw || "0") || 0;
  const pct = parseFloat(pctRaw || "0") || 0;
  const commission = Math.round((total * pct) * 100) / 10000;
  outEl.value = (isFinite(commission) ? commission.toFixed(2) : "");
  try { refreshFloatingLabels(); } catch (_) {}
}

function updateGuestPriceVisibility(){
  try{
    const hide = (String(state.guestMode || '').toLowerCase() === 'create' && !!state.guestCreateFromGroup);

    // Campi prezzi: nascondi l'intera riga/campo
    ['guestTotal','guestBooking','guestDeposit','guestSaldo'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const field = el.closest('.field');
      if (field) field.hidden = hide;
    });

    // Rimanenza: in create-from-group nascondi l'intera riga (niente pillole registrazioni)
    const rem = document.getElementById('guestRemaining');
    if (rem){
      const row = rem.closest('.field.two-col.payment-row');
      if (row) row.hidden = hide;
      else {
        const sub = rem.closest('.subfield');
        if (sub) sub.hidden = hide;
      }
    }

    // Multi prenotazioni: quando si crea un nuovo gruppo dentro una prenotazione esistente,
    // non mostrare le pillole (Acconto/Saldo/Registrazioni).
    ['depositType','saldoType','regTags'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const row = el.closest('.field.two-col.payment-row');
      if (row) row.hidden = hide;
    });
  }catch(_){ }
}


function enterGuestCreateMode(){
  setGuestFormViewOnly(false);

  state.guestViewItem = null;

  // Multi prenotazioni: quando si crea da un gruppo esistente, possiamo nascondere i prezzi
  state.guestCreateFromGroup = false;

  // Multi prenotazioni: reset contesto
  state.guestGroupBookings = null;
  state.guestGroupActiveId = null;
  state.guestGroupKey = null;
  try{ clearGuestMulti(); }catch(_){ }

  state.guestMode = "create";
  try{ updateGuestFormModeClass(); }catch(_){ }
  state.guestEditId = null;
  state.guestEditCreatedAt = null;

  try{ ensureRoomsPickerButtons(); }catch(_){ }
  const title = document.getElementById("ospiteFormTitle");
  if (title) title.textContent = "Nuovo ospite";
  const btn = document.getElementById("createGuestCard");
  if (btn) btn.textContent = "Crea ospite";
  // dDAE: in modal 'Nuovo ospite' la tassa di soggiorno non deve comparire
  try{
    const taxPill = document.getElementById('guestTaxTotal');
    const taxVal = document.getElementById('guestTaxTotalVal');
    if (taxVal) taxVal.textContent = '€0,00';
    if (taxPill) taxPill.hidden = true;
  }catch(_){ }


  // reset fields
  const fields = ["guestName","guestPhone","guestEmail","guestAdults","guestKidsU10","guestCheckOut","guestTotal","guestChannel","guestChannelCommission","guestBooking","guestServices","guestDeposit","guestSaldo","guestRemaining","guestNotes"];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  // reset servizi state
  try{ state.guestServicesItems = []; state.guestServicesComputedTotal = 0; state.guestServicesManualOverride = false; state.guestServicesLoadedFor = null; }catch(_){ }
  try { updateGuestRemaining(); } catch (_) {}

  const ci = document.getElementById("guestCheckIn");
  if (ci) ci.value = todayISO();
  try{ populateGuestChannelOptions(); }catch(_){ }
  try{ applySelectedChannelToGuestForm(""); }catch(_){ }

  setMarriage(false);
  setGroup(false);
  setColC(false);
  state.guestRooms = state.guestRooms || new Set();
  state.guestRooms.clear();
  state.lettiPerStanza = {};
  state.bedsDirty = false;
  state.stanzeSnapshotOriginal = "";

  // Pagamenti (pillole): default contanti + ricevuta OFF
  state.guestDepositType = "contante";
  state.guestSaldoType = "contante";
  state.guestDepositReceipt = false;
  state.guestSaldoReceipt = false;

  setPayType("depositType", state.guestDepositType);
  setPayType("saldoType", state.guestSaldoType);
  setPayReceipt("depositType", state.guestDepositReceipt);
  setPayReceipt("saldoType", state.guestSaldoReceipt);


  // Registrazioni (PS/ISTAT): default OFF
  state.guestPSRegistered = false;
  state.guestISTATRegistered = false;
  setRegFlags("regTags", state.guestPSRegistered, state.guestISTATRegistered);
  // refresh rooms UI if present
  try {
    document.querySelectorAll("#roomsPicker .room-dot").forEach(btn => {
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed", "false");
    });
  } catch (_) {}
  try { updateOspiteHdActions(); } catch (_) {}


  try { updateGuestPriceVisibility(); } catch (_) {}
  try{ syncGuestNotesUI(null, { open:false }); }catch(_){}

  // (Create mode) nulla da fare sulle stanze: la disponibilita' si aggiorna quando l'utente inserisce le date.
}

function enterGuestEditMode(ospite){
  try{ ensureRoomsPickerButtons(); }catch(_){ }
  setGuestFormViewOnly(false);

  state.guestCreateFromGroup = false;

  state.guestViewItem = null;

  // Snapshot del record originale: serve per tornare alla scheda in sola lettura
  // dalla modalità "modifica" senza dipendere dai campi eventualmente alterati.
  try{ state.guestEditSourceItem = ospite ? JSON.parse(JSON.stringify(ospite)) : null; }catch(_){ state.guestEditSourceItem = ospite || null; }

  // ✅ FIX dDAE: evita "leak" delle stanze tra prenotazioni multiple (multi booking).
  // Quando si passa da un gruppo all'altro, se il nuovo record non ha 'stanze' valorizzate,
  // lo stato precedente poteva rimanere e finire dentro il nuovo salvataggio.
  try {
    state.guestRooms = state.guestRooms || new Set();
    state.guestRooms.clear();
    state.lettiPerStanza = {};
    state.bedsDirty = false;
    state.stanzeSnapshotOriginal = "";
    document.querySelectorAll("#roomsPicker .room-dot").forEach(btn => {
      if (btn.id === "roomMarriage" || btn.id === "roomGroup") return;
      btn.classList.remove("selected");
      btn.setAttribute("aria-pressed", "false");
    });
  } catch (_) {}

  state.guestMode = "edit";
  try{ updateGuestFormModeClass(); }catch(_){ }
  state.guestEditId = ospite?.id ?? null;
  

  // Servizi: prepara cache locale per apertura istantanea (layout invariato)
  try{
    state.guestServicesManualOverride = false;
    const ospiteId = guestIdOf(ospite) || (ospite?.id ?? null);
    const key = ospiteId ? String(ospiteId) : "";
    const cache = (key && state.guestServicesCacheById) ? state.guestServicesCacheById[key] : null;

    state.guestServicesLoadingFor = null;

    if (cache && Array.isArray(cache.items)){
      state.guestServicesItems = cache.items.slice();
      state.guestServicesComputedTotal = isFinite(cache.total) ? cache.total : serviziComputeTotal(state.guestServicesItems);
      state.guestServicesLoadedFor = ospiteId;
      state.guestServicesLoadedAt = cache.loadedAt || 0;
    } else {
      state.guestServicesLoadedFor = null;
      state.guestServicesLoadedAt = 0;
      state.guestServicesItems = [];
      state.guestServicesComputedTotal = 0;
    }
  }catch(_){ }
  // Precarica servizi in background (UI apre subito)
  try{ setTimeout(() => { try{ loadServiziForOspite(ospite); }catch(_){} }, 0); }catch(_){}


state.guestEditCreatedAt = (ospite?.created_at ?? ospite?.createdAt ?? null);

  const title = document.getElementById("ospiteFormTitle");
  if (title) title.textContent = "Modifica ospite";
  const btn = document.getElementById("createGuestCard");
  if (btn) btn.textContent = "Salva modifiche";

  document.getElementById("guestName").value = ospite.nome || ospite.name || "";
  document.getElementById("guestPhone").value = ospite.telefono ?? ospite.tel ?? ospite.phone ?? "";
  document.getElementById("guestEmail").value = ospite.email ?? ospite.mail ?? "";
  document.getElementById("guestAdults").value = ospite.adulti ?? ospite.adults ?? 0;
  document.getElementById("guestKidsU10").value = ospite.bambini_u10 ?? ospite.kidsU10 ?? 0;
  document.getElementById("guestCheckIn").value = formatISODateLocal(ospite.check_in || ospite.checkIn || "") || "";
  document.getElementById("guestCheckOut").value = formatISODateLocal(ospite.check_out || ospite.checkOut || "") || "";
  document.getElementById("guestTotal").value = ospite.importo_prenotazione ?? ospite.total ?? 0;
  try{ populateGuestChannelOptions(ospite.channel_id ?? ospite.channelId ?? ""); }catch(_){ }
  const __guestChannelCommission = (ospite.channel_commissione ?? ospite.channelCommissione ?? ospite.channel_commission_pct ?? ospite.channelCommissionPct ?? 0);
  document.getElementById("guestChannelCommission").value = (__guestChannelCommission === null || __guestChannelCommission === undefined || __guestChannelCommission === "") ? "" : __guestChannelCommission;
  try{ document.getElementById("guestChannel").value = String(ospite.channel_id ?? ospite.channelId ?? ""); }catch(_){ }
  try{ applySelectedChannelToGuestForm(ospite.channel_id ?? ospite.channelId ?? "", { preserveManual:true }); }catch(_){ }
  document.getElementById("guestBooking").value = ospite.importo_booking ?? ospite.booking ?? 0;
  document.getElementById("guestServices").value = ospite.servizi_totale ?? ospite.serviziTotal ?? ospite.importo_servizi ?? 0;
  document.getElementById("guestDeposit").value = ospite.acconto_importo ?? ospite.deposit ?? 0;
  document.getElementById("guestSaldo").value = ospite.saldo_pagato ?? ospite.saldoPagato ?? ospite.saldo ?? 0;
  try{ syncGuestNotesUI(ospite, { open:false }); }catch(_){}

  // matrimonio / G
  state.guestMarriage = !!(ospite.matrimonio);
  setMarriage(state.guestMarriage);
  state.guestGroup = !!(truthy(ospite.g ?? ospite.flag_g ?? ospite.gruppo_g ?? ospite.group ?? ospite.G ?? ospite.g_flag));
  setGroup(state.guestGroup);
  state.guestColC = !!(truthy(ospite.col_c ?? ospite.colC ?? ospite.c ?? ospite.C ?? ospite.flag_c ?? ospite.flagC ?? ospite.colc ?? ospite.c_flag));
  setColC(state.guestColC);
refreshFloatingLabels();
  try { updateGuestRemaining(); } catch (_) {}

  // Servizi: carica sempre (anche se l'ospite non ha servizi_totale valorizzato)
  try{ loadServiziForOspite(ospite); }catch(_){ }


  // deposit type (se disponibile)
  const dt = ospite.acconto_tipo || ospite.depositType || "contante";
  state.guestDepositType = dt;
  setPayType("depositType", dt);

  const st = ospite.saldo_tipo || ospite.saldoTipo || "contante";
  state.guestSaldoType = st;
  setPayType("saldoType", st);

  // ricevuta fiscale (toggle indipendente)
  const depRec = truthy(ospite.acconto_ricevuta ?? ospite.accontoRicevuta ?? ospite.ricevuta_acconto ?? ospite.ricevutaAcconto ?? ospite.acconto_ricevutain);
  const saldoRec = truthy(ospite.saldo_ricevuta ?? ospite.saldoRicevuta ?? ospite.ricevuta_saldo ?? ospite.ricevutaSaldo ?? ospite.saldo_ricevutain);
  state.guestDepositReceipt = depRec;
  state.guestSaldoReceipt = saldoRec;
  setPayReceipt("depositType", depRec);
  setPayReceipt("saldoType", saldoRec);



  // registrazioni PS/ISTAT
  const psReg = truthy(ospite.ps_registrato ?? ospite.psRegistrato);
  const istatReg = truthy(ospite.istat_registrato ?? ospite.istatRegistrato);
  state.guestPSRegistered = psReg;
  state.guestISTATRegistered = istatReg;
  setRegFlags("regTags", psReg, istatReg);
  // stanze: in lettura possono arrivare in vari formati (legacy, JSON, date-convertite da Sheets)
  try {
    const roomsArr = _parseRoomsArr(ospite?.stanze);
    if (roomsArr.length){
      state.guestRooms = new Set(roomsArr);
      document.querySelectorAll("#roomsPicker .room-dot").forEach(btn => {
        const n = parseInt(btn.getAttribute("data-room"), 10);
        const on = state.guestRooms.has(n);
        btn.classList.toggle("selected", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  } catch (_) {}

  // --- FIX A+B (dDAE): preserva la configurazione letti esistente e non riscrivere "stanze" se non è cambiata ---
  try {
    state.bedsDirty = false;

    // Ricostruisci lettiPerStanza dai dati già salvati sul foglio "stanze" (state.stanzeByKey)
    const gid = String(guestIdOf(ospite) || ospite?.id || "").trim();
    const next = {};
    const roomsNow = Array.from(state.guestRooms || []).map(n=>parseInt(n,10)).filter(n=>isFinite(n));
    for (const rn of roomsNow){
      const key = `${gid}:${String(rn)}`;
      const d = (state.stanzeByKey && state.stanzeByKey[key]) ? state.stanzeByKey[key] : {};
      next[String(rn)] = {
        matrimoniale: !!(d.letto_m),
        singoli: parseInt(d.letto_s || 0, 10) || 0,
        culla: !!(d.culla),
        note: ""
      };
    }
    state.lettiPerStanza = next;

    // Snapshot originale per evitare riscritture inutili su salvataggio
    state.stanzeSnapshotOriginal = JSON.stringify(buildArrayFromState());
  } catch (_) {}

  try { updateOspiteHdActions(); } catch (_) {}

  // ✅ FIX dDAE: entrando in modifica con date gia' valorizzate, ricalcola subito disponibilita' stanze.
  // In iOS/Safari PWA gli handler input/change dei campi date possono non partire finche' l'utente non li tocca.
  // refreshRoomsAvailability/renderRooms sono definiti in setupOspite: li esponiamo su window e li richiamiamo qui.
  try {
    state._roomsAvailKey = "";
    const run = () => {
      try { window.__ddae_renderRooms && window.__ddae_renderRooms(); } catch (_) {}
      try { window.__ddae_refreshRoomsAvailability && window.__ddae_refreshRoomsAvailability(); } catch (_) {}
    };
    setTimeout(run, 50);
    setTimeout(run, 180);
  } catch (_) {}

  // Multi prenotazioni: in modifica mostra sempre il riquadro (anche se singolo) + tasto +
  try{
    // Se non abbiamo contesto gruppo, ricostruiscilo dal dataset corrente
    if (!Array.isArray(state.guestGroupBookings) || !state.guestGroupBookings.length){
      const items = Array.isArray(state.ospiti) && state.ospiti.length ? state.ospiti : (Array.isArray(state.guests) ? state.guests : []);
      const groups = groupGuestsByName(items || []);
      const nk = normalizeGuestNameKey(ospite?.nome ?? ospite?.name ?? "");
      const g = nk ? groups.find(x => String(x.key) === nk) : null;
      if (g && Array.isArray(g.bookings) && g.bookings.length){
        state.guestGroupBookings = g.bookings;
        state.guestGroupKey = g.key;
      } else {
        state.guestGroupBookings = [ospite];
        state.guestGroupKey = nk || null;
      }
    } else if (!state.guestGroupKey){
      const nk = normalizeGuestNameKey(ospite?.nome ?? ospite?.name ?? "");
      state.guestGroupKey = nk || state.guestGroupKey || null;
    }

    state.guestGroupActiveId = guestIdOf(ospite);
    renderGuestMulti({ mode: "edit" });
  }catch(_){ }


  try { updateGuestPriceVisibility(); } catch (_) {}
}

function _guestIdOf(item){
  return String(item?.id || item?.ID || item?.ospite_id || item?.ospiteId || item?.guest_id || item?.guestId || "").trim();
}

function getConfiguredRoomsCount(fallback = 6){
  try{
    const n = parseInt(String(state?.settings?.byKey?.numero_stanze?.value ?? state?.settings?.byKey?.numero_stanze?.Value ?? state?.settings?.byKey?.numero_stanze?.val ?? fallback), 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }catch(_){ }
  return Math.max(0, parseInt(fallback, 10) || 6);
}

function updateSettingsRoomsButtonLabel(){
  try{
    const el = document.getElementById("settingsRoomsBtn");
    if (!el) return;
    const label = el.querySelector('.settings-btn-label');
    const n = getConfiguredRoomsCount(6);
    if (label) label.textContent = `Stanze ${n}`;
    el.setAttribute('aria-label', `Numero stanze: ${n}. Tap per avanzare, pressione lunga per azzerare`);
    el.title = `Numero stanze: ${n}. Tap per avanzare, pressione lunga per azzerare`;
  }catch(_){ }
}

function ensureRoomsPickerButtons(){
  try{
    const picker = document.getElementById('roomsPicker');
    if (!picker) return;
    const count = getConfiguredRoomsCount(6);
    const selected = (state && state.guestRooms instanceof Set) ? new Set(Array.from(state.guestRooms)) : new Set();
    const parts = [];
    for (let i = 1; i <= count; i++) {
      const on = selected.has(i);
      parts.push(`<button aria-pressed="${on ? "true" : "false"}" class="room-dot${on ? " selected" : ""}" data-room="${i}" type="button">${i}</button>`);
    }
    picker.innerHTML = parts.join('');
  }catch(_){ }
}

async function saveRoomsCountSetting(nextCount){
  const n = Math.max(0, Math.min(12, parseInt(nextCount, 10) || 0));
  if (!Number.isFinite(n) || n < 0) throw new Error('Numero stanze non valido');
  await api('impostazioni', { method: 'POST', body: { numero_stanze: n }, showLoader: true });
  try{
    state.settings = state.settings || {};
    state.settings.byKey = state.settings.byKey || {};
    state.settings.byKey.numero_stanze = { key:'numero_stanze', value:n, val:n, Value:n };
  }catch(_){ }
  await ensureSettingsLoaded({ force:true, showLoader:false });
  try{
    if (state && state.guestRooms instanceof Set){
      state.guestRooms = new Set(Array.from(state.guestRooms).filter(v => Number(v) >= 1 && Number(v) <= n).sort((a,b)=>a-b));
    }
  }catch(_){ }
  try{ ensureRoomsPickerButtons(); }catch(_){ }
  try{ updateSettingsRoomsButtonLabel(); }catch(_){ }
  try{ window.__ddae_renderRooms?.(); }catch(_){ }
  try{ window.__ddae_refreshRoomsAvailability?.(); }catch(_){ }
  try{ window.__ddae_refreshPulizieGrid?.({ forceReload:true }); }catch(_){ }
  try{ if (state && state.page === 'calendario') renderCalendario?.(); }catch(_){ }
  try{ if (state && state.page === 'ospite'){
    const current = state.guestMode === 'view' ? state.guestViewItem : state.guestEditSourceItem;
    if (current) renderRoomsReadOnly?.(current);
  } }catch(_){ }
  toast('Numero stanze aggiornato');
}

function normalizeRoomsList(arr, fallback = 6){
  const maxRooms = getConfiguredRoomsCount(fallback);
  return Array.from(new Set((Array.isArray(arr) ? arr : [])
    .map(n => parseInt(n, 10))
    .filter(n => Number.isFinite(n) && n >= 1 && n <= maxRooms)))
    .sort((a,b) => a - b);
}

function _parseRoomsArr(stanzeField){
  // Restituisce sempre un array unico/sortato di stanze [1..N configurato]
  const norm = (arr) => normalizeRoomsList(arr, 6);

  const fromDateParts = (d, m, y) => {
    const dd = parseInt(d, 10);
    const mm = parseInt(m, 10);
    let yy = parseInt(y, 10);
    if (!isFinite(dd) || !isFinite(mm) || !isFinite(yy)) return null;
    if (yy >= 100) yy = yy % 100;
    if (dd >= 1 && dd <= 6 && mm >= 1 && mm <= 6 && yy >= 1 && yy <= 6) return [dd, mm, yy];
    return null;
  };

  try {
    if (Array.isArray(stanzeField)) return norm(stanzeField);
    if (stanzeField == null) return [];

    // Date object (da Sheets)
    if (stanzeField instanceof Date){
      const parts = fromDateParts(stanzeField.getDate(), stanzeField.getMonth() + 1, stanzeField.getFullYear());
      return parts ? norm(parts) : [];
    }

    let s = String(stanzeField).trim();
    if (!s) return [];

    // JSON array: [2,3,4]
    if (s[0] === "["){
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return norm(arr);
      } catch (_) {}
    }

    // JSON object (tolleranza): {stanze:[...]}
    if (s[0] === "{"){
      try {
        const obj = JSON.parse(s);
        const maybe = (obj && (obj.stanze ?? obj.rooms ?? obj.stanza ?? obj.room)) ?? null;
        if (Array.isArray(maybe)) return norm(maybe);
        if (typeof maybe === "string") s = String(maybe).trim();
      } catch (_) {}
    }

    // Sheets conversione data con virgole: "2,3,2004"
    let m = s.match(/^\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{2,4})\s*$/);
    if (m){
      const parts = fromDateParts(m[1], m[2], m[3]);
      if (parts) return norm(parts);
    }

    // Data con slash: "02/03/2004" oppure "2-3-04"
    m = s.match(/^\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})\s*$/);
    if (m){
      const parts = fromDateParts(m[1], m[2], m[3]);
      if (parts) return norm(parts);
    }

    // ISO date: "2004-03-02" o "2004-03-02T..."
    m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (m){
      const parts = fromDateParts(m[3], m[2], m[1]);
      if (parts) return norm(parts);
    }

    // Lista stanze: supporta "2,3,4", "2|3|4", "10 11" e JSON/stringhe simili
    const tokens = s.split(/[|,;\s]+/).map(t => t.trim()).filter(Boolean);
    const nums = tokens.map(t => parseInt(t, 10)).filter(n => Number.isFinite(n));
    return norm(nums);
  } catch (_) {
    return [];
  }
}


function buildRoomsStackHTML(guestId, roomsArr){
  if (!roomsArr || !roomsArr.length) return `<span class="room-dot-badge is-empty" aria-label="Nessuna stanza">—</span>`;
  return `<div class="rooms-stack" aria-label=" e letti">` + normalizeRoomsList(roomsArr, 6).map((n) => {
    const key = `${guestId}:${n}`;
    const info = (state.stanzeByKey && state.stanzeByKey[key]) ? state.stanzeByKey[key] : { letto_m: 0, letto_s: 0, culla: 0 };
    const lettoM = Number(info.letto_m || 0) || 0;
    const lettoS = Number(info.letto_s || 0) || 0;
    const culla  = Number(info.culla  || 0) || 0;

    let dots = "";
    if (lettoM > 0) dots += `<span class="bed-dot bed-dot-m" aria-label="Letto matrimoniale"></span>`;
    for (let i = 0; i < lettoS; i++) dots += `<span class="bed-dot bed-dot-s" aria-label="Letto singolo"></span>`;
    if (culla > 0) dots += `<span class="bed-dot bed-dot-c" aria-label="Culla"></span>`;

    return `<div class="room-row">
      <span class="room-dot-badge room-${n}">${n}</span>
      <div class="bed-dots" aria-label="Letti">${dots || `<span class="bed-dot bed-dot-empty" aria-label="Nessun letto"></span>`}</div>
    </div>`;
  }).join("") + `</div>`;
}

function renderRoomsReadOnly(ospite){
  const ro = document.getElementById("roomsReadOnly");
  if (!ro) return;

  const guestId = _guestIdOf(ospite);
  let roomsArr = _parseRoomsArr(ospite?.stanze);

  // fallback: se per qualche motivo non arriva 'stanze' dal backend, usa lo stato locale
  if (!roomsArr.length && state.guestRooms && state.guestRooms.size){
    roomsArr = Array.from(state.guestRooms)
      .map(n => parseInt(n,10))
      .filter(n => Number.isFinite(n) && n>=1 && n<=getConfiguredRoomsCount(6))
      .sort((a,b)=>a-b);
  }

  let stackHTML = buildRoomsStackHTML(guestId, roomsArr);

  const nights = calcStayNights(ospite);

  // Tassa di soggiorno: mostra il totale accanto al pallino della prima stanza
  try{
    if (nights != null){
      const tt = calcTouristTax(ospite, nights);
    }
  }catch(_){ }

  // Range date sempre visibile (pill bianca)
  const rangeCompact = formatRangeCompactIT(ospite?.check_in ?? ospite?.checkIn ?? "", ospite?.check_out ?? ospite?.checkOut ?? "");
  const datesHTML = `<div class="guest-booking-dates-pill">${rangeCompact || "—"}</div>`;

  // Matrimonio + pallino notti (azzurro) a destra della pill data
  const marriageOn = !!(ospite?.matrimonio);
  const gOn = truthy(ospite?.g ?? ospite?.flag_g ?? ospite?.gruppo_g ?? ospite?.group ?? ospite?.g_flag);
  const cOn = truthy(ospite?.col_c ?? ospite?.colC ?? ospite?.c ?? ospite?.C ?? ospite?.flag_c ?? ospite?.flagC ?? ospite?.colc ?? ospite?.c_flag);
  const marriageHTML = marriageOn ? `<span class="marriage-dot" aria-label="Matrimonio">M</span>` : ``;
  const gHTML = gOn ? `<span class="g-dot" aria-label="G">G</span>` : ``;
  const cHTML = cOn ? `<span class="c-dot" aria-label="C">C</span>` : ``;
  const nightsHTML = buildNightsDotHTML(nights);

  const topRightHTML = (marriageHTML || gHTML || cHTML || nightsHTML) ? `<div class="guest-booking-right">${marriageHTML}${gHTML}${cHTML}${nightsHTML}</div>` : ``;

  // Coerenza UI: usa lo stesso riquadro smussato delle prenotazioni multiple
  ro.innerHTML = `
    <div class="guest-booking-block guest-booking-block--primary">
      <div class="guest-booking-top">
        <div class="guest-booking-top-row">
          ${datesHTML}
          ${topRightHTML}
        </div>
      </div>
      <div class="guest-booking-rooms guest-booking-ro">
        <div class="rooms-readonly-wrap">${stackHTML}</div>
      </div>
    </div>
  `;

  try{ updateGuestTaxTotalPill(); }catch(_){ }
}


// ===== dDAE_1.020 — Multi prenotazioni per stesso nome =====
function normalizeGuestNameKey(name){
  try{ return collapseSpaces(String(name || "").trim()).toLowerCase(); }catch(_){ return String(name||"").trim().toLowerCase(); }
}

function buildGuestBookingBlockHTML(ospite, { mode="view", showSelect=false, activeId="" } = {}){
  const gid = guestIdOf(ospite);
  const roomsArr = _parseRoomsArr(ospite?.stanze);
  let roomsHTML = buildRoomsStackHTML(gid, roomsArr);

  const rangeCompact = formatRangeCompactIT(ospite?.check_in ?? ospite?.checkIn ?? "", ospite?.check_out ?? ospite?.checkOut ?? "") || "—";

  const modeL = String(mode || "view").toLowerCase();
  const nights = calcStayNights(ospite);

  // In sola lettura: inserisci tassa accanto alla prima stanza
  try{
    if (modeL === "view" && nights != null){
      const tt = calcTouristTax(ospite, nights);
    }
  }catch(_){ }

  const nightsHTML = (modeL === "view") ? buildNightsDotHTML(nights) : ``;

  const marriageOn = !!(ospite?.matrimonio);

  const isActive = (activeId && gid && String(activeId) === String(gid));
  const actionsHTML = (showSelect && gid)
    ? `<div class="guest-booking-actions" aria-label="Azioni prenotazione">
        <button class="icon-round-btn is-edit" type="button" data-guest-select="${gid}" aria-label="Modifica prenotazione" ${isActive ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button class="icon-round-btn is-del" type="button" data-guest-del-booking="${gid}" aria-label="Elimina prenotazione">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>`
    : ``;

  // Top right: in edit mostra azioni; in view mostra matrimonio + notti
  const gOn = truthy(ospite?.g ?? ospite?.flag_g ?? ospite?.gruppo_g ?? ospite?.group ?? ospite?.g_flag);
  const cOn = truthy(ospite?.col_c ?? ospite?.colC ?? ospite?.c ?? ospite?.C ?? ospite?.flag_c ?? ospite?.flagC ?? ospite?.colc ?? ospite?.c_flag);
  const marriageHTML = (modeL === "view" && marriageOn) ? `<span class="marriage-dot" aria-label="Matrimonio">M</span>` : ``;
  const gHTML = (modeL === "view" && gOn) ? `<span class="g-dot" aria-label="G">G</span>` : ``;
  const cHTML = (modeL === "view" && cOn) ? `<span class="c-dot" aria-label="C">C</span>` : ``;
  const viewRight = (marriageHTML || gHTML || cHTML || nightsHTML) ? `<div class="guest-booking-right">${marriageHTML}${gHTML}${cHTML}${nightsHTML}</div>` : ``;
const topRightHTML = actionsHTML || viewRight;

  return `<div class="guest-booking-block ${isActive ? "is-active" : ""}" data-booking-id="${gid}">
    <div class="guest-booking-top">
      <div class="guest-booking-top-row">
        <div class="guest-booking-dates-pill">${rangeCompact}</div>
        ${topRightHTML}
      </div>
    </div>
    <div class="guest-booking-rooms">${roomsHTML}</div>
  </div>`;
}


function clearGuestMulti(){
  const el = document.getElementById("guestMulti");
  if (!el) return;
  el.hidden = true;
  el.innerHTML = "";
}

function renderGuestMulti({ mode="view" } = {}){
  const el = document.getElementById("guestMulti");
  if (!el) return;

  const list = Array.isArray(state.guestGroupBookings) ? state.guestGroupBookings : [];
  const activeId = String(state.guestGroupActiveId || state.guestEditId || "").trim();

  if (!list || !list.length){
    clearGuestMulti();
    return;
  }

  // In modifica: mostra SEMPRE il riquadro (anche se singolo) + tasto "+" per aggiungere prenotazione
  if (mode === "edit"){
    const showSelect = true;
    const title = `<div class="guest-multi-title">Prenotazioni</div>`;
    const blocks = list.map(g => buildGuestBookingBlockHTML(g, { mode, showSelect, activeId })).join("");
    const plus = `<button class="guest-add-booking" type="button" data-guest-add-booking aria-label="Aggiungi prenotazione">+</button>`;
    el.innerHTML = `${title}${blocks}${plus}`;
    el.hidden = false;
    return;
  }

  // In sola lettura: mostra solo le prenotazioni aggiuntive (sotto la prima)
  if (list.length <= 1){
    clearGuestMulti();
    return;
  }

  const shown = list.filter(x => guestIdOf(x) !== activeId);
  if (!shown.length){
    clearGuestMulti();
    return;
  }

  const blocks = shown.map(g => buildGuestBookingBlockHTML(g, { mode, showSelect:false, activeId })).join("");
  el.innerHTML = `${blocks}`;
  el.hidden = false;
  // Servizi: carica elenco e imposta totale (edit/view)
  try{
    state.guestServicesManualOverride = false;
    loadServiziForOspite(ospite);
  }catch(_){}

}

function updateOspiteHdActions(){

  const hdActions = document.getElementById("ospiteHdActions");
  if (!hdActions) return;

  // Mostra il contenitore (poi nascondiamo i singoli pallini senza azione)
  hdActions.hidden = false;

  const btnCal  = hdActions.querySelector("[data-guest-cal]");
  const btnBack = hdActions.querySelector("[data-guest-back]");
  const btnEdit = hdActions.querySelector("[data-guest-edit]");
  const btnDel  = hdActions.querySelector("[data-guest-del]");

  const mode = state.guestMode; // "create" | "edit" | "view"

  // Indaco: vai al calendario (sempre presente)
  if (btnCal) btnCal.hidden = false;

  // Verde: sempre presente (torna alla lista ospiti)
  if (btnBack) btnBack.hidden = false;

  // Giallo: solo in sola lettura (azione: passa a modifica)
  if (btnEdit) btnEdit.hidden = (mode !== "view");

  // Rosso: solo in sola lettura (azione: elimina ospite)
  if (btnDel) btnDel.hidden = (mode !== "view");
}


function updateGuestFormModeClass(){
  try{
    const card = document.querySelector("#page-ospite .guest-form-card");
    if (!card) return;
    const mode = String(state.guestMode || "").toLowerCase();
    const isView = (mode === "view");
    card.classList.toggle("is-view", isView);
    card.classList.toggle("is-create", !isView && mode === "create");
    card.classList.toggle("is-edit", !isView && mode === "edit");
  }catch(_){}
}

function __placeServicesPillForView(isView){
  try{
    const pill = document.getElementById("servicesPillView");
    if (!pill) return;

    // Anchor: ricorda la posizione originale (layout modifica invariato)
    let anchor = document.getElementById("servicesPillViewAnchor");
    if (!anchor){
      anchor = document.createElement("span");
      anchor.id = "servicesPillViewAnchor";
      anchor.hidden = true;
      try{
        if (pill.parentNode) pill.parentNode.insertBefore(anchor, pill);
      }catch(_){}
    }

    const servicesRow = document.getElementById("servicesRow");
    const targetWrap = servicesRow ? servicesRow.querySelector(".paywrap") : null;

    if (isView){
      if (targetWrap && pill.parentNode !== targetWrap){
        // accanto a "Importo servizi"
        try{ targetWrap.insertBefore(pill, targetWrap.firstChild); }catch(_){}
      }
      try{ pill.hidden = false; }catch(_){}
    } else {
      // ripristina accanto a "Importo booking"
      if (anchor && anchor.parentNode){
        try{ anchor.parentNode.insertBefore(pill, anchor.nextSibling); }catch(_){}
      }
    }
  }catch(_){}
}



function setGuestFormViewOnly(isView, ospite){
  try{ updateGuestFormModeClass(); }catch(_){ }
  const card = document.querySelector("#page-ospite .guest-form-card");
  if (card) card.classList.toggle("is-view", !!isView);

  const btn = document.getElementById("createGuestCard");
  if (btn) btn.hidden = !!isView;

  const picker = document.getElementById("roomsPicker");
  if (picker) { try{ ensureRoomsPickerButtons(); }catch(_){ } picker.hidden = !!isView; }

  const ro = document.getElementById("roomsReadOnly");
  if (ro) {
    ro.hidden = !isView;
    if (isView) renderRoomsReadOnly(ospite);
    else ro.innerHTML = "";
  }

  
  // In sola lettura: nascondi i campi di immissione non necessari (ospiti + date)
  try{
    const hideRowByInputId = (inputId, hide) => {
      const el = document.getElementById(inputId);
      if (!el) return;
      const row = el.closest('.field');
      if (row) row.hidden = !!hide;
    };
    // Numero ospiti (adulti/bambini)
    hideRowByInputId("guestAdults", !!isView);
    // Date check-in / check-out
    hideRowByInputId("guestCheckIn", !!isView);
    // In sola lettura mantieni visibile solo la card channel; percentuale e importo commissione nascosti
    hideRowByInputId("guestBooking", !!isView);
    try{
      const commWrap = document.getElementById("guestChannelCommissionWrap");
      if (commWrap) commWrap.hidden = !!isView;
    }catch(_){ }
  }catch(_){ }

  try{ const notesEl = document.getElementById("guestNotes"); if (notesEl) notesEl.readOnly = !!isView; }catch(_){}
  // Servizi: in sola lettura mostra il tasto accanto a "Importo servizi" (layout modifica invariato)
  try{ __placeServicesPillForView(!!isView); }catch(_){ }

  // Servizi: chiudi lista quando non in view
  try{
    const wrap = document.getElementById("servicesListWrap");
    if (wrap && !isView) wrap.hidden = true;
  }catch(_){ }
// Aggiorna i pallini in testata in base alla modalità corrente
  try { updateOspiteHdActions(); } catch (_) {}
}

function enterGuestViewMode(ospite){
  // Riempiamo la maschera usando la stessa logica dell'edit, poi blocchiamo tutto in sola lettura
  enterGuestEditMode(ospite);
  state.guestMode = "view";
  try{ updateGuestFormModeClass(); }catch(_){ }
  state.guestViewItem = ospite || null;

  
  // Servizi: carica sempre elenco e totale (anche se non ci sono multi-prenotazioni)
  try{
    state.guestServicesManualOverride = false;
    const ospiteId = guestIdOf(ospite) || (ospite?.id ?? null);
    const key = ospiteId ? String(ospiteId) : "";
    const cache = (key && state.guestServicesCacheById) ? state.guestServicesCacheById[key] : null;

    state.guestServicesLoadingFor = null;

    if (cache && Array.isArray(cache.items)){
      state.guestServicesItems = cache.items.slice();
      state.guestServicesComputedTotal = isFinite(cache.total) ? cache.total : serviziComputeTotal(state.guestServicesItems);
      state.guestServicesLoadedFor = ospiteId;
      state.guestServicesLoadedAt = cache.loadedAt || 0;
    } else {
      state.guestServicesLoadedFor = null;
      state.guestServicesLoadedAt = 0;
      state.guestServicesItems = [];
      state.guestServicesComputedTotal = 0;
    }
    loadServiziForOspite(ospite);
  }catch(_){ }

const title = document.getElementById("ospiteFormTitle");
  if (title) title.textContent = "Scheda ospite";

  setGuestFormViewOnly(true, ospite);
  // Multi prenotazioni: mostra prenotazioni aggiuntive sotto la prima
  try{
    if (Array.isArray(state.guestGroupBookings) && state.guestGroupBookings.length > 1){
      state.guestGroupActiveId = guestIdOf(ospite);
      renderGuestMulti({ mode: "view" });
    } else {
      clearGuestMulti();
    }
  }catch(_){ }
  try { updateOspiteHdActions(); } catch (_) {}
}

/* ──────────────────────────────────────────────────────────────
   SERVIZI (ospite): lista + totale + popup aggiunta
   ────────────────────────────────────────────────────────────── */

function normalizeServiziResponse(res){
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

function serviziComputeTotal(items){
  let sum = 0;
  (items || []).forEach(s => {
    if (!s) return;
    const del = s.isDeleted ?? s.is_deleted ?? s.deleted;
    if (String(del) === "1" || del === true) return;
    const qty = parseFloat(s.qty ?? 1) || 1;
    const amt = parseFloat(s.importo ?? s.amount ?? 0) || 0;
    sum += (qty * amt);
  });
  return Math.round(sum * 100) / 100;
}

function serviziPreviewText(items){
  const n = (items || []).filter(s => {
    const del = s?.isDeleted ?? s?.is_deleted ?? s?.deleted;
    return !(String(del) === "1" || del === true);
  }).length;
  return n > 0 ? (n + " servizi") : "";
}


function guestNotesValue(item){
  return String(item?.note ?? item?.notes ?? item?.nota ?? "").trim();
}

function guestHasNotes(item){
  return guestNotesValue(item).length > 0;
}

function setGuestNotesExpanded(expanded){
  try{
    const wrap = document.getElementById("guestNotesWrap");
    const btn = document.getElementById("guestNotesToggle");
    if (wrap) wrap.hidden = !expanded;
    if (btn){
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
      btn.classList.toggle("is-open", !!expanded);
    }
  }catch(_){ }
  try{ state.guestNotesExpanded = !!expanded; }catch(_){ }
}

function updateGuestNotesIndicator(){
  try{
    const dot = document.getElementById("guestNotesToggleDot");
    if (!dot) return;
    const notesVal = String(document.getElementById("guestNotes")?.value || "").trim();
    dot.hidden = !(notesVal.length > 0);
  }catch(_){ }
}

function syncGuestNotesUI(item, opts = {}){
  const notesEl = document.getElementById("guestNotes");
  if (!notesEl) return;
  const notes = (item === null || item === undefined) ? "" : guestNotesValue(item);
  notesEl.value = notes;
  const placeholder = (String(state.guestMode || "") === "view") ? "Nessuna nota" : "Inserisci eventuali note";
  notesEl.placeholder = placeholder;
  updateGuestNotesIndicator();
  const wantsOpen = Object.prototype.hasOwnProperty.call(opts, "open") ? !!opts.open : (!!notes && !!state.guestNotesExpanded);
  setGuestNotesExpanded(wantsOpen);
}

function renderServiziList(){
  const wrap = document.getElementById("servicesListWrap");
  const body = document.getElementById("servicesListBody");
  const totalEl = document.getElementById("servicesListTotal");
  if (!wrap || !body || !totalEl) return;

  const mode = String(state.guestMode || "").toLowerCase();
  const isEdit = (mode === "edit");
  try{ wrap.dataset.mode = isEdit ? "edit" : "view"; }catch(_){}

  totalEl.textContent = formatEUR(state.guestServicesComputedTotal || 0);

  const items = (state.guestServicesItems || []).filter(s => {
    const del = s?.isDeleted ?? s?.is_deleted ?? s?.deleted;
    return !(String(del) === "1" || del === true);
  });

  body.innerHTML = "";

  const currentId = (mode === "view") ? guestIdOf(state.guestViewItem) : state.guestEditId;
  const isLoading = !!currentId && String(state.guestServicesLoadingFor || "") === String(currentId);

  if (!items.length){
    const empty = document.createElement("div");
    empty.className = "service-item";
    const msg = isLoading ? "Caricamento..." : "Nessun servizio";
    const amt = isLoading ? "…" : "€0,00";
    empty.innerHTML = `<div class="meta"><div class="name">${msg}</div><div class="desc">—</div></div><div class="amt">${amt}</div>`;
    body.appendChild(empty);
    return;
  }

  items.forEach((s) => {
    const name = String(s.servizio ?? s.name ?? "").trim() || "Servizio";
    const desc = String(s.descrizione ?? s.desc ?? "").trim() || "";
    const qty = parseFloat(s.qty ?? 1) || 1;
    const amt = parseFloat(s.importo ?? s.amount ?? 0) || 0;
    const total = qty * amt;

    const row = document.createElement("div");
    row.className = "service-item";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div class="name">${escapeHtml(name)}${(qty && qty !== 1) ? ` <span style="opacity:.8;font-weight:800">×${qty}</span>` : ""}</div>
      ${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : `<div class="desc">—</div>`}
    `;
    row.appendChild(meta);

    if (isEdit){
      const right = document.createElement("div");
      right.className = "svc-right";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "svc-del";
      delBtn.setAttribute("aria-label", "Elimina servizio");
      delBtn.title = "Elimina";

      bindFastTap(delBtn, async () => {
        try{
          const all = state.guestServicesItems || [];
          let idx = all.indexOf(s);
          if (idx < 0){
            // fallback: match by content
            idx = all.findIndex(x =>
              String(x?.servizio ?? x?.name ?? "") === String(s?.servizio ?? s?.name ?? "") &&
              String(x?.descrizione ?? x?.desc ?? "") === String(s?.descrizione ?? s?.desc ?? "") &&
              (parseFloat(x?.importo ?? x?.amount ?? 0) || 0) === (parseFloat(s?.importo ?? s?.amount ?? 0) || 0) &&
              (parseFloat(x?.qty ?? 1) || 1) === (parseFloat(s?.qty ?? 1) || 1)
            );
          }
          if (idx >= 0) all.splice(idx, 1);

          state.guestServicesItems = all;
          state.guestServicesComputedTotal = serviziComputeTotal(all);

          // se non c'è override manuale, aggiorna input con la somma
          if (!state.guestServicesManualOverride){
            const sIn = document.getElementById("guestServices");
            if (sIn) sIn.value = String(state.guestServicesComputedTotal || 0);
          }

          try { updateGuestRemaining(); } catch (_) {}
          try { renderServiziList(); } catch (_) {}

          // persisti subito (questa operazione, lato backend, riscrive l'elenco senza il servizio)
          await persistServiziForCurrentGuest();

          try{ __syncServiziToCurrentGuest(state.guestEditId); }catch(_){}
          try{ toast("Servizio eliminato"); }catch(_){}
        }catch(_){}
      });

      const amtEl = document.createElement("div");
      amtEl.className = "amt";
      amtEl.textContent = formatEUR(total);

      right.appendChild(amtEl);
      right.appendChild(delBtn);
      row.appendChild(right);
    } else {
      const amtEl = document.createElement("div");
      amtEl.className = "amt";
      amtEl.textContent = formatEUR(total);
      row.appendChild(amtEl);
    }

    body.appendChild(row);
  });
}



async function deleteServizioFromCurrentGuest(serviceIdx){
  try{
    if (String(state.guestMode || "").toLowerCase() !== "edit") return;
    const ospiteId = state.guestEditId;
    if (!ospiteId) return;

    const arr = Array.isArray(state.guestServicesItems) ? state.guestServicesItems : [];
    if (!arr.length) return;
    if (serviceIdx < 0 || serviceIdx >= arr.length) return;

    // Rimuovi subito in UI
    arr.splice(serviceIdx, 1);
    state.guestServicesItems = arr;
    state.guestServicesComputedTotal = serviziComputeTotal(arr);
    try{ state.guestServicesManualOverride = false; }catch(_){ }
    try{ applyServiziTotalsToUI({ servizi_totale: state.guestServicesComputedTotal }); }catch(_){ }
    try{ renderServiziList(); }catch(_){ }

    // Persisti (POST: backend cancella le righe del foglio per ospite e reinserisce le restanti)
    try{
      await persistServiziForCurrentGuest();
      try{ toast("Servizio eliminato"); }catch(_){ }
    }catch(err){
      // In caso di errore, ricarica dal backend per riallineare
      try{ state.guestServicesLoadedFor = null; state.guestServicesLoadedAt = 0; }catch(_){ }
      try{ await loadServiziForOspite({ id: ospiteId }); }catch(_){ }
      try{ renderServiziList(); }catch(_){ }
      try{ toast("Errore eliminazione servizio"); }catch(_){ }
    }
  }catch(_){}
}

async function loadServiziForOspite(ospite){
  const ospiteId = guestIdOf(ospite) || state.guestEditId;
  if (!ospiteId) return;

  // Cache immediata: l'elenco può aprirsi istantaneamente anche prima della risposta API
  try{
    const key = String(ospiteId);
    const cache = state.guestServicesCacheById ? state.guestServicesCacheById[key] : null;
    if (cache && Array.isArray(cache.items)){
      const needApply = (state.guestServicesLoadedFor !== ospiteId);
      if (needApply){
        state.guestServicesItems = cache.items.slice();
        state.guestServicesComputedTotal = isFinite(cache.total) ? cache.total : serviziComputeTotal(state.guestServicesItems);
        state.guestServicesLoadedFor = ospiteId;
        state.guestServicesLoadedAt = cache.loadedAt || 0;
        try { applyServiziTotalsToUI(ospite); } catch (_) {}
        try { __syncServiziToCurrentGuest(ospiteId); } catch (_) {}
      }
    }
  }catch(_){}


  // evita richieste duplicate contemporanee ma NON bloccare i retry
  if (state.guestServicesLoadingFor === ospiteId) return;

  // se abbiamo già caricato di recente, riusa (ma in view aprendo la lista vogliamo dati freschi)
  const loadedSame = (state.guestServicesLoadedFor === ospiteId);
  const loadedAt = state.guestServicesLoadedAt || 0;
  const ageMs = Date.now() - loadedAt;

  const mode = String(state.guestMode || "").toLowerCase();
  const allowReuse = loadedSame && ageMs < 4000; // riuso ultra-breve per evitare doppie chiamate sul cambio modalità

  if (allowReuse){
    try { applyServiziTotalsToUI(ospite); } catch (_) {}
    try { __syncServiziToCurrentGuest(ospiteId); } catch (_) {}
    return;
  }

  state.guestServicesLoadingFor = ospiteId;

  let items = null;
  try{
    const res = await api("servizi", { method: "GET", params: { ospite_id: ospiteId }, showLoader: false });
    items = normalizeServiziResponse(res);
  }catch(_){
    items = null; // forza retry al prossimo tentativo
  }

  // Solo se abbiamo ottenuto una risposta valida aggiorniamo 'loadedFor'
  if (items !== null){
    state.guestServicesItems = Array.isArray(items) ? items : [];
    state.guestServicesComputedTotal = serviziComputeTotal(state.guestServicesItems);
    state.guestServicesLoadedFor = ospiteId;
    state.guestServicesLoadedAt = Date.now();
    try{
      const key = String(ospiteId);
      if (!state.guestServicesCacheById) state.guestServicesCacheById = {};
      state.guestServicesCacheById[key] = {
        items: (state.guestServicesItems || []).slice(),
        total: (state.guestServicesComputedTotal || 0),
        loadedAt: (state.guestServicesLoadedAt || Date.now())
      };
    }catch(_){}
    try { applyServiziTotalsToUI(ospite); } catch (_) {}
  } else {
    // non segnare come caricato → al prossimo tap riprova
    try { state.guestServicesLoadedFor = null; } catch (_) {}
  }

  state.guestServicesLoadingFor = null;
}

function applyServiziTotalsToUI(ospite){
  const input = document.getElementById("guestServices");
  if (!input) return;

  // default: se esiste override in ospite.servizi_totale, usalo; altrimenti somma
  const sheetOverride = parseFloat(ospite?.servizi_totale ?? ospite?.serviziTotal ?? ospite?.importo_servizi ?? "") ;
  const hasOverride = isFinite(sheetOverride);
  const base = hasOverride ? sheetOverride : (state.guestServicesComputedTotal || 0);

  // in edit: se l'utente ha già modificato a mano, non sovrascrivere
  const isEdit = String(state.guestMode || "").toLowerCase() === "edit";
  if (isEdit && state.guestServicesManualOverride) {
    // non toccare il valore digitato dall'utente
  } else {
    input.value = (isFinite(base) ? String(base) : "0");
  }

  try { updateGuestRemaining(); } catch (_) {}

  // aggiorna dropdown se visibile
  try { renderServiziList(); } catch (_) {}
}

function __syncServiziToCurrentGuest(ospiteId){
  const id = String(ospiteId||"").trim();
  if (!id) return;
  const computed = (state.guestServicesComputedTotal || 0);
  const preview = serviziPreviewText(state.guestServicesItems || []);
  // aggiorna oggetto ospite in view
  try{
    if (state.guestViewItem && String(state.guestViewItem.id||"") === id){
      state.guestViewItem.servizi_totale = computed;
      state.guestViewItem.servizi_preview = preview;
    }
  }catch(_){}
  // aggiorna lista ospiti in memoria (se presente)
  try{
    if (Array.isArray(state.guests)){
      const g = state.guests.find(x => String(x?.id||"") === id);
      if (g){
        g.servizi_totale = computed;
        g.servizi_preview = preview;
      }
    }
  }catch(_){}
}

async function persistServiziForCurrentGuest(){
  const ospiteId = state.guestEditId;
  if (!ospiteId) return;

  const items = (state.guestServicesItems || []).filter(s => {
    const del = s?.isDeleted ?? s?.is_deleted ?? s?.deleted;
    return !(String(del) === "1" || del === true);
  }).map(s => ({
    servizio: String(s.servizio ?? s.name ?? "").trim(),
    descrizione: String(s.descrizione ?? s.desc ?? "").trim(),
    importo: parseFloat(s.importo ?? s.amount ?? 0) || 0,
    qty: parseFloat(s.qty ?? 1) || 1
  }));

  try{
    await api("servizi", { method: "POST", body: { ospite_id: ospiteId, servizi: items } });

    // aggiorna cache locale immediatamente per evitare flicker (comparsa/scomparsa/ricomparsa)
    try{
      const key = String(ospiteId);
      if (!state.guestServicesCacheById) state.guestServicesCacheById = {};
      state.guestServicesCacheById[key] = {
        items: (state.guestServicesItems || []).slice(),
        total: (state.guestServicesComputedTotal || serviziComputeTotal(state.guestServicesItems || [])),
        loadedAt: Date.now()
      };
    }catch(_){}

  

    // dopo persistenza: forza reload dal backend e sincronizza il totale in UI (anche in sola lettura)
    try{ state.guestServicesLoadedFor = null; state.guestServicesLoadedAt = 0; }catch(_){ }
    try{ await loadServiziForOspite({ id: ospiteId }); }catch(_){ }
    try{ __syncServiziToCurrentGuest(ospiteId); }catch(_){ }
}catch(_){}
}

function serviziAddLocal({ servizio, descrizione, importo }){
  const row = {
    id: genId("sv"),
    ospite_id: state.guestEditId,
    servizio: servizio,
    descrizione: descrizione,
    importo: importo,
    qty: 1,
    isDeleted: ""
  };
  state.guestServicesItems = state.guestServicesItems || [];
  state.guestServicesItems.push(row);
  state.guestServicesComputedTotal = serviziComputeTotal(state.guestServicesItems);
}

/* bind UI */
function initServiziUI(){
  const pillView = document.getElementById("servicesPillView");
  const pillEdit = document.getElementById("servicesPillEdit");
  const wrap = document.getElementById("servicesListWrap");

  const modal = document.getElementById("servicesModal");
  const closeBtn = document.getElementById("servicesModalClose");
  const btnCancel = document.getElementById("svcCancel");
  const btnSave = document.getElementById("svcSave");
  const inName = document.getElementById("svcName");
  const inAmt = document.getElementById("svcAmount");
  const servicesInput = document.getElementById("guestServices");

  const openModal = () => {
    if (!modal) return;
    // solo in edit
    if (String(state.guestMode || "").toLowerCase() !== "edit") return;
    modal.hidden = false;
    try{ modal.setAttribute("aria-hidden", "false"); }catch(_){}
    try{ inName && inName.focus(); }catch(_){}
  };
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    try{ modal.setAttribute("aria-hidden", "true"); }catch(_){}
  };
  const clearModal = () => {
    if (inName) inName.value = "";
    if (inAmt) inAmt.value = "";
    try { refreshFloatingLabels(); } catch (_) {}
  };

  const canToggle = () => {
    const m = String(state.guestMode || "").toLowerCase();
    return (m === "view" || m === "edit");
  };

  const toggleList = () => {
    if (!canToggle()) return;
    if (!wrap) return;

    const willShow = !!wrap.hidden;
    wrap.hidden = !willShow;

    if (!willShow) return;

    // Apertura istantanea: primo paint subito, poi caricamento in background
    const raf = (cb) => {
      try{
        const w = (typeof window !== "undefined") ? window : null;
        if (w && typeof w.requestAnimationFrame === "function") return w.requestAnimationFrame(cb);
      }catch(_){}
      return setTimeout(cb, 0);
    };

    raf(() => { try { renderServiziList(); } catch (_) {} });

    // fetch in background dopo il primo paint
    setTimeout(() => {
      try{
        const m = String(state.guestMode || "").toLowerCase();
        const target = (m === "view") ? state.guestViewItem : ({ id: state.guestEditId });
        Promise.resolve(loadServiziForOspite(target)).then(() => {
          raf(() => { try { renderServiziList(); } catch (_) {} });
        }).catch(() => {});
      }catch(_){}
    }, 0);
  };


  if (servicesInput){
    servicesInput.addEventListener("input", () => {
      if (String(state.guestMode || "").toLowerCase() === "edit") {
        state.guestServicesManualOverride = true;
      }
      try { updateGuestRemaining(); } catch (_) {}
    });
  }

  // + (aggiungi servizio): sempre in edit
  if (pillEdit) bindFastTap(pillEdit, openModal);
  // fallback open (iOS): assicura apertura anche se fastTap non intercetta
  if (pillEdit){
    try{
      pillEdit.addEventListener("click", (e)=>{ try{ e.preventDefault(); e.stopPropagation(); }catch(_){} openModal(); }, { passive:false });
      pillEdit.addEventListener("touchend", (e)=>{ try{ e.preventDefault(); e.stopPropagation(); }catch(_){} openModal(); }, { passive:false });
    }catch(_){}
  }

  if (closeBtn) bindFastTap(closeBtn, closeModal);
  if (btnCancel) bindFastTap(btnCancel, () => { clearModal(); });
  if (btnSave) bindFastTap(btnSave, async () => {
    if (!inName || !inAmt) return;
    const servizio = String(inName.value || "").trim();
    const importo = parseFloat(String(inAmt.value || "0").replace(",", ".")) || 0;
    if (!servizio) return toast("Inserisci il servizio");
    if (!isFinite(importo)) return toast("Importo non valido");

    serviziAddLocal({ servizio, descrizione: "", importo });
    // se non c'è override manuale, aggiorna input con la somma
    if (!state.guestServicesManualOverride){
      const sIn = document.getElementById("guestServices");
      if (sIn) sIn.value = String(state.guestServicesComputedTotal || 0);
    }
    try { updateGuestRemaining(); } catch (_) {}
    try { renderServiziList(); } catch (_) {}

    // persisti subito su sheet "servizi"
    await persistServiziForCurrentGuest();

    clearModal();
    closeModal();
  });

  if (modal) modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(); });

  // "Servizi" (tasto): apre/chiude elenco istantaneamente sia in VIEW sia in EDIT
  if (pillView) bindFastTap(pillView, toggleList);

  // fallback toggle (iOS): assicura apertura elenco ISTANTANEA (touchstart/pointerdown)
  if (pillView){
    let last = 0;
    const toggle = (e)=>{
      const now = Date.now();
      if (now - last < 250) return;
      last = now;
      try{ e && e.preventDefault && e.preventDefault(); }catch(_){}
      try{ e && e.stopPropagation && e.stopPropagation(); }catch(_){}
      toggleList();
    };
    try{
      pillView.addEventListener("touchstart", toggle, { passive:false });
      pillView.addEventListener("pointerdown", toggle, { passive:false });
      pillView.addEventListener("mousedown", toggle, { passive:false });
      pillView.addEventListener("click", toggle, { passive:false });
      pillView.addEventListener("touchend", toggle, { passive:false });
    }catch(_){}
  }

}


async function saveGuest(opts = {}){
  const name = (document.getElementById("guestName")?.value || "").trim();
  const telefono = (document.getElementById("guestPhone")?.value || "").trim();
  const email = (document.getElementById("guestEmail")?.value || "").trim();
  const adults = parseInt(document.getElementById("guestAdults")?.value || "0", 10) || 0;
  const kidsU10 = parseInt(document.getElementById("guestKidsU10")?.value || "0", 10) || 0;
  const checkIn = document.getElementById("guestCheckIn")?.value || "";
  const checkOut = document.getElementById("guestCheckOut")?.value || "";
  const total = parseFloat(document.getElementById("guestTotal")?.value || "0") || 0;
  const channelId = String(document.getElementById("guestChannel")?.value || "").trim();
  const channelItem = getChannelCatalogItemById(channelId);
  const channelCommissionPct = parseFloat(document.getElementById("guestChannelCommission")?.value || "0") || 0;
  const booking = parseFloat(document.getElementById("guestBooking")?.value || "0") || 0;
  const serviziTotale = parseFloat(document.getElementById("guestServices")?.value || "0") || 0;
  const deposit = parseFloat(document.getElementById("guestDeposit")?.value || "0") || 0;
  const saldoPagato = parseFloat(document.getElementById("guestSaldo")?.value || "0") || 0;
  const notes = String(document.getElementById("guestNotes")?.value || "").trim();
  const saldoTipo = state.guestSaldoType || "contante";
  const rooms = Array.from(state.guestRooms || [])
    .map(n => parseInt(n,10))
    .filter(n => Number.isFinite(n) && n>=1 && n<=getConfiguredRoomsCount(6))
    .sort((a,b)=>a-b);
  const depositType = state.guestDepositType || "contante";
  const matrimonio = !!(state.guestMarriage);
  const g = !!(state.guestGroup);
if (!name) return toast("Inserisci il nome");
  if (!channelItem) return toast("Seleziona il channel");
  const payload = {
    nome: name,
    telefono: telefono,
    email: email,
    adulti: adults,
    bambini_u10: kidsU10,
    check_in: checkIn,
    check_out: checkOut,
    importo_prenotazione: total,
    channel_id: channelItem ? String(channelItem.id) : "",
    channel_nome: channelItem ? String(channelItem.nome) : "",
    channel_colore: channelItem ? String(channelItem.colore) : "",
    channel_iniziale: channelItem ? String(channelItem.iniziale || __channelInitialFromName__(channelItem.nome)) : "",
    channel_commissione: Math.round(channelCommissionPct * 100) / 100,
    channel_commission_pct: Math.round(channelCommissionPct * 100) / 100,
    importo_booking: booking,
    servizi_totale: serviziTotale,
    servizi_preview: serviziPreviewText(state.guestServicesItems || []),
    acconto_importo: deposit,
    acconto_tipo: depositType,
    saldo_pagato: saldoPagato,
    saldo_tipo: saldoTipo,
    acconto_ricevuta: !!state.guestDepositReceipt,
    saldo_ricevuta: !!state.guestSaldoReceipt,
    saldo_ricevutain: !!state.guestSaldoReceipt,
    note: notes,
    notes: notes,
    nota: notes,
    matrimonio,
    g: g ? "1" : "",
    col_c: (state.guestColC ? "1" : ""),
    c: (state.guestColC ? "1" : ""),
    ps_registrato: state.guestPSRegistered ? "1" : "",
    istat_registrato: state.guestISTATRegistered ? "1" : "",
    stanze: JSON.stringify(rooms)
  };



  const isEdit = state.guestMode === "edit";
  if (isEdit){
    if (!state.guestEditId) return toast("ID ospite mancante");
    payload.id = state.guestEditId;
    // preserva la data di inserimento (non deve cambiare con le modifiche)
    const ca = state.guestEditCreatedAt;
    if (ca){
      payload.createdAt = ca;
      payload.created_at = ca;
    }
  }

  
  else {
    // CREATE: genera subito un ID stabile, così possiamo salvare le stanze al primo tentativo
    payload.id = payload.id || genId("o");
  }
// CREATE vs UPDATE (backend GAS: POST=create, PUT=update)
  const method = isEdit ? "PUT" : "POST";

  // Snapshot PRIMA di qualsiasi navigazione (showPage("ospiti") fa enterGuestCreateMode e può pulire lo stato)
  const ospiteId = payload.id;
  const stanzeSnap = buildArrayFromState();
  const snapOrig = isEdit ? (state.stanzeSnapshotOriginal || "") : "";

  let shouldSave = true;
  if (isEdit){
    try {
      const snapNow = JSON.stringify(stanzeSnap);
      shouldSave = (snapNow !== snapOrig);
    } catch (_) {
      shouldSave = true;
    }
  }

  const instantGoList = !!(opts && opts.instantGoList);
  if (instantGoList){
    // Naviga SUBITO alla guest list
    try { showPage("ospiti"); } catch (_) {}
  }

  const res = await api("ospiti", { method, body: payload });

  // stanze: backend gestisce POST e sovrascrive (deleteWhere + append)
  if (shouldSave){
    try { await api("stanze", { method:"POST", body: { ospite_id: ospiteId, stanze: stanzeSnap } }); } catch (_) {}
  }

  // servizi: salva elenco (se presente)
  try{
    if (Array.isArray(state.guestServicesItems) && state.guestServicesItems.length){
      await api("servizi", { method:"POST", body: { ospite_id: ospiteId, servizi: (state.guestServicesItems||[]).filter(s=>!(String(s?.isDeleted||s?.deleted||"" )==="1"||s?.isDeleted===true||s?.deleted===true)).map(s=>({ servizio:String(s.servizio??s.name??"").trim(), descrizione:String(s.descrizione??s.desc??"").trim(), importo: parseFloat(s.importo??s.amount??0)||0, qty: parseFloat(s.qty??1)||1 })) } });
    }
  }catch(_){ }

  // Invalida cache in-memory (ospiti/stanze) e forza refresh Calendario.
  // Questo evita che il calendario rimanga "stale" finche' non riavvii la PWA.
  try{ invalidateApiCache("ospiti|"); }catch(_){ }
  try{ invalidateApiCache("stanze|"); }catch(_){ }
  try{ if (state.calendar){ state.calendar.ready = false; state.calendar.rangeKey = ""; } }catch(_){ }

  if (instantGoList){
    // Sei già in lista: aggiorna appena possibile senza bloccare la UI
    try{
      loadOspiti({ ...(state.period || {}), force:true }).catch(e => toast(e.message));
    }catch(_){ }
    try{ __sfxSave(); }catch(_){ }
  toast(isEdit ? "Modifiche salvate" : "Ospite creato");
    return;
  }

  await loadOspiti({ ...(state.period || {}), force:true });
  try{ __sfxSave(); }catch(_){ }
  toast(isEdit ? "Modifiche salvate" : "Ospite creato");

  // Dopo salvataggio: torna sempre alla lista ospiti
  try { enterGuestCreateMode(); } catch (_) {}
  showPage("ospiti");
}


function setupOspite(){
  try{ bindGuestTapCounters(); }catch(_){ }

  const hb = document.getElementById("hamburgerBtnOspite");
  if (hb) hb.addEventListener("click", () => { hideLauncher(); showPage("home"); });

  // HOME: ricevute mancanti (solo in HOME)
  const btnRec = document.getElementById("homeReceiptsTop");
  if (btnRec) bindFastTap(btnRec, () => { openReceiptDueModal(); });

  const recClose = document.getElementById("receiptDueClose");
  if (recClose) bindFastTap(recClose, () => closeReceiptDueModal());
  const recModal = document.getElementById("receiptDueModal");
  if (recModal) recModal.addEventListener("click", (e)=>{ if (e.target === recModal) closeReceiptDueModal(); });

  // AMMINISTRATORE: popup dati + grafico
  const btnAdminInputsTop = document.getElementById("btnAdminInputsTop");
  if (btnAdminInputsTop) bindFastTap(btnAdminInputsTop, () => { openAdminInputsModal(); });
  const btnAdminChartTop = document.getElementById("btnAdminChartTop");
  if (btnAdminChartTop) bindFastTap(btnAdminChartTop, () => { openAdminChartModal(); });
  const adminInputsClose = document.getElementById("adminInputsClose");
  if (adminInputsClose) bindFastTap(adminInputsClose, () => closeAdminInputsModal());
  const adminChartClose = document.getElementById("adminChartClose");
  if (adminChartClose) bindFastTap(adminChartClose, () => closeAdminChartModal());
  const adminInputsModal = document.getElementById("adminInputsModal");
  if (adminInputsModal) adminInputsModal.addEventListener("click", (e)=>{ if (e.target === adminInputsModal) closeAdminInputsModal(); });
  const adminChartModal = document.getElementById("adminChartModal");
  if (adminChartModal) adminChartModal.addEventListener("click", (e)=>{ if (e.target === adminChartModal) closeAdminChartModal(); });

  // Azioni Scheda ospite (solo lettura): verde=indietro, giallo=modifica, rosso=elimina
  const hdActions = document.getElementById("ospiteHdActions");
  if (hdActions && !hdActions.__bound){
    hdActions.__bound = true;
    hdActions.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn || !hdActions.contains(btn) || btn.hidden) return;

      // Indaco: vai al calendario
      if (btn.hasAttribute("data-guest-cal")){
        // In sola lettura: apri il calendario centrato sulla stessa prenotazione
        try{
          const ciRaw = (document.getElementById("guestCheckIn")?.value || "").trim();
          const ci = ciRaw || (state.guestViewItem?.check_in || state.guestViewItem?.checkIn || "");
          if (ci){
            if (!state.calendar) state.calendar = { anchor: new Date(), ready: false, guests: [], rangeKey: "" };
            state.calendar.anchor = new Date(ci + "T00:00:00");
          }
        }catch(_){ }
        showPage("calendario");
        return;
      }

      // Verde: torna sempre alla lista ospiti (anche in Nuovo/Modifica)
      if (btn.hasAttribute("data-guest-back")){
        // pulisci contesto multi
        try{ state.guestGroupBookings = null; state.guestGroupActiveId = null; state.guestGroupKey = null; clearGuestMulti(); }catch(_){ }
        showPage("ospiti");
        return;
      }

      const mode = state.guestMode;
      const item = state.guestViewItem;

      // Giallo: dalla sola lettura passa a modifica
      if (btn.hasAttribute("data-guest-edit")){
        if (!item) return;
        enterGuestEditMode(item);
        try { updateOspiteHdActions(); } catch (_) {}
        return;
      }

      // Rosso: elimina (solo in sola lettura o modifica)
      if (btn.hasAttribute("data-guest-del")){
        let gid = null;

        if (mode === "view"){
          if (!item) return;
          gid = guestIdOf(item) || item.id;
        } else if (mode === "edit"){
          gid = state.guestEditId || null;
        }

        if (!gid) return;

        // In sola lettura: se esistono più prenotazioni per lo stesso ospite, elimina TUTTI i gruppi contemporaneamente
        let idsToDelete = [String(gid)];
        try{
          if (mode === "view"){
            // 1) se abbiamo contesto multi gia' in memoria (aperto da lista), usalo
            if (Array.isArray(state.guestGroupBookings) && state.guestGroupBookings.length){
              const all = state.guestGroupBookings
                .map(b => String(guestIdOf(b) || b?.id || "").trim())
                .filter(Boolean);
              if (all.length && all.includes(String(gid))) idsToDelete = Array.from(new Set(all));
            }

            // 2) fallback: ricostruisci gruppo dal dataset corrente (utile se aperto dal calendario)
            if (!idsToDelete || idsToDelete.length <= 1){
              const itemsNow = Array.isArray(state.ospiti) && state.ospiti.length ? state.ospiti : (Array.isArray(state.guests) ? state.guests : []);
              const nm = String(item?.nome ?? item?.name ?? item?.Nome ?? "").trim();
              const key = normalizeGuestNameKey(nm);
              if (key){
                const groups = groupGuestsByName(itemsNow || []);
                const g = groups.find(x => String(x.key) === String(key));
                if (g && Array.isArray(g.bookings) && g.bookings.length){
                  const all2 = g.bookings.map(b => String(guestIdOf(b) || b?.id || "").trim()).filter(Boolean);
                  if (all2.length && all2.includes(String(gid))) idsToDelete = Array.from(new Set(all2));
                }
              }
            }
          }
        }catch(_){ idsToDelete = [String(gid)]; }

        const msg = (idsToDelete.length > 1)
          ? "Eliminare definitivamente questa prenotazione (tutti i gruppi)?"
          : "Eliminare definitivamente questo ospite?";
        if (!confirm(msg)) return;

        // ✅ dDAE_1.020: dopo cancellazione, vai SUBITO alla guest list (UX immediata su iOS)
        // 1) Navigazione istantanea + rimozione ottimistica dalla lista
        try{
          const idsSet = new Set((idsToDelete || []).map(x => String(x)));
          const keep = (o) => {
            const oid = String(guestIdOf(o) || o?.id || "").trim();
            return oid && !idsSet.has(oid);
          };
          if (Array.isArray(state.guests)) state.guests = state.guests.filter(keep);
          if (Array.isArray(state.ospiti)) state.ospiti = state.ospiti.filter(keep);
          try{
            const from = state?.period?.from || "";
            const to   = state?.period?.to   || "";
            if (from && to && Array.isArray(state.guests)){
              __lsSet(`ospiti|${from}|${to}`, state.guests);
            }
          }catch(_){ }
          try{ requestAnimationFrame(renderGuestCards); }catch(_){ try{ renderGuestCards(); }catch(_2){} }
        }catch(_){ }

        // pulisci contesto multi e reset form
        try{ state.guestGroupBookings = null; state.guestGroupActiveId = null; state.guestGroupKey = null; clearGuestMulti(); }catch(_){ }
        try{ enterGuestCreateMode(); }catch(_){ }

        // vai subito alla lista ospiti
        try{ showPage("ospiti"); }catch(_){ }

        // 2) Operazione reale in background (senza bloccare la UI)
        (async () => {
          try{
            for (const id of idsToDelete){
              await api("ospiti", { method:"DELETE", params:{ id }});
            }
            toast("Ospite eliminato");
            invalidateApiCache("ospiti|");
            invalidateApiCache("stanze|");
            try{ if (state.calendar){ state.calendar.ready = false; state.calendar.rangeKey = ""; } }catch(_){ }

            // refresh lista (SWR) — non blocca la navigazione
            try{ loadOspiti({ ...(state.period || {}), force:true }).catch(()=>{}); }catch(_){ }
          }catch(err){
            toast(err?.message || "Errore");
            try{ loadOspiti({ ...(state.period || {}), force:true }).catch(()=>{}); }catch(_){ }
          }
        })();

        return;
      }
    });
}

  // Selezione/Eliminazione prenotazione (multi) in modifica
  const multi = document.getElementById("guestMulti");
  if (multi && !multi.__bound){
    multi.__bound = true;
    multi.addEventListener("click", async (e) => {
      // Elimina singola prenotazione (solo il gruppo selezionato)
      const delBtn = e.target.closest("button[data-guest-del-booking]");
      if (delBtn && multi.contains(delBtn)){
        e.preventDefault();
        e.stopPropagation();
        const delId = String(delBtn.getAttribute("data-guest-del-booking") || "").trim();
        if (!delId) return;
        if (!confirm("Eliminare questa prenotazione?")) return;

        try{
          await api("ospiti", { method:"DELETE", params:{ id: delId }});
          toast("Prenotazione eliminata");
          invalidateApiCache("ospiti|");
          invalidateApiCache("stanze|");
          try{ if (state.calendar){ state.calendar.ready = false; state.calendar.rangeKey = ""; } }catch(_){ }

          // ricarica dati e ripristina contesto multi
          await loadOspiti({ ...(state.period || {}), force:true });

          const items = Array.isArray(state.ospiti) && state.ospiti.length ? state.ospiti : (Array.isArray(state.guests) ? state.guests : []);
          const groups = groupGuestsByName(items || []);

          const keyWanted = String(state.guestGroupKey || "").trim();
          let group = keyWanted ? groups.find(g => String(g.key) === keyWanted) : null;
          if (!group){
            // fallback: prova con il nome attuale nel form
            const nameNow = String(document.getElementById("guestName")?.value || "").trim();
            const nk = normalizeGuestNameKey(nameNow);
            group = groups.find(g => String(g.key) === nk);
          }

          if (group && Array.isArray(group.bookings) && group.bookings.length){
            state.guestGroupBookings = group.bookings;
            state.guestGroupKey = group.key;

            // Se abbiamo eliminato quella in modifica, passa alla prima disponibile
            const next = group.bookings.find(b => String(guestIdOf(b)) !== delId) || group.bookings[0];
            state.guestGroupActiveId = guestIdOf(next);
            enterGuestEditMode(next);
            showPage("ospite");
          } else {
            // non esiste piu' alcuna prenotazione per quel nome
            state.guestGroupBookings = null;
            state.guestGroupKey = null;
            state.guestGroupActiveId = null;
            try{ clearGuestMulti(); }catch(_){ }
            showPage("ospiti");
          }
        }catch(err){
          toast(err?.message || "Errore");
        }
        return;
      }

      // Aggiungi nuova prenotazione allo stesso ospite (tasto +)
      const addBtn = e.target.closest("button[data-guest-add-booking]");
      if (addBtn && multi.contains(addBtn)) {
        e.preventDefault();
        e.stopPropagation();

        const nameNow = (document.getElementById("guestName")?.value || "").trim();
        const phoneNow = (document.getElementById("guestPhone")?.value || "").trim();
        const emailNow = (document.getElementById("guestEmail")?.value || "").trim();
        const adultsNow = parseInt(document.getElementById("guestAdults")?.value || "0", 10) || 0;
        const kidsNow = parseInt(document.getElementById("guestKidsU10")?.value || "0", 10) || 0;
        const marriageNow = !!(state.guestMarriage);
        const groupNow = !!(state.guestGroup);

        const depTypeNow = state.guestDepositType || "contante";
        const saldoTypeNow = state.guestSaldoType || "contante";
        const psNow = !!state.guestPSRegistered;
        const istNow = !!state.guestISTATRegistered;

        // Passa a CREATE precompilato
        enterGuestCreateMode();
        state.guestCreateFromGroup = true;
        try { updateGuestPriceVisibility(); } catch (_) {}

        try {
          document.getElementById("guestName").value = nameNow;
          document.getElementById("guestPhone").value = phoneNow;
          document.getElementById("guestEmail").value = emailNow;
          document.getElementById("guestAdults").value = adultsNow;
          document.getElementById("guestKidsU10").value = kidsNow;
          setMarriage(marriageNow);
          setGroup(groupNow);

          state.guestDepositType = depTypeNow;
          setPayType("depositType", depTypeNow);
          state.guestSaldoType = saldoTypeNow;
          setPayType("saldoType", saldoTypeNow);

          state.guestPSRegistered = psNow;
          state.guestISTATRegistered = istNow;
          setRegFlags("regTags", psNow, istNow);

          refreshFloatingLabels();
        } catch (_) {}

        showPage("ospite");
        return;
      }

      // Seleziona prenotazione da modificare
      const btn = e.target.closest("button[data-guest-select]");
      if (!btn || !multi.contains(btn)) return;
      const id = String(btn.getAttribute("data-guest-select") || "").trim();
      if (!id) return;

      const list = Array.isArray(state.guestGroupBookings) ? state.guestGroupBookings : [];
      const target = list.find(x => String(guestIdOf(x)) === id);
      if (!target) return;

      state.guestGroupActiveId = id;
      enterGuestEditMode(target);
      // enterGuestEditMode renderizza gia' la lista in modalita' edit
    });
  }

  const notesToggle = document.getElementById("guestNotesToggle");
  if (notesToggle && !notesToggle.__bound){
    notesToggle.__bound = true;
    notesToggle.addEventListener("click", (e) => {
      try{ e.preventDefault(); }catch(_){ }
      const next = !document.getElementById("guestNotesWrap")?.hidden;
      setGuestNotesExpanded(!next);
    });
  }
  const notesField = document.getElementById("guestNotes");
  if (notesField && !notesField.__bound){
    notesField.__bound = true;
    notesField.addEventListener("input", () => { updateGuestNotesIndicator(); });
  }

  try{ ensureRoomsPickerButtons(); }catch(_){ }
  const roomsWrap = document.getElementById("roomsPicker");

  // Toggle M/G (ora accanto a Importo prenotazione)
  try{
    const mBtn = document.getElementById("roomMarriage");
    if (mBtn) mBtn.addEventListener("click", (ev)=>{ try{ ev.preventDefault(); }catch(_){} try{ ev.stopPropagation(); }catch(_){} setMarriage(!state.guestMarriage); });
    const gBtn = document.getElementById("roomGroup");
    if (gBtn) gBtn.addEventListener("click", (ev)=>{ try{ ev.preventDefault(); }catch(_){} try{ ev.stopPropagation(); }catch(_){} setGroup(!state.guestGroup); });
    const cBtn = document.getElementById("roomColC");
    if (cBtn) cBtn.addEventListener("click", (ev)=>{ try{ ev.preventDefault(); }catch(_){} try{ ev.stopPropagation(); }catch(_){} setColC(!state.guestColC); });
  }catch(_){}

  const roomsOut = null; // removed UI string output

  function _getGuestDateRange(){
    try{
      const ci = (document.getElementById("guestCheckIn")?.value || "").trim();
      const co = (document.getElementById("guestCheckOut")?.value || "").trim();
      if (!ci || !co) return null;
      // Date ISO YYYY-MM-DD: confronto lessicografico ok
      if (co <= ci) return null;
      return { ci, co };
    }catch(_){ return null; }
  }

  async function refreshRoomsAvailability(){
    // Regola: nessuna stanza selezionabile senza intervallo date valido
    const range = _getGuestDateRange();

    const editId = String(state.guestEditId || "").trim();

    // reset/lock
    if (!range){
      state.occupiedRooms = new Set();
      state._roomsAvailKey = "";
      // se l'utente non ha ancora inserito date, non deve poter selezionare stanze
      if (state.guestRooms && state.guestRooms.size){
        state.guestRooms.clear();
        if (state.lettiPerStanza) state.lettiPerStanza = {};
      }
      renderRooms();
      return;
    }

    const key = `${range.ci}|${range.co}|${editId}`;
    if (state._roomsAvailKey === key && state.occupiedRooms instanceof Set) {
      renderRooms();
      return;
    }
    state._roomsAvailKey = key;

    let rows = [];
    try{
      const data = await cachedGet("ospiti", {}, { showLoader:false, ttlMs: 15000 });
      rows = Array.isArray(data) ? data : [];
    }catch(_){ rows = []; }

    const occ = new Set();

    for (const g of rows){
      // In MODIFICA: ignora l'ospite corrente (altrimenti le sue stanze risultano occupate e diventano rosse)
      if (editId){
        const gid = guestIdOf(g);
        if (gid && gid === editId) continue;
      }

      const gi = String(g.check_in ?? g.checkIn ?? g.checkin ?? "").slice(0,10);
      const go = String(g.check_out ?? g.checkOut ?? g.checkout ?? "").slice(0,10);
      if (!gi || !go) continue;

      // overlap: [gi,go) interseca [ci,co)
      if (!(gi < range.co && go > range.ci)) continue;

      const roomsArr = _parseRoomsArr(g.stanze ?? g.rooms ?? g.stanza ?? "");
      roomsArr.forEach(r => occ.add(r));
    }

    state.occupiedRooms = occ;

    // Se l'utente aveva selezionato stanze che ora risultano occupate, le togliamo
    let removed = false;
    try{
      for (const r of Array.from(state.guestRooms || [])){
        if (occ.has(r)){
          state.guestRooms.delete(r);
          if (state.lettiPerStanza) delete state.lettiPerStanza[String(r)];
          removed = true;
        }
      }
    }catch(_){}

    if (removed){
      try{ toast("Alcune stanze non sono disponibili"); }catch(_){}
    }

    renderRooms();
  }

  function renderRooms(){
    const range = _getGuestDateRange();
    const locked = !range;
    const occSet = (state.occupiedRooms instanceof Set) ? state.occupiedRooms : new Set();

    roomsWrap?.querySelectorAll(".room-dot").forEach(btn => {
      // Il pallino "M" non è una stanza numerata
      if (btn.id === "roomMarriage" || btn.id === "roomGroup") return;

      const n = parseInt(btn.getAttribute("data-room"), 10);
      const on = state.guestRooms.has(n);
      const occ = !locked && occSet.has(n);

      btn.classList.toggle("selected", on);
      btn.classList.toggle("occupied", occ);

      const dis = locked || occ;
      btn.disabled = !!dis;
      btn.setAttribute("aria-disabled", dis ? "true" : "false");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    // matrimonio dot (rimane gestibile come flag)
    setMarriage(state.guestMarriage);
    setGroup(state.guestGroup);
  }

  // Espone le funzioni (scope setupOspite) per poterle richiamare da enterGuestEditMode
  // senza dipendere dall'evento input/change dei campi date (iOS/Safari PWA).
  try {
    window.__ddae_refreshRoomsAvailability = refreshRoomsAvailability;
    window.__ddae_renderRooms = renderRooms;
  } catch (_) {}

  // iOS/PWA: a volte, nei contenitori orizzontali, il target del tap puo' "slittare" sul pallino precedente.
  // Per evitare che una selezione multipla aggiunga la stanza sbagliata, scegliamo SEMPRE il pallino piu' vicino
  // alle coordinate reali del tap.
  function __pickRoomDotFromEvent(e){
    try{
      if (!roomsWrap) return null;
      // 1) coordinate (touch/pointer/mouse)
      let x = null, y = null;
      const te = e;
      if (te && te.changedTouches && te.changedTouches[0]){ x = te.changedTouches[0].clientX; y = te.changedTouches[0].clientY; }
      else if (te && te.touches && te.touches[0]){ x = te.touches[0].clientX; y = te.touches[0].clientY; }
      else if (typeof te.clientX === 'number'){ x = te.clientX; y = te.clientY; }

      // 2) fallback per tastiera: usa il closest normale
      if (x == null || y == null){
        const b0 = te?.target?.closest ? te.target.closest('.room-dot') : null;
        return b0 && roomsWrap.contains(b0) ? b0 : null;
      }

      // 3) trova il bottone piu' vicino al punto del tap
      const dots = Array.from(roomsWrap.querySelectorAll('.room-dot'));
      let best = null;
      let bestD = Infinity;
      for (const d of dots){
        if (!d) continue;
        const r = d.getBoundingClientRect();
        const cx = r.left + (r.width/2);
        const cy = r.top + (r.height/2);
        const dx = cx - x;
        const dy = cy - y;
        const dist = (dx*dx) + (dy*dy);
        if (dist < bestD){ bestD = dist; best = d; }
      }

      // se il tap e' molto lontano dai pallini, ignora
      if (!best) return null;
      return best;
    }catch(_){ return null; }
  }

  // Stanze:
  // - tap breve su stanza spenta => seleziona + apre popup letti
  // - tap breve su stanza accesa => apre popup letti (cambio tipologia)
  // - pressione lunga (>=0.5s) su stanza accesa => deseleziona (SENZA popup)
  let __roomPressTimer = null;
  let __roomPressBtn = null;
  let __roomLongFired = false;
  let __roomSuppressClickUntil = 0;

  function __room_now(){
    try{ return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
    catch(_){ return Date.now(); }
  }
  function __room_markSuppress(ms){
    try{ __roomSuppressClickUntil = __room_now() + (ms || 650); }catch(_){ }
  }
  function __room_isSuppressed(){
    try{ return __room_now() < __roomSuppressClickUntil; }catch(_){ return false; }
  }
  function __room_clearPress(){
    try{ if (__roomPressTimer){ clearTimeout(__roomPressTimer); } }catch(_){ }
    __roomPressTimer = null;
    __roomPressBtn = null;
    __roomLongFired = false;
  }

  function __room_getDotFromEvent(e){
    try{
      const b = __pickRoomDotFromEvent(e);
      if (!b) return null;
      if (!roomsWrap || !roomsWrap.contains(b)) return null;
      if (!b.classList || !b.classList.contains('room-dot')) return null;
      return b;
    }catch(_){ return null; }
  }

  function __room_canInteract(b){
    const range = _getGuestDateRange();
    if (!range){
      try{ toast('Seleziona prima check-in e check-out'); }catch(_){ }
      return false;
    }
    if (b.classList.contains('occupied') || b.disabled){
      try{ toast('Stanza occupata'); }catch(_){ }
      return false;
    }
    return true;
  }

  function __room_handleShortTap(b){
    // Matrimonio: flag separato
    if (b.id === 'roomMarriage') { setMarriage(!state.guestMarriage); return; }
    if (!__room_canInteract(b)) return;

    const n = parseInt(b.getAttribute('data-room'), 10);
    if (!isFinite(n)) return;

    // Se era spenta, accendi
    if (!state.guestRooms.has(n)) {
      state.guestRooms.add(n);
      renderRooms();
    }

    // Tap breve su stanza accesa/spenta => apre popup configurazione letti
    try{ openRoomConfig(n); }catch(_){ }
  }

  function __room_handleLongPress(b){
    // Matrimonio: nessun long-press
    if (b.id === 'roomMarriage' || b.id === 'roomGroup') return;
    if (!__room_canInteract(b)) return;

    const n = parseInt(b.getAttribute('data-room'), 10);
    if (!isFinite(n)) return;

    // Deselezione SOLO con pressione lunga e SOLO se era accesa
    if (state.guestRooms.has(n)) {
      state.guestRooms.delete(n);
      if (state.lettiPerStanza) delete state.lettiPerStanza[String(n)];
      renderRooms();

      // Se il popup era aperto su questa stanza, chiudilo
      try{
        if (typeof __rc_room !== 'undefined' && String(__rc_room) === String(n)){
          const m = document.getElementById('roomConfigModal');
          if (m) m.hidden = true;
          try{ __rc_room = null; }catch(_){ }
        }
      }catch(_){ }
    }
  }

  function __room_onPressStart(e){
    const b = __room_getDotFromEvent(e);
    if (!b) return;

    // Evita click "fantasma" dopo touch/pointer
    __room_markSuppress(900);

    // Evita callout/scroll strani su iOS durante pressione lunga
    try{ e.preventDefault(); }catch(_){ }

    __room_clearPress();
    __roomPressBtn = b;

    __roomPressTimer = setTimeout(() => {
      __roomLongFired = true;
      __room_handleLongPress(b);
    }, 500);
  }

  function __room_onPressEnd(e){
    if (!__roomPressBtn) return;
    const b = __roomPressBtn;
    const wasLong = __roomLongFired;

    __room_clearPress();

    // Sopprimi click generato da touchend
    __room_markSuppress(900);
    try{ e.preventDefault(); }catch(_){ }

    if (wasLong) return;
    __room_handleShortTap(b);
  }

  function __room_onPressCancel(_e){
    __room_clearPress();
  }

  // Pointer events (preferiti) + fallback touch/mouse
  try{
    if (window.PointerEvent) {
      roomsWrap?.addEventListener('pointerdown', __room_onPressStart, { passive:false });
      roomsWrap?.addEventListener('pointerup', __room_onPressEnd, { passive:false });
      roomsWrap?.addEventListener('pointercancel', __room_onPressCancel, { passive:true });
    } else {
      roomsWrap?.addEventListener('touchstart', __room_onPressStart, { passive:false });
      roomsWrap?.addEventListener('touchend', __room_onPressEnd, { passive:false });
      roomsWrap?.addEventListener('touchcancel', __room_onPressCancel, { passive:true });
      roomsWrap?.addEventListener('mousedown', __room_onPressStart, { passive:false });
      roomsWrap?.addEventListener('mouseup', __room_onPressEnd, { passive:false });
    }
  }catch(_){ }

  // Click (tastiera/desktop). Ignorato se appena gestito da touch/pointer.
  roomsWrap?.addEventListener('click', (e) => {
    if (__room_isSuppressed()) return;
    const b = __room_getDotFromEvent(e);
    if (!b) return;
    __room_handleShortTap(b);
  });

  function bindPayPill(containerId, kind){
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".pay-dot");
      if (!btn || !wrap.contains(btn)) return;

      const t = btn.getAttribute("data-type");
      if (t) {
        if (kind === "deposit") state.guestDepositType = t;
        if (kind === "saldo") state.guestSaldoType = t;
        setPayType(containerId, t);
        return;
      }

      if (btn.hasAttribute("data-receipt")) {
        if (kind === "deposit") state.guestDepositReceipt = !state.guestDepositReceipt;
        if (kind === "saldo") state.guestSaldoReceipt = !state.guestSaldoReceipt;
        setPayReceipt(containerId, kind === "deposit" ? state.guestDepositReceipt : state.guestSaldoReceipt);
        return;
      }
    });
  }

  bindPayPill("depositType", "deposit");
  bindPayPill("saldoType", "saldo");



  function bindRegPill(containerId){
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest('.pay-dot[data-flag]');
      if (!btn || !wrap.contains(btn)) return;

      const flag = (btn.getAttribute("data-flag") || "").toLowerCase();
      if (flag === "ps") state.guestPSRegistered = !state.guestPSRegistered;
      if (flag === "istat") state.guestISTATRegistered = !state.guestISTATRegistered;

      setRegFlags(containerId, state.guestPSRegistered, state.guestISTATRegistered);
    });
  }

  bindRegPill("regTags");

  const guestChannelSel = document.getElementById("guestChannel");
  if (guestChannelSel && !guestChannelSel.__boundChannel){
    guestChannelSel.__boundChannel = true;
    guestChannelSel.addEventListener("change", () => { try{ applySelectedChannelToGuestForm(guestChannelSel.value); }catch(_){ } });
  }
  try{ populateGuestChannelOptions(); }catch(_){ }

  // Rimanenza da pagare (Importo prenotazione - Acconto - Saldo)
  ["guestTotal","guestServices","guestDeposit","guestSaldo"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      try { if (id === "guestTotal") recalcGuestCommission(); } catch (_) {}
      try { updateGuestRemaining(); } catch (_) {}
    });
    el.addEventListener("change", () => {
      try { if (id === "guestTotal") recalcGuestCommission(); } catch (_) {}
      try { updateGuestRemaining(); } catch (_) {}
    });
  });
  try { recalcGuestCommission(); } catch (_) {}
  try { updateGuestRemaining(); } catch (_) {}


  // ✅ Stanze: blocca selezione finché non c'è un intervallo date valido + segna stanze occupate (rosso)
  ["guestCheckIn","guestCheckOut"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => { try { refreshRoomsAvailability(); } catch (_) {} });
    el.addEventListener("change", () => { try { refreshRoomsAvailability(); } catch (_) {} });
  });
  try { refreshRoomsAvailability(); } catch (_) {}


  const btnCreate = document.getElementById("createGuestCard");
  btnCreate?.addEventListener("click", () => {
    try {
      // Richiesta: al tap su Salva/Crea, vai SUBITO alla guest list.
      // saveGuest gestisce la navigazione immediata e prosegue il salvataggio in background.
      Promise.resolve(saveGuest({ instantGoList: true }))
        .catch((e) => { try { toast(e?.message || "Errore"); } catch (_) {} });
    } catch (e) {
      try { toast(e?.message || "Errore"); } catch (_) {}
    }
  });

  // Default: check-in oggi (solo UI)
  const today = new Date();
  const iso = today.toISOString().slice(0,10);
  const ci = document.getElementById("guestCheckIn");
  if (ci && !ci.value) ci.value = iso;

  renderRooms();
  renderGuestCards();
}

function euro(n){
  try { return (Number(n)||0).toLocaleString(__getCurrentLocale__(), { style:"currency", currency:"EUR" }); }
  catch { return (Number(n)||0).toFixed(2) + " €"; }
}

function groupGuestsByName(items){
  const map = new Map();
  for (const it of (items || [])){
    const rawName = it?.nome ?? it?.name ?? "";
    const display = collapseSpaces(String(rawName || "").trim()) || "Ospite";
    const key0 = normalizeGuestNameKey(display);
    const key = key0 || (`__guest__${guestIdOf(it) || Math.random().toString(16).slice(2)}`);
    let g = map.get(key);
    if (!g){
      g = { key, nome: display, bookings: [] };
      map.set(key, g);
    }
    g.bookings.push(it);
  }

  const groups = Array.from(map.values());
  for (const g of groups){
    // Ordina le prenotazioni nello stesso gruppo: per arrivo, poi per inserimento
    g.bookings = g.bookings.slice().sort((a,b) => {
      const ta = parseDateTs(a?.check_in ?? a?.checkIn);
      const tb = parseDateTs(b?.check_in ?? b?.checkIn);
      if (ta == null && tb == null){
        return (Number(a?._insNo) || 1e18) - (Number(b?._insNo) || 1e18);
      }
      if (ta == null) return 1;
      if (tb == null) return -1;
      if (ta !== tb) return ta - tb;
      return (Number(a?._insNo) || 1e18) - (Number(b?._insNo) || 1e18);
    });

    // Chiavi di ordinamento a livello gruppo
    const ins = g.bookings.map(x => Number(x?._insNo) || 1e18);
    g._insNo = Math.min.apply(null, ins.length ? ins : [1e18]);
    const arrTs = g.bookings.map(x => parseDateTs(x?.check_in ?? x?.checkIn)).filter(t => t != null);
    g._arrivoTs = arrTs.length ? Math.min.apply(null, arrTs) : null;
  }
  return groups;
}

function sortGuestGroups(groups){
  const by = state.guestSortBy || "arrivo";
  const dir = (state.guestSortDir === "desc") ? -1 : 1;
  const nameKey = (s) => normalizeGuestNameKey(s);

  const out = (groups || []).slice();
  out.sort((a,b) => {
    if (by === "nome"){
      return nameKey(a?.nome).localeCompare(nameKey(b?.nome), "it") * dir;
    }
    if (by === "inserimento"){
      const aa = Number(a?._insNo) || 1e18;
      const bb = Number(b?._insNo) || 1e18;
      return (aa - bb) * dir;
    }
    const ta = (a?._arrivoTs == null) ? null : Number(a._arrivoTs);
    const tb = (b?._arrivoTs == null) ? null : Number(b._arrivoTs);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return (ta - tb) * dir;
  });
  return out;
}



function renderGuestCards(){
  const wrap = document.getElementById("guestCards");
  if (!wrap) return;
  wrap.hidden = false;
  wrap.replaceChildren();

  const frag = document.createDocumentFragment();

  let items = Array.isArray(state.ospiti) && state.ospiti.length
    ? state.ospiti
    : (Array.isArray(state.guests) ? state.guests : []);

  // Filtro per anno di esercizio (obbligatorio, anche per la guest list)
  try{
    const y = state.exerciseYear || loadExerciseYear();
    items = __filterByExerciseYear__(items, y, [
      "check_in","checkIn","arrivo","dataArrivo","check_out","checkOut","partenza","dataPartenza",
      "createdAt","created_at","updatedAt","updated_at"
    ]);
  }catch(_){ }

  // Filtro rapido "Oggi": mostra solo ospiti con arrivo (check_in) = oggi
  if (state.guestTodayOnly){
    const today = todayISO();
    items = (items || []).filter(g => {
      const v = (g?.check_in ?? g?.checkIn ?? g?.arrivo ?? g?.arrival ?? g?.guestCheckIn ?? "");
      const s = String(v).trim();
      const d = s ? s.slice(0,10) : "";
      return d === today;
    });
  }


  if (!items.length){
    wrap.replaceChildren();
    const empty = document.createElement("div");
    empty.style.opacity = ".7";
    empty.style.fontSize = "14px";
    empty.style.padding = "8px";
    empty.textContent = state.guestTodayOnly ? "Nessun ospite per oggi." : "Nessun ospite nel periodo.";
    frag.appendChild(empty);
    wrap.appendChild(frag);
    return;
  }

  // Numero progressivo di inserimento (stabile)
  const insMap = computeInsertionMap(items);
  items.forEach((it) => {
    const id = guestIdOf(it);
    it._insNo = id ? insMap[id] : null;
  });

  // Guest list: una card unica per ospite/nome, anche se esistono più prenotazioni
  // o più gruppi di stanze. I dettagli della scheda mostrano poi i blocchi separati.
  let cards = groupGuestsByName(items || []).map((group) => {
    const bookings = Array.isArray(group?.bookings) ? group.bookings.slice() : [];
    const first = bookings[0] || null;
    if (!first) return null;
    const sourceInsNo = bookings
      .map(x => Number(x?._insNo) || null)
      .filter(x => x != null && x > 0)
      .sort((a,b)=>a-b)[0] || null;
    const arrTs = bookings
      .map(x => parseDateTs(x?.check_in ?? x?.checkIn))
      .filter(t => t != null)
      .sort((a,b)=>a-b)[0] ?? null;
    const hasNotes = bookings.some(x => guestHasNotes(x));
    return {
      ...first,
      nome: group?.nome || (String(first?.nome ?? first?.name ?? first?.guest ?? "").trim() || "Ospite"),
      _arrivoTs: arrTs,
      _insNo: sourceInsNo,
      _sourceInsNo: sourceInsNo,
      _groupBookings: bookings,
      _hasNotesAny: hasNotes
    };
  }).filter(Boolean);

  const cardsByInsertion = cards.slice().sort((a,b) => {
    const aa = Number(a?._sourceInsNo) || 1e18;
    const bb = Number(b?._sourceInsNo) || 1e18;
    if (aa !== bb) return aa - bb;
    const ta = (a?._arrivoTs == null) ? 1e18 : Number(a._arrivoTs);
    const tb = (b?._arrivoTs == null) ? 1e18 : Number(b._arrivoTs);
    if (ta !== tb) return ta - tb;
    return normalizeGuestNameKey(a?.nome).localeCompare(normalizeGuestNameKey(b?.nome), "it");
  });
  cardsByInsertion.forEach((card, idx) => {
    card._groupInsNo = idx + 1;
    card._insNo = idx + 1;
    card._displayInsNo = idx + 1;
  });

  cards = sortGuestGroups(cards);

  cards.forEach(first => {
    if (!first) return;

    // Evidenzia checkout oggi con pagamento in sospeso (rimanenza > 0)
    const __today = todayISO();
    const outISO = __parseDateFlexibleToISO(first?.check_out || first?.checkOut);
    const total = money(first?.importo_prenotazione ?? first?.importo_prenota ?? first?.total ?? 0);
    const services = money(first?.servizi_totale ?? first?.serviziTotal ?? first?.importo_servizi ?? 0);
    const dep = money(first?.acconto_importo ?? first?.accontoImporto ?? first?.deposit ?? 0);
    const saldo = money(first?.saldo_pagato ?? first?.saldoPagato ?? first?.saldo ?? 0);
    const remaining = (total + services) - dep - saldo;
    const __hasCheckoutPending = !!(outISO && outISO === __today && isFinite(remaining) && remaining > 0.0001);

    const card = document.createElement("div");
    card.className = "guest-card";
    if (__hasCheckoutPending) card.classList.add("checkout-pending");

    const nome = escapeHtml(first.nome || String(first?.name ?? first?.guest ?? "").trim() || "Ospite");

    const insNo = (Number(first._displayInsNo) && Number(first._displayInsNo) > 0 && Number(first._displayInsNo) < 1e18) ? Number(first._displayInsNo) : null;

    const led = guestLedStatus(first);

    const marriageOn = !!(first?.matrimonio);
    const hasNotes = !!(first?._hasNotesAny) || guestHasNotes(first);

    const arrivoText = formatLongDateIT(first.check_in || first.checkIn || "") || "—";

    const tel = escapeHtml(String(first?.telefono ?? first?.tel ?? first?.phone ?? "").trim());
    const em = escapeHtml(String(first?.email ?? first?.mail ?? "").trim());
    const channelBadge = getGuestChannelBadgeData(first);

    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Apri scheda ospite: ${nome}`);

    card.innerHTML = `
      <div class="guest-row guest-row-compact">
        <div class="guest-main">
          ${insNo ? `<span class="guest-insno${hasNotes ? ` has-notes` : ``}"${hasNotes ? ` aria-label="Note presenti" title="Note presenti"` : ``}>${insNo}</span>` : ``}
          <div class="guest-nameblock">
            <span class="guest-name-text">${nome}</span>
            <span class="guest-arrivo guest-arrivo-under" aria-label="Arrivo">${arrivoText}</span>
            ${((tel || em) ? `<span class="guest-contact" aria-label="Contatti">${[tel, em].filter(Boolean).join(" • ")}</span>` : ``)}
          </div>
        </div>
        <div class="guest-meta-right" aria-label="Stato">
          ${(channelBadge && channelBadge.name) ? `<span class="guest-channel-inline"><span class="guest-channel-dot color-${channelBadge.color}" aria-label="${escapeHtml(channelBadge.name)}" title="${escapeHtml(channelBadge.name)}"><span>${escapeHtml(channelBadge.initial)}</span></span></span>` : ``}
          ${marriageOn ? `<span class="marriage-dot" aria-label="Matrimonio">M</span>` : ``}
          ${(truthy(first?.g ?? first?.flag_g ?? first?.gruppo_g ?? first?.group ?? first?.g_flag) ? `<span class="g-dot" aria-label="G">G</span>` : ``)}
          ${(truthy(first?.col_c ?? first?.colC ?? first?.c ?? first?.C ?? first?.flag_c ?? first?.flagC ?? first?.colc ?? first?.c_flag) ? `<span class="c-dot" aria-label="C">C</span>` : ``)}
          <span class="guest-led ${led.cls}" aria-label="${led.label}" title="${led.label}"></span>
        </div>
      </div>
    `;

    const open = () => {
      const sameNameItems = Array.isArray(first?._groupBookings) && first._groupBookings.length
        ? {
            key: normalizeGuestNameKey(first?.nome || String(first?.name ?? first?.guest ?? "").trim() || ""),
            bookings: first._groupBookings
          }
        : groupGuestsByName(items || []).find(g => normalizeGuestNameKey(g?.nome) === normalizeGuestNameKey(first?.nome || String(first?.name ?? first?.guest ?? "").trim() || ""));
      if (sameNameItems && sameNameItems.bookings && sameNameItems.bookings.length > 1){
        state.guestGroupBookings = sameNameItems.bookings;
        state.guestGroupKey = sameNameItems.key;
        state.guestGroupActiveId = guestIdOf(first);
      } else {
        state.guestGroupBookings = null;
        state.guestGroupKey = null;
        state.guestGroupActiveId = null;
        try{ clearGuestMulti(); }catch(_){ }
      }
      enterGuestViewMode(first);
      showPage("ospite");
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    frag.appendChild(card);
  });
  wrap.appendChild(frag);
}








// =========================
// COLAZIONE (lista spesa)
// =========================

function __normBool01(v){
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "y") return 1;
  return 0;
}

function __colazioneAny(){
  try{ return Array.isArray(state.colazione.items) && state.colazione.items.filter(i=>!__normBool01(i.isDeleted)).length > 0; }catch(_){ return false; }
}

function updateProdottiHomeBlink(){
  const btn = document.getElementById("goProdotti");
  const any = (
    Array.isArray(state.colazione?.items) && state.colazione.items.some(i=>!__normBool01(i.isDeleted))
  ) || (
    Array.isArray(state.prodotti_pulizia?.items) && state.prodotti_pulizia.items.some(i=>!__normBool01(i.isDeleted))
  );
  if (btn) btn.classList.toggle("colazione-attn", !!any);

  // Topbar LED: acceso quando esiste almeno un prodotto "salvato" (pallino rosso)
  // nella relativa lista.
  try{
    const ledC = document.getElementById("prodLedColazione");
    const ledP = document.getElementById("prodLedPulizia");
    if (ledC && ledP){
      const anySavedIn = (arr) => {
        try{
          if (!Array.isArray(arr)) return false;
          return arr.some((i)=>{
            if (__normBool01(i?.isDeleted)) return false;
            const q = parseInt(String(i?.qty ?? 0), 10);
            const qty = isNaN(q) ? 0 : Math.max(0, q);
            return qty > 0;
          });
        }catch(_){ return false; }
      };
      const hasC = anySavedIn(state.colazione?.items);
      const hasP = anySavedIn(state.prodotti_pulizia?.items);
      ledC.classList.toggle("is-on", !!hasC);
      ledP.classList.toggle("is-on", !!hasP);
    }
  }catch(_){ }
}

function __freqKey_(action, id){
  const uid = String(state?.session?.user_id || "").trim();
  const yr = String(state?.exerciseYear || "").trim();
  return `freq:${uid}:${yr}:${String(action||"")}:${String(id||"")}`;
}

function getFreq_(action, id){
  try{
    const k = __freqKey_(action, id);
    state._freqCache = state._freqCache || {};
    if (k in state._freqCache) return state._freqCache[k];
    const v = parseInt(String(localStorage.getItem(k) || "0"), 10);
    const n = isNaN(v) ? 0 : Math.max(0, v);
    state._freqCache[k] = n;
    return n;
  }catch(_){ return 0; }
}

function incFreq_(action, id){
  try{
    const k = __freqKey_(action, id);
    const n = getFreq_(action, id) + 1;
    localStorage.setItem(k, String(n));
    state._freqCache = state._freqCache || {};
    state._freqCache[k] = n;
  }catch(_){ }
}

async function loadColazione({ force=false, showLoader=true } = {}){
  const s = state.colazione;
  const now = Date.now();
  const ttl = 20000;
  if (!force && s.loaded && (now - (s.loadedAt||0) < ttl)) {
    updateProdottiHomeBlink();
    return s.items || [];
  }
  const res = await api("colazione", { method:"GET", params:{}, showLoader });
  const rows = Array.isArray(res) ? res : (res && Array.isArray(res.rows) ? res.rows : (res && Array.isArray(res.data) ? res.data : []));
  s.items = (rows || []).filter(r => !__normBool01(r.isDeleted));
  // Normalizza qty/saved per coerenza multi-dispositivo (LED + pallini rossi)
  try{
    (s.items || []).forEach((it)=>{
      if (__normBool01(it?.isDeleted)) return;
      const n = parseInt(String(it?.qty ?? 0), 10);
      const q = isNaN(n) ? 0 : Math.max(0, n);
      it.qty = q;
      it.saved = q > 0 ? 1 : 0;
    });
  }catch(_){ }
  s.loaded = true;
  s.loadedAt = now;
  updateProdottiHomeBlink();
  return s.items;
}

function renderColazione(){
  const wrap = document.getElementById("colazioneList");
  if (!wrap) return;
  const items = (state.colazione.items || []).filter(r => !__normBool01(r.isDeleted));

  wrap.innerHTML = "";
  const frag = document.createDocumentFragment();

  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "colazione-item";
    row.dataset.id = String(it.id || "");

    const qtyBtn = document.createElement("button");
    qtyBtn.type = "button";
    qtyBtn.className = "colazione-dot colazione-qtydot";
    const draftQty = __prodDraftGetQty_(it.id);
    const hasDraft = (draftQty !== null && draftQty !== undefined);
    const qty = hasDraft ? parseInt(String(draftQty ?? 0), 10) : parseInt(String(it.qty ?? 0), 10);
    const q = (isNaN(qty) ? 0 : Math.max(0, qty));
    qtyBtn.textContent = q > 0 ? String(q) : "";

    const saved = hasDraft ? 0 : (q > 0 ? 1 : 0);
    qtyBtn.classList.toggle("is-saved", saved && q > 0);

    const text = document.createElement("div");
    text.className = "colazione-text";
    text.textContent = String(it.prodotto || "").trim();

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "colazione-dot colazione-checkdot";
    checkBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg>';
    checkBtn.classList.toggle("is-checked", __normBool01(it.checked) === 1);

    row.appendChild(qtyBtn);
    row.appendChild(text);
    row.appendChild(checkBtn);

    frag.appendChild(row);
  });

  wrap.appendChild(frag);
}


// =========================
// SPESA (Colazione + Prodotti)
// Modulo riscritto da zero per stabilità multi-dispositivo:
// - stato LED Home calcolato SEMPRE su liste caricate (loadSpesaAll)
// - tab Colazione/Prodotti indipendenti (draft separati)
// - Salva: UI immediata + sync backend in background + reload forzato
// =========================

// ---- UI key helpers ----
function __spesaEnsureUI_(){
  state.prodottiUI = state.prodottiUI || { list:"colazione" };
  const raw = String(state.prodottiUI.list || "colazione").toLowerCase();
  state.prodottiUI.list = (raw === "pulizia" || raw === "prodotti") ? "pulizia" : "colazione";
  return state.prodottiUI.list;
}

function __prodListKey_(){
  return __spesaEnsureUI_();
}

function __spesaActionByKey_(key){
  return (key === "pulizia") ? "prodotti_pulizia" : "colazione";
}

function __prodAction_(){
  return __spesaActionByKey_(__prodListKey_());
}

function __spesaBucketByKey_(key){
  return (key === "pulizia") ? state.prodotti_pulizia : state.colazione;
}

function __prodStateBucket_(){
  return __spesaBucketByKey_(__prodListKey_());
}

// ---- Draft (non persistito finché non premi SALVA) ----
function __spesaDraftEnsure_(){
  state._spesaDraft = state._spesaDraft || { colazione:{}, pulizia:{} };
  state._spesaDirty = state._spesaDirty || { colazione:{}, pulizia:{} };
  const key = __prodListKey_();
  state._spesaDraft[key] = state._spesaDraft[key] || {};
  state._spesaDirty[key] = state._spesaDirty[key] || {};
  return key;
}

function __prodDraftBucket_(){
  const key = __spesaDraftEnsure_();
  return state._spesaDraft[key];
}

function __prodDraftDirtyBucket_(){
  const key = __spesaDraftEnsure_();
  return state._spesaDirty[key];
}

function __prodDraftGetQty_(id){
  try{
    const sid = String(id||"");
    const b = __prodDraftBucket_();
    if (!b || !Object.prototype.hasOwnProperty.call(b, sid)) return null;
    return b[sid];
  }catch(_){ return null; }
}

function __prodDraftSetQty_(id, qty){
  try{
    const sid = String(id||"");
    const b = __prodDraftBucket_();
    const d = __prodDraftDirtyBucket_();
    if (!b || !d) return;
    const n = parseInt(String(qty ?? 0), 10);
    const q = isNaN(n) ? 0 : Math.max(0, n);
    b[sid] = q;
    d[sid] = 1;
  }catch(_){}
}

function __prodDraftClear_(){
  try{
    const key = __spesaDraftEnsure_();
    state._spesaDraft[key] = {};
    state._spesaDirty[key] = {};
  }catch(_){}
}

// ---- Data helpers ----
function __prodNameKey_(it){
  return String(it?.prodotto || it?.nome || "").trim().toLowerCase();
}

function __spesaNormalizeItem_(it){
  try{
    if (!it) return it;
    if (__normBool01(it.isDeleted)) return it;
    const n = parseInt(String(it.qty ?? 0), 10);
    const q = isNaN(n) ? 0 : Math.max(0, n);
    it.qty = q;
    it.saved = (q > 0) ? 1 : 0;
    it.checked = __normBool01(it.checked) ? 1 : 0;
  }catch(_){}
  return it;
}

// ---- Loaders ----
async function loadProdottiList_(action, bucket, { force=false, showLoader=true } = {}){
  const s = bucket;
  const now = Date.now();
  const ttl = 20000;
  if (!force && s.loaded && (now - (s.loadedAt||0) < ttl)) {
    updateProdottiHomeBlink();
    return s.items || [];
  }

  const res = await api(action, { method:"GET", params:{}, showLoader });
  const rows = Array.isArray(res) ? res : (res && Array.isArray(res.rows) ? res.rows : (res && Array.isArray(res.data) ? res.data : []));
  const items = (rows || []).filter(r => !__normBool01(r.isDeleted));
  items.forEach(__spesaNormalizeItem_);

  // Deduplica per nome prodotto (evita card duplicate) + cleanup backend (best-effort)
  try{
    const map = new Map();
    const dupIds = [];
    (items || []).forEach((it)=>{
      const k = __prodNameKey_(it);
      if (!k) return;
      if (!map.has(k)) { map.set(k, it); return; }
      // duplicato: tieni il primo, marca gli altri come deleted
      try{ if (it && it.id != null) dupIds.push(String(it.id)); }catch(_){}
    });
    const uniq = Array.from(map.values());
    // sostituisci in-place
    items.length = 0;
    uniq.forEach(x=>items.push(x));
    if (dupIds.length){
      // pulizia backend in background, senza bloccare UI
      Promise.all(dupIds.map((id)=>api(action, { method:"PUT", body:{ id:String(id), isDeleted:1, qty:0, saved:0, checked:0 }, showLoader:false })))
        .then(()=>{})
        .catch(()=>{});
    }
  }catch(_){}

  s.items = items;
  s.loaded = true;
  s.loadedAt = now;

  updateProdottiHomeBlink();
  return s.items;
}

async function loadProdotti({ force=false, showLoader=true } = {}){
  const key = __prodListKey_();
  const action = __spesaActionByKey_(key);
  const bucket = __spesaBucketByKey_(key);
  return loadProdottiList_(action, bucket, { force, showLoader });
}

// Carica SEMPRE entrambe le liste (serve per LED Home multi-dispositivo)
async function loadSpesaAll({ force=false, showLoader=true } = {}){
  await Promise.all([
    loadProdottiList_("colazione", state.colazione, { force, showLoader }),
    loadProdottiList_("prodotti_pulizia", state.prodotti_pulizia, { force, showLoader }),
  ]);
  updateProdottiHomeBlink();
  return true;
}

// ---- UI controls ----
function updateProdottiControls_(){
  try{
    const tabC = document.getElementById("prodTabColazione");
    const tabP = document.getElementById("prodTabPulizia");
    const key = __prodListKey_();
    if (tabC) tabC.classList.toggle("is-active", key === "colazione");
    if (tabP) tabP.classList.toggle("is-active", key === "pulizia");
  }catch(_){}
}

function renderProdotti(){
  const wrap = document.getElementById("prodottiList");
  if (!wrap) return;

  const bucket = __prodStateBucket_();
  const items = (bucket.items || []).filter(r => !__normBool01(r.isDeleted));

  let arr = items.slice();
  arr.sort((a,b)=> __prodNameKey_(a).localeCompare(__prodNameKey_(b), "it", { sensitivity:"base" }));

  wrap.innerHTML = "";
  const frag = document.createDocumentFragment();

  arr.forEach((it) => {
    const block = document.createElement("div");
    block.className = "prod-item-block";
    block.dataset.id = String(it.id || "");

    const row = document.createElement("div");
    row.className = "colazione-item";
    row.dataset.id = String(it.id || "");

    const qtyBtn = document.createElement("button");
    qtyBtn.type = "button";
    qtyBtn.className = "colazione-dot colazione-qtydot";

    const draftQty = __prodDraftGetQty_(it.id);
    const hasDraft = (draftQty !== null);
    const qtySrc = hasDraft ? draftQty : (it.qty ?? 0);
    const n = parseInt(String(qtySrc ?? 0), 10);
    const q = isNaN(n) ? 0 : Math.max(0, n);

    qtyBtn.textContent = q > 0 ? String(q) : "";
    // se NON c'è draft, mostra saved in base alla qty persistita
    const saved = hasDraft ? 0 : (q > 0 ? 1 : 0);
    qtyBtn.classList.toggle("is-saved", !!saved && q > 0);

    const text = document.createElement("div");
    text.className = "colazione-text";
    text.textContent = String(it.prodotto || it.nome || "").trim();

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "colazione-dot colazione-checkdot";
    checkBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg>';
    checkBtn.classList.toggle("is-checked", __normBool01(it.checked) === 1);

    row.appendChild(qtyBtn);
    row.appendChild(text);
    row.appendChild(checkBtn);

    block.appendChild(row);
    frag.appendChild(block);
  });

  wrap.appendChild(frag);
  updateProdottiControls_();
}

// ---- Setup & handlers ----
function setupProdotti(){
  const btnAdd = document.getElementById("prodAddBtn");
  const btnReset = document.getElementById("prodResetBtn");
  const list = document.getElementById("prodottiList");

  const tabC = document.getElementById("prodTabColazione");
  const tabP = document.getElementById("prodTabPulizia");

  const modal = document.getElementById("prodAddModal");
  const close = document.getElementById("prodAddClose");
  const input = document.getElementById("prodAddInput");
  const toC = document.getElementById("prodAddToColazione");
  const toP = document.getElementById("prodAddToPulizia");

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    try{ modal.setAttribute("aria-hidden", "false"); }catch(_){}
    try{ input && input.focus(); }catch(_){}
  };
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    try{ modal.setAttribute("aria-hidden", "true"); }catch(_){}
  };

  try{ __prodDraftClear_(); }catch(_){ }

  if (btnAdd) bindFastTap(btnAdd, openModal);
  if (close) bindFastTap(close, closeModal);
  if (modal) modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(); });

  const createItem = async (action) => {
    const raw = String(input?.value || "");
    const v = raw.trim();
    if (!v) return;
    const prodotto = v.toUpperCase();
    // Non permettere duplicati (un record unico: update/delete su id)
    try{
      const targetKey = (action === "prodotti_pulizia") ? "pulizia" : "colazione";
      const bucket = __spesaBucketByKey_(targetKey);
      if (!bucket.loaded) { try{ await loadProdottiList_(action, bucket, { force:false, showLoader:false }); }catch(_){ } }
      const key = String(prodotto).trim().toLowerCase();
      const exists = (bucket.items || []).some((it)=>{
        if (__normBool01(it?.isDeleted)) return false;
        return __prodNameKey_(it) === key;
      });
      if (exists){
        try{ toast("Prodotto già presente"); }catch(_){}
        if (input) input.value = "";
        closeModal();
        return;
      }
    }catch(_){}

    if (input) input.value = "";
    closeModal();
    try{
      await api(action, { method:"POST", body:{ op:"create", prodotto }, showLoader:true });
      // reload lista target
      if (action === "colazione") await loadProdottiList_("colazione", state.colazione, { force:true, showLoader:false });
      if (action === "prodotti_pulizia") await loadProdottiList_("prodotti_pulizia", state.prodotti_pulizia, { force:true, showLoader:false });
      renderProdotti();
      updateProdottiHomeBlink();
    }catch(e){ toast(e.message); }
  };

  if (toC) bindFastTap(toC, () => createItem("colazione"));
  if (toP) bindFastTap(toP, () => createItem("prodotti_pulizia"));
  if (input) input.addEventListener("keydown", (e)=>{ if (e.key === "Enter") { e.preventDefault(); createItem(__prodAction_()); } });

  if (tabC) bindFastTap(tabC, async () => {
    state.prodottiUI = state.prodottiUI || { list:"colazione" };
    state.prodottiUI.list = "colazione";
    await loadProdotti({ force:false, showLoader:true });
    renderProdotti();
  });

  if (tabP) bindFastTap(tabP, async () => {
    state.prodottiUI = state.prodottiUI || { list:"colazione" };
    state.prodottiUI.list = "pulizia";
    await loadProdotti({ force:false, showLoader:true });
    renderProdotti();
  });

  if (btnReset) bindFastTap(btnReset, async () => {
    const action = __prodAction_();
    const bucket = __prodStateBucket_();
    try{
      // UI immediata: azzera qty + checked e pulisci draft
      __prodDraftClear_();
      (bucket.items || []).forEach((it)=>{
        if (__normBool01(it?.isDeleted)) return;
        it.qty = 0;
        it.saved = 0;
        it.checked = 0;
        it.updatedAt = new Date().toISOString();
      });
      renderProdotti();
      updateProdottiHomeBlink();

      // backend (non bloccare)
      api(action, { method:"POST", body:{ op:"resetQty" }, showLoader:false })
        .then(() => loadProdotti({ force:true, showLoader:false }).then(()=>{ renderProdotti(); updateProdottiHomeBlink(); }).catch(()=>{}))
        .catch((e)=>{ try{ toast(e.message || "Errore"); }catch(_){ } });
    }catch(e){ toast(e.message); }
  });

  

  if (!list) return;

  const findItem = (id) => {
    const sid = String(id || "");
    return (__prodStateBucket_().items || []).find(x => String(x.id||"") === sid);
  };

  // Auto-save (0.5s) — nessun salvataggio manuale
  const __prodAuto__ = { timer:null, pending:{} };

  const __prodApplyLocal__ = (id, patch) => {
    const it = findItem(id);
    if (!it) return null;
    try{
      Object.assign(it, patch || {});
      __spesaNormalizeItem_(it);
      it.updatedAt = new Date().toISOString();
    }catch(_){}
    return it;
  };

  const __prodAutoCommit__ = async () => {
    try{
      if (__prodAuto__.timer){ clearTimeout(__prodAuto__.timer); __prodAuto__.timer = null; }
      const entries = Object.entries(__prodAuto__.pending || {});
      if (!entries.length) return;
      __prodAuto__.pending = {};

      const byAction = {};
      entries.forEach(([id, obj]) => {
        const act = String(obj?.action || __prodAction_() || "");
        if (!act) return;
        byAction[act] = byAction[act] || [];
        byAction[act].push({ id, patch: (obj && obj.patch) ? obj.patch : {} });
      });

      await Promise.all(
        Object.keys(byAction).flatMap((act) => (
          byAction[act].map(({id, patch}) => (
            api(act, { method:"PUT", body: Object.assign({ id:String(id) }, patch || {}), showLoader:false })
          ))
        ))
      );

      // refresh (LED + coerenza multi-dispositivo)
      try{ await loadSpesaAll({ force:true, showLoader:false }); }catch(_){}

      renderProdotti();
      updateProdottiHomeBlink();
    }catch(e){
      try{ toast(e.message || "Errore"); }catch(_){}
    }
  };

  const __prodAutoSchedule__ = (id, patch, { immediate=false } = {}) => {
    const sid = String(id || "");
    if (!sid) return;
    const action = __prodAction_();
    __prodAuto__.pending[sid] = __prodAuto__.pending[sid] || { action, patch:{} };
    __prodAuto__.pending[sid].action = action;
    __prodAuto__.pending[sid].patch = Object.assign(__prodAuto__.pending[sid].patch || {}, patch || {});

    if (__prodAuto__.timer){ clearTimeout(__prodAuto__.timer); __prodAuto__.timer = null; }
    if (immediate){
      __prodAutoCommit__();
    }else{
      __prodAuto__.timer = setTimeout(__prodAutoCommit__, 500);
    }
  };

  // Event delegation: qty / check

  // Qty dot: tap cycle, long-press (0.5s) azzera quantità
  let prodQtyTimer = null;
  let prodQtyTargetId = null;
  let prodQtyLongFired = false;
  let prodLastQtyTouch = 0;
  // Card: double-tap = elimina, long-press (0.5s) = azzera quantità
  let prodCardTimer = null;
  let prodCardTargetId = null;
  let prodCardLongFired = false;
  let prodCardLongFiredAt = 0;
  let prodCardLastTapAt = 0;
  let prodCardLastTapId = "";

  const clearProdCardPress = () => {
    if (prodCardTimer){ clearTimeout(prodCardTimer); prodCardTimer = null; }
    prodCardTargetId = null;
    prodCardLongFired = false;
  };

  const startProdCardPress = (id) => {
    clearProdCardPress();
    prodCardTargetId = id;
    prodCardTimer = setTimeout(() => {
      prodCardLongFired = true;
      prodCardLongFiredAt = Date.now();
      // Long press (0.5s) sulla card: svuota quantità (pallino)
      const base = getProdBaseQty(id);
      if (base > 0){
        __prodApplyLocal__(id, { qty: 0, saved: 0 });
        renderProdotti();
        updateProdottiHomeBlink();
        // il gesto dura già 0,5s → salva subito
        __prodAutoSchedule__(id, { qty: 0, saved: 0 }, { immediate:true });
      }
    }, 500);
  };



  const clearProdQtyPress = () => {
    if (prodQtyTimer){ clearTimeout(prodQtyTimer); prodQtyTimer = null; }
    prodQtyTargetId = null;
    prodQtyLongFired = false;
  };

  const getProdBaseQty = (id) => {
    const it = findItem(id);
    const n = parseInt(String(it?.qty ?? 0), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const cycleProdQty = (id) => {
    const it = findItem(id);
    if (!it) return;
    const base = getProdBaseQty(id);
    const next = (base >= 9) ? 0 : (base + 1);
    __prodApplyLocal__(id, { qty: next, saved: (next > 0 ? 1 : 0) });
    renderProdotti();
    updateProdottiHomeBlink();
    // memorizza automaticamente dopo 0,5s
    __prodAutoSchedule__(id, { qty: next, saved: (next > 0 ? 1 : 0) }, { immediate:false });
  };

  const startProdQtyPress = (id) => {
    clearProdQtyPress();
    prodQtyTargetId = id;
    prodQtyTimer = setTimeout(() => {
      prodQtyLongFired = true;
      // Long press (0.5s): svuota quantità (pallino)
      const base = getProdBaseQty(id);
      if (base > 0){
        try{ __sfxGlass(); }catch(_){ }
        __prodApplyLocal__(id, { qty: 0, saved: 0 });
        renderProdotti();
        updateProdottiHomeBlink();
        // il gesto dura già 0,5s → salva subito
        __prodAutoSchedule__(id, { qty: 0, saved: 0 }, { immediate:true });
      }
    }, 500);
  };

  // Delegation (touch): long-press su qtydot
  list.addEventListener("touchstart", (e) => {
    const row = e.target.closest && e.target.closest(".colazione-item");
    if (!row) return;
    const id = String(row.dataset.id || "");
    if (!id) return;

    if (e.target.closest && e.target.closest(".colazione-qtydot")) {
      prodLastQtyTouch = Date.now();
      startProdQtyPress(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Long-press sulla card (0,5s) → azzera quantità
    if (e.target.closest && (e.target.closest(".colazione-checkdot") || e.target.closest(".colazione-qtydot"))) return;
    startProdCardPress(id);
  }, { passive:false, capture:true });

  list.addEventListener("touchend", (e) => {
    const row = e.target.closest && e.target.closest(".colazione-item");
    const id = row ? String(row.dataset.id || "") : "";
    if (!id){
      clearProdQtyPress();
      clearProdCardPress();
      return;
    }

    if (e.target.closest && e.target.closest(".colazione-qtydot")) {
      if (prodQtyTimer){ clearTimeout(prodQtyTimer); prodQtyTimer = null; }
      if (!prodQtyLongFired) cycleProdQty(id);
      clearProdQtyPress();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const wasLong = !!prodCardLongFired;
    clearProdCardPress();
    if (wasLong){
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, { passive:false, capture:true });

  list.addEventListener("touchcancel", (e) => {
    clearProdQtyPress();
    clearProdCardPress();
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
  }, { passive:false, capture:true });


  list.addEventListener("click", (e) => {
    const t = e.target;
    const qtyBtn = t && t.closest ? t.closest(".colazione-qtydot") : null;
    const chkBtn = t && t.closest ? t.closest(".colazione-checkdot") : null;
    const row = t && t.closest ? t.closest(".colazione-item") : null;
    const id = row ? String(row.dataset.id || "") : "";
    if (!id) return;

    // ignore click subito dopo long-press
    if (Date.now() - prodCardLongFiredAt < 700){
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // qty: ciclo 0->1->2..->9->0 (auto-save 0,5s)
    if (qtyBtn){
      if (Date.now() - prodLastQtyTouch < 450) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault();
      cycleProdQty(id);
      return;
    }

    // check: toggle (auto-save 0,5s)
    if (chkBtn){
      e.preventDefault();
      const it = findItem(id);
      const cur = __normBool01(it?.checked) ? 1 : 0;
      const next = cur ? 0 : 1;
      __prodApplyLocal__(id, { checked: next });
      renderProdotti();
      updateProdottiHomeBlink();
      __prodAutoSchedule__(id, { checked: next }, { immediate:false });
      return;
    }

    // double click/tap sulla card: elimina la card
    const now = Date.now();
    if (prodCardLastTapId === id && (now - prodCardLastTapAt) < 350){
      e.preventDefault();
      prodCardLastTapId = "";
      prodCardLastTapAt = 0;

      __prodApplyLocal__(id, { isDeleted: 1, qty: 0, saved: 0, checked: 0 });
      renderProdotti();
      updateProdottiHomeBlink();
      __prodAutoSchedule__(id, { isDeleted: 1, qty: 0, saved: 0, checked: 0 }, { immediate:true });
      return;
    }
    prodCardLastTapId = id;
    prodCardLastTapAt = now;
  });

  // Prima render (se già caricato)
  updateProdottiControls_();
}





function setupColazione(){
  const input = document.getElementById("colazioneInput");
  const btnAdd = document.getElementById("colazioneAddBtn");
  const btnReset = document.getElementById("colazioneResetBtn");
  const btnSave = document.getElementById("colazioneSaveBtn");
  const list = document.getElementById("colazioneList");

  if (!input || !btnAdd || !btnReset || !btnSave || !list) return;

  const findItem = (id) => {
    const sid = String(id || "");
    return (state.colazione.items || []).find(x => String(x.id||"") === sid);
  };

  const patchItem = async (id, patch, {showLoader=false} = {}) => {
    const it = findItem(id);
    if (it) Object.assign(it, patch, { updatedAt: new Date().toISOString() });
    renderColazione();
    updateProdottiHomeBlink();
    await api("colazione", { method:"PUT", body: Object.assign({ id: String(id) }, patch), showLoader });
    try{ await loadColazione({ force:true, showLoader:false }); }catch(_){ }
    renderColazione();
    updateProdottiHomeBlink();
  };

  const addItem = async () => {
    const raw = String(input.value || "");
    const v = raw.trim();
    if (!v) return;
    const prodotto = v.toUpperCase();
    input.value = "";
    try{
      await api("colazione", { method:"POST", body:{ op:"create", prodotto }, showLoader:true });
      await loadColazione({ force:true, showLoader:false });
      renderColazione();
      updateProdottiHomeBlink();
      input.focus();
    }catch(e){
      toast(e.message);
    }
  };

  bindFastTap(btnAdd, addItem);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  });

  bindFastTap(btnReset, async () => {
    try{
      await api("colazione", { method:"POST", body:{ op:"resetQty" }, showLoader:true });
      await loadColazione({ force:true, showLoader:false });
      // reset locale qty/saved
      (state.colazione.items || []).forEach(it => { it.qty = 0; it.saved = 0; });
      renderColazione();
      updateProdottiHomeBlink();
    }catch(e){ toast(e.message); }
  });

  bindFastTap(btnSave, async () => {
    try{
      await api("colazione", { method:"POST", body:{ op:"save" }, showLoader:true });
      await loadColazione({ force:true, showLoader:false });
      renderColazione();
      updateProdottiHomeBlink();
    }catch(e){ toast(e.message); }
  });

  // Qty dot: tap increment, long-press (0.5s) reset qty only
  let qtyTimer = null;
  let qtyTargetId = null;
  let qtyLongFired = false;
  let lastQtyTouch = 0;

  const clearQtyPress = () => {
    if (qtyTimer){ clearTimeout(qtyTimer); qtyTimer = null; }
    qtyTargetId = null;
    qtyLongFired = false;
  };

  const startQtyPress = (id) => {
    clearQtyPress();
    qtyTargetId = id;
    qtyTimer = setTimeout(() => {
      qtyLongFired = true;
      try{ __sfxGlass(); }catch(_){ }
      patchItem(id, { qty: 0, saved: 0 }, { showLoader:false }).catch(()=>{});
    }, 500);
  };

  const tapQty = (id) => {
    try{ __sfxTap(); }catch(_){ }
    const it = findItem(id);
    const cur = parseInt(String(it?.qty ?? 0), 10);
    const next = (isNaN(cur) ? 0 : cur) + 1;
    patchItem(id, { qty: next, saved: 0 }, { showLoader:false }).catch(()=>{});
  };

  // Delete: long press 2s on text
  let delTimer = null;
  let delTargetId = null;
  let delFired = false;
  let lastDelTouch = 0;

  const clearDelPress = () => {
    if (delTimer){ clearTimeout(delTimer); delTimer = null; }
    delTargetId = null;
    delFired = false;
  };

  const startDelPress = (id) => {
    clearDelPress();
    delTargetId = id;
    delTimer = setTimeout(() => {
      delFired = true;
      try{ __sfxGlass(); }catch(_){ }
      patchItem(id, { isDeleted: 1, qty: 0, checked: 0, saved: 0 }, { showLoader:true }).catch(()=>{});
    }, 2000);
  };

  const toggleCheck = (id) => {
    try{ __sfxTap(); }catch(_){ }
    const it = findItem(id);
    const cur = __normBool01(it?.checked);
    patchItem(id, { checked: cur ? 0 : 1 }, { showLoader:false }).catch(()=>{});
  };

  // Delegation (touch)
  list.addEventListener("touchstart", (e) => {
    const row = e.target.closest && e.target.closest(".colazione-item");
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.closest && e.target.closest(".colazione-qtydot")) {
      lastQtyTouch = Date.now();
      startQtyPress(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.target.closest && e.target.closest(".colazione-text")) {
      lastDelTouch = Date.now();
      startDelPress(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, { passive:false, capture:true });

  list.addEventListener("touchend", (e) => {
    const row = e.target.closest && e.target.closest(".colazione-item");
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.closest && e.target.closest(".colazione-qtydot")) {
      if (qtyTimer){ clearTimeout(qtyTimer); qtyTimer = null; }
      if (!qtyLongFired) tapQty(id);
      clearQtyPress();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.target.closest && e.target.closest(".colazione-text")) {
      if (delTimer){ clearTimeout(delTimer); delTimer = null; }
      if (!delFired) {
        // niente tap sul testo
      }
      clearDelPress();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.target.closest && e.target.closest(".colazione-checkdot")) {
      toggleCheck(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, { passive:false, capture:true });

  list.addEventListener("touchcancel", (e) => {
    clearQtyPress();
    clearDelPress();
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
  }, { passive:false, capture:true });

  // Click (desktop) + anti ghost-click after touch
  list.addEventListener("click", (e) => {
    const row = e.target.closest && e.target.closest(".colazione-item");
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.closest && e.target.closest(".colazione-qtydot")) {
      if (Date.now() - lastQtyTouch < 450) { e.preventDefault(); e.stopPropagation(); return; }
      tapQty(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.target.closest && e.target.closest(".colazione-checkdot")) {
      if (Date.now() - lastDelTouch < 450) { e.preventDefault(); e.stopPropagation(); return; }
      toggleCheck(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, true);
}

function initFloatingLabels(){
  const fields = document.querySelectorAll(".field.float");
  fields.forEach((f) => {
    const control = f.querySelector("input, select, textarea");
    if (!control) return;
    const update = () => {
      const has = !!(control.value && String(control.value).trim().length);
      f.classList.toggle("has-value", has);
    };
    control.addEventListener("input", update);
    control.addEventListener("change", update);
    update();
  });
}


function refreshFloatingLabels(){
  try{
    document.querySelectorAll(".field.float").forEach(f => {
      const c = f.querySelector("input, select, textarea");
      const v = c ? String(c.value ?? "").trim() : "";
      f.classList.toggle("has-value", v.length > 0);
    });
  }catch(_){}
}



/* =========================
   Piscina (dDAE_1.020)
========================= */
const PISCINA_ACTION = "piscina";

function __pad2(n){ return String(n).padStart(2,"0"); }
function __isoDayLocal(d){
  try{
    const x = new Date(d);
    const y = x.getFullYear();
    const m = __pad2(x.getMonth()+1);
    const dd = __pad2(x.getDate());
    return `${y}-${m}-${dd}`;
  }catch(_){ return ""; }
}

function __capFirst(s){
  s = String(s||"");
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function __fmtItDateLong(d){
  try{
    const fmt = new Intl.DateTimeFormat("it-IT", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    return __capFirst(fmt.format(d));
  }catch(_){
    try{ return new Date(d).toLocaleDateString("it-IT"); }catch(__){ return ""; }
  }
}

function __fmtMonthYear(d){
  try{
    const fmt = new Intl.DateTimeFormat("it-IT", { month:"long", year:"numeric" });
    return __capFirst(fmt.format(d));
  }catch(_){
    const x = new Date(d);
    return `${x.getMonth()+1}/${x.getFullYear()}`;
  }
}

function __hash01(str){
  try{
    let h = 2166136261;
    const s = String(str||"");
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // to [0,1)
    return (h >>> 0) / 4294967296;
  }catch(_){ return Math.random(); }
}

function __dayOfYear(d){
  const x = new Date(d);
  const start = new Date(x.getFullYear(), 0, 0);
  const diff = x - start;
  return Math.floor(diff / 86400000);
}

function piscinaSimulateForDay(day){
  const uid = String(state?.session?.user_id || "u");
  const yr = String(state?.exerciseYear || new Date().getFullYear());
  const key = `${uid}|${yr}`;
  const h = __hash01(key);
  const phaseA = h * Math.PI * 2;
  const phaseB = __hash01(key+"b") * Math.PI * 2;

  const doy = __dayOfYear(day);
  const t = doy / 365;

  // Temperatura stagionale (Italia): inverno più bassa, estate più alta
  const tempBase = 20 + 6 * Math.sin(2*Math.PI*(t - 0.22)); // picco ~ estate
  const tempFine = 0.6 * Math.sin(2*Math.PI*(doy/14) + phaseA) + 0.4 * Math.sin(2*Math.PI*(doy/31) + phaseB);
  let temp = tempBase + tempFine;
  temp = Math.max(12, Math.min(30, temp));

  // Cloro libero (ottimale ~ 1.2–1.8)
  const clA = 1.5 + 0.18 * Math.sin(2*Math.PI*(doy/9) + phaseA) + 0.10 * Math.sin(2*Math.PI*(doy/21) + phaseB);
  let clLib = Math.max(1.20, Math.min(1.80, clA));

  // Cloro combinato (ottimale basso 0.0–0.3)
  const ccA = 0.12 + 0.05 * Math.sin(2*Math.PI*(doy/11) + phaseB) + 0.03 * Math.sin(2*Math.PI*(doy/27) + phaseA);
  let clComb = Math.max(0.00, Math.min(0.30, ccA));

  // pH (ottimale ~ 7.2–7.6)
  const phA = 7.4 + 0.10 * Math.sin(2*Math.PI*(doy/13) + phaseA) + 0.06 * Math.sin(2*Math.PI*(doy/33) + phaseB);
  let ph = Math.max(7.20, Math.min(7.60, phA));

  // arrotondamenti “da scheda”
  const round2 = (x)=>Math.round(x*100)/100;
  const round1 = (x)=>Math.round(x*10)/10;

  return {
    cloro_attivo_libero: round2(clLib),
    cloro_attivo_combinato: round2(clComb),
    ph: round2(ph),
    temp_acqua: round1(temp),
  };
}

function piscinaEnsureState(){
  if (!state._piscina) {
    state._piscina = {
      rows: [],
      fetchedAt: 0,
      viewMonth: null,
      byDay: {},
      monthKey: "",
    };
  }
  return state._piscina;
}

function piscinaIndexRows(){
  const s = piscinaEnsureState();
  const map = {};
  (s.rows||[]).forEach(r=>{
    const ts = r.timestamp_report || r.timestamp || r.ts || r.createdAt || r.created_at || "";
    const d = ts ? new Date(ts) : null;
    const dayKey = d && !isNaN(d) ? __isoDayLocal(d) : (r.data || r.date || "");
    if (!dayKey) return;
    // uno per giorno (se duplicati, prende il più recente)
    if (!map[dayKey]) { map[dayKey] = r; return; }
    try{
      const a = new Date(map[dayKey].timestamp_report || map[dayKey].createdAt || 0).getTime() || 0;
      const b = new Date(ts).getTime() || 0;
      if (b >= a) map[dayKey] = r;
    }catch(_){ map[dayKey] = r; }
  });
  s.byDay = map;
}

async function loadPiscinaAll({ force=false, showLoader=false } = {}){
  const s = piscinaEnsureState();
  if (!state?.session?.user_id) return [];
  const age = Date.now() - (s.fetchedAt || 0);
  if (!force && s.fetchedAt && age < 60*1000 && Array.isArray(s.rows)) return s.rows;

  const res = await api(PISCINA_ACTION, { method:"GET", showLoader: !!showLoader, params:{} });
  const rows = Array.isArray(res) ? res
    : (res && Array.isArray(res.data) ? res.data
    : (res && res.data && Array.isArray(res.data.data) ? res.data.data
    : (res && Array.isArray(res.rows) ? res.rows
    : [])));

  s.rows = rows || [];
  s.fetchedAt = Date.now();
  piscinaIndexRows();
  return s.rows;
}

function piscinaGetRowByDayKey(dayKey){
  const s = piscinaEnsureState();
  return s.byDay ? s.byDay[dayKey] : null;
}

function piscinaSetViewMonth(d){
  const s = piscinaEnsureState();
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  s.viewMonth = x;
  s.monthKey = `${x.getFullYear()}-${__pad2(x.getMonth()+1)}`;
}

function piscinaGetViewMonth(){
  const s = piscinaEnsureState();
  if (!s.viewMonth) piscinaSetViewMonth(new Date());
  return s.viewMonth;
}

function renderPiscinaCalendar(){
  const s = piscinaEnsureState();
  const grid = document.getElementById("piscinaGrid");
  const label = document.getElementById("piscinaNavLabel");
  const todayLbl = document.getElementById("piscinaTodayLabel");
  if (!grid || !label || !todayLbl) return;

  const viewMonth = piscinaGetViewMonth();
  label.textContent = __fmtMonthYear(viewMonth);

  const now = new Date();
  todayLbl.textContent = "";

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const daysInMonth = last.getDate();

  // offset: lun=0 ... dom=6
  let dow = first.getDay(); // dom=0
  dow = (dow + 6) % 7;

  const frag = document.createDocumentFragment();

  // blank cells
  for (let i=0;i<dow;i++){
    const blank = document.createElement("div");
    blank.className = "piscina-cell";
    blank.setAttribute("disabled","disabled");
    blank.style.visibility = "hidden";
    frag.appendChild(blank);
  }

  for (let day=1; day<=daysInMonth; day++){
    const d = new Date(y, m, day);
    const dayKey = __isoDayLocal(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "piscina-cell";
    btn.setAttribute("role","gridcell");
    btn.dataset.date = dayKey;

    const span = document.createElement("div");
    span.className = "piscina-day";
    span.textContent = String(day);
    btn.appendChild(span);

    const row = piscinaGetRowByDayKey(dayKey);
    if (row){
      const dot = document.createElement("div");
      dot.className = "piscina-dot";
      btn.appendChild(dot);
    }

    frag.appendChild(btn);
  }

  grid.innerHTML = "";
  grid.appendChild(frag);
}

function piscinaOpenModal(dayKey){
  const modal = document.getElementById("piscinaModal");
  if (!modal) return;
  const title = document.getElementById("piscinaModalTitle");
  const r = piscinaGetRowByDayKey(dayKey);
  if (!r) { toast("Nessun report per questo giorno"); return; }

  try{
    if (title) title.textContent = `Report piscina — ${__fmtItDateLong(new Date(dayKey+"T00:00:00"))}`;
  }catch(_){}

  const set = (id, v)=>{ const el = document.getElementById(id); if (el) el.textContent = v; };

  set("pmCloroLibero", (r.cloro_attivo_libero ?? "—") + " ppm");
  set("pmCloroComb", (r.cloro_attivo_combinato ?? "—") + " ppm");
  set("pmPh", (r.ph ?? "—"));
  set("pmTemp", (r.temp_acqua ?? "—") + " °C");
  const meta = [];
  if (r.timestamp_report) meta.push(String(r.timestamp_report));
  if (r.origine) meta.push(String(r.origine));
  set("pmMeta", meta.length ? meta.join(" · ") : "—");

  try{ modal.hidden = false; }catch(_){ modal.style.display = "block"; }
}

function piscinaCloseModal(){
  const modal = document.getElementById("piscinaModal");
  if (!modal) return;
  try{ modal.hidden = true; }catch(_){ modal.style.display = "none"; }
}

function __piscinaValuesForMonth(viewMonth){
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const last = new Date(y, m+1, 0);
  const days = last.getDate();
  const out = [];
  for (let d=1; d<=days; d++){
    const dayKey = __isoDayLocal(new Date(y,m,d));
    const row = piscinaGetRowByDayKey(dayKey);
    out.push({ day: d, dayKey, row });
  }
  return out;
}

function piscinaPrintCurrentMonth(){
  const viewMonth = piscinaGetViewMonth();
  const monthItems = __piscinaValuesForMonth(viewMonth);

  const rows = monthItems.filter(x=>!!x.row).map(x=>x.row);
  if (!rows.length){ toast("Nessun report nel mese selezionato"); return; }

  // Costruisci serie per grafici
  const series = {
    cloroL: monthItems.map(x=>x.row ? Number(x.row.cloro_attivo_libero) : null),
    cloroC: monthItems.map(x=>x.row ? Number(x.row.cloro_attivo_combinato) : null),
    ph: monthItems.map(x=>x.row ? Number(x.row.ph) : null),
    temp: monthItems.map(x=>x.row ? Number(x.row.temp_acqua) : null),
  };

  const minmax = (arr)=>{
    const v = arr.filter(x=>x!==null && !isNaN(x));
    if (!v.length) return {min:0,max:1};
    return { min: Math.min(...v), max: Math.max(...v) };
  };

  const spark = (arr, colorVar="--p1")=>{
    const w=228, h=18, pad=2;
    const mm=minmax(arr);
    const span = (mm.max-mm.min) || 1;
    let pts=[];
    const n=arr.length;
    for (let i=0;i<n;i++){
      const v=arr[i];
      if (v===null || isNaN(v)){ continue; }
      const x = pad + (i/(n-1))*(w-2*pad);
      const y = pad + (1-((v-mm.min)/span))*(h-2*pad);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" rx="8" ry="8" style="fill: var(--card); stroke: var(--border);"/>
      <polyline points="${pts.join(" ")}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(${colorVar});"/>
    </svg>`;
  };

  const fmt = (x, unit="")=>{
    if (x===null || x===undefined || isNaN(Number(x))) return "—";
    return `${x}${unit}`;
  };

  const monthTitle = __fmtMonthYear(viewMonth);
  const __base = (()=>{
    try{
      const u = String(location && location.href || "").split("#")[0].split("?")[0];
      const i = u.lastIndexOf("/");
      return (i>=0) ? u.slice(0, i+1) : "./";
    }catch(_){ return "./"; }
  })();
  const html = `<!doctype html>
  <html lang="it"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base href="${__base}"/>
  <title>Report Piscina - ${monthTitle}</title>
  <style>
    :root{
      --p1:#2B7CB4;
      --p2:#4D9CC5;
      --p3:#6FB7D6;
      --p4:#96BFC7;
      --p5:#BFBEA9;
      --p6:#D6B286;
      --p7:#CF9458;
      --p8:#C9772B;
      --text:#0f172a;
      --border: rgba(15,23,42,0.12);
      --muted: rgba(15,23,42,0.72);
      --card: rgba(255,255,255,0.94);
      --headbg: rgba(77,156,197,0.18);
      --bg:#ffffff;
    }
    *{ box-sizing:border-box; }
    body{ font-family: -apple-system,BlinkMacSystemFont,system-ui,Segoe UI,Roboto,Helvetica,Arial; margin: 0; color: var(--text); background:var(--bg); }
    .page{ padding: 14px; }
    .hdr{ display:flex; align-items:center; gap:12px; margin:0 0 10px 0; }
    .logo{ width:56px; height:auto; border-radius:8px; flex:0 0 auto; }
    .htxt{ flex:1; min-width:0; }
    h1{ font-size: 18px; margin:0 0 6px 0; color: var(--p1); }
    .sub{ font-size: 11px; color: var(--muted); margin-bottom: 10px; }

    .brandbar{ display:flex; width:100%; height:8px; border-radius: 999px; overflow:hidden; margin: 0 0 10px 0; border: 1px solid var(--border); }
    .brandbar span{ flex:1; }
    .brandbar .c1{ background: var(--p1); }
    .brandbar .c2{ background: var(--p2); }
    .brandbar .c3{ background: var(--p3); }
    .brandbar .c4{ background: var(--p4); }
    .brandbar .c5{ background: var(--p5); }
    .brandbar .c6{ background: var(--p6); }
    .brandbar .c7{ background: var(--p7); }
    .brandbar .c8{ background: var(--p8); }
    .grid{ display:flex; flex-direction:column; gap: 8px; }
    .card{ border: 1px solid var(--border); border-radius: 14px; padding: 10px; background: var(--card); }
    .row{ display:flex; justify-content:space-between; align-items:center; gap: 10px; margin: 5px 0; font-size: 11px; }
    .k{ font-weight: 800; }
    .v{ font-weight: 900; }
    table{ width:100%; border-collapse: collapse; font-size: 9px; }
    th,td{ border-bottom: 1px solid var(--border); padding: 3px 4px; text-align:left; vertical-align:top; }
    thead th{ background: var(--headbg); }
    th{ font-weight: 900; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    @page{ size: A4; margin: 10mm; }
    @media print{
      html, body{
        margin: 0;
        background:#fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page{ padding: 0; }
      svg{ max-width: 100%; height: auto; }
      .card{ break-inside: avoid; page-break-inside: avoid; }
      table, thead, tbody, tr, td, th{ break-inside: avoid; page-break-inside: avoid; }
    }
</style></head><body><div class="page">
    <div class="hdr">
      <img class="logo" src="./assets/logo.jpg" alt="Daedalium"/>
      <div class="htxt">
        <h1>Report Piscina — ${monthTitle}</h1>
        <div class="sub"></div>
      </div>
    </div>
    <div class="brandbar" aria-hidden="true"><span class="c1"></span><span class="c2"></span><span class="c3"></span><span class="c4"></span><span class="c5"></span><span class="c6"></span><span class="c7"></span><span class="c8"></span></div>

    <div class="grid">
      <div class="card">
        <div class="row"><span class="k">Cloro attivo libero</span><span class="v">${spark(series.cloroL,"--p1")}</span></div>
        <div class="row"><span class="k">Cloro attivo combinato</span><span class="v">${spark(series.cloroC,"--p8")}</span></div>
        <div class="row"><span class="k">pH</span><span class="v">${spark(series.ph,"--p4")}</span></div>
        <div class="row"><span class="k">Temperatura acqua</span><span class="v">${spark(series.temp,"--p6")}</span></div>
      </div>

      <div class="card">
        <table>
          <thead><tr><th>Giorno</th><th>Cloro libero</th><th>Cloro comb.</th><th>pH</th><th>Temp</th></tr></thead>
          <tbody>
          ${monthItems.map(x=>{
            if (!x.row) return `<tr><td>${x.day}</td><td colspan="4" style="color:rgba(15,23,42,0.45)">—</td></tr>`;
            const r=x.row;
            return `<tr>
              <td class="mono">${x.day}</td>
              <td>${fmt(r.cloro_attivo_libero," ppm")}</td>
              <td>${fmt(r.cloro_attivo_combinato," ppm")}</td>
              <td>${fmt(r.ph,"")}</td>
              <td>${fmt(r.temp_acqua," °C")}</td>
</tr>`;
          }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </div>
    <script>setTimeout(()=>{ try{ window.focus(); }catch(e){} }, 100);</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w){ toast("Popup bloccato: abilita finestre per stampare"); return; }
  try{
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} }, 450);
  }catch(_){ try{ w.close(); }catch(__){} }
}

async function piscinaCreateReportForDay(dayKey, { origine="auto19" } = {}){
  const s = piscinaEnsureState();
  if (piscinaGetRowByDayKey(dayKey)) return false;

  const d = new Date(dayKey + "T00:00:00");
  if (isNaN(d)) return false;

  const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0, 0, 0).toISOString();

  const sim = piscinaSimulateForDay(d);
  const payload = {
    id: genId("piscina"),
    timestamp_report: ts,
    origine,
    cloro_attivo_libero: sim.cloro_attivo_libero,
    cloro_attivo_combinato: sim.cloro_attivo_combinato,
    ph: sim.ph,
    temp_acqua: sim.temp_acqua,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await api(PISCINA_ACTION, { method:"POST", body: payload, showLoader:false });

  // aggiorna cache locale
  s.rows = Array.isArray(s.rows) ? s.rows : [];
  s.rows.push(Object.assign({}, payload));
  s.fetchedAt = Date.now();
  piscinaIndexRows();
  return true;
}

async function piscinaEnsureDailyReports(){
  if (!state?.session?.user_id) return;
  await loadPiscinaAll({ force:false, showLoader:false });

  const now = new Date();
  const nowDayKey = __isoDayLocal(now);
  const canIncludeToday = (now.getHours() > 19) || (now.getHours() === 19 && now.getMinutes() >= 0);

  const viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const last = new Date(y, m+1, 0);
  const days = last.getDate();

  for (let d=1; d<=days; d++){
    const dayKey = __isoDayLocal(new Date(y,m,d));
    // solo giorni passati + oggi dopo le 19
    if (dayKey > nowDayKey) continue;
    if (dayKey === nowDayKey && !canIncludeToday) continue;
    if (!piscinaGetRowByDayKey(dayKey)){
      try{ await piscinaCreateReportForDay(dayKey, { origine:"auto19" }); }catch(_){}
    }
  }

  if (state.page === "statpiscina") {
    try{ renderPiscinaCalendar(); }catch(_){}
  }
}

async function piscinaBackfillCurrentMonth(){
  if (!state?.session?.user_id) return;
  await loadPiscinaAll({ force:false, showLoader:true });

  const viewMonth = piscinaGetViewMonth();
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const last = new Date(y, m+1, 0);
  const days = last.getDate();

  const now = new Date();
  const nowDayKey = __isoDayLocal(now);
  const isCurrentMonth = (y === now.getFullYear() && m === now.getMonth());

  for (let d=1; d<=days; d++){
    const dayKey = __isoDayLocal(new Date(y,m,d));
    if (isCurrentMonth && dayKey > nowDayKey) break;
    if (!piscinaGetRowByDayKey(dayKey)){
      await piscinaCreateReportForDay(dayKey, { origine:"backfill" });
    }
  }

  if (state.page === "statpiscina") {
    renderPiscinaCalendar();
  }
  toast("Report mese aggiornati");
}

function setupPiscina(){
  // default: mese corrente
  try{ piscinaSetViewMonth(new Date()); }catch(_){}

  const prev = document.getElementById("piscinaPrevMonth");
  const next = document.getElementById("piscinaNextMonth");
  const grid = document.getElementById("piscinaGrid");
  const close = document.getElementById("piscinaModalClose");
  const modal = document.getElementById("piscinaModal");
  const printBtn = document.getElementById("piscinaPrintBtn");

  if (prev) bindFastTap(prev, ()=>{ const vm = piscinaGetViewMonth(); piscinaSetViewMonth(new Date(vm.getFullYear(), vm.getMonth()-1, 1)); renderPiscinaCalendar(); });
  if (next) bindFastTap(next, ()=>{ const vm = piscinaGetViewMonth(); piscinaSetViewMonth(new Date(vm.getFullYear(), vm.getMonth()+1, 1)); renderPiscinaCalendar(); });

  if (grid){
    grid.addEventListener("click", (e)=>{
      const cell = e.target && e.target.closest ? e.target.closest(".piscina-cell") : null;
      if (!cell || cell.hasAttribute("disabled")) return;
      const dayKey = String(cell.dataset.date||"").trim();
      if (!dayKey) return;
      piscinaOpenModal(dayKey);
    });
  }

  if (close) bindFastTap(close, ()=>piscinaCloseModal());
  if (modal){
    modal.addEventListener("click", (e)=>{ if (e.target === modal) piscinaCloseModal(); });
  }
  if (printBtn) bindFastTap(printBtn, ()=>piscinaPrintCurrentMonth());

  // scheduler robusto: quando l'app è aperta o torna attiva
  try{
    const tick = ()=>{ try{ piscinaEnsureDailyReports(); }catch(_){ } };
    setTimeout(tick, 350);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", ()=>{ if (!document.hidden) tick(); });
    // ogni 5 minuti (leggero)
    setInterval(tick, 5*60*1000);
  }catch(_){}
}

async function init(){
  // Perf mode: deve girare DOPO che body esiste e DOPO init delle costanti
  applyPerfMode();
  try{ setupAudioUI(); }catch(_){ }
  const __restore = __readRestoreState();
  // Session + anno
  state.session = loadSession();
  state.exerciseYear = loadExerciseYear();
  updateYearPill();

  // Imposta una pagina di default (poi showPage verrà chiamata UNA sola volta)
  document.body.dataset.page = (state.session && state.session.user_id) ? "home" : "auth";
  setupHeader();
  setupAuth();
  setupHome();
  // Check ricevute mancanti (solo a riavvio)
  try{ setTimeout(()=>{ try{ checkReceiptsOnStartup(); }catch(_){ } }, 120); }catch(_){ }

  try{ applyRoleMode(); }catch(_){ }
  setupCalendario();
  setupImpostazioni();
  setupOperatoriPage();
  setupChannelPage();
  setupLaundryCatalogPage();
setupPiscina();
setupProdotti();
// Avvio: prima cosa dopo il bootstrap UI (utente autenticato) è controllare entrambe le liste spesa
try{
  if (state.session && state.session.user_id){
    setTimeout(() => { try{ loadSpesaAll({ force:true, showLoader:false }); }catch(_){ } }, 0);
  }
}catch(_){ }

  // setupColazione legacy (non più usata)
  try{ setupColazione(); }catch(_){}

    setupOspite();
    try{ initServiziUI(); }catch(_){}
  initFloatingLabels();

  // Non chiamare showPage qui: evitiamo doppie navigazioni/render all'avvio
// periodo iniziale
  if (__restore && __restore.preset) state.periodPreset = __restore.preset;
  if (__restore && __restore.period && __restore.period.from && __restore.period.to) {
    setPeriod(__restore.period.from, __restore.period.to);
  } else {
    // LOCAL mode: default periodo = anno esercizio (evita liste vuote e totali a zero su iOS)
    if (typeof __LOCAL_MODE__ !== "undefined" && __LOCAL_MODE__) {
      const y = (state && state.exerciseYear) ? String(state.exerciseYear) : String(new Date().getFullYear());
      const from = `${y}-01-01`;
      const to   = `${y}-12-31`;
      setPeriod(from,to);
    } else {
      const [from,to] = monthRangeISO(new Date());
      setPeriod(from,to);
    }
  }

  // Preset periodo (scroll iOS)
  bindPresetSelect("#periodPreset1");
  bindPresetSelect("#periodPreset2");
  bindPresetSelect("#periodPreset3");
  bindPresetSelect("#periodPreset4");
  setPresetValue(state.periodPreset || "this_month");

  // Ordinamento Spese (lista)
  if (!state.speseSort) state.speseSort = "date";
  const spSort = document.getElementById("speseSort");
  if (spSort){
    spSort.value = state.speseSort;
    spSort.addEventListener("change", () => {
      state.speseSort = spSort.value || "date";
      try { if (state.page === "spese" && state.speseView === "list") renderSpese(); } catch(_){}
    });
  }


  // Periodo automatico (niente tasto Applica)
  bindPeriodAuto("#fromDate", "#toDate");
  bindPeriodAuto("#fromDate2", "#toDate2");
  bindPeriodAuto("#fromDate3", "#toDate3");
  setupGuestListControls();

  $("#spesaData").value = todayISO();

  // Motivazione: se l'utente scrive una variante già esistente, usa la versione canonica
  const mot = $("#spesaMotivazione");
  if (mot) {
    mot.addEventListener("blur", () => {
      const v = collapseSpaces((mot.value || "").trim());
      if (!v) return;
      const canonical = findCanonicalMotivazione(v);
      if (canonical) mot.value = canonical;
      else mot.value = v; // pulizia spazi multipli
    });
  }

  $("#btnSaveSpesa").addEventListener("click", async () => {
    try { await saveSpesa(); } catch(e){ toast(e.message); }
  });


  // prefetch leggero (no await): evita blocchi e “clessidra” ripetute all'avvio
  // Colazione: prefetch per segnale in HOME
  if (state.session && state.session.user_id){
    try { loadColazione({ force:false, showLoader:false }).catch(() => {}); } catch(_){ }
  }

  if (state.session && state.session.user_id){
    try { loadMotivazioni().catch(() => {}); } catch(_){ }
    try { ensureSettingsLoaded({ force:false, showLoader:false }).catch(() => {}); } catch(_){ }
  }

  // avvio: se c'è uno stato di restore (es. dopo sync/import o reload SW),
  // riapri la pagina salvata; altrimenti mantieni HOME come default per login normale.
  const restoredPage = (__restore && __sanitizePage(__restore.page)) ? __sanitizePage(__restore.page) : null;
  const targetPage = (state.session && state.session.user_id)
    ? (restoredPage || "home")
    : "auth";
  showPage(targetPage);
  if (__restore) setTimeout(() => { try { __applyUiState(__restore); } catch(_) {} }, 0);


  // --- Pulizie (solo grafica) ---
  const cleanPrev = document.getElementById("cleanPrev");
  const cleanNext = document.getElementById("cleanNext");
  const cleanToday = document.getElementById("cleanToday");

  const cleanGrid = document.getElementById("cleanGrid");
  const cleanSaveLaundry = document.getElementById("cleanSaveLaundry");
  const cleanSaveHours = document.getElementById("cleanSaveHours");
  const btnLaundryFromPulizie = document.getElementById("topLaundryBtn");
  const btnOrePuliziaFromPulizie = document.getElementById("topWorkBtn");

  const cleanResetLaundry = document.getElementById("cleanResetLaundry");
  const cleanResetHours = document.getElementById("cleanResetHours");
  const cleanResetAll = document.getElementById("cleanResetAll");

  const __CLEAN_COLS__ = () => getLaundryComponentCodes();

  const doResetAllPulizie = async () => {
    if (!ensureCanEditPulizieDay()) return;
    const ok = await confirmYesNo("Resettare tutto?");
    if (!ok) return;

    try{
      try{ __dirtyLaundryRooms = new Set(); __dirtyLaundryCells = new Set(); }catch(_){ }

      const __allSlots = Array.from(document.querySelectorAll(".clean-grid .cell.slot"));
      __allSlots.forEach(el => {
        try{ el.classList.remove("is-saved"); }catch(_){ }
        try{ writeCell(el, 0); }catch(_){ }
        try{ __markLaundryDirty(el); }catch(_){ }
      });

      try{
        (opEls||[]).forEach(r => {
          try{ r.hours.classList.remove("is-saved"); }catch(_){ }
          try{ writeHourDot(r.hours, 0); }catch(_){ }
        });
      }catch(_){ }

      await saveLaundryNow();
      await saveHoursNow();
    }catch(err){
      try{ toast(String(err && err.message || "Errore reset pulizie"), "orange"); }catch(_){ }
    }
  };

  const __bindResetAllCorner = (el) => {
    try{
      if (!el || el.__boundResetAllCorner) return;
      el.__boundResetAllCorner = true;
      bindFastTap(el, doResetAllPulizie);
      el.addEventListener("keydown", (e) => {
        const k = (e && e.key) ? e.key : "";
        if (k === "Enter" || k === " "){
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
          try{ doResetAllPulizie(); }catch(_){ }
        }
      }, true);
    }catch(_){ }
  };

  const rebuildPulizieGrid = ({ preserveValues = true } = {}) => {
    try{
      if (!cleanGrid) return;
      const cols = __CLEAN_COLS__();
      const prev = new Map();
      if (preserveValues){
        try{
          cleanGrid.querySelectorAll('.cell.slot').forEach((cell) => {
            const room = String(cell?.dataset?.room || '').trim();
            const col = String(cell?.dataset?.col || '').trim().toUpperCase();
            if (!room || !col) return;
            prev.set(`${room}|${col}`, {
              value: readCell(cell),
              saved: !!cell.classList.contains('is-saved')
            });
          });
        }catch(_){ }
      }
      const count = Math.max(0, Math.min(12, getConfiguredRoomsCount(6)));
      try{ cleanGrid.style.setProperty('--cg-cols', String(Math.max(1, cols.length))); }catch(_){ }
      try{ cleanGrid.style.setProperty('--cg-rows', String(Math.max(1, count + 1))); }catch(_){ }
      try{ cleanGrid.style.gridTemplateRows = `var(--cg-head-h, 50px) repeat(${Math.max(1, count + 1)}, var(--cg-row-h, 50px))`; }catch(_){ }
      try{ cleanGrid.style.gridTemplateColumns = `var(--cg-corner, 40px) repeat(${Math.max(1, cols.length)}, minmax(0, 1fr))`; }catch(_){ }
      const parts = [];
      parts.push('<div aria-label="Reset pulizie" class="c cell head corner clean-reset-corner" id="cleanResetAll" role="button" tabindex="0"><svg aria-hidden="true" class="cr-icon" viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M6 6l1 14h10l1-14"></path><path d="M9 10v6"></path><path d="M12 10v6"></path><path d="M15 10v6"></path><path d="M8 6l1-2h6l1 2"></path></svg></div>');
      cols.forEach((col) => { parts.push(`<div class="c cell head">${col}</div>`); });
      for (let r = 1; r <= count; r++) {
        parts.push(`<div class="c cell room r${r}">${r}</div>`);
        cols.forEach((col) => { parts.push(`<div class="c cell slot" data-col="${col}" data-room="${r}"></div>`); });
      }
      parts.push('<div class="c cell room rres">RES</div>');
      cols.forEach((col) => { parts.push(`<div class="c cell slot" data-col="${col}" data-room="RES"></div>`); });
      cleanGrid.innerHTML = parts.join('');
      try{ __bindResetAllCorner(document.getElementById("cleanResetAll")); }catch(_){ }
      try{ if (typeof cleanGridHandlersBound !== 'undefined') cleanGridHandlersBound = false; }catch(_){ }
      try{ __dirtyLaundryRooms = new Set(); __dirtyLaundryCells = new Set(); }catch(_){ }
      try{
        cleanGrid.querySelectorAll('.cell.slot').forEach((cell) => {
          const room = String(cell?.dataset?.room || '').trim();
          const col = String(cell?.dataset?.col || '').trim().toUpperCase();
          const hit = prev.get(`${room}|${col}`);
          if (!hit) return;
          writeCell(cell, hit.value || 0);
          cell.classList.toggle('is-saved', !!hit.saved && Number(hit.value || 0) > 0);
        });
      }catch(_){ }
    }catch(_){ }
  };

  // --- Autosave (debounce 1s): Pulizie (biancheria) + Ore operatori ---
  let __laundrySaveT = null;
  let __hoursSaveT = null;
  let __savingLaundry = false;
  let __pendingLaundry = false;
  let __laundryRefreshT = null;
  let __savingHours = false;
  let __pendingHours = false;
  // dDAE_1.020: salvataggio PULIZIE per-stanza (evita generazione righe/report inutili)
  // Mantiene UI fluida: nessun "blink" dei numeri durante autosave / refresh.
  let __dirtyLaundryRooms = new Set();   // stanze modificate (solo queste vengono salvate)
  let __dirtyLaundryCells = new Set();   // celle modificate (solo queste ricevono bordo rosso post-save)

  const __recalcDirtyLaundryRoomsFromCells = () => {
    try{
      const next = new Set();
      __dirtyLaundryCells.forEach(el => { try{ if (el && el.dataset && el.dataset.room) next.add(String(el.dataset.room)); }catch(_){ } });
      __dirtyLaundryRooms = next;
    }catch(_){}
  };

  const __markLaundryDirty = (cellEl) => {
    try{
      if (!cellEl || !cellEl.dataset) return;
      const room = String(cellEl.dataset.room || "").trim();
      if (!room) return;
      __dirtyLaundryRooms.add(room);
      __dirtyLaundryCells.add(cellEl);
    }catch(_){}
  };

  function scheduleLaundrySave(){
    try{
      if (__laundrySaveT) clearTimeout(__laundrySaveT);
      __laundrySaveT = setTimeout(() => { try{ saveLaundryNow(); }catch(_){ } }, 1000);
    }catch(_){}
  }

  function schedulePulizieRefresh(){
    try{
      if (__laundryRefreshT) clearTimeout(__laundryRefreshT);
      __laundryRefreshT = setTimeout(() => { try{ loadPulizieForDay({ clearFirst:false }); }catch(_){ } }, 800);
    }catch(_){}
  }

  function scheduleHoursSave(){
    try{
      if (__hoursSaveT) clearTimeout(__hoursSaveT);
      __hoursSaveT = setTimeout(() => { try{ saveHoursNow(); }catch(_){ } }, 1000);
    }catch(_){}
  }

  async function saveLaundryNow(){
    try{
      if (!ensureCanEditPulizieDay()) return;
      if (__savingLaundry){ __pendingLaundry = true; return; }

      // Salva SOLO le stanze effettivamente toccate (evita righe/report inutili)
      try{ __recalcDirtyLaundryRoomsFromCells(); }catch(_){}

      const rooms = Array.from(__dirtyLaundryRooms || []);
      if (!rooms.length) return;

      const touchedCells = Array.from(__dirtyLaundryCells || []);

      __savingLaundry = true;

      const payload = buildPuliziePayload(rooms);
      await api("pulizie", { method:"POST", body: payload, showLoader:false });

      // Post-save UI: nessun refresh/clear → niente blink.
      // Applica bordo rosso (is-saved) solo sulle celle toccate in base al valore corrente.
      touchedCells.forEach(el => {
        try{
          if (!el || !el.classList) return;
          const v = readCell(el);
          el.classList.toggle("is-saved", (typeof v === "number" ? v : parseInt(String(v||0),10)) > 0);
        }catch(_){}
      });

      // Rimuove dal "dirty" le celle salvate in questo batch (le nuove modifiche restano)
      touchedCells.forEach(el => { try{ __dirtyLaundryCells.delete(el); }catch(_){ } });
      try{ __recalcDirtyLaundryRoomsFromCells(); }catch(_){}

    }catch(err){
      try{ toast(String(err && err.message || "Errore salvataggio biancheria")); }catch(_){}
    }finally{
      __savingLaundry = false;
      if (__pendingLaundry){
        __pendingLaundry = false;
        try{ saveLaundryNow(); }catch(_){}
      }
    }
  }


  async function saveHoursNow(){
    try{
      if (!ensureCanEditPulizieDay()) return;
      if (__savingHours){ __pendingHours = true; return; }
      __savingHours = true;

      const isOpSession = !!(state && state.session && isOperatoreSession(state.session));

      const parseRows = (res) => {
        const rows = Array.isArray(res) ? res
          : (res && Array.isArray(res.rows) ? res.rows
          : (res && Array.isArray(res.data) ? res.data
          : (res && res.data && Array.isArray(res.data.data) ? res.data.data
          : [])));
        return Array.isArray(rows) ? rows : [];
      };

      const buildMergedForOperatore = async () => {
        const date = getCleanDate();
        const names = getOperatorNamesFromSettings();
        const hasAnyName = names.some(n => String(n || '').trim());
        if (!hasAnyName) throw new Error("Imposta i nomi operatori in Impostazioni");

        const rawU = String(state.session._op_local || state.session.username || state.session.user || state.session.nome || state.session.name || state.session.email || '').trim();
        if (!rawU) throw new Error('Operatore non valido');
        const normU = rawU.toLowerCase();
        const activeName = (names||[]).find(n => String(n||'').trim().toLowerCase() === normU) || rawU;

        // carica ore esistenti del giorno (per preservare gli altri)
        let existing = [];
        try{
          const res = await api('operatori', { method:'GET', params:{ data: date }, showLoader:false });
          existing = parseRows(res);
        }catch(_){ existing = []; }

        const mapExact = new Map();
        const mapKey = new Map();
        const _max = (a,b)=> (a>b?a:b);
        const _n = (s)=>String(s||"").trim().toLowerCase();
        const _k = (s)=>_n(s).replace(/[^a-z0-9]+/g,"");
        existing.forEach(r=>{
          const raw = (r?.operatore || r?.nome || '');
          const op = _n(raw);
          const key = _k(raw);
          const ore = parseInt(String(r?.ore ?? 0), 10);
          const v = (ore!=ore)?0: _max(0, ore);
          if (op) mapExact.set(op, v);
          if (key) mapKey.set(key, v);
        });

        const idxActive = (names||[]).findIndex(n => String(n||'').trim().toLowerCase() === String(activeName||'').trim().toLowerCase());

        const rows = [];
        (names||[]).forEach((nm, idx)=>{
          const name = String(nm||'').trim();
          if (!name) return;

          let hours = 0;
          if (idx === idxActive && idxActive >= 0){
            const el = opEls[idxActive];
            hours = el ? readHourDot(el.hours) : 0;
          } else {
            hours = (mapExact.get(_n(name)) ?? mapKey.get(_k(name)) ?? 0);
          }

          const isActive = (idx === idxActive && idxActive >= 0);
          if (hours > 0 || isActive){
            const benzinaOperatore = getOperatoreBenzinaByName(name, 0);
            const tariffaOperatore = getOperatoreTariffaByName(name, 0);
            rows.push({
              data: date,
              operatore: name,
              ore: hours,
              benzina_euro: (hours > 0 ? benzinaOperatore : 0),
              benzina_unit_euro: benzinaOperatore,
              tariffa_euro: tariffaOperatore,
              colore: (getOperatoreCatalogItemByName(name)?.colore || 'blue')
            });
          }
        });

        return { touched: true, payload: { data: date, operatori: rows, replaceDay: true } };
      };

      const out = isOpSession ? await buildMergedForOperatore() : buildOperatoriPayload();
      const { touched, payload: opPayload } = out || {};
      if (!touched) return;

      await api("operatori", { method:"POST", body: opPayload });
      try{
        // UI: evidenzia subito i pallini ore salvati (cerchio rosso)
        opEls.forEach((r, idx) => {
          try{
            const rowEl = (r.hours && r.hours.closest) ? r.hours.closest('.clean-op-row') : null;
            if (rowEl && rowEl.style && rowEl.style.display === 'none') return;
            const v = readHourDot(r.hours);
            r.hours.classList.toggle("is-saved", v > 0);
          }catch(_){ }
        });
      }catch(_){ }

      try{ await loadOperatoriForDay({ clearFirst:false }); }catch(_){ }
    }catch(err){
      try{ toast(String(err && err.message || "Errore salvataggio ore lavoro")); }catch(_){}
    }finally{
      __savingHours = false;
      if (__pendingHours){
        __pendingHours = false;
        try{ saveHoursNow(); }catch(_){}
      }
    }
  }


  // --- Pulizie: popup descrizioni intestazioni (MAT/SIN/...) ---
  const cleanHeaderModal = document.getElementById("cleanHeaderModal");
  const cleanHeaderText = document.getElementById("cleanHeaderText");
  const cleanHeaderClose = document.getElementById("cleanHeaderClose");

  const getCleanHeaderDescMap = () => {
    const map = {};
    try{
      getLaundryCatalogFromSettings().forEach((item) => {
        const code = __normalizeLaundryCode__(item?.abbreviazione);
        const title = String(item?.titolo || '').trim();
        if (code && title) map[code] = title;
      });
    }catch(_){ }
    return map;
  };

  const openCleanHeaderModal = (code) => {
    if (!cleanHeaderModal || !cleanHeaderText) return;
    const c = String(code || "").trim().toUpperCase();
    const text = getCleanHeaderDescMap()[c] || "";
    if (!text) return;
    cleanHeaderText.textContent = text;
    cleanHeaderModal.hidden = false;
  };

  const closeCleanHeaderModal = () => {
    if (!cleanHeaderModal) return;
    cleanHeaderModal.hidden = true;
  };

  if (cleanHeaderClose){
    cleanHeaderClose.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCleanHeaderModal();
    }, true);
  }

  if (cleanHeaderModal){
    cleanHeaderModal.addEventListener("click", (e) => {
      // click fuori dalla card chiude
      if (e.target === cleanHeaderModal) closeCleanHeaderModal();
    }, true);
  }



  const readCell = (el) => {
    const v = String(el.textContent || "").trim();
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  };
  const writeCell = (el, n) => {
    const val = Math.max(0, parseInt(n || 0, 10) || 0);
    el.textContent = val ? String(val) : "";
  };

  const getCleanDate = () => {
    try{
      const __isOp = !!(state && state.session && isOperatoreSession(state.session));
      if (__isOp) return toISODateLocal(new Date());
    }catch(_){ }
    const d = state.cleanDay ? new Date(state.cleanDay) : new Date();
    return toISODateLocal(d);
  };


  // --- Guard: OPERATORE può modificare SOLO il giorno corrente ---
  const ONLY_TODAY_MSG = "è possibile memorizzare solo i dati del giorno corrente";
  let __onlyTodayToastAt = 0;

  const isCleanDayToday = () => {
    try { return getCleanDate() === toISODateLocal(new Date()); }
    catch (_) { return true; }
  };

  const canEditPulizieDay = () => {
    try {
      const isOp = !!(state && state.session && isOperatoreSession(state.session));
      if (!isOp) return true;
      return isCleanDayToday();
    } catch (_) { return true; }
  };

  const ensureCanEditPulizieDay = () => {
    if (canEditPulizieDay()) return true;
    const now = Date.now();
    if (now - __onlyTodayToastAt > 800) {
      __onlyTodayToastAt = now;
      try { toast(ONLY_TODAY_MSG, "orange"); } catch (_) { try { toast(ONLY_TODAY_MSG); } catch (__){ } }
    }
    return false;
  };


  // --- Ore operatori (foglio "operatori") ---

  // dDAE_1.025 — Operatore: in Pulizie il nome è lo username loggato (non dipende da Impostazioni)
  const __getLoggedOperatorName = () => {
    try{
      if (!(state && state.session)) return "";
      if (!isOperatoreSession(state.session)) return "";
      return String(
        state.session._op_local ||
        state.session.username ||
        state.session.user ||
        state.session.nome ||
        state.session.name ||
        state.session.email ||
        ""
      ).trim();
    }catch(_){ return ""; }
  };

  const __getPulizieOperatorNames = () => {
    const ops = (getActiveOperatorNames ? getActiveOperatorNames() : []).map(x=>String(x||"").trim()).filter(Boolean);
    return Array.from(new Set(ops.filter(Boolean)));
  };

  const __escapeHtmlBasic__ = (value) => String(value || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  let opEls = [];

  const __ensurePulizieOperatorRows__ = (names = []) => {
    const host = document.getElementById('cleanOps');
    if (!host) return [];
    const safeNames = Array.from(new Set((Array.isArray(names) ? names : []).map(n => String(n || '').trim()).filter(Boolean)));
    host.innerHTML = safeNames.map((name, idx) => `
<div class="clean-op-row" data-op="${idx+1}" data-name="${__escapeHtmlBasic__(name)}">
<div aria-label="${__escapeHtmlBasic__(name)}" class="clean-op-name"></div>
<button aria-label="Ore ${__escapeHtmlBasic__(name)}" class="clean-hour-dot is-zero" data-value="0" type="button"></button>
</div>`).join('');
    opEls = Array.from(host.querySelectorAll('.clean-op-row')).map((row) => ({
      row,
      name: row.querySelector('.clean-op-name'),
      hours: row.querySelector('.clean-hour-dot')
    })).filter(x => x.row && x.name && x.hours);
    opEls.forEach(r => {
      if (r.hours && !r.hours.dataset.boundHourDot){
        r.hours.dataset.boundHourDot = '1';
        try{ bindHourDot(r.hours); }catch(_){ }
      }
    });
    return opEls;
  };


  const __applyOperatorePulizieVisuals__ = (rowEl, nameEl, hourEl, operatorName, fallbackColor = 'blue') => {
    const hex = getOperatoreColorHexByName(operatorName, fallbackColor || 'blue');
    const soft = (typeof hexToRgba === 'function') ? hexToRgba(hex, 0.22) : 'rgba(111,183,214,0.22)';
    const softStrong = (typeof hexToRgba === 'function') ? hexToRgba(hex, 0.72) : 'rgba(111,183,214,0.72)';
    try{ if (rowEl) rowEl.dataset.color = __normalizeOperatoreColor__(getOperatoreCatalogItemByName(operatorName)?.colore || fallbackColor || 'blue'); }catch(_){ }
    try{ if (nameEl) nameEl.style.color = hex; }catch(_){ }
    try{
      if (hourEl){
        hourEl.style.borderColor = softStrong;
        hourEl.style.color = hex;
        hourEl.style.background = 'rgba(255,255,255,0.80)';
        hourEl.style.boxShadow = `0 10px 22px rgba(15,23,42,0.10), inset 0 0 0 1px rgba(255,255,255,0.35), 0 0 0 4px ${soft}`;
      }
    }catch(_){ }
  };

  const readHourDot = (el) => {
    const n = parseInt(String(el.dataset.value || "0"), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };
  const writeHourDot = (el, n) => {
    const val = Math.max(0, parseInt(n || 0, 10) || 0);
    el.dataset.value = String(val);
    el.textContent = val ? String(val) : "";
    el.classList.toggle("is-zero", !val);
  };

  const bindHourDot = (el) => {
    // Tap incrementa, long press (0.5s) azzera — come la biancheria
    let pressTimer = null;
    let longFired = false;
    let lastTouchAt = 0;

    const clear = () => {
      if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      longFired = false;
    };

    const onLong = () => { if (!ensureCanEditPulizieDay()) return;  try{ __sfxGlass(); }catch(_){ } el.classList.remove("is-saved"); writeHourDot(el, 0); scheduleHoursSave(); };
    const onTap = () => { if (!ensureCanEditPulizieDay()) return;  try{ __sfxTap(); }catch(_){ } el.classList.remove("is-saved"); writeHourDot(el, readHourDot(el) + 1); scheduleHoursSave(); };

    el.addEventListener("touchstart", (e) => {
      lastTouchAt = Date.now();
      clear();
      pressTimer = setTimeout(() => {
        longFired = true;
        onLong();
      }, 500);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    el.addEventListener("touchend", (e) => {
      if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      if (!longFired) onTap();
      clear();
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    el.addEventListener("touchcancel", (e) => {
      clear();
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
    }, { passive: false, capture: true });

    // Click (desktop) + anti ghost-click dopo touch
    el.addEventListener("click", (e) => {
      if (Date.now() - lastTouchAt < 450) { e.preventDefault(); e.stopPropagation(); return; }
      onTap();
      e.preventDefault();
      e.stopPropagation();
    }, true);
  };

  const syncCleanOperators = () => {
    const names = __getPulizieOperatorNames();
    __ensurePulizieOperatorRows__(names);

    const loggedName = (() => { try{ return __getLoggedOperatorName(); }catch(_){ return ''; } })();
    const loggedNorm = String(loggedName || '').trim().toLowerCase();
    const isOpSession = !!(state && state.session && isOperatoreSession(state.session));

    opEls.forEach((r, idx) => {
      const rowEl = r.row || (r.hours && r.hours.closest ? r.hours.closest('.clean-op-row') : null);
      const n = String(names[idx] || rowEl?.dataset?.name || '').trim();
      if (!n || !rowEl) return;

      rowEl.dataset.name = n;
      rowEl.style.display = '';
      r.name.textContent = n;
      r.name.classList.remove('is-placeholder');
      try{ __applyOperatorePulizieVisuals__(rowEl, r.name, r.hours, n, __OPERATORI_COLOR_KEYS__[idx % __OPERATORI_COLOR_KEYS__.length] || 'blue'); }catch(_){ }
      if (!r.hours.dataset.value) writeHourDot(r.hours, 0);
      try {
        r.name.setAttribute('aria-label', n);
        r.hours.setAttribute('aria-label', 'Ore ' + n);
      } catch (_) {}

      if (isOpSession){
        const show = !!loggedNorm && (n.toLowerCase() === loggedNorm || n.toLowerCase().includes(loggedNorm) || loggedNorm.includes(n.toLowerCase()));
        rowEl.style.display = show ? '' : 'none';
        if (!show){
          try{ writeHourDot(r.hours, 0); }catch(_){ }
          try{ r.hours.classList.remove('is-saved'); }catch(_){ }
        }
      }
    });

    if (isOpSession && loggedName){
      const visible = opEls.some(r => (r.row || (r.hours && r.hours.closest ? r.hours.closest('.clean-op-row') : null))?.style.display !== 'none');
      if (!visible){
        __ensurePulizieOperatorRows__([loggedName]);
        opEls.forEach(r => {
          const rowEl = r.row || (r.hours && r.hours.closest ? r.hours.closest('.clean-op-row') : null);
          if (!rowEl) return;
          rowEl.style.display = '';
          rowEl.dataset.name = loggedName;
          r.name.textContent = loggedName;
          try{ __applyOperatorePulizieVisuals__(rowEl, r.name, r.hours, loggedName, 'blue'); }catch(_){ }
          if (!r.hours.dataset.value) writeHourDot(r.hours, 0);
        });
      }
    }
  };


  try{ window.__syncCleanOperators__ = syncCleanOperators; }catch(_){ }

  try{ syncCleanOperators(); }catch(_){}
  try{ rebuildPulizieGrid({ preserveValues:false }); }catch(_){ }

  const buildOperatoriPayload = () => {
    const date = getCleanDate();
    const rows = [];
    const names = __getPulizieOperatorNames(); // [op1, op2, op3] oppure [username,"",""]

    const hasAnyName = names.some(n => String(n || "").trim());
    if (!hasAnyName){
      return { touched: false, payload: { data: date, operatori: [], replaceDay: true } };
    }

    // IMPORTANTE: inviamo ANCHE le ore a 0.
    // Il backend farà "replace" del giorno: cancella i record esistenti per quella data
    // e reinserisce solo quelli con ore > 0. Così un secondo salvataggio SOVRASCRIVE.
    opEls.forEach((r, idx) => {
      const name = String(names[idx] || "").trim();
      if (!name) return; // operatore non configurato

      const hours = readHourDot(r.hours); // può essere 0
      const benzinaOperatore = getOperatoreBenzinaByName(name, 0);
      const tariffaOperatore = getOperatoreTariffaByName(name, 0);
      rows.push({
        data: date,
        operatore: name,
        ore: hours,
        benzina_euro: (hours > 0 ? benzinaOperatore : 0),
        benzina_unit_euro: benzinaOperatore,
        tariffa_euro: tariffaOperatore,
        colore: (getOperatoreCatalogItemByName(name)?.colore || 'blue')
      });
    });

    return { touched: true, payload: { data: date, operatori: rows, replaceDay: true } };
  };



  
  const clearAllSlots = () => {
    document.querySelectorAll(".clean-grid .cell.slot").forEach(el => { el.textContent = ""; el.classList.remove("is-saved"); });
  };

  const applyPulizieRows = (rows, { preserveDirty = false } = {}) => {
    if (!Array.isArray(rows)) rows = [];
    const map = new Map();
    rows.forEach(r => {
      const room = String(r?.stanza || r?.room || r?.Stanza || r?.ROOM || "").trim();
      if (room) map.set(room, r);
    });

    const cols = getLaundryComponentCodes();

    // Snapshot update: aggiorna tutte le celle in un colpo solo (niente clear→repaint→blink)
    document.querySelectorAll(".clean-grid .cell.slot").forEach(cell => {
      try{
        if (!cell || !cell.dataset) return;
        if (preserveDirty && __dirtyLaundryCells && __dirtyLaundryCells.has(cell)) return;

        const room = String(cell.dataset.room || "").trim();
        const col  = String(cell.dataset.col  || "").trim().toUpperCase();
        if (!room || !col) return;

        const r = map.get(room);
        const n = parseInt((r && (r[col] ?? r[col.toLowerCase()])) ?? 0, 10);
        const isPos = (!isNaN(n) && n > 0);

        cell.textContent = isPos ? String(n) : "";
        cell.classList.toggle("is-saved", isPos);
      }catch(_){}
    });
  };

  // --- Ore operatori: carica dal DB per il giorno selezionato (così un nuovo salvataggio SOVRASCRIVE davvero) ---
  const _normOpName = (s) => String(s || "").trim().toLowerCase();
  // chiave "robusta" per tollerare differenze di spazi/punteggiatura post-sync
  const _normOpKey  = (s) => _normOpName(s).replace(/[^a-z0-9]+/g, "");

  const applyOperatoriRows = (rows) => {
    if (!Array.isArray(rows)) rows = [];
    const mapExact = new Map();
    const mapKey = new Map();
    rows.forEach(r => {
      const raw = (r?.operatore || r?.nome || "");
      const op = _normOpName(raw);
      const key = _normOpKey(raw);
      const ore = parseInt(String(r?.ore ?? 0), 10);
      const v = isNaN(ore) ? 0 : Math.max(0, ore);
      if (op) mapExact.set(op, v);
      if (key) mapKey.set(key, v);
    });

    const names = __getPulizieOperatorNames(); // [op1, op2, op3] oppure [username,"",""]
    opEls.forEach((r, idx) => {
      const name = String(names[idx] || "").trim();
      if (!name) return; // non configurato (riga nascosta)
      const v = (mapExact.get(_normOpName(name)) ?? mapKey.get(_normOpKey(name)) ?? 0);
      writeHourDot(r.hours, v);
      r.hours.classList.toggle("is-saved", v > 0);
    });
  };

  const loadOperatoriForDay = async ({ clearFirst = true } = {}) => {
    if (clearFirst){
      // azzera dots visivamente (se poi arrivano dati li ripopola)
      const names = __getPulizieOperatorNames();
      opEls.forEach((r, idx) => {
        const name = String(names[idx] || "").trim();
        if (!name) return;
        writeHourDot(r.hours, 0);
        r.hours.classList.remove("is-saved");
      });
    }
    try{
      const data = getCleanDate();
      const res = await api("operatori", { method:"GET", params:{ data }, showLoader:false });

      const rows = Array.isArray(res) ? res
        : (res && Array.isArray(res.rows) ? res.rows
        : (res && Array.isArray(res.data) ? res.data
        : []));
      const rowsY = __filterByExerciseYear__(rows, state.exerciseYear || loadExerciseYear(), ["data","date","createdAt","created_at","updatedAt","updated_at"]);
      applyOperatoriRows(rowsY);
    }catch(_){
      // offline/errore: se clearFirst era true, restano a 0
    }
  };


  const loadPulizieForDay = async ({ clearFirst = true } = {}) => {
    // Quando cambi giorno: griglia subito vuota, poi (se ci sono) applica dati salvati.
    if (clearFirst) clearAllSlots();
    try{
      const day = (state && state.session && isOperatoreSession(state.session)) ? new Date() : (state.cleanDay ? new Date(state.cleanDay) : new Date());
      const data = toISODateLocal(day);
      const res = await api("pulizie", { method:"GET", params:{ data }, showLoader:false });

      // Supporta risposte: array diretto, oppure {data:[...]} / {rows:[...]} / nesting
      const rows = Array.isArray(res) ? res
        : (res && Array.isArray(res.data) ? res.data
        : (res && res.data && Array.isArray(res.data.data) ? res.data.data
        : (res && Array.isArray(res.rows) ? res.rows
        : [])));

      const preserveDirty = (!clearFirst) && (__savingLaundry || (__dirtyLaundryCells && __dirtyLaundryCells.size));
      const rowsY = __filterByExerciseYear__(rows, state.exerciseYear || loadExerciseYear(), ["data","date","createdAt","created_at","updatedAt","updated_at"]);
      applyPulizieRows(rowsY, { preserveDirty });

    }catch(_){
      // offline/errore: se stiamo cambiando giorno, resta vuota; se è un refresh "soft", non tocchiamo
      if (clearFirst) clearAllSlots();
    }
  };

const buildPuliziePayload = (roomsList = null) => {
    const data = getCleanDate();
    const cols = getLaundryComponentCodes();

    let rooms = null;
    if (Array.isArray(roomsList) && roomsList.length){
      rooms = roomsList.map(r => String(r)).filter(Boolean);
    } else {
      // fallback: tutte le stanze presenti nella griglia (1..6, ecc.)
      try{
        rooms = Array.from(new Set(Array.from(document.querySelectorAll('.clean-grid .cell.slot'))
          .map(el => String(el && el.dataset ? el.dataset.room : '').trim())
          .filter(Boolean)));
      }catch(_){ rooms = []; }
    }

    const rows = (rooms||[]).map(stanza => {
      const row = { data, stanza };
      cols.forEach(c => {
        const cell = document.querySelector(`.clean-grid .cell.slot[data-room="${stanza}"][data-col="${c}"]`);
        row[c] = cell ? readCell(cell) : 0;
      });
      return row;
    });

    return { data, rows };
  };

  // Tap incrementa, long press (0.5s) azzera
  let pressTimer = null;
  let pressTarget = null;
  let longFired = false;
  let lastTouchAt = 0;

  const clearPress = () => {
    if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
    pressTarget = null;
    longFired = false;
  };

  const startPress = (slot) => {
    if (!ensureCanEditPulizieDay()) return;
    clearPress();
    pressTarget = slot;
    pressTimer = setTimeout(() => {
      longFired = true;
      try{ __sfxGlass(); }catch(_){ }
      slot.classList.remove("is-saved");
      writeCell(slot, 0);
      try{ __markLaundryDirty(slot); }catch(_){ }
      scheduleLaundrySave();
    }, 500);
  };

  const tapSlot = (slot) => {
    if (!ensureCanEditPulizieDay()) return;
    try{ __sfxTap(); }catch(_){ }
    slot.classList.remove("is-saved");
    writeCell(slot, readCell(slot) + 1);
    try{ __markLaundryDirty(slot); }catch(_){ }
    scheduleLaundrySave();
  };

  if (cleanGrid){
    // Header click (MAT/SIN/FED...): mostra descrizione in popup
    let __lastHeadTouchAt = 0;
    const __pickHeadCode = (ev) => {
      const head = ev.target && ev.target.closest ? ev.target.closest(".cell.head") : null;
      if (!head || head.classList.contains("corner")) return null;
      const code = String(head.textContent || "").trim().toUpperCase();
      return getCleanHeaderDescMap()[code] ? code : null;
    };

    cleanGrid.addEventListener("touchend", (e) => {
      const code = __pickHeadCode(e);
      if (!code) return;
      __lastHeadTouchAt = Date.now();
      try{ __sfxTap(); }catch(_){ }
      openCleanHeaderModal(code);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    cleanGrid.addEventListener("click", (e) => {
      const code = __pickHeadCode(e);
      if (!code) return;
      if (Date.now() - __lastHeadTouchAt < 450) { e.preventDefault(); e.stopPropagation(); return; }
      try{ __sfxTap(); }catch(_){ }
      openCleanHeaderModal(code);
      e.preventDefault();
      e.stopPropagation();
    }, true);


    // Touch (iPhone)
    cleanGrid.addEventListener("touchstart", (e) => {
      const slot = e.target.closest && e.target.closest(".cell.slot");
      if (!slot) return;
      lastTouchAt = Date.now();
      startPress(slot);
      // blocca altri handler globali
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    cleanGrid.addEventListener("touchend", (e) => {
      const slot = e.target.closest && e.target.closest(".cell.slot");
      if (!slot) return;
      if (pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
      if (!longFired) tapSlot(slot);
      clearPress();
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    cleanGrid.addEventListener("touchcancel", (e) => {
      clearPress();
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
    }, { passive: false, capture: true });

    // Click (desktop) + anti ghost-click dopo touch
    cleanGrid.addEventListener("click", (e) => {
      const slot = e.target.closest && e.target.closest(".cell.slot");
      if (!slot) return;
      if (Date.now() - lastTouchAt < 450) { e.preventDefault(); e.stopPropagation(); return; }
      tapSlot(slot);
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  // Salva biancheria (foglio "pulizie")
if (cleanSaveLaundry){
  cleanSaveLaundry.addEventListener("click", (e) => {
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    try{ saveLaundryNow(); }catch(_){ }
  }, true);
}

// Salva ore lavoro (foglio "operatori")
if (cleanSaveHours){
  cleanSaveHours.addEventListener("click", (e) => {
    try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
    try{ saveHoursNow(); }catch(_){ }
  }, true);
}

// Reset SOLO biancheria
if (cleanResetLaundry){
  bindFastTap(cleanResetLaundry, async () => {
    try{
      // azzera tutte le celle biancheria (griglia pulizie)
      // IMPORTANTE: marca tutte le stanze/celle come "dirty" così il salvataggio parte davvero
      // e lo script può cancellare i record quando tutto è a zero.
      try{ __dirtyLaundryRooms = new Set(); __dirtyLaundryCells = new Set(); }catch(_){}

      const __allSlots = Array.from(document.querySelectorAll(".clean-grid .cell.slot"));
      __allSlots.forEach(el => {
        try{ el.classList.remove("is-saved"); }catch(_){ }
        try{ writeCell(el, 0); }catch(_){ }
        try{ __markLaundryDirty(el); }catch(_){ }
      });
      // salva immediatamente
      await saveLaundryNow();
    }catch(err){
      try{ toast(String(err && err.message || "Errore reset biancheria")); }catch(_){ }
    }
  });
}

// Reset SOLO ore (operatori)
if (cleanResetHours){
  bindFastTap(cleanResetHours, async () => {
    try{
      // azzera tutti i pallini ore (solo operatori visibili)
      try{
        (opEls||[]).forEach(r => {
          try{ r.hours.classList.remove("is-saved"); }catch(_){ }
          try{ writeHourDot(r.hours, 0); }catch(_){ }
        });
      }catch(_){ }
      // salva immediatamente
      await saveHoursNow();
    }catch(err){
      try{ toast(String(err && err.message || "Errore reset ore")); }catch(_){ }
    }
  });
}


// Reset TUTTO (Pulizie + Ore) dalla cella corner (con conferma Sì/No)
if (cleanResetAll){
  try{ __bindResetAllCorner(document.getElementById('cleanResetAll')); }catch(_){ }
}

  try{
    window.__ddae_refreshPulizieGrid = async ({ forceReload = false } = {}) => {
      try{ rebuildPulizieGrid({ preserveValues: !forceReload }); }catch(_){ }
      try{
        if (state && state.page === "pulizie") await loadPulizieForDay({ clearFirst: forceReload });
      }catch(_){ }
    };
  }catch(_){ }

  const updateCleanLabel = () => {
    const lab = document.getElementById("cleanDateLabel");
    const base = (state && state.session && isOperatoreSession(state.session)) ? new Date() : (state.cleanDay ? new Date(state.cleanDay) : new Date());
    const day = startOfLocalDay(base);
    if (lab) lab.textContent = formatFullDateIT(day);
    try{ if (state && state.page === "pulizie") __setTopbarCenterLabel__(); }catch(_){ }
  };

  const shiftClean = (deltaDays) => {
    try{
      const __isOp = !!(state && state.session && isOperatoreSession(state.session));
      if (__isOp){
        state.cleanDay = startOfLocalDay(new Date()).toISOString();
        updateCleanLabel();
        try{ loadPulizieForDay(); }catch(_){ }
        try{ loadOperatoriForDay(); }catch(_){ }
        return;
      }
    }catch(_){ }
    const base = state.cleanDay ? new Date(state.cleanDay) : new Date();
    const d = startOfLocalDay(base);
    d.setDate(d.getDate() + deltaDays);
    state.cleanDay = d.toISOString();
    updateCleanLabel();
    try{ loadPulizieForDay(); }catch(_){ }
    try{ loadOperatoriForDay(); }catch(_){ }
  };

  if (cleanPrev) cleanPrev.addEventListener("click", () => shiftClean(-1));
  if (cleanNext) cleanNext.addEventListener("click", () => shiftClean(1));
  if (cleanToday) cleanToday.addEventListener("click", () => {
    state.cleanDay = startOfLocalDay(new Date()).toISOString();
    updateCleanLabel();
    try{ loadPulizieForDay(); }catch(_){ }
    try{ loadOperatoriForDay(); }catch(_){ }
  });

  // inizializza label se apri direttamente la pagina
  try{
    const __isOp = !!(state && state.session && isOperatoreSession(state.session));
    const nav = document.querySelector("#page-pulizie .clean-nav");
    if (nav) nav.style.display = __isOp ? "none" : "";
    if (__isOp){
      state.cleanDay = startOfLocalDay(new Date()).toISOString();
    } else {
      if (!state.cleanDay) state.cleanDay = startOfLocalDay(new Date()).toISOString();
    }
  }catch(_){ if (!state.cleanDay) state.cleanDay = startOfLocalDay(new Date()).toISOString(); }
  updateCleanLabel();
  try{ loadPulizieForDay(); }catch(_){ }
  try{ loadOperatoriForDay(); }catch(_){ }



// --- Lavanderia ---
  const btnLaundryGenerate = document.getElementById("btnLaundryGenerate");
  const btnLaundryGenerateTop = document.getElementById("btnLaundryGenerateTop");
  const btnLaundryPricesTop = document.getElementById("btnLaundryPricesTop");
  const laundryPricesModal = document.getElementById("laundryPricesModal");
  const laundryPricesClose = document.getElementById("laundryPricesClose");
  const laundryPricesCancel = document.getElementById("laundryPricesCancel");
  const laundryPricesSave = document.getElementById("laundryPricesSave");
  try{
    const fromEl = document.getElementById("laundryFrom");
    const toEl   = document.getElementById("laundryTo");
    if (fromEl){ fromEl.addEventListener("change", syncLaundryDateText_); fromEl.addEventListener("input", syncLaundryDateText_); }
    if (toEl){ toEl.addEventListener("change", syncLaundryDateText_); toEl.addEventListener("input", syncLaundryDateText_); }
    syncLaundryDateText_();
  }catch(_){ }

if (btnLaundryGenerate){
    bindFastTap(btnLaundryGenerate, async () => {
      try{
        showPage("lavanderia");
        await createLavanderiaReport_();
      }catch(e){
        console.error(e);
        try{ toast(e.message || "Errore"); }catch(_){}
      }
    });
  }

  // Topbar (Lavanderia): Genera report accanto al tasto Home
  if (btnLaundryGenerateTop){
    bindFastTap(btnLaundryGenerateTop, async () => {
      try{
        showPage("lavanderia");
        await createLavanderiaReport_();
      }catch(e){
        console.error(e);
        try{ toast(e.message || "Errore"); }catch(_){ }
      }
    });
  }
  if (btnLaundryPricesTop){
    bindFastTap(btnLaundryPricesTop, async () => {
      try{
        showPage("lavanderia");
        await __openLaundryPricesModal__();
      }catch(e){
        console.error(e);
        try{ toast(e.message || "Errore"); }catch(_){ }
      }
    });
  }
  if (laundryPricesClose && !laundryPricesClose.__boundLaundryPricesClose){
    laundryPricesClose.__boundLaundryPricesClose = true;
    bindFastTap(laundryPricesClose, () => { __closeLaundryPricesModal__(); });
  }
  if (laundryPricesCancel && !laundryPricesCancel.__boundLaundryPricesCancel){
    laundryPricesCancel.__boundLaundryPricesCancel = true;
    bindFastTap(laundryPricesCancel, () => { __closeLaundryPricesModal__(); });
  }
  if (laundryPricesSave && !laundryPricesSave.__boundLaundryPricesSave){
    laundryPricesSave.__boundLaundryPricesSave = true;
    bindFastTap(laundryPricesSave, async () => {
      try{ await __saveLaundryPricesModal__(); }catch(e){ try{ toast(e?.message || "Errore"); }catch(_){ } }
    });
  }
  if (laundryPricesModal && !laundryPricesModal.__boundLaundryPricesBackdrop){
    laundryPricesModal.__boundLaundryPricesBackdrop = true;
    laundryPricesModal.addEventListener('click', (ev) => { if (ev.target === laundryPricesModal) __closeLaundryPricesModal__(); });
  }
if (typeof btnOrePuliziaFromPulizie !== "undefined" && btnOrePuliziaFromPulizie){
    bindFastTap(btnOrePuliziaFromPulizie, () => {
      try{ showPage("orepulizia"); }catch(_){}
    });
  }

  if (typeof btnLaundryFromPulizie !== "undefined" && btnLaundryFromPulizie){
    bindFastTap(btnLaundryFromPulizie, async () => {
      try{
        showPage("lavanderia");
        }catch(e){
        console.error(e);
        try{ toast(e.message || "Errore"); }catch(_){}
      }
    });
  }

}


// ===== CALENDARIO (dDAE_1.020) =====
function setupCalendario(){
  const pickBtn = document.getElementById("calPickBtn");
  const todayBtn = document.getElementById("calTodayBtn");
  const prevMonthBtn = document.getElementById("calPrevMonthBtn");
  const prevBtn = document.getElementById("calPrevBtn");
  const nextBtn = document.getElementById("calNextBtn");
  const nextMonthBtn = document.getElementById("calNextMonthBtn");
  const syncBtn = document.getElementById("calSyncBtn");
  const input = document.getElementById("calDateInput");
  const toggleMonthBtn = document.getElementById("calToggleMonthBtn");

  if (!state.calendar) {
    state.calendar = { anchor: new Date(), ready: false, guests: [] };
  }
// View mode: "week" (default) / "month"
  state.calendar.viewMode = "month";

  const applyCalendarViewUI = () => {
    const sec = document.getElementById("page-calendario");
    const isMonth = (state.calendar && state.calendar.viewMode === "month");
    try{ if (sec) sec.classList.toggle("is-month-view", !!isMonth); }catch(_){

    try{ if (!isMonth) document.body.classList.remove("cal-month-landscape"); }catch(_){}
}

    if (toggleMonthBtn){
      try{
        toggleMonthBtn.setAttribute("aria-label", __translateText__(isMonth ? "Calendario settimanale" : "Calendario mensile"));
        toggleMonthBtn.classList.toggle("is-active", !!isMonth);
      }catch(_){}
    }
  };


  const __scheduleCalendarFetch = (() => {
    let t = null;
    return ({ force=false, showLoader=false } = {}) => {
      if (!state.calendar) return;
      if (t) { try{ clearTimeout(t); }catch(_){} }
      const req = (state.calendar._reqId = (state.calendar._reqId || 0) + 1);
      state.calendar.loading = true;
      t = setTimeout(async () => {
        const my = req;
        try{
          await ensureCalendarData({ force, showLoader });
        }catch(e){
          console.error(e);
        }finally{
          try{ if (state.calendar && state.calendar._reqId === my) state.calendar.loading = false; }catch(_){}
        }
        try{
          if (state.page === "calendario" && state.calendar && state.calendar._reqId === my){
            renderCalendario();
          }
        }catch(_){ }
      }, 120);
    };
  })();

  // Sync: forza lettura database (tap-safe iOS PWA)
  if (syncBtn){
    syncBtn.setAttribute("aria-label", __translateText__("Forza lettura database"));
    bindFastTap(syncBtn, async () => {
      try{
        syncBtn.disabled = true;
        syncBtn.classList.add("is-loading");
        if (state.calendar) state.calendar.ready = false;
        await ensureCalendarData({ force:true, showLoader:false });
        renderCalendario();
        try{ toast("Aggiornato"); }catch(_){ }
      }catch(e){
        console.error(e);
        try{ toast(e.message || "Errore"); }catch(_){ }
      }finally{
        syncBtn.classList.remove("is-loading");
        syncBtn.disabled = false;
      }
    });
  }

  const openPicker = () => {
    if (!input) return;
    try { input.value = formatISODateLocal(state.calendar.anchor) || todayISO(); } catch(_) {}
    input.click();
  };

  if (pickBtn) pickBtn.addEventListener("click", openPicker);
  if (input) input.addEventListener("change", () => {
    if (!input.value) return;
    const d = new Date(input.value + "T00:00:00");
    state.calendar.anchor = d;
    renderCalendario();
    __scheduleCalendarFetch({ force:false, showLoader:false });
  });
  if (todayBtn) todayBtn.addEventListener("click", () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    state.calendar.anchor = d;
    renderCalendario();
    requestAnimationFrame(() => { try{ scrollCalendarMonthToDayLeft(d.getDate()); }catch(_){ } });
    __scheduleCalendarFetch({ force:false, showLoader:false });
  });

  const addMonthsClamped = (dt, delta) => {
    const d = new Date(dt);
    const day = d.getDate();
    // vai al primo del mese per evitare overflow (es. 31 -> mese con 30)
    d.setHours(0,0,0,0);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    d.setHours(0,0,0,0);
    return d;
  };

  const shiftAnchorAndRender = (newAnchor, { force=false } = {}) => {
    state.calendar.anchor = newAnchor;
    // Render immediato: prima cambia pagina, poi aggiorna i dati
    renderCalendario();
    // Refresh in background (no loader)
    __scheduleCalendarFetch({ force, showLoader:false });
  };

  if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => {
    shiftAnchorAndRender(addMonthsClamped(state.calendar.anchor, -1));
  });
  if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => {
    shiftAnchorAndRender(addMonthsClamped(state.calendar.anchor, 1));
  });
  // Applica stato UI all'avvio
  applyCalendarViewUI();

  // Landscape-fit: ridimensiona la griglia mensile per rientrare a schermo (solo in vista mese)
  try{
    if (!window.__ddaeCalMonthFitBound){
      window.__ddaeCalMonthFitBound = true;
      let __t = null;
      window.addEventListener("resize", () => {
        try{
          if (__t) clearTimeout(__t);
          __t = setTimeout(() => {
            try{
              if (state && state.page === "calendario" && state.calendar && state.calendar.viewMode === "month"){
                requestAnimationFrame(()=>{ try{ __fitCalendarioMonthLandscape(); }catch(_){ } });
              }
            }catch(_){ }
          }, 120);
        }catch(_){ }
      }, { passive:true });
    }
  }catch(_){ }
}



async function ensureCalendarData({ force = false, showLoader = false } = {}) {
  if (!state.calendar) state.calendar = { anchor: new Date(), ready: false, guests: [], rangeKey: "" };

  const anchor = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();

  const mode = "month";
  let winFrom, winTo, rangeKey;

  if (mode === "month"){
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEndEx = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

    // Finestra dati mese: piccolo buffer ai bordi (copre check-in/out adiacenti)
    winFrom = toISO(addDays(monthStart, -3));
    winTo   = toISO(addDays(monthEndEx, 3));
    rangeKey = `M:${winFrom}|${winTo}`;
  } else {
    const start = startOfWeekMonday(anchor);

    // Finestra dati: 2 settimane prima + 2 settimane dopo (evita payload enormi)
    winFrom = toISO(addDays(start, -14));
    winTo   = toISO(addDays(start, 7 + 14));
    rangeKey = `W:${winFrom}|${winTo}`;
  }

  // Se ho già i dati per questa finestra, non ricarico
  if (!force && state.calendar.ready && state.calendar.rangeKey === rangeKey) return;

  // Carica configurazione letti ("stanze") solo se serve (evita loader ad ogni navigazione)
  if (!state.stanzeRows || !state.stanzeRows.length){
    try{ await load({ showLoader }); }catch(_){ }
  }

  const data = await cachedGet("ospiti", { from: winFrom, to: winTo }, { showLoader, ttlMs: 60*1000, force });
  state.calendar.guests = Array.isArray(data) ? data : [];
  state.calendar.ready = true;
  state.calendar.rangeKey = rangeKey;
  state.calendar.fetchedAt = Date.now();
}


function renderCalendario(){
  if (!state.calendar) state.calendar = { anchor: new Date(), ready: false, guests: [] };
  const mode = "month";

  try{ __setTopbarCenterLabel__(); }catch(_){}

  try{
    const sec = document.getElementById("page-calendario");
    if (sec) sec.classList.toggle("is-month-view", mode === "month");
  }catch(_){}

  try{ applyCalRoomFreeze(mode); }catch(_){ }

  const gWeek = document.getElementById("calGrid");
  const gMonth = document.getElementById("calGridMonth");
  try{
    if (gWeek && mode !== "month") gWeek.hidden = false;
    if (gMonth && mode !== "month") gMonth.hidden = true;
  }catch(_){}

  return renderCalendarioMonth();
}


/* dDAE_1.020 — Calendario: blocca SOLO la colonna numeri stanze durante lo scroll orizzontale (fix iOS) */
function ensureCalRoomFreezeBound(){
  const wrap = document.querySelector("#page-calendario .cal-grid-wrap");
  if (!wrap) return;

  // Se già bindato, aggiorna subito
  if (wrap.__roomFreezeUpdate){
    try{ wrap.__roomFreezeUpdate(); }catch(_){}
    return;
  }

  let raf = 0;
  const update = ()=>{
    raf = 0;
    const x = (wrap && typeof wrap.scrollLeft === "number") ? wrap.scrollLeft : 0;
    const rooms = wrap.querySelectorAll(".cal-pill.room");
    rooms.forEach(el=>{
      try{ el.style.transform = `translateX(${x}px)`; }catch(_){}
    });
  };

  const onScroll = ()=>{
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  wrap.__roomFreezeUpdate = update;

  try{ wrap.addEventListener("scroll", onScroll, { passive: true }); }catch(_){ wrap.addEventListener("scroll", onScroll); }
  try{ window.addEventListener("resize", onScroll, { passive: true }); }catch(_){ window.addEventListener("resize", onScroll); }
  try{ window.addEventListener("orientationchange", onScroll, { passive: true }); }catch(_){ window.addEventListener("orientationchange", onScroll); }

  // Prima applicazione
  update();
}

function applyCalRoomFreeze(mode){
  const wrap = document.querySelector("#page-calendario .cal-grid-wrap");
  if (!wrap) return;

  ensureCalRoomFreezeBound();

  if (mode !== "month"){
    // In settimana non deve restare alcun offset residuo
    try{ wrap.scrollLeft = 0; }catch(_){}
    try{
      const rooms = wrap.querySelectorAll(".cal-pill.room");
      rooms.forEach(el=>{
        try{ el.style.transform = "translateX(0px)"; }catch(_){}
      });
    }catch(_){}
    return;
  }

  // In mese: applica offset in base allo scroll attuale
  try{ if (wrap.__roomFreezeUpdate) wrap.__roomFreezeUpdate(); }catch(_){}
}

function renderCalendarioWeek(){
  const grid = document.getElementById("calGrid");
  try{ if (grid) grid.classList.toggle("is-loading", !!(state.calendar && state.calendar.loading)); }catch(_){ }
  const title = document.getElementById("calWeekTitle");
  const input = document.getElementById("calDateInput");
  if (!grid) return;

  grid.replaceChildren();
  const frag = document.createDocumentFragment();

  const anchor = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
  const start = startOfWeekMonday(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  // Mantieni input data sincronizzato con l'anchor (utile quando navighi con le frecce)
  try{ if (input) input.value = formatISODateLocal(anchor) || todayISO(); }catch(_){ }
  if (title) {
    // Il mese deve comparire SOLO in top bar (non sotto i controlli)
    title.textContent = "";
    title.hidden = true;
  }
  const occ = buildWeekOccupancy(start);

  grid.innerHTML = "";

  // Angolo alto-sinistra: etichetta "ST" (sopra la colonna stanze, a sinistra dei giorni)
  const corner = document.createElement("div");
  corner.className = "cal-cell cal-head cal-corner";
  corner.innerHTML = `<div class="cal-corner-text">ST</div>`;
  frag.appendChild(corner);

// Prima riga: giorni (colonne)
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    const dayPill = document.createElement("div");
    dayPill.className = "cal-cell cal-head";
    dayPill.dataset.dayIndex = String(i + 1);
    if (getCalendarTodayColumnIndex(anchor) === (i + 1)) dayPill.classList.add('is-today-col');

    // Abbreviazione (LUN, MAR...) sopra, numero giorno sotto
    const ab = document.createElement("div");
    ab.className = "cal-day-abbrev";
    ab.textContent = ((window.matchMedia && window.matchMedia("(orientation: landscape)").matches) ? weekdayShortIT(d).toUpperCase().slice(0,1) : weekdayShortIT(d).toUpperCase());

    const num = document.createElement("div");
    num.className = "cal-day-num";
    num.textContent = String(d.getDate());

    dayPill.appendChild(ab);
    dayPill.appendChild(num);

    frag.appendChild(dayPill);
  }

  // Righe: stanze (prima colonna) + celle per ogni giorno
  for (let r = 1, roomsCount = getConfiguredRoomsCount(6); r <= roomsCount; r++) {
    const pill = document.createElement("div");
    pill.className = `cal-pill room room-${r}`;

    const rn = document.createElement("span");
    rn.className = "cal-room-num";
    rn.textContent = String(r);
    pill.appendChild(rn);

    frag.appendChild(pill);

    for (let i = 0; i < 7; i++) {
      const d = days[i];
      const dIso = isoDate(d);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cal-cell room-${r}`;
      cell.setAttribute("aria-label", `Stanza ${r}, ${weekdayShortIT(d)} ${d.getDate()}`);
      cell.dataset.date = dIso;
      cell.dataset.room = String(r);
      const info = occ.get(`${dIso}:${r}`);
      if (!info) {
        // Casella vuota: nessuna azione (evita anche handler globali tipo [data-room])
        cell.addEventListener("click", (ev)=>{
          try { ev.preventDefault(); } catch (_) {}
          try { ev.stopPropagation(); } catch (_) {}

          // Feedback minimo: solo bordo nero spesso (nessuna azione / nessuna apertura schede)
          try{
            const prev = grid.querySelector(".cal-cell.empty-selected");
            if (prev && prev !== cell) prev.classList.remove("empty-selected");
            cell.classList.toggle("empty-selected");
          }catch(_){}
        });
      }
      if (info) {
        cell.classList.add("has-booking");
// Flags m/c/g negli angoli (flat)
        try{
          const flags = document.createElement("div");
          flags.className = "cal-flags";

          if (info.mOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-m";
            f.textContent = "m";
            flags.appendChild(f);
          }
          if (info.cOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-c";
            f.textContent = "c";
            flags.appendChild(f);
          }
          if (info.gOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-g";
            f.textContent = "g";
            flags.appendChild(f);
          }

          if (flags.childNodes.length) cell.appendChild(flags);
        }catch(_){ }

        const inner = document.createElement("div");
        inner.className = "cal-cell-inner";

        const ini = document.createElement("div");
        ini.className = "cal-initials";
        const __ini = (info.initials && String(info.initials).trim()) ? String(info.initials).trim() : ((()=>{ const __g = findCalendarGuestById(info.guestId); return initialsFromName(__g?.nome || __g?.name || __g?.Nome || __g?.NOME || __g?.guestName || ""); })());
        ini.textContent = __ini;
        inner.appendChild(ini);

        const dots = document.createElement("div");
        dots.className = "cal-dots";
        const arr = info.dots.slice(0, 4); // 2x2
        for (const t of arr) {
          const s = document.createElement("span");
          s.className = `bed-dot ${t === "m" ? "bed-dot-m" : t === "s" ? "bed-dot-s" : "bed-dot-c"}`;
          dots.appendChild(s);
        }
        inner.appendChild(dots);

        cell.appendChild(inner);

        cell.addEventListener("click", (ev) => {
          // Pulisci eventuale selezione su casella vuota
          try{ const prev = grid.querySelector(".cal-cell.empty-selected"); if (prev) prev.classList.remove("empty-selected"); }catch(_){}

          // Se la cella ha una prenotazione, apri la scheda in SOLA LETTURA
          // e blocca la propagazione per evitare l'apertura del popup letto (listener globale [data-room]).
          try { ev.preventDefault(); } catch (_) {}
          try { ev.stopPropagation(); } catch (_) {}

          const ospite = findCalendarGuestById(info.guestId);
          if (!ospite) return;
          enterGuestViewMode(ospite);
          showPage("ospite");
        });
      }

      frag.appendChild(cell);
    }
  }
  grid.appendChild(frag);
}





function __fitCalendarioMonthLandscape(){
  try{
    if (!state || state.page !== "calendario") return;
    if (!state.calendar || state.calendar.viewMode !== "month") return;

    const isLandscape = (window.matchMedia && window.matchMedia("(orientation: landscape)").matches);

    // dDAE_1.020: in vista mese su iPad landscape usa tutta la larghezza disponibile (margine 10px L/R)
    try{ document.body.classList.toggle("cal-month-landscape", !!isLandscape); }catch(_){}

    const grid = document.getElementById("calGridMonth");
    const wrap = document.querySelector("#page-calendario .cal-grid-wrap");
    if (!grid || !wrap) return;

    // Aggiorna abbreviazioni giorni (solo iniziale in landscape)
    try{
      const a = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
      const ms = new Date(a.getFullYear(), a.getMonth(), 1);
      const abEls = grid.querySelectorAll('.cal-cell.cal-head:not(.cal-corner) .cal-day-abbrev');
      for (let i = 0; i < abEls.length; i++){
        const d = new Date(ms.getFullYear(), ms.getMonth(), i+1);
        let t = weekdayShortIT(d).toUpperCase();
        if (isLandscape) t = t.slice(0,1);
        abEls[i].textContent = t;
      }
    }catch(_){}

    // Pulisci override se non landscape
    if (!isLandscape){
      try{ grid.style.removeProperty("--cal-cell-h"); }catch(_){}
      try{ grid.style.removeProperty("--cal-pill-h"); }catch(_){}
      try{ grid.style.removeProperty("grid-template-columns"); }catch(_){}
      // Ripristina template dinamico standard (var day width) se possibile
      try{
        const anchor = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
        const daysCount = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
        grid.style.gridTemplateColumns = `var(--cal-room-w) repeat(${daysCount}, var(--cal-day-w))`;
      }catch(_){}
      return;
    }

    const anchor = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
    const daysCount = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();

    // Misure reali (px)
    let wrapW = wrap.clientWidth || 0;
    // Rispetta padding/margini interni (10px L/R) se presenti
    try{
      const stWrap = getComputedStyle(wrap);
      const pl = parseFloat(stWrap.paddingLeft || "0") || 0;
      const pr = parseFloat(stWrap.paddingRight || "0") || 0;
      wrapW = Math.max(0, wrapW - pl - pr);
    }catch(_){}
    if (wrapW <= 0) return;

    // Room col: usa la larghezza effettiva della prima colonna (corner)
    let roomW = 0;
    try{
      const corner = grid.querySelector(".cal-corner");
      if (corner) roomW = corner.getBoundingClientRect().width;
    }catch(_){}
    if (!roomW || roomW < 10) roomW = 44;

    // Gap colonna
    let gap = 0;
    try{
      const st = getComputedStyle(grid);
      gap = parseFloat(st.columnGap || st.gap || "0") || 0;
    }catch(_){}
    // gap totali tra (1+daysCount) colonne = daysCount
    const totalGap = gap * daysCount;

    const availDaysW = wrapW - roomW - totalGap;
    if (availDaysW <= 0) return;

    let dayW = Math.floor(availDaysW / daysCount);
    // Limiti di sicurezza: evita colonne troppo piccole o negative
    dayW = Math.max(10, Math.min(dayW, 64));

    // Altezza: 1 header + 6 righe stanze = 7 righe
    const rows = 7;
    const rowGaps = gap * (rows - 1);
    let availH = 0;
    try{
      const rect = wrap.getBoundingClientRect();
      availH = Math.floor(window.innerHeight - rect.top - 10);
    }catch(_){}
    if (!availH || availH < 200) availH = 260;

    let cellH = Math.floor((availH - rowGaps) / rows);
    cellH = Math.max(34, Math.min(cellH, 120));

    
    // Riduci altezza celle del 10%
    cellH = Math.floor(cellH * 0.90);
let pillH = Math.floor(cellH * 0.38);
    pillH = Math.max(18, Math.min(pillH, 46));

    // Applica override inline (solo month+landscape)
    try{
      grid.style.gridTemplateColumns = `${Math.floor(roomW)}px repeat(${daysCount}, minmax(${dayW}px, 1fr))`;
      grid.style.setProperty("--cal-cell-h", `${cellH}px`);
      grid.style.setProperty("--cal-pill-h", `${pillH}px`);
    }catch(_){}
  }catch(_){}
}

function getCalendarTodayColumnIndex(anchor){
  try{
    const now = new Date();
    now.setHours(0,0,0,0);
    const a = (anchor instanceof Date) ? anchor : new Date(anchor || Date.now());
    if (now.getFullYear() !== a.getFullYear() || now.getMonth() !== a.getMonth()) return -1;
    return now.getDate();
  }catch(_){ return -1; }
}

function scrollCalendarMonthToDayLeft(dayIndex){
  try{
    const wrap = document.querySelector('#page-calendario .cal-grid-wrap');
    const grid = document.getElementById('calGridMonth');
    if (!wrap || !grid || !dayIndex || dayIndex < 1) return;
    const head = grid.querySelector(`.cal-cell.cal-head[data-day-index="${dayIndex}"]`);
    const corner = grid.querySelector('.cal-corner');
    if (!head) return;
    const headLeft = head.offsetLeft || 0;
    const roomW = corner ? corner.offsetWidth || 0 : 0;
    const target = Math.max(0, headLeft - roomW);
    try{ wrap.scrollTo({ left: target, behavior: 'auto' }); }catch(_){ wrap.scrollLeft = target; }
    try{ if (wrap.__roomFreezeUpdate) wrap.__roomFreezeUpdate(); }catch(_){ }
  }catch(_){ }
}

function renderCalendarioMonth(){
  const grid = document.getElementById("calGridMonth");
  const gridWeek = document.getElementById("calGrid");
  try{ if (gridWeek) gridWeek.classList.remove("is-loading"); }catch(_){ }
  try{ if (grid) grid.classList.toggle("is-loading", !!(state.calendar && state.calendar.loading)); }catch(_){ }
  const title = document.getElementById("calWeekTitle");
  const input = document.getElementById("calDateInput");
  if (!grid) return;

  // Toggle DOM visibility
  try{ if (gridWeek) gridWeek.hidden = true; }catch(_){ }
  try{ grid.hidden = false; }catch(_){ }

  grid.replaceChildren();
  const frag = document.createDocumentFragment();

  const anchor = (state.calendar && state.calendar.anchor) ? state.calendar.anchor : new Date();
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const daysCount = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysCount }, (_, i) => addDays(monthStart, i));

  // Mantieni input data sincronizzato con l'anchor
  try{ if (input) input.value = formatISODateLocal(anchor) || todayISO(); }catch(_){ }
  if (title) {
    // Il mese deve comparire SOLO in top bar (non sotto i controlli)
    title.textContent = "";
    title.hidden = true;
  }
  // Imposta le colonne dinamiche (1 colonna stanze + N giorni)
  try{
    grid.style.gridTemplateColumns = `var(--cal-room-w) repeat(${daysCount}, var(--cal-day-w))`;
  }catch(_){ }

  const occ = buildMonthOccupancy(monthStart, daysCount);

  const corner = document.createElement("div");
  corner.className = "cal-cell cal-head cal-corner";
  corner.innerHTML = `<div class="cal-corner-text">ST</div>`;
  frag.appendChild(corner);

  for (let i = 0; i < daysCount; i++) {
    const d = days[i];
    const dayPill = document.createElement("div");
    dayPill.className = "cal-cell cal-head";
    dayPill.dataset.dayIndex = String(i + 1);
    if (getCalendarTodayColumnIndex(anchor) === (i + 1)) dayPill.classList.add('is-today-col');

    const ab = document.createElement("div");
    ab.className = "cal-day-abbrev";
    ab.textContent = weekdayShortIT(d).toUpperCase();

    const num = document.createElement("div");
    num.className = "cal-day-num";
    num.textContent = String(d.getDate());

    dayPill.appendChild(ab);
    dayPill.appendChild(num);

    frag.appendChild(dayPill);
  }

  for (let r = 1, roomsCount = getConfiguredRoomsCount(6); r <= roomsCount; r++) {
    const pill = document.createElement("div");
    pill.className = `cal-pill room room-${r}`;

    const rn = document.createElement("span");
    rn.className = "cal-room-num";
    rn.textContent = String(r);
    pill.appendChild(rn);

    frag.appendChild(pill);

    for (let i = 0; i < daysCount; i++) {
      const d = days[i];
      const dIso = isoDate(d);

      const info = occ.get(`${dIso}:${r}`);

      // Prenotazione: renderizza una sola "barra" che copre i giorni consecutivi (span)
      if (info) {
        let span = 1;
        for (let j = i + 1; j < daysCount; j++) {
          const d2Iso = isoDate(days[j]);
          const info2 = occ.get(`${d2Iso}:${r}`);
          if (info2 && String(info2.guestId) === String(info.guestId)) span++;
          else break;
        }

        const endIdx = i + span - 1;
        const endInfo = occ.get(`${isoDate(days[endIdx])}:${r}`);

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `cal-cell room-${r} has-booking calendar-event-bar`;
        cell.style.gridColumn = `span ${span}`;
        const __todayCol = getCalendarTodayColumnIndex(anchor);
        if (__todayCol > 0 && (i + 1) <= __todayCol && __todayCol <= (i + span)) cell.classList.add('is-today-col');
        cell.setAttribute("aria-label", `Stanza ${r}, ${weekdayShortIT(d)} ${d.getDate()} - ${days[endIdx].getDate()}`);
        cell.dataset.date = dIso;
        cell.dataset.room = String(r);
        cell.dataset.span = String(span);
const openGuest = () => {
          const ospite = findCalendarGuestById(info.guestId);
          if (!ospite) return;
          enterGuestViewMode(ospite);
          showPage("ospite");
        };

        try{
          const flags = document.createElement("div");
          flags.className = "cal-flags";

          const bindFlag = (el) => {
            try{
              el.tabIndex = 0;
              el.setAttribute("role", "button");
              el.addEventListener("click", (ev)=>{
                try { ev.preventDefault(); } catch (_) {}
                try { ev.stopPropagation(); } catch (_) {}
                openGuest();
              });
              el.addEventListener("keydown", (ev)=>{
                const k = ev && ev.key;
                if (k === "Enter" || k === " ") {
                  try { ev.preventDefault(); } catch (_) {}
                  try { ev.stopPropagation(); } catch (_) {}
                  openGuest();
                }
              });
            }catch(_){}
          };

          if (info.mOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-m";
            f.textContent = "m";
            bindFlag(f);
            flags.appendChild(f);
          }
          if (info.cOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-c";
            f.textContent = "c";
            bindFlag(f);
            flags.appendChild(f);
          }
          if (info.gOn){
            const f = document.createElement("span");
            f.className = "cal-flag cal-flag-g";
            f.textContent = "g";
            bindFlag(f);
            flags.appendChild(f);
          }

          if (flags.childNodes.length) cell.appendChild(flags);
        }catch(_){ }

        const inner = document.createElement("div");
        inner.className = "cal-cell-inner";

        const fullName = collapseSpaces(String((findCalendarGuestById(info.guestId)?.nome || findCalendarGuestById(info.guestId)?.name || findCalendarGuestById(info.guestId)?.Nome || findCalendarGuestById(info.guestId)?.NOME || '')).trim());
        const label = document.createElement("div");
        label.className = (span >= 3 && fullName.length >= 3) ? "cal-fullname" : "cal-initials";
        label.textContent = (span >= 3 && fullName.length >= 3) ? fullName : info.initials;
        inner.appendChild(label);

        const dots = document.createElement("div");
        dots.className = "cal-dots";
        const arr = info.dots.slice(0, 4);
        for (const t of arr) {
          const s = document.createElement("span");
          s.className = `bed-dot ${t === "m" ? "bed-dot-m" : t === "s" ? "bed-dot-s" : "bed-dot-c"}`;
          dots.appendChild(s);
        }
        inner.appendChild(dots);

        cell.appendChild(inner);

        cell.addEventListener("click", (ev) => {
          try{ const prev = grid.querySelector(".cal-cell.empty-selected"); if (prev) prev.classList.remove("empty-selected"); }catch(_){}
          try { ev.preventDefault(); } catch (_) {}
          try { ev.stopPropagation(); } catch (_) {}
          openGuest();
        });

        frag.appendChild(cell);

        // Salta i giorni coperti dalla barra
        i += (span - 1);
        continue;
      }

      // Casella vuota
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cal-cell room-${r}`;
      if (getCalendarTodayColumnIndex(anchor) === (i + 1)) cell.classList.add('is-today-col');
      cell.setAttribute("aria-label", `Stanza ${r}, ${weekdayShortIT(d)} ${d.getDate()}`);
      cell.dataset.date = dIso;
      cell.dataset.room = String(r);

      cell.addEventListener("click", (ev)=>{
        try { ev.preventDefault(); } catch (_) {}
        try { ev.stopPropagation(); } catch (_) {}
        try{
          const prev = grid.querySelector(".cal-cell.empty-selected");
          if (prev && prev !== cell) prev.classList.remove("empty-selected");
          cell.classList.toggle("empty-selected");
        }catch(_){}
      });

      frag.appendChild(cell);
    }
  }

  grid.appendChild(frag);

  // In landscape (solo vista mese) ridimensiona la griglia per rientrare nello schermo
  try{ requestAnimationFrame(()=>{ try{ __fitCalendarioMonthLandscape(); }catch(_){ } }); }catch(_){ }
}

function findCalendarGuestById(id){
  const gid = String(id ?? "").trim();
  const arr = (state.calendar && Array.isArray(state.calendar.guests)) ? state.calendar.guests : [];
  return arr.find(o => String(o.id ?? o.ID ?? o.ospite_id ?? o.ospiteId ?? o.guest_id ?? o.guestId ?? "").trim() === gid) || null;
}

function buildMonthOccupancy(monthStart, daysCount){
  const map = new Map();
  const guests = (state.calendar && Array.isArray(state.calendar.guests)) ? state.calendar.guests : [];
  const monthEndEx = addDays(monthStart, daysCount);

  for (const g of guests){
    const guestId = String(g.id ?? g.ID ?? g.ospite_id ?? g.ospiteId ?? g.guest_id ?? g.guestId ?? "").trim();
    if (!guestId) continue;

    const ciStr = formatISODateLocal(g.check_in || g.checkIn || "");
    const coStr = formatISODateLocal(g.check_out || g.checkOut || "");
    if (!ciStr || !coStr) continue;

    const ci = new Date(ciStr + "T00:00:00");
    const co = new Date(coStr + "T00:00:00");
    const last = addDays(co, -1);
    const lastIso = isoDate(last);

    let roomsArr = [];
    try {
      const st = g.stanze;
      if (Array.isArray(st)) roomsArr = st;
      else if (st != null && String(st).trim().length) {
        roomsArr = _parseRoomsArr(st);
      }
    } catch (_) {}
    roomsArr = normalizeRoomsList(roomsArr, 6);
    if (!roomsArr.length) continue;

    const initials = initialsFromName(g.nome || g.name || g.Nome || g.NOME || g.guestName || g.fullName || g.full_name || "");

    const mOn = !!(g.matrimonio);
    const gOn = truthy(g.g ?? g.flag_g ?? g.gruppo_g ?? g.group ?? g.g_flag);
    const cOn = truthy(g.col_c ?? g.colC ?? g.c ?? g.C ?? g.flag_c ?? g.flagC ?? g.colc ?? g.c_flag);

    for (let d = new Date(ci); d < co; d = addDays(d, 1)) {
      if (d < monthStart || d >= monthEndEx) continue;
      const dIso = isoDate(d);
      const isLast = dIso === lastIso;

      for (const r of roomsArr) {
        const dots = dotsForGuestRoom(guestId, r);
        map.set(`${dIso}:${r}`, { guestId, initials, dots, lastDay: isLast, mOn, gOn, cOn });
      }
    }
  }
  return map;
}

function buildWeekOccupancy(weekStart){
  const map = new Map();
  const guests = (state.calendar && Array.isArray(state.calendar.guests)) ? state.calendar.guests : [];
  const weekEnd = addDays(weekStart, 7);
  const todayIso = isoDate(new Date());


  for (const g of guests){
    const guestId = String(g.id ?? g.ID ?? g.ospite_id ?? g.ospiteId ?? g.guest_id ?? g.guestId ?? "").trim();
    if (!guestId) continue;

    const ciStr = formatISODateLocal(g.check_in || g.checkIn || "");
    const coStr = formatISODateLocal(g.check_out || g.checkOut || "");
    if (!ciStr || !coStr) continue;

    const ci = new Date(ciStr + "T00:00:00");
    const co = new Date(coStr + "T00:00:00");
    const last = addDays(co, -1);
    const lastIso = isoDate(last);
    const lastIsPresentOrFuture = (lastIso >= todayIso);

    let roomsArr = [];
    try {
      const st = g.stanze;
      if (Array.isArray(st)) roomsArr = st;
      else if (st != null && String(st).trim().length) {
        roomsArr = _parseRoomsArr(st);
      }
    } catch (_) {}
    roomsArr = normalizeRoomsList(roomsArr, 6);
    if (!roomsArr.length) continue;

    const initials = initialsFromName(g.nome || g.name || g.Nome || g.NOME || g.guestName || g.fullName || g.full_name || "");

    const mOn = !!(g.matrimonio);
    const gOn = truthy(g.g ?? g.flag_g ?? g.gruppo_g ?? g.group ?? g.g_flag);
    const cOn = truthy(g.col_c ?? g.colC ?? g.c ?? g.C ?? g.flag_c ?? g.flagC ?? g.colc ?? g.c_flag);

    for (let d = new Date(ci); d < co; d = addDays(d, 1)) {
      if (d < weekStart || d >= weekEnd) continue;
      const dIso = isoDate(d);
      const isLast = isoDate(d) === lastIso;

      for (const r of roomsArr) {
        const dots = dotsForGuestRoom(guestId, r);
        map.set(`${dIso}:${r}`, { guestId, initials, dots, lastDay: isLast, mOn, gOn, cOn });
      }
    }
  }
  return map;
}

function dotsForGuestRoom(guestId, room){
  const key = `${guestId}:${room}`;
  const info = (state.stanzeByKey && state.stanzeByKey[key]) ? state.stanzeByKey[key] : { letto_m:0, letto_s:0, culla:0 };
  const lettoM = Number(info.letto_m || 0) || 0;
  const lettoS = Number(info.letto_s || 0) || 0;
  const culla = Number(info.culla || 0) || 0;

  const arr = [];
  if (lettoM > 0) arr.push("m");
  for (let i=0;i<lettoS;i++) arr.push("s");
  if (culla > 0) arr.push("c");
  return arr;
}

function initialsFromName(name){
  const s = collapseSpaces(String(name||"").trim());
  if (!s) return "";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  const a = parts[0].slice(0,1);
  const b = parts[parts.length-1].slice(0,1);
  return (a+b).toUpperCase();
}

function startOfWeekMonday(date){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(d, diff);
}

function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0,0,0,0);
  return d;
}

function isoDate(date){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function weekdayShortIT(date){
  try{
    const label = __getWeekdayShortForLocale__(date);
    return __capitalizeLocale__(label).replace('.', '');
  }catch(_){ return ""; }
}

function monthNameIT(date){
  try{
    return String(new Date(date).toLocaleDateString(__getCurrentLocale__(), { month:"long" }) || "");
  }catch(_){ return ""; }
}

function romanWeekOfMonth(weekStart){
  const d = new Date(weekStart);
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const firstWeekStart = startOfWeekMonday(firstOfMonth);
  const diff = Math.floor((startOfWeekMonday(d) - firstWeekStart) / (7*24*60*60*1000));
  const n = Math.max(1, diff + 1);
  return toRoman(n);
}

function toRoman(n){
  const map = [[10,"X"],[9,"IX"],[8,"VIII"],[7,"VII"],[6,"VI"],[5,"V"],[4,"IV"],[3,"III"],[2,"II"],[1,"I"]];
  let out = "";
  let x = Math.max(1, Math.min(10, n));
  for (const [v,s] of map){
    while (x >= v){ out += s; x -= v; }
  }
  return out || "I";
}


/* =========================
   Lavanderia (dDAE_1.020)
========================= */
function getLaundryLabelByCode(code, source){
  const safe = __normalizeLaundryCode__(code);
  if (!safe) return '';
  const defs = source ? __getLaundryCatalogForRecord__(source) : getLaundryCatalogFromSettings();
  const hit = defs.find(item => String(item?.abbreviazione || '') === safe);
  return String(hit?.titolo || safe).trim() || safe;
}

function __laundryDefsFromSource__(source){
  return source ? __getLaundryCatalogForRecord__(source) : getLaundryCatalogFromSettings();
}

function __laundryDeletedKey__(){
  return "ddae_laundry_deleted_shared_board";
}
function __laundryDeletedIds__(){
  return new Set();
}
function __laundryMarkDeleted__(id){
  return;
}
function sanitizeLaundryItem_(it){
  it = it || {};
  const out = {};
  out.id = String(it.id || "").trim();
  out.startDate = String(it.startDate || it.start_date || it.from || "").trim();
  out.endDate = String(it.endDate || it.end_date || it.to || "").trim();
  out.createdAt = String(it.createdAt || it.created_at || "").trim();
  out.updatedAt = String(it.updatedAt || it.updated_at || it.updatedAt || "").trim();
  out.deletedAt = String(it.deletedAt || it.deleted_at || "").trim();
  out.isDeleted = __normBool01(it.isDeleted ?? it.is_deleted ?? it.deleted);
  out.is_deleted = out.isDeleted;
  out.laundryCatalog = __getLaundryCatalogForRecord__(it);
  const codes = out.laundryCatalog.map(item => String(item?.abbreviazione || '').trim()).filter(Boolean);
  codes.forEach((k) => {
    out[k] = 0;
    out[`${k}_resi`] = 0;
  });
  out.laundryPrices = {};
  out.laundryCatalog.forEach((item) => {
    const code = String(item?.abbreviazione || '').trim();
    if (!code) return;
    out.laundryPrices[code] = Math.round((Number(item?.prezzo || 0) || 0) * 100) / 100;
  });
  Object.keys(it).forEach(rawKey => {
    const key = String(rawKey || "").trim();
    const lowered = key.toLowerCase();
    let candidate = lowered;
    if (/_resi$/i.test(key)) candidate = lowered.slice(0, -5);
    else if (/_r$/i.test(key)) candidate = lowered.slice(0, -2);
    else {
      const maybe = lowered.slice(0, -1);
      if (codes.some(c => c.toLowerCase() === maybe)) candidate = maybe;
    }
    const baseKey = codes.find(c => c.toLowerCase() === candidate);
    if (!baseKey) return;
    let n = Number(it[rawKey]);
    if (!isFinite(n)) return;
    n = Math.floor(n);
    const isResKey = /_resi$/i.test(key) || /_r$/i.test(key) || (key.length === baseKey.length + 1 && key.toLowerCase().startsWith(baseKey.toLowerCase()) && key.toLowerCase().endsWith('r'));
    if (isResKey){
      out[`${baseKey}_resi`] += Math.max(0, Math.abs(n));
    } else if (n < 0){
      out[`${baseKey}_resi`] += Math.abs(n);
    } else {
      out[baseKey] += n;
    }
  });
  if (it && typeof it.laundryPrices === 'object' && it.laundryPrices){
    Object.keys(it.laundryPrices).forEach((rawKey) => {
      const code = __normalizeLaundryCode__(rawKey);
      if (!code) return;
      const n = Number(String(it.laundryPrices?.[rawKey] ?? '').replace(',', '.'));
      if (isFinite(n) && n >= 0) out.laundryPrices[code] = Math.round(n * 100) / 100;
    });
  }
  out.totalCost = (typeof it?.totalCost === 'number' && isFinite(it.totalCost)) ? Math.round(Number(it.totalCost) * 100) / 100 : __laundryComputeTotalCost__(out, out.laundryPrices);
  return out;
}

function setLaundryLabels_(){
  try{
    getLaundryCatalogFromSettings().forEach((item) => {
      const code = String(item?.abbreviazione || '').trim();
      const el = document.getElementById("laundryLbl" + code);
      if (el) el.textContent = String(item?.titolo || code).trim() || code;
    });
  }catch(_){ }
}

function __laundryDisplayPricesForCurrentView__(){
  try{
    const current = state?.laundry?.current || null;
    if (current && current.laundryPrices && typeof current.laundryPrices === "object") return current.laundryPrices;
  }catch(_){ }
  return getLaundryPricesFromSettings();
}

function __laundryUpdatePriceHints__(){
  try{
    const prices = getLaundryPricesFromSettings();
    getLaundryCatalogFromSettings().forEach((item) => {
      const code = String(item?.abbreviazione || '').trim();
      const tile = document.querySelector(`#laundryGrid .laundry-tile[data-key="${code}"]`);
      if (!tile) return;
      const n = Number(prices?.[code] || 0) || 0;
      tile.setAttribute('title', `Costo ${String(item?.titolo || code).trim()}: ${__laundryMoneyFmt__(n)}`);
      tile.dataset.unitPrice = String(n.toFixed(2));
    });
  }catch(_){ }
}

async function __openLaundryPricePrompt__(key){
  try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){ }
  const label = getLaundryLabelByCode(key) || key;
  const prices = getLaundryPricesFromSettings();
  const current = Number(prices?.[key] || 0) || 0;
  const raw = window.prompt(`Costo pulizia ${label} (${key})`, String(current).replace('.', ','));
  if (raw === null) return;
  const txt = String(raw || '').trim().replace(',', '.');
  if (!txt){
    prices[key] = 0;
  } else {
    const value = Number(txt);
    if (!isFinite(value) || value < 0){
      toast('Prezzo non valido', 'orange');
      return;
    }
    prices[key] = Math.round(value * 100) / 100;
  }
  await saveLaundryPricesToSettings(prices);
  __laundryUpdatePriceHints__();
  renderLaundry_(state?.laundry?.current || null);
  try{ toast('Costo salvato', 'blue'); }catch(_){ }
}

function __ensureLaundryPricesModalBuilt__(){
  const host = document.getElementById('laundryPricesList');
  if (!host || host.dataset.ready === '1') return;
  host.innerHTML = getLaundryCatalogFromSettings().map((item) => {
    const k = String(item?.abbreviazione || '').trim();
    const label = String(item?.titolo || k).trim() || k;
    return `<label class="laundry-price-row"><div class="laundry-price-copy"><div class="laundry-price-title">${label}</div><div class="laundry-price-code">${k}</div></div><input class="laundry-price-input" data-key="${k}" inputmode="decimal" min="0" step="0.01" type="number" /></label>`;
  }).join('');
  host.dataset.ready = '1';
}

async function __openLaundryPricesModal__(){
  try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){ }
  __ensureLaundryPricesModalBuilt__();
  const modal = document.getElementById('laundryPricesModal');
  if (!modal) return;
  const prices = getLaundryPricesFromSettings();
  getLaundryCatalogFromSettings().forEach((item) => {
    const k = String(item?.abbreviazione || '').trim();
    const input = modal.querySelector(`.laundry-price-input[data-key="${k}"]`);
    if (!input) return;
    const n = Number(prices?.[k] || 0) || 0;
    input.value = n ? String(n.toFixed(2)) : '';
  });
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function __closeLaundryPricesModal__(){
  const modal = document.getElementById('laundryPricesModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

async function __saveLaundryPricesModal__(){
  const modal = document.getElementById('laundryPricesModal');
  if (!modal) return;
  const next = {};
  for (const item of getLaundryCatalogFromSettings()){
    const k = String(item?.abbreviazione || '').trim();
    const input = modal.querySelector(`.laundry-price-input[data-key="${k}"]`);
    const raw = String(input?.value ?? '').trim().replace(',', '.');
    if (!raw){
      next[k] = 0;
      continue;
    }
    const n = Number(raw);
    if (!isFinite(n) || n < 0){
      if (input && typeof input.focus === 'function') input.focus();
      throw new Error(`Prezzo non valido per ${String(item?.titolo || k).trim() || k}`);
    }
    next[k] = Math.round(n * 100) / 100;
  }
  await saveLaundryPricesToSettings(next);
  __laundryUpdatePriceHints__();
  renderLaundry_(state?.laundry?.current || null);
  __closeLaundryPricesModal__();
  try{ toast('Costi salvati', 'blue'); }catch(_){ }
}

function __bindLaundryPriceLongPress__(){
  const host = document.getElementById('laundryGrid');
  if (!host || host.dataset.priceLongPressBound === '1') return;
  host.dataset.priceLongPressBound = '1';
  let timer = null;
  let suppressClick = false;
  let activeTile = null;
  const clearPress = () => {
    if (timer) { try{ clearTimeout(timer); }catch(_){ } }
    timer = null;
    activeTile = null;
  };
  const startPress = (ev) => {
    const tile = ev.target && ev.target.closest ? ev.target.closest('.laundry-tile[data-key]') : null;
    const key = tile ? String(tile.dataset.key || '').trim().toUpperCase() : '';
    if (!tile || !getLaundryComponentCodes().includes(key)) return;
    clearPress();
    activeTile = tile;
    suppressClick = false;
    timer = setTimeout(async () => {
      suppressClick = true;
      const useKey = String(activeTile?.dataset?.key || key || '').trim().toUpperCase();
      clearPress();
      try{ await __openLaundryPricePrompt__(useKey); }catch(e){ try{ toast(e?.message || 'Errore', 'orange'); }catch(_){ } }
      setTimeout(() => { suppressClick = false; }, 320);
    }, 500);
  };
  host.addEventListener('pointerdown', startPress, { passive:true });
  host.addEventListener('pointerup', clearPress, { passive:true });
  host.addEventListener('pointerleave', clearPress, { passive:true });
  host.addEventListener('pointercancel', clearPress, { passive:true });
  host.addEventListener('click', (ev) => {
    if (!suppressClick) return;
    const tile = ev.target && ev.target.closest ? ev.target.closest('.laundry-tile[data-key]') : null;
    const key = tile ? String(tile.dataset.key || '').trim().toUpperCase() : '';
    if (!getLaundryComponentCodes().includes(key)) return;
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
}

function renderLaundry_(item){
  state.laundry.current = item;
  const period = document.getElementById("laundryPeriodLabel");
  const printRange = document.getElementById("laundryPrintRange");
  const tbody = document.getElementById("laundryPrintBody");
  const safeItem = item ? sanitizeLaundryItem_(item) : null;
  const defs = __laundryDefsFromSource__(safeItem || null);
  const pricesForView = safeItem?.laundryPrices && typeof safeItem?.laundryPrices === 'object' ? safeItem.laundryPrices : __laundryDisplayPricesForCurrentView__();

  __bindLaundryPriceLongPress__();
  __laundryUpdatePriceHints__();

  if (!safeItem){
    if (period) { period.hidden = true; period.textContent = "—"; }
    if (printRange) printRange.textContent = "—";
    defs.forEach((def) => {
      const code = String(def?.abbreviazione || '').trim();
      const v = document.getElementById("laundryVal" + code);
      if (v) v.textContent = "0";
    });
    const totalEl = document.getElementById('laundryValTOTAL');
    if (totalEl) totalEl.textContent = __laundryMoneyFmt__(0);
    if (tbody) tbody.innerHTML = "";
    return;
  }

  const startLbl = safeItem.startDate ? formatLongDateIT(safeItem.startDate) : String(safeItem.startDate || "");
  const endLbl = safeItem.endDate ? formatLongDateIT(safeItem.endDate) : String(safeItem.endDate || "");
  const rangeText = (startLbl && endLbl) ? `${startLbl} → ${endLbl}` : "—";

  if (period){
    period.hidden = false;
    period.innerHTML = `<b>${rangeText}</b>`;
  }
  if (printRange) printRange.textContent = rangeText;

  defs.forEach((def) => {
    const code = String(def?.abbreviazione || '').trim();
    const v = document.getElementById("laundryVal" + code);
    if (!v) return;
    const qty = Number(safeItem?.[code] || 0) || 0;
    const resi = Number(safeItem?.[`${code}_resi`] || 0) || 0;
    if (resi > 0) v.innerHTML = `${qty}<span class="laundry-resi"> (${resi})</span>`;
    else v.textContent = String(qty);
  });

  const computedTotal = (typeof safeItem?.totalCost === 'number' && isFinite(safeItem.totalCost))
    ? Math.round(Number(safeItem.totalCost) * 100) / 100
    : __laundryComputeTotalCost__(safeItem, pricesForView);
  const totalEl = document.getElementById('laundryValTOTAL');
  if (totalEl) totalEl.textContent = __laundryMoneyFmt__(computedTotal);

  if (tbody){
    tbody.innerHTML = defs.map((def) => {
      const code = String(def?.abbreviazione || '').trim();
      const label = String(def?.titolo || code).trim() || code;
      const qty = Number(safeItem?.[code] || 0) || 0;
      const resi = Number(safeItem?.[`${code}_resi`] || 0) || 0;
      const unit = Number(pricesForView?.[code] ?? def?.prezzo ?? 0) || 0;
      const subtotal = Math.round((qty * unit) * 100) / 100;
      const qtyHtml = resi > 0 ? `${qty}<span class="laundry-resi"> (${resi})</span>` : `${qty}`;
      return `<tr><td><b>${label}</b> <span style="opacity:.7">(${code})</span></td><td style="text-align:right;font-weight:950">${qtyHtml} · ${__laundryMoneyFmt__(subtotal)}</td></tr>`;
    }).join('') + `<tr><td><b>Costo totale</b></td><td style="text-align:right;font-weight:950">${__laundryMoneyFmt__(computedTotal)}</td></tr>`;
  }
}

function __laundryReportRangeText__(item){
  const startLbl = item?.startDate ? formatLongDateIT(item.startDate) : String(item?.startDate || "");
  const endLbl = item?.endDate ? formatLongDateIT(item.endDate) : String(item?.endDate || "");
  return (startLbl && endLbl) ? `${startLbl} → ${endLbl}` : "—";
}

function __buildLaundryDetailShareText__(raw){
  const item = sanitizeLaundryItem_(raw || {});
  const prices = item?.laundryPrices && typeof item.laundryPrices === 'object' ? item.laundryPrices : __laundryDisplayPricesForCurrentView__();
  let imponibile = 0;
  const defs = __laundryDefsFromSource__(item);
  const rows = defs.map((def) => {
    const k = String(def?.abbreviazione || '').trim();
    const qty = Math.max(0, Number(item?.[k] || 0) || 0);
    const resi = Math.max(0, Number(item?.[`${k}_resi`] || 0) || 0);
    const unit = Math.max(0, Number(prices?.[k] ?? def?.prezzo ?? 0) || 0);
    const subtotal = Math.round(qty * unit * 100) / 100;
    imponibile += subtotal;
    const qtyText = resi > 0 ? `${qty} (${resi})` : `${qty}`;
    return `- ${String(def?.titolo || k).trim() || k} (${k}): ${qtyText} x ${__laundryMoneyFmt__(unit)} = ${__laundryMoneyFmt__(subtotal)}`;
  });
  imponibile = Math.round(imponibile * 100) / 100;
  const ivato = Math.round(imponibile * 1.22 * 100) / 100;
  return [
    'Report lavanderia',
    __laundryReportRangeText__(item),
    '',
    ...rows,
    '',
    `Imponibile: ${__laundryMoneyFmt__(imponibile)}`,
    `Totale IVA 22%: ${__laundryMoneyFmt__(ivato)}`
  ].join('\n');
}

function __laundryRoundRect__(ctx, x, y, w, h, r){
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function __laundryDetailFileName__(item){
  const from = String(item?.startDate || '').replace(/[^0-9]/g, '') || 'report';
  const to = String(item?.endDate || '').replace(/[^0-9]/g, '') || 'lavanderia';
  return __safeFileName__(`dDAE_Lavanderia_${from}_${to}.png`);
}

async function __laundryDetailImageBlob__(raw){
  const item = sanitizeLaundryItem_(raw || {});
  const prices = item?.laundryPrices && typeof item.laundryPrices === 'object' ? item.laundryPrices : __laundryDisplayPricesForCurrentView__();
  try{ if (document.fonts && document.fonts.ready) await document.fonts.ready; }catch(_){ }

  const defs = __laundryDefsFromSource__(item);
  const rows = defs.map((def) => {
    const k = String(def?.abbreviazione || '').trim();
    const qty = Math.max(0, Number(item?.[k] || 0) || 0);
    const resi = Math.max(0, Number(item?.[`${k}_resi`] || 0) || 0);
    const unit = Math.max(0, Number(prices?.[k] ?? def?.prezzo ?? 0) || 0);
    const subtotal = Math.round(qty * unit * 100) / 100;
    return { key:k, label: String(def?.titolo || k).trim() || k, qty, resi, unit, subtotal };
  });
  const imponibile = Math.round(rows.reduce((acc, row) => acc + row.subtotal, 0) * 100) / 100;
  const ivato = Math.round(imponibile * 1.22 * 100) / 100;
  const width = 1200;
  const outerPad = 36;
  const cardPadX = 46;
  const cardPadTop = 42;
  const rowHeight = 120;
  const rowGap = 18;
  const totalsHeight = 92;
  const cardHeight = cardPadTop + 150 + rows.length * rowHeight + (rows.length - 1) * rowGap + 28 + totalsHeight + 42;
  const height = cardHeight + outerPad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');

  ctx.clearRect(0, 0, width, height);
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = width - outerPad * 2;
  const cardH = cardHeight;

  ctx.save();
  ctx.shadowColor = 'rgba(11,31,58,0.12)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  __laundryRoundRect__(ctx, cardX, cardY, cardW, cardH, 42);
  ctx.fillStyle = '#f6fbff';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#4d9cc5';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.letterSpacing = '0';
  ctx.fillText('REPORT LAVANDERIA', cardX + cardPadX, cardY + 54);

  ctx.fillStyle = '#0b1f3a';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText('Dettaglio economico', cardX + cardPadX, cardY + 122);

  ctx.fillStyle = 'rgba(11,31,58,0.78)';
  ctx.font = '800 30px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText(__laundryReportRangeText__(item), cardX + cardPadX, cardY + 178);

  let y = cardY + 212;
  const rowX = cardX + 32;
  const rowW = cardW - 64;
  rows.forEach((row) => {
    __laundryRoundRect__(ctx, rowX, y, rowW, rowHeight, 34);
    ctx.fillStyle = 'rgba(77,156,197,0.10)';
    ctx.fill();

    const boxY = y + 14;
    __laundryRoundRect__(ctx, rowX + 18, boxY, 92, 92, 24);
    ctx.fillStyle = '#4d9cc5';
    ctx.fill();
    __laundryRoundRect__(ctx, rowX + 128, boxY, 92, 92, 24);
    ctx.fillStyle = '#88c8e8';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(String(row.qty), rowX + 64, y + 56);
    ctx.font = '900 14px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText('USATI', rowX + 64, y + 88);

    ctx.fillStyle = '#0b1f3a';
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(String(row.resi), rowX + 174, y + 56);
    ctx.font = '900 14px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText('RESI', rowX + 174, y + 88);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0b1f3a';
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(row.label, rowX + 250, y + 58);
    ctx.fillStyle = 'rgba(11,31,58,0.68)';
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(`${__laundryMoneyFmt__(row.unit)} / pezzo`, rowX + 250, y + 94);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0b1f3a';
    ctx.font = '900 30px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
    ctx.fillText(__laundryMoneyFmt__(row.subtotal), rowX + rowW - 32, y + 74);

    y += rowHeight + rowGap;
  });

  const totalsY = y + 10;
  const totalsGap = 20;
  const totalsW = (rowW - totalsGap) / 2;
  __laundryRoundRect__(ctx, rowX, totalsY, totalsW, totalsHeight, 28);
  ctx.fillStyle = '#0b1f3a';
  ctx.fill();
  __laundryRoundRect__(ctx, rowX + totalsW + totalsGap, totalsY, totalsW, totalsHeight, 28);
  ctx.fillStyle = '#4d9cc5';
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText('Imponibile', rowX + 26, totalsY + 52);
  ctx.textAlign = 'right';
  ctx.font = '900 34px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText(__laundryMoneyFmt__(imponibile), rowX + totalsW - 26, totalsY + 58);

  ctx.textAlign = 'left';
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText('Totale IVA', rowX + totalsW + totalsGap + 26, totalsY + 42);
  ctx.fillText('22%', rowX + totalsW + totalsGap + 26, totalsY + 72);
  ctx.textAlign = 'right';
  ctx.font = '900 34px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText(__laundryMoneyFmt__(ivato), rowX + rowW - 26, totalsY + 58);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (blob) return blob;
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: 'image/png' });
}

async function __shareLaundryDetail__(raw){
  const item = sanitizeLaundryItem_(raw || {});
  const blob = await __laundryDetailImageBlob__(item);
  const filename = __laundryDetailFileName__(item);
  const file = new File([blob], filename, { type: 'image/png' });
  try{
    if (navigator.canShare && navigator.canShare({ files:[file] })) {
      await navigator.share({ title: 'Report lavanderia', files:[file] });
      return true;
    }
  }catch(err){
    if (err && err.name === 'AbortError') return false;
  }
  const url = URL.createObjectURL(blob);
  try{
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    try{ a.click(); }catch(_){ }
    try{ document.body.removeChild(a); }catch(_){ }
    try{ toast('Immagine report pronta', 'blue'); }catch(_){ }
    return true;
  }catch(_){
    return false;
  }finally{
    setTimeout(() => { try{ URL.revokeObjectURL(url); }catch(_){ } }, 1200);
  }
}

function __openLaundryDetailModal__(raw){
  const item = sanitizeLaundryItem_(raw || {});
  const modal = document.getElementById('laundryDetailModal');
  const title = document.getElementById('laundryDetailTitle');
  const range = document.getElementById('laundryDetailRange');
  const list = document.getElementById('laundryDetailList');
  const netEl = document.getElementById('laundryDetailNet');
  const vatEl = document.getElementById('laundryDetailVat');
  const shareBtn = document.getElementById('laundryDetailShare');
  if (!modal || !title || !range || !list || !netEl || !vatEl) return;
  const prices = item?.laundryPrices && typeof item.laundryPrices === 'object' ? item.laundryPrices : __laundryDisplayPricesForCurrentView__();
  const rangeText = __laundryReportRangeText__(item);
  title.textContent = 'Dettaglio economico';
  range.textContent = rangeText;
  let imponibile = 0;
  const defs = __laundryDefsFromSource__(item);
  list.innerHTML = defs.map((def) => {
    const k = String(def?.abbreviazione || '').trim();
    const qty = Math.max(0, Number(item?.[k] || 0) || 0);
    const resi = Math.max(0, Number(item?.[`${k}_resi`] || 0) || 0);
    const unit = Math.max(0, Number(prices?.[k] ?? def?.prezzo ?? 0) || 0);
    const subtotal = Math.round(qty * unit * 100) / 100;
    imponibile += subtotal;
    return `<div class="laundry-detail-row"><div class="laundry-detail-rowLeft"><div class="laundry-detail-badges"><div class="laundry-detail-code"><span class="laundry-detail-codeValue">${qty}</span><span class="laundry-detail-codeLabel">usati</span></div><div class="laundry-detail-code laundry-detail-code--secondary"><span class="laundry-detail-codeValue">${resi}</span><span class="laundry-detail-codeLabel">resi</span></div></div><div class="laundry-detail-copy"><div class="laundry-detail-label">${String(def?.titolo || k).trim() || k}</div><div class="laundry-detail-meta">${__laundryMoneyFmt__(unit)} / pezzo</div></div></div><div class="laundry-detail-price">${__laundryMoneyFmt__(subtotal)}</div></div>`;
  }).join('');
  imponibile = Math.round(imponibile * 100) / 100;
  const ivato = Math.round(imponibile * 1.22 * 100) / 100;
  netEl.textContent = __laundryMoneyFmt__(imponibile);
  vatEl.textContent = __laundryMoneyFmt__(ivato);
  modal.__currentLaundryItem = item;
  if (shareBtn && !shareBtn.__boundLaundryShare){
    shareBtn.__boundLaundryShare = true;
    bindFastTap(shareBtn, async () => {
      try{ await __shareLaundryDetail__(modal.__currentLaundryItem || item); }catch(_){ toast('Condivisione non disponibile'); }
    });
  }
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function __closeLaundryDetailModal__(){
  const modal = document.getElementById('laundryDetailModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function renderLaundryHistory_(list){
  const host = document.getElementById("laundryHistory");
  if (!host) return;
  host.innerHTML = "";

  try{ list = (Array.isArray(list)?list:[]).filter(it => !(it && (it.isDeleted || it.is_deleted))); }catch(_){ }

  if (!list || !list.length){
    const empty = document.createElement("div");
    empty.className = "item";
    empty.style.opacity = "0.8";
    empty.textContent = "Nessun resoconto ancora.";
    host.appendChild(empty);
    return;
  }

  list.forEach((raw) => {
    const it = sanitizeLaundryItem_(raw);
    const btn = document.createElement("div");
    btn.setAttribute("role","button");
    btn.tabIndex = 0;
    btn.className = "item";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.justifyContent = "space-between";
    btn.style.alignItems = "center";
    btn.style.gap = "10px";

    const left = document.createElement("div");
    const startLbl = it.startDate ? formatShortDateIT(it.startDate) : "";
    const endLbl = it.endDate ? formatShortDateIT(it.endDate) : "";
    left.innerHTML = `<div style="font-weight:950">${startLbl} – ${endLbl}</div>`;


    const del = document.createElement("button");
    del.type = "button";
    del.className = "laundry-del";
    del.setAttribute("aria-label", "Elimina report");
    del.innerHTML = `<span class="x">✕</span>`;

    bindFastTap(del, async (ev) => {
      try {
        ev && ev.preventDefault && ev.preventDefault();
        ev && ev.stopPropagation && ev.stopPropagation();
        ev && ev.stopImmediatePropagation && ev.stopImmediatePropagation();
      } catch(_){}

      // Anti-doppio tap / tocchi multipli
      if (del.classList.contains("busy")) return;

      const startLblFull = it.startDate ? formatLongDateIT(it.startDate) : String(it.startDate || "");
      const endLblFull = it.endDate ? formatLongDateIT(it.endDate) : String(it.endDate || "");
      const msg = (startLblFull && endLblFull)
        ? `Eliminare il report lavanderia\n${startLblFull} → ${endLblFull}\n\n(Non tocca le Pulizie)`
        : "Eliminare questo report lavanderia?\n\n(Non tocca le Pulizie)";
      if (!confirm(msg)) return;

      const prevHTML = del.innerHTML;
      del.classList.add("busy");
      del.disabled = true;
      del.innerHTML = `<span class="spinner" aria-hidden="true"></span>`;

      // Nascondi subito in UI (e persisti localmente) per evitare che resti visibile
      try{ __laundryMarkDeleted__(it.id); }catch(_){ }
      try{
        if (state && state.laundry && Array.isArray(state.laundry.list)){
          state.laundry.list = state.laundry.list.filter(x => String(x && x.id) !== String(it.id));
        }
      }catch(_){ }
      try{ btn && btn.remove && btn.remove(); }catch(_){ }

      try{
        try{
          // Soft-delete (preferito): marca come eliminato
          await api("lavanderia", { method:"PUT", body:{ id: it.id, isDeleted:true, is_deleted:true }, showLoader:true });
        }catch(_e){
          // Fallback: DELETE
          await api("lavanderia", { method:"DELETE", body:{ id: it.id }, showLoader:true });
        }
        toast("Report eliminato");
        await loadLavanderia();
      }catch(e){
        console.error(e);
        toast(e && e.message ? e.message : "Errore eliminazione");
        // ripristina solo se l'elemento esiste ancora
        try{
          if (del && del.isConnected){
            del.innerHTML = prevHTML;
          }
        }catch(_){}
      }finally{
        try{
          if (del && del.isConnected){
            del.classList.remove("busy");
            del.disabled = false;
            // se non è stato ripristinato nel catch
            if (!del.querySelector(".x") && !del.querySelector(".spinner")) del.innerHTML = prevHTML;
          }
        }catch(_){}
      }
    }, true);;

    btn.appendChild(left);
    btn.appendChild(del);

    bindFastTap(btn, () => {
      renderLaundry_(it);
      try{ __openLaundryDetailModal__(it); }catch(_){ }
      try{ window.scrollTo({ top: 0, behavior: "smooth" }); }catch(_){
        window.scrollTo(0,0);
      }
    });

    host.appendChild(btn);
  });
}

function syncLaundryDateText_(){
  try{
    const fromEl = document.getElementById("laundryFrom");
    const toEl = document.getElementById("laundryTo");
    const fromTxt = document.getElementById("laundryFromText");
    const toTxt = document.getElementById("laundryToText");
    if (fromTxt) fromTxt.textContent = fromEl && fromEl.value ? formatShortDateIT(fromEl.value) : "--/--/--";
    if (toTxt) toTxt.textContent = toEl && toEl.value ? formatShortDateIT(toEl.value) : "--/--/--";
  }catch(_){ }
}

async function loadLavanderia() {
  setLaundryLabels_();
  try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){ }
  __bindLaundryPriceLongPress__();
  __laundryUpdatePriceHints__();
  const hint = document.getElementById("laundryHint");
  try {
    const res = await api("lavanderia", { method:"GET", showLoader:false });
    const rows = Array.isArray(res) ? res
      : (res && Array.isArray(res.data) ? res.data
      : (res && res.data && Array.isArray(res.data.data) ? res.data.data
      : (res && Array.isArray(res.rows) ? res.rows
      : [])));
    const rawList = (rows || []).map(sanitizeLaundryItem_);
    const list = rawList.filter(it => !(it && (it.isDeleted || it.is_deleted))).sort((a,b) => {
      const byEnd = String(b.endDate||"").localeCompare(String(a.endDate||""));
      if (byEnd) return byEnd;
      return String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""));
    });

    state.laundry.list = list;
    renderLaundryHistory_(list);
    renderLaundry_(list[0] || null);
    if (hint) hint.textContent = "";
  } catch (e) {
    if (hint) hint.textContent = "";
    throw e;
  }
}

async function createLavanderiaReport_() {
  const hint = document.getElementById("laundryHint");
  const fromEl = document.getElementById("laundryFrom");
  const toEl = document.getElementById("laundryTo");

  const startDate = (fromEl && fromEl.value) ? String(fromEl.value).trim() : "";
  const endDate = (toEl && toEl.value) ? String(toEl.value).trim() : "";
  try{ if (typeof __laundrySyncDateText === "function") __laundrySyncDateText(); }catch(_){ }

  if (!startDate || !endDate) {
    if (hint) hint.textContent = "";
    toast("Seleziona le date");
    return null;
  }
  if (startDate > endDate) {
    if (hint) hint.textContent = "";
    toast("Intervallo non valido");
    return null;
  }

  if (hint) hint.textContent = "";
  const res = await api("lavanderia", { method:"POST", body: { startDate, endDate }, showLoader:true });
  const item = sanitizeLaundryItem_(res && res.data ? res.data : res);

  await loadLavanderia();
  renderLaundry_(item);

  if (hint) hint.textContent = "";
  return item;
}


/* Service Worker: forza update su iOS (cache-bust via query) */
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try {
    // Query param = BUILD_VERSION -> forza fetch del file SW anche con cache aggressiva
    const reg = await navigator.serviceWorker.register(`./service-worker.js?v=${BUILD_VERSION}`, {
      updateViaCache: "none"
    });

    const checkUpdate = () => {
      try {
        const p = reg?.update?.();
        // Safari/iOS può rigettare la Promise con "Cannot update a null/nonexistent service worker registration"
        // se la registration è stata invalidata: evitiamo un unhandled rejection.
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}
    };

    // check immediato + quando torna in primo piano
    checkUpdate();
    window.addEventListener("focus", checkUpdate);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkUpdate();
    });
    // check periodico (non invasivo)
    setInterval(checkUpdate, 60 * 60 * 1000);

    // Se viene trovata una nuova versione, prova ad attivarla subito
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          try { nw.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
        }
      });
    });

    // se cambia controller, ricarica una volta per prendere i file nuovi
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      __requestSwReload();
    });
  } catch (_) {}
}
registerSW();





try{ hardUpdateCheck(); }catch(_){}

// iOS/PWA: quando l'app torna in foreground (senza un vero reload), alcune viste possono restare "stale".
// Forziamo un refresh mirato del Calendario se e' la pagina attiva.
async function __onAppResume(){
  // Se nel frattempo e' stata deployata una nuova build, hardUpdateCheck fara' reload.
  try{ await hardUpdateCheck(); }catch(_){ }

  try{
    if (state.page === "calendario") {
      if (state.calendar){ state.calendar.ready = false; }
      await ensureCalendarData({ force:true, showLoader:false });
      renderCalendario();
    }
  }catch(_){ }
}

try{
  window.addEventListener("focus", () => { __onAppResume(); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) __onAppResume();
  });
}catch(_){ }
// ---  helpers (sheet "stanze") ---
function buildArrayFromState(){
  const rooms = Array.from(state.guestRooms || []).map(n=>parseInt(n,10)).filter(n=>isFinite(n)).sort((a,b)=>a-b);
  const lp = state.lettiPerStanza || {};
  return rooms.map((n)=>{
    const d = lp[String(n)] || lp[n] || {};
    return {
      stanza_num: n,
      letto_m: !!d.matrimoniale,
      letto_s: parseInt(d.singoli || 0, 10) || 0,
      culla: !!d.culla,
      note: (d.note || "").toString()
    };
  });
}

function applyToState(rows){
  state.guestRooms = state.guestRooms || new Set();
  state.lettiPerStanza = {};
  state.bedsDirty = false;
  state.stanzeSnapshotOriginal = "";
  state.guestRooms.clear();
  (Array.isArray(rows) ? rows : []).forEach(r=>{
    const n = parseInt(r.stanza_num ?? r.stanzaNum ?? r.room ?? r.stanza, 10);
    if (!isFinite(n) || n<=0) return;
    state.guestRooms.add(n);
    state.lettiPerStanza[String(n)] = {
      matrimoniale: !!(r.letto_m ?? r.lettoM ?? r.matrimoniale),
      singoli: parseInt(r.letto_s ?? r.lettoS ?? r.singoli, 10) || 0,
      culla: !!(r.culla),
      note: (r.note || "").toString()
    };
  });
}

// --- Room beds config (non-invasive) ---
state.lettiPerStanza = state.lettiPerStanza || {};
let __rc_room = null;

function __rc_renderToggle(el, on){
  el.innerHTML = `<span class="dot ${on?'on':''}"></span>`;
  el.onclick = ()=> el.firstElementChild.classList.toggle('on');
}
function __rc_renderSingoli(el, n){
  el.innerHTML = '';
  for(let i=1;i<=3;i++){
    const s=document.createElement('span');
    s.className='dot'+(i<=n?' on':'');
    s.onclick=()=>{
      [...el.children].forEach((c,ix)=>c.classList.toggle('on', ix < i));
    };
    el.appendChild(s);
  }
}

function openRoomConfig(room){
  __rc_room = String(room);
  const d = state.lettiPerStanza[__rc_room] || {matrimoniale:false,singoli:0,culla:false};
  document.getElementById('roomConfigTitle').textContent = 'Stanza '+room;
  __rc_renderToggle(document.getElementById('rc_matrimoniale'), d.matrimoniale);
  __rc_renderSingoli(document.getElementById('rc_singoli'), d.singoli);
  __rc_renderToggle(document.getElementById('rc_culla'), d.culla);
  document.getElementById('roomConfigModal').hidden = false;
}


document.getElementById('rc_save')?.addEventListener('click', ()=>{
  const matrimoniale = document.querySelector('#rc_matrimoniale .dot')?.classList.contains('on')||false;
  const culla = document.querySelector('#rc_culla .dot')?.classList.contains('on')||false;
  const singoli = document.querySelectorAll('#rc_singoli .dot.on').length;
  state.lettiPerStanza[__rc_room] = {matrimoniale, singoli, culla};
  state.bedsDirty = true;
  document.getElementById('roomConfigModal').hidden = true;
});

// Popup letti: Annulla (chiudi senza salvare)
document.getElementById('rc_cancel')?.addEventListener('click', ()=>{
  const m = document.getElementById('roomConfigModal');
  if (m) m.hidden = true;
});
// --- end room beds config ---


// --- FIX dDAE_1.020: renderSpese allineato al backend ---
// --- dDAE: Spese riga singola (senza IVA in visualizzazione) ---
function renderSpese(){
  const list = document.getElementById("speseList");
  if (!list) return;
  list.innerHTML = "";

  let items = Array.isArray(state.spese) ? [...state.spese] : [];

  // Ordina: data / inserimento / motivazione
  const mode = String(state.speseSort || "date");
  const withIdx = items.map((s, idx) => ({ s, idx }));

  const toTime = (v) => {
    if (!v) return null;
    const s = String(v);
    const iso = s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const t = Date.parse(iso + "T00:00:00Z");
      return isNaN(t) ? null : t;
    }
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  };

  withIdx.sort((a, b) => {
    if (mode === "motivazione"){
      const am = (a.s.motivazione || a.s.motivo || "").toString().trim().toLowerCase();
      const bm = (b.s.motivazione || b.s.motivo || "").toString().trim().toLowerCase();
      const c = am.localeCompare(bm, "it", { sensitivity: "base" });
      return c !== 0 ? c : (a.idx - b.idx);
    }

    if (mode === "insert"){
      const ta = toTime(a.s.createdAt || a.s.created_at) ?? a.idx;
      const tb = toTime(b.s.createdAt || b.s.created_at) ?? b.idx;
      // Nuovi prima
      return (tb - ta);
    }

    // mode === "date" (default): più recenti prima
    const da = toTime(a.s.dataSpesa || a.s.data || a.s.data_spesa);
    const db = toTime(b.s.dataSpesa || b.s.data || b.s.data_spesa);
    if (da == null && db == null) return a.idx - b.idx;
    if (da == null) return 1;
    if (db == null) return -1;
    return (db - da);
  });

  items = withIdx.map(x => x.s);
  if (!items.length){
    list.innerHTML = '<div style="font-size:13px; opacity:.75; padding:8px 2px;">Nessuna spesa nel periodo.</div>';
    return;
  }

  items.forEach(s => {
    const el = document.createElement("div");
    el.className = "item spesa-bg";
    const cls = spesaCategoryClass(s);
    if (cls) el.classList.add(cls);

    const importo = Number(s.importoLordo || 0);
    const data = formatShortDateIT(s.dataSpesa || s.data || s.data_spesa || "");
    const motivoTxt = (s.motivazione || s.motivo || "").toString();
    const motivo = escapeHtml(motivoTxt);

    el.innerHTML = `
      <div class="item-top" style="align-items:center;">
        <div class="spesa-line" title="${motivo}">
          <span class="spesa-imp">${euro(importo)}</span>
          <span class="spesa-sep">·</span>
          <span class="spesa-date">${data}</span>
          <span class="spesa-sep">·</span>
          <span class="spesa-motivo">${motivo}</span>
        </div>
        <button class="delbtn delbtn-x" type="button" aria-label="Elimina record" data-del="${s.id}">Elimina</button>
      </div>
    `;

    const btn = el.querySelector("[data-del]");
    if (btn) btn.addEventListener("click", async () => {
      if (!confirm("Eliminare definitivamente questa spesa?")) return;
      await api("spese", { method:"DELETE", params:{ id: s.id } });
      toast("Spesa eliminata");
      invalidateApiCache("spese|");
      invalidateApiCache("report|");
      await ensurePeriodData({ showLoader:false, force:true });
      renderSpese();
    });

    list.appendChild(el);
  });
}



// --- FIX dDAE_1.020: delete reale ospiti ---
function attachDeleteOspite(card, ospite){
  const btn = document.createElement("button");
  btn.className = "delbtn";
  btn.textContent = "Elimina";
  btn.addEventListener("click", async () => {
    if (!confirm("Eliminare definitivamente questo ospite?")) return;
    try{ __sfxGlass(); }catch(_){ }
    await api("ospiti", { method:"DELETE", params:{ id: ospite.id } });
    toast("Ospite eliminato");
    invalidateApiCache("ospiti|");
    invalidateApiCache("stanze|");
    try{ if (state.calendar){ state.calendar.ready = false; state.calendar.rangeKey = ""; } }catch(_){ }
    await loadOspiti({ ...(state.period || {}), force:true });
  });
  const actions = card.querySelector(".actions") || card;
  actions.appendChild(btn);
}


// Hook delete button into ospiti render
(function(){
  const orig = window.renderOspiti;
  if (!orig) return;
  window.renderOspiti = function(){
    orig();
    const cards = document.querySelectorAll(".guest-card");
    cards.forEach(card => {
      const id = card.getAttribute("data-id");
      const ospite = (state.ospiti||[]).find(o=>String(o.id)===String(id));
      if (ospite) attachDeleteOspite(card, ospite);
    });
  }
})();


// --- FIX dDAE_1.020: mostra nome ospite ---
(function(){
  const orig = window.renderOspiti;
  if (!orig) return;
  window.renderOspiti = function(){
    orig();
    document.querySelectorAll(".guest-card").forEach(card=>{
      const id = card.getAttribute("data-id");
      const ospite = (state.ospiti||[]).find(o=>String(o.id)===String(id));
      if(!ospite) return;
      if(card.querySelector(".guest-name")) return;
      const name = document.createElement("div");
      name.className = "guest-name";
      name.textContent = ospite.nome || ospite.name || "Ospite";
      name.style.fontWeight = "950";
      name.style.fontSize = "18px";
      name.style.marginBottom = "6px";
      card.prepend(name);
    });
  }
})();



// ===== Tassa di soggiorno =====
let __tassaBound = false;

function __parseDateFlexibleToISO(unknown){
  // Ritorna ISO YYYY-MM-DD oppure "" se non parsabile
  const s = String(unknown || "").trim();
  if (!s) return "";
  // ISO date (YYYY-MM-DD) or ISO datetime
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
  // dd/mm/yyyy
  const mIt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mIt){
    const dd = String(mIt[1]).padStart(2,"0");
    const mm = String(mIt[2]).padStart(2,"0");
    const yy = mIt[3];
    return `${yy}-${mm}-${dd}`;
  }
  return "";
}

function __utcDay(y,m,d){ return Date.UTC(y, m-1, d); }

function __daysBetweenUTC(isoA, isoB){
  // isoA, isoB: YYYY-MM-DD ; ritorna giorni interi (B - A)
  const [ya,ma,da] = isoA.split("-").map(n=>parseInt(n,10));
  const [yb,mb,db] = isoB.split("-").map(n=>parseInt(n,10));
  const ta = __utcDay(ya,ma,da);
  const tb = __utcDay(yb,mb,db);
  return Math.round((tb - ta) / 86400000);
}

function __addDaysISO(iso, delta){
  const [y,m,d] = iso.split("-").map(n=>parseInt(n,10));
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth()+1).padStart(2,"0");
  const dd = String(dt.getUTCDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}

function __overlapNights(checkInISO, checkOutISO, fromISO, toISO_inclusive){
  // Intersezione tra [checkIn, checkOut) e [from, to+1)
  const toExcl = __addDaysISO(toISO_inclusive, 1);
  const start = (checkInISO > fromISO) ? checkInISO : fromISO;
  const end   = (checkOutISO < toExcl) ? checkOutISO : toExcl;
  const n = __daysBetweenUTC(start, end);
  return (isFinite(n) && n > 0) ? n : 0;
}

function resetTassaUI(){
  const res = $("#taxResults");
  if (res) res.hidden = true;
  const tt = $("#taxTotalRow");
  if (tt) tt.hidden = true;
  const rb = $("#taxReportBtn");
  if (rb) rb.disabled = true;

  const ids = ["taxPayingCount","taxPayingAmount","taxKidsCount","taxKidsAmount","taxReducedCount","taxReducedAmount"];
  ids.forEach(id => { const el = $("#"+id); if (el) el.textContent = "—"; });
  const ta = $("#taxTotalAmount");
  if (ta) ta.textContent = "—";
}

async function calcTassa(fromOverride, toOverride, opts){
  opts = opts || {};
  const includeUntagged = !!opts.includeUntagged;
  const fromEl = $("#taxFrom");
  const toEl = $("#taxTo");
  const from = (fromOverride || (fromEl ? fromEl.value : "")) || "";
  const to   = (toOverride   || (toEl ? toEl.value : ""))   || "";
  if (!from || !to){
    toast("Seleziona un periodo (Da/A)");
    resetTassaUI();
    return;
  }
  if (to < from){
    toast("Il periodo non è valido");
    resetTassaUI();
    return;
  }

  // Prende i dati SOLO dalle prenotazioni (foglio ospiti)
  const ospiti = await api("ospiti", { method:"GET" }) || [];

  let schede = 0;
  let adultsTot = 0;
  let kidsTot = 0;
  let taxableDaysTot = 0;
  let totalAmt = 0;

  for (const o of ospiti){
    const inISO  = __parseDateFlexibleToISO(o.check_in || o.checkIn);
    const outISO = __parseDateFlexibleToISO(o.check_out || o.checkOut);
    if (!inISO || !outISO) continue;
    // Tassa: per default considera SOLO prenotazioni con registrazioni PS o ISTAT
    if (!includeUntagged){
      const psReg = truthy(o.ps_registrato ?? o.psRegistrato);
      const istatReg = truthy(o.istat_registrato ?? o.istatRegistrato);
      if (!(psReg || istatReg)) continue;
    }
    const nights = __overlapNights(inISO, outISO, from, to);
    if (!nights) continue;

    // Somma SOLO il totale tassa della scheda (pill), con la stessa logica della pill
    const tt = calcTouristTax(o, nights);
    schede += 1;
    adultsTot += Number(tt?.adults || 0) || 0;

    const kidsRaw = (o.bambini_u10 ?? o.bambiniU10 ?? o.kids_u10 ?? o.kidsU10 ?? o.bambini ?? o.kids ?? 0);
    kidsTot += Math.max(0, parseInt(kidsRaw, 10) || 0);

    taxableDaysTot += Number(tt?.taxableDays || 0) || 0;
    totalAmt += Number(tt?.total || 0) || 0;
  }

  const rate = (state.settings && state.settings.loaded)
    ? (getSettingNumber("tassa_soggiorno", (typeof TOURIST_TAX_EUR_PPN !== "undefined" ? TOURIST_TAX_EUR_PPN : 0)) || 0)
    : (Number(typeof TOURIST_TAX_EUR_PPN !== "undefined" ? TOURIST_TAX_EUR_PPN : 0) || 0);

  // salva per report
  state._taxLast = { from, to, schede, adultsTot, kidsTot, taxableDaysTot, rate, totalAmt, mode: (includeUntagged ? "stima" : "taggate") };

  // UI: mostra solo dopo click Calcola
  const res = $("#taxResults");
  if (res) res.hidden = false;
  const ttRow = $("#taxTotalRow");
  if (ttRow) ttRow.hidden = false;
  const ttVal = $("#taxTotalAmount");
  if (ttVal) ttVal.textContent = formatEUR(totalAmt);
  const rb = $("#taxReportBtn");
  if (rb) rb.disabled = false;

  const pc = $("#taxPayingCount"); if (pc) pc.textContent = String(adultsTot);
  const pa = $("#taxPayingAmount"); if (pa) pa.textContent = formatEUR(totalAmt);

  const kc = $("#taxKidsCount"); if (kc) kc.textContent = String(kidsTot);
  const ka = $("#taxKidsAmount"); if (ka) ka.textContent = "—"; // non applicabile

  const rc = $("#taxReducedCount"); if (rc) rc.textContent = "0";
  const ra = $("#taxReducedAmount"); if (ra) ra.textContent = "—"; // non applicabile
}



function buildTaxReportText(){
  const t = state._taxLast;
  if (!t) return "Premi prima Calcola.";
  const lines = [];
  lines.push("Report tassa di soggiorno");
  lines.push(`Periodo: ${t.from} → ${t.to}`);
  lines.push("");
  lines.push(`Schede incluse: ${t.schede} (${t.mode === "stima" ? "tutte (anche non taggate)" : "solo taggate (PS o ISTAT)"})`);
  lines.push(`Adulti (somma): ${t.adultsTot}`);
  lines.push(`Bambini <10 (somma): ${t.kidsTot || 0}`);
  const maxTaxNights = Math.max(0, parseInt(getTouristTaxMaxNightsSetting(3), 10) || 0);
  lines.push(`Giorni tassabili (somma, max ${maxTaxNights}/scheda): ${t.taxableDaysTot}`);
  lines.push("");
  lines.push(`Tariffa: ${formatEUR(t.rate)} / persona / notte`);
  lines.push("");
  lines.push(`TOTALE: ${formatEUR(t.totalAmt)}`);
  return lines.join("\n");

}


function openTaxReportModal(text){
  const modal = document.getElementById("taxReportModal");
  const pre = document.getElementById("taxReportText");
  const closeBtn = document.getElementById("taxReportCloseBtn");
  const copyBtn = document.getElementById("taxReportCopyBtn");

  if (!modal || !pre) return;
  pre.textContent = text || "";

  modal.hidden = false;
  modal.setAttribute("aria-hidden","false");

  const close = () => {
    modal.hidden = true;
    modal.setAttribute("aria-hidden","true");
  };

  // click su overlay chiude
  const onOverlay = (e)=>{
    if (e.target === modal) close();
  };
  modal.addEventListener("click", onOverlay, { once:true });

  if (closeBtn){
    closeBtn.onclick = close;
  }

  if (copyBtn){
    copyBtn.onclick = async () => {
      try{
        const txt = pre.textContent || "";
        if (navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(txt);
        } else {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        toast("Copiato");
      }catch(_){
        toast("Impossibile copiare");
      }
    };
  }
}



function initTassaPage(){
  // idempotent: può essere richiamata più volte (es. restore iOS/refresh)
  const bindOnce = (el, fn) => {
    if (!el) return false;
    try{ if (el.dataset && el.dataset.fastTapBound === "1") return true; }catch(_){ }
    try{ bindFastTap(el, fn); }catch(_){ try{ el.addEventListener("click", fn); }catch(__){} }
    try{ if (el.dataset) el.dataset.fastTapBound = "1"; }catch(_){ }
    return true;
  };

  const setYearLabel = () => {
    const y = (new Date()).getFullYear();
    const yl = $("#taxYearBtnLabel");
    if (yl) yl.textContent = String(y);
    return y;
  };

  const doCalcRange = async (fromISO, toISO) => {
    try { await calcTassa(fromISO, toISO); }
    catch (err) { toast(String(err && err.message || err || "Errore")); resetTassaUI(); }
  };

  const yearBtn = $("#taxYearBtn");
  if (yearBtn){
    bindOnce(yearBtn, async () => {
      const y = setYearLabel();
      await doCalcRange(`${y}-01-01`, `${y}-12-31`);
    });
  }

  const estBtn = $("#taxEstimateBtn");
  if (estBtn){
    bindOnce(estBtn, async () => {
      const y = setYearLabel();
      try { await calcTassa(`${y}-01-01`, `${y}-12-31`, { includeUntagged: true }); }
      catch (err) { toast(String(err && err.message || err || "Errore")); resetTassaUI(); }
    });
  }

  const q1 = $("#taxQ1Btn");
  const q2 = $("#taxQ2Btn");
  const q3 = $("#taxQ3Btn");
  const q4 = $("#taxQ4Btn");
  const quarterBind = (btn, fromMMDD, toMMDD) => {
    if (!btn) return;
    bindOnce(btn, async () => {
      const y = setYearLabel();
      await doCalcRange(`${y}-${fromMMDD}`, `${y}-${toMMDD}`);
    });
  };
  quarterBind(q1, "01-01", "03-31");
  quarterBind(q2, "04-01", "06-30");
  quarterBind(q3, "07-01", "09-30");
  quarterBind(q4, "10-01", "12-31");

  // Mantieni listeners (inputs nascosti) per compatibilità
  const from = $("#taxFrom");
  const to = $("#taxTo");
  if (from) from.addEventListener("change", resetTassaUI);
  if (to) to.addEventListener("change", resetTassaUI);

  // Stato iniziale: risultati nascosti finché non premi un tasto
  setYearLabel();
  resetTassaUI();
}


/* =========================
   Ore pulizia (Calendario ore operatori)
   Build: dDAE_1.020
========================= */

state.orepulizia = state.orepulizia || {
  inited: false,
  monthKey: "",          // "YYYY-MM"
  operatore: "",         // nome operatore oppure "__ALL__"
  rows: [],              // righe da foglio operatori
  months: []             // [{key,label}]
};

function __capitalizeFirst_(s){
  s = String(s||"");
  return s ? (s[0].toUpperCase() + s.slice(1)) : "";
}

function formatMonthYearIT_(monthKey){
  // monthKey = "YYYY-MM"
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return "";
  const parts = monthKey.split("-").map(n=>parseInt(n,10));
  const y = parts[0], m = parts[1];
  const dt = new Date(y, (m-1), 1);
  const s = dt.toLocaleDateString(__getCurrentLocale__(), { month:"long", year:"numeric" });
  return __capitalizeFirst_(s);
}

function __fmtHours_(h){
  const n = Number(h||0);
  if (!isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 100) / 100;
  try{
    return new Intl.NumberFormat(__getCurrentLocale__(), { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(rounded);
  }catch(_){
    let s = rounded.toFixed(2);
    s = s.replace(/\.00$/, "").replace(/0$/, "");
    return s.replace(".", ",");
  }
}

function __fmtMoneyNoSpace_(amount){
  const n = Number(amount || 0);
  if (!isFinite(n)) return "—";
  try{
    const parts = new Intl.NumberFormat(__getCurrentLocale__(), { style:"currency", currency:"EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(n);
    return parts.map((part) => part.type === "literal" ? "" : part.value).join("");
  }catch(_){
    const s = n.toLocaleString(__getCurrentLocale__(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return s + "€";
  }
}


function __getUniqueMonthsFromRows_(rows){
  const set = new Set();
  (rows||[]).forEach(r=>{
    const iso = formatISODateLocal(r.data || r.date || r.Data || "");
    if (!iso) return;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) set.add(iso.slice(0,7));
  });
  return Array.from(set).sort();
}

async function __loadOperatoriRows_(){
  try{
    const res = await api("operatori", { method:"GET", showLoader:true });
    const rows = res && (res.rows || res.items) ? (res.rows || res.items) : [];
    return Array.isArray(rows) ? rows : [];
  }catch(e){
    console.warn("Operatori load failed", e);
    return [];
  }
}

function __fillSelect_(sel, items, value){
  if (!sel) return;
  sel.innerHTML = "";
  (items||[]).forEach(it=>{
    const opt = document.createElement("option");
    opt.value = it.value;
    opt.textContent = it.label;
    sel.appendChild(opt);
  });
  if (value) sel.value = value;
}

function __fmtHoursOrDash_(h){
  const s = __fmtHours_(h);
  return s ? s : "—";
}

function __opLabel_(op){
  const v = String(op||"").trim();
  if (!v || v === "__ALL__") return "Tutti";
  const low = v.toLowerCase();
  // Title-case semplice (spazi, trattini, apostrofi)
  return low.replace(/(^|[\s\-'])\S/g, (m) => m.toUpperCase());
}

function __renderOrePuliziaCalendar_(){
  const grid = document.getElementById("opcalGrid");
  if (!grid) return;

  const monthKey = state.orepulizia.monthKey;
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    grid.innerHTML = "";
    return;
  }

  const titleEl = document.getElementById("opcalTitleMain");
  const totalEl = document.getElementById("opcalTotalHours");
  const daysEl = document.getElementById("opcalDaysWithHours");

  const monthLabel = formatMonthYearIT_(monthKey) || monthKey;
  const op = String(state.orepulizia.operatore || "").trim();
  const opDisp = __opLabel_(op);

  if (titleEl) titleEl.textContent = `${opDisp} - ${monthLabel}`;

  const parts = monthKey.split("-").map(n=>parseInt(n,10));
  const Y = parts[0], M = parts[1]; // 1..12
  const first = new Date(Y, M-1, 1);
  const daysInMonth = new Date(Y, M, 0).getDate();

  // Lun=0..Dom=6
  const jsDow = first.getDay(); // Dom=0..Sab=6
  const dowMon0 = (jsDow + 6) % 7; // convert to Mon=0
  const totalCells = 42; // 6 settimane

  // ore per giorno + costi per operatore
  const rows = state.orepulizia.rows || [];
  const hoursByDay = new Map();
  let totalHours = 0;
  let totalImporto = 0;
  let presenze = 0;
  let presenzeImporto = 0;
  const presenceKeys = new Set();
  rows.forEach(r=>{
    const iso = formatISODateLocal(r.data || r.date || r.Data || '');
    if (!iso) return;
    if (!iso.startsWith(monthKey + '-')) return;

    const oper = String(r.operatore || r.nome || '').trim();
    if (op && op !== '__ALL__' && String(oper||'').trim().toLowerCase() !== String(op||'').trim().toLowerCase()) return;

    const oreRaw = (r.ore !== undefined && r.ore !== null) ? r.ore : (r.Ore !== undefined ? r.Ore : '');
    const ore = Number(String(oreRaw).trim().replace(',', '.'));
    if (!isFinite(ore) || ore <= 0) return;

    const d = parseInt(iso.slice(8,10), 10);
    if (!d) return;
    hoursByDay.set(d, (hoursByDay.get(d) || 0) + ore);
    totalHours += ore;

    const tariffaOperatore = getOperatoreTariffaByName(oper, Number(r?.tariffa_euro ?? 0));
    totalImporto += ore * tariffaOperatore;

    const presenceKey = `${iso}|${String(oper || '').trim().toLowerCase()}`;
    if (!presenceKeys.has(presenceKey)){
      presenceKeys.add(presenceKey);
      presenze += 1;
      const benzinaOperatore = getOperatoreBenzinaByName(oper, Number(r?.benzina_unit_euro ?? r?.benzina_euro ?? 0));
      presenzeImporto += benzinaOperatore;
    }
  });

  const hoursStr = __fmtHours_(totalHours);
  const totalImportoStr = totalImporto > 0 ? __fmtMoneyNoSpace_(totalImporto) : '—';
  const presenzeImportoStr = presenzeImporto > 0 ? __fmtMoneyNoSpace_(presenzeImporto) : '—';

  if (totalEl) {
    totalEl.textContent = hoursStr ? `${hoursStr} ore - ${totalImportoStr}` : "—";
  }
  if (daysEl) {
    daysEl.textContent = presenze > 0 ? `${presenze} transfert - ${presenzeImportoStr}` : "—";
  }

  // build cells
  grid.innerHTML = "";
  for (let i=0; i<totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "opcal-cell";

    const dayNum = i - dowMon0 + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.classList.add("is-empty");
      grid.appendChild(cell);
      continue;
    }

    const dayEl = document.createElement("div");
    dayEl.className = "opcal-day";
    dayEl.textContent = String(dayNum);
    cell.appendChild(dayEl);

    const h = hoursByDay.get(dayNum) || 0;
    if (h > 0) {
      const hEl = document.createElement("div");
      hEl.className = "opcal-hours";
      hEl.textContent = __fmtHours_(h); // no zeri
      cell.appendChild(hEl);
    }

    grid.appendChild(cell);
  }
}

async function initOrePuliziaPage(){
  const s = state.orepulizia;
  const back = document.getElementById("opcalBack");
  const selMonth = document.getElementById("opcalMonthSelect");
  const selOp = document.getElementById("opcalOperatorSelect");

  // Serve per mostrare importi in "Totali ore" e "Spese Benzina"
  try{ await ensureSettingsLoaded({ force:false, showLoader:false }); }catch(_){}

  if (!s.inited){
    s.inited = true;

    if (back) back.addEventListener("click", ()=>showPage("pulizie"));

    // Topbar: tasto arancione "torna a Pulizie"
    const topBack = document.getElementById("backBtnTop");
    if (topBack && !s._topBackBound){
      s._topBackBound = true;
      bindFastTap(topBack, () => { try{ showPage("pulizie"); }catch(_){ } });
    }

    if (selMonth) selMonth.addEventListener("change", ()=>{
      s.monthKey = selMonth.value;
      __renderOrePuliziaCalendar_();
    });

    if (selOp) selOp.addEventListener("change", ()=>{
      s.operatore = selOp.value;
      __renderOrePuliziaCalendar_();
    });
  }

  // dati
  await ensureSettingsLoaded({ force:false, showLoader:false });
  s.rows = await __loadOperatoriRows_();

  // mesi
  const months = __getUniqueMonthsFromRows_(s.rows);
  const now = new Date();
  const nowKey = String(now.getFullYear()) + "-" + String(now.getMonth()+1).padStart(2,"0");
  if (!months.includes(nowKey)) months.push(nowKey);
  months.sort();

  s.months = months.map(k=>({ key:k, label: formatMonthYearIT_(k) }));
  const monthItems = s.months.map(m=>({ value:m.key, label:m.label }));

  // default month: ultimo (più recente)
  if (!s.monthKey) s.monthKey = monthItems.length ? monthItems[monthItems.length-1].value : nowKey;

  __fillSelect_(selMonth, monthItems, s.monthKey);

  // operatori list: solo catalogo attivo dell'account
  let fromSet = [];
  try{ fromSet = getActiveOperatorNames ? getActiveOperatorNames() : []; }catch(_){ fromSet = []; }
  const ops = Array.from(new Set((fromSet||[]).map(x=>String(x||"").trim()).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b, "it"));

  // opzioni: TUTTI + operatori
  const opItems = [{ value:"__ALL__", label:"TUTTI" }, ...ops.map(x=>({ value:x, label:x }))];

  // default operatore
  // In sessione OPERATORE: pre-seleziona sempre il proprio nome (se presente), così il report è leggibile subito.
  if (state && state.session && isOperatoreSession(state.session)){
    const raw = String(
      state.session._op_local ||
      state.session.username ||
      state.session.user ||
      state.session.nome ||
      state.session.name ||
      state.session.email ||
      ""
    ).trim();
    if (raw){
      const norm = raw.toLowerCase();
      const match = (ops||[]).find(x => String(x||"").trim().toLowerCase() === norm);
      if (match) s.operatore = match;
    }
  }
  if (!s.operatore) s.operatore = ops.length ? ops[0] : "__ALL__";
  if (!opItems.some(o=>o.value === s.operatore)) s.operatore = ops.length ? ops[0] : "__ALL__";

  __fillSelect_(selOp, opItems, s.operatore);

  __renderOrePuliziaCalendar_();
}

(async ()=>{ try{ await init(); } catch(e){ console.error(e); try{ toast(e.message||"Errore"); }catch(_){ } } })();
