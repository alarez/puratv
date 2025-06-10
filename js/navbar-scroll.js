document.addEventListener("DOMContentLoaded", function () {
    // Acordeón de preguntas frecuentes
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(function (question) {
        question.addEventListener('click', function () {
            const answer = this.nextElementSibling;
            const isVisible = answer.style.display === 'block';
            answer.style.display = isVisible ? 'none' : 'block';
        });
    });

    const toggler = document.querySelector(".navbar-toggler");
    const menu = document.getElementById("navbarNavDropdown");

    // Instancia Bootstrap Collapse
    let bsCollapse = new bootstrap.Collapse(menu, {
        toggle: false
    });

    // Cierra el menú al hacer clic en cualquier enlace
    document.querySelectorAll("#navbarNavDropdown .nav-link").forEach(link => {
        link.addEventListener("click", () => {
            if (menu.classList.contains('show')) {
                bsCollapse.hide();
            }
        });
    });

    // Cierra el menú al hacer clic fuera
    document.addEventListener("click", function (e) {
        const isClickInsideMenu = menu.contains(e.target);
        const isClickOnToggler = toggler.contains(e.target);

        if (!isClickInsideMenu && !isClickOnToggler && menu.classList.contains('show')) {
            bsCollapse.hide();
        }
    });
});
