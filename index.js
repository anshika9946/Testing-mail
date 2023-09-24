const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const validator = require('validator');
const nodemailer = require('nodemailer');
const uuid = require('uuid');
require('dotenv').config();


const app = express();
const port = 80;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

// MongoDB setup
const connectToMongoDB = async () => {
    try {
      await mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.opcblnx.mongodb.net/mail?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true });
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
      return res.status(400).send('Email address is already subscribed.');
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
        user: 'agarwal.anshika9946@gmail.com',
        pass: 'sbjl ebbm gfbl pkyw',
      },
    });

    const mailOptions = {
      from: 'agarwal.anshika9946@gmail.com',
      to: email,
      subject: 'Email Verification',
      text: `ThankYou for Subscribing. To verify your email address, click the following link: http://localhost/verify/${verificationToken}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('An error occurred while sending the verification email.');
      } else {
        console.log('Verification email sent: ' + info.response);
        res.send('Please check your email for verification.');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during subscription.');
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
        res.send('Email verified successfully.');
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
          user: 'agarwal.anshika9946@gmail.com',
          pass: 'sbjl ebbm gfbl pkyw',
        },
      });
  
      // Retrieve all verified subscribers from the database
      const subscribers = await Subscriber.find({ isVerified: true });
  
      // Loop through the subscribers and send the newsletter email to each one
      for (const subscriber of subscribers) {
        const { email } = subscriber;
  
        const mailOptions = {
          from: 'agarwal.anshika9946@gmail.com',
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
