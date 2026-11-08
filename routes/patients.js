import express from 'express';
import db from '../db.js';
import { validatePatientUpdate } from '../middleware/validator.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from './auditLogs.ts';

const router = express.Router();

/**
 * GET /api/patients
 * Fetch all registered patients ordered by creation date with heavy logging
 * Query parameterized: empty parameter array []
 */
router.get('/patients', async (req, res) => {
  console.log('==================================================');
  console.log('🔍 [GET /api/patients] Fetching All Patients');
  console.log('📡 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        medical_history, 
        created_at
      FROM patients
      ORDER BY created_at DESC;
    `;
    const params = [];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values:', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Execution Duration: ${duration}ms`);
    console.log(`✅ [STEP 2] Database Response Received: ${result.rows.length} patient records found`);
    console.log('📦 Data Preview (First 2):', JSON.stringify(result.rows.slice(0, 2), null, 2));

    console.log('🎉 [STEP 3] Sending Success Response to Client');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error('🔥 [DATABASE ERROR - PATIENTS FETCH ALL FAILURE]');
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient records from database.',
      details: error.message,
    });
  }
});

/**
 * GET /api/patients/:id
 * Fetch a specific patient's profile along with their past appointments
 * Strictly using parameterized queries: $1
 */
router.get('/patients/:id', async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`🔍 [GET /api/patients/${id}] Fetching Single Patient Record`);
  console.log('🆔 Patient ID Param:', id);
  console.log('==================================================');

  const overallStartTime = Date.now();

  try {
    // 1. Fetch Patient Details via Parameterized Query ($1)
    console.log('👤 [STEP 1] Fetching Patient Profile...');
    const patientQuery = `
      SELECT id, name, phone, email, medical_history, created_at
      FROM patients
      WHERE id = $1;
    `;
    const patientParams = [id];

    console.log('📝 SQL Query String:');
    console.log('   ' + patientQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(patientParams));

    const patientQueryStart = Date.now();
    const patientResult = await db.query(patientQuery, patientParams);
    const patientDuration = Date.now() - patientQueryStart;

    console.log(`⏱️ [DB METRICS] Patient Profile Query Execution Duration: ${patientDuration}ms`);

    if (patientResult.rows.length === 0) {
      console.log(`⚠️ [WARNING] Patient with ID ${id} not found in database.`);
      console.log('==================================================');
      return res.status(404).json({
        success: false,
        error: `Patient with ID ${id} not found.`,
      });
    }

    const patient = patientResult.rows[0];
    console.log('✅ [STEP 2] Patient Profile Loaded:', JSON.stringify(patient, null, 2));

    // 2. Fetch Appointments for this patient matched by phone number ($1)
    console.log('📅 [STEP 3] Fetching Associated Appointments via Parameterized Query ($1)...');
    const appointmentsQuery = `
      SELECT 
        a.id AS appointment_id,
        a.service_name,
        a.appointment_date,
        a.time_slot,
        a.status,
        a.created_at AS booked_at
      FROM appointments a
      WHERE a.patient_phone = $1
      ORDER BY a.appointment_date DESC, a.created_at DESC;
    `;
    const appointmentsParams = [patient.phone];

    console.log('📝 SQL Query String:');
    console.log('   ' + appointmentsQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(appointmentsParams));

    const apptQueryStart = Date.now();
    const appointmentsResult = await db.query(appointmentsQuery, appointmentsParams);
    const apptDuration = Date.now() - apptQueryStart;

    console.log(`⏱️ [DB METRICS] Associated Appointments Query Execution Duration: ${apptDuration}ms`);
    console.log(`✅ [STEP 4] Found ${appointmentsResult.rows.length} appointments for this patient.`);

    const totalDuration = Date.now() - overallStartTime;
    console.log(`⏱️ [TOTAL TIME] Overall Endpoint Execution Duration: ${totalDuration}ms`);
    console.log('🎉 [STEP 5] Sending Detailed Profile Response to Client');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      data: {
        ...patient,
        appointments: appointmentsResult.rows,
      },
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error(`🔥 [DATABASE ERROR - PATIENT #${id} RETRIEVAL FAILURE]`);
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient profile from database.',
      details: error.message,
    });
  }
});

