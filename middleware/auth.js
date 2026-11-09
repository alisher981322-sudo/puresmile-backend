import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'puredent-secret-key-2026';

/**
 * Generate a JWT token helper
 */
export const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * JWT Authentication Middleware
 * Validates the 'Authorization: Bearer <token>' header.
 * Includes heavy terminal logging for debugging security flows.
 */
export const authenticateToken = (req, res, next) => {
  console.log('==================================================');
  console.log('🔒 [AUTH MIDDLEWARE] Incoming Request Verification');
  console.log(`📍 Endpoint: ${req.method} ${req.originalUrl || req.baseUrl + req.path}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  // 1. Check for Authorization header
  const authHeader = req.headers['authorization'];
  console.log('📡 Authorization Header:', authHeader ? `Present (${authHeader.substring(0, 15)}...)` : '❌ MISSING');

  if (!authHeader) {
    console.log('❌ [AUTH REJECTED] No authorization header provided in request');
    console.log('🛑 Blocking request before reaching controller or database');
    console.log('==================================================');
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a Bearer token in Authorization header.',
    });
  }

  // 2. Extract Token (Expects "Bearer <token>")
  const parts = authHeader.split(' ');
  const scheme = parts[0];
  const token = parts[1];

  if (scheme !== 'Bearer' || !token) {
    console.log(`❌ [AUTH REJECTED] Malformed Authorization format: "${authHeader}" (Expected "Bearer <token>")`);
    console.log('==================================================');
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Expected format: Bearer <token>',
    });
  }

  console.log('🔑 Token Extraction: SUCCESS');

  // 3. Verify Token
  console.log('🔍 [STEP 1] Verifying JWT signature against server secret key...');
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('🔥 [AUTH ERROR] Token verification failed:');
      
      if (err.name === 'TokenExpiredError') {
        console.error('🛑 Reason: Token has EXPIRED');
        console.error('📅 Expired At:', err.expiredAt);
      } else if (err.name === 'JsonWebTokenError') {
        console.error('🛑 Reason: INVALID SIGNATURE or Malformed Token');
      } else {
        console.error('🛑 Reason:', err.message);
      }
      
      console.log('==================================================');
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access token is invalid or expired.',
        details: err.message,
      });
    }

    // 4. Verification Successful
    console.log('✅ [STEP 2] Token Signature Verified Successfully');
    console.log('👤 Decoded Token Payload:', JSON.stringify(decoded, null, 2));
    
    // Attach user payload to request
    req.user = decoded;
    
    console.log(`🚀 [AUTH APPROVED] User "${decoded.name || decoded.username || decoded.id}" authenticated. Passing to RBAC layer...`);
    console.log('==================================================');
    next();
  });
};

/**
 * Dedicated Admin Role Authorization Middleware
 * Verifies that the authenticated user possesses the 'admin' role.
 * Includes heavy console.log debugging for tracking permission checks, success, or denial states.
 */
export const requireAdmin = (req, res, next) => {
  console.log('==================================================');
  console.log('🛡️ [RBAC CHECK] Verifying Administrator Privileges');
  console.log(`🎯 Target Resource: ${req.method} ${req.originalUrl || req.baseUrl + req.path}`);
  
  if (!req.user) {
    console.error('❌ [RBAC DENIED] Critical Error: req.user is undefined! authenticateToken must be executed first.');
    console.log('==================================================');
    return res.status(500).json({
      success: false,
      error: 'Internal server error: Authentication context missing.',
    });
  }

  const userId = req.user.id || req.user.username || 'unknown_id';
  const userName = req.user.name || req.user.username || 'Unknown User';
  const userRole = req.user.role;

  console.log(`👤 Requesting Subject: ${userName} (ID: ${userId})`);
  console.log(`🏷️ Current Assigned Role: "${userRole || 'NONE'}"`);
  console.log('🔑 Required Role for Write Operation: "admin"');
  console.log('🔍 Evaluating permissions...');

  if (!userRole) {
    console.log(`❌ [RBAC DENIED] Access Denied: User "${userName}" does not possess any assigned role.`);
    console.log(`🛑 Write operation on ${req.method} ${req.originalUrl} has been ABORTED.`);
    console.log('==================================================');
    return res.status(403).json({
      success: false,
      error: 'Access denied: No role specified in authentication token.',
    });
  }

  if (userRole.toLowerCase() !== 'admin') {
    console.log(`🚫 [RBAC DENIED] Permission Denied: User "${userName}" has role "${userRole}". "admin" role is mandatory!`);
    console.log(`🛑 Database write operation on ${req.method} ${req.originalUrl} has been BLOCKED.`);
    console.log('==================================================');
    return res.status(403).json({
      success: false,
      error: `Access denied. Administrator privileges required. Your current role is '${userRole}'.`,
    });
  }

  console.log(`✅ [RBAC APPROVED] Admin privilege confirmed for "${userName}".`);
  console.log(`🔓 Permission granted to proceed with database write operation on ${req.method} ${req.originalUrl}`);
  console.log('==================================================');
  next();
};

/**
 * Generic Role-based Authorization Middleware
 * Example: authorizeRoles('admin', 'doctor')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('==================================================');
    console.log(`🛡️ [RBAC CHECK] Checking User Roles against Allowed: [${allowedRoles.join(', ')}]`);
    
    if (!req.user || !req.user.role) {
      console.log('❌ [RBAC DENIED] User role not found in authentication context');
      console.log('==================================================');
      return res.status(403).json({ success: false, error: 'Access denied: Role missing.' });
    }

    console.log(`👤 User Role: "${req.user.role}"`);

    const hasPermission = allowedRoles.some(
      (role) => role.toLowerCase() === req.user.role.toLowerCase()
    );

    if (!hasPermission) {
      console.log(`❌ [RBAC DENIED] User role "${req.user.role}" is NOT in permitted list [${allowedRoles.join(', ')}]`);
      console.log('==================================================');
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}` 
      });
    }

    console.log(`✅ [RBAC APPROVED] Role "${req.user.role}" verified successfully`);
    console.log('==================================================');
    next();
  };
};

