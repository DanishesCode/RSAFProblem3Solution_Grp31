document.addEventListener("DOMContentLoaded",function(){
    const taskData = {
        labels: ["To-Do", "In Progress", "In Review", "Done", "Cancelled"],
        values: [15, 20, 12, 18, 15],
        colors: ["#C9B59C", "#1A3EE0", "#2F6FFF", "#17D64A", "#FF2D2D"],
      };
      
      // Total Tasks Count
      const total = taskData.values.reduce((a, b) => a + b, 0);
      document.getElementById("totalCount").innerText = total;
      
      // Chart.js Initialization
      const ctx = document.getElementById("taskChart").getContext("2d");
      
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: taskData.labels,
          datasets: [
            {
              data: taskData.values,
              backgroundColor: taskData.colors,
              borderWidth: 2,
            },
          ],
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
        // Update the chart data
        taskChart.data.datasets[0].data = newValues;
        
        // Optional: update the total count
        const newTotal = newValues.reduce((a, b) => a + b, 0);
        document.getElementById("totalCount").innerText = newTotal;
        
        // Refresh the chart
        taskChart.update();
      }

      
})

  