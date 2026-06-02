import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, content, parent_id } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (parent_id !== undefined) updates.parent_id = parent_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // When content is updated, touch the parent project's updated_at
    if (content !== undefined) {
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.project_id);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
