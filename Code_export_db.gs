/**
 * dDAE — Export DB (JSON unico) per migrazione verso App LOCALE
 *
 * Endpoint:
 *   ?action=export_db&apiKey=daedalium2026
 *
 * Output:
 *   { kind:"dDAE_export", schemaVersion:1, exportedAt:"ISO", datasets:{...} }
 *
 * NOTE:
 * - Pubblica come Web App (Esegui come: me, Accesso: chiunque con link) per poter scaricare il JSON.
 * - Questo endpoint serve SOLO a generare il file .json da importare nella PWA locale.
 */

const API_KEY = "daedalium2026";
const SCHEMA_VERSION = 1;

function doGet(e){
  const action = String(e && e.parameter && e.parameter.action || "").trim();
  if (action === "export_db") return handleExportDb_(e);
  // fallback: eventuali azioni esistenti
  return ContentService
    .createTextOutput(JSON.stringify({ ok:false, error:"Azione non supportata" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleExportDb_(e){
  const key = String(e && e.parameter && e.parameter.apiKey || "").trim();
  if (!key || key !== API_KEY){
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:"API key non valida" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const datasets = {};
  const sheetNames = [
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
    "ospiti_eliminati"
  ];

  sheetNames.forEach(name => {
    datasets[name] = readSheetAsObjects_(name);
  });

  const out = {
    kind: "dDAE_export",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    datasets: datasets
  };

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetAsObjects_(name){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const headers = values[0].map(h => String(h || "").trim());
  const out = [];
  for (var r = 1; r < values.length; r++){
    const row = values[r];
    // skip righe vuote
    var any = false;
    for (var c = 0; c < row.length; c++){ if (row[c] !== "" && row[c] !== null && row[c] !== undefined){ any = true; break; } }
    if (!any) continue;

    const obj = {};
    for (var i = 0; i < headers.length; i++){
      const k = headers[i] || ("col"+(i+1));
      obj[k] = row[i];
    }
    out.push(obj);
  }
  return out;
}
