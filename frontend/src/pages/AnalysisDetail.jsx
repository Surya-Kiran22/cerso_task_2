import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import ResultView from '../components/ResultView';

export const AnalysisDetail = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await client.get(`/analyses/${id}`);
        setAnalysis(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analysis details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  return (
    <div className="container">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/history">&laquo; Back to History</Link>
      </div>

      {loading && <p>Loading analysis details...</p>}
      {error && <div className="error-message">{error}</div>}

      {analysis && !loading && <ResultView analysis={analysis} />}
    </div>
  );
};

export default AnalysisDetail;
