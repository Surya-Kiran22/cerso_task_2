const express = require('express');
const { body } = require('express-validator');
const Analysis = require('../models/Analysis');
const { analyzeSRS } = require('../engine/analyzer');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

// @route   POST /api/analyze
// @desc    Analyze SRS text and store the result
// @access  Private
router.post(
  '/',
  protect,
  apiLimiter,
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Text is required for analysis')
      .isLength({ max: 50000 })
      .withMessage('Text exceeds maximum length of 50,000 characters'),
    body('title').optional().trim(),
    body('sourceType').optional().isIn(['text', 'txt', 'pdf', 'docx']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { text, title, sourceType } = req.body;

    // Run rule engine
    const result = analyzeSRS(text);

    const analysis = await Analysis.create({
      user: req.user._id,
      title: title || 'Untitled SRS Analysis',
      sourceType: sourceType || 'text',
      inputText: text,
      requirements: result.requirements,
      summary: result.summary,
      overallScore: result.summary.overallScore,
    });

    res.status(201).json(analysis);
  })
);

module.exports = router;
