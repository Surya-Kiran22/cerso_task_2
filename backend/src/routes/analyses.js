const express = require('express');
const Analysis = require('../models/Analysis');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

// @route   GET /api/analyses
// @desc    Get paginated list of user's past analyses (lightweight summary list)
// @access  Private
router.get(
  '/',
  protect,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    const total = await Analysis.countDocuments(query);
    const analyses = await Analysis.find(query)
      .select('title sourceType summary overallScore createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

// @route   GET /api/analyses/:id
// @desc    Get full analysis detail by ID
// @access  Private (Owner only)
router.get(
  '/:id',
  protect,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You do not own this analysis' });
    }

    res.json(analysis);
  })
);

// @route   DELETE /api/analyses/:id
// @desc    Delete analysis by ID
// @access  Private (Owner only)
router.delete(
  '/:id',
  protect,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You do not own this analysis' });
    }

    await analysis.deleteOne();

    res.json({ success: true, id: req.params.id });
  })
);

module.exports = router;
