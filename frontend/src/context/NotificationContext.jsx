import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token, apiUrl } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null); // Real-time notification toaster state

  // Fetch notifications initially
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user || !token) {
        setNotifications([]);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [user, token, apiUrl]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      console.log('Real-time notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      // Trigger temporary banner toast
      setToast(notification);
      setTimeout(() => {
        setToast(null);
      }, 5000);
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket]);

  const markRead = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/notifications/read/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const clearToast = () => setToast(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value = {
    notifications,
    unreadCount,
    markRead,
    toast,
    clearToast
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Real-time Global Premium Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in glass-panel border-rosegold-300 max-w-sm rounded-xl p-4 shadow-xl border flex gap-3 hover:translate-y-[-2px] transition-transform duration-300">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rosegold-100 text-rosegold-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-display font-semibold text-sm text-plum-900">New Alert</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-600 self-start text-xs p-1"
          >
            &times;
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
