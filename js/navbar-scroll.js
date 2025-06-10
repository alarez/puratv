document.addEventListener("DOMContentLoaded", function () {
    // --- Preguntas frecuentes (acordeón manual) ---
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(function (question) {
        question.addEventListener('click', function () {
            const answer = this.nextElementSibling;
            const isVisible = answer.style.display === 'block';
            answer.style.display = isVisible ? 'none' : 'block';
        });
    });

    // --- Menú responsive Bootstrap ---
    const toggler = document.querySelector(".navbar-toggler");
    const menu = document.getElementById("navbarNavDropdown");

    // Al hacer clic en un enlace, cierra el menú (si está abierto)
    document.querySelectorAll("#navbarNavDropdown .nav-link").forEach(link => {
        link.addEventListener("click", () => {
            const bsCollapse = bootstrap.Collapse.getInstance(menu);
            if (bsCollapse && menu.classList.contains('show')) {
                bsCollapse.hide();
            }
        });
    });

    // Cerrar el menú al hacer clic fuera
    document.addEventListener("click", function (event) {
        const isClickInsideMenu = menu.contains(event.target);
        const isClickOnToggler = toggler.contains(event.target);
        const isOpen = menu.classList.contains('show');

        if (!isClickInsideMenu && !isClickOnToggler && isOpen) {
            const bsCollapse = bootstrap.Collapse.getInstance(menu);
            if (bsCollapse) {
                bsCollapse.hide();
            }
        }
    });
});
