import './globals.css';
import './mobile-fixes.css';
import './rule-result-polish.css';
import './player-row-overrides.css';
import RoundFlowEnhancer from '@/components/RoundFlowEnhancer';
import StructuralCleanupEnhancer from '@/components/StructuralCleanupEnhancer';
import SavedRoundsAccessEnhancer from '@/components/SavedRoundsAccessEnhancer';
import AutoAdvanceGuardEnhancer from '@/components/AutoAdvanceGuardEnhancer';

export const metadata = {
  title: 'TWO BALL DARTS',
  description: 'No gimmes. Just throw. Live golf-style darts scoring and official rules.'
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
        <RoundFlowEnhancer />
        <StructuralCleanupEnhancer />
        <SavedRoundsAccessEnhancer />
        <AutoAdvanceGuardEnhancer />
        {children}
      </body>
    </html>
  );
}
