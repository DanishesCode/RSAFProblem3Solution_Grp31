// filters.js
// All filter dropdown logic extracted from script.js (unchanged)

import {
    filterBtn,
    filterPanel,
    filterClose,
    clearFiltersBtn,
    filterReposContainer,
    filterAgentsContainer
} from "./domRefs.js";

/* ======================================================
   POPULATE FILTER OPTIONS
======================================================= */
export function populateFilterOptions() {
    const tasks = Array.from(document.querySelectorAll(".task"));
    const reposSet = new Set();
    const agentsSet = new Set();

    tasks.forEach(t => {
        const r = (t.getAttribute("repo") || "").trim();
        if (r) reposSet.add(r);

        let a = (t.getAttribute("assignedAgent") || "").trim();
        if (a) agentsSet.add(a);

        // fallback: read agent text
        if (!a) {
            const node = t.querySelector(".agentSelected");
            if (node) {
                const text = node.textContent.replace(/^Agent:\s*/i, "").trim();
                if (text) agentsSet.add(text);
            }
        }
    });

    /* Render Repo Checkboxes */
    filterReposContainer.innerHTML = "";
    Array.from(reposSet).sort().forEach(repo => {
        const id = "repo-" + repo.replace(/\s+/g, "-");

        const label = document.createElement("label");

        const span = document.createElement("span");
        span.className = "filter-text";
        span.textContent = repo;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "filter-repo";
        input.value = repo;
        input.id = id;

        label.appendChild(span);
        label.appendChild(input);
        filterReposContainer.appendChild(label);
    });

    /* Render Agent Checkboxes */
    filterAgentsContainer.innerHTML = "";
    Array.from(agentsSet).sort().forEach(agent => {
        const id = "agent-" + agent.replace(/\s+/g, "-");

        const label = document.createElement("label");

        const span = document.createElement("span");
        span.className = "filter-text";
        span.textContent = agent;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "filter-agent";
        input.value = agent;
        input.id = id;

        label.appendChild(span);
        label.appendChild(input);
        filterAgentsContainer.appendChild(label);
    });

    // bind change listeners
    document.querySelectorAll(".filter-repo, .filter-agent")
        .forEach(cb => cb.addEventListener("change", applyFilters));
}

/* ======================================================
   APPLY FILTERS
======================================================= */
export function applyFilters() {
    const selectedRepos = Array.from(document.querySelectorAll(".filter-repo:checked"))
        .map(i => i.value);
    const selectedAgents = Array.from(document.querySelectorAll(".filter-agent:checked"))
        .map(i => i.value);

    document.querySelectorAll(".task").forEach(t => {
        if (t.getAttribute("taskid") === "TEMPLATE") {
            t.style.display = "none";
            return;
        }

        const repo = (t.getAttribute("repo") || "").trim();

        let agent = (t.getAttribute("assignedAgent") || "").trim();
        if (!agent) {
            const node = t.querySelector(".agentSelected");
            if (node) agent = node.textContent.replace(/^Agent:\s*/i, "").trim();
        }

        const repoPass = selectedRepos.length === 0 || selectedRepos.includes(repo);
        const agentPass = selectedAgents.length === 0 || selectedAgents.includes(agent);

        t.style.display = repoPass && agentPass ? "block" : "none";
    });
}

/* ======================================================
   CLEAR FILTERS
======================================================= */
export function clearFilters() {
    document
        .querySelectorAll(".filter-repo:checked, .filter-agent:checked")
        .forEach(cb => (cb.checked = false));

    applyFilters();
}

/* ======================================================
   INIT FILTER PANEL LOGIC
======================================================= */
export function initFilters() {
    if (filterBtn) {
        filterBtn.addEventListener("click", () => {
            filterPanel.classList.toggle("hidden");

            if (!filterPanel.classList.contains("hidden")) {
                populateFilterOptions();
                filterPanel.setAttribute("aria-hidden", "false");
            } else {
                filterPanel.setAttribute("aria-hidden", "true");
            }
        });
    }

    if (filterClose) {
        filterClose.addEventListener("click", () => {
            filterPanel.classList.add("hidden");
            filterPanel.setAttribute("aria-hidden", "true");
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", clearFilters);
    }

    // Hide on outside click
    document.addEventListener("click", e => {
        if (!filterPanel || !filterBtn) return;
        if (filterPanel.classList.contains("hidden")) return;

        if (e.target.closest("#filterPanel") || e.target.closest("#open-filter")) return;

        filterPanel.classList.add("hidden");
        filterPanel.setAttribute("aria-hidden", "true");
    });
}
