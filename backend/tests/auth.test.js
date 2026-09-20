const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Auth Endpoints & Health Route', () => {
  describe('GET /api/health', () => {
    it('should return health status and instance hostname', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('instance');
      expect(res.headers).toHaveProperty('x-served-by');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with isVerified: false and generate 6-digit OTP', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('requireOtp', true);
      expect(res.body).toHaveProperty('purpose', 'registration');
      expect(res.body).toHaveProperty('email', 'test@example.com');

      const userInDb = await User.findOne({ email: 'test@example.com' }).select('+otpCode +otpExpires +otpPurpose');
      expect(userInDb).not.toBeNull();
      expect(userInDb.isVerified).toBe(false);
      expect(userInDb.otpCode).toMatch(/^\d{6}$/);
      expect(userInDb.otpExpires).toBeDefined();
      expect(userInDb.otpPurpose).toBe('registration');
    });

    it('should reject registration with duplicate email', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password456',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with invalid fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'invalid-email',
        password: '123',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Registration & Login 6-Digit OTP Flow', () => {
    let registrationOtp;

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'OTP User',
        email: 'otpuser@example.com',
        password: 'password123',
      });

      const user = await User.findOne({ email: 'otpuser@example.com' }).select('+otpCode');
      registrationOtp = user.otpCode;
    });

    it('should fail registration OTP verification with invalid code', async () => {
      const res = await request(app).post('/api/auth/verify-registration-otp').send({
        email: 'otpuser@example.com',
        otp: '000000',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid or expired OTP code');
    });

    it('should verify registration successfully with valid 6-digit OTP and return JWT token', async () => {
      const res = await request(app).post('/api/auth/verify-registration-otp').send({
        email: 'otpuser@example.com',
        otp: registrationOtp,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('isVerified', true);

      const updatedUser = await User.findOne({ email: 'otpuser@example.com' });
      expect(updatedUser.isVerified).toBe(true);
    });

    it('should initiate 2-step OTP login when password is correct', async () => {
      // First verify registration
      await request(app).post('/api/auth/verify-registration-otp').send({
        email: 'otpuser@example.com',
        otp: registrationOtp,
      });

      // Submit password
      const res = await request(app).post('/api/auth/login').send({
        email: 'otpuser@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('requireOtp', true);
      expect(res.body).toHaveProperty('purpose', 'login');
      expect(res.body).toHaveProperty('email', 'otpuser@example.com');

      const userAfterLoginAttempt = await User.findOne({ email: 'otpuser@example.com' }).select('+otpCode +otpPurpose');
      expect(userAfterLoginAttempt.otpPurpose).toBe('login');
      expect(userAfterLoginAttempt.otpCode).toMatch(/^\d{6}$/);
    });

    it('should complete login with valid 6-digit login OTP code', async () => {
      // 1. Verify registration
      await request(app).post('/api/auth/verify-registration-otp').send({
        email: 'otpuser@example.com',
        otp: registrationOtp,
      });

      // 2. Submit password to generate login OTP
      await request(app).post('/api/auth/login').send({
        email: 'otpuser@example.com',
        password: 'password123',
      });

      const userWithLoginOtp = await User.findOne({ email: 'otpuser@example.com' }).select('+otpCode');
      const loginOtp = userWithLoginOtp.otpCode;

      // 3. Verify login OTP
      const res = await request(app).post('/api/auth/verify-login-otp').send({
        email: 'otpuser@example.com',
        otp: loginOtp,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('otpuser@example.com');
    });

    it('should resend 6-digit OTP code', async () => {
      const res = await request(app).post('/api/auth/resend-otp').send({
        email: 'otpuser@example.com',
        purpose: 'registration',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');

      const userAfterResend = await User.findOne({ email: 'otpuser@example.com' }).select('+otpCode');
      expect(userAfterResend.otpCode).toMatch(/^\d{6}$/);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Me User',
        email: 'me@example.com',
        password: 'password123',
      });

      const user = await User.findOne({ email: 'me@example.com' }).select('+otpCode');
      const verifyRes = await request(app).post('/api/auth/verify-registration-otp').send({
        email: 'me@example.com',
        otp: user.otpCode,
      });

      const token = verifyRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.email).toEqual('me@example.com');
      expect(res.body.user.name).toEqual('Me User');
      expect(res.body.user.isVerified).toEqual(true);
    });

    it('should fail with 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error');
    });
  });
});
