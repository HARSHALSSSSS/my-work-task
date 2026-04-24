// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[Gateway Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Gateway error',
  });
};

module.exports = errorHandler;
