const columns = document.querySelectorAll(".column");

/* ===========================================================
   Utility: Ensure element has updateProcessLog
   =========================================================== */
function ensureUpdateProcessLog(element) {
    if (!element.updateProcessLog) {
        element.updateProcessLog = (chunk) => {
            // fallback so no output gets lost
            console.log("ProcessLog (fallback):", chunk);
        };
    }
}


/* ===========================================================
   🌟 GEMINI STREAMING
   =========================================================== */
async function geminiPrompt(element) {
    ensureUpdateProcessLog(element);

    const prompt = element.getAttribute("requirements") || "Default prompt";
    const acceptance = element.getAttribute("acceptCrit") || "Nil";
    const formattedPrompt = `(Prompt: ${prompt}) (Acceptance Criteria: ${acceptance})`;

    const prePrompt = `You are a Frontend AI Agent whose goal is to help the user create high-quality frontend scripts, components, utilities, and documentation for GitHub repositories by strictly following their prompt, acceptance criteria, and requirements; analyze requests deeply, ask clarifying questions when needed, generate production-ready JS/TS/HTML/CSS/React code using best practices with modularity and performance in mind, provide file-ready code with minimal helpful comments, avoid inventing requirements, suggest improvements when appropriate, and respond with a professional, helpful, precise, developer-focused tone using clear code blocks separated by filename and brief optional explanations only; begin each response with a concise explanation/summary of the approach and decisions, then display the complete code blocks below.`;

    element.setAttribute("agentProcess", "");

    const response = await fetch('/ai/gemini/stream', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: formattedPrompt, prePrompt })
    });

    if (!response.ok) return console.error("Gemini server error", response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
            let chunk = decoder.decode(value, { stream: true });
            chunk = chunk.replace(/^data: /gm, "");

            const current = element.getAttribute("agentProcess") || "";
            element.setAttribute("agentProcess", current + chunk);
            element.updateProcessLog(chunk);

            console.log("Gemini chunk:", chunk);
        }
    }

    console.log("Gemini streaming complete");
}


/* ===========================================================
   🤖 OPENAI STREAMING
   =========================================================== */
async function openaiPrompt(element) {
    ensureUpdateProcessLog(element);

    const prompt = element.getAttribute("requirements") || "Default prompt";
    const acceptance = element.getAttribute("acceptCrit") || "Nil";
    const formattedPrompt = `(Prompt: ${prompt}) (Acceptance Criteria: ${acceptance})`;

    const prePrompt = `You are a UI/UX Frontend AI Agent whose goal is to help the user create high-quality, user-centered interfaces, components, layouts, and frontend implementations for modern web applications. Your job is to deeply analyze the user’s prompt, requirements, and acceptance criteria, focusing on clarity, accessibility, usability, and consistency.

Follow these rules strictly:
• Always think and respond like a UI/UX designer AND a frontend engineer.
• Prioritize usability principles: clarity, hierarchy, affordance, consistency, feedback, and minimal cognitive load.
• When giving design choices, briefly explain the UX reasoning.
• When writing code, generate production-ready HTML/CSS/JS/React using clean structure, responsive layouts, semantic markup, and mobile-first practices.
• Keep code modular, readable, and scalable.
• Follow design systems and component principles.
• Do NOT invent new features not stated in the prompt.
• Ask clarifying questions only when needed.
• Output begins with a short summary, then well-formatted code blocks.
Your tone must be professional, clear, precise, and designer-focused.`;

    element.setAttribute("agentProcess", "");

    const response = await fetch('/ai/openai/stream', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: formattedPrompt, prePrompt })
    });

    if (!response.ok) return console.error("OpenAI server error", response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let done = false;

    while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
            let chunk = decoder.decode(value, { stream: true });

            // keep formatting
            chunk = chunk.replace(/^data: /gm, "");

            const current = element.getAttribute("agentProcess") || "";
            element.setAttribute("agentProcess", current + chunk);
            element.updateProcessLog(chunk);

            console.log("OpenAI chunk:", chunk);
        }
    }

    console.log("OpenAI streaming complete");
}



/* ===========================================================
   🔍 MUTATION OBSERVER – DETECT NEW TASKS
   =========================================================== */
const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
        if (m.type === "childList") {
            m.addedNodes.forEach(node => {

                if (!node.getAttribute) return;

                const agent = node.getAttribute("assignedagent");

                if (agent === "Gemini") {
                    console.log("Gemini task detected:", node);
                    geminiPrompt(node);
                }

                if (agent === "OpenAI") {
                    console.log("OpenAI task detected:", node);
                    openaiPrompt(node);
                }
            });
        }
    }
});


/* ===========================================================
   🚀 START OBSERVING PROGRESS COLUMN
   =========================================================== */
function observeProgressColumn() {
    const progressColumn = Array.from(columns).find(c => c.getAttribute("type") === "progress");
    if (!progressColumn) return console.warn("No progress column found!");

    const taskList = progressColumn.querySelector(".task-list");
    if (!taskList) return console.warn("No .task-list found!");

    observer.observe(taskList, { childList: true });

    console.log("Observer started for progress column");

    // Process tasks already inside column
    taskList.querySelectorAll('[assignedagent="Gemini"]').forEach(node => geminiPrompt(node));
    taskList.querySelectorAll('[assignedagent="OpenAI"]').forEach(node => openaiPrompt(node));
}


document.addEventListener("DOMContentLoaded", observeProgressColumn);
