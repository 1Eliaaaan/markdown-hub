import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, parent_id, name, type } = body;

    if (!project_id || !name || !type) {
      return NextResponse.json(
        { error: 'project_id, name, and type are required' },
        { status: 400 },
      );
    }

    if (type !== 'file' && type !== 'folder') {
      return NextResponse.json(
        { error: "type must be 'file' or 'folder'" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        project_id,
        parent_id: parent_id ?? null,
        name,
        type,
        content: '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Touch the parent project's updated_at
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', project_id);

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
