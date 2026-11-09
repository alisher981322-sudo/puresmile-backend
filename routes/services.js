import express from 'express';
import db from '../db.js';
import { validateService } from '../middleware/validator.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from './auditLogs.ts';

const router = express.Router();

/**
 * GET /api/services
 * Fetch all active dental services and pricing
 * Strictly parameterized with empty parameters array []
 */
router.get('/services', async (req, res) => {
  console.log('==================================================');
  console.log('🔍 [GET /api/services] Fetching Dental Services Catalog');
  console.log('📡 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const query = `
      SELECT id, name, description, price, duration_minutes, created_at
      FROM services
      ORDER BY id ASC;
    `;
    const params = [];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values:', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Services Catalog Execution Duration: ${duration}ms`);
    console.log(`✅ [STEP 2] Database Response Received: ${result.rows.length} services found`);
    console.log('📦 Preview Item:', JSON.stringify(result.rows[0] || {}, null, 2));

    console.log('🎉 [STEP 3] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error('🔥 [DATABASE ERROR - SERVICES FETCH ALL FAILURE]');
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve dental services list.',
      details: error.message,
    });
  }
});

/**
 * GET /api/services/:id
 * Fetch a single service by ID
 * Strictly parameterized query: $1
 */
router.get('/services/:id', async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`🔍 [GET /api/services/${id}] Fetching Service Details`);
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const query = `
      SELECT id, name, description, price, duration_minutes, created_at 
      FROM services 
      WHERE id = $1;
    `;
    const params = [id];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Execution Duration: ${duration}ms`);

    if (result.rows.length === 0) {
      console.log(`⚠️ [WARNING] Service ID ${id} not found in database.`);
      return res.status(404).json({
        success: false,
        error: `Service with ID ${id} not found.`,
      });
    }

    console.log('✅ [STEP 2] Service Data Loaded:', JSON.stringify(result.rows[0], null, 2));
    console.log('🎉 [STEP 3] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error(`🔥 [DATABASE ERROR - SERVICE #${id} FETCH FAILURE]`);
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve service details.',
      details: error.message,
    });
  }
});

/**
 * POST /api/services
 * Create a new dental service with pricing & duration
 * Protected by Role-Based Authorization: Requires 'admin' role
 * Strictly parameterized query: $1, $2, $3, $4
 */
