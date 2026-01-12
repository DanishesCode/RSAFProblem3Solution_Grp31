(function () {
    if (typeof document === "undefined") return;

    // --- helpers & state ---
    const PROCESS_INTERVALS = new Map(); // taskId -> interval id
    const PROCESS_LOGS = new Map();      // taskId -> array of log lines

    // --- style for panel ---
    const styleId = "inprg-styles";
    if (!document.getElementById(styleId)) {
        const s = document.createElement("style");
        s.id = styleId;
        s.textContent = `
            #inprg-panel {
                position: fixed;
                right: 24px;
                top: 24px;
                width: min(720px, 88vw);
                max-height: 84vh;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.28);
                z-index: 1400;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            }
            #inprg-panel .inprg-header { padding: 18px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; }
            #inprg-panel h3 { margin:0; font-size:20px; }
            #inprg-panel .inprg-body { padding: 16px 20px; overflow:auto; flex:1; }
            #inprg-panel .inprg-row { margin-bottom:12px; }
            #inprg-panel .badge { display:inline-block; padding:6px 10px; border-radius:999px; background:#f2f2f2; font-size:13px; }
            #inprg-panel .thinking { background:#fafafa; border:1px solid #eee; padding:12px; min-height:160px; max-height:44vh; overflow:auto; white-space:pre-wrap; font-family: monospace; font-size:13px; border-radius:8px;}
            #inprg-panel .inprg-footer { padding:12px 16px; border-top:1px solid #eee; display:flex; gap:8px; justify-content:flex-end; }
            #inprg-panel button { padding:8px 12px; border-radius:8px; border: none; cursor:pointer; }
            #inprg-panel .btn-close { background:transparent; font-size:18px; }
            #inprg-panel .btn-stop { background:#ef4444; color:#fff; }
            #inprg-panel .btn-pause { background:#f59e0b; color:#fff; }
            #inprg-panel .meta { color:#555; font-size:13px; }
        `;
        document.head.appendChild(s);
    }
    function getTimestamp() {
        const d = new Date();
        const YYYY = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `[${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}]`;
    }
    
    // --- create panel DOM ---
    let panel;
    function ensurePanel() {
        if (panel) return panel;
        panel = document.createElement("div");
        panel.id = "inprg-panel";
        panel.innerHTML = `
            <div class="inprg-header">
                <h3>Task In Progress</h3>
                <div>
                    <button class="btn-close" title="Close">✕</button>
                </div>
            </div>
            <div class="inprg-body">
                <div class="inprg-row"><strong class="title">Title</strong> <span class="badge priority"></span></div>
                <div class="inprg-row meta"><strong>Assigned AI Agent:</strong> <span class="agent"></span></div>
                <div class="inprg-row"><strong>Description</strong><div class="desc" style="margin-top:8px;"></div></div>
                <div class="inprg-row"><strong>AI Thinking Process</strong><div class="thinking" aria-live="polite"></div></div>
            </div>
            <div class="inprg-footer">
                <button class="btn-pause">Pause</button>
                <button class="btn-stop">Stop</button>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector(".btn-close").addEventListener("click", hidePanel);
        panel.querySelector(".btn-stop").addEventListener("click", () => {
            const tid = panel.getAttribute("data-taskid");
            if (tid) stopProcessForTask(tid);
            hidePanel();
        });
        panel.querySelector(".btn-pause").addEventListener("click", (e) => {
            const tid = panel.getAttribute("data-taskid");
            if (!tid) return;
            const btn = e.currentTarget;
            if (btn.dataset.paused === "1") {
                resumeProcessForTask(tid);
                btn.dataset.paused = "0";
                btn.textContent = "Pause";
            } else {
                pauseProcessForTask(tid);
                btn.dataset.paused = "1";
                btn.textContent = "Resume";
            }
        });

        return panel;
    }

    function tryParseJson(v) {
        if (!v) return null;
        try { return JSON.parse(v); } catch { return null; }
    }

    function showPanelForTask(taskEl) {
        if (!taskEl) return;
        const tId = taskEl.getAttribute("taskid");
        const p = ensurePanel();
        p.setAttribute("data-taskid", tId);
        p.querySelector(".title").textContent = taskEl.getAttribute("title") || "Untitled";
        p.querySelector(".priority").textContent = taskEl.getAttribute("priority") || "";
        p.querySelector(".agent").textContent = taskEl.getAttribute("assignedAgent") || "Unknown";
        p.querySelector(".desc").textContent = taskEl.getAttribute("description") || "";

        const thinkingEl = p.querySelector(".thinking");
        const stored = taskEl.getAttribute("agentProcess");
        const existing = PROCESS_LOGS.get(tId) || (stored ? tryParseJson(stored) || [stored] : []);
        PROCESS_LOGS.set(tId, existing);
        thinkingEl.innerHTML = existing.map(line => line.startsWith("```") ? `<pre>${line}</pre>` : line).join("\n");
        thinkingEl.scrollTop = thinkingEl.scrollHeight;

        p.style.display = "flex";
    }

    function hidePanel() {
        const p = ensurePanel();
        p.style.display = "none";
        p.removeAttribute("data-taskid");
    }

    function startProcessForTask(taskEl) {
        const tid = taskEl.getAttribute("taskid");
        if (!tid || PROCESS_INTERVALS.has(tid)) return;

        let log = PROCESS_LOGS.get(tid) || [];
        PROCESS_LOGS.set(tid, log);

        function updatePanel() {
            const p = ensurePanel();
            const thinkingEl = p.querySelector(".thinking");
            thinkingEl.innerHTML = log.map(line => line.startsWith("```") ? `<pre>${line}</pre>` : line).join("\n");
            thinkingEl.scrollTop = thinkingEl.scrollHeight;
        }

        taskEl.updateProcessLog = (chunk) => {
            const lineWithTimestamp = `${getTimestamp()} ${chunk}`;
            log.push(lineWithTimestamp);
            PROCESS_LOGS.set(tid, log);
            taskEl.setAttribute("agentProcess", JSON.stringify(log));
            updatePanel();
        };
        

        // No simulated interval; panel will update only from Gemini streaming
        PROCESS_INTERVALS.set(tid, null);

    }

    function stopProcessForTask(taskId) {
        if (PROCESS_INTERVALS.has(taskId)) {
            clearInterval(PROCESS_INTERVALS.get(taskId));
            PROCESS_INTERVALS.delete(taskId);
        }
        const taskEl = document.querySelector(`.task[taskid="${taskId}"]`);
        if (taskEl) taskEl.setAttribute("agentProcess", JSON.stringify(PROCESS_LOGS.get(taskId) || []));
    }

    function pauseProcessForTask(taskId) {
        if (PROCESS_INTERVALS.has(taskId)) clearInterval(PROCESS_INTERVALS.get(taskId));
    }

    function resumeProcessForTask(taskId) {
        const taskEl = document.querySelector(`.task[taskid="${taskId}"]`);
        if (taskEl) startProcessForTask(taskEl);
    }

    // --- observe progress column ---
    function observeProgressList() {
        const list = document.querySelector('.column[type="progress"] .task-list');
        if (!list) return;
        list.querySelectorAll('.task').forEach(task => startProcessForTask(task));

        const mo = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === "childList") {
                    m.addedNodes.forEach(node => node instanceof HTMLElement && node.classList.contains('task') && startProcessForTask(node));
                    m.removedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement) || !node.classList.contains('task')) return;
                        const tid = node.getAttribute('taskid');
                        if (tid) stopProcessForTask(tid);
                        if (panel && panel.getAttribute('data-taskid') === tid) hidePanel();
                    });
                }
            }
        });
        mo.observe(list, { childList: true });
    }

    // --- click to open panel ---
    document.addEventListener("click", e => {
        const t = e.target.closest('.task');
        if (!t || t.getAttribute('taskid') === 'TEMPLATE' || t.getAttribute("status") != "progress") return;
        startProcessForTask(t);
        showPanelForTask(t);
    });

    function init() {
        ensurePanel();
        panel.style.display = "none";
        observeProgressList();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
