document.addEventListener("DOMContentLoaded", async function () {
    const userId = localStorage.getItem("userId");
  
    // Fetch logs from backend
    const res = await fetch(`/backlog/getUserLogs?userId=${userId}`);
    const logs = await res.json();
  
    // Sidebar elements
    const sidebar = document.querySelector(".filter-sidebar");
    const openBtn = document.querySelector(".filters");
    const closeBtn = sidebar.querySelector(".close-btn");
    const applyBtn = sidebar.querySelector(".apply-btn");
    const subtitle = document.querySelector(".subtitle");
  
    // Open/close sidebar
    openBtn.addEventListener("click", () => {
      sidebar.style.display = "flex";
      requestAnimationFrame(() => sidebar.classList.add("open"));
    });
    closeBtn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebar.addEventListener(
        "transitionend",
        () => { if (!sidebar.classList.contains("open")) sidebar.style.display = "none"; },
        { once: true }
      );
    });
  
    // Track selected filters
    const selectedFilters = {
      repository: new Set(),
      aiAgent: new Set(),
      priority: new Set(),
    };
  
   
    const repoSection = sidebar.querySelector(".filter-section"); 
    const scrollable = repoSection.querySelector(".scrollable");
    scrollable.innerHTML = ""; // clear existing buttons
  
    const reposString = localStorage.getItem("repos");
    const repos = reposString ? reposString.split(",") : [];
  
    repos.forEach((repo) => {
      const btn = document.createElement("button");
      btn.textContent = repo;
      btn.value = repo;
      btn.addEventListener("click", () => {
        btn.classList.toggle("selected");
        if (btn.classList.contains("selected")) selectedFilters.repository.add(repo);
        else selectedFilters.repository.delete(repo);
      });
      scrollable.appendChild(btn);
    });
  
 
    const sections = sidebar.querySelectorAll(".filter-section");
  
    sections.forEach((section, index) => {
      const title = section.querySelector("h3").innerText;
      let key;
  
      if (title === "Ai Agent") key = "aiAgent";
      else if (title === "Priority") key = "priority";
      else return;
  
      const buttons = section.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          btn.classList.toggle("selected");
          if (btn.classList.contains("selected")) selectedFilters[key].add(btn.value);
          else selectedFilters[key].delete(btn.value);
        });
      });
    });
  

    const taskData = {
      labels: ["To-Do", "In Progress", "In Review", "Done", "Cancelled"],
      colors: ["#4D4D5B", "#1D27DA", "#181FAA", "#15D94A", "#F71E21"],
    };
  
    const ctx = document.getElementById("taskChart").getContext("2d");
    const taskChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: taskData.labels,
        datasets: [{
          data: [0, 0, 0, 0, 0],
          backgroundColor: taskData.colors,
          borderWidth: 2
        }],
      },
      options: {
        cutout: "60%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
      },
    });
  
    function updateChartWithLogs(filteredLogs) {
      const counts = { toDo: 0, progress: 0, review: 0, done: 0, cancel: 0 };
      filteredLogs.forEach((log) => {
        if (log.status === "toDo") counts.toDo++;
        else if (log.status === "progress") counts.progress++;
        else if (log.status === "review") counts.review++;
        else if (log.status === "done") counts.done++;
        else if (log.status === "cancel") counts.cancel++;
      });
  
      const values = [
        counts.toDo,
        counts.progress,
        counts.review,
        counts.done,
        counts.cancel
      ];
      document.getElementById("totalCount").innerText = values.reduce((a, b) => a + b, 0);
      taskChart.data.datasets[0].data = values;
      taskChart.update();
    }
  
    updateChartWithLogs(logs);

    applyBtn.addEventListener("click", () => {
      const filteredLogs = logs.filter((log) => {
        if (selectedFilters.repository.size && !selectedFilters.repository.has(log.repo)) return false;
        if (selectedFilters.aiAgent.size && !selectedFilters.aiAgent.has(log.agentName)) return false;
        if (selectedFilters.priority.size && !selectedFilters.priority.has(log.priority)) return false;
        return true;
      });
  
      // Update chart
      updateChartWithLogs(filteredLogs);
  
      const filterTexts = [];
      if (selectedFilters.repository.size) filterTexts.push(`Repository: ${[...selectedFilters.repository].join(", ")}`);
      if (selectedFilters.aiAgent.size) filterTexts.push(`AI Agent: ${[...selectedFilters.aiAgent].join(", ")}`);
      if (selectedFilters.priority.size) filterTexts.push(`Priority: ${[...selectedFilters.priority].join(", ")}`);
  
      subtitle.textContent = filterTexts.length > 0 ? `Filters: ${filterTexts.join(" | ")}` : "Filters: None";
  
      sidebar.classList.remove("open");
      sidebar.addEventListener(
        "transitionend",
        () => (sidebar.style.display = "none"),
        { once: true }
      );
    });

    document.querySelector(".back").addEventListener("click",function(){
        window.location.href = "../index.html";
    })
  });
  