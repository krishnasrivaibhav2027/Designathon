const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0],
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
