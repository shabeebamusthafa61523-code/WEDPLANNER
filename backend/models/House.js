const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'House or family name is required'],
      trim: true,
    },
    guestCount: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Guest count must be at least 1'],
    },
    addedBy: {
      type: String,
      trim: true,
      default: 'Family Member',
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add text or collation index if needed, but we will also enforce case-insensitive uniqueness in the API
module.exports = mongoose.model('House', houseSchema);
