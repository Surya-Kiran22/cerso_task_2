const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/error');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_srs_ambiguity_detector_2026', {
    expiresIn: '7d',
  });
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper for non-blocking email dispatch
const dispatchOtpEmail = (email, otpCode, purpose) => {
  sendOtpEmail(email, otpCode, purpose).catch((err) => {
    console.error(`[Async Email Dispatch Error] Failed to send OTP to ${email}:`, err);
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user & send 6-digit registration OTP email
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
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: false,
      otpCode,
      otpExpires,
      otpPurpose: 'registration',
    });

    // Send OTP email in background for instant API response
    dispatchOtpEmail(user.email, otpCode, 'registration');

    res.status(201).json({
      requireOtp: true,
      purpose: 'registration',
      email: user.email,
      message: 'Registration initiated. Please enter the 6-digit OTP code sent to your email address.',
    });
  })
);

// @route   POST /api/auth/verify-registration-otp
// @desc    Verify 6-digit registration OTP code & activate account
// @access  Public
router.post(
  '/verify-registration-otp',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be a 6-digit code'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpires +otpPurpose');

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.otpPurpose !== 'registration') {
      return res.status(400).json({ error: 'Invalid verification request' });
    }

    if (!user.otpCode || user.otpCode !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    await user.save();

    const authToken = generateToken(user._id);

    res.json({
      message: 'Account verified successfully! You are now logged in.',
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

// @route   POST /api/auth/login
// @desc    Authenticate password & send 6-digit login OTP code
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +otpCode +otpExpires +otpPurpose');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (!user.isVerified) {
      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
      user.otpPurpose = 'registration';
      await user.save();

      dispatchOtpEmail(user.email, otpCode, 'registration');

      return res.status(403).json({
        requireOtp: true,
        purpose: 'registration',
        email: user.email,
        error: 'Please verify your email address. A 6-digit registration OTP code has been sent to your inbox.',
      });
    }

    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.otpPurpose = 'login';
    await user.save();

    dispatchOtpEmail(user.email, otpCode, 'login');

    res.json({
      requireOtp: true,
      purpose: 'login',
      email: user.email,
      message: 'A 6-digit OTP code has been sent to your email address. Enter the code to complete login.',
    });
  })
);

// @route   POST /api/auth/verify-login-otp
// @desc    Verify 6-digit login OTP code & issue JWT token
// @access  Public
router.post(
  '/verify-login-otp',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be a 6-digit code'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpires +otpPurpose');

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.otpPurpose !== 'login') {
      return res.status(400).json({ error: 'Invalid OTP login session. Please log in again.' });
    }

    if (!user.otpCode || user.otpCode !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
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

// @route   POST /api/auth/resend-otp
// @desc    Resend 6-digit OTP code (registration or login)
// @access  Public
router.post(
  '/resend-otp',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otpCode +otpExpires +otpPurpose');

    if (!user) {
      return res.status(404).json({ error: 'No user found with this email address' });
    }

    const targetPurpose = purpose || user.otpPurpose || (user.isVerified ? 'login' : 'registration');
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.otpPurpose = targetPurpose;
    await user.save();

    dispatchOtpEmail(user.email, otpCode, targetPurpose);

    res.json({
      message: `A new 6-digit OTP code has been sent to ${user.email}.`,
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
