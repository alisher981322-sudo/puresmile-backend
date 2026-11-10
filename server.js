const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.get('/api/services', (req, res) => {
  res.json([
    { id: 1, name: 'Comprehensive 3D Diagnostic Consultation', price: '$150' },
    { id: 2, name: 'Cosmetic Porcelain Veneers', price: '$850' },
    { id: 3, name: 'Grade-V Titanium Dental Implants', price: '$1200' },
    { id: 4, name: 'Laser-Accelerated Teeth Whitening', price: '$350' }
  ]);
});
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('PureSmile Backend Active');
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
