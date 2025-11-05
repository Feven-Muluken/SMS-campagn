const request = require('supertest');
const app = require('../server');

describe('SMS Send', () => {
  it('should send SMS with valid token and data', async () => {
    const token = 'your_test_token_here'; // Replace with a valid token

    const res = await request(app)
      .post('/api/sms/send')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipient: '+251912345678',
        content: 'Test SMS',
        campaign: 'TestCampaign',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('recipient');
  });
});


// postman test
//| route     |  method  |  body   |  Headers  | 
//|/auth/login | post | { email, password } | none  | 
//|/auth/register| post | { name, email, password, role } | Authorization: Bearer <admin_token> | 

//|/sms/send| post | { recipient, content, campaign } | Authorization: Bearer <token> | 
//|/sms/campaign/:name/stats | get | none | Authorization: Bearer <token> | 

//|/admin/users/ | get | none | Authorization: Bearer <admin_token> | 
//|/admin/users/:id | delete | none | Authorization: Bearer <admin_token> | 
//|/admin/users/:id | put | { role: "staff" } | Authorization: Bearer <admin_token> | 

//|/groups/create | POST | { "name": "VIPs" } | Authorization: Bearer <token>
//|/groups/<groupid>/add | POST | { "name": "feven", "phoneNumber": "+251912345678"} | Authorization: Bearer <token>
//|/groups/<groupid>/send | POST | { "content": "Hello VIPs!", "campaign": "VIPLaunch"} | Authorization: Bearer <token>


// before sending scheduling to send eg sent it at night , recuring (with monthes)