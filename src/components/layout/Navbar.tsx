import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, LogOut, Search } from 'lucide-react';
import { messagesApi, notificationsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const UNREAD_STATE_EVENT = 'servify:unread-state-changed';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setHasUnreadNotifications(false);
      return;
    }

    let isCancelled = false;

    const loadUnreadNotifications = async () => {
      try {
        const [unreadNotifications, conversations] = await Promise.all([
          notificationsApi.list(true),
          messagesApi.listConversations({ limit: 200 }),
        ]);

        const unreadConversations = conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0);
        if (!isCancelled) {
          setHasUnreadNotifications(unreadNotifications.length > 0 || unreadConversations > 0);
        }
      } catch (error) {
        if (!isCancelled) {
          setHasUnreadNotifications(false);
        }
        console.error(error);
      }
    };

    void loadUnreadNotifications();
    const onUnreadStateChanged = () => {
      void loadUnreadNotifications();
    };
    const onWindowFocus = () => {
      void loadUnreadNotifications();
    };

    window.addEventListener(UNREAD_STATE_EVENT, onUnreadStateChanged);
    window.addEventListener('focus', onWindowFocus);
    const intervalId = window.setInterval(() => {
      void loadUnreadNotifications();
    }, 30000);

    return () => {
      isCancelled = true;
      window.removeEventListener(UNREAD_STATE_EVENT, onUnreadStateChanged);
      window.removeEventListener('focus', onWindowFocus);
      window.clearInterval(intervalId);
    };
  }, [user?.id]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Browse Services', path: '/services' },
    { name: 'How It Works', path: '/about' },
    { name: 'Portfolio', path: '/professionals' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'shadow-sm' : ''
      )}
    >
      <div
        className={cn(
          'w-full px-4 md:px-8 h-20 flex items-center justify-between transition-all duration-300',
          isScrolled
            ? 'glass'
            : 'bg-[#f9f9fc]/80 backdrop-blur-xl'
        )}
      >
        <Link to="/" className="text-2xl font-display font-bold tracking-tight text-brand-500">
          Servify
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-[#6f7979] hover:text-brand-500 font-medium transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-3 px-4 py-2 rounded-lg bg-[#e2e2e5]">
            <Search size={16} className="text-[#6f7979]" />
            <input
              type="text"
              placeholder="Search professionals..."
              className="bg-transparent text-sm w-48 outline-none text-[#1a1c1e] placeholder:text-[#6f7979]"
            />
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/messages')}
                className="p-2 rounded-lg hover:bg-brand-50 relative"
                title="Messages & Notifications"
              >
                <Bell size={20} className="text-slate-600 dark:text-slate-300" />
                {hasUnreadNotifications && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>
              <Link to="/dashboard" className="flex items-center gap-3 pl-4 border-l border-brand-200/40">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-brand-500" />
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-brand-500 bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold text-sm">{user.name.charAt(0)}</div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold dark:text-white leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{user.role}</span>
                </div>
              </Link>
              <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link to="/signup">
                <Button>Become a Pro</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-lg bg-white/70 border border-brand-200/40 text-slate-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-xl glass border border-brand-200/30 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-semibold text-slate-700"
            >
              {link.name}
            </Link>
          ))}
          <hr className="border-brand-200/40" />
          {user ? (
            <>
              <Link to="/messages" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-700 dark:text-slate-200 font-semibold">Messages</Link>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{user.name.charAt(0)}</div>
                )}
                <span className="font-semibold text-slate-900">{user.name}</span>
              </Link>
              <Button variant="danger" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>Logout</Button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
