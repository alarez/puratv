// fetch-laliga.js
document.addEventListener("DOMContentLoaded", async () => {
  const gamesContainer = document.getElementById("games");
  const prevWeekBtn = document.getElementById("prevWeek");
  const currentWeekBtn = document.getElementById("currentWeek");
  const nextWeekBtn = document.getElementById("nextWeek");
  const pageTitle = document.getElementById("pageTitle");

  const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard";
  const MAX_HOURS = 6;
  let currentOffset = 0; // semanas (+1 o -1)
  let TEAM_LOGOS = {};

  // ✅ Obtener week param
  function getURLWeekOffset() {
    const params = new URLSearchParams(window.location.search);
    const weekParam = parseInt(params.get("week"));
    return isNaN(weekParam) ? 0 : weekParam;
  }

  // ✅ Actualizar la URL sin recargar
  function updateURLWeek(offset) {
    const url = new URL(window.location.href);
    url.searchParams.set("week", offset);
    window.history.replaceState({}, "", url);
  }

  // 📅 Calcular fechas de semana
  function getWeekDates(offset = 0) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }

    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
      label: `Del ${monday.toLocaleDateString("es-ES")} al ${sunday.toLocaleDateString("es-ES")}`,
      days
    };
  }

  // 🚀 Inicialización
  async function init() {
    currentOffset = getURLWeekOffset();
    try {
      const logosRes = await fetch("./data/laliga-teams.json");
      TEAM_LOGOS = logosRes.ok ? await logosRes.json() : {};
    } catch {
      TEAM_LOGOS = {};
    }
    setupControls();
    loadWeek();
  }

  // 🎛️ Controles
  function setupControls() {
    prevWeekBtn.addEventListener("click", () => {
      currentOffset--;
      updateURLWeek(currentOffset);
      loadWeek();
    });

    nextWeekBtn.addEventListener("click", () => {
      currentOffset++;
      updateURLWeek(currentOffset);
      loadWeek();
    });

    currentWeekBtn.addEventListener("click", () => {
      currentOffset = 0;
      updateURLWeek(0);
      loadWeek();
    });
  }

  // 🔁 Cargar datos de ESPN
  async function loadWeek() {
    const { start, label, days } = getWeekDates(currentOffset);
    document.querySelector("h2").textContent = `⚽ LaLiga - ${label}`;

    const cacheKey = `laliga-week-${start}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

    if (cached && (Date.now() - new Date(cached.updated)) / (1000 * 60 * 60) < MAX_HOURS) {
      console.log(`✅ Cache: ${cached.events.length} partidos ${label}`);
      renderGames(cached.events);
      return;
    }

    const allGames = [];
    for (const d of days) {
      const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
      const url = `${ESPN_API}?dates=${dateStr}`;
      console.log(`📅 Día: ${dateStr}`);

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        const events = json.events || [];
        allGames.push(...events);
      } catch (err) {
        console.warn("⚠️ Error al obtener ESPN:", dateStr, err);
      }
    }

    console.log(`✅ ESPN: ${allGames.length} eventos combinados`);
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ updated: new Date().toISOString(), events: allGames })
    );

    renderGames(allGames);
  }

  // 🏟️ Renderizar partidos
  function renderGames(games) {
    if (!games.length) {
      gamesContainer.innerHTML =
        "<div class='col-12 text-center text-muted'><p>No hay partidos esta semana.</p></div>";
      return;
    }

    // Agrupar por día
    const gamesByDay = {};
    games.forEach((g) => {
      const dateKey = new Date(g.date).toISOString().split("T")[0];
      if (!gamesByDay[dateKey]) gamesByDay[dateKey] = [];
      gamesByDay[dateKey].push(g);
    });

    let html = "";
    Object.keys(gamesByDay)
      .sort()
      .forEach((dateKey) => {
        const dateObj = new Date(dateKey);
        const formattedDay = dateObj.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        html += `
          <div class="col-12 mt-4">
            <h3 class="text-warning border-bottom pb-2 mb-3">${formattedDay}</h3>
          </div>`;

        html += gamesByDay[dateKey]
          .map((g) => {
            const comp = g.competitions?.[0];
            const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName || "Local";
            const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName || "Visitante";
            const date = new Date(g.date);
            const formattedTime = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

            const findLogo = (teamName) => {
              const key = Object.keys(TEAM_LOGOS).find((k) =>
                teamName.toLowerCase().includes(k.toLowerCase())
              );
              return TEAM_LOGOS[key] || "";
            };

            const homeLogo = findLogo(home);
            const awayLogo = findLogo(away);

            const broadcasts = comp?.broadcasts || [];
            const channels = broadcasts.flatMap((b) => b.names) || [];
            const networkText = channels.length
              ? channels.map((ch) => `<span class="badge bg-secondary me-1">${ch}</span>`).join("")
              : `<span class="badge bg-dark">Desconocido</span>`;

            return `
              <div class="game col-lg-6 col-12 mb-3">
                <div class="card bg-dark text-light border-warning h-100 shadow-sm">
                  <div class="card-body text-center">
                    <div class="d-flex justify-content-around align-items-center mb-3 flex-wrap">
                      <div class="team text-center">
                        ${homeLogo ? `<img src="${homeLogo}" alt="${home}" class="team-logo mb-2">` : ""}
                        <div>${home}</div>
                      </div>
                      <div class="vs fw-bold text-warning mx-2">VS</div>
                      <div class="team text-center">
                        ${awayLogo ? `<img src="${awayLogo}" alt="${away}" class="team-logo mb-2">` : ""}
                        <div>${away}</div>
                      </div>
                    </div>
                    <div class="info small text-center">
                      <div><i class="far fa-clock me-1 text-warning"></i>${formattedTime}</div>
                      <div class="network mt-2">${networkText}</div>
                    </div>
                  </div>
                </div>
              </div>`;
          })
          .join("");
      });

    gamesContainer.innerHTML = html;
  }

  init();
});
