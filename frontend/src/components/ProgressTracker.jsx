import { Progress } from './ui/progress';
import { CheckCircle2, Circle, CircleDot, AlertTriangle } from 'lucide-react';

export default function ProgressTracker({ stats }) {
    const { total, todo, in_progress, done, progress, overdue } = stats;

    return (
        <div 
            className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-border/50"
            data-testid="progress-tracker"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Progress</h3>
                <span 
                    className="text-2xl font-semibold tabular-nums"
                    data-testid="progress-percentage"
                >
                    {progress}%
                </span>
            </div>

            <Progress value={progress} className="h-2 mb-4" data-testid="progress-bar" />

            <div className="grid grid-cols-4 gap-2 text-center">
                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-medium" data-testid="stat-todo">{todo}</p>
                    <p className="text-xs text-muted-foreground">To Do</p>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-blue-500">
                        <CircleDot className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-medium" data-testid="stat-in-progress">{in_progress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-medium" data-testid="stat-done">{done}</p>
                    <p className="text-xs text-muted-foreground">Done</p>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-red-500">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-medium" data-testid="stat-overdue">{overdue}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
            </div>
        </div>
    );
}
