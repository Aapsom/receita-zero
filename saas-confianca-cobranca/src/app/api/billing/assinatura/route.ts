/**
 * API Billing Assinatura — Legacy endpoint for subscription management.
 *
 * Ref: PLANO CONJUNTO §2.2 (A-4)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    return NextResponse.json(
      {
        message: 'Use POST /api/v1/subscriptions instead',
        redirect: '/api/v1/subscriptions',
        received: body,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON', details: String(err) },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'Use GET /api/v1/subscriptions instead',
      redirect: '/api/v1/subscriptions',
    },
    { status: 200 }
  );
}
