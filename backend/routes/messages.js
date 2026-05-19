const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Send message
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, chatId, messageType, content, mediaUrl, duration } = req.body;

    const message = new Message({
      senderId: req.userId,
      receiverId,
      chatId,
      messageType,
      content,
      mediaUrl,
      duration
    });

    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for chat
router.get('/chat/:chatId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('senderId', 'username profileImage')
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as read
router.put('/read/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { read: true, readAt: new Date() },
      { new: true }
    );
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add reaction
router.post('/reaction/:messageId', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $push: { reactions: { userId: req.userId, emoji } } },
      { new: true }
    );
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;