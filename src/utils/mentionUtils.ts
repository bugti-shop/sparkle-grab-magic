/**
 * @mention system utilities
 * Syntax: @[note:ID:Title] or @[task:ID:Title]
 * Rendered as quote-style blocks with click-to-navigate
 */

// Encode a mention into storable text format
export const encodeMention = (type: 'note' | 'task', id: string, title: string): string => {
  const safeTitle = title.replace(/]/g, '\\]');
  return `@[${type}:${id}:${safeTitle}]`;
};

// Regex to match mention syntax
const MENTION_REGEX = /@\[(note|task):([^:]+):([^\]]*(?:\\][^\]]*)*)\]/g;

export interface ParsedMention {
  type: 'note' | 'task';
  id: string;
  title: string;
  fullMatch: string;
  index: number;
}

// Parse all mentions from text
export const parseMentions = (text: string): ParsedMention[] => {
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, 'g');
  
  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      type: match[1] as 'note' | 'task',
      id: match[2],
      title: match[3].replace(/\\]/g, ']'),
      fullMatch: match[0],
      index: match.index,
    });
  }
  
  return mentions;
};

// Check if text contains any mentions
export const hasMentions = (text: string): boolean => {
  return MENTION_REGEX.test(text);
};

// Convert plain text with mention syntax to HTML for rendering
export const mentionsToHtml = (text: string): string => {
  return text.replace(MENTION_REGEX, (_, type, id, title) => {
    const safeTitle = title.replace(/\\]/g, ']');
    const icon = type === 'note' ? '📝' : '✅';
    const label = type === 'note' ? 'Note' : 'Task';
    return `<span class="mention-block" data-mention-type="${type}" data-mention-id="${id}" role="button" tabindex="0">${icon} <span class="mention-label">${label}:</span> ${safeTitle}</span>`;
  });
};

// Convert HTML mention blocks back to mention syntax for storage
export const htmlToMentions = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  div.querySelectorAll('.mention-block').forEach((el) => {
    const type = el.getAttribute('data-mention-type') as 'note' | 'task';
    const id = el.getAttribute('data-mention-id') || '';
    // Extract title text (after the label)
    const textContent = el.textContent || '';
    const colonIndex = textContent.indexOf(':');
    const title = colonIndex >= 0 ? textContent.substring(colonIndex + 1).trim() : textContent.trim();
    const mentionText = encodeMention(type, id, title);
    el.replaceWith(mentionText);
  });
  
  return div.innerHTML;
};

// Detect if user is typing an @mention trigger
export interface MentionTrigger {
  type: 'notes' | 'tasks' | 'all';
  query: string;
  startIndex: number;
  endIndex: number;
  searchText: string;
}

export const detectMentionTrigger = (text: string, cursorPosition: number): MentionTrigger | null => {
  const beforeCursor = text.substring(0, cursorPosition);

  const typedMatch = beforeCursor.match(/(^|[\s([{])@(notes?|tasks?)(?:\s+([^\n]*))?$/i);
  if (typedMatch) {
    const prefix = typedMatch[1] ?? '';
    const keyword = typedMatch[2].toLowerCase();
    const query = typedMatch[3] ?? '';
    const startIndex = beforeCursor.length - typedMatch[0].length + prefix.length;

    return {
      type: keyword.startsWith('task') ? 'tasks' : 'notes',
      query,
      startIndex,
      endIndex: cursorPosition,
      searchText: beforeCursor.substring(startIndex),
    };
  }

  const allMatch = beforeCursor.match(/(^|[\s([{])@$/);
  if (allMatch) {
    const prefix = allMatch[1] ?? '';
    const startIndex = beforeCursor.length - allMatch[0].length + prefix.length;

    return {
      type: 'all',
      query: '',
      startIndex,
      endIndex: cursorPosition,
      searchText: '@',
    };
  }
  
  return null;
};
