import { useCallback } from 'react';
import { parseMentions, ParsedMention } from '@/utils/mentionUtils';
import { FileText, CheckSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { MentionPreviewTooltip, useMentionPreview } from './MentionPreviewTooltip';

interface MentionRendererProps {
  text: string;
  onMentionClick?: (type: 'note' | 'task', id: string) => void;
  className?: string;
}

/**
 * Renders text with @mentions displayed as styled quote blocks.
 * Notes mentions show with a blue quote style, task mentions with green.
 * Hover to see a content preview tooltip.
 */
export const MentionRenderer = ({ text, onMentionClick, className }: MentionRendererProps) => {
  const mentions = parseMentions(text);
  const { preview, showPreview, hidePreview } = useMentionPreview();

  const handleClick = useCallback(
    (mention: ParsedMention) => {
      onMentionClick?.(mention.type, mention.id);
    },
    [onMentionClick]
  );

  if (mentions.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Split text into segments: regular text + mention blocks
  const segments: Array<{ type: 'text' | 'mention'; content: string; mention?: ParsedMention }> = [];
  let lastIndex = 0;

  mentions.forEach((mention) => {
    if (mention.index > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, mention.index) });
    }
    segments.push({ type: 'mention', content: mention.title, mention });
    lastIndex = mention.index + mention.fullMatch.length;
  });

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <span className={cn('inline', className)}>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return <span key={i}>{segment.content}</span>;
        }

        const mention = segment.mention!;
        const isNote = mention.type === 'note';

        return (
          <span
            key={i}
            onClick={() => handleClick(mention)}
            onMouseEnter={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              showPreview(mention.type, mention.id, rect.left, rect.bottom);
            }}
            onMouseLeave={hidePreview}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick(mention)}
            className={cn(
              'inline-flex items-center gap-1.5 my-1 px-3 py-1.5 rounded-lg cursor-pointer transition-all',
              'border-l-[3px] text-sm font-medium',
              isNote
                ? 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                : 'bg-green-50 dark:bg-green-950/30 border-l-green-500 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40'
            )}
          >
            {isNote ? (
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="truncate max-w-[200px]">{mention.title}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
          </span>
        );
      })}

      {/* Hover preview tooltip */}
      <AnimatePresence>
        {preview && (
          <MentionPreviewTooltip
            type={preview.type}
            id={preview.id}
            position={preview.position}
            onClose={hidePreview}
          />
        )}
      </AnimatePresence>
    </span>
  );
};
