/**
 * API for Vitrine Certa — GET/POST /api/v1/partidas
 *
 * Lista histórico de parcelas cobradas para um PME.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const pmeId = url.searchParams.get('pme_id');

    if (!pmeId) {
      return NextResponse.json({ error: 'pme_id é obrigatório' }, { status: 400 });
    }

    // TODO: Replace with real Supabase client
    return NextResponse.json({
      ok: true,
      pme_id: pmeId,
      total: 0,
      partidas: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { subscription_id, pme_id, plano, valor, vencimento, tipo } = body;

    if (!subscription_id || !pme_id || !plano || !valor || !vencimento || !tipo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: subscription_id, pme_id, plano, valor, vencimento, tipo' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro', details: String(error) },
      { status: 500 }
    );
  }
}
