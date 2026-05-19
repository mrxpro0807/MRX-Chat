const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -verificationCode');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, bio, language, profileImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { username, bio, language, profileImage, updatedAt: new Date() },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users
router.get('/search/:query', auth, async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: req.params.query, $options: 'i' } },
        { email: { $regex: req.params.query, $options: 'i' } }
      ]
    }).limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Block user
router.post('/block/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.userId,
      { $push: { blockedUsers: req.params.userId } }
    );
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unblock user
router.post('/unblock/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { blockedUsers: req.params.userId } }
    );
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { status, lastSeen: new Date() },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;