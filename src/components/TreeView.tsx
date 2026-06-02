'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  Trash2,
  Edit3,
  FilePlus,
  FolderPlus,
  Check,
  X,
} from 'lucide-react';
import type { Item } from '@/lib/supabase';

interface TreeViewProps {
  items: Item[];
  selectedId: string | null;
  onSelect: (item: Item) => void;
  onCreateItem: (parentId: string | null, type: 'file' | 'folder') => void;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  readOnly: boolean;
}

interface TreeNodeProps {
  item: Item;
  depth: number;
  selectedId: string | null;
  onSelect: (item: Item) => void;
  onCreateItem: (parentId: string | null, type: 'file' | 'folder') => void;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  readOnly: boolean;
}

function TreeNode({
  item,
  depth,
  selectedId,
  onSelect,
  onCreateItem,
  onDeleteItem,
  onRenameItem,
  readOnly,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(item.name);
  const [showActions, setShowActions] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameName.trim();
    if (trimmed && trimmed !== item.name) {
      onRenameItem(item.id, trimmed);
    }
    setIsRenaming(false);
  }, [renameName, item.name, item.id, onRenameItem]);

  const isSelected = selectedId === item.id;
  const isFolder = item.type === 'folder';
  const children = item.children || [];

  return (
    <div className="tree-node">
      <div
        className={`tree-node__row ${isSelected ? 'tree-node__row--selected' : ''}`}
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => {
          if (isFolder) setExpanded(!expanded);
          onSelect(item);
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Indentation guides */}
        {Array.from({ length: depth }).map((_, i) => (
          <span
            key={i}
            className="tree-node__guide"
            style={{ left: i * 20 + 18 }}
          />
        ))}

        {/* Expand/collapse chevron for folders */}
        {isFolder ? (
          <span className={`tree-node__chevron ${expanded ? 'tree-node__chevron--expanded' : ''}`}>
            <ChevronRight size={14} />
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {/* Icon */}
        <span className="tree-node__icon">
          {isFolder ? (
            expanded ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <FileText size={16} />
          )}
        </span>

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            ref={renameRef}
            className="tree-node__rename-input"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-node__name truncate">{item.name}</span>
        )}

        {/* Actions */}
        {!readOnly && showActions && !isRenaming && (
          <span className="tree-node__actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="tree-node__action-btn"
              title="Rename"
              onClick={() => {
                setRenameName(item.name);
                setIsRenaming(true);
              }}
            >
              <Edit3 size={12} />
            </button>
            <button
              className="tree-node__action-btn tree-node__action-btn--danger"
              title="Delete"
              onClick={() => onDeleteItem(item.id)}
            >
              <Trash2 size={12} />
            </button>
            {isFolder && (
              <>
                <button
                  className="tree-node__action-btn"
                  title="New File"
                  onClick={() => onCreateItem(item.id, 'file')}
                >
                  <FilePlus size={12} />
                </button>
                <button
                  className="tree-node__action-btn"
                  title="New Folder"
                  onClick={() => onCreateItem(item.id, 'folder')}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && expanded && children.length > 0 && (
        <div className="tree-node__children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateItem={onCreateItem}
              onDeleteItem={onDeleteItem}
              onRenameItem={onRenameItem}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  items,
  selectedId,
  onSelect,
  onCreateItem,
  onDeleteItem,
  onRenameItem,
  readOnly,
}: TreeViewProps) {
  if (items.length === 0) {
    return (
      <div className="tree-empty">
        <FileText size={32} strokeWidth={1} />
        <p>No files yet</p>
        {!readOnly && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Create your first file or folder
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="tree-view">
      {items.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onCreateItem={onCreateItem}
          onDeleteItem={onDeleteItem}
          onRenameItem={onRenameItem}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
