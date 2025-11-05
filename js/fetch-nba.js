/**
 * fetch-nba.js
 * Carga dinámica de datos NBA desde ESPN Scoreboard API por semana
 * con divisores diarios, meta tags SEO/OG/Twitter y schema dinámico.
 * Autor: Alain / PuraTVDigital
 */

const dataDir = "./data";
const MAX_HOURS = 6;
const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

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
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Error al cargar ${file}: ${res.statusText}`);
    return await res.json();
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
        label: `del ${monday.toLocaleDateString("es-CR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })} al ${sunday.toLocaleDateString("es-CR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })}`,
        days,
    };
}

// 🚀 Inicialización
async function init() {
    currentOffset = getURLWeekOffset();
    TEAM_LOGOS = await loadJSON("nba-teams.json");
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
    const { start, end, label, days } = getWeekDates(currentOffset);

    // 🏀 H1 optimizado dinámico
    const h1 = document.getElementById("pageTitle");
    if (h1) {
        h1.innerHTML = `Calendario NBA – Partidos y Transmisiones en Vivo ${label} | <span class="text-warning">PuraTV Digital</span>`;
    }

    updateMetaTags(label, start, end);

    const cacheKey = `espn-week-${start}`;
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");

    if (cached && (Date.now() - new Date(cached.updated)) / (1000 * 60 * 60) < MAX_HOURS) {
        updateSchemaMarkup(start, end, cached.events);
        renderGames(cached.events);
        return;
    }

    console.log(`🔄 Consultando ESPN (${days.length} días)...`);
    const allGames = [];

    for (const d of days) {
        const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
        const url = `${ESPN_API}?dates=${dateStr}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);
            const json = await res.json();
            const events = json.events || [];

            const normalized = events.map((ev) => {
                const comp = ev.competitions?.[0] || {};
                const broadcasts = comp.broadcasts || [];
                return { ...ev, broadcasts };
            });

            allGames.push(...normalized);
        } catch (err) {
            console.warn("⚠️ Error al obtener ESPN día:", dateStr, err);
        }
    }

    localStorage.setItem(
        cacheKey,
        JSON.stringify({
            updated: new Date().toISOString(),
            events: allGames,
        })
    );

    updateSchemaMarkup(start, end, allGames);
    renderGames(allGames);
}

// 🧩 SEO dinámico: título, descripción, OpenGraph y Twitter
function updateMetaTags(label, start, end) {
    const baseTitle = `Calendario NBA ${label} | PuraTV Digital`;
    const baseDescription = `Consulta el calendario de partidos NBA ${label}. Transmisiones en vivo, resultados y canales disponibles en PuraTV Digital. Disfrutá más de 25,000 canales y 40,000 películas y series desde cualquier dispositivo.`;
    const pageUrl = window.location.href.split("#")[0];
    const imageUrl = "https://www.puratv.digital/images/og-nba.jpg"; // Reemplazá con tu imagen OG real

    document.title = baseTitle;
    setMeta("description", baseDescription);

    // Open Graph
    setMeta("og:title", baseTitle);
    setMeta("og:description", baseDescription);
    setMeta("og:type", "website");
    setMeta("og:url", pageUrl);
    setMeta("og:image", imageUrl);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", baseTitle);
    setMeta("twitter:description", baseDescription);
    setMeta("twitter:image", imageUrl);

    console.log("🔖 SEO meta actualizado:", baseTitle);
}

// 🔧 Helper para crear/actualizar meta tags
function setMeta(name, content) {
    let meta =
        document.querySelector(`meta[name='${name}']`) ||
        document.querySelector(`meta[property='${name}']`);
    if (!meta) {
        meta = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) {
            meta.setAttribute("property", name);
        } else {
            meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
}

// 🧠 Generar Schema dinámico con subeventos
function updateSchemaMarkup(start, end, games = []) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": `Calendario NBA – Semana del ${start} al ${end}`,
        "sport": "Basketball",
        "description": `Partidos de la NBA entre el ${start} y el ${end}, con horarios, equipos y canales de transmisión disponibles en PuraTV Digital.`,
        "startDate": start,
        "endDate": end,
        "location": {
            "@type": "Place",
            "name": "PuraTV Digital",
            "address": { "@type": "PostalAddress", "addressCountry": "CR" },
        },
        "organizer": {
            "@type": "Organization",
            "name": "PuraTV Digital",
            "url": "https://www.puratv.digital",
        },
        "subEvent": games.map((g) => {
            const comp = g.competitions?.[0];
            const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName;
            const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName;
            const date = g.date;
            const channels = g.broadcasts?.flatMap((b) => b.names) || [];
            return {
                "@type": "SportsEvent",
                "name": `${away} vs ${home}`,
                "startDate": date,
                "performer": [
                    { "@type": "SportsTeam", "name": home },
                    { "@type": "SportsTeam", "name": away },
                ],
                "broadcastOfEvent": channels.map((ch) => ({
                    "@type": "BroadcastService",
                    "name": ch,
                })),
            };
        }),
    };

    document.querySelectorAll('script[type="application/ld+json"].dynamic-schema').forEach((el) => el.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.classList.add("dynamic-schema");
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);

    console.log("📘 Schema actualizado dinámicamente:", start, "→", end);
}

// 🏀 Renderizado visual (con divisores diarios)
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
            const formattedDay = dateObj.toLocaleDateString("es-CR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            });

            html += `
        <div class="col-12 mt-4 mb-2">
          <h3 class="border-bottom border-warning pb-1 text-uppercase">${formattedDay}</h3>
        </div>
      `;

            html += gamesByDay[dateKey]
                .map((g) => {
                    const comp = g.competitions?.[0];
                    const home = comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName || "Local";
                    const away = comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName || "Visitante";
                    const date = new Date(g.date);
                    const formattedTime = date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });

                    const findLogo = (teamName) => {
                        const key = Object.keys(TEAM_LOGOS).find((k) =>
                            teamName.toLowerCase().includes(k.toLowerCase())
                        );
                        return TEAM_LOGOS[key] || "";
                    };

                    const homeLogo = findLogo(home);
                    const awayLogo = findLogo(away);

                    const channels = g.broadcasts?.flatMap((b) => b.names) || [];
                    const networkText = channels.length
                        ? channels.map((ch) => `<span class="badge bg-warning text-dark me-1">${ch}</span>`).join("")
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
                    <div><i class="far fa-clock me-1 text-warning mb-3"></i> ${formattedTime}</div>
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
