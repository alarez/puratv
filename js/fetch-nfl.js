/**
 * fetch-nfl.js
 * Carga dinámica de datos NFL desde ESPN Scoreboard API por semana con divisores diarios
 * Autor: Alain / PuraTVDigital
 */

const dataDir = "./data";
const MAX_HOURS = 6;
const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

let TEAM_LOGOS = {};
let currentOffset = 0; // 0 = semana actual

// ✅ Obtener parámetro de URL (?week=)
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

// ✅ Cargar JSON externo
async function loadJSON(file) {
    const path = `${dataDir}/${file}?v=${Date.now()}`;
    console.log("📂 Cargando:", path);

    const res = await fetch(path);
    if (!res.ok) throw new Error(`Error al cargar ${file}: ${res.statusText}`);
    const json = await res.json();
    console.log(`✅ ${file} cargado (${Object.keys(json).length} equipos)`);
    return json;
}

// 📅 Calcular inicio y fin de la semana
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
        label: `Del ${monday.toLocaleDateString("es-CR")} al ${sunday.toLocaleDateString("es-CR")}`,
        days,
    };
}

// 🚀 Inicialización
async function init() {
    currentOffset = getURLWeekOffset();
    TEAM_LOGOS = await loadJSON("nfl-teams.json");
    setupControls();
    loadWeek();
}

// 🎛️ Controles
function setupControls() {
    document.getElementById("prevWeek").addEventListener("click", () => {
        currentOffset--;
        updateURLWeek(currentOffset);
        loadWeek();
    });

    document.getElementById("nextWeek").addEventListener("click", () => {
        currentOffset++;
        updateURLWeek(currentOffset);
        loadWeek();
    });

    document.getElementById("currentWeek").addEventListener("click", () => {
        currentOffset = 0;
        updateURLWeek(0);
        loadWeek();
    });
}

// 🔁 Cargar datos de la semana
async function loadWeek() {
    const { start, label, days } = getWeekDates(currentOffset);
    const header = document.querySelector("h1, #pageTitle");
    if (header) header.textContent = `🏈 NFL - ${label}`;

    const cacheKey = `espn-nfl-week-${start}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

    if (cached && (Date.now() - new Date(cached.updated)) / (1000 * 60 * 60) < MAX_HOURS) {
        console.log(`✅ Cache: ${cached.events.length} eventos para ${label}`);
        renderGames(cached.events);
        return;
    }

    console.log(`🔄 Consultando ESPN NFL (${days.length} días)...`);
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

            const normalized = events.map(ev => {
                const comp = ev.competitions?.[0] || {};
                const broadcasts = comp.broadcasts || [];
                return { ...ev, broadcasts };
            });

            allGames.push(...normalized);
        } catch (err) {
            console.warn("⚠️ Error ESPN día:", dateStr, err);
        }
    }

    console.log(`✅ ESPN NFL: ${allGames.length} eventos combinados para la semana`);
    localStorage.setItem(
        cacheKey,
        JSON.stringify({
            updated: new Date().toISOString(),
            events: allGames,
        })
    );

    renderGames(allGames);
}

// 🏈 Renderizado visual
function renderGames(games) {
    const container = document.getElementById("games");
    if (!games.length) {
        container.innerHTML = `
      <div class="col-12 text-center text-muted">
        <p>No hay partidos programados para esta semana.</p>
      </div>`;
        return;
    }

    const gamesByDay = {};
    games.forEach(g => {
        const dateKey = new Date(g.date).toISOString().split("T")[0];
        if (!gamesByDay[dateKey]) gamesByDay[dateKey] = [];
        gamesByDay[dateKey].push(g);
    });

    let html = "";
    Object.keys(gamesByDay)
        .sort()
        .forEach(dateKey => {
            const dateObj = new Date(dateKey);
            const formattedDay = dateObj.toLocaleDateString("es-CR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            });

            html += `
        <div class="col-12 mt-4 mb-2">
          <h3 class="border-bottom border-warning pb-1 text-uppercase">${formattedDay}</h3>
        </div>`;

            html += gamesByDay[dateKey]
                .map(g => {
                    const comp = g.competitions?.[0];
                    const home = comp?.competitors?.find(c => c.homeAway === "home")?.team?.displayName || "Local";
                    const away = comp?.competitors?.find(c => c.homeAway === "away")?.team?.displayName || "Visitante";
                    const date = new Date(g.date);
                    const formattedTime = date.toLocaleTimeString("es-CR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    const findLogo = teamName => {
                        const key = Object.keys(TEAM_LOGOS).find(k =>
                            teamName.toLowerCase().includes(k.toLowerCase())
                        );
                        return TEAM_LOGOS[key] || "";
                    };

                    const homeLogo = findLogo(home);
                    const awayLogo = findLogo(away);

                    const channels = g.broadcasts?.flatMap(b => b.names) || [];
                    const networkText = channels.length
                        ? channels.map(ch => `<span class="badge bg-warning text-dark me-1">${ch}</span>`).join("")
                        : `<span class="text-muted">Desconocido</span>`;

                    return `
            <div class="game col-12 col-lg-6 mb-2">
              <div class="card bg-secondary text-light border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <div class="d-flex justify-content-between align-items-center flex-wrap">
                    <div class="team d-flex align-items-center gap-2 justify-content-center mb-2">
                      ${homeLogo ? `<img src="${homeLogo}" alt="${home}" class="team-logo rounded">` : ""}
                      <span class="fw-semibold">${home}</span>
                    </div>
                    <span class="vs fw-bold text-warning">VS</span>
                    <div class="team d-flex align-items-center gap-2 justify-content-center mb-2">
                      ${awayLogo ? `<img src="${awayLogo}" alt="${away}" class="team-logo rounded">` : ""}
                      <span class="fw-semibold">${away}</span>
                    </div>
                  </div>
                  <hr class="border-warning opacity-50">
                  <div class="info">
                    <div><i class="far fa-clock me-1 text-warning"></i> ${formattedTime}</div>
                    <div class="network"><i class="fas fa-broadcast-tower me-1 text-warning"></i> ${networkText}</div>
                  </div>
                </div>
              </div>
            </div>`;
                })
                .join("");
        });

    container.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", init);
