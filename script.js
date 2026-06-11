document.addEventListener("DOMContentLoaded", () => {
    const linkBoxes = document.querySelectorAll('.clicca');

    linkBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const url = box.getAttribute('data-url');
            
            if (url) {
            window.open(url, '_blank');
            }
        });
    });
});