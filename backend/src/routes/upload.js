const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

// Memory storage for stateless backend
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowedTypes.includes(file.mimetype) || ['txt', 'pdf', 'docx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload .txt, .pdf, or .docx files only.'));
    }
  },
});

// Wrapper to handle multer errors cleanly
const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds maximum limit of 2MB' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
};

// @route   POST /api/upload
// @desc    Upload file (.txt, .pdf, .docx) and extract text
// @access  Private
router.post(
  '/',
  protect,
  apiLimiter,
  uploadSingleFile,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload' });
    }

    const filename = req.file.originalname;
    const ext = filename.split('.').pop().toLowerCase();

    let extractedText = '';
    let sourceType = 'text';

    if (ext === 'txt' || req.file.mimetype === 'text/plain') {
      extractedText = req.file.buffer.toString('utf-8');
      sourceType = 'txt';
    } else if (ext === 'pdf' || req.file.mimetype === 'application/pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
        sourceType = 'pdf';
      } catch (err) {
        return res.status(400).json({ error: 'Failed to extract text from PDF file' });
      }
    } else if (
      ext === 'docx' ||
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const docxResult = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = docxResult.value;
        sourceType = 'docx';
      } catch (err) {
        return res.status(400).json({ error: 'Failed to extract text from Word (.docx) file' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ error: 'Uploaded file contains no readable text' });
    }

    res.json({
      text: extractedText,
      sourceType,
      filename,
    });
  })
);

module.exports = router;
