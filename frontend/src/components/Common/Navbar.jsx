import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Check, CircleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const Navbar = ({ onToggleSidebar, title = 'Dashboard' }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 bg-white/70 backdrop-blur-md border-b border-gold-200/20 select-none">
      {/* Page Title & Hamburger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:bg-gold-50 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="font-serif font-semibold text-xl tracking-tight text-plum-900">{title}</h2>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-6">
        {/* Real-time Notifications Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 rounded-xl border border-gold-200/20 bg-white shadow-sm hover:bg-gold-50 text-slate-600 transition-all duration-300 relative ${
              showNotifications ? 'bg-gold-50 border-gold-300' : ''
            }`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rosegold-400 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto glass-panel rounded-2xl shadow-xl border border-gold-200/40 divide-y divide-slate-100 flex flex-col z-50 animate-fade-in">
              <div className="p-4 bg-gold-50/50 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
                <span className="font-display font-semibold text-sm text-plum-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rosegold-100 text-rosegold-600 font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex-1 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CircleAlert className="h-5 w-5 text-gold-300" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-4 flex gap-3 text-xs leading-relaxed transition-colors duration-300 ${
                        !n.isRead ? 'bg-rosegold-50/30 hover:bg-rosegold-50/50' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className={`${!n.isRead ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {formatTimestamp(n.createdAt)}
                        </span>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n._id)}
                          className="w-6 h-6 rounded-full border border-rosegold-200 text-rosegold-500 hover:bg-rosegold-100 flex items-center justify-center self-center shrink-0 transition-colors duration-250"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge Profile Icon */}
        {user && (
          <div className="flex items-center gap-3 border-l border-gold-200/30 pl-6 select-none">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
              alt={user.name}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-gold-500/20 bg-gold-50"
            />
            <div className="hidden md:block">
              <span className="block text-sm font-display font-medium text-slate-700 leading-tight">{user.name}</span>
              <span className="block text-[10px] font-display text-slate-400 leading-none mt-0.5">{user.role}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
