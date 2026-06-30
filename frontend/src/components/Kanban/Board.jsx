import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Loader from '../Common/Loader';
import Column from './Column';
import TaskModal from './TaskModal';

const Board = ({ projectId, members }) => {
  const { token, apiUrl, user } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTaskId = searchParams.get('task');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dueDateFilter, setDueDateFilter] = useState('All'); // 'All' | 'Overdue' | 'Today' | 'Week'

  // Task Modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInStatus, setCreateInStatus] = useState('To Do');

  // Form states for creating a task
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createAssignee, setCreateAssignee] = useState('');
  const [createPriority, setCreatePriority] = useState('Medium');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Columns definition
  const columns = ['To Do', 'In Progress', 'Review', 'Completed'];

  // Load project tasks
  useEffect(() => {
    fetchTasks();
  }, [projectId, token]);

  // Open modal if URL has task parameter
  useEffect(() => {
    if (activeTaskId && tasks.length > 0) {
      const task = tasks.find(t => String(t._id) === String(activeTaskId));
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [activeTaskId, tasks]);

  // Real-time socket events for board
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleTaskCreated = (newTask) => {
      console.log('Real-time task created:', newTask);
      setTasks(prev => {
        // Prevent double insertion
        if (prev.some(t => t._id === newTask._id)) return prev;
        return [...prev, newTask];
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      console.log('Real-time task updated:', updatedTask);
      setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
      // Update details modal if it's currently showing
      setSelectedTask(prev => prev && prev._id === updatedTask._id ? updatedTask : prev);
    };

    const handleTaskDeleted = ({ taskId }) => {
      console.log('Real-time task deleted:', taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setSelectedTask(prev => prev && prev._id === taskId ? null : prev);
    };

    socket.on('taskCreated', handleTaskCreated);
    socket.on('taskUpdated', handleTaskUpdated);
    socket.on('taskDeleted', handleTaskDeleted);

    return () => {
      socket.off('taskCreated', handleTaskCreated);
      socket.off('taskUpdated', handleTaskUpdated);
      socket.off('taskDeleted', handleTaskDeleted);
    };
  }, [socket, projectId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // HTML5 Native Drag & Drop updates
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Find original task
    const taskToMove = tasks.find(t => String(t._id) === String(taskId));
    if (!taskToMove || taskToMove.status === targetStatus) return;

    // Optimistically update status locally
    setTasks(prev => prev.map(t => String(t._id) === String(taskId) ? { ...t, status: targetStatus } : t));

    try {
      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update task position');
      }
      
      const updatedTask = await response.json();
      // Synchronize state with response
      setTasks(prev => prev.map(t => String(t._id) === String(taskId) ? updatedTask : t));
    } catch (err) {
      console.error('Drag drop error:', err);
      // Revert status on failure
      fetchTasks();
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createTitle) return;

    setCreateLoading(true);
    setCreateError('');

    try {
      const response = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          title: createTitle,
          description: createDesc,
          assignedTo: createAssignee || null,
          priority: createPriority,
          dueDate: createDueDate || null,
          status: createInStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create task');
      }

     // setTasks(prev => [...prev, data]);
      setShowCreateModal(false);
      
      // Clear forms
      setCreateTitle('');
      setCreateDesc('');
      setCreateAssignee('');
      setCreatePriority('Medium');
      setCreateDueDate('');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Close details modal
  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    // Remove query params
    searchParams.delete('task');
    setSearchParams(searchParams);
  };

  if (loading) return <Loader />;

  // Filter Tasks Logically
  const filteredTasks = tasks.filter((t) => {
    // Search text match
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Assignee filter match
    let matchesAssignee = true;
    if (assigneeFilter !== 'All') {
      if (assigneeFilter === 'Unassigned') {
        matchesAssignee = t.assignedTo === null;
      } else {
        matchesAssignee = t.assignedTo && String(t.assignedTo._id || t.assignedTo) === String(assigneeFilter);
      }
    }

    // Priority filter match
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;

    // Due date filter match
    let matchesDueDate = true;
    if (dueDateFilter !== 'All' && t.dueDate) {
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      if (dueDateFilter === 'Overdue') {
        matchesDueDate = dueDate < today && t.status !== 'Completed';
      } else if (dueDateFilter === 'Today') {
        matchesDueDate = dueDate >= today && dueDate < tomorrow;
      } else if (dueDateFilter === 'Week') {
        matchesDueDate = dueDate >= today && dueDate <= nextWeek;
      }
    } else if (dueDateFilter !== 'All' && !t.dueDate) {
      matchesDueDate = false;
    }

    return matchesSearch && matchesAssignee && matchesPriority && matchesDueDate;
  });

  const openCreateTask = (status) => {
    setCreateInStatus(status);
    setShowCreateModal(true);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col space-y-4 animate-fade-in select-none">
      
      {/* Board Filters Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-3 rounded-2xl border border-gold-200/20 shadow-sm shrink-0">
        
        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input text-slate-700"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium font-display"
          >
            <option value="All">All Assignees</option>
            <option value="Unassigned">Unassigned Only</option>
            {members.map((m) => (
              <option key={m.user?._id || m.userId} value={m.user?._id || m.userId}>
                {m.user?.name || 'Unknown User'}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium font-display"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Due date filter */}
          <select
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-medium font-display"
          >
            <option value="All">All Timeline Dates</option>
            <option value="Overdue">Overdue</option>
            <option value="Today">Due Today</option>
            <option value="Week">Due this Week</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="flex-1 overflow-x-auto pb-4 select-none">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 h-full min-w-[1000px] xl:min-w-0 px-2">
          {columns.map((columnName) => {
            const columnTasks = filteredTasks.filter(t => t.status === columnName);
            return (
              <Column
                key={columnName}
                name={columnName}
                tasks={columnTasks}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onAddTask={openCreateTask}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setSearchParams({ id: projectId, task: task._id });
                }}
              />
            );
          })}
        </div>
      </div>

      {/* DETAIL TASK MODAL POPUP */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          members={members}
          onClose={handleCloseTaskModal}
          onTaskUpdate={fetchTasks}
        />
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-gold-100/50 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h3 className="font-serif font-bold text-base text-plum-900">New Task in "{createInStatus}"</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-rosegold-50 border border-rosegold-200 rounded-xl text-xs text-rosegold-600">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 font-display text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Confirm Catering Menu"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl glass-input text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Description</label>
                <textarea
                  placeholder="Add details, links, or contact names..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl glass-input text-slate-800 min-h-[60px]"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Assignee</label>
                  <select
                    value={createAssignee}
                    onChange={(e) => setCreateAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-white text-slate-700 font-medium"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user?._id || m.userId} value={m.user?._id || m.userId}>
                        {m.user?.name || 'Unknown User'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-white text-slate-700 font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Due Date</label>
                <input
                  type="date"
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold rounded-xl hover:from-gold-600 hover:to-gold-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {createLoading ? 'Adding...' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;
