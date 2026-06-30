import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ClipboardList, CheckSquare, Clock, Plus, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Common/Loader';

const Dashboard = () => {
  const { user, token, apiUrl } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for new project
  const [weddingName, setWeddingName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projRes = await fetch(`${apiUrl}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!projRes.ok) throw new Error('Failed to fetch projects');
        const projectsData = await projRes.json();
        setProjects(projectsData);

        // Fetch tasks for each project in parallel
        const allTasksPromises = projectsData.map(async (p) => {
          const taskRes = await fetch(`${apiUrl}/tasks/project/${p._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (taskRes.ok) {
            const taskData = await taskRes.json();
            // Attach project info to task for dashboard listing
            return taskData.map(t => ({ ...t, projectName: p.weddingName }));
          }
          return [];
        });

        const tasksArrays = await Promise.all(allTasksPromises);
        const flattenedTasks = tasksArrays.flat();
        setTasks(flattenedTasks);
      } catch (err) {
        console.error('Dashboard loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchData();
    }
  }, [user, token, apiUrl]);

  // Handle Project Creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!weddingName || !brideName || !groomName || !weddingDate || !venue) {
      setFormError('Please fill in all required fields');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weddingName,
          brideName,
          groomName,
          weddingDate,
          venue,
          description
        })
      });

      const newProj = await response.json();

      if (!response.ok) {
        throw new Error(newProj.message || 'Failed to create project');
      }

      setProjects(prev => [newProj, ...prev]);
      setShowCreateModal(false);
      
      // Clear forms
      setWeddingName('');
      setBrideName('');
      setGroomName('');
      setWeddingDate('');
      setVenue('');
      setDescription('');
      
      // Redirect to the Kanban board of the new project
      navigate(`/projects?id=${newProj._id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <Loader fullPage={false} />;

  // Aggregated Stats Calculations
  const totalProjects = projects.length;
  
  // Tasks assigned to logged in user
  const myTasks = tasks.filter(t => t.assignedTo && String(t.assignedTo._id || t.assignedTo) === String(user._id));
  const myCompletedTasks = myTasks.filter(t => t.status === 'Completed');
  const myPendingTasks = myTasks.filter(t => t.status !== 'Completed');

  // Recent activity: sort all tasks across projects by updated time
  const recentActivities = [...tasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

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
    <div className="space-y-8 animate-fade-in p-6">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-plum-900 to-plum-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden select-none">
        {/* Abstract Gold Glow decoration */}
        <div className="absolute top-[-30%] right-[-10%] w-[35%] aspect-square rounded-full bg-gold-500/20 blur-[60px] pointer-events-none"></div>
        
        <div className="space-y-2 relative z-10">
          <h2 className="font-serif font-semibold text-2xl text-gold-100">Welcome, {user.name}</h2>
          <p className="text-sm text-gold-200/70 font-display max-w-lg">
            Manage your timelines, coordinate with vendors, and track wedding milestones seamlessly.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-plum-950 font-display text-sm font-semibold px-5 py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md shrink-0 cursor-pointer self-start md:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Wedding Project
        </button>
      </div>

      {/* Statistics Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        {[
          { title: 'Total Projects', value: totalProjects, icon: FolderKanban, color: 'text-plum-600 bg-plum-50 border-plum-100' },
          { title: 'My Tasks', value: myTasks.length, icon: ClipboardList, color: 'text-gold-600 bg-gold-50 border-gold-100' },
          { title: 'Completed Tasks', value: myCompletedTasks.length, icon: CheckSquare, color: 'text-sage-600 bg-sage-50 border-sage-100' },
          { title: 'Pending Milestones', value: myPendingTasks.length, icon: Clock, color: 'text-rosegold-600 bg-rosegold-50 border-rosegold-100' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel border-gold-200/10 p-6 rounded-2xl flex items-center gap-4 shadow-card-soft hover:shadow-glass hover:translate-y-[-2px] transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-display font-medium tracking-wide uppercase">{stat.title}</span>
                <h3 className="text-2xl font-bold text-plum-950 mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: My Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: My Tasks List */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          <div className="flex items-center justify-between px-2 select-none">
            <h3 className="font-serif font-bold text-lg text-plum-900">Assigned Tasks ({myTasks.length})</h3>
            <button 
              onClick={() => navigate('/projects')}
              className="text-xs font-display font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 hover:underline"
            >
              Go to project boards <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="glass-panel border-gold-200/10 p-6 rounded-3xl flex-1 shadow-card-soft">
            {myTasks.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm font-display flex flex-col items-center justify-center gap-2 select-none">
                <CheckSquare className="h-10 w-10 text-gold-300 mb-1" />
                <span>You have no active tasks assigned to you.</span>
                <button 
                  onClick={() => navigate('/projects')} 
                  className="mt-3 text-xs font-semibold text-gold-600 hover:underline"
                >
                  Browse Projects
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => navigate(`/projects?id=${t.projectId}&task=${t._id}`)}
                    className="p-4 rounded-xl border border-slate-100 hover:border-gold-300 hover:bg-gold-50/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full font-display leading-none ${
                          t.priority === 'High' ? 'bg-rosegold-50 text-rosegold-600' :
                          t.priority === 'Medium' ? 'bg-gold-50 text-gold-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {t.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-display truncate max-w-[150px]">
                          {t.projectName}
                        </span>
                      </div>
                      <h4 className="font-display font-semibold text-sm text-slate-800 mt-2 leading-tight">
                        {t.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 self-stretch sm:self-center justify-between sm:justify-end">
                      {t.dueDate && (
                        <span className="text-xs text-slate-500 font-display flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateStr(t.dueDate)}
                        </span>
                      )}
                      <span className={`text-xs font-display font-semibold px-3 py-1 rounded-xl uppercase tracking-wider ${
                        t.status === 'Completed' ? 'bg-sage-50 text-sage-600' :
                        t.status === 'Review' ? 'bg-purple-50 text-purple-600' :
                        t.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Recent Activity Feed */}
        <div className="space-y-4 flex flex-col">
          <div className="px-2 select-none">
            <h3 className="font-serif font-bold text-lg text-plum-900">Recent Task Activities</h3>
          </div>

          <div className="glass-panel border-gold-200/10 p-6 rounded-3xl flex-1 shadow-card-soft">
            {recentActivities.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm font-display select-none">
                No recent activity.
              </div>
            ) : (
              <div className="relative border-l border-gold-200/40 pl-5 space-y-6 select-none">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="relative text-xs">
                    {/* Activity Dot */}
                    <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-gold-400 border-2 border-white shadow-sm ring-4 ring-gold-50"></span>
                    
                    <span className="text-slate-400 font-display block">
                      {formatDateStr(act.updatedAt || act.createdAt)}
                    </span>
                    <p className="text-slate-700 font-display font-medium mt-1 leading-relaxed">
                      Task <span className="font-semibold text-plum-900">"{act.title}"</span> in project "{act.projectName}" was modified.
                    </p>
                    <span className="text-[10px] text-slate-400 uppercase font-display font-bold tracking-wider mt-1 block">
                      Status: {act.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-gold-100/50 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="font-serif font-bold text-lg text-plum-900">New Wedding Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-rosegold-50 border border-rosegold-200 text-xs text-rosegold-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 font-display">Wedding Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Juliet & Romeo's Wedding Plan"
                  value={weddingName}
                  onChange={(e) => setWeddingName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 font-display">Bride's Name *</label>
                  <input
                    type="text"
                    placeholder="Bride's Name"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 font-display">Groom's Name *</label>
                  <input
                    type="text"
                    placeholder="Groom's Name"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 font-display">Wedding Date *</label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 font-display">Venue *</label>
                  <input
                    type="text"
                    placeholder="Venue location"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 font-display">Project Description</label>
                <textarea
                  placeholder="Notes, theme ideas, or budget summaries..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl glass-input text-slate-800 min-h-[80px]"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white font-display text-sm font-semibold rounded-xl hover:from-gold-600 hover:to-gold-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {formLoading ? 'Creating...' : 'Initialize Project'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
