const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/error');
const { sendVerificationEmail } = require('../utils/mailer');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_srs_ambiguity_detector_2026', {
    expiresIn: '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user & send verification email
// @access  Public
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await sendVerificationEmail(user.email, verificationToken, req.headers.origin || process.env.CLIENT_ORIGIN);

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      email: user.email,
      isVerified: false,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  })
);

// @route   POST /api/auth/verify-email
// @desc    Verify user email with token
// @access  Public
router.post(
  '/verify-email',
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = req.body.token || req.query.token;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const authToken = generateToken(user._id);

    res.json({
      message: 'Email verified successfully! You are now logged in.',
      token: authToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  })
);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification token
// @access  Public
router.post(
  '/resend-verification',
  authLimiter,
  [body('email').trim().isEmail().withMessage('Please provide a valid email address')],
  validate,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      return res.status(404).json({ error: 'No user found with this email address' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This account is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, verificationToken, req.headers.origin || process.env.CLIENT_ORIGIN);

    res.json({
      message: 'Verification email resent successfully. Please check your inbox.',
    });
  })
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in.',
        isVerified: false,
        email: user.email,
      });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt,
      },
    });
  })
);

module.exports = router;
