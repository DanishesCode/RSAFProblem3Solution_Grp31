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

    const progressTasks = tasks.filter((t) => t.status === 'progress');

    progressTasks.forEach((task) => {
      const taskId = task.taskid;
      const taskKey = `${taskId}-${task.status}`;

      // Skip if already streaming
      if (streamingTasks.current.has(taskId)) return;

      // Skip if we've already processed this task in this status
      if (processedTasksRef.current.has(taskKey)) return;

      // For this version, ALL agents (Claude, Gemini, OpenAI) use the same OpenRouter stream
      streamingTasks.current.add(taskId);
      processedTasksRef.current.add(taskKey);

      startStreaming(task, onUpdateTaskRef.current, () => {
        streamingTasks.current.delete(taskId);
      });
    });

    // Clean up processed tasks that are no longer in progress
    const currentProgressIds = new Set(progressTasks.map((t) => t.taskid));
    processedTasksRef.current.forEach((key) => {
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
    : task.requirements || '';

  const userPrompt = task.prompt || '';
  const requirementsPrompt = requirements ? `\n\nRequirements: ${requirements}` : '';
  const formattedPrompt = `${userPrompt}${requirementsPrompt}`;

  const prePrompt =
    "You are an expert software engineer. The user prompt and requirements describe changes to a codebase. STRICT RULES:\n" +
    "1) ONLY return code and necessary file headers/imports.\n" +
    '2) DO NOT return any natural language explanation, comments, or markdown like ```.\n' +
    "3) If multiple files are needed, concatenate them one after another with clear file path comments like // file: src/file.js.\n" +
    "4) Prefer complete, ready-to-paste files or functions.\n" +
    "5) Never invent requirements beyond what is in the prompt + requirements.\n";

  try {
    // Initialize empty process log
    onUpdateTask(task.taskid, { agentProcess: '' });

    const response = await fetch('/ai/openrouter/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt: formattedPrompt, prePrompt }),
    });

    if (!response.ok) {
      console.error('OpenRouter streaming server error', response.status);
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
        // Remove any "data: " prefixes from SSE formatting
        chunk = chunk.replace(/^data:\s*/gm, '');
        accumulated += chunk;

        // Update task with accumulated process log
        onUpdateTask(task.taskid, { agentProcess: accumulated });
      }
    }

    console.log('OpenRouter streaming complete for task:', task.taskid);
    onComplete();
  } catch (error) {
    console.error('Error during OpenRouter streaming:', error);
    onComplete();
  }
}

