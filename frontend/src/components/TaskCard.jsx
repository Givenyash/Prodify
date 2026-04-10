import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Calendar, MoreVertical, Edit2, Trash2, Clock, AlertCircle } from 'lucide-react';

export default function TaskCard({ task, onEdit, onDelete, isDragging }) {
    const priorityClasses = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low'
    };

    const getDeadlineInfo = () => {
        if (!task.deadline) return null;
        
        const deadline = new Date(task.deadline);
        const isOverdue = isPast(deadline) && task.status !== 'done';
        const isDueToday = isToday(deadline);
        const isDueTomorrow = isTomorrow(deadline);
        const daysUntil = differenceInDays(deadline, new Date());
        
        let text = format(deadline, 'MMM d');
        let className = 'text-muted-foreground';
        
        if (isOverdue) {
            text = 'Overdue';
            className = 'text-red-600 dark:text-red-400';
        } else if (isDueToday) {
            text = 'Today';
            className = 'text-amber-600 dark:text-amber-400';
        } else if (isDueTomorrow) {
            text = 'Tomorrow';
            className = 'text-amber-600 dark:text-amber-400';
        } else if (daysUntil <= 3) {
            className = 'text-amber-600 dark:text-amber-400';
        }
        
        return { text, className, isOverdue };
    };

    const deadlineInfo = getDeadlineInfo();

    return (
        <div 
            className={`task-card p-4 cursor-grab ${isDragging ? 'task-card-dragging' : ''}`}
            data-testid={`task-card-${task.id}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 
                        className="font-medium text-sm leading-tight truncate"
                        data-testid={`task-title-${task.id}`}
                    >
                        {task.title}
                    </h4>
                    {task.description && (
                        <p 
                            className="text-xs text-muted-foreground mt-1 line-clamp-2"
                            data-testid={`task-description-${task.id}`}
                        >
                            {task.description}
                        </p>
                    )}
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 shrink-0"
                            data-testid={`task-menu-${task.id}`}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                            onClick={() => onEdit(task)}
                            data-testid={`task-edit-${task.id}`}
                        >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => onDelete(task.id)}
                            className="text-red-600 dark:text-red-400"
                            data-testid={`task-delete-${task.id}`}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-3">
                <Badge 
                    variant="secondary" 
                    className={`text-xs ${priorityClasses[task.priority]}`}
                    data-testid={`task-priority-${task.id}`}
                >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>

                {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map((tag, idx) => (
                    <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`task-tag-${task.id}-${idx}`}
                    >
                        {tag}
                    </Badge>
                ))}
                {task.tags && task.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                        +{task.tags.length - 2}
                    </Badge>
                )}
            </div>

            {deadlineInfo && (
                <div 
                    className={`flex items-center gap-1.5 mt-3 text-xs ${deadlineInfo.className}`}
                    data-testid={`task-deadline-${task.id}`}
                >
                    {deadlineInfo.isOverdue ? (
                        <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                        <Calendar className="h-3.5 w-3.5" />
                    )}
                    <span>{deadlineInfo.text}</span>
                </div>
            )}
        </div>
    );
}
