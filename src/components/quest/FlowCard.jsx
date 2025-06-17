import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, Settings, X, Image, Video, Loader2 } from 'lucide-react';
import PlaceSearch from './PlaceSearch';
import { tripService } from '../../lib/tripService';

const FlowCard = ({ card, index, onUpdate, onDelete, canDelete, tripId }) => {
  const [isEditing, setIsEditing] = useState(!card.title && !card.description);
  const [formData, setFormData] = useState({
    title: card.title || '',
    description: card.description || '',
    date: card.date || '',
    location: card.location || null,
    media: card.media || [],
    notes: card.notes || '',
    tags: card.tags || []
  });
  
  const fileInputRef = useRef(null);
  const [mediaType, setMediaType] = useState('photo');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSave = async () => {
    try {
      await onUpdate(index, formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving card:', error);
      // Handle error (show toast, etc.)
    }
  };

  const handleLocationSelect = (place) => {
    const location = {
      name: place.description,
      lat: place.lat,
      lng: place.lng,
      formatted_address: place.formatted_address,
      place_id: place.place_id
    };
    setFormData({ ...formData, location });
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !tripId) return;

    setUploading(true);
    
    try {
      // Upload files to Firebase Storage
      const uploadedMedia = await tripService.uploadTripMedia(tripId, files);
      
      // Add media references to the trip document
      await tripService.addTripMedia(tripId, uploadedMedia);
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, ...uploadedMedia]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      // Handle error (show toast, etc.)
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (indexToRemove) => {
    const mediaToRemove = formData.media[indexToRemove];
    
    try {
      // Remove from Firebase Storage and Firestore
      await tripService.removeTripMedia(tripId, mediaToRemove, true);
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        media: prev.media.filter((_, index) => index !== indexToRemove)
      }));
    } catch (error) {
      console.error('Error removing media:', error);
      // Handle error (show toast, etc.)
    }
  };

  const triggerFileInput = (type) => {
    setMediaType(type);
    fileInputRef.current.click();
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      formData.media.forEach(media => {
        if (media.preview) URL.revokeObjectURL(media.preview);
      });
    };
  }, [formData.media]);

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {card.title ? 'Edit Flow Card' : 'New place'}
          </h3>
          {canDelete && (
            <button
              onClick={() => onDelete(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Exploring Ubud"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <PlaceSearch
              onPlaceSelect={handleLocationSelect}
              placeholder="Search for a location..."
            />
            {formData.location && (
              <div className="mt-2 p-2 bg-gray-50 rounded flex items-center">
                <MapPin className="w-4 h-4 text-orange-500 mr-2" />
                <span className="text-sm text-gray-700">{formData.location.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your experience..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media
            </label>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaUpload}
              accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
              multiple
              className="hidden"
            />
            
            <div className="flex space-x-2 mb-3">
              <button 
                type="button"
                onClick={() => triggerFileInput('photo')}
                disabled={uploading}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Image className="w-4 h-4 mr-2" />
                Photos
              </button>
              <button 
                type="button"
                onClick={() => triggerFileInput('video')}
                disabled={uploading}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <Video className="w-4 h-4 mr-2" />
                Videos
              </button>
            </div>
            
            {uploading && (
              <div className="mb-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading media...</span>
                </div>
              </div>
            )}
            
            {formData.media.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.media.map((media, index) => (
                  <div key={index} className="relative group aspect-square">
                    {media.type === 'photo' ? (
                      <img 
                        src={media.url} 
                        alt="Media preview" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <video 
                        src={media.url}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes, tips, or reminders for fellow travellers..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim() || uploading}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Saving...' : 'Save Card'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{card.title}</h3>
          {card.date && (
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(card.date).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-orange-500"
          >
            <Settings className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {card.location && (
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1 text-orange-500" />
          {card.location.name || card.location.formatted_address}
        </div>
      )}

      {card.description && (
        <p className="text-gray-700 mb-3">{card.description}</p>
      )}

      {card.media && card.media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {card.media.slice(0, 4).map((media, idx) => (
            <div key={idx} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {media.type === 'photo' ? (
                <img 
                  src={media.url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <video 
                  src={media.url}
                  className="w-full h-full object-cover"
                  controls
                />
              )}
              {card.media.length > 4 && idx === 3 && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">
                  +{card.media.length - 4} more
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {card.notes && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
          <p className="text-gray-700">{card.notes}</p>
        </div>
      )}
    </div>
  );
};

export default FlowCard;