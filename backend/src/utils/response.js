/**
 * Standard response helpers for consistent API responses
 */

const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201)
}

const error = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  })
}

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404)
}

const badRequest = (res, message = 'Bad request', details = null) => {
  return error(res, message, 400, details)
}

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401)
}

const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403)
}

module.exports = { success, created, error, notFound, badRequest, unauthorized, forbidden }
