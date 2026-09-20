module.exports = {
  id: 'ESCAPE_CLAUSES',
  label: 'Escape Clauses',
  severity: 'High',
  weight: 3,
  explanation: 'Escape clauses allow implementation to be bypassed without clear objective conditions.',
  suggestion: 'Define precise, testable conditional parameters under which the action is required or omitted.',
  words: [
    'if possible',
    'where possible',
    'as appropriate',
    'if necessary',
    'when applicable',
    'unless otherwise',
    'to the extent possible',
    'as required',
    'if feasible',
  ],
};
