/*!
 * PuraTV Digital - Selector de dispositivos simultáneos para los planes.
 * Cambia precio, subtítulo, link de WhatsApp y schema.org según 1, 2 o 3 dispositivos.
 * No requiere atributos especiales en cada card: el período se infiere del encabezado.
 */
(function () {
    "use strict";

    var WA_PHONE = "50686694450";

    // Precios en colones por período, según cantidad de dispositivos [1, 2, 3].
    // Editar SOLO esta tabla para cambiar precios en todo el sitio.
    var PLANS = {
        "1m":  { label: "1 mes",   prices: [5000, 8000, 10000] },
        "3m":  { label: "3 meses", prices: [12000, 19000, 25000] },
        "12m": { label: "1 año",   prices: [45000, 72000, 95000] }
    };

    function formatCRC(n) {
        return "₡" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function periodFromHeader(text) {
        var t = (text || "").toUpperCase();
        if (t.indexOf("AÑO") !== -1 || t.indexOf("ANO") !== -1 || t.indexOf("12") !== -1) return "12m";
        if (t.indexOf("3") !== -1) return "3m";
        return "1m";
    }

    function deviceLabel(devices) {
        return devices === 1 ? "1 dispositivo simultáneo" : devices + " dispositivos simultáneos";
    }

    function buildWaLink(periodLabel, devices) {
        var dev = devices === 1 ? "1 dispositivo" : devices + " dispositivos";
        var msg = "Hola, estoy interesado en el Plan de " + periodLabel +
                  " (" + dev + ") de PuraTV Digital. ¿Me pueden dar más información?";
        return "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(msg);
    }

    function applyDevices(section, devices) {
        var idx = devices - 1;
        var cards = section.querySelectorAll(".card");
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var header = card.querySelector(".card-header h4");
            if (!header) continue;
            var period = periodFromHeader(header.textContent);
            var conf = PLANS[period];
            if (!conf) continue;
            var price = conf.prices[idx];
            if (typeof price !== "number") continue;

            var priceEl = card.querySelector(".pricing-card-title");
            if (priceEl) priceEl.textContent = formatCRC(price);

            var sub = card.querySelector(".card-header p");
            if (sub) sub.textContent = deviceLabel(devices);

            var link = card.querySelector(".card-body a.btn");
            if (link) link.setAttribute("href", buildWaLink(conf.label, devices));

            var metaPrice = card.querySelector('meta[itemprop="price"]');
            if (metaPrice) metaPrice.setAttribute("content", String(price));
        }
    }

    function initSection(section) {
        var toggle = section.querySelector(".device-toggle");
        if (!toggle) return;
        var btns = toggle.querySelectorAll(".device-toggle__btn");

        function select(btn) {
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.remove("is-active");
                btns[i].setAttribute("aria-selected", "false");
            }
            btn.classList.add("is-active");
            btn.setAttribute("aria-selected", "true");
            applyDevices(section, parseInt(btn.getAttribute("data-devices"), 10) || 1);
        }

        for (var i = 0; i < btns.length; i++) {
            (function (btn) {
                btn.addEventListener("click", function () { select(btn); });
            })(btns[i]);
        }

        // Estado inicial: 1 dispositivo (normaliza subtítulos/links en todas las páginas).
        applyDevices(section, 1);
    }

    function init() {
        var sections = document.querySelectorAll("#precios");
        for (var i = 0; i < sections.length; i++) initSection(sections[i]);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
