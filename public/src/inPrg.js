(function () {
    if (typeof document === "undefined") return;

    // --- helpers & state ---
    const PROCESS_INTERVALS = new Map(); // taskId -> interval id
    const PROCESS_LOGS = new Map();      // taskId -> array of log lines

    function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    const SAMPLE_THINKING = [
        "Parsing requirements and constraints...",
        "Evaluating repository structure and dependencies...",
        "Generating implementation plan...",
        "Selecting API endpoints and data model...",
        "Drafting unit tests for core logic...",
        "Estimating runtime complexity and trade-offs...",
        "Refining prompts for agent sub-tasks...",
        "Simulating edge cases and error handling...",
        "Packaging changes and preparing commit message...",
        "Running local static analysis (simulated)...",
        "Summarizing progress and next steps..."
    ];

    // --- style for inprg card ---
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

    // --- panel show/hide ---
    function showPanelForTask(taskEl) {
        if (!taskEl) return;
        const tId = taskEl.getAttribute("taskid");
        const title = taskEl.getAttribute("title") || taskEl.querySelector(".task-title")?.textContent || "Untitled";
        const priority = taskEl.getAttribute("priority") || "";
        const desc = taskEl.getAttribute("description") || taskEl.querySelector(".task-description")?.textContent || "";
        const agent = taskEl.getAttribute("assignedAgent") || taskEl.querySelector(".agentSelected")?.textContent?.replace(/^Agent:\s*/i, "") || "Unknown";

        const p = ensurePanel();
        p.setAttribute("data-taskid", tId);
        p.querySelector(".title").textContent = title;
        p.querySelector(".priority").textContent = priority;
        p.querySelector(".agent").textContent = agent;
        p.querySelector(".desc").textContent = desc;

        // fill thinking area from stored log
        const thinkingEl = p.querySelector(".thinking");
        const stored = taskEl.getAttribute("agentProcess");
        const existing = PROCESS_LOGS.get(tId) || (stored ? (Array.isArray(stored) ? stored : tryParseJson(stored) || [stored]) : []);
        PROCESS_LOGS.set(tId, existing);
        thinkingEl.textContent = existing.join("\n");

        // scroll to bottom
        thinkingEl.scrollTop = thinkingEl.scrollHeight;

        p.style.display = "flex";
    }

    function hidePanel() {
        const p = ensurePanel();
        p.style.display = "none";
        p.removeAttribute("data-taskid");
    }

    // --- process lifecycle ---
    function tryParseJson(v) {
        if (!v) return null;
        try { return JSON.parse(v); } catch { return null; }
    }

    function startProcessForTask(taskEl) {
        if (!taskEl) return;
        const tid = taskEl.getAttribute("taskid");
        if (!tid) return;
        // already running?
        if (PROCESS_INTERVALS.has(tid)) return;

        // initialize log
        let log = PROCESS_LOGS.get(tid) || [];
        if (!Array.isArray(log)) log = [];
        log.push(`[${timestamp()}] Agent started working on task.`);
        PROCESS_LOGS.set(tid, log);
        taskEl.setAttribute("agentProcess", JSON.stringify(log));

        // interval to append simulated thinking output
        const interval = setInterval(() => {
            // produce a new line
            const line = SAMPLE_THINKING.map(() => randChoice(SAMPLE_THINKING)).slice(0,1)[0];
            log.push(`[${timestamp()}] ${line}`);
            // keep log reasonably sized
            if (log.length > 200) log = log.slice(log.length - 200);
            PROCESS_LOGS.set(tid, log);
            taskEl.setAttribute("agentProcess", JSON.stringify(log));

            // if panel visible for this task update it
            const p = panel;
            if (p && p.getAttribute("data-taskid") === tid) {
                const thinkingEl = p.querySelector(".thinking");
                thinkingEl.textContent = log.join("\n");
                thinkingEl.scrollTop = thinkingEl.scrollHeight;
            }
        }, 1400 + Math.floor(Math.random() * 1600));

        PROCESS_INTERVALS.set(tid, interval);
        // expose small activity entry
        window.pushActivity?.({
            title: taskEl.getAttribute("title"),
            agent: taskEl.getAttribute("assignedAgent"),
            status: "Started (In Progress)",
            priority: taskEl.getAttribute("priority"),
            repo: taskEl.getAttribute("repo"),
            percent: 10
        });
    }

    function stopProcessForTask(taskId) {
        if (PROCESS_INTERVALS.has(taskId)) {
            clearInterval(PROCESS_INTERVALS.get(taskId));
            PROCESS_INTERVALS.delete(taskId);
        }
        // persist log to DOM attr (already done during ticks)
        const taskEl = document.querySelector(`.task[taskid="${taskId}"]`);
        if (taskEl) {
            const log = PROCESS_LOGS.get(taskId) || [];
            taskEl.setAttribute("agentProcess", JSON.stringify(log));
        }
        // optionally push activity
        window.pushActivity?.({
            title: taskEl?.getAttribute("title") || "Task",
            agent: taskEl?.getAttribute("assignedAgent") || "",
            status: "Stopped (In Progress)",
            priority: taskEl?.getAttribute("priority") || "",
            repo: taskEl?.getAttribute("repo") || "",
            percent: 0
        });
    }

    function pauseProcessForTask(taskId) {
        if (PROCESS_INTERVALS.has(taskId)) {
            clearInterval(PROCESS_INTERVALS.get(taskId));
            PROCESS_INTERVALS.delete(taskId);
        }
    }

    function resumeProcessForTask(taskId) {
        const taskEl = document.querySelector(`.task[taskid="${taskId}"]`);
        if (taskEl) startProcessForTask(taskEl);
    }

    function timestamp() {
        const d = new Date();
        return d.toLocaleTimeString();
    }

    // --- observe progress column for added/removed tasks ---
    function observeProgressList() {
        const list = document.querySelector('.column[type="progress"] .task-list');
        if (!list) return;

        // initial existing tasks in progress: start their processes
        list.querySelectorAll('.task').forEach(task => {
            startProcessForTask(task);
        });

        const mo = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === "childList") {
                    // added nodes -> start process
                    m.addedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement)) return;
                        if (!node.classList.contains('task')) return;
                        startProcessForTask(node);
                    });
                    // removed nodes -> stop process (if moved out)
                    m.removedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement)) return;
                        if (!node.classList.contains('task')) return;
                        const tid = node.getAttribute('taskid');
                        if (tid) {
                            stopProcessForTask(tid);
                            // if panel is showing this task, hide it
                            if (panel && panel.getAttribute('data-taskid') === tid) hidePanel();
                        }
                    });
                }
            }
        });

        mo.observe(list, { childList: true });
    }

    // --- click handler: open big card for tasks in progress ---
    document.addEventListener("click", (e) => {
        const t = e.target.closest('.task');
        if (!t) return;
        // only for tasks currently inside progress column
        const col = t.closest('.column');
        if (!col || col.getAttribute('type') !== 'progress') return;
        // ignore template
        if (t.getAttribute && t.getAttribute('taskid') === 'TEMPLATE') return;

        // ensure panel exists and start process if not already
        startProcessForTask(t);
        showPanelForTask(t);
    });

    // --- initialize on DOM ready ---
    function init() {
        ensurePanel();
        // initially hide panel
        panel.style.display = "none";
        observeProgressList();

        // also observe if progress column is added later or columns reorder
        const containerObserver = new MutationObserver(() => {
            const list = document.querySelector('.column[type="progress"] .task-list');
            if (list) observeProgressList();
        });
        containerObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();