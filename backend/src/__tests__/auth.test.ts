import request from 'supertest';
import app from '../index';

describe('Auth API', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test1234',
  };

  describe('POST /api/auth/signup', () => {
    it('should create a new user and return JWT', async () => {
      const res = await request(app).post('/api/auth/signup').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 409 for duplicate email', async () => {
      const res = await request(app).post('/api/auth/signup').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already in use/i);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'not-an-email', password: 'Test1234' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.errors).toHaveProperty('email');
    });

    it('should return 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'weak@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('password');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send(testUser);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPass1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'Test1234' });

      expect(res.status).toBe(401);
    });
  });
});
