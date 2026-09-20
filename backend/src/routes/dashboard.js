const express = require('express');
const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get aggregated stats for dashboard cards & charts
// @access  Private
router.get(
  '/stats',
  protect,
  apiLimiter,
  asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // 1. Total Analyses & Average Score
    const overviewStats = await Analysis.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          avgScore: { $avg: '$overallScore' },
          totalIssues: { $sum: '$summary.totalIssues' },
          highSeverity: { $sum: '$summary.bySeverity.High' },
          mediumSeverity: { $sum: '$summary.bySeverity.Medium' },
          lowSeverity: { $sum: '$summary.bySeverity.Low' },
        },
      },
    ]);

    const statsSummary = overviewStats[0] || {
      totalAnalyses: 0,
      avgScore: 0,
      totalIssues: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
    };

    // 2. Score History (last 10 analyses, chronological)
    const recentTen = await Analysis.find({ user: userId })
      .select('title overallScore createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const scoreHistory = recentTen
      .reverse()
      .map((item) => ({
        id: item._id,
        title: item.title,
        score: item.overallScore,
        date: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }));

    // 3. Category Distribution Aggregation
    const categoryAgg = await Analysis.aggregate([
      { $match: { user: userId } },
      { $project: { byCategory: { $objectToArray: '$summary.byCategory' } } },
      { $unwind: '$byCategory' },
      {
        $group: {
          _id: '$byCategory.k',
          count: { $sum: '$byCategory.v' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byCategoryMap = {};
    let topCategory = 'N/A';
    let topCategoryCount = 0;

    categoryAgg.forEach((item) => {
      byCategoryMap[item._id] = item.count;
      if (item.count > topCategoryCount) {
        topCategoryCount = item.count;
        topCategory = item._id;
      }
    });

    const issuesByCategoryArray = categoryAgg.map((item) => ({
      category: item._id,
      count: item.count,
    }));

    // 4. 5 Most Recent Analyses
    const recentAnalyses = await Analysis.find({ user: userId })
      .select('title overallScore summary createdAt sourceType')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalAnalyses: statsSummary.totalAnalyses,
      averageScore: Math.round(statsSummary.avgScore || 0),
      totalIssues: statsSummary.totalIssues,
      mostCommonCategory: topCategory,
      severityDistribution: [
        { name: 'High', value: statsSummary.highSeverity },
        { name: 'Medium', value: statsSummary.mediumSeverity },
        { name: 'Low', value: statsSummary.lowSeverity },
      ],
      byCategory: byCategoryMap,
      issuesByCategory: issuesByCategoryArray,
      scoreHistory,
      recentAnalyses,
    });
  })
);

module.exports = router;
