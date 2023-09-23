const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

// Verify email and unsubscribe
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Find the subscriber by the verification token
    const subscriber = await Subscriber.findOne({ verificationToken: token });

    if (!subscriber) {
      return res.status(404).send('Verification token not found.');
    }

    // Mark the subscriber as verified and subscribed
    subscriber.isVerified = true;
    subscriber.save();

    res.send('Email address verified and subscription confirmed.');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during verification.');
  }
});

module.exports = router;
