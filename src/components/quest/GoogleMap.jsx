import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap as GoogleMapComponent, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

const CustomGoogleMap = ({ markers, center, onMapClick, onMarkerClick, activeCardIndex }) => {
  const mapRef = useRef(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [placeDetails, setPlaceDetails] = useState({});

  const onLoad = (map) => {
    mapRef.current = map;
  };

  const onUnmount = () => {
    mapRef.current = null;
  };

  // Fetch place details when marker is selected
  const fetchPlaceDetails = async (placeId) => {
    if (!placeId || placeDetails[placeId]) return;
    
    try {
      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails({ placeId }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setPlaceDetails(prev => ({
            ...prev,
            [placeId]: {
              name: place.name,
              photo: place.photos?.[0]?.getUrl({ maxWidth: 300, maxHeight: 200 }),
              address: place.formatted_address
            }
          }));
        }
      });
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  // Auto-select marker when activeCardIndex changes
  useEffect(() => {
    if (activeCardIndex !== null && markers[activeCardIndex]) {
      setSelectedMarker(markers[activeCardIndex]);
      if (markers[activeCardIndex].place_id) {
        fetchPlaceDetails(markers[activeCardIndex].place_id);
      }
    }
  }, [activeCardIndex]);

  // Fit bounds when markers change
  useEffect(() => {
    if (mapRef.current && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach(marker => bounds.extend({ lat: marker.lat, lng: marker.lng }));
      mapRef.current.fitBounds(bounds);
    }
  }, [markers]);

  const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem'
  };

  const defaultCenter = {
    lat: 0,
    lng: 0
  };

  return (
    <div className="w-full h-full relative">
      <LoadScript
        googleMapsApiKey="AIzaSyD3ZFwUynLIrpQ0P4Uvmwohv-E15WJHCuo"
        libraries={['places', 'geometry']}
      >
        <GoogleMapComponent
          mapContainerStyle={containerStyle}
          center={center || defaultCenter}
          zoom={10}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={() => setSelectedMarker(null)}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          }}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => {
                onMarkerClick(index);
                setSelectedMarker(marker);
                if (marker.place_id) fetchPlaceDetails(marker.place_id);
              }}
              label={{
                text: (index + 1).toString(),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="12" fill="${selectedMarker === marker ? '#ff0000' : '#f97316'}" stroke="white" stroke-width="2"/>
                    <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
                  </svg>
                `)}`,
                scaledSize: new window.google.maps.Size(32, 32),
                anchor: new window.google.maps.Point(16, 16)
              }}
            >
              {selectedMarker === marker && (
                <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                  <div className="max-w-xs">
                    <h4 className="font-semibold text-gray-800">{marker.title}</h4>
                    {marker.place_id && placeDetails[marker.place_id]?.photo && (
                      <img 
                        src={placeDetails[marker.place_id].photo} 
                        alt={placeDetails[marker.place_id].name}
                        className="w-full h-auto my-2 rounded"
                      />
                    )}
                    <p className="text-sm text-gray-600">
                      {marker.place_id 
                        ? placeDetails[marker.place_id]?.address || marker.formatted_address
                        : marker.formatted_address}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

          {markers.length > 1 && (
            <Polyline
              path={markers.map(marker => ({ lat: marker.lat, lng: marker.lng }))}
              options={{
                geodesic: true,
                strokeColor: '#f97316',
                strokeOpacity: 1.0,
                strokeWeight: 3
              }}
            />
          )}
        </GoogleMapComponent>
      </LoadScript>

      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 text-sm">No locations marked yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomGoogleMap;