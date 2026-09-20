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
    it('should register a new user with isVerified: false and create verification token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body.user).toHaveProperty('_id');
      expect(res.body.user).toHaveProperty('name', 'Test User');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.user).toHaveProperty('isVerified', false);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      const userInDb = await User.findOne({ email: 'test@example.com' }).select('+verificationToken +verificationTokenExpires');
      expect(userInDb).not.toBeNull();
      expect(userInDb.isVerified).toBe(false);
      expect(userInDb.verificationToken).toBeDefined();
      expect(userInDb.verificationTokenExpires).toBeDefined();
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

  describe('SMTP Email Verification Flow', () => {
    let unverifiedUser;
    let verificationToken;

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Verify User',
        email: 'verify@example.com',
        password: 'password123',
      });

      unverifiedUser = await User.findOne({ email: 'verify@example.com' }).select('+verificationToken');
      verificationToken = unverifiedUser.verificationToken;
    });

    it('should block unverified user from logging in with 403 Forbidden', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'verify@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Please verify your email address before logging in.');
      expect(res.body).toHaveProperty('isVerified', false);
    });

    it('should fail email verification with invalid token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        token: 'invalid_token_12345',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid or expired verification token');
    });

    it('should verify email successfully with valid token and return JWT token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        token: verificationToken,
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('isVerified', true);

      const updatedUser = await User.findOne({ email: 'verify@example.com' });
      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.verificationToken).toBeUndefined();
    });

    it('should allow verified user to log in successfully', async () => {
      // Verify first
      await request(app).post('/api/auth/verify-email').send({
        token: verificationToken,
      });

      // Login
      const res = await request(app).post('/api/auth/login').send({
        email: 'verify@example.com',
        password: 'password123',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toEqual('verify@example.com');
      expect(res.body.user.isVerified).toEqual(true);
    });

    it('should resend verification token for unverified user', async () => {
      const res = await request(app).post('/api/auth/resend-verification').send({
        email: 'verify@example.com',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');

      const userAfterResend = await User.findOne({ email: 'verify@example.com' }).select('+verificationToken');
      expect(userAfterResend.verificationToken).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated verified user', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Me User',
        email: 'me@example.com',
        password: 'password123',
      });

      const user = await User.findOne({ email: 'me@example.com' }).select('+verificationToken');
      const verifyRes = await request(app).post('/api/auth/verify-email').send({
        token: user.verificationToken,
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
