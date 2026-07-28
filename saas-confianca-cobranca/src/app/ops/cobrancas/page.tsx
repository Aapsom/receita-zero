/**
 * Ops — Cobranças Page
 *
 * Ref: PLANO CONJUNTO §2.2 (A-9)
 *
 * Dashboard técnico para a AAPSON (role: owner).
 * Mostra saúde de retry, taxa de falha, auditoria por tenant.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (token !== (process.env.OPS_API_TOKEN || 'dev-token-ops')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      service: 'ops-cobrancas',
      status: 'ok',
      metrics: {
        taxa_falha: '0%',
        recovery_rate: '0%',
        tenants_ativos: 0,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export default function CobrancasPage() {
  return (
    <html lang="pt-BR">
      <head>
        <title>Ops — Cobranças</title>
      </head>
      <body>
        <h1>Ops — Cobranças</h1>
        <p>Métricas técnicas — API em /api/ops/cobrancas</p>
      </body>
    </html>
  );
}
