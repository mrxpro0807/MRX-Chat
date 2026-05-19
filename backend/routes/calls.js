const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const auth = require('../middleware/auth');

// Initiate call
router.post('/initiate', auth, async (req, res) => {
  try {
    const { receiverId, callType } = req.body;

    const call = new Call({
      callerId: req.userId,
      receiverId,
      callType,
      status: 'initiated',
      startTime: new Date()
    });

    await call.save();
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept call
router.put('/:callId/accept', auth, async (req, res) => {
  try {
    const call = await Call.findByIdAndUpdate(
      req.params.callId,
      { status: 'accepted' },
      { new: true }
    );
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject call
router.put('/:callId/reject', auth, async (req, res) => {
  try {
    const call = await Call.findByIdAndUpdate(
      req.params.callId,
      { status: 'rejected' },
      { new: true }
    );
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End call
router.put('/:callId/end', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.callId);
    const duration = Math.floor((new Date() - call.startTime) / 1000);

    const updatedCall = await Call.findByIdAndUpdate(
      req.params.callId,
      { status: 'ended', endTime: new Date(), duration },
      { new: true }
    );
    res.json(updatedCall);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get call history
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ callerId: req.params.userId }, { receiverId: req.params.userId }]
    }).sort({ createdAt: -1 }).limit(50);
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;