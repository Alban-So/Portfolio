// --- Filtrage des outils ---
const filterButtons = document.querySelectorAll(".filter-btn");
const outils = document.querySelectorAll(".outil");

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        // Retire la classe active de tous les boutons
        filterButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const filter = button.getAttribute("data-filter");

        outils.forEach(outil => {
        if (filter === "all" || outil.getAttribute("data-type") === filter) {
            outil.style.display = "flex";
        } else {
            outil.style.display = "none";
        }
        });
    });
});