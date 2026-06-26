import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, Images, Info, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>PixelFlow</span>
        <ThemeToggle />
      </div>
      <nav>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => isActive ? 'active' : ''}>
          <Upload size={16} /> Upload
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => isActive ? 'active' : ''}>
          <Images size={16} /> Library
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => isActive ? 'active' : ''}>
          <Info size={16} /> About
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name}
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
