import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { CalendarIcon, X, Loader2 } from 'lucide-react';

export default function TaskModal({ isOpen, onClose, onSave, task, loading }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        deadline: null,
        tags: []
    });
    const [tagInput, setTagInput] = useState('');
    const [calendarOpen, setCalendarOpen] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || 'medium',
                status: task.status || 'todo',
                deadline: task.deadline ? new Date(task.deadline) : null,
                tags: task.tags || []
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                status: 'todo',
                deadline: null,
                tags: []
            });
        }
        setTagInput('');
    }, [task, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        
        onSave({
            ...formData,
            deadline: formData.deadline ? formData.deadline.toISOString() : null
        });
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tagInput.trim()]
                }));
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg" data-testid="task-modal">
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="Task title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                            data-testid="task-title-input"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Task description (optional)"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            data-testid="task-description-input"
                        />
                    </div>

                    {/* Priority and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select 
                                value={formData.priority} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                            >
                                <SelectTrigger data-testid="task-priority-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger data-testid="task-status-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    data-testid="task-deadline-trigger"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.deadline ? (
                                        format(formData.deadline, 'PPP')
                                    ) : (
                                        <span className="text-muted-foreground">Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={formData.deadline}
                                    onSelect={(date) => {
                                        setFormData(prev => ({ ...prev, deadline: date }));
                                        setCalendarOpen(false);
                                    }}
                                    initialFocus
                                    data-testid="task-calendar"
                                />
                            </PopoverContent>
                        </Popover>
                        {formData.deadline && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData(prev => ({ ...prev, deadline: null }))}
                                className="text-xs text-muted-foreground"
                            >
                                Clear deadline
                            </Button>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                            id="tags"
                            placeholder="Add a tag and press Enter"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            data-testid="task-tags-input"
                        />
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.tags.map((tag, idx) => (
                                    <Badge 
                                        key={idx} 
                                        variant="secondary"
                                        className="pl-2 pr-1 py-1 gap-1"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            data-testid="task-cancel-button"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading || !formData.title.trim()}
                            data-testid="task-save-button"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                task ? 'Update Task' : 'Create Task'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
