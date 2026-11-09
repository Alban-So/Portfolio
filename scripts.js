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

// --- Aperçu du rapport de stage FLIP dans une fenêtre modale ---
(() => {
  const modal = document.getElementById("reportPreviewModal");
  if (!modal) return;
  const openButtons = document.querySelectorAll(".report-preview-trigger");
  const closeButtons = modal.querySelectorAll("[data-close-report]");
  const closeButton = modal.querySelector(".report-modal-close");
  const frame = modal.querySelector("iframe[data-pdf-src]");
  let lastFocusedElement = null;

  function openModal(event) {
    event.preventDefault();
    lastFocusedElement = event.currentTarget;
    if (frame && !frame.src) frame.src = frame.dataset.pdfSrc;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("report-modal-open");
    closeButton?.focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("report-modal-open");
    lastFocusedElement?.focus();
  }
  openButtons.forEach(button => button.addEventListener("click", openModal));
  closeButtons.forEach(button => button.addEventListener("click", closeModal));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
})();


// --- Aperçu du rapport Matrix Synapse ---
(() => {
  const modal = document.getElementById("matrixReportModal");
  if (!modal) return;
  const openButtons = document.querySelectorAll(".matrix-report-preview-trigger");
  const closeButtons = modal.querySelectorAll("[data-close-matrix-report]");
  const closeButton = modal.querySelector(".report-modal-close");
  let lastFocusedElement = null;
  function openModal(event) {
    event.preventDefault();
    lastFocusedElement = event.currentTarget;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("report-modal-open");
    closeButton?.focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    // Keep body locked if the FLIP PDF modal is still open.
    if (!document.getElementById("reportPreviewModal")?.classList.contains("is-open")) {
      document.body.classList.remove("report-modal-open");
    }
    lastFocusedElement?.focus();
  }
  openButtons.forEach(button => button.addEventListener("click", openModal));
  closeButtons.forEach(button => button.addEventListener("click", closeModal));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
})();
