require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const House = require('./models/House');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_guest_counter';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// 1. GET /api/houses - Fetch all houses (optional search filter)
app.get('/api/houses', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      query.name = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const houses = await House.find(query).sort({ createdAt: -1 });
    res.json(houses);
  } catch (err) {
    console.error('Error fetching houses:', err);
    res.status(500).json({ error: 'Failed to fetch houses.' });
  }
});

// 2. POST /api/houses - Create a new house
app.post('/api/houses', async (req, res) => {
  try {
    const { name, guestCount, addedBy } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'House or family name is required.' });
    }

    const count = parseInt(guestCount, 10);
    if (isNaN(count) || count < 1) {
      return res.status(400).json({ error: 'Number of guests must be at least 1.' });
    }

    const trimmedName = name.trim();
    const senderName = addedBy && addedBy.trim() ? addedBy.trim() : 'Family Member';

    // Prevent duplicate house names (case-insensitive)
    const existing = await House.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (existing) {
      return res.status(409).json({
        error: `House / Family "${trimmedName}" already exists.`,
      });
    }

    const house = new House({
      name: trimmedName,
      guestCount: count,
      addedBy: senderName,
    });

    await house.save();
    res.status(201).json(house);
  } catch (err) {
    console.error('Error creating house:', err);
    res.status(500).json({ error: 'Failed to create house entry.' });
  }
});

// 3. PUT /api/houses/:id - Update house details
app.put('/api/houses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, guestCount, updatedBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid house ID.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'House or family name is required.' });
    }

    const count = parseInt(guestCount, 10);
    if (isNaN(count) || count < 1) {
      return res.status(400).json({ error: 'Number of guests must be at least 1.' });
    }

    const trimmedName = name.trim();
    const modifierName = updatedBy && updatedBy.trim() ? updatedBy.trim() : undefined;

    // Check duplicate among OTHER houses
    const duplicate = await House.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (duplicate) {
      return res.status(409).json({
        error: `Another house / family named "${trimmedName}" already exists.`,
      });
    }

    const updateData = { name: trimmedName, guestCount: count };
    if (modifierName) {
      updateData.updatedBy = modifierName;
    }

    const updatedHouse = await House.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedHouse) {
      return res.status(404).json({ error: 'House not found.' });
    }

    res.json(updatedHouse);
  } catch (err) {
    console.error('Error updating house:', err);
    res.status(500).json({ error: 'Failed to update house.' });
  }
});

// 4. DELETE /api/houses/:id - Delete a house
app.delete('/api/houses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid house ID.' });
    }

    const deleted = await House.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'House not found.' });
    }

    res.json({ message: 'House deleted successfully.', id });
  } catch (err) {
    console.error('Error deleting house:', err);
    res.status(500).json({ error: 'Failed to delete house.' });
  }
});

// Serve frontend static build in production (if deployed as full-stack monolith)
const distPath = path.join(__dirname, '../frontend/dist');
const indexPath = path.join(distPath, 'index.html');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Root endpoint for API when deployed independently on Render
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Wedding Guest Counter API is running smoothly.',
    endpoints: {
      health: '/api/health',
      houses: '/api/houses',
    },
  });
});

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`Wedding Guest Counter backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });
