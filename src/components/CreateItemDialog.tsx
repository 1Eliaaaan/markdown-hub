'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, Folder } from 'lucide-react';

interface CreateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, type: 'file' | 'folder') => void;
  defaultType: 'file' | 'folder';
}

export default function CreateItemDialog({
  isOpen,
  onClose,
  onSubmit,
  defaultType,
}: CreateItemDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'file' | 'folder'>(defaultType);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setType(defaultType);
    setName('');
  }, [defaultType, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalName = name.trim();
    if (!finalName) return;
    if (type === 'file' && !finalName.endsWith('.md')) {
      finalName += '.md';
    }
    onSubmit(finalName, type);
    setName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{type === 'file' ? 'New File' : 'New Folder'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Type</label>
              <div className="btn-group">
                <button
                  type="button"
                  className={`btn btn-sm ${type === 'file' ? 'btn--active' : ''}`}
                  onClick={() => setType('file')}
                >
                  <FileText size={14} /> File
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${type === 'folder' ? 'btn--active' : ''}`}
                  onClick={() => setType('folder')}
                >
                  <Folder size={14} /> Folder
                </button>
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 16 }}>
              <label className="input-label">Name</label>
              <input
                ref={inputRef}
                className="input"
                type="text"
                placeholder={type === 'file' ? 'notes.md' : 'my-folder'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {type === 'file' && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  .md extension will be added automatically
                </span>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
