/**
 * Webhook Pix — Legacy endpoint (redirects to MP webhook).
 *
 * Ref: PLANO CONJUNTO §2.2 (A-3)
 *
 * O Pix Automático é processado via MP webhook (webhooks/mercadopago).
 * Este endpoint é mantido para compatibilidade com assinaturas pré-MP.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'Pix webhook migrado para /api/webhooks/mercadopago',
      redirect: '/api/webhooks/mercadopago',
    },
    { status: 200 }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: 'pix-webhook',
      status: 'deprecated',
      redirect: '/api/webhooks/mercadopago',
    },
    { status: 200 }
  );
}
