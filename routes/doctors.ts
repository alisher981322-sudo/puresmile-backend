import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from './auditLogs.ts';

const router = express.Router();

/**
 * GET /api/doctors
 * Fetch all active dental specialists
 */
router.get('/doctors', async (req, res) => {
  const startTime = Date.now();
  try {
    const result = await db.query('SELECT * FROM doctors ORDER BY id ASC');
    const duration = Date.now() - startTime;

    console.log(`🔍 [GET /api/doctors] Fetched ${result.rows.length} doctors in ${duration}ms`);
    
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('🔥 [ERROR] Failed to fetch doctors:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve doctors list.'
    });
  }
});

/**
 * POST /api/doctors
 * Add a new doctor to the clinic
 */
router.post('/doctors', authenticateToken, requireAdmin, async (req: any, res) => {
  const overallStartTime = Date.now();
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const adminName = req.user?.name || req.user?.username || 'Administrator';

  try {
    const { name, specialty, experience_years, bio, availability } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({ success: false, error: 'Name and specialty are required.' });
    }

    const query = `
      INSERT INTO doctors (name, specialty, experience_years, bio, availability)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const params = [name, specialty, Number(experience_years) || 0, bio || '', availability || ''];

    const queryStart = Date.now();
    const result = await db.query(query, params);
    const queryDuration = Date.now() - queryStart;
    const newDoctor = result.rows[0];

    // Beautiful Terminal Logs
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║ 🏥 [POST /api/doctors] ADD NEW DENTAL SPECIALIST                               ║`);
    console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
    console.log(`⏰ Timestamp          : ${timestamp}`);
    console.log(`🌐 Client IP          : ${clientIp}`);
    console.log(`👤 Admin Account      : ${adminName} (${req.user?.role})`);
    console.log(`👨‍⚕️ Doctor Name        : ${newDoctor.name}`);
    console.log(`🎓 Specialty          : ${newDoctor.specialty}`);
    console.log(`⏳ Experience         : ${newDoctor.experience_years} years`);
    console.log(`⏱️ DB Duration        : ${queryDuration}ms`);
    console.log(`✅ Status             : SUCCESS - Doctor #${newDoctor.id} Added`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    recordAuditLog({
      event_type: 'APPOINTMENT_BOOKED', // Reusing category or adding new one if needed
      category: 'admin',
      title: `Doctor Added: ${newDoctor.name}`,
      details: `Admin ${adminName} added new specialist: ${newDoctor.name} (${newDoctor.specialty})`,
      actor: adminName
    });

    return res.status(201).json({ success: true, data: newDoctor });
  } catch (error: any) {
    console.error('🔥 [ERROR] Failed to add doctor:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to add doctor.' });
  }
});

/**
 * PUT /api/doctors/:id
 * Update doctor details
 */
router.put('/doctors/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const startTime = Date.now();
  const adminName = req.user?.name || 'Administrator';

  try {
    const { name, specialty, experience_years, bio, availability } = req.body;
    
    const query = `
      UPDATE doctors 
      SET name = $1, specialty = $2, experience_years = $3, bio = $4, availability = $5
      WHERE id = $6
      RETURNING *;
    `;
    const params = [name, specialty, Number(experience_years), bio, availability, id];
    
    const result = await db.query(query, params);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }

    const updated = result.rows[0];
    console.log(`✍️ [PUT /api/doctors/${id}] Doctor updated by ${adminName} in ${duration}ms`);

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('🔥 [ERROR] Failed to update doctor:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update doctor.' });
  }
});

/**
 * DELETE /api/doctors/:id
 */
router.delete('/doctors/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const startTime = Date.now();
  const adminName = req.user?.name || 'Administrator';

  try {
    const result = await db.query('DELETE FROM doctors WHERE id = $1 RETURNING name', [id]);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }

    console.log(`🗑️ [DELETE /api/doctors/${id}] Doctor ${result.rows[0].name} removed by ${adminName} in ${duration}ms`);

    return res.status(200).json({ success: true, message: 'Doctor removed successfully.' });
  } catch (error: any) {
    console.error('🔥 [ERROR] Failed to delete doctor:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete doctor.' });
  }
});

export default router;

