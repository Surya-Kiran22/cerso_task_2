const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Analysis = require('../src/models/Analysis');
const { analyzeSRS } = require('../src/engine/analyzer');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/srs_ambiguity_db';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing seed data...');
    await User.deleteMany({ email: 'demo@example.com' });

    console.log('Creating demo user (demo@example.com / Demo@1234)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Demo@1234', salt);

    const demoUser = await User.create({
      name: 'Demo Administrator',
      email: 'demo@example.com',
      passwordHash,
    });

    console.log('Generating 2 sample SRS analyses for demo user...');

    // Sample Analysis 1: Ambiguous E-Commerce SRS
    const srsText1 = `
REQ-1: The user authentication system shall be fast and easy to use.
REQ-2: The system should process several payment requests where possible.
REQ-3: The search feature shall display results immediately, etc.
REQ-4: All user data shall be encrypted with state-of-the-art security algorithms.
    `.trim();

    const result1 = analyzeSRS(srsText1);
    const analysis1 = await Analysis.create({
      user: demoUser._id,
      title: 'E-Commerce Platform SRS v1.0',
      sourceType: 'txt',
      inputText: srsText1,
      requirements: result1.requirements,
      summary: result1.summary,
      overallScore: result1.summary.overallScore,
    });

    // Sample Analysis 2: Clearer Mobile Banking SRS
    const srsText2 = `
FR-1: The Mobile API Gateway shall authenticate user access tokens within 150 ms for 99% of API requests.
FR-2: The Database Cluster shall achieve an uptime of 99.99% during monthly operational hours.
FR-3: The system shall encrypt all stored credit card numbers using AES-256 GCM encryption.
    `.trim();

    const result2 = analyzeSRS(srsText2);
    const analysis2 = await Analysis.create({
      user: demoUser._id,
      title: 'Mobile Banking API Specification v2.4',
      sourceType: 'text',
      inputText: srsText2,
      requirements: result2.requirements,
      summary: result2.summary,
      overallScore: result2.summary.overallScore,
    });

    console.log(`Seed successful! Created demo user ID: ${demoUser._id}`);
    console.log(`Created Analysis 1: ${analysis1.title} (Score: ${analysis1.overallScore})`);
    console.log(`Created Analysis 2: ${analysis2.title} (Score: ${analysis2.overallScore})`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
};

seedData();
