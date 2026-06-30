import React from 'react';
import { Calendar, AlignLeft, User } from 'lucide-react';

const TaskCard = ({ task, onDragStart, onClick }) => {
  const isOverdue = () => {
    if (!task.dueDate || task.status === 'Completed') return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const formatDateStr = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task._id)}
      onClick={onClick}
      className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gold-300 transition-all duration-300 cursor-grab active:cursor-grabbing select-none flex flex-col space-y-3.5 group"
    >
      {/* Card Header Priority */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] uppercase font-bold tracking-wider font-display px-2 py-0.5 rounded-full ${
          task.priority === 'High' ? 'bg-rosegold-50 text-rosegold-600' :
          task.priority === 'Medium' ? 'bg-gold-50 text-gold-600' :
          'bg-slate-100 text-slate-600'
        }`}>
          {task.priority} Priority
        </span>
      </div>

      {/* Task Content */}
      <div className="space-y-1">
        <h5 className="font-display font-semibold text-xs leading-snug text-slate-800 group-hover:text-gold-700 transition-colors">
          {task.title}
        </h5>
        {task.description && (
          <p className="text-[10px] text-slate-400 font-display line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Card Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] font-display text-slate-500">
        
        {/* Dates indicators */}
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`flex items-center gap-1 font-medium ${
              isOverdue() ? 'text-rosegold-600 font-semibold' : 'text-slate-400'
            }`}>
              <Calendar className={`h-3 w-3 ${isOverdue() ? 'text-rosegold-500' : 'text-slate-400'}`} />
              {formatDateStr(task.dueDate)}
            </span>
          )}
          {task.description && <AlignLeft className="h-3 w-3 text-slate-350" />}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assignedTo ? (
            <img
              src={task.assignedTo.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${task.assignedTo.name}`}
              alt={task.assignedTo.name}
              title={`Assigned to ${task.assignedTo.name}`}
              className="w-5.5 h-5.5 rounded-full object-cover bg-gold-50 ring-1 ring-gold-200"
            />
          ) : (
            <div 
              className="w-5.5 h-5.5 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 bg-slate-50"
              title="Unassigned task"
            >
              <User className="h-2.5 w-2.5" />
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default TaskCard;
