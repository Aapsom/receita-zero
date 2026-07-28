/**
 * Root Layout — Avança SaaS
 */

import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Avança — SaaS Confiabilidade de Cobrança',
  description: 'Dunning, contabilidade e recuperação de recorrência para PMEs',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
