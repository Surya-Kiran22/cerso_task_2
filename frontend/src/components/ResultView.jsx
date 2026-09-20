import React, { useState } from 'react';
import ScoreBadge from './ScoreBadge';
import SeverityBadge from './SeverityBadge';

export const ResultView = ({ analysis }) => {
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!analysis) return null;

  const { title, sourceType, overallScore, summary, requirements, createdAt } = analysis;

  // Filter requirements based on selected severity and category
  const filteredRequirements = requirements.filter((req) => {
    if (selectedSeverity !== 'ALL') {
      const hasSev = req.findings.some((f) => f.severity === selectedSeverity);
      if (!hasSev) return false;
    }
    if (selectedCategory !== 'ALL') {
      const hasCat = req.findings.some((f) => f.category === selectedCategory);
      if (!hasCat) return false;
    }
    return true;
  });

  // Helper to render text with <mark> for findings
  const renderHighlightedText = (text, findings) => {
    if (!findings || findings.length === 0) return text;

    // Sort findings by start position
    const sorted = [...findings].sort((a, b) => a.start - b.start);
    const elements = [];
    let lastIndex = 0;

    sorted.forEach((f, idx) => {
      if (f.start > lastIndex) {
        elements.push(text.substring(lastIndex, f.start));
      }
      elements.push(
        <mark key={idx} title={`${f.label} (${f.severity})`}>
          {text.substring(f.start, f.end)}
        </mark>
      );
      lastIndex = f.end;
    });

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
  };

  const categoriesList = Object.keys(summary?.byCategory || {});

  return (
    <div className="card">
      <h2>{title || 'SRS Analysis Result'}</h2>
      {createdAt && <p><small>Analyzed on: {new Date(createdAt).toLocaleString()}</small></p>}

      {/* Overall Score Banner */}
      <div style={{ padding: '12px', background: '#e9ecef', marginBottom: '16px' }}>
        <strong>Ambiguity Score: </strong>
        <ScoreBadge score={overallScore} rating={summary?.rating} />
        <span style={{ marginLeft: '12px' }}>
          Total Requirements: <strong>{summary?.totalRequirements || 0}</strong> | Total Issues: <strong>{summary?.totalIssues || 0}</strong>
        </span>
      </div>

      {/* Summary Tables */}
      <h3>Summary Counts</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h4>By Severity</h4>
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><SeverityBadge severity="High" /></td>
                <td>{summary?.bySeverity?.High || 0}</td>
              </tr>
              <tr>
                <td><SeverityBadge severity="Medium" /></td>
                <td>{summary?.bySeverity?.Medium || 0}</td>
              </tr>
              <tr>
                <td><SeverityBadge severity="Low" /></td>
                <td>{summary?.bySeverity?.Low || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <h4>By Category</h4>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {categoriesList.length === 0 ? (
                <tr>
                  <td colSpan="2">No ambiguity categories flagged.</td>
                </tr>
              ) : (
                categoriesList.map((cat) => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td>{summary.byCategory[cat]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Controls */}
      <h3>Detailed Findings per Requirement</h3>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'center' }}>
        <div>
          <label htmlFor="sev-filter" style={{ display: 'inline', marginRight: '6px' }}>Filter Severity:</label>
          <select
            id="sev-filter"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ width: 'auto', display: 'inline' }}
          >
            <option value="ALL">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="cat-filter" style={{ display: 'inline', marginRight: '6px' }}>Filter Category:</label>
          <select
            id="cat-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: 'auto', display: 'inline' }}
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirements Table */}
      {filteredRequirements.length === 0 ? (
        <p>No requirements match the selected filter criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Requirement Text</th>
              <th style={{ width: '90px' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequirements.map((req) => (
              <tr key={req.index}>
                <td>{req.index}</td>
                <td>
                  <div>{renderHighlightedText(req.text, req.findings)}</div>

                  {/* Findings breakdown list */}
                  {req.findings && req.findings.length > 0 && (
                    <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '0.9em' }}>
                      {req.findings.map((f, i) => (
                        <li key={i} style={{ marginBottom: '6px' }}>
                          <strong>{f.phrase}</strong> - <SeverityBadge severity={f.severity} />{' '}
                          <em>[{f.label}]</em>: {f.explanation}
                          <br />
                          <strong>Suggestion: </strong>{f.suggestion}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Suggested Rewrite */}
                  {req.suggestedRewrite && req.findings.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#e7f5ff', borderLeft: '4px solid #0d6efd', fontSize: '0.9em' }}>
                      <strong>Suggested Rewrite: </strong>
                      <span>{req.suggestedRewrite}</span>
                    </div>
                  )}
                </td>
                <td>
                  <strong>{req.score}</strong> / 100
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ResultView;
