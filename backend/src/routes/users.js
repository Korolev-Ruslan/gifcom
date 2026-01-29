import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { User } from '../models/User.js';
import pool from '../db.js';

const router = express.Router();

router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.getPublicProfile(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/:followingId/subscribe', authMiddleware, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = req.user.id;

    if (parseInt(followingId) === followerId) {
      return res.status(400).json({ error: 'Cannot subscribe to yourself' });
    }

    const subscription = await User.subscribe(followerId, followingId);
    res.status(201).json({ message: 'Subscribed', subscription });
  } catch (error) {
    if (error.message === 'Cannot subscribe to yourself') {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

router.delete('/:followingId/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = req.user.id;

    await User.unsubscribe(followerId, followingId);
    res.json({ message: 'Unsubscribed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.get('/:followingId/is-subscribed', authMiddleware, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = req.user.id;

    const isSubscribed = await User.isSubscribed(followerId, followingId);
    res.json({ isSubscribed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
});

router.get('/:userId/subscriptions', async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptions = await User.getSubscriptions(userId);
    res.json(subscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const followers = await User.getFollowers(userId);
    res.json(followers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

export default router;