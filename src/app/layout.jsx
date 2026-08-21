import './globals.css';
import './mobile-fixes.css';
import './rule-result-polish.css';
import './player-row-overrides.css';
import './honours-position-fix.css';
import './hole-spin-animation.css';
import './score-action-button-states.css';
import './scoring-mode-react-polish.css';
import './app-icon-polish.css';
import FreshOpenTopGuard from '@/components/FreshOpenTopGuard';
import PersistentLeaderBadgeEnhancer from '@/components/PersistentLeaderBadgeEnhancer';

export const metadata = {
  title: 'TWO BALL DARTS',
  description: 'No gimmes. Just throw. Live golf-style darts scoring and official rules.',
  icons: {
    icon: '/two-ball-darts-icon.svg',
    shortcut: '/two-ball-darts-icon.svg',
    apple: '/two-ball-darts-icon.svg'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#02140f'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <FreshOpenTopGuard />
        <PersistentLeaderBadgeEnhancer />
        {children}
      </body>
    </html>
  );
}
