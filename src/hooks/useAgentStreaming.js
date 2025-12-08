import { useEffect, useRef } from 'react';

export function useAgentStreaming(tasks, onUpdateTask) {
  const streamingTasks = useRef(new Set());
  const onUpdateTaskRef = useRef(onUpdateTask);
  const processedTasksRef = useRef(new Set());

  // Keep the ref updated
  useEffect(() => {
    onUpdateTaskRef.current = onUpdateTask;
  }, [onUpdateTask]);

  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    
    const progressTasks = tasks.filter(t => t.status === 'progress');
    
    progressTasks.forEach(task => {
      const taskId = task.taskid;
      const taskKey = `${taskId}-${task.status}`;
      
      // Skip if already streaming
      if (streamingTasks.current.has(taskId)) return;
      
      // Skip if we've already processed this task in this status
      if (processedTasksRef.current.has(taskKey)) return;
      
      const agent = task.assignedAgent;
      if (!agent || agent === 'Claude') {
        processedTasksRef.current.add(taskKey);
        return; // Claude doesn't stream
      }
      
      // Start streaming for Gemini or OpenAI
      if (agent === 'Gemini' || agent === 'OpenAI') {
        streamingTasks.current.add(taskId);
        processedTasksRef.current.add(taskKey);
        startStreaming(task, onUpdateTaskRef.current, () => {
          streamingTasks.current.delete(taskId);
        });
      }
    });
    
    // Clean up processed tasks that are no longer in progress
    const currentProgressIds = new Set(progressTasks.map(t => t.taskid));
    processedTasksRef.current.forEach(key => {
      const taskId = key.split('-')[0];
      if (!currentProgressIds.has(taskId)) {
        processedTasksRef.current.delete(key);
      }
    });
  }, [tasks]);
}

async function startStreaming(task, onUpdateTask, onComplete) {
  const requirements = Array.isArray(task.requirements) 
    ? task.requirements.join(', ') 
    : task.requirements || 'Default prompt';
  const acceptance = Array.isArray(task.acceptCrit)
    ? task.acceptCrit.join(', ')
    : task.acceptCrit || 'Nil';
  const formattedPrompt = `(Prompt: ${requirements}) (Acceptance Criteria: ${acceptance})`;

  let prePrompt;
  let endpoint;
  
  if (task.assignedAgent === 'Gemini') {
    prePrompt = `You are a Frontend AI Agent whose goal is to help the user create high-quality frontend scripts, components, utilities, and documentation for GitHub repositories by strictly following their prompt, acceptance criteria, and requirements; analyze requests deeply, ask clarifying questions when needed, generate production-ready JS/TS/HTML/CSS/React code using best practices with modularity and performance in mind, provide file-ready code with minimal helpful comments, avoid inventing requirements, suggest improvements when appropriate, and respond with a professional, helpful, precise, developer-focused tone using clear code blocks separated by filename and brief optional explanations only; begin each response with a concise explanation/summary of the approach and decisions, then display the complete code blocks below.`;
    endpoint = '/ai/gemini/stream';
  } else if (task.assignedAgent === 'OpenAI') {
    prePrompt = `You are a UI/UX Frontend AI Agent whose goal is to help the user create high-quality, user-centered interfaces, components, layouts, and frontend implementations for modern web applications. Your job is to deeply analyze the user's prompt, requirements, and acceptance criteria, focusing on clarity, accessibility, usability, and consistency.

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
    endpoint = '/ai/openai/stream';
  } else {
    return;
  }

  try {
    // Initialize empty process log
    onUpdateTask(task.taskid, { agentProcess: '' });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt: formattedPrompt, prePrompt })
    });

    if (!response.ok) {
      console.error('Streaming server error', response.status);
      onComplete();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;

      if (value) {
        let chunk = decoder.decode(value, { stream: true });
        chunk = chunk.replace(/^data: /gm, '');
        accumulated += chunk;
        
        // Update task with accumulated process log
        onUpdateTask(task.taskid, { agentProcess: accumulated });
      }
    }

    console.log('Streaming complete for task:', task.taskid);
    onComplete();
  } catch (error) {
    console.error('Error during streaming:', error);
    onComplete();
  }
}

