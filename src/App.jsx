
import { useEffect, useMemo, useState } from "react";
import { Clipboard, RefreshCcw, ExternalLink } from "lucide-react";

const DEFAULT_LINKS = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRTD5myRZpckG-JW5TmkGgvAoyH38rEWIi-g0ha7iQfyDHUDxBAdVp3N9_YUAeKLFE7ErQNuHnopAi0/pub?output=csv`;

export default function App() {
  const [csvList, setCsvList] = useState(() => localStorage.getItem("pv3_csv_list") || DEFAULT_LINKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tabs, setTabs] = useState([]); // [{url, name, rows:[{a,b,...}]}]
  const [activeIdx, setActiveIdx] = useState(() => Number(localStorage.getItem("pv3_active_idx") || 0));
  const [category, setCategory] = useState(() => localStorage.getItem("pv3_category") || "");

  useEffect(() => localStorage.setItem("pv3_csv_list", csvList), [csvList]);
  useEffect(() => localStorage.setItem("pv3_active_idx", String(activeIdx)), [activeIdx]);
  useEffect(() => localStorage.setItem("pv3_category", category), [category]);

  const activeTab = tabs[activeIdx];

  const categories = useMemo(() => {
    if (!activeTab) return [];
    const set = new Set();
    activeTab.rows.forEach(r => { const v = (r.colA||"").trim(); if (v) set.add(v); });
    return Array.from(set);
  }, [activeTab]);

  const filteredPrompts = useMemo(() => {
    if (!activeTab) return [];
    const cat = category.trim();
    return activeTab.rows.filter(r => !cat || (r.colA||"") === cat).map(r => (r.colB || ""));
  }, [activeTab, category]);

  async function fetchAll() {
    const urls = csvList.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (!urls.length) return;
    setLoading(true); setError("");
    try {
      const results = [];
      for (let i=0;i<urls.length;i++) {
        const url = urls[i];
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const text = await res.text();
        const { rows } = parseCSVToAB(text);
        results.push({ url, name: guessSheetName(url, i), rows });
      }
      setTabs(results);
      setActiveIdx(0);
      setCategory("");
    } catch(e) {
      console.error(e);
      setError("Kunne ikke hente CSV. Tjek at linkene er publiceret som CSV.");
    } finally {
      setLoading(false);
    }
  }

  function copy(txt) { navigator.clipboard?.writeText(txt).catch(()=>{}); }
  function openChatGPT() { window.open("https://chat.openai.com/", "_blank"); }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prompt Vault v3</h1>
        <button onClick={openChatGPT} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white">
          <ExternalLink className="w-4 h-4" /> Åbn ChatGPT
        </button>
      </header>

      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3">
        <p className="text-sm text-slate-600 mb-2">Indsæt ét eller flere CSV-links (én pr. linje)</p>
        <textarea value={csvList} onChange={e=>setCsvList(e.target.value)} className="w-full h-28 rounded-xl border border-slate-300 px-3 py-2" placeholder="https://docs.google.com/.../pub?output=csv\nhttps://docs.google.com/.../pub?gid=123&output=csv" />
        <button onClick={fetchAll} disabled={loading || !csvList.trim()} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50">
          <RefreshCcw className={"w-4 h-4 " + (loading ? "animate-spin" : "")}/> Opdatér
        </button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-2">
        {tabs.map((t, i) => (
          <button key={i} onClick={()=>{setActiveIdx(i); setCategory("");}} className={"px-3 py-1.5 rounded-full border " + (i===activeIdx ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300")}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Category */}
      {activeTab && (
        <div className="mb-3">
          <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 bg-white min-w-[200px]">
            <option value="">Alle kategorier</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Prompts */}
      <ul className="space-y-3">
        {filteredPrompts.map((p, idx) => (
          <li key={idx} className="bg-white border border-slate-200 rounded-2xl p-3">
            <pre className="whitespace-pre-wrap text-[15px] leading-relaxed">{p}</pre>
            <div className="mt-2">
              <button onClick={()=>copy(p)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300">
                <Clipboard className="w-4 h-4" /> Kopiér
              </button>
            </div>
          </li>
        ))}
        {activeTab && filteredPrompts.length === 0 && <li className="text-slate-500">Ingen prompts i denne kategori.</li>}
      </ul>
    </div>
  );
}

/** Parse CSV → keep only first (A) and second (B) columns, robust to quotes/commas/newlines */
function parseCSVToAB(text) {
  const rows = [];
  let i=0, field="", row=[], inQuotes=false;
  const pushField=()=>{ row.push(field); field=""; };
  const pushRow=()=>{ rows.push(row); row=[]; };
  while (i<text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i+1]==='"') { field+='"'; i++; } else { inQuotes=false; } }
      else { field += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") pushField();
      else if (ch === "\n") { pushField(); pushRow(); }
      else if (ch === "\r") {}
      else field += ch;
    }
    i++;
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  // remove empty trailing
  while (rows.length && rows[rows.length-1].every(c => (c||"").trim()==="")) rows.pop();
  // drop header row if it looks like labels
  const dataRows = rows.length>1 ? rows.slice(1) : rows;
  const mapped = dataRows.map(r => ({ colA: (r[0]||"").trim(), colB: (r[1]||"").toString() }));
  return { rows: mapped };
}

function guessSheetName(url, i) {
  const m = url.match(/gid=(\d+)/);
  return m ? `Fane ${i+1} (gid ${m[1]})` : `Fane ${i+1}`;
}
