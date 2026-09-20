const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  if (err.status) {
    statusCode = err.status;
  }

  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
  }

  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
