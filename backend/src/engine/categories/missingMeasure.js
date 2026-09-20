module.exports = {
  id: 'MISSING_MEASURE',
  label: 'Missing Performance Measure',
  severity: 'High',
  weight: 3,
  explanation: 'Non-functional attributes (e.g. response time, uptime, availability) are stated without specific numbers or units.',
  suggestion: 'Add concrete metrics such as target milliseconds, percentage availability (e.g. 99.9%), or throughput.',
  words: ['response time', 'uptime', 'secure', 'scalable', 'available'],
  detect: (text, keyword) => {
    // Check if requirement text contains digits (0-9) or unit terms (ms, seconds, %, percent, hrs, hours)
    const hasNumbersOrUnits = /\d|(\b(ms|seconds|secs|minutes|hours|percent|%)\b)/i.test(text);
    if (!hasNumbersOrUnits) {
      return true; // Flagged because measure is missing!
    }
    return false;
  },
};
