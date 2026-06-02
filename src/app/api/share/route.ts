import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, permission, label } = body;

    if (!project_id || !permission) {
      return NextResponse.json(
        { error: 'project_id and permission are required' },
        { status: 400 },
      );
    }

    if (permission !== 'edit' && permission !== 'view') {
      return NextResponse.json(
        { error: "permission must be 'edit' or 'view'" },
        { status: 400 },
      );
    }

    const token = nanoid(12);

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        project_id,
        token,
        permission,
        label: label ?? '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
