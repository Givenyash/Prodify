import { Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { CircleDot, Circle, CheckCircle2 } from 'lucide-react';

const statusConfig = {
    todo: {
        title: 'To Do',
        icon: Circle,
        color: 'text-zinc-500'
    },
    in_progress: {
        title: 'In Progress',
        icon: CircleDot,
        color: 'text-blue-500'
    },
    done: {
        title: 'Done',
        icon: CheckCircle2,
        color: 'text-emerald-500'
    }
};

export default function KanbanColumn({ status, tasks, onEditTask, onDeleteTask }) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div 
            className="kanban-column flex flex-col w-80 shrink-0 animate-fade-up"
            data-testid={`kanban-column-${status}`}
        >
            {/* Column Header */}
            <div className="flex items-center gap-2 px-4 py-3">
                <Icon className={`h-5 w-5 ${config.color}`} strokeWidth={1.5} />
                <h3 className="font-medium text-sm">{config.title}</h3>
                <span 
                    className="ml-auto text-xs text-muted-foreground bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full"
                    data-testid={`column-count-${status}`}
                >
                    {tasks.length}
                </span>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 px-3 pb-3 space-y-3 transition-colors overflow-y-auto scrollbar-thin ${
                            snapshot.isDraggingOver ? 'bg-zinc-200/50 dark:bg-zinc-800/50' : ''
                        }`}
                        data-testid={`droppable-${status}`}
                    >
                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                            <div 
                                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                                data-testid={`empty-column-${status}`}
                            >
                                <Icon className="h-8 w-8 mb-2 opacity-50" strokeWidth={1} />
                                <p className="text-xs">No tasks</p>
                            </div>
                        )}
                        
                        {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                    >
                                        <TaskCard
                                            task={task}
                                            onEdit={onEditTask}
                                            onDelete={onDeleteTask}
                                            isDragging={snapshot.isDragging}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
