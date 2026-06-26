import { useState, useEffect } from 'react';
import { auth, dashboard } from '../api/client';
import { formatBytes, formatNumber } from '../utils/format';
import { Images, BarChart3, HardDrive, TrendingUp } from 'lucide-react';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboard.stats(), auth.apiKeys().catch(() => ({ keys: [] }))])
      .then(([statsData, keysData]) => {
        setStats(statsData);
        setApiKeys(keysData.keys || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="page-header"><Skeleton className="title-skeleton" /></div>
      <div className="stats-grid">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="stat-skeleton" />)}</div>
      <Skeleton className="chart-skeleton" />
    </div>
  );
  if (!stats) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Failed to load stats</div>;

  const maxRequests = Math.max(...stats.chartData.map(d => d.requests), 1);

  const statCards = [
    { label: 'Total Images', value: formatNumber(stats.totalImages), icon: <Images size={18} />, color: 'var(--primary)' },
    { label: 'Total Requests', value: formatNumber(stats.totalRequests), icon: <BarChart3 size={18} />, color: 'var(--text)' },
    { label: 'Storage Used', value: formatBytes(stats.storageUsed), icon: <HardDrive size={18} />, color: 'var(--text)' },
    { label: 'Bandwidth Saved', value: formatBytes(stats.bandwidthSaved), icon: <TrendingUp size={18} />, color: 'var(--success)' },
  ];

  const createApiKey = async () => {
    const data = await auth.createApiKey('Dashboard key');
    setNewKey(data.key);
    setApiKeys((prev) => [data.apiKey, ...prev]);
  };

  const deleteAccount = async () => {
    if (!confirm('Delete your account and all images? This cannot be undone.')) return;
    await auth.deleteAccount();
    localStorage.clear();
    window.location.href = '/register';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your image delivery platform</p>
      </div>

      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="label" style={{ margin: 0 }}>{s.label}</div>
              <span style={{ color: s.color, opacity: 0.6 }}>{s.icon}</span>
            </div>
            <div className="value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-container">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Requests (Last 30 Days)</h3>
        <div className="chart-bar">
          {stats.chartData.map((d, i) => (
            <div
              key={i}
              className="bar"
              style={{ height: `${(d.requests / maxRequests) * 100}%` }}
              title={`${d.date}: ${d.requests} requests`}
            />
          ))}
        </div>
        <div className="chart-labels">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      <div className="settings-grid">
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>API Keys</h3>
          {newKey && (
            <div className="alert" style={{ wordBreak: 'break-all', background: 'var(--success-subtle)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
              <strong style={{ display: 'block', marginBottom: 4, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New API Key</strong>
              {newKey}
            </div>
          )}
          <button className="btn btn-primary" onClick={createApiKey}>Create API Key</button>
          <div className="key-list">
            {apiKeys.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, paddingTop: 12 }}>No API keys yet</div>}
            {apiKeys.map((key) => (
              <div key={key._id || key.id}>
                <span style={{ fontWeight: 500 }}>{key.name} <span style={{ opacity: 0.5 }}>({key.prefix}...)</span></span>
                <span>{key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Account</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            Permanently delete your account, all uploaded images, analytics data, and API keys. This action cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={deleteAccount}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}
