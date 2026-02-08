const request = require('supertest');
const app = require('../server'); 

describe('Auth Login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'yourPassword' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});