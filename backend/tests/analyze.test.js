const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Analysis = require('../src/models/Analysis');

let mongoServer;
let userAToken;
let userAId;
let userBToken;
let userBId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Register User A
  const resA = await request(app).post('/api/auth/register').send({
    name: 'User A',
    email: 'usera@example.com',
    password: 'password123',
  });
  userAToken = resA.body.token;
  userAId = resA.body.user._id;

  // Register User B
  const resB = await request(app).post('/api/auth/register').send({
    name: 'User B',
    email: 'userb@example.com',
    password: 'password123',
  });
  userBToken = resB.body.token;
  userBId = resB.body.user._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Analysis.deleteMany({});
});

describe('Analysis & Dashboard API Endpoints - Milestone 3 Tests', () => {
  describe('POST /api/analyze', () => {
    it('should create and store an SRS analysis for User A', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'System Requirements v1',
          text: 'REQ-1: The login page shall be fast.\nREQ-2: The system shall respond within 200 ms.',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toEqual('System Requirements v1');
      expect(res.body.user).toEqual(userAId);
      expect(res.body.requirements.length).toEqual(2);
      expect(res.body.summary).toHaveProperty('overallScore');
    });

    it('should reject analyze request without authentication', async () => {
      const res = await request(app).post('/api/analyze').send({
        text: 'REQ-1: Test text',
      });
      expect(res.statusCode).toEqual(401);
    });

    it('should reject analyze request with empty text', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          text: '',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/analyses & Ownership Enforcement', () => {
    let userAAnalysisId;

    beforeEach(async () => {
      const analysis = await Analysis.create({
        user: userAId,
        title: 'User A Confidential SRS',
        sourceType: 'text',
        inputText: 'REQ-1: User A requirement',
        requirements: [{ text: 'REQ-1: User A requirement', score: 100, findings: [] }],
        summary: { totalRequirements: 1, totalIssues: 0, bySeverity: { High: 0, Medium: 0, Low: 0 }, byCategory: {}, overallScore: 0, rating: 'Clear' },
        overallScore: 0,
      });
      userAAnalysisId = analysis._id.toString();
    });

    it('should list paginated analyses for User A', async () => {
      const res = await request(app)
        .get('/api/analyses')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.analyses.length).toEqual(1);
      expect(res.body.analyses[0].title).toEqual('User A Confidential SRS');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should return empty list for User B who has no analyses', async () => {
      const res = await request(app)
        .get('/api/analyses')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.analyses.length).toEqual(0);
    });

    it('should allow User A to retrieve their own full analysis detail', async () => {
      const res = await request(app)
        .get(`/api/analyses/${userAAnalysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body._id).toEqual(userAAnalysisId);
      expect(res.body.inputText).toEqual('REQ-1: User A requirement');
    });

    it('STRICT OWNERSHIP CHECK: User B cannot read User A analysis (403 forbidden)', async () => {
      const res = await request(app)
        .get(`/api/analyses/${userAAnalysisId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error');
    });

    it('STRICT OWNERSHIP CHECK: User B cannot delete User A analysis (403 forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/analyses/${userAAnalysisId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error');

      // Verify analysis is still intact in DB
      const stillExists = await Analysis.findById(userAAnalysisId);
      expect(stillExists).not.toBeNull();
    });

    it('should allow User A to delete their own analysis', async () => {
      const res = await request(app)
        .delete(`/api/analyses/${userAAnalysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);

      const deleted = await Analysis.findById(userAAnalysisId);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/dashboard/stats', () => {
    beforeEach(async () => {
      await Analysis.create({
        user: userAId,
        title: 'Analysis 1',
        sourceType: 'text',
        inputText: 'The system shall be fast.',
        requirements: [],
        summary: {
          totalRequirements: 1,
          totalIssues: 1,
          bySeverity: { High: 0, Medium: 1, Low: 0 },
          byCategory: { VAGUE_TERMS: 1 },
          overallScore: 20,
          rating: 'Clear',
        },
        overallScore: 20,
      });
    });

    it('should compute aggregated dashboard stats for User A', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('totalAnalyses', 1);
      expect(res.body).toHaveProperty('averageScore', 20);
      expect(res.body).toHaveProperty('totalIssues', 1);
      expect(res.body).toHaveProperty('mostCommonCategory', 'VAGUE_TERMS');
      expect(res.body.severityDistribution).toBeDefined();
      expect(res.body.scoreHistory).toBeDefined();
    });
  });

  describe('POST /api/upload', () => {
    it('should extract text from attached .txt file', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from('REQ-1: Uploaded plain text requirement.'), 'sample.txt');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('text', 'REQ-1: Uploaded plain text requirement.');
      expect(res.body).toHaveProperty('sourceType', 'txt');
    });
  });
});
