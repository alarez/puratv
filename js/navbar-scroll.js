document.addEventListener("DOMContentLoaded", function () {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(function (question) {
        question.addEventListener('click', function () {
            const answer = this.nextElementSibling;
            const isVisible = answer.style.display === 'block';
            answer.style.display = isVisible ? 'none' : 'block';
        });
    });
});
