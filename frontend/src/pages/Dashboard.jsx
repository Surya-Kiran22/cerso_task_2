import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScoreBadge from '../components/ScoreBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const SEVERITY_COLORS = {
  High: '#dc3545',
  Medium: '#fd7e14',
  Low: '#198754',
};

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await client.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="container"><p>Loading dashboard metrics...</p></div>;
  }

  if (error) {
    return <div className="container"><div className="error-message">{error}</div></div>;
  }

  const {
    totalAnalyses,
    averageScore,
    totalIssues,
    mostCommonCategory,
    issuesByCategory,
    scoreHistory,
    severityDistribution,
    recentAnalyses,
  } = stats || {};

  return (
    <div className="container">
      <h2>SRS Ambiguity Analytics Dashboard</h2>

      {/* Stat Cards (Plain Boxes) */}
      <div className="stat-grid">
        <div className="stat-box">
          <h3>{totalAnalyses || 0}</h3>
          <p>Total Analyses</p>
        </div>
        <div className="stat-box">
          <h3>{averageScore || 0} / 100</h3>
          <p>Avg Ambiguity Score</p>
        </div>
        <div className="stat-box">
          <h3>{totalIssues || 0}</h3>
          <p>Total Issues Found</p>
        </div>
        <div className="stat-box">
          <h3 style={{ fontSize: '1.1em', wordBreak: 'break-word' }}>
            {mostCommonCategory || 'None'}
          </h3>
          <p>Top Category</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        {/* BarChart: Issues per Category */}
        <div className="card">
          <h3>Issues per Ambiguity Category</h3>
          {issuesByCategory && issuesByCategory.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesByCategory} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-35} textAnchor="end" interval={0} fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d6efd" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>No issue category data available yet.</p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* LineChart: Ambiguity Score Over Last 10 Analyses */}
          <div className="card">
            <h3>Score History (Last 10)</h3>
            {scoreHistory && scoreHistory.length > 0 ? (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreHistory} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#20c997" strokeWidth={2} name="Ambiguity Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No history data available yet.</p>
            )}
          </div>

          {/* PieChart: Severity Distribution */}
          <div className="card">
            <h3>Severity Distribution</h3>
            {severityDistribution && severityDistribution.some((d) => d.value > 0) ? (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No severity data available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5 Most Recent Analyses Table */}
      <div className="card">
        <h3>5 Most Recent Analyses</h3>
        {recentAnalyses && recentAnalyses.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Score</th>
                <th>Issues</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAnalyses.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>{item.sourceType?.toUpperCase()}</td>
                  <td>
                    <ScoreBadge score={item.overallScore} rating={item.summary?.rating} />
                  </td>
                  <td>{item.summary?.totalIssues || 0}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/analysis/${item._id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recent analyses found.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
