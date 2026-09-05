import './globals.css';
import './mobile-fixes.css';
import './rule-result-polish.css';
import './player-row-overrides.css';
import './player-profile-selection-polish.css';
import './honours-position-fix.css';
import './hole-spin-animation.css';
import './score-action-button-states.css';
import './scoring-mode-react-polish.css';
import './score-tile-cleanup.css';
import './app-icon-polish.css';
import './live-scorecard-fixes.css';
import './rockpail-footer.css';
import FreshOpenTopGuard from '@/components/FreshOpenTopGuard';
import PersistentLeaderBadgeEnhancer from '@/components/PersistentLeaderBadgeEnhancer';
import RoundCompletionSaveEnhancer from '@/components/RoundCompletionSaveEnhancer';
import LiveScoreButtonToneEnhancer from '@/components/LiveScoreButtonToneEnhancer';
import RockPailFooterEnhancer from '@/components/RockPailFooterEnhancer';
import MainPlayerProfilesAccess from '@/components/MainPlayerProfilesAccess';
import MainPlayerProfilesButtonEnhancer from '@/components/MainPlayerProfilesButtonEnhancer';
import MainAccountAccess from '@/components/MainAccountAccess';
import MainAccountButtonEnhancer from '@/components/MainAccountButtonEnhancer';
import AccountRoundIdentityEnhancer from '@/components/AccountRoundIdentityEnhancer';

export const metadata = {
  title: 'TWO BALL DARTS',
  description: 'No gimmes. Just throw. Live golf-style darts scoring and official rules.',
  icons: {
    icon: '/two-ball-darts-favicon-v2.svg',
    shortcut: '/two-ball-darts-favicon-v2.svg',
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
        <RoundCompletionSaveEnhancer />
        <LiveScoreButtonToneEnhancer />
        <RockPailFooterEnhancer />
        <MainPlayerProfilesAccess />
        <MainPlayerProfilesButtonEnhancer />
        <MainAccountAccess />
        <MainAccountButtonEnhancer />
        <AccountRoundIdentityEnhancer />
        {children}
      </body>
    </html>
  );
}