/**
 * PUT /api/patients/:id
 * Update a patient's details or medical history notes
 * Protected by Role-Based Authorization: Requires 'admin' role
 * Strictly using parameterized queries: $1, $2, $3, $4, $5
 */
router.put('/patients/:id', authenticateToken, requireAdmin, validatePatientUpdate, async (req, res) => {
  const { id } = req.params;
  console.log('==================================================');
  console.log(`✍️ [PUT /api/patients/${id}] Updating Patient Profile`);
  console.log('🛡️ [RBAC VERIFIED] Authorized Administrator:', req.user.name, `(ID: ${req.user.id}, Role: ${req.user.role})`);
  console.log('📦 Incoming Request Body:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const overallStartTime = Date.now();

  try {
    const { name, phone, email, medical_history } = req.body;

    // 1. Check if patient exists first using Parameterized Query ($1)
    console.log('🔍 [STEP 1] Verifying patient existence via Parameterized Query ($1)...');
    const checkQuery = `
      SELECT id, name, phone, email, medical_history 
      FROM patients 
      WHERE id = $1;
    `;
    const checkParams = [id];

    console.log('📝 SQL Query String:');
    console.log('   ' + checkQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1):', JSON.stringify(checkParams));

    const checkStart = Date.now();
    const checkPatient = await db.query(checkQuery, checkParams);
    const checkDuration = Date.now() - checkStart;

    console.log(`⏱️ [DB METRICS] Existence Check Execution Duration: ${checkDuration}ms`);
    
    if (checkPatient.rows.length === 0) {
      console.log(`❌ [ERROR] Patient with ID ${id} does not exist in database.`);
      return res.status(404).json({
        success: false,
        error: `Patient with ID ${id} not found.`,
      });
    }

    const current = checkPatient.rows[0];
    console.log('✅ [STEP 2] Current Record Loaded:', JSON.stringify(current, null, 2));

    // 2. Prepare merged data
    const updatedName = name !== undefined ? name : current.name;
    const updatedPhone = phone !== undefined ? phone : current.phone;
    const updatedEmail = email !== undefined ? email : current.email;
    const updatedHistory = medical_history !== undefined ? medical_history : current.medical_history;

    // 3. Update Patient via Parameterized Query ($1, $2, $3, $4, $5)
    console.log('🔄 [STEP 3] Preparing Parameterized UPDATE Query ($1, $2, $3, $4, $5)...');
    const updateQuery = `
      UPDATE patients
      SET name = $1, phone = $2, email = $3, medical_history = $4
      WHERE id = $5
      RETURNING id, name, phone, email, medical_history, created_at;
    `;
    const updateParams = [updatedName, updatedPhone, updatedEmail, updatedHistory, id];
    
    console.log('📝 SQL Query String:');
    console.log('   ' + updateQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1 to $5):', JSON.stringify(updateParams));

    console.log('💾 [DB WRITE PERMITTED] Admin privileges validated, executing UPDATE in PostgreSQL...');
    const updateStart = Date.now();
    const result = await db.query(updateQuery, updateParams);
    const updateDuration = Date.now() - updateStart;

    console.log(`⏱️ [DB METRICS] Patient UPDATE Execution Duration: ${updateDuration}ms`);
    const updatedPatient = result.rows[0];

    console.log('✅ [STEP 4] Update Successful:', JSON.stringify(updatedPatient, null, 2));

    const totalDuration = Date.now() - overallStartTime;
    console.log(`⏱️ [TOTAL TIME] Overall Endpoint Execution Duration: ${totalDuration}ms`);

    // Record in Daily Audit Trail
    try {
      recordAuditLog({
        event_type: 'PATIENT_EXAMINED',
        category: 'clinical',
        title: 'Patient Medical History Examined & Updated',
        patient_name: updatedPatient.name,
        patient_phone: updatedPatient.phone,
        details: `Medical history notes updated by admin: "${(updatedPatient.medical_history || '').substring(0, 70)}..."`,
        actor: req.user.name || 'Admin'
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    console.log('🎉 [STEP 5] Sending Success Response to Client');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully!',
      data: updatedPatient,
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error(`🔥 [DATABASE ERROR - PATIENT #${id} UPDATE FAILURE]`);
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update patient record.',
      details: error.message,
    });
  }
});

export default router;
