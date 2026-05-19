const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Generate verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000);

// Register with Email
router.post('/register-email',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('username').trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, username } = req.body;

      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Generate verification code
      const verificationCode = generateCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user = new User({
        username,
        email,
        password,
        verificationCode,
        verificationExpiry
      });

      await user.save();

      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: '🔐 MRX-Chat Verification Code',
        html: `<h2>Verify your email</h2><p>Your verification code: <strong>${verificationCode}</strong></p>`
      });

      res.json({ message: 'Verification code sent to email', userId: user._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Register with Phone
router.post('/register-phone',
  [
    body('phone').isMobilePhone(),
    body('password').isLength({ min: 6 }),
    body('username').trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password, username } = req.body;

      // Check if user exists
      let user = await User.findOne({ phone });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Generate verification code
      const verificationCode = generateCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user = new User({
        username,
        phone,
        password,
        verificationCode,
        verificationExpiry
      });

      await user.save();

      // Send SMS via Twilio
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: `Your MRX-Chat verification code: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      res.json({ message: 'Verification code sent to phone', userId: user._id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Verify Code
router.post('/verify-code',
  [
    body('userId').notEmpty(),
    body('code').isLength({ min: 6, max: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, code } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.verificationCode !== code) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      if (user.verificationExpiry < new Date()) {
        return res.status(400).json({ message: 'Verification code expired' });
      }

      user.isVerified = true;
      user.verificationCode = null;
      user.verificationExpiry = null;
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      res.json({
        message: 'Email verified successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Login
router.post('/login',
  [
    body('identifier').notEmpty(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const { identifier, password } = req.body;

      const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;