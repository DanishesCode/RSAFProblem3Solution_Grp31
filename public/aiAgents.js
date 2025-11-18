const columns = document.querySelectorAll(".column");

async function geminiPrompt(element) {
    const prompt = element.getAttribute("requirements") || "Default prompt";
    const acceptance = element.getAttribute("acceptCrit") || "Nil";
    const formattedPrompt = `(Prompt: ${prompt}) (Acceptance Criteria: ${acceptance})`;
    const prePrompt = `You are a Frontend AI Agent whose goal is to help the user create high-quality frontend scripts, components, utilities, and documentation for GitHub repositories by strictly following their prompt, acceptance criteria, and requirements; analyze requests deeply, ask clarifying questions when needed, generate production-ready JS/TS/HTML/CSS/React code using best practices with modularity and performance in mind, provide file-ready code with minimal helpful comments, avoid inventing requirements, suggest improvements when appropriate, and respond with a professional, helpful, precise, developer-focused tone using clear code blocks separated by filename and brief optional explanations only; begin each response with a concise explanation/summary of the approach and decisions, then display the complete code blocks below.`;

    element.setAttribute("agentProcess", ""); // clear previous

    const response = await fetch('/ai/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: formattedPrompt, prePrompt })
    });

    if (!response.ok) return console.error("Server error", response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
            let chunk = decoder.decode(value, { stream: true });
            chunk = chunk.replace(/^data: /gm, '').trim();

            // Append to element and update panel
            const current = element.getAttribute("agentProcess") || "";
            element.setAttribute("agentProcess", current + chunk);

            if (element.updateProcessLog) element.updateProcessLog(chunk);

            console.log("agentProcess so far:", element.getAttribute("agentProcess"));
        }
    }

    console.log("Streaming finished for element:", element);
}

// --- observe new tasks ---
const observer = new MutationObserver(mutationsList => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach(node => {
                if (node.getAttribute && node.getAttribute("assignedagent") === "Gemini") {
                    console.log("New Gemini task detected:", node);
                    geminiPrompt(node);
                }
            });
        }
    }
});

function observeProgressColumn() {
    const progressColumn = Array.from(columns).find(col => col.getAttribute("type") === "progress");
    if (!progressColumn) return console.warn("No progress column found!");
    const progressSect = progressColumn.querySelector(".task-list");
    if (!progressSect) return console.warn("No .task-list inside progress column!");
    observer.observe(progressSect, { childList: true, subtree: false });
    console.log("Observer started on progress column");

    progressSect.querySelectorAll('[assignedagent="Gemini"]').forEach(node => geminiPrompt(node));
}

document.addEventListener("DOMContentLoaded", () => observeProgressColumn());
