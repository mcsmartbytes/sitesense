import type { ParsedCommand, CommandType } from '@/types/voice';
import { ROUTE_MAP } from '@/types/voice';

// Command patterns for matching voice input
const PATTERNS = {
  navigation: [
    /^(?:go\s+to|open|show|navigate\s+to|take\s+me\s+to)\s+(.+)$/i,
    /^(.+)\s+page$/i,
  ],
  add_expense: [
    /^(?:add|new|create|log)\s+(?:an?\s+)?expense\s+(?:of\s+)?\$?(\d+(?:\.\d{1,2})?)\s+(?:dollars?\s+)?(?:for|at|to|on)\s+(.+)$/i,
    /^expense\s+\$?(\d+(?:\.\d{1,2})?)\s+(?:for|at)\s+(.+)$/i,
    /^(?:add|log)\s+\$?(\d+(?:\.\d{1,2})?)\s+expense\s+(?:for|at)\s+(.+)$/i,
    /^(?:spent|spend)\s+\$?(\d+(?:\.\d{1,2})?)\s+(?:on|at|for)\s+(.+)$/i,
  ],
  log_time: [
    /^(?:log|add|record)\s+(\d+(?:\.\d+)?)\s+hours?\s+(?:for|to|on)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s+hours?\s+(?:for|to|on)\s+(.+)$/i,
    /^(?:log|add)\s+time\s+(\d+(?:\.\d+)?)\s+hours?\s+(?:for|to|on)\s+(.+)$/i,
    /^(?:worked|work)\s+(\d+(?:\.\d+)?)\s+hours?\s+(?:on|for)\s+(.+)$/i,
  ],
  add_todo: [
    /^(?:add|create|new)\s+(?:a\s+)?(?:task|todo|reminder)\s+(.+?)(?:\s+due\s+(.+))?$/i,
    /^(?:remind\s+me\s+to|remember\s+to)\s+(.+?)(?:\s+(?:by|on|due)\s+(.+))?$/i,
    /^(?:task|todo):\s*(.+?)(?:\s+due\s+(.+))?$/i,
  ],
  search: [
    /^(?:find|search|show|list|get)\s+(?:all\s+)?(.+?)(?:\s+from\s+(.+))?$/i,
    /^(?:what|how\s+many)\s+(.+)$/i,
  ],
};

// Parse relative dates like "tomorrow", "next Friday", "in 3 days"
export function parseRelativeDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const normalized = dateStr.toLowerCase().trim();
  const today = new Date();

  // Today
  if (normalized === 'today') {
    return formatDate(today);
  }

  // Tomorrow
  if (normalized === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return formatDate(tomorrow);
  }

  // In X days
  const inDaysMatch = normalized.match(/^in\s+(\d+)\s+days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    return formatDate(futureDate);
  }

  // Next [day of week]
  const nextDayMatch = normalized.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextDayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return formatDate(nextDate);
  }

  // This [day of week]
  const thisDayMatch = normalized.match(/^(?:this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (thisDayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(thisDayMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return formatDate(nextDate);
  }

  // End of week (Friday)
  if (normalized === 'end of week' || normalized === 'end of the week') {
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    return formatDate(friday);
  }

  // Next week
  if (normalized === 'next week') {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return formatDate(nextWeek);
  }

  return null;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse amount from voice (handles "fifty dollars", "$50", "50")
function parseAmount(text: string): number | null {
  // Direct number
  const numMatch = text.match(/\$?(\d+(?:\.\d{1,2})?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }
  return null;
}

// Find matching route from navigation command
function findRoute(text: string): string | null {
  const normalized = text.toLowerCase().trim();

  // Direct match
  if (ROUTE_MAP[normalized]) {
    return ROUTE_MAP[normalized];
  }

  // Partial match
  for (const [key, route] of Object.entries(ROUTE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return route;
    }
  }

  return null;
}

// Main command parser
export function parseCommand(transcript: string): ParsedCommand {
  const text = transcript.trim();

  if (!text) {
    return {
      type: 'unknown',
      confidence: 0,
      params: {},
      rawText: text,
    };
  }

  // Try navigation patterns
  for (const pattern of PATTERNS.navigation) {
    const match = text.match(pattern);
    if (match) {
      const route = findRoute(match[1]);
      if (route) {
        return {
          type: 'navigation',
          confidence: 0.95,
          params: { route, destination: match[1] },
          rawText: text,
        };
      }
    }
  }

  // Try expense patterns
  for (const pattern of PATTERNS.add_expense) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseAmount(match[1]);
      if (amount !== null) {
        return {
          type: 'add_expense',
          confidence: 0.9,
          params: {
            amount,
            description: match[2].trim(),
            date: formatDate(new Date()),
          },
          rawText: text,
        };
      }
    }
  }

  // Try time logging patterns
  for (const pattern of PATTERNS.log_time) {
    const match = text.match(pattern);
    if (match) {
      const hours = parseFloat(match[1]);
      if (!isNaN(hours) && hours > 0) {
        return {
          type: 'log_time',
          confidence: 0.9,
          params: {
            hours,
            jobName: match[2].trim(),
            date: formatDate(new Date()),
          },
          rawText: text,
        };
      }
    }
  }

  // Try todo patterns
  for (const pattern of PATTERNS.add_todo) {
    const match = text.match(pattern);
    if (match) {
      const dueDate = match[2] ? parseRelativeDate(match[2]) : null;
      return {
        type: 'add_todo',
        confidence: 0.85,
        params: {
          title: match[1].trim(),
          dueDate,
        },
        rawText: text,
      };
    }
  }

  // Try search patterns
  for (const pattern of PATTERNS.search) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'search',
        confidence: 0.7,
        params: {
          query: match[1].trim(),
          timeFrame: match[2] ? match[2].trim() : null,
        },
        rawText: text,
      };
    }
  }

  // Unknown command
  return {
    type: 'unknown',
    confidence: 0,
    params: {},
    rawText: text,
  };
}

// Fuzzy match job name against list of jobs
export function findBestJobMatch(
  spokenName: string,
  jobs: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  if (!jobs || jobs.length === 0) return null;

  const normalized = spokenName.toLowerCase().trim();

  // Exact match
  const exact = jobs.find(j => j.name.toLowerCase() === normalized);
  if (exact) return exact;

  // Starts with
  const startsWith = jobs.find(j => j.name.toLowerCase().startsWith(normalized));
  if (startsWith) return startsWith;

  // Contains
  const contains = jobs.find(j =>
    j.name.toLowerCase().includes(normalized) ||
    normalized.includes(j.name.toLowerCase())
  );
  if (contains) return contains;

  // Word matching (at least one word matches)
  const spokenWords = normalized.split(/\s+/);
  for (const job of jobs) {
    const jobWords = job.name.toLowerCase().split(/\s+/);
    const hasMatch = spokenWords.some(sw =>
      jobWords.some(jw => jw.includes(sw) || sw.includes(jw))
    );
    if (hasMatch) return job;
  }

  return null;
}

// Get command suggestions for display
export function getCommandSuggestions(): string[] {
  return [
    '"Go to jobs"',
    '"Add expense $50 for materials"',
    '"Log 2 hours for Kitchen Remodel"',
    '"Add task review blueprints due tomorrow"',
    '"Show active jobs"',
  ];
}
