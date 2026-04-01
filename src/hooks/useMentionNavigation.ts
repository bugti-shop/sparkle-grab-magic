import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type MentionNavigationTarget = {
  type: 'note' | 'task';
  id: string;
  createdAt: number;
};

const PENDING_MENTION_KEY = 'pending-mention-navigation';

const readPendingMentionNavigation = (): MentionNavigationTarget | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_MENTION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MentionNavigationTarget;
    if (!parsed?.id || !parsed?.type) return null;
    if (Date.now() - parsed.createdAt > 15000) {
      window.sessionStorage.removeItem(PENDING_MENTION_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(PENDING_MENTION_KEY);
    return null;
  }
};

export const getPendingMentionNavigation = () => readPendingMentionNavigation();

export const setPendingMentionNavigation = (target: Omit<MentionNavigationTarget, 'createdAt'>) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    PENDING_MENTION_KEY,
    JSON.stringify({ ...target, createdAt: Date.now() } satisfies MentionNavigationTarget)
  );
};

export const clearPendingMentionNavigation = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_MENTION_KEY);
};

/**
 * Global hook that listens for mention-navigate custom events
 * and navigates to the appropriate note/task.
 * 
 * Dispatches a custom event that the Notes/Today pages can handle
 * to open the specific note or task editor.
 */
export const useMentionNavigation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const dispatchOpenEvent = (type: 'note' | 'task', id: string) => {
      window.dispatchEvent(
        new CustomEvent(type === 'note' ? 'open-note' : 'open-task', { detail: { id } })
      );
    };

    const handler = (e: CustomEvent<{ type: string; id: string }>) => {
      const { type, id } = e.detail;
      if (type === 'note') {
        setPendingMentionNavigation({ type: 'note', id });
        navigate('/notes');
        dispatchOpenEvent('note', id);
        window.setTimeout(() => dispatchOpenEvent('note', id), 150);
        window.setTimeout(() => dispatchOpenEvent('note', id), 500);
      } else if (type === 'task') {
        setPendingMentionNavigation({ type: 'task', id });
        navigate('/todo/today');
        dispatchOpenEvent('task', id);
        window.setTimeout(() => dispatchOpenEvent('task', id), 150);
        window.setTimeout(() => dispatchOpenEvent('task', id), 500);
      }
    };

    window.addEventListener('mention-navigate', handler as EventListener);
    return () => window.removeEventListener('mention-navigate', handler as EventListener);
  }, [navigate]);
};
