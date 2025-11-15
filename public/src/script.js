/* ======================================================
   AI AGENT KANBAN — CLEAN SCRIPT (FINAL STABLE VERSION)
====================================================== */

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
    const closeBtn = modal.querySelector(".close-btn");
    const cancelBtn = modal.querySelector(".cancel");
    const createBtn = modal.querySelector(".create");
    const sidebar = document.getElementById("activity-sidebar");
    const sidebarClose = document.getElementById("close-activity");
    const activityContent = document.getElementById("activity-content");

    const titleInput = modal.querySelector('input[type="text"]');
    const descriptionInput = modal.querySelector("textarea");
    const prioritySelect = modal.querySelector("select");
    const tags = Array.from(modal.querySelectorAll(".tags span"));
    const agentCards = Array.from(modal.querySelectorAll(".agent-card"));

    const addRows = modal.querySelectorAll(".modal-body .add-row");
    const requirementContainer = addRows[0];
    const acceptanceContainer = addRows[1];

    const githubProjectsContainer = modal.querySelector(".github-projects");

    const reposString = localStorage.getItem("repos");
    const repos = reposString ? reposString.split(",") : [];

    const apiBaseUrl = "http://localhost:3000";
    const taskTemplate = document.querySelector(".task");

    const searchBar = document.querySelector(".search-bar input");

    /* Repo cards reference (gets refreshed) */
    let repoCards = [];

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
            alert("Missing fields:\n- " + missing.join("\n- "));
            return false;
        }
        return true;
    }

    console.log(`🆕 Task "${title}" added to ${status} and made draggable.`);
    return newTaskClone
}
//get logs
const getBacklogsByUser = async (req, res) => {
    try {
      const { userId } = req.query; // GET /backlog/getUserLogs?userId=1
  
      if (!userId) {
        return res.status(400).send("Missing userId in request.");
      }
  
      const data = await getBacklogsByUserId(userId);
  
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to retrieve user backlogs");
    }
  };
  
//initialize logs
async function intializeLogs(){
    let userId = localStorage.getItem("userId");
    const logs = await fetch(`/backlog/getUserLogs?userId=${userId}`)
                    .then(res => res.json());
    logs.forEach(function(data){
        addTask(data);
    })
}
intializeLogs()
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
    function addTask(taskData) {
        const clone = taskTemplate.cloneNode(true);
        clone.style.display = "block";

        clone.setAttribute("taskid", taskData.taskid);
        clone.setAttribute("status", taskData.status);
        clone.setAttribute("title", taskData.title);
        clone.setAttribute("priority", taskData.priority);
        clone.setAttribute("repo", taskData.repo);
        clone.setAttribute("assignedAgent", taskData.assignedAgent);

        clone.querySelector(".task-title").textContent = taskData.title;
        clone.querySelector(".task-priority").textContent = taskData.priority;
        clone.querySelector(".repoSelected").textContent = `Repo: ${taskData.repo}`;
        clone.querySelector(".agentSelected").textContent = `Agent: ${taskData.assignedAgent}`;

        document
            .querySelector(`.column[type="${taskData.status}"] .task-list`)
            .appendChild(clone);

        if (typeof attachDragListeners === "function") {
            attachDragListeners();
        }

        pushActivity({
            title: taskData.title,
            agent: taskData.assignedAgent,
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

        requirementContainer.querySelector("input").value = "";
        acceptanceContainer.querySelector("input").value = "";

        repoCards.forEach(r => r.classList.remove("selected"));
    }

    /* ======================================================
       OPEN MODAL
    ======================================================= */
    newBtn.addEventListener("click", () => {
        resetModal();
        loadReposIntoModal();   // IMPORTANT
        modalPanel.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
        modalPanel.style.display = "none";
    });


});
    cancelBtn.addEventListener("click", () => {
        modalPanel.style.display = "none";
    });

    /* ======================================================
       CREATE TASK
    ======================================================= */
    createBtn.addEventListener("click", async () => {
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
       EXPOSE pushActivity TO dragAndDrop.js
    ======================================================= */
    window.pushActivity = pushActivity;
});
