const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);
  const message = err?.message || String(err) || 'Unknown error';
  res.status(500).json({ message: 'Server error', error: message });
};

module.exports = errorMiddleware;



