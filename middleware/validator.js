/**
 * Middleware: Input Validation & Sanitization Layer
 * Provides centralized validation logic with heavy terminal logging for debugging.
 */

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Basic trim and strip any potential script tags (very basic sanitization)
  return str.trim().replace(/<[^>]*>?/gm, '');
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  // Flexible phone validation (allows +, spaces, dashes, digits)
  const re = /^[\d\+\-\s\(\)]{7,20}$/;
  return re.test(phone);
};

export const validateInquiry = (req, res, next) => {
  console.log('--------------------------------------------------');
  console.log('🛡️ [VALIDATOR] Checking Inquiry Payload');
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

  const { name, phone, email, message } = req.body;
  const errors = [];

  // 1. Sanitization
  console.log('🧹 [STEP 1] Sanitizing inputs...');
  req.body.name = sanitizeString(name);
  req.body.phone = sanitizeString(phone);
  req.body.email = email ? sanitizeString(email) : null;
  req.body.message = sanitizeString(message);
  console.log('✅ Sanitization complete');

  // 2. Presence & Format Checks
  console.log('🔍 [STEP 2] Running format and presence checks...');
  
  if (!req.body.name || req.body.name.length < 2) {
    console.log('⚠️ [WARNING] Name validation failed: missing or too short');
    errors.push('Valid name is required (min 2 chars).');
  }

  if (!req.body.phone || !validatePhone(req.body.phone)) {
    console.log('⚠️ [WARNING] Phone validation failed:', req.body.phone);
    errors.push('Valid phone number is required.');
  }

  if (req.body.email && !validateEmail(req.body.email)) {
    console.log('⚠️ [WARNING] Email format validation failed:', req.body.email);
    errors.push('Provided email format is invalid.');
  }

  if (!req.body.message || req.body.message.length < 5) {
    console.log('⚠️ [WARNING] Message validation failed: missing or too short');
    errors.push('Message is required (min 5 chars).');
  }

  if (errors.length > 0) {
    console.log('❌ [REJECTED] Payload failed validation checks');
    console.log('--------------------------------------------------');
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }

  console.log('✅ [APPROVED] Payload passed all checks');
  console.log('--------------------------------------------------');
  next();
};

export const validateAppointment = (req, res, next) => {
  console.log('--------------------------------------------------');
  console.log('🛡️ [VALIDATOR] Checking Appointment Payload');
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

  const { patient_name, patient_phone, service_name, appointment_date, time_slot } = req.body;
  const errors = [];

  // Sanitization
  console.log('🧹 [STEP 1] Sanitizing inputs...');
  req.body.patient_name = sanitizeString(patient_name);
  req.body.patient_phone = sanitizeString(patient_phone);
  req.body.service_name = sanitizeString(service_name);
  console.log('✅ Sanitization complete');

  // Logic Checks
  console.log('🔍 [STEP 2] Running business logic and format checks...');

  if (!req.body.patient_name) {
    console.log('⚠️ [WARNING] Missing patient_name');
    errors.push('Patient name is required.');
  }

  if (!req.body.patient_phone || !validatePhone(req.body.patient_phone)) {
    console.log('⚠️ [WARNING] Invalid patient_phone:', req.body.patient_phone);
    errors.push('Valid phone number is required.');
  }

  if (!req.body.service_name) {
    console.log('⚠️ [WARNING] Missing service_name');
    errors.push('Treatment service selection is required.');
  }

  if (!appointment_date) {
    console.log('⚠️ [WARNING] Missing appointment_date');
    errors.push('Appointment date is required.');
  }

  if (!time_slot) {
    console.log('⚠️ [WARNING] Missing time_slot');
    errors.push('Time slot selection is required.');
  }

  if (errors.length > 0) {
    console.log('❌ [REJECTED] Appointment payload failed validation');
    console.log('--------------------------------------------------');
    return res.status(400).json({ success: false, error: 'Booking validation failed', details: errors });
  }

  console.log('✅ [APPROVED] Appointment payload passed all checks');
  console.log('--------------------------------------------------');
  next();
};

export const validateService = (req, res, next) => {
  console.log('--------------------------------------------------');
  console.log('🛡️ [VALIDATOR] Checking Service CRUD Payload');
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

  const { name, price, duration_minutes } = req.body;
  const errors = [];

  // Sanitization
  console.log('🧹 [STEP 1] Sanitizing inputs...');
  if (name) req.body.name = sanitizeString(name);
  if (req.body.description) req.body.description = sanitizeString(req.body.description);
  console.log('✅ Sanitization complete');

  // Checks
  console.log('🔍 [STEP 2] Validating field types and values...');

  if (req.method === 'POST') {
    if (!name) errors.push('Service name is required.');
    if (price === undefined) errors.push('Price is required.');
    if (duration_minutes === undefined) errors.push('Duration is required.');
  }

  if (price !== undefined) {
    const p = Number(price);
    if (isNaN(p) || p < 0) {
      console.log('⚠️ [WARNING] Invalid price:', price);
      errors.push('Price must be a valid non-negative number.');
    } else {
      req.body.price = p;
    }
  }

  if (duration_minutes !== undefined) {
    const d = Number(duration_minutes);
    if (isNaN(d) || d <= 0) {
      console.log('⚠️ [WARNING] Invalid duration:', duration_minutes);
      errors.push('Duration must be a positive number of minutes.');
    } else {
      req.body.duration_minutes = d;
    }
  }

  if (errors.length > 0) {
    console.log('❌ [REJECTED] Service payload failed checks');
    console.log('--------------------------------------------------');
    return res.status(400).json({ success: false, error: 'Service data invalid', details: errors });
  }

  console.log('✅ [APPROVED] Service payload passed');
  console.log('--------------------------------------------------');
  next();
};

export const validatePatientUpdate = (req, res, next) => {
  console.log('--------------------------------------------------');
  console.log('🛡️ [VALIDATOR] Checking Patient Update Payload');
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

  const { name, phone, email, medical_history } = req.body;
  const errors = [];

  // Sanitization
  console.log('🧹 [STEP 1] Sanitizing inputs...');
  if (name) req.body.name = sanitizeString(name);
  if (phone) req.body.phone = sanitizeString(phone);
  if (email) req.body.email = sanitizeString(email);
  if (medical_history) req.body.medical_history = sanitizeString(medical_history);
  console.log('✅ Sanitization complete');

  // Format checks if provided
  if (phone && !validatePhone(phone)) {
    console.log('⚠️ [WARNING] Invalid phone format:', phone);
    errors.push('Invalid phone number format.');
  }

  if (email && !validateEmail(email)) {
    console.log('⚠️ [WARNING] Invalid email format:', email);
    errors.push('Invalid email address format.');
  }

  if (errors.length > 0) {
    console.log('❌ [REJECTED] Patient update failed checks');
    console.log('--------------------------------------------------');
    return res.status(400).json({ success: false, error: 'Patient data invalid', details: errors });
  }

  console.log('✅ [APPROVED] Patient update passed');
  console.log('--------------------------------------------------');
  next();
};
