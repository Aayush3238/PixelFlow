import { useState, useEffect } from 'react';
import { dashboard } from '../api/client';
import { HardDrive, Download, BarChart3, Zap } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.stats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>;
  if (!stats) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Failed to load stats</div>;

  const maxRequests = Math.max(...stats.chartData.map(d => d.requests), 1);

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
    </div>
  );
}
