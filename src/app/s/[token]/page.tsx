'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  Eye,
  Edit3,
  AlertCircle,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import type { Project, Item, ShareLink } from '@/lib/supabase';
import { buildTree } from '@/lib/supabase';
import TreeView from '@/components/TreeView';
import MarkdownEditor from '@/components/MarkdownEditor';
import CreateItemDialog from '@/components/CreateItemDialog';

function flattenTree(nodes: Item[]): Item[] {
  const result: Item[] = [];
  const walk = (list: Item[]) => {
    for (const item of list) {
      const { children, ...rest } = item;
      result.push(rest as Item);
      if (children && children.length > 0) walk(children);
    }
  };
  walk(nodes);
  return result;
}

export default function SharedPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [project, setProject] = useState<Project | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [treeItems, setTreeItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [createItemParent, setCreateItemParent] = useState<string | null>(null);
  const [createItemType, setCreateItemType] = useState<'file' | 'folder'>('file');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const isReadOnly = shareLink?.permission === 'view';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          setError('This share link is invalid or has been removed.');
          return;
        }
        const data = await res.json();
        setShareLink(data.shareLink);
        const { items: treeData, ...projectData } = data.project;
        setProject(projectData);
        const flatItems = flattenTree(treeData || []);
        setItems(flatItems);
        setTreeItems(treeData || []);
      } catch (err) {
        setError('Failed to load shared project.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    setTreeItems(buildTree(items));
  }, [items]);

  const handleSelect = useCallback(
    (item: Item) => {
      if (item.type === 'file') {
        if (selectedItem && saveStatus === 'unsaved' && !isReadOnly) {
          saveContent(selectedItem.id, contentRef.current);
        }
        setSelectedItem(item);
        setContent(item.content || '');
        setSaveStatus('saved');
      }
    },
    [selectedItem, saveStatus, isReadOnly]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setSaveStatus('unsaved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (selectedItem) saveContent(selectedItem.id, newContent);
      }, 1500);
    },
    [selectedItem]
  );

  const saveContent = async (itemId: string, text: string) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, content: text } : it))
        );
      }
    } catch (err) {
      setSaveStatus('unsaved');
    }
  };

  const handleCreateItem = useCallback(
    async (name: string, type: 'file' | 'folder') => {
      if (!project) return;
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            parent_id: createItemParent,
            name,
            type,
          }),
        });
        if (res.ok) {
          const newItem = await res.json();
          setItems((prev) => [...prev, newItem]);
          if (type === 'file') {
            setSelectedItem(newItem);
            setContent('');
            setSaveStatus('saved');
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    [project, createItemParent]
  );

  const openCreateDialog = useCallback(
    (parentId: string | null, type: 'file' | 'folder') => {
      setCreateItemParent(parentId);
      setCreateItemType(type);
      setShowCreateItem(true);
    },
    []
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      if (!confirm(`Delete "${item.name}"?`)) return;
      try {
        await fetch(`/api/items/${id}`, { method: 'DELETE' });
        const idsToRemove = new Set<string>();
        const collectIds = (parentId: string) => {
          idsToRemove.add(parentId);
          items.filter((i) => i.parent_id === parentId).forEach((i) => collectIds(i.id));
        };
        collectIds(id);
        setItems((prev) => prev.filter((i) => !idsToRemove.has(i.id)));
        if (selectedItem && idsToRemove.has(selectedItem.id)) {
          setSelectedItem(null);
          setContent('');
        }
      } catch (err) {
        console.error(err);
      }
    },
    [items, selectedItem]
  );

  const handleRenameItem = useCallback(async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const getBreadcrumb = useCallback(() => {
    if (!selectedItem) return [];
    const crumbs: string[] = [selectedItem.name];
    let current = selectedItem;
    while (current.parent_id) {
      const parent = items.find((i) => i.id === current.parent_id);
      if (parent) {
        crumbs.unshift(parent.name);
        current = parent;
      } else break;
    }
    return crumbs;
  }, [selectedItem, items]);

  if (loading) {
    return (
      <div className="workspace-loading">
        <div className="workspace-loading__spinner" />
        <p>Loading shared project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-loading">
        <AlertCircle size={48} strokeWidth={1} style={{ color: 'var(--danger)', marginBottom: 16 }} />
        <p style={{ color: 'var(--danger)', fontSize: 18, fontWeight: 500 }}>{error}</p>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          The link may have been removed or is incorrect.
        </p>
        <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => router.push('/')}>
          Go Home
        </button>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumb();

  return (
    <div className="workspace">
      {/* Share banner */}
      <div className={`workspace__banner ${isReadOnly ? 'workspace__banner--view' : 'workspace__banner--edit'}`}>
        {isReadOnly ? (
          <><Eye size={14} /> Shared — View Only</>
        ) : (
          <><Edit3 size={14} /> Shared — Edit Mode</>
        )}
      </div>

      {/* Sidebar */}
      <aside className="workspace__sidebar" style={{ top: 36 }}>
        <div className="workspace__sidebar-header">
          <button className="btn-icon" onClick={() => router.push('/')} title="Go home">
            <ArrowLeft size={18} />
          </button>
          <h2 className="workspace__project-name truncate">{project?.name}</h2>
        </div>

        <div className="workspace__sidebar-body">
          <TreeView
            items={treeItems}
            selectedId={selectedItem?.id || null}
            onSelect={handleSelect}
            onCreateItem={openCreateDialog}
            onDeleteItem={handleDeleteItem}
            onRenameItem={handleRenameItem}
            readOnly={isReadOnly}
          />
        </div>

        {!isReadOnly && (
          <div className="workspace__sidebar-footer">
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => openCreateDialog(null, 'file')}
            >
              <FilePlus size={14} /> New File
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => openCreateDialog(null, 'folder')}
            >
              <FolderPlus size={14} /> New Folder
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="workspace__main" style={{ marginTop: 36 }}>
        {selectedItem ? (
          <>
            <div className="workspace__breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="workspace__breadcrumb-item">
                  {i > 0 && <ChevronRight size={12} style={{ margin: '0 4px', opacity: 0.4 }} />}
                  <span className={i === breadcrumbs.length - 1 ? '' : 'workspace__breadcrumb-parent'}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>
            <MarkdownEditor
              content={content}
              onChange={handleContentChange}
              readOnly={isReadOnly}
              fileName={selectedItem.name}
              saveStatus={saveStatus}
            />
          </>
        ) : (
          <div className="workspace__empty">
            <FileText size={48} strokeWidth={1} />
            <h3>Select a file to view</h3>
            <p>Choose a file from the sidebar to start reading.</p>
          </div>
        )}
      </main>

      {!isReadOnly && (
        <CreateItemDialog
          isOpen={showCreateItem}
          onClose={() => setShowCreateItem(false)}
          onSubmit={handleCreateItem}
          defaultType={createItemType}
        />
      )}
    </div>
  );
}
