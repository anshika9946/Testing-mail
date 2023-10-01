const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const validator = require('validator');
const nodemailer = require('nodemailer');
const cors = require('cors');
const uuid = require('uuid');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 80;
app.use(cors({
  origin: 'https://keechu.netlify.app', // Update with your Netlify app's URL
}));
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('views'));
// app.use(express.static(path.join(__dirname, 'build'))); 

// MongoDB setup
const connectToMongoDB = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
  };
  
  connectToMongoDB();

// Subscriber model
const Subscriber = require('./models/Subscriber');

// Serve the email collection form
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Handle form submissions
app.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  // Validate the email address
  if (!validator.isEmail(email)) {
    return res.status(400).send('Invalid email address.');
  }

  try {
    // Check if the email already exists in the database
    const existingSubscriber = await Subscriber.findOne({ email });

    if (existingSubscriber) {
      return res.status(400).sendFile(__dirname + '/views/already-subscribed.html');
    }

    // Generate a unique verification token
    const verificationToken = uuid.v4();

    // Create a new subscriber with verification status as false
    const newSubscriber = new Subscriber({ email, verificationToken, isVerified: false });
    await newSubscriber.save();

    // Send a verification email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
    const verificationEmailTemplate = fs.readFileSync('./views/verification-email.html', 'utf-8');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Email Verification',
      html: verificationEmailTemplate.replace('{{verificationToken}}', verificationToken),
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).sendFile(__dirname + '/views/error.html');
      } else {
        console.log('Verification email sent: ' + info.response);
        res.sendFile(__dirname + '/views/verify.html');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).sendFile(__dirname + '/views/error.html');
  }
});
app.get('/unsubscribe', async (req, res) => {
    const { email } = req.query;
  
    // You can display a confirmation page here
    // This page can have a confirmation button to finalize the unsubscribe
    // When the user confirms, you can update the subscriber's status
  
    // Example confirmation page:
    res.sendFile(__dirname + '/views/unsubscribe.html');
  });
  app.post('/confirm-unsubscribe', async (req, res) => {
    const { email } = req.body;
  
    try {
      // Find the subscriber by email
      const subscriber = await Subscriber.findOne({ email });
  
      if (!subscriber) {
        return res.status(404).send('Subscriber not found.');
      }
  
      // Update the subscriber's status to indicate they are unsubscribed
      subscriber.isSubscribed = false;
      await subscriber.save();
  
      res.send('You have been unsubscribed.');
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred during unsubscribe.');
    }
  });
  
    

//sending mail to all
app.get('/verify/:token', async (req, res) => {
    const token = req.params.token;
    try {
        // Find the subscriber with the given token
        const subscriber = await Subscriber.findOne({ verificationToken: token });
    
        if (!subscriber) {
          return res.status(404).send('Invalid verification token.');
        }
    
        // Update the 'isVerified' field to 'true'
        subscriber.isVerified = true;
        await subscriber.save();
    
        // Provide a response to the user
        res.sendFile(__dirname + '/views/subscription-success.html');
      } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred during email verification.');
      }
    });
    

app.get('/send-newsletter', (req, res) => {
    // Render a form for composing the newsletter
    res.sendFile(__dirname + '/views/compose-newsletter.html');
  });

  app.post('/send-newsletter', async (req, res) => {
    const { subject, newsletterContent } = req.body; // Read the newsletter content
  
    console.log('Received newsletter content:');
  console.log(newsletterContent);

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
  
      // Retrieve all verified subscribers from the database
      const subscribers = await Subscriber.find({ isVerified: true });
  
      // Loop through the subscribers and send the newsletter email to each one
      for (const subscriber of subscribers) {
        const { email } = subscriber;
  
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: subject,
          // Use the HTML content from the textarea as the email body
          html: newsletterContent,
        };
  
        await transporter.sendMail(mailOptions);
      }
  console.log('Newsletter sent successfully.');
      res.send('Newsletter sent to all subscribers.');
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while sending the newsletter.');
    }
  });

  

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
