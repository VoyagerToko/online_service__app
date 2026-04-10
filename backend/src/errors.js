export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function badRequest(detail) {
  throw new ApiError(400, detail);
}

export function unauthorized(detail = "Could not validate credentials") {
  throw new ApiError(401, detail);
}

export function forbidden(detail = "Access denied") {
  throw new ApiError(403, detail);
}

export function notFound(detail = "Not found") {
  throw new ApiError(404, detail);
}

export function conflict(detail) {
  throw new ApiError(409, detail);
}

export function errorMiddleware(err, _req, res, _next) {
  const status = Number(err?.status) || 500;
  const detail = err?.detail || err?.message || "Internal server error";
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ detail });
}
