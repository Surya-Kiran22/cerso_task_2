module.exports = {
  id: 'PASSIVE_NO_ACTOR',
  label: 'Passive Voice (No Actor)',
  severity: 'Low',
  weight: 1,
  explanation: 'Passive voice omits the actor or component responsible for performing the specified action.',
  suggestion: 'Rephrase using active voice specifying the actor (e.g. "The API Gateway shall validate the token").',
  patterns: [
    /\b(shall|must|should|will|is|are|was|were)(\s+be)?\s+([a-z]+(?:ed|en|nt|lt|pt|kt|d|t))\b(?!\s+by\b)/i,
  ],
};
