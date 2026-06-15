/* mundial-standings.js — Tabla de posiciones por grupo del Mundial FIFA 2026 (API de ESPN) */
document.addEventListener("DOMContentLoaded", async () => {
  const wrap = document.getElementById("standings");
  if (!wrap) return;

  const API = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
  const CACHE_KEY = "mundial-standings";
  const TTL_MIN = 15;

  function statNum(entry, name) {
    const s = (entry.stats || []).find((x) => x.name === name);
    return s ? (s.value ?? 0) : 0;
  }
  function statDisp(entry, name) {
    const s = (entry.stats || []).find((x) => x.name === name);
    return s ? (s.displayValue ?? String(s.value ?? "-")) : "-";
  }
  function teamFlag(team) {
    return (team && (team.logo || team.logos?.[0]?.href || team.flag?.href)) || "";
  }

  function render(groups) {
    if (!groups || !groups.length) {
      wrap.innerHTML = "<p class='text-center' style='color:#9a9a98'>La tabla de posiciones estará disponible cuando arranque el Mundial.</p>";
      return;
    }
    let html = "";
    groups.forEach((grp) => {
      const name = (grp.name || "").replace(/^Group/i, "Grupo");
      const entries = (grp.standings?.entries || []).slice().sort((a, b) => {
        const ra = statNum(a, "rank"), rb = statNum(b, "rank");
        if (ra && rb && ra !== rb) return ra - rb;
        return statNum(b, "points") - statNum(a, "points") || statNum(b, "pointDifferential") - statNum(a, "pointDifferential");
      });

      const rows = entries.map((e, i) => {
        const team = e.team || {};
        const flag = teamFlag(team);
        const qualify = (i + 1) <= 2 ? " qualify" : "";
        return `<tr class="${qualify.trim()}">
          <td class="st-pos">${i + 1}</td>
          <td class="st-team">${flag ? `<img class="st-flag" src="${flag}" alt="${team.displayName || ""}" loading="lazy">` : ""}<span>${team.shortDisplayName || team.displayName || ""}</span></td>
          <td>${statDisp(e, "gamesPlayed")}</td>
          <td>${statDisp(e, "wins")}</td>
          <td>${statDisp(e, "ties")}</td>
          <td>${statDisp(e, "losses")}</td>
          <td>${statDisp(e, "pointsFor")}</td>
          <td>${statDisp(e, "pointsAgainst")}</td>
          <td>${statDisp(e, "pointDifferential")}</td>
          <td class="st-pts">${statDisp(e, "points")}</td>
        </tr>`;
      }).join("");

      html += `<div class="standings-group">
        <h3 class="standings-group__title">${name}</h3>
        <div class="standings-scroll">
          <table class="standings-table">
            <thead><tr><th>#</th><th class="st-team">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    });
    wrap.innerHTML = html;
  }

  async function load() {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && (Date.now() - new Date(cached.updated)) / 60000 < TTL_MIN) {
      render(cached.groups);
      return;
    }
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const groups = json.children || [];
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ updated: new Date().toISOString(), groups })); } catch (e) {}
      render(groups);
    } catch (err) {
      console.warn("⚠️ Error al cargar posiciones del Mundial:", err);
      if (cached) render(cached.groups);
      else wrap.innerHTML = "<p class='text-center' style='color:#9a9a98'>No se pudo cargar la tabla de posiciones.</p>";
    }
  }

  load();
});
