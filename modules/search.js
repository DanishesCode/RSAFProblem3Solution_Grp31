// search.js
// Handles the search bar task filtering logic (unchanged)

import { searchBar } from "./domRefs.js";

/* ======================================================
   SEARCH BAR — FILTER TASKS BY TITLE
======================================================= */
export function initSearch() {
    if (!searchBar) return;

    searchBar.addEventListener("keyup", function () {
        const query = this.value.toLowerCase();
        const items = document.querySelectorAll(".task");

        items.forEach(item => {
            const title = item.getAttribute("title")?.toLowerCase() || "";

            // ignore template
            if (title === "example task title") {
                item.style.display = "none";
                return;
            }

            if (title.includes(query)) {
                item.style.display = "block";
            } else {
                item.style.display = "none";
            }
        });
    });
}
