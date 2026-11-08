import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string | number;
  details?: any;
}

/**
 * Sanitizes an error message before returning it to the client.
 * Ensures internal filesystem paths, PostgreSQL credentials, secret tokens, 
 * and sensitive stack traces are never leaked in API responses.
 */
function getSafeClientMessage(err: AppError, statusCode: number): string {
  // 1. JSON parsing syntax error from express.json()
  if (err instanceof SyntaxError && 'body' in err && statusCode === 400) {
    return 'Malformed JSON payload received. Please verify request syntax.';
  }

  // 2. Client-side bad requests / validation errors with explicit safe messages
  if (statusCode === 400) {
    return err.message && !err.message.includes('/') && !err.message.includes('\\')
      ? err.message
      : 'Invalid request payload or parameters.';
  }

  // 3. Authentication & Authorization errors
  if (statusCode === 401) {
    return 'Authentication required. Invalid or expired authentication token.';
  }

  if (statusCode === 403) {
    return 'Access denied. You do not possess the required permissions for this resource.';
  }

  // 4. Resource Not Found
  if (statusCode === 404) {
    return 'The requested resource or API endpoint does not exist.';
  }

  // 5. Rate limiting
  if (statusCode === 429) {
    return 'Too many requests. Please slow down and try again shortly.';
  }

  // 6. Generic safe fallback for 500 and all other internal server errors
  return 'An unexpected internal server error occurred while processing your dental clinic request. Our team has been notified. Please try again later.';
}

/**
 * Centralized Global Error Handling Middleware
 * Catches all forwarded or unhandled exceptions across the Express pipeline.
 * Outputs detailed, high-visibility debug logs with timestamps, request context,
 * and full stack traces to the CMD terminal, while responding to the client
 * with a clean, sanitized JSON payload.
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const now = new Date();
  const timestampIso = now.toISOString();
  const localTimeString = now.toLocaleTimeString();

  // Determine appropriate HTTP status code
  let statusCode = 500;
  if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400; // Malformed JSON in body-parser
  }

  // Generate unique error reference ID for correlation
  const errorRefId = `ERR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Redact potentially sensitive fields from query & body before terminal logging
  const safeBody = req.body ? { ...req.body } : {};
  if (safeBody.password) safeBody.password = '[REDACTED]';
  if (safeBody.token) safeBody.token = '[REDACTED]';

  // -------------------------------------------------------------------------
  // HEAVY CMD TERMINAL DEBUGGING LOG
  // -------------------------------------------------------------------------
  console.error('\n🚨 ======================================================================');
  console.error('💥 [GLOBAL ERROR HANDLER] Unhandled Exception Caught in Pipeline');
  console.error(`⏰ Timestamp:       ${timestampIso} (${localTimeString})`);
  console.error(`🆔 Error Ref ID:    ${errorRefId}`);
  console.error(`🌐 HTTP Method:     ${req.method}`);
  console.error(`📍 Request Path:    ${req.originalUrl || req.url}`);
  console.error(`🔢 Status Code:     ${statusCode}`);
  console.error(`📡 Client IP:       ${req.ip || req.socket.remoteAddress || 'Unknown'}`);
  console.error(`👤 User-Agent:      ${req.get('user-agent') || 'None'}`);
  console.error(`🏷️  Error Name:      ${err.name || 'Error'}`);
  console.error(`💬 Error Message:   ${err.message || 'No explicit error message provided.'}`);

  if (req.params && Object.keys(req.params).length > 0) {
    console.error(`📌 Route Params:    ${JSON.stringify(req.params)}`);
  }

  if (req.query && Object.keys(req.query).length > 0) {
    console.error(`🔍 Query String:    ${JSON.stringify(req.query)}`);
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.error(`📦 Request Body:    ${JSON.stringify(safeBody, null, 2)}`);
  }

  console.error('\n📍 FULL STACK TRACE:');
  console.error(err.stack || '   (No stack trace available)');
  console.error('🚨 ======================================================================\n');

  // Prevent multiple responses if headers were already sent
  if (res.headersSent) {
    console.warn('⚠️ [GLOBAL ERROR HANDLER] Headers already sent to client; delegating to default express handler.');
    return next(err);
  }

  const clientSafeMessage = getSafeClientMessage(err, statusCode);

  // Return clean, production-safe response to client without internal server leaks
  return res.status(statusCode).json({
    success: false,
    error: clientSafeMessage,
    errorRef: errorRefId,
    statusCode,
    timestamp: timestampIso,
  });
};

/**
 * 404 Not Found Handler for unmatched API routes (/api/*)
 */
export const apiNotFoundHandler = (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.warn(`⚠️ [404 NOT FOUND] Unmatched API Route: ${req.method} ${req.originalUrl} at ${timestamp}`);

  return res.status(404).json({
    success: false,
    error: `API route '${req.method} ${req.originalUrl}' does not exist on PureDentist backend server.`,
    statusCode: 404,
    timestamp,
  });
};
