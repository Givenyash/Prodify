import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { 
    CheckSquare, 
    Sun, 
    Moon, 
    Search, 
    Filter, 
    User, 
    LogOut,
    Plus
} from 'lucide-react';

export default function Header({ 
    onSearch, 
    onFilterPriority, 
    onFilterStatus,
    onAddTask,
    searchQuery,
    filterPriority,
    filterStatus 
}) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [showFilters, setShowFilters] = useState(false);

    return (
        <header className="sticky top-0 z-50 glass-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-7 w-7 text-primary" strokeWidth={1.5} />
                        <span className="text-xl font-semibold tracking-tight font-[Outfit]">ProdiFY</span>
                    </div>

                    {/* Search and Filters - Desktop */}
                    <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-8">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => onSearch(e.target.value)}
                                className="pl-9 bg-white/50 dark:bg-zinc-800/50"
                                data-testid="search-input"
                            />
                        </div>
                        
                        <Select value={filterPriority} onValueChange={onFilterPriority}>
                            <SelectTrigger className="w-32" data-testid="filter-priority-select">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterStatus} onValueChange={onFilterStatus}>
                            <SelectTrigger className="w-32" data-testid="filter-status-select">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Mobile Filter Toggle */}
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="md:hidden"
                            onClick={() => setShowFilters(!showFilters)}
                            data-testid="mobile-filter-toggle"
                        >
                            <Filter className="h-5 w-5" />
                        </Button>

                        {/* Add Task Button */}
                        <Button 
                            onClick={onAddTask}
                            className="gap-2"
                            data-testid="add-task-button"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Task</span>
                        </Button>

                        {/* Theme Toggle */}
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={toggleTheme}
                            data-testid="theme-toggle"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </Button>

                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    data-testid="user-menu-trigger"
                                >
                                    <User className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={logout}
                                    className="text-red-600 dark:text-red-400 cursor-pointer"
                                    data-testid="logout-button"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Mobile Filters */}
                {showFilters && (
                    <div className="md:hidden pb-4 flex flex-col gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => onSearch(e.target.value)}
                                className="pl-9"
                                data-testid="mobile-search-input"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterPriority} onValueChange={onFilterPriority}>
                                <SelectTrigger className="flex-1" data-testid="mobile-filter-priority">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={onFilterStatus}>
                                <SelectTrigger className="flex-1" data-testid="mobile-filter-status">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
