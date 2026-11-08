import db from '../../db.js';

const ALL_SERVICES = [
  { name: 'Teeth Cleaning & Scaling', description: 'Professional dental cleaning to remove plaque and tartar for healthier gums and a fresher breath.', price: 95.00, duration_minutes: 45 },
  { name: 'Tooth Fillings (Cavity Treatment)', description: 'Careful removal of decay followed by filling the cavity with tooth-colored composite for a seamless look.', price: 120.00, duration_minutes: 60 },
  { name: 'Root Canal Treatment (RCT)', description: 'Advanced treatment to save a severely infected or damaged tooth by removing the pulp and sealing the root.', price: 350.00, duration_minutes: 90 },
  { name: 'Teeth Whitening (Bleaching)', description: 'Professional laser process to effectively remove stains and brighten your smile significantly.', price: 280.00, duration_minutes: 45 },
  { name: 'Gum Treatment (Periodontal Care)', description: 'Specialized care for gum diseases, including bleeding gums, swelling, and infection management.', price: 150.00, duration_minutes: 50 },
  { name: 'Dentures (Artificial Teeth Set)', description: 'Custom-made removable artificial teeth set designed for comfort and natural appearance.', price: 450.00, duration_minutes: 60 },
  { name: 'Invisible Clear Aligners', description: 'Discreet, removable clear trays to straighten teeth without traditional metal braces.', price: 1200.00, duration_minutes: 30 },
  { name: 'Dental Crowns & Bridges', description: 'Protective caps for weakened teeth or fixed solutions to replace missing teeth.', price: 300.00, duration_minutes: 60 },
  { name: 'Wisdom Tooth Extraction', description: 'Safe surgical or routine removal of damaged or impacted wisdom teeth.', price: 200.00, duration_minutes: 45 },
  { name: 'Pediatric Dental Care', description: 'Specialized dental care for children including routine cleanings and preventive fluoride treatments.', price: 80.00, duration_minutes: 30 }
];

export async function seedServices() {
  console.log('🌱 [SEEDER] Checking services catalog sync...');
  try {
    const { rows } = await db.query('SELECT name FROM services');
    const existingNames = new Set((rows || []).map((r: any) => r.name));

    for (const service of ALL_SERVICES) {
      if (!existingNames.has(service.name)) {
        console.log(`➕ [SEEDER] Adding missing service: ${service.name}`);
        await db.query(
          'INSERT INTO services (name, description, price, duration_minutes) VALUES ($1, $2, $3, $4)',
          [service.name, service.description, service.price, service.duration_minutes]
        );
      }
    }
    console.log('✅ [SEEDER] Services catalog is up to date.');
  } catch (err: any) {
    console.error('❌ [SEEDER] Failed to seed services:', err?.message || err);
  }
}
