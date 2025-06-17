import { 
    doc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    increment,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp
  } from 'firebase/firestore';
  import { db } from '../../src/lib/firebase.cjs';
  
  export const tripService = {

async createTrip(tripData) {
  try {
    // Ensure we're not sending undefined values
    const cleanData = Object.fromEntries(
      Object.entries(tripData).filter(([_, v]) => v !== undefined)
    );

    const tripRef = await addDoc(collection(db, 'trips'), {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update the trip document to include its own tripId field
    await updateDoc(tripRef, { tripId: tripRef.id });
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('lastCreatedTripId', tripRef.id);
    }

    return { 
      success: true, 
      tripId: tripRef.id,
      data: { ...cleanData, tripId: tripRef.id }
    };
  } catch (error) {
    console.error('Error creating trip:', error);
    throw new Error(error.message || 'Failed to create trip');
  }
},
// Helper method to remove undefined fields
removeUndefinedFields(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => this.removeUndefinedFields(item));
  }
  
  // Handle objects
  const cleanObj = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleanObj[key] = typeof obj[key] === 'object' 
        ? this.removeUndefinedFields(obj[key]) 
        : obj[key];
    }
  }
  return cleanObj;
},
  
  /**
   * Upload media files to Firebase Storage and return their download URLs
   * @param {string} tripId - The trip ID to associate with these files
   * @param {Array<File>} files - Array of File objects to upload
   * @returns {Promise<Array<{url: string, type: string, name: string, size: number}>>}
   */
  async uploadTripMedia(tripId, files) {
    if (!tripId || !files || files.length === 0) {
      throw new Error('Missing tripId or files');
    }

    try {
      const uploadPromises = files.map(async (file) => {
        // Create storage path: trips/{tripId}/{timestamp}-{filename}
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const storagePath = `trips/${tripId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload file
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Wait for upload to complete
        await uploadTask;

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        return {
          url: downloadURL,
          type: file.type.startsWith('image') ? 'photo' : 'video',
          name: file.name,
          size: file.size,
          path: storagePath,
          createdAt: serverTimestamp()
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading media:', error);
      throw new Error('Failed to upload media: ' + error.message);
    }
  },

  /**
   * Add media references to a trip document
   * @param {string} tripId - The trip ID
   * @param {Array<Object>} mediaItems - Array of media items to add
   */
  async addTripMedia(tripId, mediaItems) {
    if (!tripId || !mediaItems || mediaItems.length === 0) return;

    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        media: arrayUnion(...mediaItems),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding trip media:', error);
      throw error;
    }
  },

  /**
   * Remove media reference from trip and optionally delete from storage
   * @param {string} tripId - The trip ID
   * @param {Object} mediaItem - The media item to remove
   * @param {boolean} deleteFromStorage - Whether to delete from storage
   */
  async removeTripMedia(tripId, mediaItem, deleteFromStorage = false) {
    if (!tripId || !mediaItem) return;

    try {
      const tripRef = doc(db, 'trips', tripId);
      
      // Remove from Firestore
      await updateDoc(tripRef, {
        media: arrayRemove(mediaItem),
        updatedAt: serverTimestamp()
      });

      // Optionally delete from storage
      if (deleteFromStorage && mediaItem.path) {
        const fileRef = ref(storage, mediaItem.path);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error removing trip media:', error);
      throw error;
    }
  },

    // Get trip by ID
    async getTrip(tripId) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) {
          throw new Error('Trip not found');
        }
        
        const tripData = { id: tripSnap.id, ...tripSnap.data() };
        
        // Get creator info
        const creatorRef = doc(db, 'users', tripData.createdBy);
        const creatorSnap = await getDoc(creatorRef);
        tripData.creator = creatorSnap.exists() ? { id: creatorSnap.id, ...creatorSnap.data() } : null;
        
        // Get co-owners info if any
        if (tripData.coOwners && tripData.coOwners.length > 0) {
          const coOwnersData = await Promise.all(
            tripData.coOwners.map(async (ownerId) => {
              const ownerRef = doc(db, 'users', ownerId);
              const ownerSnap = await getDoc(ownerRef);
              return ownerSnap.exists() ? { id: ownerSnap.id, ...ownerSnap.data() } : null;
            })
          );
          tripData.coOwnersData = coOwnersData.filter(owner => owner);
        }
        
        return tripData;
      } catch (error) {
        console.error('Error fetching trip:', error);
        throw error;
      }
    },
  
    // Toggle like
    async toggleLike(tripId, uid) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) throw new Error('Trip not found');
        
        const tripData = tripSnap.data();
        const likes = tripData.likes || [];
        const isLiked = likes.includes(uid);
        
        await updateDoc(tripRef, {
          likes: isLiked ? arrayRemove(uid) : arrayUnion(uid),
          likesCount: increment(isLiked ? -1 : 1)
        });
        
        return { isLiked: !isLiked };
      } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
      }
    },
  
    // Toggle save
    async toggleSave(tripId, uid) {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error('User not found');
        
        const userData = userSnap.data();
        const savedTrips = userData.savedTrips || [];
        const isSaved = savedTrips.includes(tripId);
        
        await updateDoc(userRef, {
          savedTrips: isSaved ? arrayRemove(tripId) : arrayUnion(tripId)
        });
        
        // Update trip saves count
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
          savesCount: increment(isSaved ? -1 : 1)
        });
        
        return { isSaved: !isSaved };
      } catch (error) {
        console.error('Error toggling save:', error);
        throw error;
      }
    },
  
    // Follow/Unfollow trip
    async toggleFollow(tripId, uid) {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) throw new Error('User not found');
        
        const userData = userSnap.data();
        const followedTrips = userData.followedTrips || [];
        const isFollowing = followedTrips.includes(tripId);
        
        await updateDoc(userRef, {
          followedTrips: isFollowing ? arrayRemove(tripId) : arrayUnion(tripId)
        });
        
        // Update trip followers count
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
          followersCount: increment(isFollowing ? -1 : 1)
        });
        
        return { isFollowing: !isFollowing };
      } catch (error) {
        console.error('Error toggling follow:', error);
        throw error;
      }
    },
  
    // Duplicate trip
    async duplicateTrip(tripId, uid) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) throw new Error('Trip not found');
        
        const originalTrip = tripSnap.data();
        
        const duplicatedTrip = {
          ...originalTrip,
          title: `Copy of ${originalTrip.title}`,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isPrivate: true, // Duplicated trips start as private
          isDraft: true,
          originalTripId: tripId,
          likes: [],
          likesCount: 0,
          savesCount: 0,
          followersCount: 0,
          duplicationsCount: 0,
          viewsCount: 0,
          coOwners: [] // Remove co-owners from duplicate
        };
        
        const newTripRef = await addDoc(collection(db, 'trips'), duplicatedTrip);
        
        // Update original trip duplication count
        await updateDoc(tripRef, {
          duplicationsCount: increment(1)
        });
        
        return { success: true, newTripId: newTripRef.id };
      } catch (error) {
        console.error('Error duplicating trip:', error);
        throw error;
      }
    },
  // Update trip description
  async updateDescription(tripId, questData) { 
    try {
      const tripRef = doc(db, 'trips', tripId);
      // Ensure description is a string and not undefined/null
      const description = typeof questData.description === 'string' ? questData.description : '';
      await updateDoc(tripRef, {
        description
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating description:', error);
      throw error;
    }
  },
  // Add or update trip title
  async updateTitle(tripId, newTitle) {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        title: newTitle,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating title:', error);
      throw error;
    }
  },
    // Increment view count
    async incrementViewCount(tripId) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
          viewsCount: increment(1)
        });
      } catch (error) {
        console.error('Error incrementing view count:', error);
      }
    }
  };