// src/hooks/useQuest.js
import { useState, useCallback } from 'react';
import { tripService } from '../lib/tripService'; 
import { getCurrentUserData } from '../lib/authService.cjs'; // 🔧 NEEDS INTEGRATION

export const useQuest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = getCurrentUserData(); // assuming getCurrentUserData returns user object


const saveQuest = useCallback(async (questData) => {
  if (!user) throw new Error('User not authenticated');

  setLoading(true);
  setError(null);

  try {
    // Clean flowCards data
    const cleanFlowCards = questData.flowCards?.map(card => ({
      title: card.title || '',
      description: card.description || '',
      date: card.date || null,
      location: card.location || null,
      media: card.media || [],
      notes: card.notes || '',
      tags: card.tags || []
    })) || [];

    const tripData = {
      title: questData.title || 'Untitled Quest',
      description: questData.description || '',
      flowCards: cleanFlowCards,
      tags: questData.tags || [],
      isPrivate: questData.isPrivate ?? true,
      isDraft: true,
      createdBy: user.uid,
      // Remove explicit dates - let Firestore handle timestamps
      likes: [],
      likesCount: 0,
      savesCount: 0,
      followersCount: 0,
      duplicationsCount: 0,
      viewsCount: 0,
      coOwners: [],
      tripId: questData.tripId || null
        }; 

    const result = await tripService.createTrip(tripData);
    setLoading(false);
    return result;
  } catch (err) {
    setError(err.message);
    setLoading(false);
    throw err;
  }
}, [user]);

  const updateQuest = useCallback(async (questId, questData) => {
    setLoading(true);
    setError(null);

    try {
      // 🔧 ADD updateTrip METHOD TO YOUR tripService
      const result = await tripService.updateTrip(questId, {
        ...questData,
        updatedAt: new Date()
      });
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    saveQuest,
    updateQuest,
    loading,
    error
  };
};