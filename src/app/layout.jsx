import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/900.css';
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
import './how-to-play-rebrand.css';
import './saved-scorecard-rebrand.css';
import './home-hero-cleanup.css';
import './android-responsive-polish.css';
import './display-font-consistency.css';
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
    icon: [{ url: '/two-ball-darts-favicon-clean.svg?v=4', type: 'image/svg+xml' }],
    shortcut: '/two-ball-darts-favicon-clean.svg?v=4',
    apple: '/two-ball-darts-app-icon.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#02140f'
};

const staleAssetRecovery = `
(function(){
  var key='tbd-stale-reload';
  function recover(){
    try{
      if(sessionStorage.getItem(key)==='1') return;
      sessionStorage.setItem(key,'1');
    }catch(e){}
    try{
      var url=new URL(location.href);
      url.searchParams.set('_tbd_refresh',Date.now().toString());
      location.replace(url.toString());
    }catch(e){
      location.reload();
    }
  }
  function isChunkMessage(value){
    var text=String(value||'');
    return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(text);
  }
  addEventListener('error',function(event){
    var target=event.target;
    var src=target && (target.src||target.href);
    if(src && /\/_next\/static\//.test(src)) recover();
    else if(isChunkMessage(event.message||event.error)) recover();
  },true);
  addEventListener('unhandledrejection',function(event){
    if(isChunkMessage(event.reason && (event.reason.message||event.reason))) recover();
  });
  addEventListener('pageshow',function(){
    try{ sessionStorage.removeItem(key); }catch(e){}
  },{once:true});
})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: staleAssetRecovery }} />
      </head>
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
