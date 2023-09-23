const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: String,
  verificationToken: String,
  isVerified: Boolean,
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
