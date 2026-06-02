import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

// Types
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  type: 'file' | 'folder';
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Item[];
}

export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  permission: 'edit' | 'view';
  label: string;
  created_at: string;
}

// Helper: build tree from flat list
export function buildTree(items: Item[]): Item[] {
  const map = new Map<string, Item>();
  const roots: Item[] = [];

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  map.forEach((item) => {
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(item);
    } else {
      roots.push(item);
    }
  });

  // Sort children: folders first, then alphabetically
  const sortItems = (list: Item[]) => {
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    list.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };
  sortItems(roots);

  return roots;
}
