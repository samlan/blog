import { useState, useMemo, useCallback } from "react";

/* ================================================================
   THE MERIDIAN BRIEF — African Security Monitor
   - Toggle between an FT-style and an Economist-style edition
   - Interactive Africa map: markers sized by story count, click to
     filter stories by country
   - Themes: Terrorism, Disinformation, Health, Climate & Disasters,
     Military & Defence (with subcategories)
   - "Fetch live news" pulls real, current stories per theme via a
     server-side endpoint (see server/README)
   ================================================================ */

const CATEGORIES = [
  { id: "terrorism", label: "Terrorism & Insurgency", short: "Terrorism" },
  { id: "disinformation", label: "Disinformation", short: "Disinfo" },
  { id: "health", label: "Health Security", short: "Health" },
  { id: "climate", label: "Climate & Disasters", short: "Climate" },
  { id: "military", label: "Military & Defence", short: "Military" },
];

const MIL_SUBS = [
  { id: "operations", label: "Operations" },
  { id: "personnel", label: "Senior personnel" },
  { id: "policy", label: "Policy statements" },
  { id: "exercises", label: "Major exercises" },
  { id: "acquisitions", label: "Acquisitions" },
];

/* ----------------------------------------------------------------
   Two complete editorial identities
   ---------------------------------------------------------------- */
const THEMES = {
  ft: {
    name: "FT style",
    bg: "#FFF1E5",
    card: "#FFF8F1",
    ink: "#33302E",
    sub: "#6B635C",
    accent: "#990F3D",
    accentInk: "#FFF1E5",
    rule: "#E0D2C7",
    link: "#0D7680",
    mapLand: "#F2E2D4",
    mapStroke: "#C9B5A5",
    display: "'Playfair Display', Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
    ui: "Georgia, 'Times New Roman', serif",
    kickerCase: "uppercase",
    radius: "0px",
    cat: {
      terrorism: "#990F3D",
      disinformation: "#6E2C8E",
      health: "#0D7680",
      climate: "#7A8B26",
      military: "#262A33",
    },
  },
  econ: {
    name: "Economist style",
    bg: "#FFFFFF",
    card: "#F7F7F7",
    ink: "#121212",
    sub: "#5B5B5B",
    accent: "#E3120B",
    accentInk: "#FFFFFF",
    rule: "#D9D9D9",
    link: "#006BA2",
    mapLand: "#EDEDED",
    mapStroke: "#BDBDBD",
    display: "'IBM Plex Serif', Georgia, serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    ui: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    kickerCase: "uppercase",
    radius: "0px",
    cat: {
      terrorism: "#E3120B",
      disinformation: "#924C7E",
      health: "#3EBCD2",
      climate: "#379A8B",
      military: "#006BA2",
    },
  },
};

/* ----------------------------------------------------------------
   Geography: simplified Africa + Madagascar outlines, equirectangular
   ---------------------------------------------------------------- */
const W = 560;
const H = 600;
const project = (lng, lat) => [
  ((lng + 20) * W) / 75,
  ((40 - lat) * H) / 78,
];

const AFRICA = [
  [-5.9, 35.8], [1.5, 36.6], [9.9, 37.3], [11.0, 33.6], [15.3, 32.4],
  [20.1, 32.2], [25.1, 31.6], [31.1, 31.5], [34.2, 31.3], [32.6, 29.9],
  [33.9, 27.0], [35.8, 23.9], [37.3, 21.0], [38.5, 18.0], [39.8, 15.5],
  [43.3, 12.5], [43.4, 11.0], [45.0, 10.9], [48.9, 11.3], [51.3, 11.8],
  [50.6, 9.4], [47.5, 4.6], [45.3, 2.0], [42.6, 0.1], [41.5, -1.9],
  [39.5, -7.0], [40.4, -10.5], [40.6, -15.5], [36.9, -17.9], [35.0, -22.0],
  [32.6, -26.0], [31.0, -29.9], [27.9, -33.0], [20.0, -34.8], [18.4, -34.0],
  [17.9, -32.7], [16.5, -28.6], [14.5, -26.0], [11.8, -18.0], [13.4, -12.5],
  [12.3, -6.1], [9.3, -1.5], [9.8, 4.0], [8.3, 4.8], [5.5, 4.3],
  [3.4, 6.4], [-1.5, 5.0], [-7.5, 4.4], [-13.2, 8.5], [-16.5, 12.3],
  [-17.5, 14.7], [-16.0, 18.1], [-16.2, 21.3], [-13.0, 27.7], [-9.8, 33.6],
];

