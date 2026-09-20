module.exports = {
  id: 'TIME_AMBIGUITY',
  label: 'Time Ambiguity',
  severity: 'Medium',
  weight: 2,
  explanation: 'Time ambiguous words lack a precise duration, maximum latency limit, or explicit frequency schedule.',
  suggestion: 'Replace temporal terms with explicit time limits (e.g. "within 500 ms" or "every 15 minutes").',
  words: ['soon', 'later', 'eventually', 'periodically', 'in a timely manner', 'real-time', 'immediately'],
  detect: (text, keyword) => {
    // If keyword is 'real-time' or 'immediately', check if exact number/unit exists nearby
    if (keyword.toLowerCase() === 'real-time' || keyword.toLowerCase() === 'immediately') {
      const hasNumbers = /\d+\s*(ms|seconds|secs|minutes)/i.test(text);
      return !hasNumbers; // Flag if no number/unit
    }
    return true; // Always flag terms like soon, later, eventually, periodically, in a timely manner
  },
};
