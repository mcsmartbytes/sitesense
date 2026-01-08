import type { ParsedCommand, CommandResult } from '@/types/voice';

/**
 * Execute a parsed voice command by calling the appropriate API endpoint
 */
export async function executeVoiceCommand(
  command: ParsedCommand,
  userId: string
): Promise<CommandResult> {
  try {
    switch (command.type) {
      case 'add_expense':
        return await createExpense(userId, command.params as {
          amount: number;
          description: string;
          date: string;
          vendor?: string;
          jobId?: string;
        });

      case 'log_time':
        return await logTimeEntry(userId, command.params as {
          hours: number;
          jobName: string;
          jobId?: string;
          resolvedJobName?: string;
          date: string;
          notes?: string;
        });

      case 'add_todo':
        return await createTodo(userId, command.params as {
          title: string;
          dueDate?: string | null;
          priority?: 'low' | 'medium' | 'high';
          jobId?: string;
        });

      case 'search':
        return await performSearch(userId, command.params as {
          query: string;
          timeFrame?: string;
        });

      case 'navigation':
        // Navigation is handled client-side in VoiceAssistant component
        return {
          success: true,
          message: `Navigating to ${command.params.destination}`,
          navigateTo: command.params.route,
        };

      default:
        return {
          success: false,
          message: 'Unknown command type.',
          error: 'unknown_command',
        };
    }
  } catch (error) {
    console.error('Voice command execution error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      error: 'execution_error',
    };
  }
}

/**
 * Create an expense via the API
 */
async function createExpense(
  userId: string,
  params: {
    amount: number;
    description: string;
    date: string;
    vendor?: string;
    jobId?: string;
  }
): Promise<CommandResult> {
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount: params.amount,
      description: params.description,
      date: params.date,
      vendor: params.vendor || null,
      job_id: params.jobId || null,
      is_business: true,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      message: data.error || 'Failed to create expense.',
      error: 'api_error',
    };
  }

  return {
    success: true,
    message: `Added expense: $${params.amount.toFixed(2)} for ${params.description}`,
    data: {
      id: data.data?.id,
      amount: params.amount,
      description: params.description,
      date: params.date,
    },
    navigateTo: '/expenses',
  };
}

/**
 * Log a time entry via the API
 */
async function logTimeEntry(
  userId: string,
  params: {
    hours: number;
    jobName: string;
    jobId?: string;
    resolvedJobName?: string;
    date: string;
    notes?: string;
  }
): Promise<CommandResult> {
  const response = await fetch('/api/time-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      hours: params.hours,
      date: params.date,
      job_id: params.jobId || null,
      notes: params.notes || `Voice entry: ${params.jobName}`,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      message: data.error || 'Failed to log time.',
      error: 'api_error',
    };
  }

  const jobDisplay = params.resolvedJobName || params.jobName;
  const jobMessage = params.jobId
    ? ` for ${jobDisplay}`
    : ` (job "${params.jobName}" not found, logged without job)`;

  return {
    success: true,
    message: `Logged ${params.hours} hour${params.hours !== 1 ? 's' : ''}${jobMessage}`,
    data: {
      id: data.data?.id,
      hours: params.hours,
      job_name: params.resolvedJobName || params.jobName,
      job_matched: !!params.jobId,
      date: params.date,
    },
    navigateTo: '/time-tracking',
  };
}

/**
 * Create a todo/task via the API
 */
async function createTodo(
  userId: string,
  params: {
    title: string;
    dueDate?: string | null;
    priority?: 'low' | 'medium' | 'high';
    jobId?: string;
  }
): Promise<CommandResult> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      title: params.title,
      due_date: params.dueDate || null,
      priority: params.priority || 'medium',
      job_id: params.jobId || null,
      status: 'pending',
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      message: data.error || 'Failed to create task.',
      error: 'api_error',
    };
  }

  const dueMessage = params.dueDate ? ` (due ${params.dueDate})` : '';

  return {
    success: true,
    message: `Created task: "${params.title}"${dueMessage}`,
    data: {
      id: data.data?.id,
      title: params.title,
      due_date: params.dueDate,
    },
    navigateTo: '/todos',
  };
}

/**
 * Perform a search query
 */
async function performSearch(
  userId: string,
  params: {
    query: string;
    timeFrame?: string;
  }
): Promise<CommandResult> {
  const query = params.query.toLowerCase();

  // Determine what to search for
  if (query.includes('job') || query.includes('project')) {
    const response = await fetch(`/api/jobs?user_id=${userId}`);
    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        message: 'Failed to search jobs.',
        error: 'api_error',
      };
    }

    // Filter by status if specified
    let jobs = data.data || [];
    if (query.includes('active')) {
      jobs = jobs.filter((j: any) => j.status === 'active');
    } else if (query.includes('completed')) {
      jobs = jobs.filter((j: any) => j.status === 'completed');
    } else if (query.includes('planned')) {
      jobs = jobs.filter((j: any) => j.status === 'planned');
    }

    return {
      success: true,
      message: `Found ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`,
      data: { count: jobs.length, items: jobs.slice(0, 5) },
      navigateTo: '/jobs',
    };
  }

  if (query.includes('expense')) {
    const response = await fetch(`/api/expenses?user_id=${userId}&limit=20`);
    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        message: 'Failed to search expenses.',
        error: 'api_error',
      };
    }

    const expenses = data.data || [];
    const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    return {
      success: true,
      message: `Found ${expenses.length} expense${expenses.length !== 1 ? 's' : ''} totaling $${total.toFixed(2)}`,
      data: { count: expenses.length, total },
      navigateTo: '/expenses',
    };
  }

  if (query.includes('time') || query.includes('hour')) {
    const response = await fetch(`/api/time-entries?user_id=${userId}&limit=20`);
    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        message: 'Failed to search time entries.',
        error: 'api_error',
      };
    }

    const entries = data.data || [];
    const totalHours = entries.reduce((sum: number, t: any) => sum + Number(t.hours), 0);

    return {
      success: true,
      message: `Found ${entries.length} time entr${entries.length !== 1 ? 'ies' : 'y'} totaling ${totalHours.toFixed(1)} hours`,
      data: { count: entries.length, totalHours },
      navigateTo: '/time-tracking',
    };
  }

  if (query.includes('task') || query.includes('todo')) {
    const response = await fetch(`/api/todos?user_id=${userId}`);
    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        message: 'Failed to search tasks.',
        error: 'api_error',
      };
    }

    let todos = data.data || [];
    if (query.includes('pending') || query.includes('open')) {
      todos = todos.filter((t: any) => t.status === 'pending');
    } else if (query.includes('completed') || query.includes('done')) {
      todos = todos.filter((t: any) => t.status === 'completed');
    }

    return {
      success: true,
      message: `Found ${todos.length} task${todos.length !== 1 ? 's' : ''}`,
      data: { count: todos.length },
      navigateTo: '/todos',
    };
  }

  // Generic search - navigate to dashboard
  return {
    success: true,
    message: `Searching for "${params.query}"...`,
    navigateTo: '/expense-dashboard',
  };
}
