import { useEffect, useState } from 'react';
import { loadGoogleMapsScript } from '../../src/components/services/googleMapsService';

const useGoogleMaps = (apiKey) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    if (window.google) {
      setLoaded(true);
      return;
    }

    loadGoogleMapsScript(apiKey, () => {
      setLoaded(true);
    });
  }, [apiKey]);

  return loaded;
};

export default useGoogleMaps;