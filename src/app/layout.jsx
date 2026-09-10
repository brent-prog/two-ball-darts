import './globals.css';
import './mobile-fixes.css';
import './rule-result-polish.css';
import './player-row-overrides.css';
import './honours-position-fix.css';
import './hole-spin-animation.css';
import './score-action-button-states.css';
import './scoring-mode-react-polish.css';
import './score-tile-cleanup.css';
import './app-icon-polish.css';
import './live-scorecard-fixes.css';
import './rockpail-footer.css';
import './home-actions-modern.css';
import './final-scoring-overrides.css';
import './twoball-rebrand.css';
import './scoring-rebrand-preview.css';
import './score-interactions-rebrand.css';
import './score-interactions-polish.css';
import './player-rows-rebrand.css';
import './player-profile-selection-polish.css';
import './empty-player-final.css';
import './player-result-colours.css';
import './scored-row-action-final.css';
import './round-complete-rebrand.css';
import './live-scorecard-rebrand.css';
import './home-live-round-hide.css';
import './player-picker-rebrand.css';
import './round-history-rebrand.css';
import './home-logo-rebrand.css';
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
import MainFriendsAccess from '@/components/MainFriendsAccess';
import GuestInviteClaimEnhancer from '@/components/GuestInviteClaimEnhancer';
import SavedRoundsNavigationEnhancer from '@/components/SavedRoundsNavigationEnhancer';
import SignedOutActionGuard from '@/components/SignedOutActionGuard';
import FriendRequestNotificationEnhancer from '@/components/FriendRequestNotificationEnhancer';
import HomeLiveRoundCleanup from '@/components/HomeLiveRoundCleanup';
import RoundHistoryHomeEnhancer from '@/components/RoundHistoryHomeEnhancer';
import RoundHistoryCards from '@/components/RoundHistoryCards';
import MissingHoleGuardEnhancer from '@/components/MissingHoleGuardEnhancer';
import LiveScorecardSyncEnhancer from '@/components/LiveScorecardSyncEnhancer';
import ScoringFeedbackEnhancer from '@/components/ScoringFeedbackEnhancer';
import OffBoardDartOptionEnhancer from '@/components/OffBoardDartOptionEnhancer';

export const metadata = {
  title: 'TWO BALL DARTS',
  description: 'No gimmes. Just throw. Live golf-style darts scoring and official rules.',
  icons: {
    icon: [{ url: '/brand/twoball-app-icon.svg', type: 'image/svg+xml' }],
    shortcut: '/brand/twoball-app-icon.svg',
    apple: '/brand/twoball-app-icon.svg'
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
        <MainFriendsAccess />
        <GuestInviteClaimEnhancer />
        <SavedRoundsNavigationEnhancer />
        <SignedOutActionGuard />
        <FriendRequestNotificationEnhancer />
        <HomeLiveRoundCleanup />
        <RoundHistoryHomeEnhancer />
        <RoundHistoryCards />
        <MissingHoleGuardEnhancer />
        <LiveScorecardSyncEnhancer />
        <ScoringFeedbackEnhancer />
        <OffBoardDartOptionEnhancer />
        {children}
      </body>
    </html>
  );
}
