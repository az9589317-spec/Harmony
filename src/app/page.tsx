'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { HarmonyHubClient } from '@/components/HarmonyHubClient';
import { Loader2 } from 'lucide-react';

export default function MusicPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // useEffect(() => {
  //   if (!isUserLoading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, isUserLoading, router]);

  // if (isUserLoading || !user) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   );
  // }

  return (
    <HarmonyHubClient />
  );
}

    