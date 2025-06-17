import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';

const PlaceSearch = ({ onPlaceSelect, placeholder = "Search for places..." }) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsScriptLoaded(true);
      return;
    }

    // If not, set up a listener for when it loads
    const checkScriptLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsScriptLoaded(true);
      }
    };

    // Check periodically
    const interval = setInterval(checkScriptLoaded, 200);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isScriptLoaded) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
    }
  }, [isScriptLoaded]);

  const searchPlaces = (input) => {
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    const request = {
      input,
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'IN' }
    };

    autocompleteService.current.getPlacePredictions(request, (results, status) => {
      setIsLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  };

  const handlePlaceSelect = (prediction) => {
    if (!placesService.current) return;

    const request = { placeId: prediction.place_id };

    placesService.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const location = {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          types: place.types,
          photos: place.photos ? place.photos.slice(0, 3).map(photo => ({
            url: photo.getUrl({ maxWidth: 400, maxHeight: 300 })
          })) : []
        };

        setQuery(place.name);
        setPredictions([]);
        onPlaceSelect(location);
      }
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchPlaces(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          disabled={!isScriptLoaded}
        />
      </div>
      
      {!isScriptLoaded && (
        <div className="text-xs text-gray-500 mt-1">Loading maps service...</div>
      )}

      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handlePlaceSelect(prediction)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start border-b border-gray-100 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {prediction.structured_formatting.main_text}
                </div>
                <div className="text-xs text-gray-500">
                  {prediction.structured_formatting.secondary_text}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 p-4 text-center">
          <div className="text-sm text-gray-500">Searching...</div>
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;