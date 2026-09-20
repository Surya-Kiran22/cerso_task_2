module.exports = {
  id: 'WEAK_MODALS',
  label: 'Weak Modals',
  severity: 'Medium',
  weight: 2,
  explanation: 'Weak modal verbs create ambiguity as to whether a requirement is mandatory, optional, or advisory.',
  suggestion: 'Use mandatory modal verbs like "shall" or "must" for mandatory requirements.',
  words: ['may', 'might', 'could', 'should', 'can', 'is expected to', 'is desirable'],
};
