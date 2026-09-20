import React, { useState } from 'react';
import client from '../api/client';
import ResultView from '../components/ResultView';

export const Analyze = () => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState('text');
  const [fileLoading, setFileLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  const MAX_CHARS = 50000;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds maximum 2MB limit.');
      return;
    }

    setError('');
    setFileLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await client.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText(res.data.text || '');
      setSourceType(res.data.sourceType || 'text');
      if (!title) {
        setTitle(res.data.filename || 'Uploaded Document Analysis');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extract text from uploaded file.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please provide requirements text to analyze.');
      return;
    }

    setError('');
    setAnalyzeLoading(true);

    try {
      const res = await client.post('/analyze', {
        title: title || 'Untitled SRS Analysis',
        text,
        sourceType,
      });
      setAnalysisResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze requirements text.');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Analyze Software Requirements Specification (SRS)</h2>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        {/* Optional File Upload */}
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f1f3f5', border: '1px solid #dee2e6' }}>
          <label htmlFor="file-upload">Optional: Upload Document (.txt, .pdf, .docx - Max 2MB)</label>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileUpload}
            disabled={fileLoading}
          />
          {fileLoading && <p>Extracting text from file...</p>}
        </div>

        {/* Requirements Form */}
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title">Analysis Title (Optional)</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. E-Commerce Platform Requirements v1.0"
            />
          </div>

          <div>
            <label htmlFor="req-text">
              Requirements Text (One per line or paragraph)
            </label>
            <textarea
              id="req-text"
              rows={12}
              value={text}
              maxLength={MAX_CHARS}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste SRS text here, e.g. REQ-1: The login page shall be fast."
              required
            />
            <div style={{ textAlign: 'right', fontSize: '0.85em', color: text.length >= MAX_CHARS ? 'red' : '#6c757d' }}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </div>
          </div>

          <button type="submit" disabled={analyzeLoading || fileLoading}>
            {analyzeLoading ? 'Analyzing Ambiguity...' : 'Analyze Requirements'}
          </button>
        </form>
      </div>

      {/* Loading state indicator */}
      {analyzeLoading && <p>Running rule-based ambiguity detector analysis engine...</p>}

      {/* Result Display */}
      {analysisResult && !analyzeLoading && <ResultView analysis={analysisResult} />}
    </div>
  );
};

export default Analyze;
