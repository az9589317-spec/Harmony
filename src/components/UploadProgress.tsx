"use client";

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Progress } from './ui/progress';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function UploadProgress() {
  const { uploadTasks } = useMusicPlayer();

  const activeUploads = uploadTasks.filter(task => task.status === 'uploading' || task.status === 'processing');

  if (activeUploads.length === 0) {
    // Only show completed/error tasks for a few seconds.
    // The context handles removing them.
    const recentTasks = uploadTasks.filter(task => task.status === 'success' || task.status === 'error');
    if (recentTasks.length === 0) {
      return null;
    }
    return (
       <div className="space-y-4">
        <AnimatePresence>
          {recentTasks.map((task) => (
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
              {task.status === 'error' && (
                  <p className="text-xs text-destructive truncate">{task.error}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
       </div>
    )
  }

  return (
    <div className="space-y-3 text-center">
        <UploadCloud className="w-6 h-6 mx-auto text-muted-foreground animate-pulse" />
        <h3 className="text-base font-semibold text-foreground">Uploading...</h3>
        <AnimatePresence>
        {activeUploads.map((task) => (
            <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="space-y-2 overflow-hidden text-left"
            >
                <div className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[150px]">{task.fileName}</span>
                    <span className="font-medium">
                        {task.status === 'processing' ? `Processing...` : `${Math.round(task.progress)}%`}
                    </span>
                </div>
                <Progress value={task.progress} className={task.status === 'processing' ? 'animate-pulse h-1' : 'h-1'}/>
            </motion.div>
        ))}
        </AnimatePresence>
    </div>
  );
}
