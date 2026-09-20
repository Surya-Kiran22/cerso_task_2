import React from 'react';

export const ScoreBadge = ({ score, rating }) => {
  let bgColor = '#198754'; // Green for low ambiguity (clear)
  if (score > 20 && score <= 40) bgColor = '#20c997';
  if (score > 40 && score <= 60) bgColor = '#fd7e14'; // Orange for needs work
  if (score > 60 && score <= 80) bgColor = '#d63384';
  if (score > 80) bgColor = '#dc3545'; // Red for highly ambiguous

  return (
    <span className="score-badge" style={{ backgroundColor: bgColor, color: '#ffffff' }}>
      Score: {score}/100 ({rating || 'Evaluated'})
    </span>
  );
};

export default ScoreBadge;
