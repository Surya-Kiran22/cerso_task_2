const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Analysis',
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['text', 'txt', 'pdf', 'docx'],
      default: 'text',
    },
    inputText: {
      type: String,
      required: true,
    },
    requirements: {
      type: Array,
      default: [],
    },
    summary: {
      type: Object,
      required: true,
    },
    overallScore: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for user query performance
analysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
