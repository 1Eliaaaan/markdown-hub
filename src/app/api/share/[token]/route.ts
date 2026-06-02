import { NextRequest, NextResponse } from 'next/server';
import { supabase, buildTree } from '@/lib/supabase';

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const byId = request.nextUrl.searchParams.get('by') === 'id';

    const column = byId ? 'id' : 'token';
    const { data: shareLink, error: shareError } = await supabase
      .from('share_links')
      .select('*')
      .eq(column, token)
      .single();

    if (shareError || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', shareLink.project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', shareLink.project_id)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      shareLink,
      project: { ...project, items: buildTree(items ?? []) },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const byId = request.nextUrl.searchParams.get('by') === 'id';
    const body = await request.json();
    const { permission } = body;

    if (!permission || (permission !== 'edit' && permission !== 'view')) {
      return NextResponse.json(
        { error: "permission must be 'edit' or 'view'" },
        { status: 400 },
      );
    }

    const column = byId ? 'id' : 'token';
    const { data, error } = await supabase
      .from('share_links')
      .update({ permission })
      .eq(column, token)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const byId = request.nextUrl.searchParams.get('by') === 'id';

    const column = byId ? 'id' : 'token';
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq(column, token);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
