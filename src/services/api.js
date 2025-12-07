const API_BASE_URL = '';

export async function initializeLogs(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/backlog/getUserLogs?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const logs = await response.json();
    return logs.map(log => ({
      taskid: log.taskid,
      title: log.title || '',
      description: log.description || '',
      priority: log.priority || 'medium',
      status: log.status || 'toDo',
      repo: log.repo || '',
      agentId: log.agentId || log.agentid,
      assignedAgent: log.assignedAgent || log.agentName || mapAgentIdToName(log.agentId || log.agentid),
      agentName: log.assignedAgent || log.agentName || mapAgentIdToName(log.agentId || log.agentid),
      requirements: parseArray(log.requirements),
      acceptCrit: parseArray(log.acceptanceCriteria),
      progress: 0,
      agentProcess: log.agentProcess || ''
    }));
  } catch (error) {
    console.error('Error initializing logs:', error);
    return [];
  }
}

export async function saveBacklog(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/backlog/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!response.ok) throw new Error('Failed to save task');
    return await response.json();
  } catch (error) {
    console.error('Error saving backlog:', error);
    throw error;
  }
}

export async function updateTaskStatus(taskId, newStatus) {
  try {
    const response = await fetch(`${API_BASE_URL}/backlog/status-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status: newStatus })
    });
    if (!response.ok) throw new Error('Failed to update status');
    return await response.json();
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function mapAgentIdToName(id) {
  switch (String(id)) {
    case '1': return 'Claude';
    case '2': return 'Gemini';
    case '3': return 'OpenAI';
    default: return 'Unknown';
  }
}

