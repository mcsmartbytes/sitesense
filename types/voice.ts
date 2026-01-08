// Voice Assistant Type Definitions

export type CommandType =
  | 'navigation'
  | 'add_expense'
  | 'log_time'
  | 'add_todo'
  | 'search'
  | 'unknown';

export interface ParsedCommand {
  type: CommandType;
  confidence: number;
  params: Record<string, any>;
  rawText: string;
}

export interface VoiceAssistantState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  confidence: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  navigateTo?: string;
  error?: string;
}

export interface VoiceAssistantConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

// Route mapping for navigation commands
export const ROUTE_MAP: Record<string, string> = {
  'jobs': '/jobs',
  'job': '/jobs',
  'expenses': '/expenses',
  'expense': '/expenses',
  'time': '/time-tracking',
  'time tracking': '/time-tracking',
  'timetracking': '/time-tracking',
  'todos': '/todos',
  'todo': '/todos',
  'tasks': '/todos',
  'task': '/todos',
  'reports': '/reports',
  'report': '/reports',
  'dashboard': '/expense-dashboard',
  'home': '/expense-dashboard',
  'contacts': '/contacts',
  'contact': '/contacts',
  'mileage': '/mileage',
  'budgets': '/budgets',
  'budget': '/budgets',
  'receipts': '/receipts',
  'receipt': '/receipts',
  'settings': '/settings',
  'estimates': '/estimates',
  'estimate': '/estimates',
  'crew': '/crew',
  'team': '/crew',
  'scheduler': '/scheduler',
  'schedule': '/scheduler',
  'tools': '/tools',
  'subcontractors': '/subcontractors',
  'subs': '/subcontractors',
};
