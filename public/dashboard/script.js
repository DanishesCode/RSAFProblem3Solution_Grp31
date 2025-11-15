document.addEventListener("DOMContentLoaded",async function(){
    const apiBaseUrl = "http://localhost:3000";

    const taskData = {
        labels: ["To-Do", "In Progress", "In Review", "Done", "Cancelled"],
        values: [15, 20, 12, 18, 15],
        colors: ["#4D4D5B", "#1D27DA", "#181FAA", "#15D94A", "#F71E21"],
      };
      
      // Total Tasks Count
      const total = taskData.values.reduce((a, b) => a + b, 0);
      document.getElementById("totalCount").innerText = total;
      
      // Chart.js Initialization
      const ctx = document.getElementById("taskChart").getContext("2d");

    const taskChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: taskData.labels,
            datasets: [{
                data: taskData.values,
                backgroundColor: taskData.colors,
                borderWidth: 2,
            }],
        },
        options: {
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1200,
                easing: 'easeOutQuart'
            },
            cutout: "60%",
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
            },
        },
    });

        function updateChart(newValues) {
            taskChart.data.datasets[0].data = newValues;
        
            const newTotal = newValues.reduce((a, b) => a + b, 0);
            document.getElementById("totalCount").innerText = newTotal;
        
            taskChart.update();
        }
    

      async function intializeLogs(){
        let todo = 0;
        let progress = 0;
        let review = 0;
        let done = 0;
        let cancel = 0;
        let userId = localStorage.getItem("userId");
        const logs = await fetch(`/backlog/getUserLogs?userId=${1}`)
                        .then(res => res.json());
                        logs.forEach(function(data) {
                            let status = data.status
                            if (status === "toDo") {
                                todo += 1;
                            } else if (status === "progress") {
                                progress += 1;
                            } else if (status === "review") {
                                review += 1;
                            } else if (status === "done") {
                                done += 1;
                            } else if (status === "cancel") {
                                cancel += 1;
                            }
                        });
        return [todo,progress,review,done,cancel];
    }
    updateChart(await intializeLogs());
})

  