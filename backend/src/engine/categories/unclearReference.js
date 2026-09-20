module.exports = {
  id: 'UNCLEAR_REFERENCE',
  label: 'Unclear Reference',
  severity: 'Medium',
  weight: 2,
  explanation: 'Generic pronouns or vague references create confusion regarding which noun or subject is being referred to.',
  suggestion: 'Replace ambiguous pronouns with the specific component or user role name (e.g. "The Database Service").',
  words: ['it', 'this', 'that', 'they', 'them', 'these', 'those', 'such', 'the system'],
};
