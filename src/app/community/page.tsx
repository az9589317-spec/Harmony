'use client';

import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { Loader2, Paperclip, X, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { useCollection, useMemoFirebase } from '@/firebase';
import { query, orderBy } from 'firebase/firestore';
import { uploadMedia } from '@/app/actions/upload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"


function PostCard({ post }: { post: Post }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    const timeAgo = post.createdAt && (post.createdAt as Timestamp).toDate ? 
        formatDistanceToNow((post.createdAt as Timestamp).toDate(), { addSuffix: true }) : 
        'just now';

    const handleDelete = async () => {
        if (!user || user.uid !== post.userId || !firestore) return;
        setIsDeleting(true);

        const postRef = doc(firestore, 'posts', post.id);
        
        deleteDoc(postRef).then(() => {
            toast({
                title: 'Post Deleted',
                description: 'Your post has been removed.',
            });
            // The UI will update automatically thanks to the realtime listener
        }).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: postRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You do not have permission to delete this post.',
            });
        }).finally(() => {
            setIsDeleting(false);
            setIsAlertOpen(false);
        });
    }

  return (
    <>
    <Card>
      <CardContent className="p-4 flex gap-4">
        <Avatar>
          <AvatarImage src={post.userImage || undefined} alt={post.username} />
          <AvatarFallback>{getInitials(post.username)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 justify-between">
            <div className='flex items-center gap-2'>
              <p className="font-semibold">{post.username}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
            {user && user.uid === post.userId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
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
  const formRef = useRef<HTMLFormElement>(null);


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
  
  const handlePostSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!postContent.trim() && !postImage) || !user || !firestore || !formRef.current) return;
    
    setIsSubmitting(true);
    
    try {
        let imageUrl: string | undefined = undefined;

        if (postImage) {
            const formData = new FormData();
            formData.append('file', postImage);
            
            const result = await uploadMedia(formData, 'image');
            
            if (!result.success) {
                throw new Error(result.error || 'Image upload failed');
            }
            imageUrl = result.url;
        }
      
        const newPostData = {
          userId: user.uid,
          username: user.displayName || 'Anonymous',
          userImage: user.photoURL || null,
          content: postContent.trim(),
          createdAt: serverTimestamp(),
          ...(imageUrl && { imageUrl }),
        };

        const postsCollection = collection(firestore, 'posts');
        
        addDoc(postsCollection, newPostData)
          .then(() => {
            setPostContent('');
            removeImage();
            setIsSubmitting(false);
            formRef.current?.reset();
          })
          .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
              path: postsCollection.path,
              operation: 'create',
              requestResourceData: newPostData,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSubmitting(false); // Make sure to stop submitting on error
          });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to post',
            description: error.message || 'An error occurred. Please try again.',
        });
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
                    <form ref={formRef} onSubmit={handlePostSubmit}>
                        <CardContent className="p-4 space-y-4">
                            <Textarea
                                placeholder="What's on your mind?"
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                className="text-base"
                                rows={3}
                                name="content"
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
                                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                                    <span className="sr-only">Attach image</span>
                                </Button>
                                <Input type="file" name="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                <Button type="submit" disabled={isSubmitting || (!postContent.trim() && !postImage)}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Post
                                </Button>
                            </div>
                        </CardContent>
                    </form>
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
 