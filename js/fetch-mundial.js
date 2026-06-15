// fetch-mundial.js — Calendario del Mundial FIFA 2026 (API pública de ESPN)
document.addEventListener("DOMContentLoaded", async () => {
  const gamesContainer = document.getElementById("games");
  const prevWeekBtn = document.getElementById("prevWeek");
  const currentWeekBtn = document.getElementById("currentWeek");
  const nextWeekBtn = document.getElementById("nextWeek");

  const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
  const MAX_HOURS = 6;
  const TZ = "America/Costa_Rica"; // horarios siempre en hora de Costa Rica
  const REFRESH_MS = 60000; // auto-refresh cada 60 s cuando hay partidos en vivo
  let currentOffset = 0; // semanas (+1 o -1)
  let refreshTimer = null;

  // Fecha YYYY-MM-DD del partido según la hora de Costa Rica (evita que un partido nocturno se corra de día)
  function crDateKey(d) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(d);
  }

  // 🎯 Canales principales del Mundial en PuraTV (mostrados en cada partido).
  //    La lista completa con variantes HD/SD/RAW está en la sección de mundial.html.
  const PURATV_CHANNELS = ["DAZN Mundial", "DAZN Mundial 2", "DAZN Mundial 3", "DAZN Mundial 4"];

  // 🏆 Nombres de ronda en español
  const ROUND_MAP = {
    "group-stage": "Fase de grupos",
    "round-of-32": "16avos de final",
    "round-of-16": "Octavos de final",
    "quarterfinals": "Cuartos de final",
    "semifinals": "Semifinal",
    "3rd-place": "Tercer lugar",
    "third-place": "Tercer lugar",
    "final": "Final"
  };

  function getURLWeekOffset() {
    const weekParam = parseInt(new URLSearchParams(window.location.search).get("week"));
    return isNaN(weekParam) ? 0 : weekParam;
  }

  function updateURLWeek(offset) {
    const url = new URL(window.location.href);
    url.searchParams.set("week", offset);
    window.history.replaceState({}, "", url);
  }

  // 📅 Lunes a domingo de la semana indicada
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

  function init() {
    currentOffset = getURLWeekOffset();
    setupControls();
    loadWeek();
  }

  function setupControls() {
    prevWeekBtn.addEventListener("click", () => { currentOffset--; updateURLWeek(currentOffset); loadWeek(); });
    nextWeekBtn.addEventListener("click", () => { currentOffset++; updateURLWeek(currentOffset); loadWeek(); });
    currentWeekBtn.addEventListener("click", () => { currentOffset = 0; updateURLWeek(0); loadWeek(); });
  }

  // ⏱️ Reprograma el auto-refresh solo si hay partidos en vivo en la semana actual
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
    const titleEl = document.getElementById("weekLabel");
    if (titleEl) titleEl.textContent = label;

    gamesContainer.setAttribute("aria-busy", "true");

    const cacheKey = `mundial-week-${start}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    // La semana actual (donde hay partidos en vivo) se refresca cada ~2 min; las demás cachean 6 h.
    const ttlHours = currentOffset === 0 ? (2 / 60) : MAX_HOURS;
    if (!force && cached && (Date.now() - new Date(cached.updated)) / (1000 * 60 * 60) < ttlHours) {
      renderGames(cached.events);
      return;
    }

    const allGames = [];
    for (const d of days) {
      const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
      try {
        const res = await fetch(`${ESPN_API}?dates=${dateStr}`);
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        allGames.push(...(json.events || []));
      } catch (err) {
        console.warn("⚠️ Error al obtener ESPN (Mundial):", dateStr, err);
      }
    }

    const unique = Array.from(new Map(allGames.map((g) => [g.id, g])).values());
    localStorage.setItem(cacheKey, JSON.stringify({ updated: new Date().toISOString(), events: unique }));
    renderGames(unique);
  }

  function renderGames(games) {
    gamesContainer.setAttribute("aria-busy", "false");

    if (!games || !games.length) {
      gamesContainer.innerHTML =
        "<div class='col-12 text-center py-5'><i class='far fa-calendar-times fa-2x text-warning mb-3'></i><p class='text-light-50'>No hay partidos del Mundial esta semana.</p></div>";
      scheduleAutoRefresh(false);
      return;
    }

    const hasLive = games.some((g) => (g.competitions?.[0]?.status?.type?.state || g.status?.type?.state) === "in");

    const gamesByDay = {};
    games.forEach((g) => {
      const dateKey = crDateKey(new Date(g.date));
      (gamesByDay[dateKey] = gamesByDay[dateKey] || []).push(g);
    });

    const chips = PURATV_CHANNELS
      .map((ch) => `<span class="ch-pill">${ch}</span>`)
      .join("");

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

          // Estado y marcador
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
            ? `<span class="status-pill status-live">● En vivo${clock ? " " + clock : ""}</span>`
            : finished
              ? `<span class="status-pill status-final">Finalizado</span>`
              : "";

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
                <div class="match-channels">
                  <span class="match-channels__label">Véalo en PuraTV</span>
                  ${chips}
                </div>
              </div>
            </div>`;
        })
        .join("");
    });

    gamesContainer.innerHTML = html;
    scheduleAutoRefresh(hasLive);
  }

  init();
});
