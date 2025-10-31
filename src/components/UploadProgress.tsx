"use client";

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Progress } from './ui/progress';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function UploadProgress() {
  const { uploadTasks } = useMusicPlayer();

  if (uploadTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Uploading...</h3>
        <AnimatePresence>
        {uploadTasks.map((task) => (
            <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="space-y-2 overflow-hidden"
            >
                <div className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[150px]">{task.fileName}</span>
                    <span className="font-medium">
                        {task.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500"/> :
                         task.status === 'error' ? <AlertCircle className="w-4 h-4 text-destructive"/> :
                         `${Math.round(task.progress)}%`
                        }
                    </span>
                </div>
                {task.status !== 'error' ? (
                     <Progress value={task.progress} className={task.status === 'processing' ? 'animate-pulse' : ''}/>
                ) : (
                    <p className="text-xs text-destructive truncate">{task.error}</p>
                )}
            </motion.div>
        ))}
        </AnimatePresence>
    </div>
  );
}
