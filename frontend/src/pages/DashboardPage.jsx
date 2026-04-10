import { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import axios from 'axios';
import Header from '../components/Header';
import KanbanColumn from '../components/KanbanColumn';
import TaskModal from '../components/TaskModal';
import ProgressTracker from '../components/ProgressTracker';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        todo: 0,
        in_progress: 0,
        done: 0,
        progress: 0,
        overdue: 0
    });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [saving, setSaving] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchTasks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterStatus !== 'all') params.append('status', filterStatus);

            const [tasksRes, statsRes] = await Promise.all([
                axios.get(`${API}/tasks?${params}`, { withCredentials: true }),
                axios.get(`${API}/tasks/stats/summary`, { withCredentials: true })
            ]);

            setTasks(tasksRes.data);
            setStats(statsRes.data);
        } catch (e) {
            console.error('Failed to fetch tasks:', e);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterPriority, filterStatus]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTasks();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchTasks]);

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Optimistic update
        const updatedTasks = [...tasks];
        const taskIndex = updatedTasks.findIndex(t => t.id === draggableId);
        if (taskIndex === -1) return;

        const task = { ...updatedTasks[taskIndex] };
        task.status = destination.droppableId;
        updatedTasks[taskIndex] = task;
        setTasks(updatedTasks);

        try {
            await axios.post(
                `${API}/tasks/reorder`,
                {
                    task_id: draggableId,
                    new_status: destination.droppableId,
                    position: destination.index
                },
                { withCredentials: true }
            );
            // Refetch stats
            const statsRes = await axios.get(`${API}/tasks/stats/summary`, { withCredentials: true });
            setStats(statsRes.data);
        } catch (e) {
            console.error('Failed to reorder task:', e);
            toast.error('Failed to move task');
            fetchTasks(); // Revert on error
        }
    };

    const handleAddTask = () => {
        setEditingTask(null);
        setModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setModalOpen(true);
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await axios.delete(`${API}/tasks/${taskId}`, { withCredentials: true });
            toast.success('Task deleted');
            fetchTasks();
        } catch (e) {
            console.error('Failed to delete task:', e);
            toast.error('Failed to delete task');
        }
    };

    const handleSaveTask = async (taskData) => {
        setSaving(true);
        try {
            if (editingTask) {
                await axios.put(
                    `${API}/tasks/${editingTask.id}`,
                    taskData,
                    { withCredentials: true }
                );
                toast.success('Task updated');
            } else {
                await axios.post(`${API}/tasks`, taskData, { withCredentials: true });
                toast.success('Task created');
            }
            setModalOpen(false);
            fetchTasks();
        } catch (e) {
            console.error('Failed to save task:', e);
            toast.error('Failed to save task');
        } finally {
            setSaving(false);
        }
    };

    // Group tasks by status
    const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done')
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background" data-testid="dashboard">
            <Toaster position="top-right" richColors />
            
            <Header
                onSearch={setSearchQuery}
                onFilterPriority={setFilterPriority}
                onFilterStatus={setFilterStatus}
                onAddTask={handleAddTask}
                searchQuery={searchQuery}
                filterPriority={filterPriority}
                filterStatus={filterStatus}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Progress Tracker */}
                <div className="mb-6">
                    <ProgressTracker stats={stats} />
                </div>

                {/* Kanban Board */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div 
                        className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin"
                        data-testid="kanban-board"
                    >
                        <KanbanColumn
                            status="todo"
                            tasks={tasksByStatus.todo}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                        />
                        <KanbanColumn
                            status="in_progress"
                            tasks={tasksByStatus.in_progress}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                        />
                        <KanbanColumn
                            status="done"
                            tasks={tasksByStatus.done}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                        />
                    </div>
                </DragDropContext>
            </main>

            {/* Task Modal */}
            <TaskModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveTask}
                task={editingTask}
                loading={saving}
            />
        </div>
    );
}
