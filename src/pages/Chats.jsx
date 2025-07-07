import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Search,
  Filter,
  Star,
  Users,
  MapPin,
  ArrowLeft,
  Mic,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Plus,
  X,
  Check,
  CheckCheck,
  Globe,
  Lock,
  Settings,
  UserPlus,
  Volume2,
  VolumeX,
  Phone,
  Video,
  Info,
  Smile,
  Copy,
  Share
} from 'lucide-react';
import { useChat } from '../hooks/useChatContext';
import Navbar from '../components/My-Profile/profile/Navbar';
import { getCurrentUserData } from '@/lib/authService.cjs';
import { getAuth, signOut } from 'firebase/auth';
import { getDoc, doc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase.cjs';
import chatService from '../lib/chatService';

const OnQuestChat = () => {
  const {
    chats,
    activeChat,
    messages,
    setActiveChat,
    sendMessage,
    sendFileMessage,
    createPoll,
    sendLocation,
    createGroup,
    joinGroup,
    leaveGroup,
    startDirectMessage,
    addReaction,
    markMessagesAsRead,
    voteInPoll,
    setSearchTerm,
    setFilterType,
    loading,
    error,
    setChats // Add this to context if not already there
  } = useChat();
  
  const auth = getAuth();
  const [userData, setUserData] = useState(null);
  const [message, setMessage] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilterType, setLocalFilterType] = useState('all');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMembersPopup, setShowMembersPopup] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [localChats, setLocalChats] = useState([]); // Local state for chats
  const [localLoading, setLocalLoading] = useState(true);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    destination: '',
    privacy: 'private',
    avatar: '🗺️'
  });
  const [joinCode, setJoinCode] = useState('');
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getCurrentUserData();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching current user data:', error);
      }
    };
    fetchUserData();
  }, []);

  // Listen to chats in real-time
  useEffect(() => {
    if (!userData?.uid) return;

    console.log('Setting up chat listener for user:', userData.uid);
    setLocalLoading(true);

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('members', 'array-contains', { uid: userData.uid }),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Chats snapshot received:', snapshot.docs.length, 'chats');
      
      const chatList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Chat data:', doc.id, data);
        
        return {
          id: doc.id,
          ...data,
          type: data.type || 'group', // Default to group if type is missing
          memberCount: data.memberCount || data.members?.length || 0,
          // Ensure we have required fields
          name: data.name || 'Unnamed Group',
          lastMessage: data.lastMessage || null,
          lastMessageAt: data.lastMessageAt || data.createdAt,
          unreadCount: data.unreadCount || {}
        };
      });

      console.log('Processed chats:', chatList);
      setLocalChats(chatList);
      setLocalLoading(false);
    }, (error) => {
      console.error('Error listening to chats:', error);
      setLocalLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  // Alternative query if the first one doesn't work
  useEffect(() => {
    if (!userData?.uid || localChats.length > 0) return;

    console.log('Trying alternative chat query...');
    const chatsRef = collection(db, 'chats');
    
    // Try a simpler query first
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      console.log('All chats snapshot received:', snapshot.docs.length, 'total chats');
      
      const userChats = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(chat => {
          // Check if user is in members array
          if (chat.members && Array.isArray(chat.members)) {
            return chat.members.some(member => 
              (typeof member === 'string' && member === userData.uid) ||
              (typeof member === 'object' && member.uid === userData.uid)
            );
          }
          return false;
        });

      console.log('User chats found:', userChats.length);
      console.log('User chats:', userChats);
      
      if (userChats.length > 0) {
        setLocalChats(userChats);
        setLocalLoading(false);
      }
    }, (error) => {
      console.error('Error with alternative query:', error);
      setLocalLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid, localChats.length]);

  // Sync local state with context
  useEffect(() => {
    setSearchTerm(localSearchTerm);
  }, [localSearchTerm, setSearchTerm]);

  useEffect(() => {
    setFilterType(localFilterType);
  }, [localFilterType, setFilterType]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when entering a chat
  useEffect(() => {
    if (activeChat?.id && userData?.uid) {
      markMessagesAsRead(activeChat.id);
    }
  }, [activeChat?.id, userData?.uid, markMessagesAsRead]);

  // Fetch chat members
  useEffect(() => {
    if (activeChat?.id) {
      const loadMembers = async () => {
        try {
          const memberData = await chatService.fetchChatMembers(activeChat.id);
          console.log('Loaded members:', memberData);
          setMembers(memberData.length > 0 ? memberData : activeChat.members || []);
        } catch (error) {
          console.error('Failed to load members:', error);
          setMembers(activeChat.members || []);
        }
      };
      loadMembers();
    } else {
      setMembers([]);
    }
  }, [activeChat?.id, activeChat?.members]);

  const handleSendMessage = async () => {
    if (message.trim() && activeChat?.id) {
      try {
        await sendMessage(activeChat.id, {
          content: message.trim(),
          type: 'text'
        });
        setMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message: ' + error.message);
      }
    }
  };

  const handleSendFile = async (e) => {
    const file = e.target.files[0];
    if (file && activeChat?.id) {
      try {
        await sendFileMessage(activeChat.id, file);
      } catch (error) {
        console.error('Failed to send file:', error);
        alert('Failed to send file: ' + error.message);
      }
    }
  };

  const handleSendLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await sendLocation(activeChat.id, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Current Location',
            address: 'Shared location'
          });
        } catch (error) {
          console.error('Failed to send location:', error);
          alert('Failed to send location: ' + error.message);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please check your browser permissions.');
      }
    );
  };

  const handleCreatePoll = async () => {
    const question = prompt('Enter your poll question:');
    if (question) {
      const optionsInput = prompt('Enter options separated by commas:');
      if (optionsInput) {
        const options = optionsInput.split(',').map(opt => opt.trim()).filter(opt => opt);
        if (options.length > 1) {
          try {
            await createPoll(activeChat.id, question, options);
          } catch (error) {
            console.error('Failed to create poll:', error);
            alert('Failed to create poll: ' + error.message);
          }
        } else {
          alert('Please enter at least 2 options');
        }
      }
    }
  };

  const handleCreateGroup = async () => {
    if (newGroupData.name.trim()) {
      try {
        const groupId = await createGroup({
          name: newGroupData.name,
          description: newGroupData.description,
          destination: newGroupData.destination,
          isPrivate: newGroupData.privacy === 'private',
          avatar: newGroupData.avatar
        });
        setShowNewChatModal(false);
        setNewGroupData({
          name: '',
          description: '',
          destination: '',
          privacy: 'private',
          avatar: '🗺️'
        });

        // The real-time listener will automatically pick up the new group
        // But we can also manually fetch it if needed
        const groupRef = doc(db, 'chats', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const newGroup = { id: groupId, ...groupSnap.data() };
          setActiveChat(newGroup);
        }
      } catch (error) {
        console.error('Failed to create group:', error);
        alert('Failed to create group: ' + error.message);
      }
    } else {
      alert('Group name is required');
    }
  };

  const handleJoinGroup = async () => {
    if (joinCode.trim()) {
      try {
        const groupId = await joinGroup(joinCode.trim());
        setShowJoinGroupModal(false);
        setJoinCode('');

        // The real-time listener will automatically pick up the joined group
        const groupRef = doc(db, 'chats', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const joinedGroup = { id: groupId, ...groupSnap.data() };
          setActiveChat(joinedGroup);
        }
      } catch (error) {
        console.error('Failed to join group:', error);
        alert('Failed to join group: ' + error.message);
      }
    } else {
      alert('Invite code is required');
    }
  };

  const handleLeaveGroup = async () => {
    if (activeChat?.id && activeChat.type === 'group') {
      if (window.confirm('Are you sure you want to leave this group?')) {
        try {
          await leaveGroup(activeChat.id);
          setActiveChat(null);
          setShowGroupInfo(false);
        } catch (error) {
          console.error('Failed to leave group:', error);
          alert('Failed to leave group: ' + error.message);
        }
      }
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
      setShowEmojiPicker(false);
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      alert('Failed to add reaction: ' + error.message);
    }
  };

  const handleVoteInPoll = async (messageId, optionIndex) => {
    try {
      await voteInPoll(messageId, optionIndex);
    } catch (error) {
      console.error('Failed to vote in poll:', error);
      alert('Failed to vote in poll: ' + error.message);
    }
  };

  const handleCopyInviteCode = () => {
    if (activeChat?.inviteCode) {
      navigator.clipboard.writeText(activeChat.inviteCode);
      alert('Invite code copied to clipboard!');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveChat(null);
      setLocalChats([]);
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Failed to sign out: ' + error.message);
    }
  };

  // Use local chats for filtering
  const filteredChats = localChats.filter(chat => {
    console.log('Filtering chat:', chat);
    
    if (localSearchTerm && chat.name && !chat.name.toLowerCase().includes(localSearchTerm.toLowerCase())) {
      return false;
    }

    if (localFilterType !== 'all') {
      if (localFilterType === 'groups' && chat.type !== 'group') return false;
      if (localFilterType === 'dm' && chat.type !== 'dm') return false;
      if (localFilterType === 'active' && chat.tripStatus !== 'active') return false;
      if (localFilterType === 'planning' && chat.tripStatus !== 'planning') return false;
    }

    return true;
  });

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

  const ChatList = () => (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-[#402B09]/90 to-[#F86F0A]/90 backdrop-blur-md border-b border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">OnQuest</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <UserPlus className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowJoinGroupModal(true)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-full placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', icon: '💬' },
              { key: 'groups', label: 'Groups', icon: '👥' },
              { key: 'dm', label: 'DMs', icon: '💬' },
              { key: 'active', label: 'Active', icon: '🔥' },
              { key: 'planning', label: 'Planning', icon: '📅' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setLocalFilterType(filter.key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  localFilterType === filter.key
                    ? 'bg-white text-[#402B09]'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {filter.icon} {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {localLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F86F0A] mx-auto mb-2"></div>
            Loading chats...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {localSearchTerm ? 'No chats found matching your search.' : 'No chats found. Create or join a group to get started!'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`flex items-center p-4 cursor-pointer transition-colors border-b border-white/10 ${
                activeChat?.id === chat.id ? 'bg-[#F86F0A]/20' : 'hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#402B09] to-[#F86F0A] flex items-center justify-center text-white text-xl font-bold">
                  {chat.avatar || (chat.type === 'group' ? '👥' : '👤')}
                </div>
                {chat.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
                {chat.isPinned && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#F86F0A] rounded-full flex items-center justify-center">
                    <Star className="w-2 h-2 text-white fill-current" />
                  </div>
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 truncate">{chat.name || 'Unnamed Chat'}</h3>
                    {chat.isPrivate && <Lock className="w-3 h-3 text-gray-400" />}
                    {chat.type === 'group' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Group</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{formatChatTime(chat.lastMessageAt || chat.createdAt)}</span>
                    {chat.unreadCount?.[userData?.uid] > 0 && (
                      <span className="bg-[#F86F0A] text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                        {chat.unreadCount[userData?.uid]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">
                    {isTyping ? (
                      <span className="text-[#F86F0A]">Typing...</span>
                    ) : (
                      chat.lastMessage || 'No messages yet'
                    )}
                  </p>
                  <div className="flex items-center space-x-1">
                    {chat.tripStatus === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                    {chat.tripStatus === 'planning' && <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>}
                    {chat.tripStatus === 'completed' && <div className="w-2 h-2 bg-gray-400 rounded-full"></div>}
                  </div>
                </div>

                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {chat.destination || 'No destination set'}
                  </span>
                  {chat.type === 'group' && (
                    <span className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {chat.memberCount || 0}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const ChatWindow = ({ chat }) => (
  <div className="h-full flex flex-col">
    <div className="bg-gradient-to-r from-[#402B09]/90 to-[#F86F0A]/90 backdrop-blur-md border-b border-white/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveChat(null)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#402B09] to-[#F86F0A] flex items-center justify-center text-white text-lg font-bold">
              {chat.avatar || (chat.type === 'group' ? '👥' : '👤')}
            </div>
            {chat.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-white">{chat.name || 'Unnamed Chat'}</h2>
            <p className="text-sm text-white/80">
              {chat.type === 'group' ? `${chat.memberCount || 0} members` : 'Direct Message'}
              {isTyping && <span className="ml-2 text-[#F86F0A]">typing...</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <Phone className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <Video className="w-5 h-5 text-white" />
          </button>
          {chat.type === 'group' && (
            <button
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages[chat.id]?.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.senderId === userData?.uid ? 'justify-end' : 'justify-start'}`}
          onClick={() => setSelectedMessageId(msg.id === selectedMessageId ? null : msg.id)}
        >
          <div className={`max-w-xs lg:max-w-md ${msg.senderId === userData?.uid ? 'order-2' : 'order-1'}`}>
            {msg.senderId !== userData?.uid && (
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xl">{msg.senderAvatar || '👤'}</span>
                <span className="text-sm font-medium text-gray-700">{msg.senderName}</span>
              </div>
            )}

            <div className={`p-3 rounded-2xl relative ${
              msg.senderId === userData?.uid
                ? 'bg-gradient-to-r from-[#402B09] to-[#F86F0A] text-white'
                : msg.type === 'ai'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white/80 backdrop-blur-sm border border-white/20 text-gray-900'
            }`}>
              <p>{msg.content}</p>

              {msg.location && (
                <div className="mt-2 p-2 bg-white/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{msg.location.name}</span>
                  </div>
                  <p className="text-sm opacity-90">{msg.location.address}</p>
                </div>
              )}

              {msg.poll && (
                <div className="mt-2 p-2 bg-white/20 rounded-lg">
                  <p className="font-medium mb-2">{msg.poll.question}</p>
                  {msg.poll.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVoteInPoll(msg.id, idx)}
                      className="flex items-center justify-between py-1 w-full text-left"
                    >
                      <span className="text-sm">{option.text}</span>
                      <span className="text-sm bg-white/20 px-2 py-1 rounded">
                        {option.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {msg.attachments?.length > 0 && (
                <div className="mt-2">
                  {msg.attachments.map((file, idx) => (
                    <div key={idx} className="p-2 bg-white/20 rounded-lg">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{formatMessageTime(msg.createdAt)}</span>
                {msg.senderId === userData?.uid && (
                  <span className="flex items-center">
                    {msg.isRead ? (
                      <CheckCheck className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Check className="w-4 h-4 text-gray-400" />
                    )}
                  </span>
                )}
              </div>

              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(msg.reactions).map(([emoji, count]) => (
                    <span key={emoji} className="text-sm bg-white/20 px-2 py-1 rounded">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {selectedMessageId === msg.id && (
              <div className="flex gap-2 mt-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(msg.id, emoji)}
                    className="text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>

    {showGroupInfo && chat.type === 'group' && (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Group Info</h3>
            <button onClick={() => setShowGroupInfo(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Group Name</h4>
              <p>{chat.name}</p>
            </div>
            <div>
              <h4 className="font-medium">Description</h4>
              <p>{chat.description || 'No description'}</p>
            </div>
            <div>
              <h4 className="font-medium">Destination</h4>
              <p>{chat.destination || 'No destination set'}</p>
            </div>
            <div>
              <h4 className="font-medium">Privacy</h4>
              <p>{chat.isPrivate ? 'Private' : 'Public'}</p>
            </div>
            <div>
              <h4 className="font-medium">Invite Code</h4>
              <div className="flex items-center space-x-2">
                <p>{chat.inviteCode}</p>
                <button onClick={handleCopyInviteCode}>
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-medium">Members ({members.length})</h4>
              <button
                onClick={() => setShowMembersPopup(true)}
                className="text-blue-600 hover:underline"
              >
                View all members
              </button>
            </div>
            <button
              onClick={handleLeaveGroup}
              className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Leave Group
            </button>
          </div>
        </div>
      </div>
    )}

    {showMembersPopup && (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Group Members</h3>
            <button onClick={() => setShowMembersPopup(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.uid} className="flex items-center space-x-2">
                <span className="text-xl">{member.avatar || '👤'}</span>
                <span>{member.displayName || 'Unknown'}</span>
                {member.role === 'admin' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    <div className="p-4 bg-black/10 backdrop-blur-md border-t border-white/20">
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 bg-white rounded-lg p-2 shadow-lg">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                if (selectedMessageId) {
                  handleAddReaction(selectedMessageId, emoji);
                } else {
                  setMessage((prev) => prev + emoji);
                }
              }}
              className="text-lg p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30"
        >
          <Smile className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30"
        >
          <ImageIcon className="w-5 h-5 text-white" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSendFile}
          className="hidden"
          accept="image/*,video/*,application/*"
        />
        <button
          onClick={handleSendLocation}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30"
        >
          <MapPin className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleCreatePoll}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 bg-white/20 rounded-full text-white placeholder-white/60 focus:outline-none"
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="p-2 rounded-full bg-[#F86F0A] hover:bg-[#F86F0A]/80 disabled:bg-gray-400"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  </div>
);

// Main Component Render
return (
  <div className="h-screen flex flex-col bg-gray-100">
    <Navbar />
    <div className="flex-1 flex overflow-hidden">
      <div className={`w-full lg:w-1/3 border-r border-white/20 ${activeChat ? 'hidden lg:block' : 'block'}`}>
        <ChatList />
      </div>
      {activeChat && (
        <div className="w-full lg:w-2/3">
          <ChatWindow chat={activeChat} />
        </div>
      )}
    </div>

    {showNewChatModal && (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Create New Group</h3>
            <button onClick={() => setShowNewChatModal(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Group Name"
              value={newGroupData.name}
              onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <textarea
              placeholder="Description"
              value={newGroupData.description}
              onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Destination"
              value={newGroupData.destination}
              onChange={(e) => setNewGroupData({ ...newGroupData, destination: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <select
              value={newGroupData.privacy}
              onChange={(e) => setNewGroupData({ ...newGroupData, privacy: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <input
              type="text"
              placeholder="Group Avatar Emoji"
              value={newGroupData.avatar}
              onChange={(e) => setNewGroupData({ ...newGroupData, avatar: e.target.value })}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleCreateGroup}
              className="w-full py-2 bg-[#F86F0A] text-white rounded-lg hover:bg-[#F86F0A]/80"
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    )}

    {showJoinGroupModal && (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Join Group</h3>
            <button onClick={() => setShowJoinGroupModal(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleJoinGroup}
              className="w-full py-2 bg-[#F86F0A] text-white rounded-lg hover:bg-[#F86F0A]/80"
            >
              Join Group
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

export default OnQuestChat;