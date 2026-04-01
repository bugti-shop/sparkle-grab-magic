import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, TodoItem } from '@/types/note';
import { loadNotesFromDB } from '@/utils/noteStorage';
import { loadTasksFromDB } from '@/utils/taskStorage';
import { FileText, CheckSquare, ExternalLink, Calendar, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface PreviewData {
  title: string;
  type: 'note' | 'task';
  snippet: string;
  date?: string;
  tags?: string[];
  priority?: string;
  completed?: boolean;
}

// Cache to avoid repeated DB reads
const previewCache = new Map<string, PreviewData>();

const fetchPreview = async (type: 'note' | 'task', id: string): Promise<PreviewData | null> => {
  const cacheKey = `${type}:${id}`;
  if (previewCache.has(cacheKey)) return previewCache.get(cacheKey)!;

  try {
    if (type === 'note') {
      const notes = await loadNotesFromDB();
      const note = notes.find((n: Note) => n.id === id);
      if (!note) return null;
      const snippet = (note.content || '').replace(/<[^>]*>/g, '').substring(0, 120).trim();
      const data: PreviewData = {
        title: note.title || 'Untitled Note',
        type: 'note',
        snippet: snippet || 'No content',
        date: note.updatedAt ? format(new Date(note.updatedAt), 'MMM d, yyyy') : undefined,
      };
      previewCache.set(cacheKey, data);
      return data;
    } else {
      const tasks = await loadTasksFromDB();
      const task = tasks.find((t: TodoItem) => t.id === id);
      if (!task) return null;
      const data: PreviewData = {
        title: task.text || 'Untitled Task',
        type: 'task',
        snippet: task.description?.substring(0, 120).trim() || 'No description',
        date: task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : undefined,
        priority: task.priority && task.priority !== 'none' ? task.priority : undefined,
        completed: task.completed,
      };
      previewCache.set(cacheKey, data);
      return data;
    }
  } catch {
    return null;
  }
};

interface MentionPreviewTooltipProps {
  type: 'note' | 'task';
  id: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const MentionPreviewTooltip = ({ type, id, position, onClose }: MentionPreviewTooltipProps) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchPreview(type, id).then((data) => {
      setPreview(data);
      setLoading(false);
    });
  }, [type, id]);

  // Adjust position to stay in viewport
  const adjustedLeft = Math.min(position.x, window.innerWidth - 280);
  const showAbove = position.y > window.innerHeight * 0.6;
  const top = showAbove ? position.y - 8 : position.y + 8;

  const isNote = type === 'note';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: showAbove ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: showAbove ? 6 : -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'fixed z-[10000] w-64 rounded-xl border shadow-xl overflow-hidden',
        'bg-popover border-border'
      )}
      style={{
        left: adjustedLeft,
        ...(showAbove ? { bottom: window.innerHeight - top } : { top }),
      }}
      onMouseLeave={onClose}
    >
      {loading ? (
        <div className="p-4 flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      ) : !preview ? (
        <div className="p-4 text-xs text-muted-foreground text-center">
          {type === 'note' ? 'Note' : 'Task'} not found
        </div>
      ) : (
        <>
          {/* Header bar */}
          <div className={cn(
            'px-3 py-2 flex items-center gap-2',
            isNote ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-green-50 dark:bg-green-950/40'
          )}>
            {isNote ? (
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            ) : (
              <CheckSquare className={cn(
                'h-3.5 w-3.5 flex-shrink-0',
                preview.completed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )} />
            )}
            <span className="text-sm font-semibold truncate flex-1">{preview.title}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-50" />
          </div>

          {/* Content snippet */}
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {preview.snippet}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {preview.date && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <Calendar className="h-2.5 w-2.5" />
                  {preview.date}
                </span>
              )}
              {preview.priority && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  preview.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  preview.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                )}>
                  {preview.priority}
                </span>
              )}
              {preview.completed !== undefined && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  preview.completed
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {preview.completed ? '✓ Done' : 'In progress'}
                </span>
              )}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-border/50 bg-muted/30">
            <span className="text-[10px] text-muted-foreground/60">Click to open</span>
          </div>
        </>
      )}
    </motion.div>
  );
};

// Hook to manage hover preview state
export const useMentionPreview = () => {
  const [preview, setPreview] = useState<{ type: 'note' | 'task'; id: string; position: { x: number; y: number } } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPreview = useCallback((type: 'note' | 'task', id: string, x: number, y: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPreview({ type, id, position: { x, y } });
    }, 400); // 400ms delay to avoid flicker
  }, []);

  const hidePreview = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPreview(null);
    }, 150);
  }, []);

  const keepPreview = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { preview, showPreview, hidePreview, keepPreview };
};

// Clear cache when data changes
export const clearMentionPreviewCache = () => previewCache.clear();
