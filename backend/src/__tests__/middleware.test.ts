import request from 'supertest';
import app from '../index';

describe('Middleware', () => {
  describe('JWT Authentication', () => {
    it('should reject requests without Authorization header', async () => {
      const res = await request(app).get('/api/submissions');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', 'NotBearer some-token');

      expect(res.status).toBe(401);
    });

    it('should allow requests with valid token', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email: `mw-${Date.now()}@example.com`, password: 'Test1234' });

      const res = await request(app)
        .get('/api/submissions')
        .set('Authorization', `Bearer ${signupRes.body.token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should return structured error for validation failures', async () => {
      const res = await request(app).post('/api/auth/signup').send({ email: 'bad', password: 'x' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('errors');
      expect(typeof res.body.errors).toBe('object');
    });

    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.status).toBe(404);
    });
  });
});
