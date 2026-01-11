

document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       REDIRECT IF NOT LOGGED IN
    ======================================================= */
    if (!localStorage.getItem("githubId")) {
        window.location.href = "http://localhost:3000/login/";
        return;
    }

    /* ======================================================
       DOM ELEMENTS
    ======================================================= */
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
        const tasks = Array.from(document.querySelectorAll('.task'));
        const reposSet = new Set();
        const agentsSet = new Set();

        tasks.forEach(t => {
            const r = (t.getAttribute('repo') || '').trim();
            if (r) reposSet.add(r);
            const a = (t.getAttribute('assignedAgent') || '').trim();
            if (a) agentsSet.add(a);
            if (!a) {
                const node = t.querySelector('.agentSelected');
                if (node) {
                    const text = node.textContent.replace(/^Agent:\s*/i, '').trim();
                    if (text) agentsSet.add(text);
                }
            }
        });

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

        document.querySelectorAll('.filter-repo, .filter-agent').forEach(cb => cb.addEventListener('change', applyFilters));
    }

    function applyFilters() {
        const selectedRepos = Array.from(document.querySelectorAll('.filter-repo:checked')).map(i => i.value);
        const selectedAgents = Array.from(document.querySelectorAll('.filter-agent:checked')).map(i => i.value);

        document.querySelectorAll('.task').forEach(t => {
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
            const show = selected.length === 0 || selected.every(s => capabilities.includes(s));
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
       LOAD REPOS INTO MODAL
    ======================================================= */
    function loadReposIntoModal() {
        githubProjectsContainer.innerHTML = "";
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
       NOTIFICATION SYSTEM
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

    /* ======================================================
       INITIALIZE LOGS
    ======================================================= */
    async function intializeLogs(){
        let userId = localStorage.getItem("userId");
        const logs = await fetch(`/backlog/getUserLogs?userId=${userId}`)
                        .then(res => res.json());
        logs.forEach(function(data){
            addTask(data);
        })
    }

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
       ADD TASK TO UI
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

        const agentId = taskData.agentId || taskData.agentid || "";
        const agentName = taskData.assignedAgent || mapAgentIdToName(agentId);

        clone.setAttribute("taskid", taskData.taskid || `task-${Date.now()}`);
        clone.setAttribute("status", taskData.status || "toDo");
        clone.setAttribute("title", taskData.title || "");
        clone.setAttribute("priority", taskData.priority || "");
        clone.setAttribute("repo", taskData.repo || "");
        clone.setAttribute("agentId", agentId);
        clone.setAttribute("assignedAgent", agentName);
        clone.setAttribute("description", taskData.description || "");
        clone.setAttribute("requirements", JSON.stringify(requirements));
        clone.setAttribute("acceptCrit", JSON.stringify(acceptCrit));

        clone.querySelector(".task-title").textContent = taskData.title || "";
        clone.querySelector(".task-priority").textContent = taskData.priority || "";
        clone.querySelector(".repoSelected").textContent = `Repo: ${taskData.repo || ""}`;
        clone.querySelector(".agentSelected").textContent = `Agent: ${agentName}`;

        document
            .querySelector(`.column[type="${taskData.status || "toDo"}"] .task-list`)
            .appendChild(clone);

        if (typeof attachDragListeners === "function") {
            attachDragListeners();
        }

        clone.addEventListener("click", (e) => {
            if (e.target.closest(".task-control")) return;
            const status = clone.getAttribute("status");
            if (status !== "toDo") return;
            openEditModal(clone);
        });

        pushActivity({
            title: taskData.title,
            agent: agentName,
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
        requirementContainer.innerHTML = "";
        acceptanceContainer.innerHTML = "";
        addInput(requirementContainer);
        addInput(acceptanceContainer);
        repoCards.forEach(r => r.classList.remove("selected"));
    }

    /* ======================================================
       OPEN MODAL
    ======================================================= */
    newBtn.addEventListener("click", () => {
        resetModal();
        loadReposIntoModal();
        modalPanel.style.display = "block";
        editingTaskElement = null;
        createBtn.textContent = "Create Task";
        createBtn.classList.remove("save");
        createBtn.classList.add("create");
        if (modalTitle) modalTitle.textContent = "Create Task";
    });

    closeBtn.addEventListener("click", () => {
        modalPanel.style.display = "none";
    });

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
       CREATE TASK
    ======================================================= */
    createBtn.addEventListener("click", async () => {
        if (editingTaskElement) {
            if (!validateForm()) return;
            const values = collectValues();

            editingTaskElement.setAttribute("title", values.title);
            editingTaskElement.setAttribute("description", values.description || "");
            editingTaskElement.setAttribute("priority", values.priority);
            editingTaskElement.setAttribute("assignedAgent", values.assignedAgent || "");
            editingTaskElement.setAttribute("repo", values.repo || "");
            editingTaskElement.setAttribute("requirements", JSON.stringify(values.requirements));
            editingTaskElement.setAttribute("acceptCrit", JSON.stringify(values.acceptanceCriteria));

            const tt = editingTaskElement.querySelector(".task-title");
            if (tt) tt.textContent = values.title;
            const pp = editingTaskElement.querySelector(".task-priority");
            if (pp) pp.textContent = values.priority;
            const rp = editingTaskElement.querySelector(".repoSelected");
            if (rp) rp.textContent = `Repo: ${values.repo || ""}`;
            const ag = editingTaskElement.querySelector(".agentSelected");
            if (ag) ag.textContent = `Agent: ${values.assignedAgent || ""}`;

            modalPanel.style.display = "none";
            editingTaskElement = null;
            createBtn.textContent = "Create Task";
            createBtn.classList.remove("save");
            createBtn.classList.add("create");
            if (modalTitle) modalTitle.textContent = "Create Task";
            resetModal();
            return;
        }

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
        if (taskEl.getAttribute('taskid') === 'TEMPLATE') return;

        editingTaskElement = taskEl;

        titleInput.value = taskEl.getAttribute('title') || taskEl.querySelector('.task-title')?.textContent || "";
        descriptionInput.value = taskEl.getAttribute('description') || "";
        prioritySelect.value = taskEl.getAttribute('priority') || "medium";

        try {
            let raw = taskEl.getAttribute("requirements") || "[]";
            let reqs = [];
            if (typeof raw === "string") {
                try {
                    const parsedOnce = JSON.parse(raw);
                    if (Array.isArray(parsedOnce)) reqs = parsedOnce;
                    else if (typeof parsedOnce === "string") {
                        try {
                            const parsedTwice = JSON.parse(parsedOnce);
                            if (Array.isArray(parsedTwice)) reqs = parsedTwice;
                            else reqs = [parsedOnce];
                        } catch { reqs = [parsedOnce]; }
                    } else reqs = [];
                } catch {
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

        const assigned = taskEl.getAttribute('assignedAgent') || "";
        agentCards.forEach(c => c.classList.toggle('selected', c.getAttribute('value') === assigned));

        loadReposIntoModal();
        const repoVal = taskEl.getAttribute('repo') || "";
        repoCards.forEach(r => {
            const v = r.querySelector('strong')?.getAttribute('value') || "";
            r.classList.toggle('selected', v === repoVal);
        });

        modalPanel.style.display = "block";
        createBtn.textContent = "Save";
        createBtn.classList.add("save");
        createBtn.classList.remove("create");
        if (modalTitle) modalTitle.textContent = "Edit Task";
    }

    document.addEventListener('click', (e) => {
        const taskEl = e.target.closest('.task');
        if (!taskEl) return;
        if (taskEl.getAttribute && taskEl.getAttribute('taskid') === 'TEMPLATE') return;
        if (e.target.closest('.task-control') || e.target.closest('.add-btn')) return;
        const column = taskEl.closest('.column');
        if (!column || column.getAttribute('type') !== 'toDo') return;
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
    const reviewRetry = document.getElementById('review-retry');
    let currentReviewTask = null;

    document.addEventListener('click', (e) => {
        const taskEl = e.target.closest('.task');
        if (!taskEl) return;
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

        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        document.getElementById('review-task-title').textContent = taskData.title;
        document.getElementById('review-prompt').textContent = taskData.description;
        document.getElementById('review-acceptance').textContent = taskData.acceptance;
        document.getElementById('review-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('review-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('review-agent-name').textContent = agentName;
        document.getElementById('review-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('review-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('review-progress-fill').style.width = taskData.progress + '%';

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
            const description = currentReviewTask.getAttribute('description');
            const acceptance = currentReviewTask.getAttribute('acceptCrit');
            newStatus = 'progress';
            targetColumn = document.querySelector('.column[type="progress"] .task-list');
            
            try {
                const response = await fetch('http://localhost:3000/backlog/status-update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId, status: newStatus })
                });

                if (response.ok) {
                    currentReviewTask.setAttribute('status', newStatus);
                    if (targetColumn) {
                        targetColumn.appendChild(currentReviewTask);
                    }
                    showNotification('Task sent back to In Progress for revision.', 'success');
                    
                    pushActivity({
                        title: currentReviewTask.getAttribute('title'),
                        agent: currentReviewTask.querySelector('.agentSelected')?.textContent.replace('Agent:', '').trim(),
                        status: newStatus,
                        priority: currentReviewTask.getAttribute('priority'),
                        repo: currentReviewTask.getAttribute('repo'),
                        percent: parseFloat(currentReviewTask.querySelector('.progress-fill')?.style.width) || 0
                    });
                    
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

    reviewClose.addEventListener('click', closeReviewModal);
    reviewRetry.addEventListener('click', () => handleReviewDecision('retry'));

    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            closeReviewModal();
        }
    });

    /* ======================================================
       DONE MODAL FUNCTIONALITY
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

        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        document.getElementById('done-task-title').textContent = taskData.title;
        document.getElementById('done-prompt').textContent = taskData.description;
        document.getElementById('done-acceptance').textContent = taskData.acceptance;
        document.getElementById('done-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('done-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('done-agent-name').textContent = agentName;
        document.getElementById('done-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('done-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('done-progress-fill').style.width = taskData.progress + '%';

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

    doneClose.addEventListener('click', closeDoneModal);
    doneModal.addEventListener('click', (e) => {
        if (e.target === doneModal) {
            closeDoneModal();
        }
    });

    /* ======================================================
       CANCELLED MODAL FUNCTIONALITY
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

        const agentText = taskEl.querySelector('.agentSelected')?.textContent || '';
        const agentName = agentText.replace('Agent:', '').trim() || 'Unknown';

        document.getElementById('cancelled-task-title').textContent = taskData.title;
        document.getElementById('cancelled-prompt').textContent = taskData.description;
        document.getElementById('cancelled-acceptance').textContent = taskData.acceptance;
        document.getElementById('cancelled-code-changes').textContent = taskData.agentProcess || 'Shows github and changed code in the github';
        document.getElementById('cancelled-repo-name').textContent = 'In ' + (taskData.repo.split('/').pop() || taskData.repo);
        document.getElementById('cancelled-agent-name').textContent = agentName;
        document.getElementById('cancelled-agent-status').textContent = `Workload: ${taskData.workload || 61}% Performance: ${taskData.performance || 40}%`;
        document.getElementById('cancelled-progress-label').textContent = `Progress: ${Math.round(taskData.progress)}%`;
        document.getElementById('cancelled-progress-fill').style.width = taskData.progress + '%';

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

    cancelledClose.addEventListener('click', closeCancelledModal);
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
