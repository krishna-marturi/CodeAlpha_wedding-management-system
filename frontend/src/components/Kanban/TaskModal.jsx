import React, { useState, useEffect, useRef } from 'react';
import { Calendar, User, Clock, MessageSquare, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Loader from '../Common/Loader';

const TaskModal = ({ task, members, onClose, onTaskUpdate }) => {
  const { token, apiUrl, user } = useAuth();
  const socket = useSocket();

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Edit fields state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?._id || '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.substring(0, 10) : '');
  const [status, setStatus] = useState(task.status);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const commentsEndRef = useRef(null);

  useEffect(() => {
    fetchComments();
    // Reset edit fields when task changes
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo?._id || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
    setStatus(task.status);
  }, [task]);

  // Listen for socket comment updates
  useEffect(() => {
    if (!socket || !task) return;

    const handleCommentAdded = (newComment) => {
      if (String(newComment.taskId) === String(task._id)) {
        console.log('Real-time comment received:', newComment);
        setComments(prev => {
          // Avoid duplicate comments in state
          if (prev.some(c => c._id === newComment._id)) return prev;
          return [...prev, newComment];
        });
        scrollToBottom();
      }
    };

    socket.on('commentAdded', handleCommentAdded);

    return () => {
      socket.off('commentAdded', handleCommentAdded);
    };
  }, [socket, task]);

  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${apiUrl}/comments/${task._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Submit Task Details Edit
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          assignedTo: assignedTo || null,
          priority,
          dueDate: dueDate || null,
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      onTaskUpdate();
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: task._id,
          message: commentText
        })
      });

      const newComment = await response.json();

      if (!response.ok) {
        throw new Error(newComment.message || 'Failed to add comment');
      }

      setComments(prev => [...prev, newComment]);
      setCommentText('');
      scrollToBottom();
    } catch (err) {
      alert(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      onTaskUpdate();
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDateStr = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4 select-none">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-gold-100/50 animate-fade-in max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 relative">
        
        {/* Close Modal Trigger */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer z-10"
        >
          &times;
        </button>

        {/* LEFT COLUMN: TASK DETAILS & DETAILS FORM */}
        <div className="flex-1 space-y-5">
          {isEditing ? (
            <form onSubmit={handleSaveDetails} className="space-y-4 font-display text-xs">
              <h3 className="font-serif font-bold text-base text-plum-950">Edit Task details</h3>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Task Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl glass-input text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl glass-input text-slate-800 min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Assignee</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
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
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-white text-slate-700 font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input bg-white text-slate-700 font-medium"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-gold-500 hover:bg-gold-600 text-plum-950 font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            // READ ONLY VIEW
            <div className="space-y-5">
              <div>
                <span className={`text-[9px] uppercase font-bold tracking-wider font-display px-2 py-0.5 rounded-full ${
                  task.priority === 'High' ? 'bg-rosegold-50 text-rosegold-600' :
                  task.priority === 'Medium' ? 'bg-gold-50 text-gold-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {task.priority} Priority
                </span>
                <h3 className="font-serif font-bold text-lg text-plum-950 mt-2.5 leading-snug">{task.title}</h3>
              </div>

              {task.description ? (
                <div className="space-y-1 text-xs font-display">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Description</span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[60px] whitespace-pre-line">
                    {task.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-display italic">No description provided for this milestone.</p>
              )}

              {/* Task Metadata panel */}
              <div className="grid grid-cols-2 gap-4 text-xs font-display border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-450 block leading-none">Assignee</span>
                    <span className="font-semibold block mt-0.5 text-slate-700">
                      {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-450 block leading-none">Timeline Due</span>
                    <span className="font-semibold block mt-0.5 text-slate-700">
                      {task.dueDate ? formatDateStr(task.dueDate) : 'No due date'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs font-display">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-gold-500 hover:bg-gold-600 text-plum-950 font-semibold px-4.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Edit Task Details
                </button>
                <button
                  onClick={handleDeleteTask}
                  className="text-rosegold-500 hover:text-rosegold-700 p-2.5 rounded-xl hover:bg-rosegold-50 transition-colors cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DISCUSSION BOARD (COMMENTS) */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6 flex flex-col h-[400px] md:h-auto select-none">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 shrink-0">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <h4 className="font-serif font-bold text-sm text-plum-950">Discussion Timeline</h4>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {commentsLoading ? (
              <Loader />
            ) : comments.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-[10px] text-slate-400 italic text-center font-display leading-relaxed">
                No comments posted yet.<br />Start the discussion below.
              </div>
            ) : (
              comments.map((c) => {
                const cUser = c.userId;
                if (!cUser) return null;
                const isSelfComment = String(cUser._id) === String(user._id);

                return (
                  <div key={c._id} className="flex gap-2.5 text-xs">
                    <img
                      src={cUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cUser.name}`}
                      alt={cUser.name}
                      className="w-7 h-7 rounded-lg bg-gold-50 object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 select-none">
                        <span className="font-display font-semibold text-slate-700 truncate">{cUser.name}</span>
                        <span className="text-[9px] text-slate-400 font-display shrink-0">
                          {new Date(c.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 font-display mt-0.5 leading-relaxed whitespace-pre-wrap">
                        {c.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Form input */}
          <form onSubmit={handleAddComment} className="border-t border-slate-100 pt-3 shrink-0 select-none">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write a message..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl glass-input text-slate-700"
                disabled={commentSubmitting}
                required
              />
              <button
                type="submit"
                disabled={commentSubmitting}
                className="bg-plum-900 text-white p-2 rounded-xl hover:bg-plum-800 transition-colors shrink-0 flex items-center justify-center cursor-pointer disabled:bg-plum-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TaskModal;
