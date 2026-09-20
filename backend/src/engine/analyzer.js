const { splitRequirements } = require('./splitter');
const { generateRewrite } = require('./rewriter');

// Load all 12 rule categories
const rawCategories = [
  require('./categories/vagueTerms'),
  require('./categories/unmeasurableQuantity'),
  require('./categories/weakModals'),
  require('./categories/escapeClauses'),
  require('./categories/incomplete'),
  require('./categories/unclearReference'),
  require('./categories/passiveNoActor'),
  require('./categories/subjectiveTerms'),
  require('./categories/compoundRequirement'),
  require('./categories/missingMeasure'),
  require('./categories/universalQuantifiers'),
  require('./categories/timeAmbiguity'),
];

function makeWordRegex(word) {
  const escaped = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const startBound = /^\w/.test(word) ? '\\b' : '';
  const endBound = /\w$/.test(word) ? '\\b' : '';
  return new RegExp(`${startBound}${escaped}${endBound}`, 'gi');
}

const categories = rawCategories.map((cat) => {
  const compiled = { ...cat };
  if (cat.words) {
    compiled.compiledWords = cat.words.map((word) => ({
      word,
      regex: makeWordRegex(word),
    }));
  }
  if (cat.patterns) {
    compiled.compiledPatterns = cat.patterns.map((pattern) => {
      const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
      return new RegExp(pattern.source, flags);
    });
  }
  return compiled;
});

const SEVERITY_WEIGHTS = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function getRatingBand(overallAmbiguityScore) {
  if (overallAmbiguityScore <= 20) return 'Clear';
  if (overallAmbiguityScore <= 40) return 'Mostly Clear';
  if (overallAmbiguityScore <= 60) return 'Needs Work';
  if (overallAmbiguityScore <= 80) return 'Ambiguous';
  return 'Highly Ambiguous';
}

/**
 * Deduplicates overlapping findings.
 * Retains the higher-severity finding when spans overlap.
 */
function deduplicateFindings(rawFindings) {
  if (rawFindings.length <= 1) return rawFindings;

  const sorted = [...rawFindings].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const result = [];

  for (const current of sorted) {
    let overlapIndex = -1;

    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      if (Math.max(existing.start, current.start) < Math.min(existing.end, current.end)) {
        overlapIndex = i;
        break;
      }
    }

    if (overlapIndex === -1) {
      result.push(current);
    } else {
      const existing = result[overlapIndex];
      const existingRank = SEVERITY_WEIGHTS[existing.severity] || 0;
      const currentRank = SEVERITY_WEIGHTS[current.severity] || 0;

      if (currentRank > existingRank) {
        result[overlapIndex] = current;
      } else if (currentRank === existingRank) {
        if (current.end - current.start > existing.end - existing.start) {
          result[overlapIndex] = current;
        }
      }
    }
  }

  return result.sort((a, b) => a.start - b.start);
}

function analyzeRequirement(text, index) {
  const rawFindings = [];

  for (const cat of categories) {
    if (cat.compiledWords) {
      for (const { word, regex } of cat.compiledWords) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          let shouldFlag = true;
          if (cat.detect) {
            shouldFlag = cat.detect(text, word);
          }

          if (shouldFlag) {
            rawFindings.push({
              category: cat.id,
              label: cat.label,
              severity: cat.severity,
              phrase: match[0],
              start: match.index,
              end: match.index + match[0].length,
              explanation: cat.explanation,
              suggestion: cat.suggestion,
              weight: cat.weight,
            });
          }
        }
      }
    } else if (cat.compiledPatterns) {
      for (const regex of cat.compiledPatterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          rawFindings.push({
            category: cat.id,
            label: cat.label,
            severity: cat.severity,
            phrase: match[0],
            start: match.index,
            end: match.index + match[0].length,
            explanation: cat.explanation,
            suggestion: cat.suggestion,
            weight: cat.weight,
          });
        }
      }
    } else if (cat.detect) {
      const customMatch = cat.detect(text);
      if (customMatch) {
        rawFindings.push({
          category: cat.id,
          label: cat.label,
          severity: cat.severity,
          phrase: customMatch.phrase || text,
          start: customMatch.start || 0,
          end: customMatch.end || text.length,
          explanation: cat.explanation,
          suggestion: cat.suggestion,
          weight: cat.weight,
        });
      }
    }
  }

  const findings = deduplicateFindings(rawFindings);

  const rawPenalty = findings.reduce((sum, f) => sum + (f.weight || SEVERITY_WEIGHTS[f.severity] || 1), 0);
  const penalty = Math.min(rawPenalty, 10);
  const reqScore = 100 - penalty * 10;

  const cleanedFindings = findings.map(({ weight, ...rest }) => rest);
  const suggestedRewrite = generateRewrite(text, cleanedFindings);

  return {
    index,
    text,
    findings: cleanedFindings,
    score: reqScore,
    suggestedRewrite,
  };
}

function analyzeSRS(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      requirements: [],
      summary: {
        totalRequirements: 0,
        totalIssues: 0,
        bySeverity: { High: 0, Medium: 0, Low: 0 },
        byCategory: {},
        overallScore: 0,
        rating: 'Clear',
      },
    };
  }

  const rawReqList = splitRequirements(text);
  const reqOutputs = rawReqList.map((reqText, idx) => analyzeRequirement(reqText, idx + 1));

  let totalIssues = 0;
  const bySeverity = { High: 0, Medium: 0, Low: 0 };
  const byCategory = {};

  let sumReqScores = 0;

  for (const req of reqOutputs) {
    sumReqScores += req.score;
    totalIssues += req.findings.length;

    for (const finding of req.findings) {
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
      byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    }
  }

  const totalRequirements = reqOutputs.length;
  const avgReqScore = totalRequirements > 0 ? sumReqScores / totalRequirements : 100;
  const overallScore = Math.round(100 - avgReqScore);
  const rating = getRatingBand(overallScore);

  return {
    requirements: reqOutputs,
    summary: {
      totalRequirements,
      totalIssues,
      bySeverity,
      byCategory,
      overallScore,
      rating,
    },
  };
}

module.exports = {
  analyzeSRS,
  splitRequirements,
  deduplicateFindings,
};
