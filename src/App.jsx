import React, { useEffect, useMemo, useState } from "react";

const CADENCE = {
  MONTHLY: "monthly",
  SEMI_ANNUAL: "semi-annual",
  ANNUAL: "annual",
};

const defaultCards = ([
  {
    id: "amex-gold",
    name: "Amex Gold",
    annualFee: 325,
    rewardsNote: "4x dining & groceries, 3x flights, 2x prepaid hotels, 1x other",
    credits: [
      { id: "uber-cash", label: "Uber Cash ($10/mo)", amount: 10, cadence: CADENCE.MONTHLY },
      { id: "dining-credit", label: "Dining Credit ($10/mo)", amount: 10, cadence: CADENCE.MONTHLY },
      { id: "dunkin", label: "Dunkin ($7/mo)", amount: 7, cadence: CADENCE.MONTHLY },
      { id: "resy", label: "Resy ($50 semi-annual)", amount: 50, cadence: CADENCE.SEMI_ANNUAL },
    ],
  },
  {
    id: "venture-x",
    name: "Capital One Venture X",
    annualFee: 395,
    rewardsNote: "10x hotels/cars (portal), 5x flights (portal), 2x everywhere",
    credits: [
      { id: "c1-travel", label: "$300 Capital One Travel (annual)", amount: 300, cadence: CADENCE.ANNUAL },
      { id: "c1-anniv", label: "10k anniversary miles (~$100)", amount: 100, cadence: CADENCE.ANNUAL },
    ],
  },
  {
    id: "csr",
    name: "Chase Sapphire Reserve",
    annualFee: 795,
    rewardsNote: "8x Chase Travel, 4x direct flights/hotels, 3x dining",
    credits: [
      { id: "csr-travel", label: "$300 Travel (annual)", amount: 300, cadence: CADENCE.ANNUAL },
      { id: "csr-edit", label: "$500 The EditSM (semi-annual)", amount: 250, cadence: CADENCE.SEMI_ANNUAL },
      { id: "csr-dining", label: "$300 Dining ($150 semi-annual)", amount: 150, cadence: CADENCE.SEMI_ANNUAL },
      { id: "csr-apple", label: "$250 Apple TV+ / Music (annual)", amount: 250, cadence: CADENCE.ANNUAL },
      { id: "csr-dashpass", label: "$120 DashPass ($10/mo)", amount: 10, cadence: CADENCE.MONTHLY },
      { id: "csr-doordash", label: "$300 DoorDash promos ($25/mo)", amount: 25, cadence: CADENCE.MONTHLY },
      { id: "csr-lyft", label: "$120 Lyft ($10/mo)", amount: 10, cadence: CADENCE.MONTHLY },
      { id: "csr-stubhub", label: "$300 StubHub ($150 semi-annual)", amount: 150, cadence: CADENCE.SEMI_ANNUAL },
    ],
  },
]);

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const semis = ["H1 (Jan–Jun)", "H2 (Jul–Dec)"];
const currency = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const uid = () => Math.random().toString(36).slice(2, 9);
const STORAGE_KEY = "credit-card-tracker.v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load state", e);
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state", e);
  }
}

function periodsForCadence(cadence) {
  if (cadence === CADENCE.MONTHLY) return months.map((m, i) => ({ key: String(i), label: m }));
  if (cadence === CADENCE.SEMI_ANNUAL) return semis.map((s, i) => ({ key: String(i), label: s }));
  return [{ key: "0", label: "Annual" }];
}

