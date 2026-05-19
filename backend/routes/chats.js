const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Create or get chat
router.post('/get-or-create', auth, async (req, res) => {
  try {
    const { participantId } = req.body;

    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.userId, participantId] }
    });

    if (!chat) {
      chat = new Chat({
        participants: [req.userId, participantId],
        isGroup: false
      });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all chats
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.userId })
      .populate('participants', 'username profileImage status')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive chat
router.put('/archive/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { 'settings.isArchived': true },
      { new: true }
    );
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mute notifications
router.put('/mute/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { 'settings.muteNotifications': true },
      { new: true }
    );
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create group chat
router.post('/group', auth, async (req, res) => {
  try {
    const { chatName, participants } = req.body;

    const chat = new Chat({
      chatName,
      participants: [req.userId, ...participants],
      isGroup: true
    });

    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;