const request = require('supertest');
const app = require('../server');

describe('POST /decrypt-base64', () => {
  it('responds with 400 when required fields are missing', async () => {
    const res = await request(app).post('/decrypt-base64').send({});
    expect(res.statusCode).toBe(400);
  });
});
