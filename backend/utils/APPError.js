class APPError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; // Use lowercase "fail" for consistency
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default APPError;
