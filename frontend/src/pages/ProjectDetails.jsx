import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Settings, LayoutGrid, Plus, Mail, Trash2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Loader from '../components/Common/Loader';
import Board from '../components/Kanban/Board';

const ProjectDetails = ({ projectId, onBack }) => {
  const { user, token, apiUrl } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdParam = searchParams.get('task');

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'team' | 'settings'

  // Member form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Staff');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Settings form states
  const [weddingName, setWeddingName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [settingsError, setSettingsError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load project details
  useEffect(() => {
    fetchProjectDetails();
  }, [projectId, token]);

  // Join Socket.IO Project Room
  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('joinProject', projectId);

    const handleProjectUpdated = (updatedProject) => {
      console.log('Project details updated live:', updatedProject);
      setProject(updatedProject);
      
      // Update form values
      setWeddingName(updatedProject.weddingName);
      setBrideName(updatedProject.brideName);
      setGroomName(updatedProject.groomName);
      setWeddingDate(updatedProject.weddingDate.substring(0, 10));
      setVenue(updatedProject.venue);
      setDescription(updatedProject.description);
      setStatus(updatedProject.status);
    };

    const handleProjectDeleted = () => {
      alert('This project has been deleted.');
      onBack();
    };

    socket.on('projectUpdated', handleProjectUpdated);
    socket.on('projectDeleted', handleProjectDeleted);

    return () => {
      socket.emit('leaveProject', projectId);
      socket.off('projectUpdated', handleProjectUpdated);
      socket.off('projectDeleted', handleProjectDeleted);
    };
  }, [socket, projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Project not found or not authorized');
      }

      const data = await response.json();
      setProject(data);

      // Initialize edit forms
      setWeddingName(data.weddingName);
      setBrideName(data.brideName);
      setGroomName(data.groomName);
      setWeddingDate(data.weddingDate ? data.weddingDate.substring(0, 10) : '');
      setVenue(data.venue);
      setDescription(data.description || '');
      setStatus(data.status);
    } catch (err) {
      console.error(err);
      alert(err.message);
      onBack();
    } finally {
      setLoading(false);
    }
  };

  // Add Member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setInviteError('');

    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invitation failed');
      }

      setProject(data);
      setInviteEmail('');
      setInviteRole('Staff');
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove member');
      }

      setProject(data);
    } catch (err) {
      alert(err.message);
    }
  };

  // Change Member Role
  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}/members/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change role');
      }

      setProject(data);
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Project Info
  const handleUpdateProjectSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess(false);

    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PUT',
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
          description,
          status
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Settings update failed');
      }

      setProject(data);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!window.confirm('WARNING: This will permanently delete the project, all its tasks, comments, and project settings. This action cannot be undone. Are you sure you want to proceed?')) return;

    try {
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete project');
      }

      onBack();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Loader />;
  if (!project) return null;

  // Authorization checks
  const isOwner = String(project.createdBy._id || project.createdBy) === String(user._id);
  const userMember = project.members.find(m => String(m.user?._id || m.user || m.userId) === String(user._id));
  const userRole = isOwner ? 'Owner' : (userMember ? userMember.role : 'Staff');
  const canManageMembers = ['Owner', 'Manager'].includes(userRole);
  const canManageSettings = ['Owner', 'Manager', 'Coordinator'].includes(userRole);

  const formatDateStr = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Detail Header Summary block */}
      <div className="bg-white rounded-3xl p-6 border border-gold-200/20 shadow-card-soft shrink-0 select-none">
        
        {/* Back and Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-100 hover:bg-gold-50/20 hover:border-gold-300 text-slate-500 cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gold-600 font-bold uppercase tracking-wider font-display">Active Project</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500"></span>
                <span className="text-[10px] text-slate-400 font-display font-medium">{project.status}</span>
              </div>
              <h2 className="font-serif font-bold text-2xl text-plum-950 mt-1">{project.weddingName}</h2>
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="flex flex-wrap items-center gap-4 md:gap-8 text-xs text-slate-600 font-display">
            <div className="flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-none">Wedding Date</span>
                <span className="font-semibold block mt-0.5">{new Date(project.weddingDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-none">Venue</span>
                <span className="font-semibold block mt-0.5 max-w-[150px] truncate" title={project.venue}>{project.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-t border-slate-100/80 mt-6 pt-2 gap-2 text-xs">
          {[
            { id: 'board', name: 'Task Kanban Board', icon: LayoutGrid },
            { id: 'team', name: 'Team Members', icon: Users },
            { id: 'settings', name: 'Project Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Remove task queries on tab clicks
                  if (taskIdParam) navigate(`/projects?id=${projectId}`);
                }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-display font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-plum-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-gold-50/50 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

      </div>

      {/* Tab Panels Contents */}
      <div className="flex-1 overflow-hidden flex flex-col">
        
        {/* KANBAN BOARD TAB */}
        {activeTab === 'board' && (
          <Board projectId={projectId} members={project.members} />
        )}

        {/* TEAM MANAGEMENT TAB */}
        {activeTab === 'team' && (
          <div className="glass-panel border-gold-200/10 p-6 rounded-3xl shadow-card-soft overflow-y-auto space-y-8 animate-fade-in select-none">
            {/* Add Team Member Section */}
            {canManageMembers && (
              <div className="space-y-4 max-w-xl">
                <h3 className="font-serif font-bold text-base text-plum-950">Add Team Member</h3>
                {inviteError && (
                  <div className="p-3 bg-rosegold-50 border border-rosegold-200 rounded-xl text-xs text-rosegold-600">
                    {inviteError}
                  </div>
                )}
                <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="planner@everafter.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input text-slate-700"
                      required
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-4 py-2.5 text-xs rounded-xl glass-input bg-white text-slate-700 font-display font-semibold shrink-0"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Staff">Staff</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-gold-500 hover:bg-gold-600 text-plum-950 px-5 py-2.5 text-xs font-semibold rounded-xl font-display transition-all shadow-sm shrink-0 cursor-pointer"
                  >
                    Invite
                  </button>
                </form>
              </div>
            )}

            {/* Members List Table */}
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-base text-plum-950">Project Team List ({project.members.length})</h3>
              
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs font-display">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role Badge</th>
                      {canManageMembers && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.members.map((m) => {
                      const mUser = m.user;
                      if (!mUser) return null;
                      const isTargetOwner = m.role === 'Owner';
                      const isTargetSelf = String(mUser._id) === String(user._id);

                      return (
                        <tr key={mUser._id} className="hover:bg-slate-50/50">
                          <td className="p-4 flex items-center gap-3">
                            <img
                              src={mUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${mUser.name}`}
                              alt={mUser.name}
                              className="w-8 h-8 rounded-lg object-cover bg-gold-50"
                            />
                            <span className="font-medium text-slate-800">{mUser.name} {isTargetSelf && '(You)'}</span>
                          </td>
                          <td className="p-4 text-slate-500">{mUser.email}</td>
                          <td className="p-4">
                            {canManageMembers && !isTargetOwner && !isTargetSelf ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(mUser._id, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                              >
                                <option value="Manager">Manager</option>
                                <option value="Coordinator">Coordinator</option>
                                <option value="Staff">Staff</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                m.role === 'Owner' ? 'bg-plum-900 text-white' :
                                m.role === 'Manager' ? 'bg-gold-100 text-gold-700' :
                                m.role === 'Coordinator' ? 'bg-blue-50 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {m.role}
                              </span>
                            )}
                          </td>
                          {canManageMembers && (
                            <td className="p-4 text-right">
                              {!isTargetOwner && !isTargetSelf && (
                                <button
                                  onClick={() => handleRemoveMember(mUser._id)}
                                  className="text-rosegold-500 hover:text-rosegold-700 p-1.5 rounded-lg hover:bg-rosegold-50 transition-colors cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PROJECT INFO & SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="glass-panel border-gold-200/10 p-6 rounded-3xl shadow-card-soft overflow-y-auto space-y-8 animate-fade-in select-none">
            {/* Edit Project details form */}
            {canManageSettings ? (
              <form onSubmit={handleUpdateProjectSettings} className="space-y-6 max-w-xl">
                <h3 className="font-serif font-bold text-lg text-plum-950">Edit Wedding Details</h3>
                
                {settingsError && (
                  <div className="p-4 bg-rosegold-50 border border-rosegold-200 rounded-xl text-xs text-rosegold-600">
                    {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="p-4 bg-sage-50 border border-sage-200 rounded-xl text-xs text-sage-600">
                    Wedding settings saved successfully!
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 font-display">Wedding Project Name *</label>
                    <input
                      type="text"
                      value={weddingName}
                      onChange={(e) => setWeddingName(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 font-display">Bride's Name *</label>
                      <input
                        type="text"
                        value={brideName}
                        onChange={(e) => setBrideName(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 font-display">Groom's Name *</label>
                      <input
                        type="text"
                        value={groomName}
                        onChange={(e) => setGroomName(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800"
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
                        className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 font-display">Venue *</label>
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-xs font-semibold text-slate-600 font-display">Project Status *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white"
                        required
                      >
                        <option value="Planning">Planning</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 font-display">Project Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-800 min-h-[80px]"
                      rows={3}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="bg-gold-500 hover:bg-gold-600 text-plum-950 font-display text-xs font-semibold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {settingsLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            ) : (
              // Read only display for non-managers
              <div className="space-y-6 max-w-xl">
                <h3 className="font-serif font-bold text-lg text-plum-950">Wedding Information</h3>
                <div className="space-y-4 text-xs font-display text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wedding Project Name</span>
                    <span className="font-medium text-sm text-plum-900 mt-1 block">{project.weddingName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Bride's Name</span>
                      <span className="font-medium text-slate-800 mt-1 block">{project.brideName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Groom's Name</span>
                      <span className="font-medium text-slate-800 mt-1 block">{project.groomName}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Date</span>
                      <span className="font-medium text-slate-800 mt-1 block">{formatDateStr(project.weddingDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Venue</span>
                      <span className="font-medium text-slate-800 mt-1 block">{project.venue}</span>
                    </div>
                  </div>
                  {project.description && (
                    <div>
                      <span className="text-[10px] text-slate-400 block">Description</span>
                      <p className="text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {project.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dangerous Zone (Delete Project) */}
            {isOwner && (
              <div className="border-t border-rosegold-100/50 pt-8 space-y-4 max-w-xl">
                <h4 className="font-serif font-bold text-sm text-rosegold-700">Danger Zone</h4>
                <p className="text-xs text-slate-500 font-display">
                  Deleting this project will permanently remove the wedding plan, all tasks, comments, and member link records. This is irreversible.
                </p>
                <button
                  onClick={handleDeleteProject}
                  className="flex items-center gap-2 bg-rosegold-500 hover:bg-rosegold-600 text-white font-display text-xs font-semibold px-5 py-3 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Wedding Project
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectDetails;
