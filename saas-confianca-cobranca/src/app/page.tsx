/**
 * Home Page — Avança SaaS
 */

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Avança — SaaS Confiabilidade de Cobrança</h1>
      <p>
        Dunning, contabilidade e recuperação de recorrência para PMEs.
        Integração com Mercado Pago (Pix Automático + Cartão + Boleto + PIX QR).
      </p>
      <ul>
        <li>
          <a href="/dashboard">Dashboard PME</a>
        </li>
        <li>
          <a href="/ops/cobrancas">Ops — Cobranças</a>
        </li>
      </ul>
    </main>
  );
}
