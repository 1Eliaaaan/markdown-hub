'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Share2, Link, Copy, Check, X, Trash2, Eye, Edit3, Plus } from 'lucide-react';
import type { ShareLink } from '@/lib/supabase';

interface ShareDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareDialog({ projectId, isOpen, onClose }: ShareDialogProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [label, setLabel] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      // Fetch share links separately
      const shareRes = await fetch(`/api/share?project_id=${projectId}`);
      if (shareRes.ok) {
        const shareData = await shareRes.json();
        setLinks(shareData);
      }
    } catch (err) {
      console.error('Failed to fetch share links', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      // Fetch links directly from supabase via a helper
      (async () => {
        setLoading(true);
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('share_links')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
          setLinks(data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen, projectId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, permission, label }),
      });
      if (res.ok) {
        const newLink = await res.json();
        setLinks((prev) => [newLink, ...prev]);
        setLabel('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePermission = async (link: ShareLink) => {
    const newPerm = link.permission === 'view' ? 'edit' : 'view';
    try {
      const res = await fetch(`/api/share/${link.id}?by=id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPerm }),
      });
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, permission: newPerm } : l))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/share/${id}?by=id`, { method: 'DELETE' });
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (token: string, id: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={18} /> Share Project
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Create new link */}
          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Create new share link
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <input
                className="input"
                placeholder="Label (optional)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="select"
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                style={{ width: 120 }}
              >
                <option value="view">View only</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={creating}
              style={{ width: '100%' }}
            >
              <Plus size={14} />
              {creating ? 'Creating...' : 'Generate Link'}
            </button>
          </div>

          {/* Existing links */}
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Active Links ({links.length})
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              Loading...
            </div>
          ) : links.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              <Link size={24} strokeWidth={1} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p>No share links yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map((link) => (
                <div
                  key={link.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    animation: 'fadeIn 200ms ease-out',
                  }}
                >
                  <Link size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13 }}>
                      {link.label || `Link ${link.token.slice(0, 6)}…`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      /s/{link.token}
                    </div>
                  </div>
                  <button
                    className={`btn btn-xs ${link.permission === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleTogglePermission(link)}
                    title="Toggle permission"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    {link.permission === 'view' ? (
                      <><Eye size={11} /> View</>
                    ) : (
                      <><Edit3 size={11} /> Edit</>
                    )}
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: 28, height: 28 }}
                    onClick={() => handleCopy(link.token, link.id)}
                    title="Copy link"
                  >
                    {copiedId === link.id ? (
                      <Check size={13} style={{ color: 'var(--success)' }} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: 28, height: 28, color: 'var(--danger)' }}
                    onClick={() => handleDelete(link.id)}
                    title="Delete link"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
