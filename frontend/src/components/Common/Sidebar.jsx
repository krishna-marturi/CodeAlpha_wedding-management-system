import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, User, LogOut, Heart, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Wedding Projects', path: '/projects', icon: FolderKanban },
    { name: 'Profile Settings', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full text-white bg-plum-900 border-r border-plum-950/20">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-plum-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg leading-tight tracking-wide text-gold-100">EverAfter</h1>
            <p className="text-[10px] text-gold-400/70 tracking-widest uppercase font-display">Planners Portal</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg lg:hidden hover:bg-plum-800 text-gold-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Quick Info */}
      {user && (
        <div className="p-6 border-b border-plum-800/30">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
              alt={user.name}
              className="w-11 h-11 rounded-xl bg-plum-850 object-cover ring-2 ring-gold-500/30"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-medium text-sm text-gold-100 truncate">{user.name}</h3>
              <p className="text-xs text-gold-400/80 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block animate-pulse"></span>
                {user.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl font-display text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gold-500 text-plum-950 shadow-md font-semibold'
                    : 'text-gold-200/80 hover:bg-plum-800 hover:text-white'
                }`
              }
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-4 border-t border-plum-800/30">
        <button
          onClick={handleLogout}
          className="flex items-center w-full gap-3.5 px-4 py-3 text-gold-200/80 hover:bg-plum-800 hover:text-rosegold-300 rounded-xl font-display text-sm font-medium transition-all duration-300"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Static Drawer */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile Sidebar Slider */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 transition-transform duration-350 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
