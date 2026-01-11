

document.addEventListener("DOMContentLoaded", () => {

    /* -------------------------
       Redirect if not logged in
    --------------------------*/
    if (!localStorage.getItem("githubId")) {
        window.location.href = "http://localhost:3000/login/";
        return;
    }

    /* -------------------------
       DOM ELEMENTS
    --------------------------*/
    const newBtn = document.querySelector(".btn-new");
    const activityBtn = document.querySelector(".btn-activity");
    const modalPanel = document.querySelector("#addNewTaskPanel");
    const modal = document.getElementById("addNewTaskPanel");
    const modalTitle = modal.querySelector('.modal-title') || modal.querySelector('.panel-title') || modal.querySelector('h2');
    const closeBtn = modal.querySelector(".close-btn");
    const createBtn = modal.querySelector(".create");
    const cancelBtn = modal.querySelector(".cancel");
    const sidebar = document.getElementById("activity-sidebar");
    const sidebarClose = document.getElementById("close-activity");
    const activityContent = document.getElementById("activity-content");

    const titleInput = modal.querySelector('input[type="text"]');
    const descriptionInput = modal.querySelector("textarea");
    const prioritySelect = modal.querySelector("select");
    const tags = Array.from(modal.querySelectorAll(".tags span"));
    const agentCards = Array.from(modal.querySelectorAll(".agent-card"));

    const addRows = modal.querySelectorAll(".modal-body .add-row");
    const requirementContainer = modal.querySelector("#requirements-container");
    const acceptanceContainer = modal.querySelector("#acceptance-container");

    
    // Fallback: if structure differs, manually find by label proximity
    if (!requirementContainer || !acceptanceContainer) {
        const labels = Array.from(modal.querySelectorAll("label"));
        const reqLabel = labels.find(l => l.textContent.includes("Requirements"));
        const accLabel = labels.find(l => l.textContent.includes("Acceptance"));
        if (reqLabel) requirementContainer = reqLabel.nextElementSibling;
        if (accLabel) acceptanceContainer = accLabel.nextElementSibling;
    }

    const githubProjectsContainer = modal.querySelector(".github-projects");

    const reposString = localStorage.getItem("repos");
    const repos = reposString ? reposString.split(",") : [];

    const apiBaseUrl = "http://localhost:3000";
    const taskTemplate = document.querySelector(".task");

    const searchBar = document.querySelector(".search-bar input");

    /* Repo cards reference (gets refreshed) */
    let repoCards = [];

    /* ======================================================
        DROPDOWN — FILTER
    ======================================================= */
    const filterBtn = document.getElementById('open-filter');
    const filterPanel = document.getElementById('filterPanel');
    const filterClose = document.getElementById('close-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filterReposContainer = document.getElementById('filter-repos');
    const filterAgentsContainer = document.getElementById('filter-agents');

    function populateFilterOptions() {
        // collect unique repos and agents from existing tasks + template attributes
        const tasks = Array.from(document.querySelectorAll('.task'));
        const reposSet = new Set();
        const agentsSet = new Set();

        tasks.forEach(t => {
            const r = (t.getAttribute('repo') || '').trim();
            if (r) reposSet.add(r);
            const a = (t.getAttribute('assignedAgent') || '').trim();
            if (a) agentsSet.add(a);
            // fallback: read agent text
            if (!a) {
                const node = t.querySelector('.agentSelected');
                if (node) {
                    const text = node.textContent.replace(/^Agent:\s*/i, '').trim();
                    if (text) agentsSet.add(text);
                }
            }
        });

        // render repo checkboxes
        filterReposContainer.innerHTML = '';
        Array.from(reposSet).sort().forEach(repo => {
            const id = 'repo-' + repo.replace(/\s+/g,'-');
            const label = document.createElement('label');

            const span = document.createElement('span');
            span.className = 'filter-text';
            span.textContent = repo;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'filter-repo';
            input.value = repo;
            input.id = id;

            label.appendChild(span);
            label.appendChild(input);
            filterReposContainer.appendChild(label);
        });

        // render agent checkboxes
        filterAgentsContainer.innerHTML = '';
        Array.from(agentsSet).sort().forEach(agent => {
            const id = 'agent-' + agent.replace(/\s+/g,'-');
            const label = document.createElement('label');

            const span = document.createElement('span');
            span.className = 'filter-text';
            span.textContent = agent;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'filter-agent';
            input.value = agent;
            input.id = id;

            label.appendChild(span);
            label.appendChild(input);
            filterAgentsContainer.appendChild(label);
        });

        // bind change listeners
        document.querySelectorAll('.filter-repo, .filter-agent').forEach(cb => cb.addEventListener('change', applyFilters));
    }

    function applyFilters() {
        const selectedRepos = Array.from(document.querySelectorAll('.filter-repo:checked')).map(i => i.value);
        const selectedAgents = Array.from(document.querySelectorAll('.filter-agent:checked')).map(i => i.value);

        document.querySelectorAll('.task').forEach(t => {
            // hide template if it's intended as template
            if (t.getAttribute('taskid') === 'TEMPLATE') {
                t.style.display = 'none';
                return;
            }

            const repo = (t.getAttribute('repo') || '').trim();
            let agent = (t.getAttribute('assignedAgent') || '').trim();
            if (!agent) {
                const node = t.querySelector('.agentSelected');
                if (node) agent = node.textContent.replace(/^Agent:\s*/i,'').trim();
            }

            const repoPass = selectedRepos.length === 0 || selectedRepos.includes(repo);
            const agentPass = selectedAgents.length === 0 || selectedAgents.includes(agent);

            t.style.display = (repoPass && agentPass) ? 'block' : 'none';
        });
    }

    function clearFilters() {
        document.querySelectorAll('.filter-repo:checked, .filter-agent:checked').forEach(cb => cb.checked = false);
        applyFilters();
    }

    // panel toggle
    if (filterBtn) filterBtn.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
        if (!filterPanel.classList.contains('hidden')) {
            populateFilterOptions();
            filterPanel.setAttribute('aria-hidden', 'false');
        } else {
            filterPanel.setAttribute('aria-hidden', 'true');
        }
    });
    if (filterClose) filterClose.addEventListener('click', () => {
        filterPanel.classList.add('hidden');
        filterPanel.setAttribute('aria-hidden', 'true');
    });
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    // hide filter panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterPanel || !filterBtn) return;
        if (filterPanel.classList.contains('hidden')) return;
        if (e.target.closest('#filterPanel') || e.target.closest('#open-filter')) return;
        filterPanel.classList.add('hidden');
        filterPanel.setAttribute('aria-hidden', 'true');
    });

    /* ======================================================
       SIDEBAR — ACTIVITY
    ======================================================= */
    activityBtn.addEventListener("click", () => {
        sidebar.classList.add("open");
    });

    sidebarClose.addEventListener("click", () => {
        sidebar.classList.remove("open");
    });

    function pushActivity({ title, agent, status, priority, repo, percent }) {
        const entry = document.createElement("div");
        entry.className = "activity-entry";

        entry.innerHTML = `
            <div class="activity-entry-title">${title}</div>
            <small>Status: <b>${status}</b></small><br>
            <small>Agent: ${agent}</small><br>
            <small>Priority: ${priority}</small><br>
            <small>Repo: ${repo}</small><br>
            <small>Progress: ${percent}%</small>
        `;

        activityContent.prepend(entry);
    }

    /* ======================================================
       SEARCH BAR (TASK FILTERING)
    ======================================================= */
    searchBar.addEventListener("keyup", function () {
        const query = this.value.toLowerCase();
        const items = document.querySelectorAll(".task");

        items.forEach(item => {
            const title = item.getAttribute("title")?.toLowerCase() || "";

            if (title.includes(query) && title !== "example task title") {
                item.style.display = "block";
            } else {
                item.style.display = "none";
            }
        });
    });

    /* ======================================================
       TAG (CAPABILITY) FILTERING
    ======================================================= */
    tags.forEach(tag => {
        tag.addEventListener("click", () => {
            tag.classList.toggle("selected");
            filterAgents();
        });
    });

    function filterAgents() {
        const selected = tags
            .filter(t => t.classList.contains("selected"))
            .map(t => t.getAttribute("value"));

        agentCards.forEach(card => {
            const capabilities = card.getAttribute("filter").split(",");

            const show =
                selected.length === 0 ||
                selected.every(s => capabilities.includes(s));

            card.style.display = show ? "flex" : "none";
        });
    }

    /* ======================================================
       AGENT SELECTION
    ======================================================= */
    agentCards.forEach(card => {
        card.addEventListener("click", () => {
            agentCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
        });
    });

    /* ======================================================
       LOAD REPOS INTO MODAL (FINAL FIXED VERSION)
    ======================================================= */
    function loadReposIntoModal() {
        githubProjectsContainer.innerHTML = ""; // clear previous

        repos.forEach(repoName => {
            const card = document.createElement("div");
            card.classList.add("repo-card");
            card.innerHTML = `<strong value="${repoName.trim()}">${repoName.trim()}</strong>`;

            card.addEventListener("click", () => {
                repoCards.forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
            });

            githubProjectsContainer.appendChild(card);
        });

        // refresh reference
        repoCards = Array.from(githubProjectsContainer.querySelectorAll(".repo-card"));
    }

    /* ======================================================
       COLLECT MODAL VALUES
    ======================================================= */
    function collectValues() {
        const selectedRepoCard = modal.querySelector(".repo-card.selected strong");
        const selectedAgent = agentCards.find(card => card.classList.contains("selected"));

        return {
            title: titleInput.value.trim(),
            description: descriptionInput.value.trim(),
            priority: prioritySelect.value,
            requirements: [...requirementContainer.querySelectorAll("input")]
                .map(i => i.value.trim())
                .filter(Boolean),
            acceptanceCriteria: [...acceptanceContainer.querySelectorAll("input")]
                .map(i => i.value.trim())
                .filter(Boolean),
            assignedAgent: selectedAgent?.getAttribute("value") || null,
            agentId: selectedAgent?.getAttribute("agentId") || null,
            repo: selectedRepoCard ? selectedRepoCard.getAttribute("value") : null,
            status: "toDo"
        };
    }

    /* ======================================================
       NOTIFICATION SYSTEM (if not already present)
    ======================================================= */
    function notify(message, duration = 2500, type = "error") {
        const container = document.getElementById("notification-container");
        if (!container) return;

        const notif = document.createElement("div");
        notif.className = `notification ${type}`;
        notif.innerHTML = `
            <div class="notification-icon">⚠</div>
            <span>${message}</span>
        `;
        container.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = "slideOut 0.3s ease forwards";
            setTimeout(() => notif.remove(), 300);
        }, duration);
    }

    // Alias for consistency
    const showNotification = notify;


    /* ======================================================
       VALIDATION
    ======================================================= */
    function validateForm() {
        const v = collectValues();
        const missing = [];

        if (!v.title) missing.push("Task Title");
        if (!v.description) missing.push("Description");
        if (!v.assignedAgent) missing.push("Assigned Agent");
        if (!v.repo) missing.push("GitHub Project");
        if (v.requirements.length === 0) missing.push("Requirements");
        if (v.acceptanceCriteria.length === 0) missing.push("Acceptance Criteria");

        if (missing.length > 0) {
            notify("Missing fields:\n- " + missing.join("\n- "), 3500, "error");
            return false;
        }
        return true;
    }

    
    //initialize logs
    async function intializeLogs(){
        let userId = localStorage.getItem("userId");
        const logs = await fetch(`/backlog/getUserLogs?userId=${userId}`)
                        .then(res => res.json());
        logs.forEach(function(data){
            addTask(data);
        })
}