const MADAGASCAR = [
  [49.3, -12.1], [50.2, -15.0], [49.6, -18.5], [47.1, -24.9], [45.2, -25.6],
  [43.7, -23.5], [43.2, -22.3], [44.0, -19.9], [44.5, -16.2], [46.3, -13.9],
  [48.0, -13.1],
];

const toPath = (pts) =>
  "M" +
  pts.map(([lng, lat]) => project(lng, lat).map((n) => n.toFixed(1)).join(",")).join("L") +
  "Z";

const AFRICA_PATH = toPath(AFRICA);
const MADAGASCAR_PATH = toPath(MADAGASCAR);

/* ----------------------------------------------------------------
   Seed data — clearly labelled samples until live news is fetched
   ---------------------------------------------------------------- */
const SEED_STORIES = [
  {
    id: "s1", sample: true, category: "terrorism", country: "Nigeria",
    lat: 11.8, lng: 13.2, date: "2026-06-09", source: "Sample wire",
    headline: "Lake Chad Basin force reports strikes on militant supply corridors",
    summary: "Regional task force units say coordinated operations disrupted logistics routes used by insurgent factions around the basin's island areas.",
  },
  {
    id: "s2", sample: true, category: "terrorism", country: "Mozambique",
    lat: -12.3, lng: 39.5, date: "2026-06-07", source: "Sample wire",
    headline: "Cabo Delgado attacks displace villagers ahead of gas project restart",
    summary: "Fresh raids on coastal districts have renewed displacement, raising questions over security guarantees for returning energy investment.",
  },
  {
    id: "s3", sample: true, category: "terrorism", country: "Mali",
    lat: 16.2, lng: -2.9, date: "2026-06-05", source: "Sample wire",
    headline: "Jihadist coalition pressures river towns in central Mali",
    summary: "Blockades on key crossings are squeezing trade and humanitarian access, residents and aid groups report.",
  },
  {
    id: "s4", sample: true, category: "disinformation", country: "Burkina Faso",
    lat: 12.4, lng: -1.5, date: "2026-06-08", source: "Sample wire",
    headline: "Researchers map coordinated network amplifying anti-UN narratives in the Sahel",
    summary: "An open-source analysis identifies clusters of inauthentic accounts pushing synchronized content across three platforms.",
  },
  {
    id: "s5", sample: true, category: "disinformation", country: "DR Congo",
    lat: -2.9, lng: 23.7, date: "2026-06-04", source: "Sample wire",
    headline: "Fact-checkers flag AI-generated clips circulating before provincial polls",
    summary: "Synthetic audio attributed to local officials spread widely on messaging apps before being debunked.",
  },
  {
    id: "s6", sample: true, category: "health", country: "Sudan",
    lat: 15.6, lng: 30.2, date: "2026-06-10", source: "Sample wire",
    headline: "Health agencies expand cholera response amid strained water systems",
    summary: "Treatment centres are being scaled up in displacement hubs as case counts rise with the early rains.",
  },
  {
    id: "s7", sample: true, category: "health", country: "DR Congo",
    lat: -0.5, lng: 25.2, date: "2026-06-03", source: "Sample wire",
    headline: "Mpox vaccination drive reaches remote eastern districts",
    summary: "Cold-chain improvements allow a new round of doses to reach previously inaccessible health zones.",
  },
  {
    id: "s8", sample: true, category: "climate", country: "Ethiopia",
    lat: 7.5, lng: 40.5, date: "2026-06-06", source: "Sample wire",
    headline: "Failed rains deepen pastoralist losses across the southern lowlands",
    summary: "Livestock deaths and water scarcity are accelerating migration toward towns, compounding pressure on services.",
  },
  {
    id: "s9", sample: true, category: "climate", country: "Kenya",
    lat: -0.4, lng: 36.9, date: "2026-06-02", source: "Sample wire",
    headline: "Flash floods cut highway links in the Rift Valley",
    summary: "Heavy localized storms damaged bridges and stranded freight, with repair crews warning of week-long delays.",
  },
  {
    id: "s10", sample: true, category: "military", militarySubcategory: "acquisitions",
    country: "Nigeria", lat: 6.4, lng: 3.4, date: "2026-06-09", source: "Sample wire",
    headline: "Navy takes delivery of new offshore patrol vessels for Gulf of Guinea duty",
    summary: "The hulls are slated for counter-piracy and fisheries-protection patrols along the western approaches.",
  },
  {
    id: "s11", sample: true, category: "military", militarySubcategory: "exercises",
    country: "Ghana", lat: 5.6, lng: 0.0, date: "2026-06-05", source: "Sample wire",
    headline: "Multinational maritime exercise concludes with live boarding drills",
    summary: "Regional navies and partner observers rehearsed interdiction, search-and-rescue and port security scenarios.",
  },
  {
    id: "s12", sample: true, category: "military", militarySubcategory: "policy",
    country: "South Africa", lat: -25.7, lng: 28.2, date: "2026-06-01", source: "Sample wire",
    headline: "Defence review proposes rebalancing budget toward maintenance and cyber",
    summary: "A draft policy paper argues readiness has eroded and calls for consolidating procurement lines.",
  },
];

