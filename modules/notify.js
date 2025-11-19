// notify.js
// Extracted notification system from script.js (unchanged)

export function notify(message, duration = 2500, type = "error") {
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
