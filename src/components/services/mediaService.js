import { storage } from '../utils/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadMedia = async (file, path = 'media') => {
  try {
    const storageRef = ref(storage, `${path}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
};

export const uploadMultipleMedia = async (files, path = 'media') => {
  try {
    const uploadPromises = files.map(file => uploadMedia(file, path));
    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple media:', error);
    throw error;
  }
};