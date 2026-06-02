'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share2,
  FilePlus,
  FolderPlus,
  PanelLeftClose,
  PanelLeft,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { Project, Item } from '@/lib/supabase';
import { buildTree } from '@/lib/supabase';
import TreeView from '@/components/TreeView';
import MarkdownEditor from '@/components/MarkdownEditor';
import ShareDialog from '@/components/ShareDialog';
import CreateItemDialog from '@/components/CreateItemDialog';

// Helper to flatten a nested tree back to a flat array
function flattenTree(nodes: Item[]): Item[] {
  const result: Item[] = [];
  const walk = (items: Item[]) => {
    for (const item of items) {
      const { children, ...rest } = item;
      result.push(rest as Item);
      if (children && children.length > 0) walk(children);
    }
  };
  walk(nodes);
  return result;
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [treeItems, setTreeItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [createItemParent, setCreateItemParent] = useState<string | null>(null);
  const [createItemType, setCreateItemType] = useState<'file' | 'folder'>('file');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        setError('Project not found');
        return;
      }
      const data = await res.json();
      const { items: treeData, ...projectData } = data;
      setProject(projectData);
      // Flatten tree back for our state (we rebuild tree from flat list)
      const flatItems = flattenTree(treeData || []);
      setItems(flatItems);
      setTreeItems(treeData || []);
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Rebuild tree when items change
  useEffect(() => {
    setTreeItems(buildTree(items));
  }, [items]);

  // Select a file
  const handleSelect = useCallback(
    (item: Item) => {
      if (item.type === 'file') {
        // Save current file first if needed
        if (selectedItem && saveStatus === 'unsaved') {
          saveContent(selectedItem.id, contentRef.current);
        }
        setSelectedItem(item);
        setContent(item.content || '');
        setSaveStatus('saved');
      }
    },
    [selectedItem, saveStatus]
  );

  // Content change with debounced save
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setSaveStatus('unsaved');

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (selectedItem) {
          saveContent(selectedItem.id, newContent);
        }
      }, 1500);
    },
    [selectedItem]
  );

  // Save content to API
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

  // Create item
  const handleCreateItem = useCallback(
    async (name: string, type: 'file' | 'folder') => {
      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
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
    [projectId, createItemParent]
  );

  // Open create dialog
  const openCreateDialog = useCallback(
    (parentId: string | null, type: 'file' | 'folder') => {
      setCreateItemParent(parentId);
      setCreateItemType(type);
      setShowCreateItem(true);
    },
    []
  );

  // Delete item
  const handleDeleteItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const hasChildren = items.some((i) => i.parent_id === id);
      if (
        item.type === 'folder' &&
        hasChildren &&
        !confirm('This folder contains items. Delete everything inside?')
      ) {
        return;
      }
      if (!hasChildren && !confirm(`Delete "${item.name}"?`)) return;

      try {
        await fetch(`/api/items/${id}`, { method: 'DELETE' });
        // Remove item and all descendants
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

  // Rename item
  const handleRenameItem = useCallback(async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, name: newName } : i))
        );
        if (selectedItem?.id === id) {
          setSelectedItem((prev) => (prev ? { ...prev, name: newName } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedItem]);

  // Build breadcrumb
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
        <p>Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-loading">
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => router.push('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumb();

  return (
    <div className="workspace">
      {/* Sidebar */}
      <aside className={`workspace__sidebar ${sidebarOpen ? '' : 'workspace__sidebar--collapsed'}`}>
        <div className="workspace__sidebar-header">
          <button className="btn-icon" onClick={() => router.push('/')} title="Back to projects">
            <ArrowLeft size={18} />
          </button>
          <h2 className="workspace__project-name truncate">{project?.name}</h2>
          <button className="btn-icon" onClick={() => setShowShare(true)} title="Share">
            <Share2 size={16} />
          </button>
        </div>

        <div className="workspace__sidebar-body">
          <TreeView
            items={treeItems}
            selectedId={selectedItem?.id || null}
            onSelect={handleSelect}
            onCreateItem={openCreateDialog}
            onDeleteItem={handleDeleteItem}
            onRenameItem={handleRenameItem}
            readOnly={false}
          />
        </div>

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
      </aside>

      {/* Sidebar toggle */}
      <button
        className="workspace__sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
      </button>

      {/* Main content */}
      <main className="workspace__main">
        {selectedItem ? (
          <>
            {/* Breadcrumb */}
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
              readOnly={false}
              fileName={selectedItem.name}
              saveStatus={saveStatus}
            />
          </>
        ) : (
          <div className="workspace__empty">
            <FileText size={48} strokeWidth={1} />
            <h3>Select a file to start editing</h3>
            <p>Choose a file from the sidebar, or create a new one.</p>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ShareDialog
        projectId={projectId}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
      <CreateItemDialog
        isOpen={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        onSubmit={handleCreateItem}
        defaultType={createItemType}
      />
    </div>
  );
}
