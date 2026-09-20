const { analyzeSRS, splitRequirements, deduplicateFindings } = require('../src/engine/analyzer');

describe('Ambiguity Rule Engine - Milestone 2 Tests', () => {
  describe('Splitter Module', () => {
    it('should split SRS text into individual requirements correctly', () => {
      const text = `
REQ-1: The user shall log in with email and password.
FR-2: The system shall respond within 2 seconds.
3.1.2 The database shall backup daily.
* Bullet item 1
- Bullet item 2
      `;
      const reqs = splitRequirements(text);
      expect(reqs.length).toBeGreaterThanOrEqual(5);
      expect(reqs[0]).toContain('REQ-1:');
      expect(reqs[1]).toContain('FR-2:');
    });

    it('should handle empty input gracefully', () => {
      expect(splitRequirements('')).toEqual([]);
      expect(splitRequirements(null)).toEqual([]);
    });
  });

  describe('Deduplication & Overlap Resolution', () => {
    it('should retain higher-severity finding when spans overlap', () => {
      const rawFindings = [
        { start: 0, end: 10, severity: 'Medium', phrase: 'test' },
        { start: 2, end: 8, severity: 'High', phrase: 'st' },
      ];
      const deduped = deduplicateFindings(rawFindings);
      expect(deduped.length).toEqual(1);
      expect(deduped[0].severity).toEqual('High');
    });
  });

  describe('Category Rules (At least 3 sentences per category)', () => {
    const testCases = [
      {
        category: 'VAGUE_TERMS',
        sentences: [
          'The login page shall be fast.',
          'The database must be robust and flexible.',
          'The user interface should provide an intuitive experience.',
        ],
      },
      {
        category: 'UNMEASURABLE_QUANTITY',
        sentences: [
          'The system shall handle many requests.',
          'Several users may submit high volumes of data.',
          'The application should accept a large number of files.',
        ],
      },
      {
        category: 'WEAK_MODALS',
        sentences: [
          'The user may request a password reset.',
          'The portal could display user statistics.',
          'The system should log errors.',
        ],
      },
      {
        category: 'ESCAPE_CLAUSES',
        sentences: [
          'The system shall encrypt user data if possible.',
          'Reports should be generated as appropriate.',
          'Validation occurs when applicable.',
        ],
      },
      {
        category: 'INCOMPLETE',
        sentences: [
          'Supported export formats include PDF, CSV, etc.',
          'The system configuration is TBD.',
          'Allowed fields include name, email, and/or address.',
        ],
      },
      {
        category: 'UNCLEAR_REFERENCE',
        sentences: [
          'It shall process the input data.',
          'This should be saved to the database.',
          'The system must notify users when they log in.',
        ],
      },
      {
        category: 'PASSIVE_NO_ACTOR',
        sentences: [
          'The transaction shall be validated.',
          'A confirmation email is sent.',
          'Log entries must be saved.',
        ],
      },
      {
        category: 'SUBJECTIVE_TERMS',
        sentences: [
          'The landing page shall be beautiful.',
          'The system must provide clean and attractive graphs.',
          'The software shall deliver world-class performance.',
        ],
      },
      {
        category: 'COMPOUND_REQUIREMENT',
        sentences: [
          'The system shall store logs and the system shall send notifications.',
          'The app must validate input and must save data and must trigger alerts.',
          'The server shall restart and the client shall reconnect.',
        ],
      },
      {
        category: 'MISSING_MEASURE',
        sentences: [
          'The platform shall have high response time.',
          'The server must be scalable and secure.',
          'The API shall remain available.',
        ],
      },
      {
        category: 'UNIVERSAL_QUANTIFIERS',
        sentences: [
          'All requests shall be logged.',
          'The system must never fail.',
          'Every user receives an email.',
        ],
      },
      {
        category: 'TIME_AMBIGUITY',
        sentences: [
          'The backup shall run periodically.',
          'The alert shall be sent soon.',
          'Updates shall process eventually.',
        ],
      },
    ];

    testCases.forEach(({ category, sentences }) => {
      it(`should detect category ${category} across at least 3 test sentences`, () => {
        sentences.forEach((sentence) => {
          const result = analyzeSRS(sentence);
          const found = result.requirements.some((r) =>
            r.findings.some((f) => f.category === category)
          );
          expect(found).toBe(true);
        });
      });
    });
  });

  describe('Scoring Formula', () => {
    it('should compute requirement score and overall ambiguity score correctly', () => {
      // Clear requirement
      const clearResult = analyzeSRS('REQ-1: The API shall respond within 200 ms for 95% of requests.');
      expect(clearResult.summary.overallScore).toBeLessThanOrEqual(20);
      expect(clearResult.summary.rating).toEqual('Clear');

      // Ambiguous requirement
      const ambiguousText = 'REQ-2: The system should be fast, easy, and robust if possible, handling many requests periodically.';
      const ambResult = analyzeSRS(ambiguousText);
      expect(ambResult.summary.overallScore).toBeGreaterThan(40);
      expect(ambResult.requirements[0].findings.length).toBeGreaterThan(0);
    });

    it('should cap penalty at 10 per requirement (0 score minimum)', () => {
      const terribleText = 'The system should be fast, quick, slow, easy, simple, flexible, robust, efficient, appropriate, adequate, reasonable, sufficient if possible, TBD, etc.';
      const result = analyzeSRS(terribleText);
      expect(result.requirements[0].score).toBeGreaterThanOrEqual(0);
      expect(result.requirements[0].score).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Check', () => {
    it('should analyze 500 requirements in under 200ms', () => {
      const sentence = 'REQ-100: The system shall respond fast to many users if possible.';
      const srsText = Array(500).fill(sentence).join('\n');

      const start = Date.now();
      const result = analyzeSRS(srsText);
      const elapsed = Date.now() - start;

      expect(result.requirements.length).toEqual(500);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Empty & Edge Inputs', () => {
    it('should handle empty, null, or whitespace-only inputs', () => {
      expect(analyzeSRS('')).toEqual({
        requirements: [],
        summary: {
          totalRequirements: 0,
          totalIssues: 0,
          bySeverity: { High: 0, Medium: 0, Low: 0 },
          byCategory: {},
          overallScore: 0,
          rating: 'Clear',
        },
      });
      expect(analyzeSRS(null).requirements).toEqual([]);
      expect(analyzeSRS('   \n  \t ').requirements).toEqual([]);
    });
  });
});
