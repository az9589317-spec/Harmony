import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { HarmonyHubClient } from '@/components/HarmonyHubClient';

export default function Home() {
  return (
    <MusicPlayerProvider>
      <HarmonyHubClient />
    </MusicPlayerProvider>
  );
}
