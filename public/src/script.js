document.addEventListener("DOMContentLoaded", function() {
    if(localStorage.getItem("githubId") == "" || localStorage.getItem("githubId") == null){
        window.location.href = "http://localhost:3000/login/"
    }


    const newBtn = document.querySelector(".btn-new");
    const addNewTaskPanel = document.querySelector("#addNewTaskPanel");
    const modal = document.getElementById("addNewTaskPanel");
    if (!modal) return;

    const closeBtn = modal.querySelector(".close-btn");
    const cancelBtn = modal.querySelector(".cancel");
    const createBtn = modal.querySelector(".create");

    const titleInput = modal.querySelector('input[type="text"]');
    const descriptionInput = modal.querySelector("textarea");
    const prioritySelect = modal.querySelector("select");
    const estimatedTimeInput = modal.querySelector('input[type="number"]');
    const tags = Array.from(modal.querySelectorAll(".tags span"));
    const agentCards = Array.from(modal.querySelectorAll(".agent-card"));
    const addRows = modal.querySelectorAll(".modal-body .add-row");
    const requirementContainer = addRows[0];
    const acceptanceContainer = addRows[1];
    const requirementAddBtn = requirementContainer.querySelector(".add-btn");
    const acceptanceAddBtn = acceptanceContainer.querySelector(".add-btn");
    const githubProjectsContainer = modal.querySelector(".github-projects");
    const reposString = localStorage.getItem("repos"); // "repo1,repo2,..."
    const repos = reposString ? reposString.split(",") : [];

    const task = document.querySelector(".task");

    // Simulate agent workload every few seconds
    const agents = document.querySelectorAll('.agent-status.working');
    setInterval(() => {
        agents.forEach(a => {
            const random = Math.floor(Math.random() * 75) + 5;
            a.textContent = `Working - ${random}%`;
        });
    }, 2000);


    //Create new task
        newBtn.addEventListener("click", function(){
            addNewTaskPanel.style.display = "block";
        });
   // ---- Tag selection & agent filtering ----
tags.forEach(tag => {
    tag.addEventListener("click", () => {
        tag.classList.toggle("selected"); // add/remove highlight
        filterAgents();
    });
});

function filterAgents() {
    // get selected capabilities
    const selectedCapabilities = tags
        .filter(tag => tag.classList.contains("selected"))
        .map(tag => tag.getAttribute("value").trim()); // trim whitespace

    agentCards.forEach(card => {
        const agentFilters = card.getAttribute("filter")
            .split(",")
            .map(f => f.trim()); // trim whitespace

        // if no capability selected, show all agents
        if (selectedCapabilities.length === 0) {
            card.style.display = "block";
            return;
        }

        // only show agents that have all selected capabilities
        const match = selectedCapabilities.every(cap => agentFilters.includes(cap));
        card.style.display = match ? "block" : "none";
    });
}


// ---- Dynamic input rows ----
function addInput(container) {
    const newRow = document.createElement("div");
    newRow.classList.add("add-row");
    newRow.innerHTML = `
        <input type="text" placeholder="${container === requirementContainer ? "Add a requirement..." : "Add acceptance criteria..."}" />
        <button class="add-btn">+</button>
    `;
    container.appendChild(newRow);

    // Attach click event for the new add button
    const newAddBtn = newRow.querySelector(".add-btn");
    newAddBtn.addEventListener("click", () => addInput(container));
}

requirementAddBtn.addEventListener("click", () => addInput(requirementContainer));
acceptanceAddBtn.addEventListener("click", () => addInput(acceptanceContainer));

// ---- Agent selection ----
agentCards.forEach(card => {
    card.addEventListener("click", () => {
        agentCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
    });
});

// ---- Collect all values ----
function collectValues() {
    const selectedCapabilities = tags
        .filter(tag => tag.classList.contains("selected"))
        .map(tag => tag.getAttribute("value"));

    const requirements = Array.from(requirementContainer.querySelectorAll("input"))
        .map(input => input.value.trim())
        .filter(val => val);

    const acceptanceCriteria = Array.from(acceptanceContainer.querySelectorAll("input"))
        .map(input => input.value.trim())
        .filter(val => val);

    const selectedAgent = agentCards.find(card => card.classList.contains("selected"));

    const selectedRepoCard = modal.querySelector(".repo-card.selected strong");
const githubProject = selectedRepoCard ? selectedRepoCard.getAttribute("value") : null;

return {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    priority: prioritySelect.value,
    estimatedTime: Number(estimatedTimeInput.value),
    requiredCapabilities: selectedCapabilities,
    requirements,
    acceptanceCriteria,
    assignedAgent: selectedAgent ? selectedAgent.getAttribute("value") : null,
    repo: githubProject,
    agentId: selectedAgent.getAttribute("agentId"),
    status:"toDo"
};
}
// ---- Highlight selected capabilities ----
//initialize repo
repos.forEach(repoName => {
    const card = document.createElement("div");
    card.classList.add("repo-card");
    card.innerHTML = `<strong value="${repoName.trim()}">${repoName.trim()}</strong>`;
    
    // Add click event to select
    card.addEventListener("click", () => {
        // Remove selection from all repo cards
        githubProjectsContainer.querySelectorAll(".repo-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
    });

    githubProjectsContainer.appendChild(card);
});



// ---- Highlight selected GitHub project ----
const repoCards = Array.from(modal.querySelectorAll(".repo-card"));

repoCards.forEach(card => {
    if(card.querySelector("strong").getAttribute("value") !== "node-api-server"){
        card.style.display = "block";
    }
    card.addEventListener("click", () => {
        // Remove highlight from all
        repoCards.forEach(c => c.classList.remove("selected"));
        // Highlight clicked
        card.classList.add("selected");
    });
});


// ---- Validate form ----
function validateForm() {
    const values = collectValues();
    const missingFields = [];

    if (!values.title) missingFields.push("Task Title");
    if (!values.description) missingFields.push("Description");
    if (!values.priority) missingFields.push("Priority");
    if (values.requiredCapabilities.length === 0) missingFields.push("Required Capabilities");
    if (values.requirements.length === 0) missingFields.push("Requirements");
    if (values.acceptanceCriteria.length === 0) missingFields.push("Acceptance Criteria");
    if (!values.assignedAgent) missingFields.push("Assigned Agent");
    if (!values.repo) missingFields.push("GitHub Project"); // new validation

    if (missingFields.length > 0) {
        alert("Please complete the following fields:\n- " + missingFields.join("\n- "));
        return false;
    }

    return true;
}

function resetModal() {
    // Reset text inputs and textarea
    titleInput.value = "";
    descriptionInput.value = "";
    estimatedTimeInput.value = 0;
    prioritySelect.value = "medium"; // default value

    // Reset required capabilities
    tags.forEach(tag => tag.classList.remove("selected"));

    // Reset requirements & acceptance criteria inputs
    [requirementContainer, acceptanceContainer].forEach(container => {
        // Remove all dynamic rows except the first
        const rows = Array.from(container.querySelectorAll(".add-row"));
        rows.forEach((row, i) => {
            if (i === 0) {
                // Clear the first input
                const input = row.querySelector("input");
                if (input) input.value = "";
            } else {
                row.remove();
            }
        });
    });

    // Reset GitHub project selection
    repoCards.forEach(card => card.classList.remove("selected"));

    // Reset agent selection
    agentCards.forEach(card => card.classList.remove("selected"));

    // Reset agent filtering (show all agents)
    agentCards.forEach(card => card.style.display = "block");
}
function addTask(taskData){
    let newTaskClone = task.cloneNode(true);
    let taskId = taskData.taskId;
    let userId = taskData.userId;
    let status = taskData.status;
    let title = taskData.title;
    let description = taskData.description;
    let priority = taskData.priority;
    let requirements = taskData.requirements;
    let acceptCrit = taskData.acceptCrit;
    let agentId = taskData.agentId;
    let assignedAgent = taskData.assignedAgent
    let repo = taskData.repo;
    let agentProcess = taskData.agentProcess;

    let cloneTitle = newTaskClone.querySelector(".task-title");
    let clonePriority = newTaskClone.querySelector(".task-priority ")
    let cloneRepo = newTaskClone.querySelector(".repoSelected");
    let cloneSelectedAgent = newTaskClone.querySelector(".agentSelected")
    let selectedColumn;

    newTaskClone.style.display = "block";
    cloneTitle.textContent = title
    clonePriority.textContent = priority;
    cloneRepo.textContent = "Repo: "+repo;
    cloneSelectedAgent.textContent = "Agent: "+assignedAgent;

    let cols = document.querySelectorAll(".column")
    for (let i = 0; i <cols.length;i++){
        if (cols[i].getAttribute("type") == status){
            selectedColumn = cols[i]
            break;
        }
    }

    selectedColumn.querySelector(".task-list").appendChild(newTaskClone);

}


// ---- Modal controls ----
function closeModal() {
    modal.style.display = "none";
}

closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

// ---- Create task ----
createBtn.addEventListener("click", () => {
    if (!validateForm()) return;
    const taskData = collectValues();
    console.log("Task Data:", taskData);
    addTask(taskData);
    closeModal();
});

// ---- Open modal ----
if (newBtn) {
    newBtn.addEventListener("click", () => {
        resetModal();
        addNewTaskPanel.style.display = "block";
    });
}

});