import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase.cjs';
import chatService from '../lib/chatService';

const ChatContext = createContext();

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState(null);

  // Listen for user's chats
  useEffect(() => {
    if (!user) {
      console.log('No user, clearing chats'); // Debug log
      setChats([]);
      setChatLoading(false);
      return;
    }

    setChatLoading(true);
    const unsubscribe = chatService.listenForUserChats((chatsData) => {
      console.log('Received chats data:', chatsData); // Debug log
      setChats(chatsData);
      setChatLoading(false);
    });

    return () => {
      console.log('Unsubscribing from chat listener'); // Debug log
      unsubscribe();
    };
  }, [user]);

  // Listen for messages in active chat
  useEffect(() => {
    if (!activeChat?.id) return;

    const unsubscribe = chatService.listenForMessages(activeChat.id, (messagesData) => {
      setMessages(prev => ({
        ...prev,
        [activeChat.id]: messagesData
      }));
    });

    return unsubscribe;
  }, [activeChat?.id]);

  // Initialize online status tracking
  useEffect(() => {
    if (user) {
      chatService.initializeOnlineStatus();
    }

    return () => {
      chatService.cleanup();
    };
  }, [user]);

  // Helper functions
  const createGroup = async (groupData) => {
    try {
      const groupId = await chatService.createGroup(groupData);
      return groupId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const joinGroup = async (inviteCode) => {
    try {
      const groupId = await chatService.joinGroup(inviteCode);
      return groupId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      await chatService.leaveGroup(groupId);
      if (activeChat?.id === groupId) {
        setActiveChat(null);
      }
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const sendMessage = async (chatId, messageData) => {
    try {
      const messageId = await chatService.sendMessage(chatId, messageData);
      return messageId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const sendFileMessage = async (chatId, file) => {
    try {
      const messageId = await chatService.sendFileMessage(chatId, file);
      return messageId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const createPoll = async (chatId, question, options) => {
    try {
      const messageId = await chatService.sendPoll(chatId, question, options);
      return messageId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const sendLocation = async (chatId, locationData) => {
    try {
      const messageId = await chatService.sendLocation(chatId, locationData);
      return messageId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const startDirectMessage = async (otherUserId) => {
    try {
      const chatId = await chatService.startDirectMessage(otherUserId);
      return chatId;
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await chatService.addReaction(messageId, emoji);
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const markMessagesAsRead = async (chatId) => {
    try {
      await chatService.markMessagesAsRead(chatId);
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const voteInPoll = async (messageId, optionIndex) => {
    try {
      await chatService.voteInPoll(messageId, optionIndex);
    } catch (error) {
      setChatError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    chats,
    activeChat,
    messages,
    searchTerm,
    filterType,
    loading: loading || chatLoading,
    error: error?.message || chatError,
    setActiveChat,
    setSearchTerm,
    setFilterType,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage,
    sendFileMessage,
    createPoll,
    sendLocation,
    startDirectMessage,
    addReaction,
    markMessagesAsRead,
    voteInPoll
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Export the hook for use in components
export const useChat = () => {
  return useChatContext();
};