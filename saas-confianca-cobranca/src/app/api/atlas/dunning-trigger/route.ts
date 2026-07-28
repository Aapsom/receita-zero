/**
 * ATLAS Trigger — Dispara recepção humana após 3 falhas de dunning.
 *
 * Ref: PLANO CONJUNTO §2.2 (A-5), §7.1.2b.3 (Integração ATLAS)
 *
 * Flow:
 * - 3ª falha de débito → C5 dunning chama este endpoint
 * - Envia notificação via ZAPI WhatsApp + Resend email
 * - Cria ticket no ATLAS Receptionista para follow-up
 *
 * Gate: GATE 👤 (ZAPI_LIVE para ATLAS) — em sandbox, usa mock
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────

interface AtlasTriggerRequest {
  subscription_id: string;
  pme_id: string;
  motivo: string;
  falhas_consecutivas: number;
  tenant_id?: string;
  pme_data?: {
    nome?: string;
    whatsapp?: string;
    email?: string;
  };
}

// ─── ZAPI WhatsApp ────────────────────────────────────────────────────────

async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  // Gate: ZAPI_LIVE
  const zapiToken = process.env.ZAPI_TOKEN || '';
  const zapiUrl = process.env.ZAPI_URL || '';

  if (!zapiToken || !zapiUrl) {
    // Sandbox mode — log only
    console.log('[ATLAS-SANDBOX] WhatsApp:', { to, message });
    return { success: true, message_id: 'sandbox_msg' };
  }

  try {
    const response = await fetch(`${zapiUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${zapiToken}`,
      },
      body: JSON.stringify({
        to,
        type: 'text',
        text: message,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `ZAPI error ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, message_id: data.messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Resend Email ─────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; email_id?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY || '';

  if (!resendKey) {
    // Sandbox mode — log only
    console.log('[ATLAS-SANDBOX] Email:', { to, subject });
    return { success: true, email_id: 'sandbox_email' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'ATLAS <atlas@aapson.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Resend error ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, email_id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Create ATLAS Ticket ──────────────────────────────────────────────────

interface AtlasTicket {
  id: string;
  subscription_id: string;
  pme_id: string;
  tipo: 'dunning';
  prioridade: 'alta' | 'media' | 'baixa';
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'cancelado';
  motivo: string;
  falhas_consecutivas: number;
  created_at: string;
  updated_at: string;
}

const atlasTickets: AtlasTicket[] = [];

function createAtlasTicket(request: AtlasTriggerRequest): AtlasTicket {
  const ticket: AtlasTicket = {
    id: `atlas_${Date.now()}`,
    subscription_id: request.subscription_id,
    pme_id: request.pme_id,
    tipo: 'dunning',
    prioridade: 'alta',
    status: 'aberto',
    motivo: request.motivo,
    falhas_consecutivas: request.falhas_consecutivas,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  atlasTickets.push(ticket);
  return ticket;
}

// ─── Templates ────────────────────────────────────────────────────────────

function whatsappTemplate(request: AtlasTriggerRequest): string {
  return `🔴 *Aviso de Cobrança — ATLAS Receptionista*\n\n` +
    `Assinatura: ${request.subscription_id}\n` +
    `PME: ${request.pme_id}\n` +
    `Falhas consecutivas: ${request.falhas_consecutivas}\n\n` +
    `Motivo: ${request.motivo}\n\n` +
    `Uma de nossas equências entrará em contato para regularização.`;
}

function emailTemplate(request: AtlasTriggerRequest): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">🔴 Aviso de Cobrança — ATLAS Receptionista</h2>
        <p><strong>Assinatura:</strong> ${request.subscription_id}</p>
        <p><strong>PME:</strong> ${request.pme_id}</p>
        <p><strong>Falhas consecutivas:</strong> ${request.falhas_consecutivas}</p>
        <p><strong>Motivo:</strong> ${request.motivo}</p>
        <hr>
        <p>Uma de nossas equências entrará em contato para regularização.</p>
        <p><em>ATLAS — Sistema de Confiabilidade de Cobrança</em></p>
      </body>
    </html>
  `;
}

// ─── POST /api/atlas/dunning-trigger ───────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Validate signature
    const signature = req.headers.get('X-Atlas-Signature') || '';
    if (
      process.env.NODE_ENV === 'production' &&
      signature !== (process.env.ATLAS_WEBHOOK_SECRET || '')
    ) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 2. Parse body
    let body: AtlasTriggerRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 3. Validate
    if (!body.subscription_id || !body.pme_id) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['subscription_id', 'pme_id'],
        },
        { status: 400 }
      );
    }

    // 4. Create ATLAS ticket
    const ticket = createAtlasTicket(body);

    // 5. Send notifications
    const results: { whatsapp: unknown; email: unknown } = {
      whatsapp: null,
      email: null,
    };

    // Get PME contact info (in production, from Supabase)
    const pmeNome = body.pme_data?.nome || body.pme_id;
    const pmeWhatsapp = body.pme_data?.whatsapp || '';
    const pmeEmail = body.pme_data?.email || '';

    // Send WhatsApp
    if (pmeWhatsapp) {
      results.whatsapp = await sendWhatsApp(
        pmeWhatsapp,
        whatsappTemplate(body)
      );
    }

    // Send Email
    if (pmeEmail) {
      results.email = await sendEmail(
        pmeEmail,
        `🔴 Cobrança em atraso — ${body.subscription_id}`,
        emailTemplate(body)
      );
    }

    // 6. Return
    return NextResponse.json(
      {
        message: 'ATLAS trigger processed',
        ticket_id: ticket.id,
        ticket_status: ticket.status,
        notifications: results,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('ATLAS dunning-trigger error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}

// ─── GET /api/atlas/dunning-trigger (list tickets) ─────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      tickets: atlasTickets,
      count: atlasTickets.length,
      open: atlasTickets.filter((t) => t.status === 'aberto').length,
      in_progress: atlasTickets.filter((t) => t.status === 'em_andamento').length,
    },
    { status: 200 }
  );
}
