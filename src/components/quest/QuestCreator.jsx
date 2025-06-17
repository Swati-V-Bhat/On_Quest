import React, { useState, useEffect } from 'react';
import FlowCard from './FlowCard';
import GoogleMap from './GoogleMap';
import QuestSettings from './QuestSettings';
import Header from './QuestHeader';
import { Plus, Save, Settings, Eye, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { tripService } from '@/lib/tripService';
import { getCurrentUserData } from '@/lib/authService.cjs';
import { auth } from '@/lib/firebase.cjs';
import Navbar from '../My-Profile/profile/Navbar';

const user = auth.currentUser || getCurrentUserData();

// Time periods configuration
const TIME_PERIODS = [
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { id: 'evening', label: 'Evening', icon: '🌇' },
  { id: 'night', label: 'Night', icon: '🌙' }
];

const QuestCreator = () => {
  const [questData, setQuestData] = useState({
    title: '',
    description: '',
    coverImage: null,
    tags: [],
    isPrivate: true,
    questWord: 'quest',
    worthNaming: 'worth naming...',
    days: [
      {
        dayNumber: 1,
        date: '',
        timePeriods: {
          morning: { cards: [], expanded: false },
          afternoon: { cards: [], expanded: false },
          evening: { cards: [], expanded: false },
          night: { cards: [], expanded: false }
        }
      }
    ]
  });

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [showSettings, setShowSettings] = useState(false);
  const [completeTitle, setCompleteTitle] = useState('');

  // Get map markers from all flow cards across days and time periods
  const mapMarkers = questData.days.flatMap((day, dayIndex) =>
    TIME_PERIODS.flatMap((period) =>
      day.timePeriods[period.id].cards
        .filter(card => card.location && card.location.lat && card.location.lng)
        .map((card, cardIndex) => ({
          lat: card.location.lat,
          lng: card.location.lng,
          title: card.title || `Day ${day.dayNumber} ${period.label} - Location ${cardIndex + 1}`,
          dayIndex,
          periodId: period.id,
          cardIndex,
          place_id: card.location.place_id || null,
          formatted_address: card.location.formatted_address || ''
        }))
    )
  );

  // Add new day
  const addDay = () => {
    const newDay = {
      dayNumber: questData.days.length + 1,
      date: '',
      timePeriods: {
        morning: { cards: [], expanded: false },
        afternoon: { cards: [], expanded: false },
        evening: { cards: [], expanded: false },
        night: { cards: [], expanded: false }
      }
    };
    setQuestData({
      ...questData,
      days: [...questData.days, newDay]
    });
  };

  // Add flow card to specific day and time period
  const addFlowCard = (dayIndex, periodId) => {
    const newCard = {
      title: '',
      description: '',
      date: '',
      location: null,
      media: [],
      notes: '',
      tags: []
    };

    const updatedDays = [...questData.days];
    updatedDays[dayIndex].timePeriods[periodId].cards.push(newCard);
    // Auto-expand the section when adding a card
    updatedDays[dayIndex].timePeriods[periodId].expanded = true;

    setQuestData({ ...questData, days: updatedDays });
  };

  // Update flow card
  const updateFlowCard = (dayIndex, periodId, cardIndex, cardData) => {
    const updatedDays = [...questData.days];
    updatedDays[dayIndex].timePeriods[periodId].cards[cardIndex] = {
      ...updatedDays[dayIndex].timePeriods[periodId].cards[cardIndex],
      ...cardData,
      location: cardData.location ? {
        lat: cardData.location.lat,
        lng: cardData.location.lng,
        name: cardData.location.name || 
              cardData.location.formatted_address || 
              cardData.location.description || 
              `Location ${cardIndex + 1}`,
        formatted_address: cardData.location.formatted_address || 
                         cardData.location.name || 
                         `Custom location (${cardData.location.lat.toFixed(4)}, ${cardData.location.lng.toFixed(4)})`,
        place_id: cardData.location.place_id || null
      } : null
    };
    
    setQuestData({ ...questData, days: updatedDays });

    if (cardData.location) {
      setMapCenter({ 
        lat: cardData.location.lat, 
        lng: cardData.location.lng 
      });
    }
  };

  // Delete flow card
  const deleteFlowCard = (dayIndex, periodId, cardIndex) => {
    const updatedDays = [...questData.days];
    updatedDays[dayIndex].timePeriods[periodId].cards.splice(cardIndex, 1);
    setQuestData({ ...questData, days: updatedDays });
  };

  // Toggle time period expansion
  const toggleTimePeriod = (dayIndex, periodId) => {
    const updatedDays = [...questData.days];
    updatedDays[dayIndex].timePeriods[periodId].expanded = 
      !updatedDays[dayIndex].timePeriods[periodId].expanded;
    setQuestData({ ...questData, days: updatedDays });
  };

  // Move card up/down within same time period
  const moveCard = (dayIndex, periodId, cardIndex, direction) => {
    const updatedDays = [...questData.days];
    const cards = updatedDays[dayIndex].timePeriods[periodId].cards;
    const newIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;
    
    if (newIndex >= 0 && newIndex < cards.length) {
      [cards[cardIndex], cards[newIndex]] = [cards[newIndex], cards[cardIndex]];
      setQuestData({ ...questData, days: updatedDays });
    }
  };

  // Validation and save functions (keeping original logic)
  const validateQuestBeforeSave = (questData) => {
    const errors = [];
    
    const titleToValidate = completeTitle.trim();
    if (!titleToValidate) {
      errors.push('Quest title is required');
    } else if (titleToValidate.length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    // Check if there's at least one card across all days and periods
    const hasCards = questData.days.some(day =>
      TIME_PERIODS.some(period =>
        day.timePeriods[period.id].cards.length > 0
      )
    );

    if (!hasCards) {
      errors.push('At least one flow card is required');
    } else {
      questData.days.forEach((day, dayIndex) => {
        TIME_PERIODS.forEach(period => {
          day.timePeriods[period.id].cards.forEach((card, cardIndex) => {
            if (!card.title?.trim()) {
              errors.push(`Day ${day.dayNumber} ${period.label} Card ${cardIndex + 1} must have a title`);
            }
          });
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const saveQuest = async () => {
    try {
      const validation = validateQuestBeforeSave(questData);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      // Convert the structured data back to flat flowCards for backend compatibility
      const flatFlowCards = questData.days.flatMap((day, dayIndex) =>
        TIME_PERIODS.flatMap(period =>
          day.timePeriods[period.id].cards.map(card => ({
            ...card,
            dayNumber: day.dayNumber,
            timePeriod: period.id,
            title: card.title?.trim() || '',
            description: card.description?.trim() || '',
            date: card.date || day.date || '',
            location: card.location ? {
              lat: card.location.lat,
              lng: card.location.lng,
              name: card.location.name || card.location.formatted_address || 'Unnamed location',
              formatted_address: card.location.formatted_address || '',
              place_id: card.location.place_id || null
            } : null,
            media: Array.isArray(card.media) ? card.media : [],
            notes: card.notes?.trim() || '',
            tags: Array.isArray(card.tags) ? card.tags : []
          }))
        )
      );

      const cleanQuestData = {
        title: completeTitle,
        description: questData.description?.trim() || '',
        flowCards: flatFlowCards,
        tags: Array.isArray(questData.tags) ? questData.tags : [],
        isPrivate: typeof questData.isPrivate === 'boolean' ? questData.isPrivate : true,
        isDraft: true,
        createdBy: user?.uid || null,
        daysStructure: questData.days // Save the structured format too
      };

      const sanitizedData = JSON.parse(JSON.stringify(cleanQuestData));
      const result = await tripService.createTrip(sanitizedData);
      
      if (!result) {
        throw new Error('No response received from server');
      }

      console.log('Quest saved successfully:', result);
      alert('Quest saved successfully!');
      return result;
    } catch (error) {
      console.error('Error saving quest:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to save quest. Please try again.';
      alert(errorMessage);
      throw error;
    }
  };

  const handleMapClick = (event) => {
    console.log('Map clicked:', event);
  };

  // Description editing states and functions (keeping original)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState(questData.description);
  const [isEditingQuestWord, setIsEditingQuestWord] = useState(false);
  const [isEditingWorthNaming, setIsEditingWorthNaming] = useState(false);

  const handleEditDescription = () => {
    setTempDescription(
      questData.description && typeof questData.description === 'string'
        ? questData.description
        : ''
    );
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    try {
      setQuestData(prev => ({ ...prev, description: tempDescription }));
      setIsEditingDescription(false);

      const tripId = questData.tripId || localStorage.getItem('lastCreatedTripId');
      if (!tripId) {
        alert('Please save the quest first before updating the description.');
        return;
      }
      
      await tripService.updateDescription({
        tripId,
        description: tempDescription
      });
    } catch (error) {
      alert('Failed to update description: ' + (typeof error?.message === 'string' ? error.message : JSON.stringify(error))); 
    }
  };

  useEffect(() => {
    const firstWord = questData.questWord || "quest";
    const remaining = questData.worthNaming || "worth naming...";
    const fullTitle = `${firstWord} ${remaining}`;
    setCompleteTitle(fullTitle);
    document.title = firstWord;
  }, [questData.questWord, questData.worthNaming]);

  useEffect(() => {
    const handleError = (e) => {
      if (e.message.includes('frame_ant.js') && e.message.includes('JSON.parse')) {
        console.warn('Third-party script error caught:', e);
        return true;
      }
      return false;
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header Section */}
      <div className="w-full relative flex flex-row items-center justify-center gap-[0.25rem] text-left text-[2.5rem] text-black font-arsenal pl-4">
        <div className="flex-1 flex flex-col items-start justify-start gap-[0.25rem]">
          <div className="self-stretch relative leading-[150%] flex items-center">
            {isEditingQuestWord ? (
              <input
                type="text"
                value={questData.questWord || "quest"}
                onChange={e =>
                  setQuestData(prev => ({ ...prev, questWord: e.target.value }))
                }
                className="font-bold text-darkorange mx-2 px-1 py-0.5 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                style={{ width: Math.max(questData.questWord?.length || 5, 5) + "ch" }}
                autoFocus
                onBlur={() => setIsEditingQuestWord(false)}
                onKeyDown={e => {
                  if (e.key === "Enter") setIsEditingQuestWord(false);
                }}
              />
            ) : (
              <i
                className="font-bold text-darkorange mx-2 cursor-pointer hover:underline" 
                title="Edit quest word"
                onClick={() => setIsEditingQuestWord(true)} 
              >
                {questData.questWord || "quest"}
              </i>
            )}
            <i>
              &nbsp;
              {isEditingWorthNaming ? (
                <input
                  type="text"
                  value={questData.worthNaming || "worth naming..."}
                  onChange={e =>
                    setQuestData(prev => ({ ...prev, worthNaming: e.target.value }))
                  }
                  className="mx-1 px-1 py-0.5 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  style={{ width: Math.max(questData.worthNaming?.length || 13, 13) + "ch" }}
                  autoFocus
                  onBlur={() => setIsEditingWorthNaming(false)}
                  onKeyDown={e => {
                    if (e.key === "Enter") setIsEditingWorthNaming(false);
                  }}
                />
              ) : (
                <span
                  className="cursor-pointer hover:underline"
                  title="Edit phrase"
                  onClick={() => setIsEditingWorthNaming(true)}
                >
                  {questData.worthNaming || "worth naming..."}
                </span>
              )}
            </i>
          </div>
          <div className="flex flex-row items-center justify-center text-center text-[1rem] text-gray font-roboto">
            <div className="relative leading-[150%] flex items-center gap-2 ml-2">
              {isEditingDescription ? (
                <>
                  <input
                    type="text"
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDescription}
                    className="ml-2 px-2 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="ml-1 px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {questData.description
                      ? questData.description
                      : 'Describe the magic, the mess, and the memories...'} 
                  </span>
                  <button
                    onClick={handleEditDescription}
                    className="ml-2 p-1 rounded hover:bg-gray-200"
                    title="Edit Description"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17h4"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Days and Flow Cards */}
        <div className="w-3/5 p-6 overflow-y-auto">
          <div className="space-y-6">
            {questData.days.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Day Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-800">
                        Day {day.dayNumber}
                      </h2>
                      <input
                        type="date"
                        value={day.date}
                        onChange={(e) => {
                          const updatedDays = [...questData.days];
                          updatedDays[dayIndex].date = e.target.value;
                          setQuestData({ ...questData, days: updatedDays });
                        }}
                        className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Time Periods */}
                <div className="p-4 space-y-4">
                  {TIME_PERIODS.map((period) => {
                    const timePeriodData = day.timePeriods[period.id];
                    const hasCards = timePeriodData.cards.length > 0;
                    
                    return (
                      <div key={period.id} className="border border-gray-200 rounded-lg">
                        {/* Time Period Header */}
                        <div 
                          className="flex items-center justify-between p-3 bg-orange-50 rounded-t-lg cursor-pointer hover:bg-orange-100 transition-colors"
                          onClick={() => hasCards && toggleTimePeriod(dayIndex, period.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{period.icon}</span>
                            <span className="font-semibold text-gray-800">{period.label}</span>
                            <span className="text-sm text-gray-500">
                              ({timePeriodData.cards.length} {timePeriodData.cards.length === 1 ? 'place' : 'places'})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!hasCards ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addFlowCard(dayIndex, period.id);
                                }}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                                Add
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addFlowCard(dayIndex, period.id);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                {timePeriodData.expanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Cards Content */}
                        {hasCards && timePeriodData.expanded && (
                          <div className="p-3 space-y-3 bg-white rounded-b-lg">
                            {timePeriodData.cards.map((card, cardIndex) => (
                              <div key={cardIndex} className="group relative">
                                <div className="flex items-start gap-2">
                                  {/* Reorder Handle */}
                                  <div className="flex flex-col items-center pt-2">
                                    <button
                                      onClick={() => moveCard(dayIndex, period.id, cardIndex, 'up')}
                                      disabled={cardIndex === 0}
                                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <button
                                      onClick={() => moveCard(dayIndex, period.id, cardIndex, 'down')}
                                      disabled={cardIndex === timePeriodData.cards.length - 1}
                                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  {/* Flow Card */}
                                  <div className="flex-1">
                                    <FlowCard
                                      card={card}
                                      index={cardIndex}
                                      onUpdate={(index, cardData) => updateFlowCard(dayIndex, period.id, cardIndex, cardData)}
                                      onDelete={() => deleteFlowCard(dayIndex, period.id, cardIndex)}
                                      canDelete={true}
                                    />
                                  </div>
                                </div>
                                
                                {/* Add Card Button (appears on hover) */}
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => addFlowCard(dayIndex, period.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add New Day Button */}
            <button
              onClick={addDay}
              className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
            >
              <div className="flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400 mr-2" />
                <span className="text-gray-600">Add New Day</span>
              </div>
            </button>
          </div>
        </div>

        {/* Save Quest Button - Bottom Right of Left Panel */}
        <div className="absolute bottom-8 left-0 w-3/5 flex justify-end pr-10 pointer-events-none">
          <button
            onClick={saveQuest}
            className="pointer-events-auto bg-darkorange text-white px-6 py-3 rounded-lg shadow-lg font-semibold text-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
            style={{ zIndex: 10 }}
          >
            <Save className="w-5 h-5" />
            Save Quest
          </button>
        </div>

        {/* Right Panel - Map */}
        <div className="w-2/5 p-6">
          <div className="bg-white rounded-lg shadow-sm h-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Quest Map</h3>
              <p className="text-sm text-gray-500">
                {mapMarkers.length} location{mapMarkers.length !== 1 ? 's' : ''} marked
              </p>
            </div>
            <GoogleMap
              markers={mapMarkers}
              center={mapCenter}
              onMapClick={handleMapClick}
              onMarkerClick={(markerData) => {
                // Handle marker click - could expand the relevant day/period
                console.log('Marker clicked:', markerData);
              }}
              activeCardIndex={activeCardIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestCreator;