import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, Images, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">PixelFlow</div>
      <nav>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => isActive ? 'active' : ''}>
          <Upload size={18} /> Upload
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => isActive ? 'active' : ''}>
          <Images size={18} /> Library
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, padding: '0 12px' }}>
          {user?.name}
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
