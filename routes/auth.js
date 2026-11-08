import express from 'express';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Or POST /api/auth/token
 * Generate a signed JWT token with requested role ('admin', 'patient', 'staff')
 * for testing Role-Based Authorization.
 */
router.post('/login', (req, res) => {
  console.log('==================================================');
  console.log('🔑 [POST /api/auth/login] Token Generation Request');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));

  const role = req.body.role || 'admin';
  const name = req.body.name || (role === 'admin' ? 'Dr. Marcus Vance (Admin)' : 'Standard User');
  const id = req.body.id || (role === 'admin' ? 1 : 99);

  const payload = {
    id,
    name,
    role,
    issuedAt: new Date().toISOString(),
  };

  const token = generateToken(payload, '24h');

  console.log(`✅ Token Generated for Role: "${role}"`);
  console.log('👤 Token Payload:', JSON.stringify(payload, null, 2));
  console.log('==================================================');

  return res.status(200).json({
    success: true,
    message: `Authentication token generated with role '${role}'`,
    token,
    user: payload,
  });
});

/**
 * GET /api/auth/token
 * Quick demo endpoint to retrieve an admin token or test patient token
 */
router.get('/token', (req, res) => {
  const role = (req.query.role && typeof req.query.role === 'string') ? req.query.role : 'admin';
  const name = role === 'admin' ? 'PureDent Executive Admin' : 'Clinic Patient';

  const payload = {
    id: role === 'admin' ? 100 : 200,
    name,
    role,
    issuedAt: new Date().toISOString(),
  };

  const token = generateToken(payload, '24h');

  console.log('==================================================');
  console.log(`🔑 [GET /api/auth/token] Quick Token Handout: Role "${role}"`);
  console.log('==================================================');

  return res.status(200).json({
    success: true,
    token,
    user: payload,
  });
});

export default router;
