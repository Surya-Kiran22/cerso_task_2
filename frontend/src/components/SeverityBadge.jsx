import React from 'react';

export const SeverityBadge = ({ severity }) => {
  let badgeClass = 'badge-low';
  if (severity === 'High') badgeClass = 'badge-high';
  if (severity === 'Medium') badgeClass = 'badge-medium';

  return <span className={`badge ${badgeClass}`}>{severity}</span>;
};

export default SeverityBadge;
