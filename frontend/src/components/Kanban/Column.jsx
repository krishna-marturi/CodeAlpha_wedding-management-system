import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const Column = ({ name, tasks, onDragStart, onDrop, onAddTask, onTaskClick }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropInternal = (e) => {
    setIsOver(false);
    onDrop(e, name);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      className={`flex flex-col bg-[#F5EFEB]/30 rounded-3xl p-4 w-full h-[calc(100vh-250px)] min-h-[350px] transition-all duration-300 border-2 select-none ${
        isOver ? 'border-gold-400 bg-gold-50/15' : 'border-transparent'
      }`}
    >
      {/* Column Title and count */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
            name === 'Completed' ? 'bg-sage-500' :
            name === 'Review' ? 'bg-purple-400' :
            name === 'In Progress' ? 'bg-blue-400' :
            'bg-slate-400'
          }`}></span>
          <h4 className="font-display font-bold text-sm text-plum-950">{name}</h4>
          <span className="text-[10px] font-bold font-display px-2 py-0.5 bg-white border border-slate-100 rounded-lg text-slate-500 shrink-0 shadow-sm leading-none">
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTask(name)}
          className="p-1 rounded-lg hover:bg-gold-100/50 hover:text-gold-700 text-slate-400 transition-colors cursor-pointer"
          title="Add task to this column"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Task Cards List Container */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-4">
        {tasks.length === 0 ? (
          <div className="h-28 border border-dashed border-slate-200/80 rounded-2xl flex items-center justify-center text-[10px] font-display text-slate-400">
            Drag tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onDragStart={onDragStart}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Column;
