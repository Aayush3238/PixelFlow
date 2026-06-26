import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      navigate(user ? '/dashboard' : '/login', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="route-loading">
      <div className="skeleton skeleton-panel" />
      <p>Signing you in...</p>
    </div>
  );
}
