import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, MapPin, Calendar, Users, FolderHeart, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Common/Loader';
import ProjectDetails from './ProjectDetails';

const ProjectsList = () => {
  const { token, apiUrl } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get('id');

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${apiUrl}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

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

      // Redirect to the detail view of new project
      navigate(`/projects?id=${newProj._id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // If URL has `id` parameter, render details view of that project instead of grid!
  if (projectIdParam) {
    return <ProjectDetails projectId={projectIdParam} onBack={() => {
      fetchProjects();
      navigate('/projects');
    }} />;
  }

  if (loading) return <Loader />;

  // Search and Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.weddingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brideName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.groomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
    <div className="space-y-6 animate-fade-in p-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gold-200/20 shadow-card-soft select-none">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search weddings, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl glass-input text-slate-700"
          />
        </div>

        {/* Filters and Add button */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-xs rounded-xl glass-input bg-white text-slate-700 font-display font-medium"
          >
            <option value="All">All Phases</option>
            <option value="Planning">Planning Phase</option>
            <option value="Ongoing">Ongoing Phase</option>
            <option value="Completed">Completed Phase</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 text-plum-950 px-4 py-2.5 rounded-xl font-display text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Wedding
          </button>
        </div>
      </div>

      {/* Grid of Projects */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm select-none">
          <FolderHeart className="h-12 w-12 text-gold-300 mx-auto mb-2" />
          <p className="text-slate-400 font-display text-sm">No wedding projects match your criteria.</p>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="mt-3 text-xs font-semibold text-gold-600 hover:underline font-display"
          >
            Create one now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <div
              key={p._id}
              onClick={() => navigate(`/projects?id=${p._id}`)}
              className="glass-panel border-gold-200/10 rounded-3xl p-6 shadow-card-soft hover:shadow-glass hover:translate-y-[-3px] transition-all duration-300 cursor-pointer flex flex-col relative select-none"
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                <span className={`text-[10px] tracking-wider uppercase font-bold font-display px-2.5 py-1 rounded-full ${
                  p.status === 'Completed' ? 'bg-sage-50 text-sage-600' :
                  p.status === 'Ongoing' ? 'bg-blue-50 text-blue-600' :
                  'bg-gold-50 text-gold-600'
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Title & Info */}
              <div className="space-y-1.5 flex-1 pr-16">
                <span className="text-[10px] text-gold-600 font-bold uppercase tracking-wider font-display flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Wedding Project
                </span>
                <h3 className="font-serif font-bold text-lg text-plum-950 truncate mt-1">{p.weddingName}</h3>
                <p className="text-xs text-slate-500 font-display font-medium">
                  {p.brideName} & {p.groomName}
                </p>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100/80 mt-6 pt-5 text-xs text-slate-600 font-display">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{formatDateStr(p.weddingDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate" title={p.venue}>{p.venue}</span>
                </div>
              </div>

              {/* Members Avatars footer */}
              <div className="border-t border-slate-100/80 mt-5 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-display font-medium uppercase tracking-wider">Project Team</span>
                <div className="flex -space-x-2 overflow-hidden">
                  {p.members && p.members.slice(0, 4).map((member, idx) => (
                    <img
                      key={idx}
                      className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover bg-gold-50"
                      src={member.user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.user?.name || idx}`}
                      alt={member.user?.name || 'Member'}
                      title={member.user?.name || 'Team member'}
                    />
                  ))}
                  {p.members && p.members.length > 4 && (
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white select-none shrink-0 font-display">
                      +{p.members.length - 4}
                    </span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* CREATE WEDDING MODAL */}
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

export default ProjectsList;
