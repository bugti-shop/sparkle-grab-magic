import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, TodoItem } from '@/types/note';
import { loadNotesFromDB } from '@/utils/noteStorage';
import { loadTasksFromDB } from '@/utils/taskStorage';
import { FileText, CheckSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MentionItem {
  id: string;
  title: string;
  type: 'note' | 'task';
  preview?: string;
}

interface MentionDropdownProps {
  isOpen: boolean;
  mentionType: 'notes' | 'tasks' | 'all';
  query: string;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  position?: { top: number; left: number };
  anchorRef?: React.RefObject<HTMLElement>;
}

export const MentionDropdown = ({
  isOpen,
  mentionType,
  query,
  onSelect,
  onClose,
  position,
  anchorRef,
}: MentionDropdownProps) => {
  const [items, setItems] = useState<MentionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState(position || { top: 0, left: 0 });

  // Load data
  useEffect(() => {
    if (!isOpen) return;

    const loadItems = async () => {
      if (mentionType === 'all') {
        const [notes, tasks] = await Promise.all([loadNotesFromDB(), loadTasksFromDB()]);
        const noteItems = notes
          .filter((n: Note) => !n.isDeleted && !n.isArchived)
          .map((n: Note) => ({
            id: n.id,
            title: n.title || 'Untitled Note',
            type: 'note' as const,
            preview: n.content?.replace(/<[^>]*>/g, '').substring(0, 60) || '',
          }));
        const taskItems = tasks
          .filter((t: TodoItem) => !t.completed)
          .map((t: TodoItem) => ({
            id: t.id,
            title: t.text || 'Untitled Task',
            type: 'task' as const,
            preview: t.description?.substring(0, 60) || '',
          }));

        setItems([...noteItems, ...taskItems]);
      } else if (mentionType === 'notes') {
        const notes = await loadNotesFromDB();
        const filtered = notes
          .filter((n: Note) => !n.isDeleted && !n.isArchived)
          .map((n: Note) => ({
            id: n.id,
            title: n.title || 'Untitled Note',
            type: 'note' as const,
            preview: n.content?.replace(/<[^>]*>/g, '').substring(0, 60) || '',
          }));
        setItems(filtered);
      } else {
        const tasks = await loadTasksFromDB();
        const filtered = tasks
          .filter((t: TodoItem) => !t.completed)
          .map((t: TodoItem) => ({
            id: t.id,
            title: t.text || 'Untitled Task',
            type: 'task' as const,
            preview: t.description?.substring(0, 60) || '',
          }));
        setItems(filtered);
      }
    };

    loadItems();
  }, [isOpen, mentionType]);

  // Filter by query
  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Position dropdown near anchor
  useEffect(() => {
    if (position) {
      setDropdownPos(position);
    } else if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [position, anchorRef, isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if ((e.key === 'Enter' || e.key === 'Tab') && filteredItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filteredItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, filteredItems, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[9999] w-72 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl"
          style={{ top: dropdownPos.top, left: Math.min(dropdownPos.left, window.innerWidth - 300) }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-popover border-b border-border px-3 py-2 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {mentionType === 'all'
                ? 'Mention a Note or Task'
                : mentionType === 'notes'
                  ? 'Mention a Note'
                  : 'Mention a Task'}
            </span>
            {query && (
              <span className="text-xs text-primary ml-auto">"{query}"</span>
            )}
          </div>

          {/* Items */}
          {filteredItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query ? 'No matches found' : mentionType === 'all' ? 'No notes or tasks available' : `No ${mentionType} available`}
            </div>
          ) : (
            <div className="py-1">
              {mentionType === 'all' ? (
                <>
                  {(() => {
                    const noteItems = filteredItems.filter(i => i.type === 'note');
                    const taskItems = filteredItems.filter(i => i.type === 'task');
                    let globalIndex = 0;

                    return (
                      <>
                        {noteItems.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">{noteItems.length}</span>
                            </div>
                            {noteItems.slice(0, 10).map((item) => {
                              const idx = globalIndex++;
                              return (
                                <MentionItemButton key={item.id} item={item} index={idx} selectedIndex={selectedIndex} onSelect={onSelect} setSelectedIndex={setSelectedIndex} />
                              );
                            })}
                          </>
                        )}
                        {taskItems.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50 mt-1">
                              <CheckSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">{taskItems.length}</span>
                            </div>
                            {taskItems.slice(0, 10).map((item) => {
                              const idx = globalIndex++;
                              return (
                                <MentionItemButton key={item.id} item={item} index={idx} selectedIndex={selectedIndex} onSelect={onSelect} setSelectedIndex={setSelectedIndex} />
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                filteredItems.slice(0, 20).map((item, index) => (
                  <MentionItemButton key={item.id} item={item} index={index} selectedIndex={selectedIndex} onSelect={onSelect} setSelectedIndex={setSelectedIndex} />
                ))
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export type { MentionItem };