// wait for logs to load, THEN update workload
(async () => {
    await intializeLogs();
    if (typeof updateAgentWorkload === "function") {
        updateAgentWorkload();
    }
})();
    /* ======================================================
       SEND TO BACKEND
    ======================================================= */
    async function saveBacklog(formData) {
        try {
            const response = await fetch(`${apiBaseUrl}/backlog/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            return await response.json();
        } catch (err) {
            console.error("Error saving:", err);
        }
    }

    /* ======================================================
       ADD TASK TO UI (UPDATED TO FIT EDIT)
    ======================================================= */
    function mapAgentIdToName(id) {
    switch (String(id)) {
        case "1": return "Claude";
        case "2": return "Gemini";
        case "3": return "OpenAI";
        default: return "Unknown";
    }
}
function addTask(taskData) {
    const clone = taskTemplate.cloneNode(true);
    clone.style.display = "block";

    // Normalize requirements -> always array
    let requirements = [];
    if (Array.isArray(taskData.requirements)) {
        requirements = taskData.requirements;
    } else if (typeof taskData.requirements === "string") {
        try {
            const parsed = JSON.parse(taskData.requirements);
            if (Array.isArray(parsed)) requirements = parsed;
            else if (taskData.requirements.trim() !== "") requirements = [taskData.requirements.trim()];
        } catch {
            if (taskData.requirements.trim() !== "") requirements = [taskData.requirements.trim()];
        }
    }

    // Normalize acceptanceCriteria -> always array
    let acceptCrit = [];
    if (Array.isArray(taskData.acceptanceCriteria)) {
        acceptCrit = taskData.acceptanceCriteria;
    } else if (typeof taskData.acceptanceCriteria === "string") {
        try {
            const parsed = JSON.parse(taskData.acceptanceCriteria);
            if (Array.isArray(parsed)) acceptCrit = parsed;
            else if (taskData.acceptanceCriteria.trim() !== "") acceptCrit = [taskData.acceptanceCriteria.trim()];
        } catch {
            if (taskData.acceptanceCriteria.trim() !== "") acceptCrit = [taskData.acceptanceCriteria.trim()];
        }
    }

    // ---- FIXED AGENT HANDLING ----
    const agentId = taskData.agentId || taskData.agentid || "";
    const agentName = taskData.assignedAgent || mapAgentIdToName(agentId);

    // store attributes so editor can read them
    clone.setAttribute("taskid", taskData.taskid || `task-${Date.now()}`);
    clone.setAttribute("status", taskData.status || "toDo");
    clone.setAttribute("title", taskData.title || "");
    clone.setAttribute("priority", taskData.priority || "");
    clone.setAttribute("repo", taskData.repo || "");

    clone.setAttribute("agentId", agentId);          // ✔ fixed
    clone.setAttribute("assignedAgent", agentName);  // ✔ fixed

    clone.setAttribute("description", taskData.description || ""); // ✔ KEEP THIS EXACTLY HERE

    // store normalized arrays
    clone.setAttribute("requirements", JSON.stringify(requirements));
    clone.setAttribute("acceptCrit", JSON.stringify(acceptCrit));

    // UI elements
    clone.querySelector(".task-title").textContent = taskData.title || "";
    clone.querySelector(".task-priority").textContent = taskData.priority || "";
    clone.querySelector(".repoSelected").textContent = `Repo: ${taskData.repo || ""}`;
    clone.querySelector(".agentSelected").textContent = `Agent: ${agentName}`;  // ✔ fixed

    // append to correct column
    document
        .querySelector(`.column[type="${taskData.status || "toDo"}"] .task-list`)
        .appendChild(clone);

    if (typeof attachDragListeners === "function") {
        attachDragListeners();
    }

    // Attach click -> open edit modal
    clone.addEventListener("click", (e) => {
    if (e.target.closest(".task-control")) return;

    const status = clone.getAttribute("status");
    if (status !== "toDo") return;

    openEditModal(clone);
});


    pushActivity({
        title: taskData.title,
        agent: agentName,          // ✔ fixed
        status: "Created",
        priority: taskData.priority,
        repo: taskData.repo,
        percent: 0
    });
}

    /* ======================================================
        RESET MODAL
    ======================================================= */
    function resetModal() {
        titleInput.value = "";
        descriptionInput.value = "";
        prioritySelect.value = "medium";
        tags.forEach(t => t.classList.remove("selected"));
        agentCards.forEach(a => a.classList.remove("selected"));

        // Clear and reset containers
        requirementContainer.innerHTML = "";
        acceptanceContainer.innerHTML = "";
        
        // Add single empty input to each
        addInput(requirementContainer);
        addInput(acceptanceContainer);

        repoCards.forEach(r => r.classList.remove("selected"));
    }

    /* ======================================================
        OPEN MODAL
    ======================================================= */
    newBtn.addEventListener("click", () => {
        resetModal();
        loadReposIntoModal();   // IMPORTANT
        modalPanel.style.display = "block";
        editingTaskElement = null;                         // clear edit state
        createBtn.textContent = "Create Task";
        createBtn.classList.remove("save");
        createBtn.classList.add("create");
        if (modalTitle) modalTitle.textContent = "Create Task"; // update header if present
    });

    closeBtn.addEventListener("click", () => {
        modalPanel.style.display = "none";
    });
   
    // Cancel button handler
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            modalPanel.style.display = "none";
            editingTaskElement = null;
            createBtn.textContent = "Create Task";
            createBtn.classList.remove("save");
            createBtn.classList.add("create");
            resetModal();
        });
    }


    // Ensure modal dynamic rows can be added (used by openEditModal / new task)
    function addInput(container) {
        if (!container) return null;
        const row = document.createElement("div");
        row.className = "add-row";
        row.innerHTML = `<input type="text" value="" /><button class="add-btn">+</button>`;
        const btn = row.querySelector(".add-btn");
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            addInput(container);
        });
        container.appendChild(row);
        return row;
    }

    /* ======================================================
       CREATE TASK (UPDATED FOR EDIT)
    ======================================================= */
    createBtn.addEventListener("click", async () => {
        // If editing an existing task, update DOM instead of creating
        if (editingTaskElement) {
            if (!validateForm()) return;

            const values = collectValues();

            // update stored attributes
            editingTaskElement.setAttribute("title", values.title);
            editingTaskElement.setAttribute("description", values.description || "");
            editingTaskElement.setAttribute("priority", values.priority);
            editingTaskElement.setAttribute("assignedAgent", values.assignedAgent || "");
            editingTaskElement.setAttribute("repo", values.repo || "");
            editingTaskElement.setAttribute("requirements", JSON.stringify(values.requirements ));
            editingTaskElement.setAttribute("acceptCrit", JSON.stringify(values.acceptanceCriteria ));

            // update visible fields
            const tt = editingTaskElement.querySelector(".task-title");
            if (tt) tt.textContent = values.title;
            const pp = editingTaskElement.querySelector(".task-priority");
            if (pp) pp.textContent = values.priority;
            const rp = editingTaskElement.querySelector(".repoSelected");
            if (rp) rp.textContent = `Repo: ${values.repo || ""}`;
            const ag = editingTaskElement.querySelector(".agentSelected");
            if (ag) ag.textContent = `Agent: ${values.assignedAgent || ""}`;

            // close modal and reset edit state
            modalPanel.style.display = "none";
            editingTaskElement = null;
            createBtn.textContent = "Create Task";
            createBtn.classList.remove("save");
            createBtn.classList.add("create");
            if (modalTitle) modalTitle.textContent = "Create Task";
            resetModal();
            return;
        }

        // --- existing create flow ---
        if (!validateForm()) return;

        const formData = collectValues();
        formData.userId = localStorage.getItem("userId");

        const saved = await saveBacklog(formData);
        if (saved) {
            addTask(saved);
        }

        modalPanel.style.display = "none";
    });

    /* ======================================================
       OPEN EDIT TASK
    ======================================================= */
    let editingTaskElement = null;

    function openEditModal(taskEl) {
        if (!taskEl) return;
        // ignore template element
        if (taskEl.getAttribute('taskid') === 'TEMPLATE') return;

        editingTaskElement = taskEl;

        // Prefill simple inputs
        titleInput.value = taskEl.getAttribute('title') || taskEl.querySelector('.task-title')?.textContent || "";
        descriptionInput.value = taskEl.getAttribute('description') || "";
        prioritySelect.value = taskEl.getAttribute('priority') || "medium";

        // Prefill requirements
        try {
            let raw = taskEl.getAttribute("requirements") || "[]";
            // If raw is a JSON string of an array or an already stringified array, parse until array
            let reqs = [];
            if (typeof raw === "string") {
                try {
                    const parsedOnce = JSON.parse(raw);
                    // parsedOnce might be array or a string containing JSON array
                    if (Array.isArray(parsedOnce)) reqs = parsedOnce;
                    else if (typeof parsedOnce === "string") {
                        try {
                            const parsedTwice = JSON.parse(parsedOnce);
                            if (Array.isArray(parsedTwice)) reqs = parsedTwice;
                            else reqs = [parsedOnce];
                        } catch { reqs = [parsedOnce]; }
                    } else reqs = [];
                } catch {
                    // raw not JSON -> treat as single value if non-empty
                    if (raw.trim() !== "") reqs = [raw.trim()];
                }
            } else if (Array.isArray(raw)) {
                reqs = raw;
            }

            requirementContainer.innerHTML = "";
            if (!reqs || reqs.length === 0) {
                addInput(requirementContainer);
            } else {
                reqs.forEach(val => {
                    const row = document.createElement("div");
                    row.className = "add-row";
                    row.innerHTML = `<input type="text" value="${(val + '').replace(/"/g, '&quot;')}" /><button class="add-btn">+</button>`;
                    const btn = row.querySelector(".add-btn");
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        addInput(requirementContainer);
                    });
                    requirementContainer.appendChild(row);
                });
            }
        } catch (e) {
            requirementContainer.innerHTML = "";
            addInput(requirementContainer);
        }

        // Prefill acceptance criteria (same normalization)
        try {
            let rawA = taskEl.getAttribute("acceptCrit") || "[]";
            let accs = [];
            if (typeof rawA === "string") {
                try {
                    const p1 = JSON.parse(rawA);
                    if (Array.isArray(p1)) accs = p1;
                    else if (typeof p1 === "string") {
                        try {
                            const p2 = JSON.parse(p1);
                            if (Array.isArray(p2)) accs = p2;
                            else accs = [p1];
                        } catch { accs = [p1]; }
                    } else accs = [];
                } catch {
                    if (rawA.trim() !== "") accs = [rawA.trim()];
                }
            } else if (Array.isArray(rawA)) {
                accs = rawA;
            }

            acceptanceContainer.innerHTML = "";
            if (!accs || accs.length === 0) {
                addInput(acceptanceContainer);
            } else {
                accs.forEach(val => {
                    const row = document.createElement("div");
                    row.className = "add-row";
                    row.innerHTML = `<input type="text" value="${(val + '').replace(/"/g, '&quot;')}" /><button class="add-btn">+</button>`;
                    const btn = row.querySelector(".add-btn");
                    btn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        addInput(acceptanceContainer);
                    });
                    acceptanceContainer.appendChild(row);
                });
            }
        } catch (e) {
            acceptanceContainer.innerHTML = "";
            addInput(acceptanceContainer);
        }

        // Select agent card matching assignedAgent attribute/value
        const assigned = taskEl.getAttribute('assignedAgent') || "";
        agentCards.forEach(c => c.classList.toggle('selected', c.getAttribute('value') === assigned));

        // Load repos and pick the matching repo card
        loadReposIntoModal();
        const repoVal = taskEl.getAttribute('repo') || "";
        repoCards.forEach(r => {
            const v = r.querySelector('strong')?.getAttribute('value') || "";
            r.classList.toggle('selected', v === repoVal);
        });

        // Switch modal into edit mode visually
        modalPanel.style.display = "block";
        createBtn.textContent = "Save";
        createBtn.classList.add("save");
        createBtn.classList.remove("create");
        if (modalTitle) modalTitle.textContent = "Edit Task";
    }

    // edit task only for todo column
    document.addEventListener('click', (e) => {
        const taskEl = e.target.closest('.task');
        if (!taskEl) return;
        // ignore the template element
        if (taskEl.getAttribute && taskEl.getAttribute('taskid') === 'TEMPLATE') return;
        // ignore clicks on internal controls
        if (e.target.closest('.task-control') || e.target.closest('.add-btn')) return;
        
        // Check if task is in a toDo column ONLY
        const column = taskEl.closest('.column');
        if (!column || column.getAttribute('type') !== 'toDo') return;
        
        // open modal prefilling fields
        openEditModal(taskEl);
    });
    document.getElementById("open-dashboard").addEventListener("click", () => {
        window.location.href = "../dashboard/dashboard.html"
    });

    /* ======================================================
       REVIEW MODAL FUNCTIONALITY
    ======================================================= */
    const reviewModal = document.getElementById('reviewModal');
    const reviewClose = document.querySelector('.review-close');
    const reviewAccept = document.getElementById('review-accept');
    const reviewReject = document.getElementById('review-reject');
    const reviewRetry = document.getElementById('review-retry');

    let currentReviewTask = null;

    // Open review modal when clicking tasks in "In Review" column
    // Open done modal when clicking tasks in "Done" column
    document.addEventListener('click', (e) => {
        const taskEl = e.target.closest('.task');
        if (!taskEl) return;
        
        // Ignore template task
        if (taskEl.getAttribute('taskid') === 'TEMPLATE') return;
        
        const column = taskEl.closest('.column');
        if (!column) return;
        
        const columnType = column.getAttribute('type');
        
        if (columnType === 'review') {
            openReviewModal(taskEl);
        } else if (columnType === 'done') {
            openDoneModal(taskEl);
        } else if (columnType === 'cancel') {
            openCancelledModal(taskEl);
        }
    });

    function openReviewModal(taskEl) {
        currentReviewTask = taskEl;
        const taskData = {
            title: taskEl.getAttribute('title') || 'Untitled Task',
            description: taskEl.getAttribute('description') || 'No description provided',
            priority: taskEl.getAttribute('priority') || 'medium',
            acceptance: taskEl.getAttribute('acceptCrit') || '',
            repo: taskEl.getAttribute('repo') || 'Repository',
            agentId: taskEl.getAttribute('agentid'),
            agentProcess: taskEl.getAttribute('agentProcess') || '',
            prompt: taskEl.getAttribute('prompt') || 'No prompt provided',
            progress: parseFloat(taskEl.querySelector('.progress-fill')?.style.width) || 0
        };

        // Get agent name from the task element
        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        // Populate modal
        document.getElementById('review-task-title').textContent = taskData.title;
        document.getElementById('review-prompt').textContent = taskData.description; // Show description as prompt
        document.getElementById('review-acceptance').textContent = taskData.acceptance;
        document.getElementById('review-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('review-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('review-agent-name').textContent = agentName;
        document.getElementById('review-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('review-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('review-progress-fill').style.width = taskData.progress + '%';

        // Set priority badge
        const priorityBadge = document.getElementById('review-priority-badge');
        priorityBadge.textContent = taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1);
        
        if (taskData.priority.toLowerCase() === 'high') {
            priorityBadge.style.background = '#dc3545';
            priorityBadge.style.color = 'white';
        } else if (taskData.priority.toLowerCase() === 'medium') {
            priorityBadge.style.background = '#ffc107';
            priorityBadge.style.color = '#212529';
        } else {
            priorityBadge.style.background = '#28a745';
            priorityBadge.style.color = 'white';
        }

        reviewModal.style.display = 'flex';
    }

    function closeReviewModal() {
        reviewModal.style.display = 'none';
        currentReviewTask = null;
    }

    async function handleReviewDecision(decision) {
        if (!currentReviewTask) return;

        const taskId = currentReviewTask.getAttribute('taskid');
        
        if (decision === 'retry') {
            // Get current task data
            const description = currentReviewTask.getAttribute('description');
            const acceptance = currentReviewTask.getAttribute('acceptCrit');
            
            // Re-prompt the AI with description and acceptance criteria
            // For now, just move it back to In Progress
            newStatus = 'progress';
            targetColumn = document.querySelector('.column[type="progress"] .task-list');
            
            // Update status in backend
            try {
                const response = await fetch('http://localhost:3000/backlog/status-update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId, status: newStatus })
                });

                if (response.ok) {
                    // Move task to In Progress column
                    currentReviewTask.setAttribute('status', newStatus);
                    if (targetColumn) {
                        targetColumn.appendChild(currentReviewTask);
                    }
                    
                    // Show notification with prompt info
                    showNotification('Task sent back to In Progress for revision.', 'success');
                    
                    // Log activity
                    pushActivity({
                        title: currentReviewTask.getAttribute('title'),
                        agent: currentReviewTask.querySelector('.agentSelected')?.textContent.replace('Agent:', '').trim(),
                        status: newStatus,
                        priority: currentReviewTask.getAttribute('priority'),
                        repo: currentReviewTask.getAttribute('repo'),
                        percent: parseFloat(currentReviewTask.querySelector('.progress-fill')?.style.width) || 0
                    });
                    
                    // TODO: Re-prompt AI agent with:
                    // Description: ${description}
                    // Acceptance Criteria: ${acceptance}
                    console.log('Re-prompting with:', { description, acceptance });
                } else {
                    showNotification('Failed to update task status', 'error');
                }
            } catch (err) {
                console.error('Error updating task:', err);
                showNotification('Error updating task', 'error');
            }
        }

        closeReviewModal();
    }

    // Event listeners
    reviewClose.addEventListener('click', closeReviewModal);
    reviewRetry.addEventListener('click', () => handleReviewDecision('retry'));

    // Close modal when clicking outside
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            closeReviewModal();
        }
    });

    /* ======================================================
       DONE MODAL FUNCTIONALITY (View only)
    ======================================================= */
    const doneModal = document.getElementById('doneModal');
    const doneClose = document.querySelector('.done-close');

    function openDoneModal(taskEl) {
        const taskData = {
            title: taskEl.getAttribute('title') || 'Untitled Task',
            description: taskEl.getAttribute('description') || 'No description provided',
            priority: taskEl.getAttribute('priority') || 'medium',
            acceptance: taskEl.getAttribute('acceptCrit') || '',
            repo: taskEl.getAttribute('repo') || 'Repository',
            agentProcess: taskEl.getAttribute('agentProcess') || '',
            progress: parseFloat(taskEl.querySelector('.progress-fill')?.style.width) || 100
        };

        // Get agent name from the task element
        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        // Populate modal
        document.getElementById('done-task-title').textContent = taskData.title;
        document.getElementById('done-prompt').textContent = taskData.description;
        document.getElementById('done-acceptance').textContent = taskData.acceptance;
        document.getElementById('done-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('done-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('done-agent-name').textContent = agentName;
        document.getElementById('done-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('done-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('done-progress-fill').style.width = taskData.progress + '%';

        // Set priority badge
        const priorityBadge = document.getElementById('done-priority-badge');
        priorityBadge.textContent = taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1);
        
        if (taskData.priority.toLowerCase() === 'high') {
            priorityBadge.style.background = '#dc3545';
            priorityBadge.style.color = 'white';
        } else if (taskData.priority.toLowerCase() === 'medium') {
            priorityBadge.style.background = '#ffc107';
            priorityBadge.style.color = '#212529';
        } else {
            priorityBadge.style.background = '#28a745';
            priorityBadge.style.color = 'white';
        }

        doneModal.style.display = 'flex';
    }

    function closeDoneModal() {
        doneModal.style.display = 'none';
    }

    // Event listeners for done modal
    doneClose.addEventListener('click', closeDoneModal);

    // Close modal when clicking outside
    doneModal.addEventListener('click', (e) => {
        if (e.target === doneModal) {
            closeDoneModal();
        }
    });

    /* ======================================================
       CANCELLED MODAL FUNCTIONALITY (View only)
    ======================================================= */
    const cancelledModal = document.getElementById('cancelledModal');
    const cancelledClose = document.querySelector('.cancelled-close');

    function openCancelledModal(taskEl) {
        const taskData = {
            title: taskEl.getAttribute('title') || 'Untitled Task',
            description: taskEl.getAttribute('description') || 'No description provided',
            priority: taskEl.getAttribute('priority') || 'medium',
            acceptance: taskEl.getAttribute('acceptCrit') || '',
            repo: taskEl.getAttribute('repo') || 'Repository',
            agentProcess: taskEl.getAttribute('agentProcess') || '',
            progress: parseFloat(taskEl.querySelector('.progress-fill')?.style.width) || 0
        };

        // Get agent name from the task element
        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        // Populate modal
        document.getElementById('cancelled-task-title').textContent = taskData.title;
        document.getElementById('cancelled-prompt').textContent = taskData.description;
        document.getElementById('cancelled-acceptance').textContent = taskData.acceptance;
        document.getElementById('cancelled-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('cancelled-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('cancelled-agent-name').textContent = agentName;
        document.getElementById('cancelled-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('cancelled-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('cancelled-progress-fill').style.width = taskData.progress + '%';

        // Set priority badge
        const priorityBadge = document.getElementById('cancelled-priority-badge');
        priorityBadge.textContent = taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1);
        
        if (taskData.priority.toLowerCase() === 'high') {
            priorityBadge.style.background = '#dc3545';
            priorityBadge.style.color = 'white';
        } else if (taskData.priority.toLowerCase() === 'medium') {
            priorityBadge.style.background = '#ffc107';
            priorityBadge.style.color = '#212529';
        } else {
            priorityBadge.style.background = '#28a745';
            priorityBadge.style.color = 'white';
        }

        cancelledModal.style.display = 'flex';
    }

    function closeCancelledModal() {
        cancelledModal.style.display = 'none';
    }

    // Event listeners for cancelled modal
    cancelledClose.addEventListener('click', closeCancelledModal);

    // Close modal when clicking outside
    cancelledModal.addEventListener('click', (e) => {
        if (e.target === cancelledModal) {
            closeCancelledModal();
        }
    });

    /* ======================================================
       EXPOSE pushActivity TO dragAndDrop.js
    ======================================================= */
    window.pushActivity = pushActivity;

});