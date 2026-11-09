import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import appointmentsRouter from './routes/appointments.js';
import patientsRouter from './routes/patients.js';
import servicesRouter from './routes/services.js';
import inquiriesRouter from './routes/inquiries.js';
import authRouter from './routes/auth.js';
import adminAuthRouter from './routes/adminAuth.ts';
import auditLogsRouter from './routes/auditLogs.ts';
import doctorsRouter from './routes/doctors.ts';
import whatsappRouter from './routes/whatsapp.ts';
import { seedServices } from './src/db/seed.js';
import { initializeWhatsAppClient } from './services/whatsappService.ts';
import { globalErrorHandler, apiNotFoundHandler } from './middleware/errorHandler.ts';

dotenv.config();

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

// Request logging middleware for CMD terminal visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      const statusColor = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';
      console.log(`${statusColor} [HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Middleware for JSON parsing and URL encoding
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory


// Ensure API routes come before static catch-all
// Mount API Routes
app.use('/api', appointmentsRouter);
app.use('/api', patientsRouter);
app.use('/api', servicesRouter);
app.use('/api', inquiriesRouter);
app.use('/api', doctorsRouter);
app.use('/api', whatsappRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', auditLogsRouter);
app.use('/api', auditLogsRouter);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'PureDentist Backend API',
    timestamp: new Date().toISOString()
  });
});

// Dedicated route to intentionally simulate errors for testing global error handling
app.get('/api/test-error', (req, res, next) => {
  const errorType = (req.query.type as string) || 'generic';
  console.log(`🧪 [TEST ERROR TRIGGERED] Simulating unhandled error of type: "${errorType}"`);

  if (errorType === 'database') {
    const dbErr = new Error('FATAL: connection to database host "postgres-internal.puredent.local:5432" refused: password authentication failed for user "dental_admin"');
    dbErr.name = 'PostgresConnectionError';
    return next(dbErr);
  }

  if (errorType === 'badrequest') {
    const clientErr: any = new Error('Invalid appointment date format provided. Expected YYYY-MM-DD.');
    clientErr.statusCode = 400;
    clientErr.name = 'BadRequestError';
    return next(clientErr);
  }

  // Generic 500 uncaught exception simulation
  const unhandledErr = new Error('Unhandled clinic calculation failure: tooth canal impedance calculation overflow at Vector3(12.4, 0.0, -4.2)');
  unhandledErr.name = 'DentalCalculationException';
  return next(unhandledErr);
});

// 404 handler for unknown /api/* endpoints
app.all('/api/*', apiNotFoundHandler);

// Mount Centralized Global Error Handling Middleware
app.use(globalErrorHandler);

// Vite Middleware integration for Full-Stack development
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  // Also catch any errors that might bubble up from Vite SSR or static serving
  app.use(globalErrorHandler);
} else {
  const path = await import('path');
  

// Ensure API routes come before static catch-all  app.use('*', (req, res) => {
    res.sendFile(path.resolve('./dist/index.html'));
  });
}

// Global Process-Level Safety Handlers with Heavy Timestamped Terminal Logging
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const timestamp = new Date().toISOString();
  console.error('\n🚨 ======================================================================');
  console.error('💥 [PROCESS] UNHANDLED PROMISE REJECTION INTERCEPTED');
  console.error(`⏰ Timestamp:       ${timestamp}`);
  console.error('💬 Reason:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error && reason.stack) {
    console.error('📍 Stack Trace:\n', reason.stack);
  }
  console.error('🚨 ======================================================================\n');
});

process.on('uncaughtException', (error: Error) => {
  const timestamp = new Date().toISOString();
  console.error('\n🚨 ======================================================================');
  console.error('💥 [PROCESS] UNCAUGHT EXCEPTION INTERCEPTED');
  console.error(`⏰ Timestamp:       ${timestamp}`);
  console.error(`🏷️  Error Name:      ${error.name}`);
  console.error(`💬 Error Message:   ${error.message}`);
  console.error('📍 Stack Trace:\n', error.stack);
  console.error('🚨 ======================================================================\n');
});

app.listen(PORT, HOST, async () => {
  console.log(`🚀 PureDentist Server running on http://${HOST}:${PORT}`);
  console.log(`🛡️ System Security & Middleware Active`);
  
  // Ensure database is seeded with core services
  await seedServices();

  // Safely initialize WhatsApp Web client session in background
  initializeWhatsAppClient().catch((waErr) => {
    console.log('ℹ️ [WHATSAPP-WEB.JS] Background startup check completed');
  });
});


