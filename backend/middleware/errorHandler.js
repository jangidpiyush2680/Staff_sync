function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.statusCode || 500;
  let message = error.message || 'Something went wrong.';

  if (error.name === 'ValidationError') {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(', ');
  } else if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyPattern || {})[0] || 'record';
    message = `${field} already exists. Please use a unique value.`;
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'The supplied identifier or value is invalid.';
  }

  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : message });
}

module.exports = { notFound, errorHandler };
