import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import ScoreBadge from '../components/ScoreBadge';

export const History = () => {
  const [analyses, setAnalyses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalyses = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/analyses?page=${page}&limit=10`);
      setAnalyses(res.data.analyses);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses(1);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;

    try {
      await client.delete(`/analyses/${id}`);
      fetchAnalyses(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete analysis');
    }
  };

  return (
    <div className="container">
      <h2>Analysis History</h2>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading past analyses...</p>
      ) : analyses.length === 0 ? (
        <div className="card">
          <p>No past SRS analyses found.</p>
          <Link to="/analyze" className="btn">Analyze Your First SRS Document</Link>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Score</th>
                <th>Total Issues</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((item) => (
                <tr key={item._id}>
                  <td>
                    <Link to={`/analysis/${item._id}`}>
                      <strong>{item.title}</strong>
                    </Link>
                  </td>
                  <td>{item.sourceType.toUpperCase()}</td>
                  <td>
                    <ScoreBadge score={item.overallScore} rating={item.summary?.rating} />
                  </td>
                  <td>{item.summary?.totalIssues || 0}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/analysis/${item._id}`} style={{ marginRight: '8px' }}>
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="btn-danger"
                      style={{ padding: '2px 8px', fontSize: '0.85em' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchAnalyses(pagination.page - 1)}
              >
                &laquo; Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages} (Total: {pagination.total})
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchAnalyses(pagination.page + 1)}
              >
                Next &raquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default History;
