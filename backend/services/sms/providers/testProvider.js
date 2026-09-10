let sequence = 0;

const send = async (phoneNumber, message) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('The test SMS provider is disabled outside NODE_ENV=test');
  }
  sequence += 1;
  const providerMessageId = `test-message-${sequence}`;
  return {
    response: { accepted: true, to: phoneNumber, message, providerMessageId },
    providerMessageId,
    providerKey: 'test',
  };
};

module.exports = { send, providerKey: 'test' };
