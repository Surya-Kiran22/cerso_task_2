module.exports = {
  id: 'COMPOUND_REQUIREMENT',
  label: 'Compound Requirement',
  severity: 'Medium',
  weight: 2,
  explanation: 'Compound requirements combine multiple independent functions or obligations into a single requirement statement.',
  suggestion: 'Split the requirement into distinct atomic statements, each with a single modal verb and focus.',
  detect: (text) => {
    // Check for multiple modal verbs (e.g. 2 or more shall/must)
    const modalsMatches = text.match(/\b(shall|must)\b/gi);
    if (modalsMatches && modalsMatches.length > 1) {
      const secondIndex = text.search(/\b(shall|must)\b.*?\b(shall|must)\b/i);
      return {
        phrase: modalsMatches.join(' ... '),
        start: 0,
        end: text.length,
      };
    }

    // Check for multiple " and " joining separate actions
    const andActionRegex = /\b(shall|must)\b.*?\band\b.*?\band\b/i;
    if (andActionRegex.test(text)) {
      const match = text.match(/\band\b/gi);
      return {
        phrase: 'multiple and clauses',
        start: 0,
        end: text.length,
      };
    }

    return null;
  },
};
