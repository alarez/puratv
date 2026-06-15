/* ===========================================================
   calendar.js — Motor de calendario deportivo PuraTV (config-driven)
   Lee window.CAL_CONFIG y pinta el calendario con datos del API público de ESPN.

   window.CAL_CONFIG = {
     api: "https://site.api.espn.com/apis/site/v2/sports/<deporte>/<liga>/scoreboard",
     channels: { mode: "api" }                       // canales del EPG (auto)
              | { mode: "fixed", list: ["...", ...] } // lista fija (ej. DAZN)
     rounds: { "group-stage": "Fase de grupos", ... } // opcional (copas)
     refreshMs: 60000                                  // opcional
   };
   =========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const CFG = window.CAL_CONFIG || {};
  const ESPN_API = CFG.api;
  if (!ESPN_API) { console.error("CAL_CONFIG.api no definido"); return; }

  const gamesContainer = document.getElementById("games");
  const prevWeekBtn = document.getElementById("prevWeek");
  const currentWeekBtn = document.getElementById("currentWeek");
  const nextWeekBtn = document.getElementById("nextWeek");

  const TZ = "America/Costa_Rica";
  const MAX_HOURS = 6;
  const REFRESH_MS = CFG.refreshMs || 60000;
  const ROUND_MAP = CFG.rounds || {};
  const CHANNELS = CFG.channels || { mode: "api" };

  // Normaliza códigos del EPG a nombres legibles
  const CHANNEL_MAP = {
    "Tele": "Telemundo", "Telemundo": "Telemundo", "Universo": "Universo",
    "FOX": "FOX", "FS1": "FS1", "FS2": "FS2", "TUDN": "TUDN", "Peacock": "Peacock",
    "ESPN+": "ESPN+", "ESPN2": "ESPN2", "ABC": "ABC", "TNT": "TNT", "CBS": "CBS", "NBC": "NBC"
  };

  const TEAM_FILTER = CFG.teamFilter === true;
  let currentOffset = 0;
  let refreshTimer = null;
  let allWeekGames = [];
  let selectedTeam = "";
  let teamSelectEl = null;

  function crDateKey(d) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }

  function getURLWeekOffset() {
    const w = parseInt(new URLSearchParams(window.location.search).get("week"));
    return isNaN(w) ? 0 : w;
  }

  function updateURLWeek(offset) {
    const url = new URL(window.location.href);
    url.searchParams.set("week", offset);
    window.history.replaceState({}, "", url);
  }

  function getWeekDates(offset = 0) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      label: `${monday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} al ${sunday.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
      days
    };
  }

  function setupControls() {
    prevWeekBtn && prevWeekBtn.addEventListener("click", () => { currentOffset--; updateURLWeek(currentOffset); loadWeek(); });
    nextWeekBtn && nextWeekBtn.addEventListener("click", () => { currentOffset++; updateURLWeek(currentOffset); loadWeek(); });
    currentWeekBtn && currentWeekBtn.addEventListener("click", () => { currentOffset = 0; updateURLWeek(0); loadWeek(); });
  }

  function scheduleAutoRefresh(hasLive) {
    clearTimeout(refreshTimer);
    const note = document.getElementById("liveNote");
    if (hasLive && currentOffset === 0) {
      if (note) { note.textContent = "● En vivo — los marcadores se actualizan solos cada minuto"; note.hidden = false; }
      refreshTimer = setTimeout(() => loadWeek(true), REFRESH_MS);
    } else if (note) {
      note.hidden = true;
    }
  }

  async function loadWeek(force = false) {
    const { start, label, days } = getWeekDates(currentOffset);
    const wl = document.getElementById("weekLabel");
    if (wl) wl.textContent = label;
    gamesContainer.setAttribute("aria-busy", "true");

    const cacheKey = `cal-${ESPN_API}-${start}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    const ttlHours = currentOffset === 0 ? (2 / 60) : MAX_HOURS;
    if (!force && cached && (Date.now() - new Date(cached.updated)) / (1000 * 60 * 60) < ttlHours) {
      renderGames(cached.events);
      return;
    }

    const all = [];
    for (const d of days) {
      const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
      try {
        const res = await fetch(`${ESPN_API}?dates=${dateStr}`);
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        all.push(...(json.events || []));
      } catch (err) {
        console.warn("⚠️ Error al obtener ESPN:", dateStr, err);
      }
    }
    const unique = Array.from(new Map(all.map((g) => [g.id, g])).values());
    try { localStorage.setItem(cacheKey, JSON.stringify({ updated: new Date().toISOString(), events: unique })); } catch (e) {}
    renderGames(unique);
  }

  function channelsHtml(comp) {
    let list = [];
    if (CHANNELS.mode === "fixed") {
      list = CHANNELS.list || [];
    } else {
      const names = (comp?.broadcasts || []).flatMap((b) => b.names || []);
      list = [...new Set(names.map((n) => CHANNEL_MAP[n] || n))];
    }
    if (!list.length) return "";
    const chips = list.map((ch) => `<span class="ch-pill">${ch}</span>`).join("");
    return `<div class="match-channels"><span class="match-channels__label">Véalo en PuraTV</span>${chips}</div>`;
  }

  function ensureTeamFilterUI() {
    if (teamSelectEl) return teamSelectEl;
    const wrap = document.createElement("div");
    wrap.className = "team-filter";
    const sel = document.createElement("select");
    sel.id = "teamFilterSelect";
    sel.className = "team-filter__select";
    sel.setAttribute("aria-label", "Filtrar por equipo");
    sel.addEventListener("change", () => { selectedTeam = sel.value; paintGames(); });
    wrap.appendChild(sel);
    gamesContainer.parentNode.insertBefore(wrap, gamesContainer);
    teamSelectEl = sel;
    return sel;
  }

  function populateTeamFilter(games) {
    const sel = ensureTeamFilterUI();
    const names = new Set();
    games.forEach((g) => {
      (g.competitions?.[0]?.competitors || []).forEach((c) => {
        const n = c.team?.displayName;
        if (n) names.add(n);
      });
    });
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "es"));
    if (selectedTeam && !sorted.includes(selectedTeam)) selectedTeam = "";
    sel.innerHTML = `<option value="">Todos los equipos</option>` +
      sorted.map((n) => `<option value="${n}"${n === selectedTeam ? " selected" : ""}>${n}</option>`).join("");
  }

  function renderGames(games) {
    allWeekGames = games || [];
    if (TEAM_FILTER) populateTeamFilter(allWeekGames);
    paintGames();
  }

  function paintGames() {
    gamesContainer.setAttribute("aria-busy", "false");
    const hasLive = allWeekGames.some((g) => (g.competitions?.[0]?.status?.type?.state || g.status?.type?.state) === "in");

    if (!allWeekGames.length) {
      gamesContainer.innerHTML =
        "<div class='col-12 text-center py-5'><i class='far fa-calendar-times fa-2x text-warning mb-3'></i><p>No hay partidos esta semana.</p></div>";
      scheduleAutoRefresh(false);
      return;
    }

    let games = allWeekGames;
    if (TEAM_FILTER && selectedTeam) {
      games = allWeekGames.filter((g) => (g.competitions?.[0]?.competitors || []).some((c) => c.team?.displayName === selectedTeam));
    }

    if (!games.length) {
      gamesContainer.innerHTML = "<div class='col-12 text-center py-5'><p>El equipo seleccionado no juega esta semana.</p></div>";
      scheduleAutoRefresh(hasLive);
      return;
    }

    const gamesByDay = {};
    games.forEach((g) => {
      const k = crDateKey(new Date(g.date));
      (gamesByDay[k] = gamesByDay[k] || []).push(g);
    });

    let html = "";
    Object.keys(gamesByDay).sort().forEach((dateKey) => {
      const dateObj = new Date(dateKey + "T12:00:00");
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
      html += `<div class="col-12"><h3 class="day-heading">${day.charAt(0).toUpperCase() + day.slice(1)}</h3></div>`;

      html += gamesByDay[dateKey]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((g) => {
          const comp = g.competitions?.[0];
          const homeC = comp?.competitors?.find((c) => c.homeAway === "home");
          const awayC = comp?.competitors?.find((c) => c.homeAway === "away");
          const home = homeC?.team?.shortDisplayName || homeC?.team?.displayName || "Local";
          const away = awayC?.team?.shortDisplayName || awayC?.team?.displayName || "Visitante";
          const homeLogo = homeC?.team?.logo || "";
          const awayLogo = awayC?.team?.logo || "";
          const time = new Date(g.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
          const round = ROUND_MAP[g.season?.slug] || "";

          const state = comp?.status?.type?.state || g.status?.type?.state || "pre";
          const live = state === "in";
          const finished = state === "post";
          const hScore = homeC?.score ?? "";
          const aScore = awayC?.score ?? "";
          const clock = comp?.status?.displayClock || "";

          const center = (live || finished)
            ? `<div class="match-score">${hScore}<span>-</span>${aScore}</div>`
            : `<div class="match-time">${time}</div>`;
          const status = live
            ? `<span class="status-pill status-live">● En vivo${clock && clock !== "0'" ? " " + clock : ""}</span>`
            : finished ? `<span class="status-pill status-final">Finalizado</span>` : "";

          return `
            <div class="col-lg-6 col-12">
              <div class="match-card${live ? " is-live" : ""}">
                <div class="match-top">
                  ${round ? `<span class="match-round">${round}</span>` : ""}
                  ${status}
                </div>
                <div class="match-row">
                  <div class="match-team">
                    ${homeLogo ? `<img src="${homeLogo}" alt="${home}" loading="lazy">` : ""}
                    <span>${home}</span>
                  </div>
                  ${center}
                  <div class="match-team match-team--away">
                    <span>${away}</span>
                    ${awayLogo ? `<img src="${awayLogo}" alt="${away}" loading="lazy">` : ""}
                  </div>
                </div>
                ${channelsHtml(comp)}
              </div>
            </div>`;
        })
        .join("");
    });

    gamesContainer.innerHTML = html;
    scheduleAutoRefresh(hasLive);
  }

  currentOffset = getURLWeekOffset();
  setupControls();
  loadWeek();
});
