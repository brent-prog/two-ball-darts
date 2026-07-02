import './globals.css';
import './mobile-fixes.css';
import './rule-result-polish.css';

export const metadata = {
  title: 'TWO BALL DARTS',
  applicationName: 'TwoBall Darts',
  description: 'No gimmes. Just throw. Live golf-style darts scoring and official rules.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'TwoBall Darts',
    statusBarStyle: 'black-translucent'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/app-icon.svg'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#02140f'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
