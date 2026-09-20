/**
 * Requirement Rewriter
 * Provides template-based rewritten examples for requirements flagged with ambiguities.
 */

function generateRewrite(originalText, findings) {
  if (!findings || findings.length === 0) {
    return originalText;
  }

  let rewritten = originalText;

  // Track categories present in findings
  const categories = new Set(findings.map((f) => f.category));

  // 1. Weak Modals (replace should / may / could with shall / must)
  if (categories.has('WEAK_MODALS')) {
    rewritten = rewritten.replace(/\b(should|may|might|could|can|is expected to|is desirable)\b/gi, 'shall');
  }

  // 2. Vague terms replacements
  if (categories.has('VAGUE_TERMS')) {
    rewritten = rewritten
      .replace(/\bfast\b/gi, 'within 2.0 seconds')
      .replace(/\bquick\b/gi, 'within 1.0 second')
      .replace(/\bslow\b/gi, 'not exceeding 5.0 seconds')
      .replace(/\beasy\b/gi, 'requiring no more than 3 user clicks')
      .replace(/\buser-friendly\b/gi, 'compliant with WCAG 2.1 AA accessibility guidelines')
      .replace(/\bsimple\b/gi, 'containing a maximum of 4 input fields')
      .replace(/\brobust\b/gi, 'with automatic fallback handling for connection failures')
      .replace(/\befficient\b/gi, 'utilizing under 100MB of RAM')
      .replace(/\bappropriate\b/gi, 'specified in Section 4.2')
      .replace(/\badequate\b/gi, 'meeting the baseline benchmark standard')
      .replace(/\breasonable\b/gi, 'within a 500ms response window')
      .replace(/\bsufficient\b/gi, 'a minimum of 3 redundant server nodes')
      .replace(/\bnormal\b/gi, 'standard operational mode')
      .replace(/\bgood\b/gi, 'passing all automated unit tests')
      .replace(/\bbetter\b/gi, 'demonstrating a 20% performance improvement')
      .replace(/\bbest\b/gi, 'industry standard')
      .replace(/\bmodern\b/gi, 'supporting HTML5 and ES2022')
      .replace(/\bminimal\b/gi, 'no more than 1 second')
      .replace(/\bmaximal\b/gi, 'up to a maximum of 1000 items')
      .replace(/\bseamless\b/gi, 'without requiring manual page refresh')
      .replace(/\bintuitive\b/gi, 'validated by usability testing with an 80%+ task success rate');
  }

  // 3. Unmeasurable quantity replacements
  if (categories.has('UNMEASURABLE_QUANTITY')) {
    rewritten = rewritten
      .replace(/\bmany\b/gi, 'at least 100')
      .replace(/\bfew\b/gi, 'fewer than 5')
      .replace(/\bseveral\b/gi, 'between 3 and 7')
      .replace(/\bsome\b/gi, 'a minimum of 10')
      .replace(/\bmost\b/gi, 'at least 90% of')
      .replace(/\ba lot\b/gi, 'over 1,000')
      .replace(/\blarge\b/gi, 'exceeding 10,000 requests')
      .replace(/\bsmall\b/gi, 'under 5KB')
      .replace(/\bhigh\b/gi, 'exceeding 99.9%')
      .replace(/\blow\b/gi, 'below 0.1%')
      .replace(/\bsignificant\b/gi, 'a measurable 15%')
      .replace(/\bas much as possible\b/gi, 'up to the defined maximum capacity of 5,000 ops/sec')
      .replace(/\blarge number of\b/gi, 'at least 500 concurrent');
  }

  // 4. Escape clauses removal
  if (categories.has('ESCAPE_CLAUSES')) {
    rewritten = rewritten.replace(
      /\b(if possible|where possible|as appropriate|if necessary|when applicable|unless otherwise|to the extent possible|as required|if feasible)\b,?\s*/gi,
      ''
    );
  }

  // 5. Incomplete terms replacements
  if (categories.has('INCOMPLETE')) {
    rewritten = rewritten
      .replace(/\b(TBD|TBC|TBA|to be determined)\b/gi, '[TBD: pending architecture spec v1.2]')
      .replace(/\b(etc\.|and so on|and\/or)\b/gi, 'specifically item A, item B, and item C')
      .replace(/\bsuch as\b/gi, 'including')
      .replace(/\bincluding but not limited to\b/gi, 'specifically including');
  }

  // 6. Passive voice replacement suggestion append
  if (categories.has('PASSIVE_NO_ACTOR') && !/by\s+[a-z]+/i.test(rewritten)) {
    if (!rewritten.includes('by [actor]')) {
      rewritten = rewritten.replace(/\b(shall|must|is|are)\s+be\s+([a-z]+ed|[a-z]+en)\b/gi, '$1 be $2 by [System Controller]');
    }
  }

  // 7. Subjective terms replacement
  if (categories.has('SUBJECTIVE_TERMS')) {
    rewritten = rewritten
      .replace(/\b(beautiful|nice|attractive|clean)\b/gi, 'styled according to the approved UI design specification')
      .replace(/\b(acceptable|satisfactory)\b/gi, 'meeting all acceptance criteria')
      .replace(/\bstate-of-the-art\b/gi, 'TLS 1.3 encrypted')
      .replace(/\bworld-class\b/gi, 'ISO 27001 compliant');
  }

  // 8. Missing measure append
  if (categories.has('MISSING_MEASURE')) {
    if (/\bresponse time\b/i.test(rewritten) && !/\d/.test(rewritten)) {
      rewritten = rewritten.replace(/\bresponse time\b/gi, 'response time of under 200 ms');
    }
    if (/\buptime\b/i.test(rewritten) && !/\d/.test(rewritten)) {
      rewritten = rewritten.replace(/\buptime\b/gi, 'uptime of 99.9%');
    }
    if (/\bavailable\b/i.test(rewritten) && !/\d/.test(rewritten)) {
      rewritten = rewritten.replace(/\bavailable\b/gi, 'available 99.99% of scheduled operational hours');
    }
  }

  // 9. Time ambiguity replacements
  if (categories.has('TIME_AMBIGUITY')) {
    rewritten = rewritten
      .replace(/\bsoon\b/gi, 'within 5 seconds')
      .replace(/\blater\b/gi, 'within 24 hours')
      .replace(/\beventually\b/gi, 'within 1 hour')
      .replace(/\bperiodically\b/gi, 'every 15 minutes')
      .replace(/\bin a timely manner\b/gi, 'within 3 business days')
      .replace(/\breal-time\b/gi, 'real-time (latency under 100 ms)')
      .replace(/\bimmediately\b/gi, 'within 50 ms');
  }

  // Return clean trimmed rewritten string
  return rewritten.trim();
}

module.exports = { generateRewrite };
