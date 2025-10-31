'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2, Send, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import Image from 'next/image';
import ImageKit from 'imagekit-javascript';

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
          <p className="text-foreground/90 whitespace-pre-wrap mt-1">{post.content}</p>
          {post.imageUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border">
                <Image src={post.imageUrl} alt="Post image" width={400} height={300} className="object-cover w-full h-auto" />
            </div>
          )}
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
  const [postImage, setPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imagekit = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new ImageKit({
        publicKey: "public_1Z4y6xViWvq28fxsG8fPbD4BZGY=",
        urlEndpoint: "https://ik.imagekit.io/c9okxuh0pu",
        // IMPORTANT: This authentication endpoint is a placeholder.
        // You MUST create your own backend server to securely generate
        // the authentication parameters.
        authenticationEndpoint: "https://your-authentication-server.com/api/imagekit/auth"
    });
  }, []);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPostImage(null);
    setImagePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handlePostSubmit = async () => {
    if ((!postContent.trim() && !postImage) || !user || !firestore || !imagekit) return;
    
    setIsSubmitting(true);
    try {
        let imageUrl: string | undefined = undefined;

        if (postImage) {
            const uploadResult = await imagekit.upload({
                file: postImage,
                fileName: postImage.name,
                folder: `/posts/${user.uid}`,
                useUniqueFileName: true,
            });
            imageUrl = uploadResult.url;
        }

      await addDoc(collection(firestore, 'posts'), {
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        userImage: user.photoURL || null,
        content: postContent.trim(),
        createdAt: new Date().toISOString(),
        ...(imageUrl && { imageUrl }),
      });
      setPostContent('');
      removeImage();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to post',
            description: error.message || 'An error occurred during upload. Please ensure your authentication server is running.',
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
            <AppSidebar onSelectPlaylist={() => {}} />
          </Sidebar>
          <SidebarInset className="flex flex-col overflow-hidden !m-0 !rounded-none !shadow-none">
            <AppHeader 
              playlistName="Community"
              onSearchChange={() => {}} // No search on this page
            />
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <Textarea
                            placeholder="What's on your mind?"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="text-base"
                            rows={3}
                        />
                        {imagePreview && (
                            <div className="relative w-32 h-32">
                                <Image src={imagePreview} alt="Image preview" fill className="rounded-md object-cover"/>
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeImage}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                <span className="sr-only">Attach image</span>
                            </Button>
                            <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                            <Button onClick={handlePostSubmit} disabled={isSubmitting || (!postContent.trim() && !postImage)}>
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