/* ----------------------------------------------------------------
   Live fetch — calls a same-origin backend endpoint, which is
   responsible for holding the Anthropic API key and doing the
   actual web-search-backed lookup. See server/README.md.
   ---------------------------------------------------------------- */
async function fetchThemeStories(catId) {
  const response = await fetch(`/api/news?category=${encodeURIComponent(catId)}`);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${catId}: ${response.status}`);
  }
  const arr = await response.json();
  return arr
    .filter((s) => s && s.headline && typeof s.lat === "number" && typeof s.lng === "number")
    .map((s, i) => ({
      ...s,
      id: `${catId}-${Date.now()}-${i}`,
      sample: false,
      category: catId,
    }));
}

/* ----------------------------------------------------------------
   Component
   ---------------------------------------------------------------- */
export default function AfricanSecurityMonitor() {
  const [mode, setMode] = useState("ft");
  const [tab, setTab] = useState("all");
  const [milSub, setMilSub] = useState("all");
  const [country, setCountry] = useState(null);
  const [stories, setStories] = useState(SEED_STORIES);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const t = THEMES[mode];
  const hasLive = stories.some((s) => !s.sample);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    let failures = 0;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const c = CATEGORIES[i];
      setStatus(`Fetching ${c.label.toLowerCase()}… (${i + 1}/${CATEGORIES.length})`);
      try {
        const got = await fetchThemeStories(c.id);
        // progressive update: live stories replace samples per category
        setStories((prev) => {
          const keep = prev.filter(
            (s) => !(s.category === c.id && s.sample) &&
                   !got.some((g) => g.headline.toLowerCase() === s.headline.toLowerCase())
          );
          return [...got, ...keep];
        });
      } catch (e) {
        failures++;
        console.error(`Fetch failed for ${c.id}:`, e);
      }
    }
    setStatus("");
    setLoading(false);
    if (failures === CATEGORIES.length) {
      setError("Live fetch failed for every theme. Showing existing stories — try again in a moment.");
    } else if (failures > 0) {
      setError(`${failures} theme${failures > 1 ? "s" : ""} could not be refreshed; others updated.`);
    }
  }, []);

  const filtered = useMemo(() => {
    let list = stories;
    if (tab !== "all") list = list.filter((s) => s.category === tab);
    if (tab === "military" && milSub !== "all")
      list = list.filter((s) => s.militarySubcategory === milSub);
    if (country) list = list.filter((s) => s.country === country);
    return [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [stories, tab, milSub, country]);

  // markers honour theme + military-sub filters, but not the country filter,
  // so the map always offers somewhere to click
  const markers = useMemo(() => {
    let list = stories;
    if (tab !== "all") list = list.filter((s) => s.category === tab);
    if (tab === "military" && milSub !== "all")
      list = list.filter((s) => s.militarySubcategory === milSub);
    const byCountry = {};
    for (const s of list) {
      if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
      if (!byCountry[s.country]) {
        byCountry[s.country] = { country: s.country, lat: s.lat, lng: s.lng, count: 0, cats: {} };
      }
      byCountry[s.country].count++;
      byCountry[s.country].cats[s.category] = (byCountry[s.country].cats[s.category] || 0) + 1;
    }
    return Object.values(byCountry).map((m) => {
      const top = Object.entries(m.cats).sort((a, b) => b[1] - a[1])[0][0];
      return { ...m, topCat: top };
    });
  }, [stories, tab, milSub]);

  const counts = useMemo(() => {
    const c = { all: stories.length };
    for (const cat of CATEGORIES) c[cat.id] = stories.filter((s) => s.category === cat.id).length;
    return c;
  }, [stories]);

  const lead = filtered[0];
  const rest = filtered.slice(1);
  const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;
  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return isNaN(dt) ? d : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const cssVars = {
    "--bg": t.bg, "--card": t.card, "--ink": t.ink, "--sub": t.sub,
    "--accent": t.accent, "--accent-ink": t.accentInk, "--rule": t.rule,
    "--link": t.link, "--map-land": t.mapLand, "--map-stroke": t.mapStroke,
    "--display": t.display, "--body": t.body, "--ui": t.ui, "--radius": t.radius,
  };

  return (
    <div className="asm-root" style={cssVars}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500&family=IBM+Plex+Serif:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .asm-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--body);
          -webkit-font-smoothing: antialiased;
          transition: background 0.35s ease, color 0.35s ease;
        }
        .asm-root *, .asm-root *::before, .asm-root *::after { box-sizing: border-box; }
        .asm-shell { max-width: 1180px; margin: 0 auto; padding: 0 20px 64px; }

        /* ---------- masthead ---------- */
        .asm-topline { height: 6px; background: var(--accent); }
        .asm-mast { padding: 22px 0 14px; display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; }
        .asm-brand { display: flex; align-items: center; gap: 14px; }
        .asm-plate {
          background: var(--accent); color: var(--accent-ink);
          font-family: var(--display); font-weight: 800; font-size: 26px;
          line-height: 1; padding: 12px 14px 10px; letter-spacing: 0.5px;
        }
        .asm-title { font-family: var(--display); font-size: 30px; font-weight: 700; line-height: 1.05; margin: 0; }
        .asm-tag { font-family: var(--ui); font-size: 12.5px; color: var(--sub); margin: 4px 0 0; letter-spacing: 0.04em; }
        .asm-mastrule { border: 0; border-top: 1px solid var(--ink); margin: 0; }
        .asm-mastrule.thin { border-top: 1px solid var(--rule); margin-top: 3px; }

        /* ---------- controls ---------- */
        .asm-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 0; }
        .asm-seg { display: inline-flex; border: 1px solid var(--ink); border-radius: var(--radius); overflow: hidden; }
        .asm-seg button {
          font-family: var(--ui); font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
          padding: 8px 16px; background: transparent; color: var(--ink);
          border: 0; cursor: pointer;
        }
        .asm-seg button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
        .asm-fetch {
          font-family: var(--ui); font-size: 13px; font-weight: 700; letter-spacing: 0.03em;
          background: var(--accent); color: var(--accent-ink);
          border: 1px solid var(--accent); border-radius: var(--radius);
          padding: 9px 18px; cursor: pointer;
        }
        .asm-fetch:disabled { opacity: 0.55; cursor: progress; }
        .asm-status { font-family: var(--ui); font-size: 12.5px; color: var(--sub); }
        .asm-error { font-family: var(--ui); font-size: 12.5px; color: var(--accent); }

        .asm-banner {
          font-family: var(--ui); font-size: 12.5px; color: var(--sub);
          border: 1px dashed var(--rule); padding: 8px 12px; margin-bottom: 14px;
          background: var(--card);
        }
        .asm-banner strong { color: var(--ink); }

        /* ---------- theme tabs ---------- */
        .asm-tabs { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--rule); margin-bottom: 6px; }
        .asm-tab {
          font-family: var(--ui); font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
          padding: 11px 16px; background: transparent; color: var(--sub);
          border: 0; border-bottom: 3px solid transparent; cursor: pointer; margin-bottom: -1px;
        }
        .asm-tab:hover { color: var(--ink); }
        .asm-tab[aria-pressed="true"] { color: var(--ink); border-bottom-color: var(--accent); }
        .asm-tab .n { color: var(--sub); font-weight: 400; font-size: 11.5px; margin-left: 5px; }

        .asm-subchips { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0 4px; }
        .asm-chip {
          font-family: var(--ui); font-size: 12px; font-weight: 600;
          border: 1px solid var(--rule); border-radius: 999px; background: transparent;
          color: var(--sub); padding: 5px 13px; cursor: pointer;
        }
        .asm-chip[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }

        /* ---------- layout ---------- */
        .asm-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 28px; margin-top: 18px; align-items: start; }
        @media (max-width: 900px) { .asm-grid { grid-template-columns: 1fr; } }

        /* ---------- map ---------- */
        .asm-mapcard { border: 1px solid var(--rule); background: var(--card); padding: 16px; position: sticky; top: 12px; }
        @media (max-width: 900px) { .asm-mapcard { position: static; } }
        .asm-mapcard h2 { font-family: var(--display); font-size: 19px; margin: 0 0 2px; }
        .asm-maphint { font-family: var(--ui); font-size: 12px; color: var(--sub); margin: 0 0 8px; }
        .asm-map { width: 100%; height: auto; display: block; }
        .asm-marker { cursor: pointer; }
        .asm-marker circle.core { transition: r 0.15s ease; }
        .asm-marker:hover circle.core, .asm-marker:focus-visible circle.core { stroke-width: 2.5; }
        .asm-pulse { animation: asm-pulse 2.4s ease-out infinite; transform-origin: center; pointer-events: none; }
        @keyframes asm-pulse {
          0% { opacity: 0.55; r: 4; }
          100% { opacity: 0; r: 18; }
        }
        @media (prefers-reduced-motion: reduce) {
          .asm-pulse { animation: none; opacity: 0; }
          .asm-root { transition: none; }
        }
        .asm-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 10px; }
        .asm-legend span { font-family: var(--ui); font-size: 11.5px; color: var(--sub); display: inline-flex; align-items: center; gap: 6px; }
        .asm-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .asm-countryflag {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 10px;
          font-family: var(--ui); font-size: 12.5px; color: var(--ink);
          border: 1px solid var(--accent); padding: 5px 10px;
        }
        .asm-countryflag button { border: 0; background: none; color: var(--accent); font-weight: 700; cursor: pointer; font-size: 13px; padding: 0; }

        /* ---------- stories ---------- */
        .asm-kicker {
          font-family: var(--ui); font-size: 11.5px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 6px;
        }
        .asm-lead { border-bottom: 1px solid var(--rule); padding-bottom: 18px; margin-bottom: 18px; }
        .asm-lead h3 { font-family: var(--display); font-size: 28px; line-height: 1.12; margin: 0 0 10px; font-weight: 700; }
        .asm-lead p { font-size: 16px; line-height: 1.55; margin: 0 0 10px; color: var(--ink); }
        .asm-meta { font-family: var(--ui); font-size: 12px; color: var(--sub); }
        .asm-sample {
          font-family: var(--ui); font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          border: 1px solid var(--sub); color: var(--sub); padding: 2px 6px; margin-left: 8px;
          vertical-align: 1px;
        }
        .asm-subtag {
          font-family: var(--ui); font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--accent-ink); background: var(--ink);
          padding: 2px 7px; margin-left: 8px; vertical-align: 1px;
        }
        .asm-item { display: grid; grid-template-columns: 1fr; border-bottom: 1px solid var(--rule); padding: 14px 0; }
        .asm-item h4 { font-family: var(--display); font-size: 18.5px; line-height: 1.2; margin: 0 0 6px; font-weight: 700; }
        .asm-item p { font-size: 14.5px; line-height: 1.5; margin: 0 0 8px; }
        .asm-empty { font-family: var(--ui); color: var(--sub); padding: 28px 0; font-size: 14px; }
        .asm-footer { margin-top: 36px; border-top: 1px solid var(--ink); padding-top: 10px; font-family: var(--ui); font-size: 11.5px; color: var(--sub); }

        .asm-root :focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
      `}</style>

      <div className="asm-topline" />
      <div className="asm-shell">
        <header className="asm-mast">
          <div className="asm-brand">
            <div className="asm-plate" aria-hidden="true">MB</div>
            <div>
              <h1 className="asm-title">The Meridian Brief</h1>
              <p className="asm-tag">AFRICAN SECURITY MONITOR · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="asm-seg" role="group" aria-label="Edition style">
            <button aria-pressed={mode === "ft"} onClick={() => setMode("ft")}>FT style</button>
            <button aria-pressed={mode === "econ"} onClick={() => setMode("econ")}>Economist style</button>
          </div>
        </header>
        <hr className="asm-mastrule" />
        <hr className="asm-mastrule thin" />

        <div className="asm-controls">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="asm-fetch" onClick={fetchAll} disabled={loading}>
              {loading ? "Fetching…" : hasLive ? "Refresh live news" : "Fetch live news"}
            </button>
            {status && <span className="asm-status" role="status">{status}</span>}
            {error && <span className="asm-error" role="alert">{error}</span>}
          </div>
        </div>

        {!hasLive && (
          <div className="asm-banner">
            <strong>Showing sample stories.</strong> Press “Fetch live news” to pull current reporting for each theme via web search.
          </div>
        )}

        <nav className="asm-tabs" aria-label="Themes">
          <button className="asm-tab" aria-pressed={tab === "all"} onClick={() => { setTab("all"); setMilSub("all"); }}>
            All themes<span className="n">{counts.all}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="asm-tab" aria-pressed={tab === c.id}
              onClick={() => { setTab(c.id); if (c.id !== "military") setMilSub("all"); }}>
              {c.label}<span className="n">{counts[c.id]}</span>
            </button>
          ))}
        </nav>

        {tab === "military" && (
          <div className="asm-subchips" role="group" aria-label="Military subcategories">
            <button className="asm-chip" aria-pressed={milSub === "all"} onClick={() => setMilSub("all")}>All military</button>
            {MIL_SUBS.map((s) => (
              <button key={s.id} className="asm-chip" aria-pressed={milSub === s.id} onClick={() => setMilSub(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="asm-grid">
          {/* ------------ MAP ------------ */}
          <section className="asm-mapcard" aria-label="Situation map">
            <h2>Situation map</h2>
            <p className="asm-maphint">Markers scale with story count. Click a marker to filter by country.</p>
            <svg className="asm-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of Africa with story markers">
              <path d={AFRICA_PATH} fill="var(--map-land)" stroke="var(--map-stroke)" strokeWidth="1.2" />
              <path d={MADAGASCAR_PATH} fill="var(--map-land)" stroke="var(--map-stroke)" strokeWidth="1.2" />
              {markers.map((m) => {
                const [x, y] = project(m.lng, m.lat);
                const r = Math.min(5 + m.count * 2.2, 16);
                const col = t.cat[m.topCat] || t.accent;
                const sel = country === m.country;
                return (
                  <g key={m.country} className="asm-marker" tabIndex={0} role="button"
                    aria-label={`${m.country}: ${m.count} ${m.count === 1 ? "story" : "stories"}`}
                    onClick={() => setCountry(sel ? null : m.country)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCountry(sel ? null : m.country); } }}>
                    <title>{`${m.country} — ${m.count} ${m.count === 1 ? "story" : "stories"}`}</title>
                    <circle className="asm-pulse" cx={x} cy={y} r={r} fill="none" stroke={col} strokeWidth="1.5" />
                    <circle className="core" cx={x} cy={y} r={r} fill={col} fillOpacity={sel ? 0.95 : 0.72}
                      stroke={sel ? "var(--ink)" : "var(--bg)"} strokeWidth={sel ? 2.5 : 1.5} />
                    {m.count > 1 && (
                      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700"
                        fill="var(--accent-ink)" style={{ fontFamily: "var(--ui)", pointerEvents: "none" }}>
                        {m.count}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="asm-legend">
              {CATEGORIES.map((c) => (
                <span key={c.id}><i className="asm-dot" style={{ background: t.cat[c.id] }} />{c.short}</span>
              ))}
            </div>
            {country && (
              <div className="asm-countryflag">
                Filtering: <strong>{country}</strong>
                <button onClick={() => setCountry(null)} aria-label={`Clear ${country} filter`}>× clear</button>
              </div>
            )}
          </section>

          {/* ------------ STORIES ------------ */}
          <section aria-label="Stories">
            {filtered.length === 0 && (
              <div className="asm-empty">
                No stories match this view. Clear the country filter or choose another theme — or fetch live news to fill it.
              </div>
            )}

            {lead && (
              <article className="asm-lead">
                <p className="asm-kicker" style={{ color: t.cat[lead.category] }}>
                  {catLabel(lead.category)} · {lead.country}
                  {lead.militarySubcategory && <span className="asm-subtag">{lead.militarySubcategory}</span>}
                  {lead.sample && <span className="asm-sample">SAMPLE</span>}
                </p>
                <h3>{lead.headline}</h3>
                <p>{lead.summary}</p>
                <div className="asm-meta">{lead.source} · {fmtDate(lead.date)}</div>
              </article>
            )}

            {rest.map((s) => (
              <article key={s.id} className="asm-item">
                <p className="asm-kicker" style={{ color: t.cat[s.category] }}>
                  {catLabel(s.category)} · {s.country}
                  {s.militarySubcategory && <span className="asm-subtag">{s.militarySubcategory}</span>}
                  {s.sample && <span className="asm-sample">SAMPLE</span>}
                </p>
                <h4>{s.headline}</h4>
                <p>{s.summary}</p>
                <div className="asm-meta">{s.source} · {fmtDate(s.date)}</div>
              </article>
            ))}

            <div className="asm-footer">
              Stories labelled SAMPLE are illustrative placeholders, not real reporting. Live stories are retrieved
              by web search and summarised automatically — verify with the named source before relying on them.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
