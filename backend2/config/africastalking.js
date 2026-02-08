const africastalking = require('africastalking');

const at = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

module.exports = at;