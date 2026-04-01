import { useState, useEffect, useRef, useCallback } from 'react';
import { Note, TodoItem } from '@/types/note';
import { loadNotesFromDB } from '@/utils/noteStorage';
import { loadTasksFromDB } from '@/utils/taskStorage';
import { FileText, CheckSquare, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const RECENT_MENTIONS_KEY = 'recent_mentions';
const MAX_RECENT = 3;

const getRecentMentions = (): MentionItem[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_MENTIONS_KEY) || '[]');
  } catch { return []; }
};

const saveRecentMention = (item: MentionItem) => {
  const recent = getRecentMentions().filter(r => r.id !== item.id);
  recent.unshift(item);
  localStorage.setItem(RECENT_MENTIONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

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
const MentionItemButton = ({ item, index, selectedIndex, onSelect, setSelectedIndex }: {
  item: MentionItem; index: number; selectedIndex: number;
  onSelect: (item: MentionItem) => void; setSelectedIndex: (i: number) => void;
}) => (
  <button
    onClick={() => onSelect(item)}
    onMouseEnter={() => setSelectedIndex(index)}
    className={cn(
      'w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors',
      index === selectedIndex ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/50 text-foreground'
    )}
  >
    <div className={cn(
      'mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center',
      item.type === 'note' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
    )}>
      {item.type === 'note' ? (
        <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      ) : (
        <CheckSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{item.title}</div>
      {item.preview && (
        <div className="text-xs text-muted-foreground truncate mt-0.5">{item.preview}</div>
      )}
    </div>
  </button>
);

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
  const [recentMentions, setRecentMentions] = useState<MentionItem[]>([]);
  const [dropdownPos, setDropdownPos] = useState(position || { top: 0, left: 0 });

  // Load recent mentions
  useEffect(() => {
    if (isOpen) setRecentMentions(getRecentMentions());
  }, [isOpen]);

  // Wrap onSelect to save recent
  const handleSelect = useCallback((item: MentionItem) => {
    saveRecentMention(item);
    onSelect(item);
  }, [onSelect]);

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

  // Recent items that match query and exist in current items
  const filteredRecent = !query
    ? recentMentions.filter(r => items.some(i => i.id === r.id))
    : recentMentions.filter(r => items.some(i => i.id === r.id) && r.title.toLowerCase().includes(query.toLowerCase()));

  // All selectable items for keyboard nav: recent + filtered (excluding duplicates)
  const recentIds = new Set(filteredRecent.map(r => r.id));
  const nonRecentFiltered = filteredItems.filter(i => !recentIds.has(i.id));
  const allSelectableItems = [...filteredRecent, ...nonRecentFiltered];

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
        setSelectedIndex((prev) => Math.min(prev + 1, allSelectableItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if ((e.key === 'Enter' || e.key === 'Tab') && allSelectableItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(allSelectableItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, allSelectableItems, selectedIndex, handleSelect, onClose]
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
          {allSelectableItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query ? 'No matches found' : mentionType === 'all' ? 'No notes or tasks available' : `No ${mentionType} available`}
            </div>
          ) : (
            <div className="py-1">
              {/* Recent mentions section */}
              {filteredRecent.length > 0 && (
                <>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</span>
                  </div>
                  {filteredRecent.map((item, index) => (
                    <MentionItemButton key={`recent-${item.id}`} item={item} index={index} selectedIndex={selectedIndex} onSelect={handleSelect} setSelectedIndex={setSelectedIndex} />
                  ))}
                </>
              )}

              {/* Grouped notes & tasks */}
              {mentionType === 'all' ? (
                <>
                  {(() => {
                    const noteItems = nonRecentFiltered.filter(i => i.type === 'note');
                    const taskItems = nonRecentFiltered.filter(i => i.type === 'task');
                    let globalIndex = filteredRecent.length;

                    return (
                      <>
                        {noteItems.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-border/50 mt-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">{noteItems.length}</span>
                            </div>
                            {noteItems.slice(0, 10).map((item) => {
                              const idx = globalIndex++;
                              return (
                                <MentionItemButton key={item.id} item={item} index={idx} selectedIndex={selectedIndex} onSelect={handleSelect} setSelectedIndex={setSelectedIndex} />
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
                                <MentionItemButton key={item.id} item={item} index={idx} selectedIndex={selectedIndex} onSelect={handleSelect} setSelectedIndex={setSelectedIndex} />
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                nonRecentFiltered.slice(0, 20).map((item, index) => (
                  <MentionItemButton key={item.id} item={item} index={index + filteredRecent.length} selectedIndex={selectedIndex} onSelect={handleSelect} setSelectedIndex={setSelectedIndex} />
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
