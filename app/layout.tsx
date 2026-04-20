import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Mapleleaf Roots',
    template: '%s · Mapleleaf Roots',
  },
  description: 'Franchise operations platform for Mapleleaf Petroleum Group.',
  // Note: favicon and apple-touch-icon should be generated from the real
  // Mapleleaf vector and placed at app/icon.png and app/apple-icon.png
  // when the brand assets are supplied.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
