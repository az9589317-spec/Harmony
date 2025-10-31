'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

function PostCard({ post }: { post: Post }) {
    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'just now';

  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        <Avatar>
          <AvatarImage src={post.userImage || undefined} alt={post.username} />
          <AvatarFallback>{getInitials(post.username)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{post.username}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <p className="text-foreground/90 whitespace-pre-wrap">{post.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function CommunityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: posts, isLoading: isPostsLoading } = useCollection<Post>(postsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const handlePostSubmit = async () => {
    if (!postContent.trim() || !user || !firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'posts'), {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        userImage: user.photoURL || null,
        content: postContent.trim(),
        createdAt: new Date().toISOString(),
      });
      setPostContent('');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to post',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex flex-col bg-card overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            {/* The onSelectPlaylist prop is not relevant here, but required */}
            <AppSidebar onSelectPlaylist={() => {}} />
          </Sidebar>
          <SidebarInset className="flex flex-col overflow-hidden !m-0 !rounded-none !shadow-none">
            <AppHeader 
              playlistName="Community"
              onSearchChange={() => {}} // No search on this page
            />
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-6">
                {/* Post Creation Form */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        <Textarea
                            placeholder="What's on your mind?"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="text-base"
                            rows={3}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handlePostSubmit} disabled={isSubmitting || !postContent.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Post
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Posts Feed */}
                <div className="space-y-4">
                    {isPostsLoading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </div>
                    )}
                    {posts?.map(post => <PostCard key={post.id} post={post} />)}
                     {!isPostsLoading && posts?.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No posts yet. Be the first to share something!</p>
                        </div>
                    )}
                </div>
                </div>
            </ScrollArea>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

    