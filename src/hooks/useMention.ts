import { useState, useCallback, useRef, useEffect } from 'react';
import { detectMentionTrigger, encodeMention, MentionTrigger } from '@/utils/mentionUtils';
import { MentionItem } from '@/components/MentionDropdown';

interface UseMentionOptions {
  text: string;
  setText: (text: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
}

export const useMention = ({ text, setText, inputRef }: UseMentionOptions) => {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionType, setMentionType] = useState<'notes' | 'tasks' | 'all'>('all');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const checkForMention = useCallback(() => {
    const el = inputRef?.current;
    if (!el) return;

    const cursorPos = el.selectionStart ?? text.length;
    const trigger = detectMentionTrigger(text, cursorPos);

    if (trigger) {
      setMentionType(trigger.type);
      setMentionQuery(trigger.query);
      setMentionTrigger(trigger);
      setMentionOpen(true);

      // Position dropdown near the input
      const rect = el.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + 16,
      });
    } else {
      setMentionOpen(false);
      setMentionTrigger(null);
    }
  }, [text, inputRef]);

  const handleMentionSelect = useCallback(
    (item: MentionItem) => {
      if (!mentionTrigger) return;

      const before = text.substring(0, mentionTrigger.startIndex);
      const after = text.substring(mentionTrigger.endIndex);

      const mentionText = encodeMention(item.type, item.id, item.title);
      const newText = before + mentionText + ' ' + after;

      setText(newText);
      setMentionOpen(false);
      setMentionTrigger(null);

      // Refocus input
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 50);
    },
    [text, setText, mentionTrigger, inputRef]
  );

  const closeMention = useCallback(() => {
    setMentionOpen(false);
    setMentionTrigger(null);
  }, []);

  return {
    mentionOpen,
    mentionType,
    mentionQuery,
    dropdownPos,
    checkForMention,
    handleMentionSelect,
    closeMention,
  };
};
