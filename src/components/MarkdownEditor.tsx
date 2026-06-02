'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image,
  Minus,
  Eye,
  Edit3,
  PanelLeft,
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly: boolean;
  fileName: string;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
}

type ViewMode = 'editor' | 'split' | 'preview';

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarActions: ToolbarAction[] = [
  { icon: <Bold size={15} />, label: 'Bold', prefix: '**', suffix: '**' },
  { icon: <Italic size={15} />, label: 'Italic', prefix: '_', suffix: '_' },
  { icon: <Code size={15} />, label: 'Inline Code', prefix: '`', suffix: '`' },
  { icon: <Heading1 size={15} />, label: 'Heading 1', prefix: '# ', suffix: '', block: true },
  { icon: <Heading2 size={15} />, label: 'Heading 2', prefix: '## ', suffix: '', block: true },
  { icon: <Heading3 size={15} />, label: 'Heading 3', prefix: '### ', suffix: '', block: true },
  { icon: <List size={15} />, label: 'Bullet List', prefix: '- ', suffix: '', block: true },
  { icon: <ListOrdered size={15} />, label: 'Ordered List', prefix: '1. ', suffix: '', block: true },
  { icon: <Quote size={15} />, label: 'Quote', prefix: '> ', suffix: '', block: true },
  { icon: <Link2 size={15} />, label: 'Link', prefix: '[', suffix: '](url)' },
  { icon: <Image size={15} />, label: 'Image', prefix: '![alt](', suffix: ')' },
  { icon: <Minus size={15} />, label: 'Horizontal Rule', prefix: '\n---\n', suffix: '', block: true },
];

export default function MarkdownEditor({
  content,
  onChange,
  readOnly,
  fileName,
  saveStatus = 'saved',
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(readOnly ? 'preview' : 'split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (readOnly) setViewMode('preview');
  }, [readOnly]);

  const insertFormat = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const before = content.substring(0, start);
      const after = content.substring(end);

      let newText: string;
      let newCursorStart: number;
      let newCursorEnd: number;

      if (action.block && !selected) {
        // Block-level: insert at line beginning
        const lineStart = before.lastIndexOf('\n') + 1;
        const beforeLine = content.substring(0, lineStart);
        const afterLine = content.substring(lineStart);
        newText = beforeLine + action.prefix + afterLine;
        newCursorStart = lineStart + action.prefix.length;
        newCursorEnd = newCursorStart;
      } else {
        newText = before + action.prefix + (selected || 'text') + action.suffix + after;
        newCursorStart = start + action.prefix.length;
        newCursorEnd = newCursorStart + (selected || 'text').length;
      }

      onChange(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [content, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + '  ' + content.substring(end);
        onChange(newContent);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [content, onChange]
  );

  // Line numbers
  const lineCount = content.split('\n').length;

  return (
    <div className="editor">
      {/* Toolbar */}
      {!readOnly && (
        <div className="editor__toolbar">
          <div className="editor__toolbar-left">
            {toolbarActions.map((action, i) => (
              <button
                key={i}
                className="btn-icon"
                style={{ width: 30, height: 30 }}
                title={action.label}
                onClick={() => insertFormat(action)}
              >
                {action.icon}
              </button>
            ))}
          </div>
          <div className="editor__toolbar-right">
            <span className={`editor__save-status editor__save-status--${saveStatus}`}>
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'saving' && '● Saving...'}
              {saveStatus === 'unsaved' && '○ Unsaved'}
            </span>
            <div className="btn-group">
              <button
                className={`btn btn-xs ${viewMode === 'editor' ? 'btn--active' : ''}`}
                onClick={() => setViewMode('editor')}
                title="Editor only"
              >
                <Edit3 size={12} />
              </button>
              <button
                className={`btn btn-xs ${viewMode === 'split' ? 'btn--active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Split view"
              >
                <PanelLeft size={12} />
              </button>
              <button
                className={`btn btn-xs ${viewMode === 'preview' ? 'btn--active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="Preview only"
              >
                <Eye size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor body */}
      <div className="editor__body">
        {/* Editor pane */}
        {viewMode !== 'preview' && !readOnly && (
          <div className="editor__pane editor__pane--editor">
            <div className="editor__line-numbers" aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i + 1} className="editor__line-number">
                  {i + 1}
                </span>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="editor__textarea"
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start writing your markdown here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Divider */}
        {viewMode === 'split' && !readOnly && <div className="editor__divider" />}

        {/* Preview pane */}
        {(viewMode !== 'editor' || readOnly) && (
          <div className="editor__pane editor__pane--preview">
            <div className="markdown-body">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {readOnly ? 'This file is empty.' : 'Start typing to see the preview...'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
