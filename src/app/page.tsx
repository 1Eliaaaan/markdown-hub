'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Folder, ArrowRight, X, Trash2 } from 'lucide-react';
import type { Project } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        router.push(`/p/${project.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its files?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="home">
      {/* Background decoration */}
      <div className="home__bg-glow" />

      {/* Hero */}
      <header className="home__hero">
        <div className="home__logo">
          <span className="home__logo-icon">📝</span>
          <h1 className="home__title">MarkdownHub</h1>
        </div>
        <p className="home__subtitle">
          Organize your ideas, documentation, and notes in beautifully structured Markdown projects.
          Create, share, and collaborate — no login required.
        </p>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Project
        </button>
      </header>

      {/* Projects grid */}
      <main className="home__content">
        {loading ? (
          <div className="home__loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="home__skeleton" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="home__empty">
            <Folder size={48} strokeWidth={1} />
            <h3>No projects yet</h3>
            <p>Create your first project to start organizing your Markdown files.</p>
            <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="home__grid">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className="home__card"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => router.push(`/p/${project.id}`)}
              >
                <div className="home__card-header">
                  <div className="home__card-icon">
                    <FileText size={20} />
                  </div>
                  <button
                    className="btn-icon"
                    style={{ width: 28, height: 28, opacity: 0.5 }}
                    onClick={(e) => handleDelete(e, project.id)}
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="home__card-title">{project.name}</h3>
                {project.description && (
                  <p className="home__card-desc">{project.description}</p>
                )}
                <div className="home__card-footer">
                  <span className="home__card-time">{timeAgo(project.updated_at)}</span>
                  <ArrowRight size={14} className="home__card-arrow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Project Name</label>
                  <input
                    className="input"
                    placeholder="My awesome docs"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group" style={{ marginTop: 16 }}>
                  <label className="input-label">Description (optional)</label>
                  <input
                    className="input"
                    placeholder="A short description..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!newName.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
