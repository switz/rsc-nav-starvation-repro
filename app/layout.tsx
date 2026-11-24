import type { ReactNode } from 'react';
import { Ticker } from './ticker';
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html><body><Ticker />{children}</body></html>;
}
