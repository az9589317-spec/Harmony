
'use client';

import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function UploadProgressBar() {
  const { uploadTasks, clearTask } = useMusicPlayer();
  const activeTasks = uploadTasks.filter(task => task.status !== 'idle');

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div className="p-2 sm:p-4 border-b">
        <div className="space-y-3">
        <AnimatePresence>
          {activeTasks.map(task => (
            <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {task.status === 'uploading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                    {task.status === 'processing' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                    {task.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {task.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate" title={task.fileName}>{task.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={task.status === 'processing' || task.status === 'success' ? 100 : task.progress}
                        className={
                          `h-1.5 ` +
                          (task.status === 'error' ? '[&>div]:bg-destructive' : '')
                        }
                      />
                      <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                        {task.status === 'uploading' && `${Math.round(task.progress)}%`}
                        {task.status === 'processing' && '...'}
                        {task.status === 'success' && `100%`}
                        {task.status === 'error' && `Err`}
                      </span>
                    </div>
                     {task.status === 'error' && <p className="text-xs text-destructive mt-1">{task.error}</p>}
                  </div>
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clearTask(task.id)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear upload</span>
                    </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
    </div>
  );
}

