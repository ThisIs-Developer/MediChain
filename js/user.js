document.addEventListener("DOMContentLoaded", function () {
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".content-section");

    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            if (link.id === "logout") {
                window.location.replace("logout.html");
                return;
            }

            navLinks.forEach((l) => l.classList.remove("active"));
            sections.forEach((s) => s.classList.remove("active"));

            link.classList.add("active");
            const sectionId = link.getAttribute("data-section");
            if (document.getElementById(sectionId)) {
                document.getElementById(sectionId).classList.add("active");
            }

            if (window.innerWidth <= 768) {
                document.querySelector(".sidebar").classList.remove("show");
            }
        });
    });

    const sidebarToggle = document.getElementById("sidebar-toggle");
    sidebarToggle.addEventListener("click", () => {
        document.querySelector(".sidebar").classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        const sidebar = document.querySelector(".sidebar");
        const sidebarToggle = document.getElementById("sidebar-toggle");

        if (
            window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target)
        ) {
            sidebar.classList.remove("show");
        }
    });
});
