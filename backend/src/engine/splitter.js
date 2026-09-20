/**
 * Requirement Splitter
 * Splits SRS text into individual requirement statements while preserving
 * identifiers (e.g. REQ-1, FR-2, 3.1.2), bullet points, and sentence boundaries.
 */

function splitRequirements(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');

  const requirements = [];
  let buffer = '';

  const isBulletOrHeader = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Check for explicit requirement identifiers, bullets, or numbers
    return (
      /^([A-Z0-9]+[-._][A-Z0-9._-]+|\d+(\.\d+)*[.:]?|[*•\-+]|\([0-9a-zA-Z]+\))\s+/i.test(trimmed) ||
      /^REQ-\d+/i.test(trimmed) ||
      /^FR-\d+/i.test(trimmed)
    );
  };

  for (let line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (buffer.trim()) {
        requirements.push(buffer.trim());
        buffer = '';
      }
      continue;
    }

    if (isBulletOrHeader(trimmed) && buffer.trim()) {
      requirements.push(buffer.trim());
      buffer = trimmed;
    } else {
      if (buffer) {
        buffer += ' ' + trimmed;
      } else {
        buffer = trimmed;
      }
    }
  }

  if (buffer.trim()) {
    requirements.push(buffer.trim());
  }

  // Secondary split by sentence boundary if a single item contains multiple sentences with "shall" / "must" or period
  const finalRequirements = [];

  for (let req of requirements) {
    // If requirement has explicit prefix like REQ-1:, keep it together or split carefully
    // Split sentences by period/semicolon followed by space and capital letter, unless part of a version or decimal number
    const sentences = req
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length > 1) {
      // Check if item starts with prefix e.g. REQ-1:
      const prefixMatch = req.match(/^(([A-Z0-9]+[-._][A-Z0-9._-]+|\d+(\.\d+)*[.:]?)\s*)/i);
      const prefix = prefixMatch ? prefixMatch[1] : '';

      sentences.forEach((sentence, idx) => {
        if (idx === 0) {
          finalRequirements.push(sentence);
        } else {
          // If prefix exists and sentence starts with requirement keyword, attach or keep clean
          finalRequirements.push(prefix ? `${prefix.trim()} (cont.) ${sentence}` : sentence);
        }
      });
    } else {
      finalRequirements.push(req);
    }
  }

  return finalRequirements.filter((r) => r.length > 0);
}

module.exports = { splitRequirements };
