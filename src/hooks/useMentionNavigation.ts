import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    const handler = (e: CustomEvent<{ type: string; id: string }>) => {
      const { type, id } = e.detail;
      if (type === 'note') {
        // Navigate to notes page and dispatch open-note event
        navigate('/notes');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-note', { detail: { id } }));
        }, 300);
      } else if (type === 'task') {
        // Navigate to today page and dispatch open-task event
        navigate('/todo/today');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-task', { detail: { id } }));
        }, 300);
      }
    };

    window.addEventListener('mention-navigate', handler as EventListener);
    return () => window.removeEventListener('mention-navigate', handler as EventListener);
  }, [navigate]);
};