export default function App() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [cards, setCards] = useState(defaultCards);
  const [year, setYear] = useState(currentYear);
  const [usage, setUsage] = useState({});
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.cards) setCards(saved.cards);
      if (saved.year) setYear(saved.year);
      if (saved.usage) setUsage(saved.usage);
    }
  }, []);

  useEffect(() => {
    saveState({ cards, year, usage });
  }, [cards, year, usage]);

  const { totalsByCard, grand } = useMemo(() => computeTotals(cards, usage, year), [cards, usage, year]);

  const toggleUsage = (cardId, creditId, periodKey) => {
    const key = `${year}::${cardId}::${creditId}::${periodKey}`;
    setUsage((u) => ({ ...u, [key]: !u[key] }));
  };

  const resetPeriod = (cadence) => {
    const newUsage = { ...usage };
    cards.forEach((card) => {
      card.credits.filter(c => c.cadence === cadence).forEach(c => {
        periodsForCadence(c.cadence).forEach(p => {
          const k = `${year}::${card.id}::${c.id}::${p.key}`;
          delete newUsage[k];
        });
      });
    });
    setUsage(newUsage);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ cards, year, usage }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-tracker-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    try {
      const obj = JSON.parse(importText);
      if (obj.cards) setCards(obj.cards);
      if (obj.year) setYear(obj.year);
      if (obj.usage) setUsage(obj.usage);
      setShowImport(false);
      setImportText("");
    } catch (e) {
      alert("Invalid JSON. Please paste a file exported from this app.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white grid place-items-center font-bold">$</div>
            <div>
              <h1 className="text-xl font-semibold">Credit Credits Tracker</h1>
              <p className="text-sm text-slate-600">Amex Gold • Venture X • CSR — keep credits from expiring</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <YearPicker year={year} setYear={setYear} />
            <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm" onClick={() => setShowEditor(true)}>Edit Cards & Credits</button>
            <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={exportData}>Export JSON</button>
            <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={() => setShowImport(true)}>Import JSON</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Summary grand={grand} />

        <div className="my-4 flex flex-wrap gap-2">
          <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={() => resetPeriod(CADENCE.MONTHLY)}>Reset monthly {year}</button>
          <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={() => resetPeriod(CADENCE.SEMI_ANNUAL)}>Reset semi-annual {year}</button>
          <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={() => resetPeriod(CADENCE.ANNUAL)}>Reset annual {year}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(card => (
            <CardPanel key={card.id} card={card} year={year} totals={totalsByCard[card.id]} usage={usage} toggleUsage={toggleUsage} />
          ))}
        </div>
      </main>

      {showEditor && (
        <Modal title="Edit Cards & Credits" onClose={() => setShowEditor(false)}>
          <Editor cards={cards} setCards={setCards} />
        </Modal>
      )}

      {showImport && (
        <Modal title="Import JSON" onClose={() => setShowImport(false)}>
          <textarea className="w-full h-48 p-3 border rounded-xl" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste exported JSON here" />
          <div className="mt-3 flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={() => setShowImport(false)}>Cancel</button>
            <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm" onClick={importData}>Import</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function computeTotals(cards, usage, year) {
  const totalsByCard = {};
  let grandAll = 0, grandUsed = 0, grandFee = 0;

  for (const card of cards) {
    let all = 0, used = 0;
    for (const credit of card.credits) {
      const periods = periodsForCadence(credit.cadence);
      const occurrences = periods.length;
      const totalForCredit = credit.amount * occurrences;
      all += totalForCredit;
      for (const p of periods) {
        const k = `${year}::${card.id}::${credit.id}::${p.key}`;
        if (usage[k]) used += credit.amount;
      }
    }
    const remaining = Math.max(0, all - used);
    const net = used - card.annualFee;
    totalsByCard[card.id] = { all, used, remaining, net, fee: card.annualFee };
    grandAll += all;
    grandUsed += used;
    grandFee += card.annualFee;
  }

  const grand = { all: grandAll, used: grandUsed, remaining: Math.max(0, grandAll - grandUsed), fee: grandFee, net: grandUsed - grandFee };
  return { totalsByCard, grand };
}

function Summary({ grand }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <SummaryTile label="Total Credits" value={currency(grand.all)} sub="All cards (annualized)" />
      <SummaryTile label="Credits Used" value={currency(grand.used)} sub="Checked for selected year" />
      <SummaryTile label="Remaining" value={currency(grand.remaining)} sub="Still to redeem" />
      <SummaryTile label="Annual Fees" value={currency(grand.fee)} sub="Sum of card fees" />
      <SummaryTile label="Net (Used − Fees)" value={currency(grand.net)} sub={grand.net >= 0 ? "Net positive" : "Net negative"} highlight={true} positive={grand.net >= 0} />
    </div>
  );
}

function SummaryTile({ label, value, sub, highlight=false, positive=true }) {
  return (
    <div className={`rounded-2xl p-4 bg-white border ${highlight ? (positive ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'} shadow-sm`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function CardPanel({ card, year, totals, usage, toggleUsage }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{card.name}</h2>
          <p className="text-sm text-slate-600">Annual fee: {currency(card.annualFee)} • {card.rewardsNote}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Net (used − fee): {currency(totals.net)}</div>
          <div className="text-xs text-slate-500">Used {currency(totals.used)} / {currency(totals.all)} | Remaining {currency(totals.remaining)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        {card.credits.map(credit => (
          <CreditRow key={credit.id} cardId={card.id} year={year} credit={credit} usage={usage} toggleUsage={toggleUsage} />
        ))}
      </div>
    </div>
  );
}

function CreditRow({ cardId, year, credit, usage, toggleUsage }) {
  const periods = periodsForCadence(credit.cadence);
  const total = credit.amount * periods.length;
  const used = periods.reduce((acc, p) => acc + (usage[`${year}::${cardId}::${credit.id}::${p.key}`] ? credit.amount : 0), 0);
  const remaining = Math.max(0, total - used);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
        <div className="text-sm font-medium">{credit.label} <span className="ml-2 text-xs text-slate-500">({credit.cadence})</span></div>
        <div className="text-xs text-slate-600">Used {currency(used)} / {currency(total)} • Remaining {currency(remaining)}</div>
      </div>
      <div className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => {
            const key = `${year}::${cardId}::${credit.id}::${p.key}`;
            const checked = !!usage[key];
            return (
              <button
                key={p.key}
                onClick={() => toggleUsage(cardId, credit.id, p.key)}
                className={`px-2.5 py-1.5 text-sm rounded-lg border ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'} hover:bg-slate-50`}
                title={checked ? 'Mark as unused' : 'Mark as used'}
              >
                <span className="font-medium mr-1">{p.label}</span>
                <span className={`text-xs ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>{checked ? 'Used' : 'Unused'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearPicker({ year, setYear }) {
  const [val, setVal] = useState(String(year));
  useEffect(() => setVal(String(year)), [year]);
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Year</label>
      <input
        type="number"
        className="w-28 px-3 py-1.5 rounded-xl border"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          const n = parseInt(val, 10);
          if (!isNaN(n)) setYear(n);
        }}
      />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100" onClick={onClose}>✕</button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function Editor({ cards, setCards }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(cards)));

  const addCard = () => {
    setLocal((ls) => ([...ls, { id: uid(), name: "New Card", annualFee: 0, rewardsNote: "", credits: [] }]));
  };

  const addCredit = (cardIndex) => {
    setLocal((ls) => {
      const copy = [...ls];
      copy[cardIndex].credits.push({ id: uid(), label: "New Credit", amount: 0, cadence: CADENCE.MONTHLY });
      return copy;
    });
  };

  const removeCard = (cardIndex) => {
    setLocal((ls) => ls.filter((_, i) => i !== cardIndex));
  };

  const removeCredit = (cardIndex, creditIndex) => {
    setLocal((ls) => {
      const copy = [...ls];
      copy[cardIndex].credits.splice(creditIndex, 1);
      return copy;
    });
  };

  const updateCard = (cardIndex, patch) => {
    setLocal((ls) => {
      const copy = [...ls];
      copy[cardIndex] = { ...copy[cardIndex], ...patch };
      return copy;
    });
  };

  const updateCredit = (cardIndex, creditIndex, patch) => {
    setLocal((ls) => {
      const copy = [...ls];
      copy[cardIndex].credits[creditIndex] = { ...copy[cardIndex].credits[creditIndex], ...patch };
      return copy;
    });
  };

  const moveCard = (from, to) => {
    setLocal((ls) => {
      const copy = [...ls];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Add/remove cards and credits, adjust amounts, or change cadence. Click <span className="font-medium">Apply</span> to save.</p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-xl bg-white border text-sm" onClick={addCard}>Add Card</button>
          <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm" onClick={() => setCards(local)}>Apply</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {local.map((card, ci) => (
          <div key={card.id} className="border rounded-2xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
                <input className="px-3 py-1.5 rounded-xl border w-full" value={card.name} onChange={e => updateCard(ci, { name: e.target.value })} />
                <input className="px-3 py-1.5 rounded-xl border w-full" type="number" value={card.annualFee} onChange={e => updateCard(ci, { annualFee: parseFloat(e.target.value || '0') })} placeholder="Annual Fee" />
                <input className="px-3 py-1.5 rounded-xl border w-full md:col-span-2" value={card.rewardsNote || ''} onChange={e => updateCard(ci, { rewardsNote: e.target.value })} placeholder="Rewards note" />
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 rounded-lg bg-white border text-sm" onClick={() => moveCard(ci, Math.max(0, ci - 1))}>↑</button>
                <button className="px-2 py-1 rounded-lg bg-white border text-sm" onClick={() => moveCard(ci, Math.min(local.length - 1, ci + 1))}>↓</button>
                <button className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm" onClick={() => removeCard(ci)}>Remove</button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Credits</div>
                <button className="px-2.5 py-1.5 rounded-xl bg-white border text-sm" onClick={() => addCredit(ci)}>Add Credit</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {card.credits.map((cr, cidx) => (
                  <div key={cr.id} className="border rounded-xl p-2">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                      <input className="px-3 py-1.5 rounded-xl border md:col-span-3" value={cr.label} onChange={e => updateCredit(ci, cidx, { label: e.target.value })} />
                      <input className="px-3 py-1.5 rounded-xl border" type="number" value={cr.amount} onChange={e => updateCredit(ci, cidx, { amount: parseFloat(e.target.value || '0') })} placeholder="Amount" />
                      <select className="px-3 py-1.5 rounded-xl border" value={cr.cadence} onChange={e => updateCredit(ci, cidx, { cadence: e.target.value })}>
                        <option value={CADENCE.MONTHLY}>monthly</option>
                        <option value={CADENCE.SEMI_ANNUAL}>semi-annual</option>
                        <option value={CADENCE.ANNUAL}>annual</option>
                      </select>
                      <button className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm" onClick={() => removeCredit(ci, cidx)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
