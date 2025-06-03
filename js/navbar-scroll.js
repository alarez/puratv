document.addEventListener("DOMContentLoaded", function () {
    const navbar = document.getElementById("menu");
    let lastScrollTop = 0;

    window.addEventListener("scroll", function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Al estar en el hero: navbar transparente
        if (scrollTop < 100) {
            navbar.classList.remove("visible", "hidden");
            navbar.style.backgroundColor = "transparent";
            return;
        }

        // Scroll hacia abajo: ocultar
        if (scrollTop > lastScrollTop) {
            navbar.classList.remove("visible");
            navbar.classList.add("hidden");
        } else {
            // Scroll hacia arriba: mostrar con fondo blanco
            navbar.classList.remove("hidden");
            navbar.classList.add("visible");
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
});
