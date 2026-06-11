import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { getMenuForRole } from '../components/Sidebar';
import { Bell, Check, X, Clock, Info, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

const NotificationsPage = ({ user }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-250/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-250/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
        );
      case 'error':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-250/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <X className="w-5 h-5 text-rose-600" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-250/20 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Info className="w-5 h-5 text-indigo-650" />
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        user={user}
        onLogout={() => navigate('/login')}
        menuItems={getMenuForRole(user?.role || 'upps')}
      />

      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2 tracking-tight">
                <Bell className="w-8 h-8 text-indigo-650" />
                Notifikasi
              </h1>
              <p className="text-slate-550 text-sm font-semibold mt-1">
                {unreadCount > 0 
                  ? `${unreadCount} notifikasi belum dibaca` 
                  : 'Semua notifikasi Anda sudah dibaca dan mutakhir'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer hover:-translate-y-0.5"
              >
                <Check className="w-4 h-4" />
                Tandai Semua Dibaca
              </button>
            )}
          </div>

          {/* Filter Tabs - Premium Glass Capsule */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/60 p-1.5 mb-6 flex gap-2 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === 'read'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Sudah Dibaca ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-pulse">
              <Bell className="w-10 h-10 text-indigo-500 animate-bounce mb-3" />
              <p className="text-slate-550 font-bold text-sm">Memuat daftar notifikasi terbaru...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/50">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Tidak ada notifikasi</h3>
              <p className="text-slate-500 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                {filter === 'unread'
                  ? 'Luar biasa! Semua notifikasi Anda sudah dibaca dan terselesaikan.'
                  : filter === 'read'
                  ? 'Belum ada riwayat notifikasi yang telah Anda baca.'
                  : 'Anda belum memiliki notifikasi atau pengumuman masuk saat ini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 transition-all duration-200 flex flex-col relative overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-150/40 hover:-translate-y-0.5 ${
                    !notification.isRead ? 'border-l-4 border-l-indigo-650 pl-5' : 'pl-6'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-750 rounded-full text-[9px] font-black uppercase tracking-wider">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-550 leading-relaxed mb-4">{notification.message}</p>
                        
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            {new Date(notification.createdAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50/50 rounded-xl transition-all duration-150 cursor-pointer border border-transparent hover:border-indigo-100/50"
                          title="Tandai dibaca"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-150 cursor-pointer border border-transparent hover:border-rose-100/50"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
