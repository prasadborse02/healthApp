import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../index';

describe('Submissions API', () => {
  let token: string;
  let submissionId: string;

  beforeAll(async () => {
    const email = `sub-test-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/signup').send({ email, password: 'Test1234' });
    token = res.body.token;
  });

  describe('POST /api/submissions', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/submissions');

      expect(res.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .field('symptoms', 'headache');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/file/i);
    });

    it('should reject upload without symptoms', async () => {
      const testFile = path.join(__dirname, 'test-image.png');
      // Create a minimal 1x1 PNG
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );
      fs.writeFileSync(testFile, pngBuffer);

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFile);

      fs.unlinkSync(testFile);
      expect(res.status).toBe(400);
    });

    it('should upload prescription successfully', async () => {
      const testFile = path.join(__dirname, 'test-image.png');
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );
      fs.writeFileSync(testFile, pngBuffer);

      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFile)
        .field('symptoms', 'sore throat and fever');

      fs.unlinkSync(testFile);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.symptoms).toBe('sore throat and fever');
      expect(res.body.fileType).toBe('image/png');
      submissionId = res.body.id;
    });
  });

  describe('GET /api/submissions', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/submissions');

      expect(res.status).toBe(401);
    });

    it('should list user submissions', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('analysis');
    });
  });

  describe('GET /api/submissions/:id', () => {
    it('should return submission with analysis field', async () => {
      const res = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(submissionId);
      expect(res.body).toHaveProperty('analysis');
    });

    it('should return 404 for non-existent submission', async () => {
      const res = await request(app)
        .get('/api/submissions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should not allow access to other users submissions', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: `other-${Date.now()}@example.com`, password: 'Test1234' });
      const otherToken = otherRes.body.token;

      const res = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
