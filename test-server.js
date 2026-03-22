const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test deploy route
app.post('/api/deploy', (req, res) => {
  console.log('Deploy request received:', req.body);
  res.json({ status: 'success', message: 'Test deploy endpoint working' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});