export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const getMarkerIcon = (index) => {
  return {
    url: `https://maps.google.com/mapfiles/ms/icons/red-dot.png`,
    scaledSize: new window.google.maps.Size(30, 30),
    origin: new window.google.maps.Point(0, 0),
    anchor: new window.google.maps.Point(15, 15)
  };
};

export const validateQuestData = (questData) => {
  if (!questData.title.trim()) {
    return { isValid: false, message: 'Quest title is required' };
  }
  
  if (questData.flowCards.some(card => !card.title.trim())) {
    return { isValid: false, message: 'All flow cards must have a title' };
  }
  
  return { isValid: true };
};