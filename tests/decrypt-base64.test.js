const request = require('supertest');
const app = require('../server');

describe('/decrypt-base64 endpoint', () => {
  it('returns 400 when required fields are missing', async () => {
    await request(app)
      .post('/decrypt-base64')
      .send({})
      .expect(400);
  });
});
