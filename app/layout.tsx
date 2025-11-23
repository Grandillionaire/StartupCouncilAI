import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SelfStarterSuite - AI Council',
  description: 'Get advice from an AI council of brilliant advisors: Naval, Elon, Larry, Alex, and Pavel',
  keywords: ['AI', 'council', 'advice', 'business', 'entrepreneurship', 'advisors'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
