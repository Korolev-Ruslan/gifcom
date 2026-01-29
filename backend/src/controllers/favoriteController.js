import { Favorite } from '../models/Favorite.js';

export const addFavorite = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { gifId } = req.params;
    
    const existing = await Favorite.check(req.user.id, gifId);
    if (existing) {
      return res.status(400).json({ error: 'Already in favorites' });
    }

    const favorite = await Favorite.add(req.user.id, gifId);
    res.status(201).json({ message: 'Added to favorites', favorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { gifId } = req.params;
    const favorite = await Favorite.remove(req.user.id, gifId);
    
    if (!favorite) {
      return res.status(404).json({ error: 'Not in favorites' });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

export const getFavorites = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const favorites = await Favorite.getUserFavorites(req.user.id);
    res.json({ favorites });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

export const checkFavorite = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { gifId } = req.params;
    const favorite = await Favorite.check(req.user.id, gifId);
    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check favorite' });
  }
};