
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, runTransaction, doc, Timestamp } from 'firebase/firestore';
import type { Comment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CommentSectionProps {
    postId: string;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}


function CommentCard({ comment }: { comment: Comment }) {
     const timeAgo = comment.createdAt && (comment.createdAt as Timestamp).toDate ? 
        formatDistanceToNow((comment.createdAt as Timestamp).toDate(), { addSuffix: true }) : 
        'just now';

    return (
        <div className="flex gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={comment.userImage || undefined} alt={comment.username} />
                <AvatarFallback>{getInitials(comment.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="text-sm bg-muted rounded-lg px-3 py-2">
                    <span className="font-semibold">{comment.username}</span>
                    <p className="text-foreground/80">{comment.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-3">{timeAgo}</p>
            </div>
        </div>
    )
}

export function CommentSection({ postId }: CommentSectionProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const commentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `posts/${postId}/comments`), orderBy('createdAt', 'asc')) : null),
        [firestore, postId]
    );
    const { data: comments, isLoading: areCommentsLoading } = useCollection<Comment>(commentsQuery);

    const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!commentContent.trim() || !user || !firestore) return;

        setIsSubmitting(true);
        
        // Optimistic UI: clear input immediately
        const contentToSubmit = commentContent.trim();
        setCommentContent('');

        const postRef = doc(firestore, 'posts', postId);
        const commentsCollection = collection(firestore, `posts/${postId}/comments`);

        const newCommentData = {
            postId: postId,
            userId: user.uid,
            username: user.displayName || 'Anonymous',
            userImage: user.photoURL || null,
            content: contentToSubmit,
            createdAt: serverTimestamp(),
        };

        // Run transaction in the background
        runTransaction(firestore, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Post does not exist!";
            }

            const newCommentCount = (postDoc.data().commentCount || 0) + 1;
            transaction.update(postRef, { commentCount: newCommentCount });
            
            const newCommentRef = doc(commentsCollection);
            transaction.set(newCommentRef, newCommentData);
        }).catch(error => {
            console.error("Comment transaction failed: ", error);
            // Restore input and show error if something went wrong
            setCommentContent(contentToSubmit);
            toast({
                variant: 'destructive',
                title: 'Failed to reply',
                description: 'Your comment could not be saved. Please try again.',
            });
            // The reads/writes that failed will be caught by useCollection/individual write handlers
            // to create contextual errors, so we don't need to manually emit here.
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    return (
        <div className="border-t p-4 space-y-4">
             {areCommentsLoading && (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                </div>
            )}
            <div className="space-y-4">
                {comments?.map(comment => <CommentCard key={comment.id} comment={comment} />)}
            </div>

            {user && (
                <form onSubmit={handleCommentSubmit} className="flex gap-3 items-start">
                    <Avatar className="h-8 w-8">
                         <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <Textarea 
                            placeholder="Write a comment..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            className="text-sm min-h-[40px] transition-all focus-visible:min-h-[80px]"
                            rows={1}
                        />
                        <div className="flex justify-end">
                            <Button size="sm" disabled={isSubmitting || !commentContent.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reply
                            </Button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
