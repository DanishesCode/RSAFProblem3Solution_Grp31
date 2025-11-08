// Simulate agent workload every few seconds
    const agents = document.querySelectorAll('.agent-status.working');
    setInterval(() => {
        agents.forEach(a => {
            const random = Math.floor(Math.random() * 75) + 5;
            a.textContent = `Working - ${random}%`;
        });
    }, 2000);