import express from 'express';
import db from '../db.js';
import { validateInquiry } from '../middleware/validator.js';
import { recordAuditLog } from './auditLogs.ts';

const router = express.Router();

/**
 * POST /api/inquiries
 * Save a new message from the website contact form
 * Strictly parameterized query: $1, $2, $3, $4
 */
router.post('/inquiries', validateInquiry, async (req, res) => {
  console.log('==================================================');
  console.log('📩 [POST /api/inquiries] New Contact Inquiry Received');
  console.log('📦 Request Payload:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const overallStartTime = Date.now();

  try {
    const { name, phone, email, message } = req.body;

    // 1. Validation: ensure required fields are supplied
    console.log('🔍 [STEP 1] Validating incoming contact data...');
    if (!name || !phone || !message) {
      console.log('❌ Validation Failed: Missing required fields (name, phone, or message)');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Please supply name, phone, and message.',
      });
    }

    if (message.trim().length === 0) {
      console.log('❌ Validation Failed: Message body is empty');
      return res.status(400).json({
        success: false,
        error: 'Message body cannot be empty.',
      });
    }
    console.log('✅ Validation Success: All required fields present');

    // 2. Insert inquiry into PostgreSQL via Parameterized Query ($1, $2, $3, $4)
    console.log('💾 [STEP 2] Executing Parameterized Inquiry Insertion Query ($1 to $4)...');
    const query = `
      INSERT INTO inquiries (name, phone, email, message, status)
      VALUES ($1, $2, $3, $4, 'Unread')
      RETURNING id, name, phone, email, message, status, created_at;
    `;

    const values = [name.trim(), phone.trim(), email ? email.trim() : null, message.trim()];
    
    console.log('📝 SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1 to $4):', JSON.stringify(values));

    const queryStart = Date.now();
    const result = await db.query(query, values);
    const queryDuration = Date.now() - queryStart;

    console.log(`⏱️ [DB METRICS] Inquiry Insertion Execution Duration: ${queryDuration}ms`);
    const savedInquiry = result.rows[0];

    console.log('✅ [STEP 3] Database Insertion Successful:', JSON.stringify(savedInquiry, null, 2));

    const totalDuration = Date.now() - overallStartTime;
    console.log(`⏱️ [TOTAL TIME] Overall Endpoint Execution Duration: ${totalDuration}ms`);

    // Record in Daily Audit Trail
    try {
      recordAuditLog({
        event_type: 'INQUIRY_RECEIVED',
        category: 'appointment',
        title: 'New Contact Inquiry Received',
        patient_name: savedInquiry.name,
        patient_phone: savedInquiry.phone,
        details: `Inquiry message: "${savedInquiry.message.substring(0, 80)}..."`,
        actor: savedInquiry.name
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    console.log('🎉 [STEP 4] Sending Success Response to Client');
    console.log('==================================================');

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted successfully! Our clinic team will reach out shortly.',
      data: savedInquiry,
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error('🔥 [DATABASE ERROR - INQUIRY CREATION FAILURE]');
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to record your inquiry. Please try again later.',
      details: error.message,
    });
  }
});

/**
 * GET /api/inquiries
 * Fetch all contact messages for the admin dashboard (ordered by latest first)
 * Strictly parameterized with empty parameters array []
 */
router.get('/inquiries', async (req, res) => {
  console.log('==================================================');
  console.log('📂 [GET /api/inquiries] Fetching All Contact Inquiries');
  console.log('📡 Origin:', req.headers.origin || 'Direct Access');
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const query = `
      SELECT id, name, phone, email, message, status, created_at
      FROM inquiries
      ORDER BY created_at DESC;
    `;
    const params = [];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values:', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Inquiries Fetch Execution Duration: ${duration}ms`);
    console.log(`✅ [STEP 2] Database Fetch Complete: ${result.rows.length} messages found`);
    console.log('📦 Data Preview (First Entry):', JSON.stringify(result.rows[0] || {}, null, 2));

    console.log('🎉 [STEP 3] Sending Response to Dashboard');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });

  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error('🔥 [DATABASE ERROR - INQUIRIES FETCH ALL FAILURE]');
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch contact inquiries.',
      details: error.message,
    });
  }
});

/**
 * PUT /api/inquiries/:id
 * Mark an inquiry status as 'Read', 'Resolved', or 'Unread'
 * Strictly parameterized query: $1, $2
 */
router.put('/inquiries/:id', async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`✍️ [PUT /api/inquiries/${id}] Updating Inquiry Status`);
  console.log('📦 Request Payload:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const { status } = req.body;

    // 1. Validation
    console.log('🔍 [STEP 1] Validating status value...');
    const VALID_STATUSES = ['Unread', 'Read', 'Resolved'];
    if (!status || !VALID_STATUSES.includes(status)) {
      console.log(`❌ [ERROR] Invalid status provided: ${status}`);
      return res.status(400).json({
        success: false,
        error: `Invalid status provided. Allowed values are: ${VALID_STATUSES.join(', ')}`,
      });
    }
    console.log(`✅ Status '${status}' is valid`);

    // 2. Update status in PostgreSQL via Parameterized Query ($1, $2)
    console.log('💾 [STEP 2] Executing Parameterized Update Query ($1, $2)...');
    const query = `
      UPDATE inquiries
      SET status = $1
      WHERE id = $2
      RETURNING id, name, phone, email, message, status, created_at;
    `;
    const params = [status, id];

    console.log('📝 SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1, $2):', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Inquiry UPDATE Execution Duration: ${duration}ms`);

    if (result.rows.length === 0) {
      console.log(`⚠️ [WARNING] Inquiry with ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        error: `Inquiry with ID ${id} not found.`,
      });
    }

    const updatedInquiry = result.rows[0];
    console.log('✅ [STEP 3] Record Successfully Updated:', JSON.stringify(updatedInquiry, null, 2));

    console.log('🎉 [STEP 4] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      message: `Inquiry status updated to '${status}' successfully!`,
      data: updatedInquiry,
    });

  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error(`🔥 [DATABASE ERROR - INQUIRY #${id} STATUS UPDATE FAILURE]`);
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update inquiry status.',
      details: error.message,
    });
  }
});

export default router;