router.post('/services', authenticateToken, requireAdmin, validateService, async (req, res) => {
  const overallStartTime = Date.now();
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const adminName = req.user?.name || req.user?.username || 'PureSmile Master Administrator';
  const adminEmail = req.user?.email || 'admin@puresmiledental.com';
  const adminRole = req.user?.role || 'admin';

  try {
    const { name, description, price, duration_minutes } = req.body;

    // 1. Validation
    if (!name || price === undefined || duration_minutes === undefined) {
      console.log('❌ [POST /api/services] Validation Failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (name, price, duration_minutes).',
      });
    }

    const p = Number(price);
    const d = Number(duration_minutes);

    if (isNaN(p) || p < 0 || isNaN(d) || d <= 0) {
      console.log('❌ [POST /api/services] Validation Failed: Invalid numeric values');
      return res.status(400).json({
        success: false,
        error: 'Invalid price or duration. Both must be positive numbers.',
      });
    }

    // 2. Insert into PostgreSQL / In-Memory DB via Parameterized Query ($1, $2, $3, $4)
    const query = `
      INSERT INTO services (name, description, price, duration_minutes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, price, duration_minutes, created_at;
    `;
    const params = [name.trim(), description ? description.trim() : '', p, d];

    const queryStart = Date.now();
    const result = await db.query(query, params);
    const queryDuration = Date.now() - queryStart;
    const newService = result.rows[0];

    // 3. Formatted Terminal Console Log Box
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║ 🆕 [POST /api/services] CREATE NEW DENTAL SERVICE                              ║`);
    console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
    console.log(`⏰ Request Timestamp  : ${timestamp}`);
    console.log(`🌐 Client IP          : ${clientIp}`);
    console.log(`👤 Authenticated Admin: ${adminName} <${adminEmail}> (Role: ${adminRole})`);
    console.log(`📦 Service Payload   : Name: "${newService.name}"`);
    console.log(`                       Price: $${newService.price} | Duration: ${newService.duration_minutes} mins`);
    console.log(`                       Description: "${newService.description || 'N/A'}"`);
    console.log(`⏱️ DB Query Duration  : ${queryDuration}ms`);
    console.log(`✅ Status             : SUCCESS - Service #${newService.id} created and committed.`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    // 4. Record Audit Trail
    try {
      recordAuditLog({
        event_type: 'APPOINTMENT_BOOKED',
        category: 'appointment',
        title: `New Service Added: ${newService.name}`,
        service_name: newService.name,
        details: `Added new service "${newService.name}" ($${newService.price}, ${newService.duration_minutes} mins) to clinic catalog.`,
        actor: `Admin (${adminName})`
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    return res.status(201).json({
      success: true,
      message: `Dental service '${newService.name}' added successfully!`,
      data: newService,
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error('🔥 [DATABASE ERROR - SERVICE CREATION FAILURE]');
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to add dental service.',
      details: error.message,
    });
  }
});

/**
 * PUT /api/services/:id
 * Update an existing service details or pricing
 * Protected by Role-Based Authorization: Requires 'admin' role
 * Strictly parameterized queries: $1, $2, $3, $4, $5
 */
router.put('/services/:id', authenticateToken, requireAdmin, validateService, async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`✍️ [PUT /api/services/${id}] Updating Service Record`);
  console.log('🛡️ [RBAC VERIFIED] Authorized Administrator:', req.user.name, `(ID: ${req.user.id}, Role: ${req.user.role})`);
  console.log('📦 Request Payload:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const overallStartTime = Date.now();

  try {
    const { name, description, price, duration_minutes } = req.body;

    // 1. Check if service exists via Parameterized Query ($1)
    console.log('🔍 [STEP 1] Verifying service existence in database ($1)...');
    const checkQuery = `
      SELECT id, name, description, price, duration_minutes 
      FROM services 
      WHERE id = $1;
    `;
    const checkParams = [id];

    console.log('📝 SQL Query String:');
    console.log('   ' + checkQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(checkParams));

    const checkStart = Date.now();
    const checkResult = await db.query(checkQuery, checkParams);
    const checkDuration = Date.now() - checkStart;

    console.log(`⏱️ [DB METRICS] Existence Check Execution Duration: ${checkDuration}ms`);

    if (checkResult.rows.length === 0) {
      console.log(`❌ [ERROR] Service ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        error: `Dental service with ID ${id} not found.`,
      });
    }

    const current = checkResult.rows[0];
    console.log('✅ [STEP 2] Current Record Loaded:', JSON.stringify(current, null, 2));

    // 2. Merge values
    console.log('🔄 [STEP 3] Merging updates with existing data...');
    const updatedName = name !== undefined ? name : current.name;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedPrice = price !== undefined ? Number(price) : current.price;
    const updatedDuration = duration_minutes !== undefined ? Number(duration_minutes) : current.duration_minutes;

    // 3. Validation
    if (isNaN(updatedPrice) || updatedPrice < 0 || isNaN(updatedDuration) || updatedDuration <= 0) {
      console.log('❌ Validation Failed: Updated numeric values are invalid.');
      return res.status(400).json({ success: false, error: 'Invalid numeric values provided.' });
    }

    // 4. Update via Parameterized Query ($1, $2, $3, $4, $5)
    console.log('💾 [DB WRITE PERMITTED] Executing Parameterized UPDATE Query ($1 to $5)...');
    const updateQuery = `
      UPDATE services
      SET name = $1, description = $2, price = $3, duration_minutes = $4
      WHERE id = $5
      RETURNING id, name, description, price, duration_minutes, created_at;
    `;
    const updateParams = [updatedName, updatedDesc, updatedPrice, updatedDuration, id];
    
    console.log('📝 SQL Query String:');
    console.log('   ' + updateQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1 to $5):', JSON.stringify(updateParams));

    const updateStart = Date.now();
    const result = await db.query(updateQuery, updateParams);
    const updateDuration = Date.now() - updateStart;

    console.log(`⏱️ [DB METRICS] Service UPDATE Execution Duration: ${updateDuration}ms`);
    const updatedService = result.rows[0];

    console.log('✅ [STEP 4] Database Update Successful:', JSON.stringify(updatedService, null, 2));

    const totalDuration = Date.now() - overallStartTime;
    console.log(`⏱️ [TOTAL TIME] Overall Endpoint Execution Duration: ${totalDuration}ms`);
    console.log('🎉 [STEP 5] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      message: 'Dental service updated successfully!',
      data: updatedService,
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error(`🔥 [DATABASE ERROR - SERVICE #${id} UPDATE FAILURE]`);
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update service details.',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/services/:id
 * Remove a dental service from the catalog
 * Protected by Role-Based Authorization: Requires 'admin' role
 * Strictly parameterized query: $1
 */
router.delete('/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`🗑️ [DELETE /api/services/${id}] Removing Service from Catalog`);
  console.log('🛡️ [RBAC VERIFIED] Authorized Administrator:', req.user.name, `(ID: ${req.user.id}, Role: ${req.user.role})`);
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    console.log('💾 [DB WRITE PERMITTED] Executing Parameterized DELETE Query ($1)...');
    const query = `
      DELETE FROM services
      WHERE id = $1
      RETURNING id, name;
    `;
    const params = [id];

    console.log('📝 SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Service DELETE Execution Duration: ${duration}ms`);

    if (result.rows.length === 0) {
      console.log(`⚠️ [WARNING] Service ID ${id} not found or already deleted.`);
      return res.status(404).json({
        success: false,
        error: `Service with ID ${id} not found or already deleted.`,
      });
    }

    console.log(`✅ [STEP 2] Service '${result.rows[0].name}' successfully deleted.`);
    console.log('🎉 [STEP 3] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      message: `Dental service '${result.rows[0].name}' successfully deleted!`,
      deletedId: Number(id),
    });

  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error(`🔥 [DATABASE ERROR - SERVICE #${id} DELETION FAILURE]`);
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to delete service.',
      details: error.message,
    });
  }
});

export default router;

