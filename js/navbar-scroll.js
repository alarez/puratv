document.addEventListener("DOMContentLoaded", function () {
    // Preguntas frecuentes toggle
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(function (question) {
        question.addEventListener('click', function () {
            const answer = this.nextElementSibling;
            const isVisible = answer.style.display === 'block';
            answer.style.display = isVisible ? 'none' : 'block';
        });
    });

    // Toggle menú móvil
    const toggler = document.querySelector(".navbar-toggler");
    const menu = document.getElementById("navbarNavDropdown");
    const links = menu.querySelectorAll("a.nav-link");

    toggler.addEventListener("click", function () {
        menu.classList.toggle("show");
        document.body.classList.toggle("offcanvas-open");
    });

    // Cierra menú al hacer click en link
    links.forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("show");
            document.body.classList.remove("offcanvas-open");
        });
    });

    // Cierra al hacer clic fuera
    document.addEventListener("click", function (e) {
        if (!menu.contains(e.target) && !toggler.contains(e.target)) {
            menu.classList.remove("show");
            document.body.classList.remove("offcanvas-open");
        }
    });
});
