import { useState, useEffect } from 'react';
import { auth, dashboard } from '../api/client';
import { formatBytes, formatNumber } from '../utils/format';
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
        <div className="stat-card">
          <div className="label">Total Images</div>
          <div className="value primary">{formatNumber(stats.totalImages)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Requests</div>
          <div className="value">{formatNumber(stats.totalRequests)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Storage Used</div>
          <div className="value">{formatBytes(stats.storageUsed)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Bandwidth Saved</div>
          <div className="value" style={{ color: 'var(--success)' }}>{formatBytes(stats.bandwidthSaved)}</div>
        </div>
      </div>

      <div className="chart-container">
        <h3 style={{ fontSize: 14, marginBottom: 16 }}>Requests (Last 30 Days)</h3>
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
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>API Keys</h3>
          {newKey && <div className="alert" style={{ wordBreak: 'break-all' }}>{newKey}</div>}
          <button className="btn btn-primary" onClick={createApiKey}>Create API Key</button>
          <div className="key-list">
            {apiKeys.map((key) => (
              <div key={key._id || key.id}>
                <span>{key.name} ({key.prefix}...)</span>
                <span>{key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Account</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>Delete your account, images, analytics, and API keys.</p>
          <button className="btn btn-danger" onClick={deleteAccount}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}
