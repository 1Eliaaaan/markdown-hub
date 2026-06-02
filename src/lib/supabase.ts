import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set them in your Vercel dashboard: Settings → Environment Variables.'
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Proxy so existing code like `supabase.from('table')` works without changes.
// The actual client is only created when a property is first accessed (lazy init).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

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
