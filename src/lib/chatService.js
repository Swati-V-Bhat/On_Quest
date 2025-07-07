import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwvrGmFmVwjmXS8B7WXyoBHBLPv5eGnng",
  authDomain: "onquest-bdc27.firebaseapp.com",
  projectId: "onquest-bdc27",
  storageBucket: "onquest-bdc27.appspot.com",
  messagingSenderId: "903211586009",
  appId: "1:903211586009:web:5917214d0a1d7c081ec9c8",
  measurementId: "G-47YDKS1VHH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize online status tracking
let onlineStatusInitialized = false;

// Helper function to generate invite codes
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Update user's chat list
const updateUserChatList = async (userId, chatId, action) => {
  try {
    const userRef = doc(db, 'users', userId);

    if (action === 'joined') {
      await updateDoc(userRef, {
        chats: arrayUnion(chatId),
        updatedAt: serverTimestamp()
      });
    } else if (action === 'left') {
      await updateDoc(userRef, {
        chats: arrayRemove(chatId),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating user chat list:', error);
  }
};

// Add system message to chat
const addSystemMessage = async (chatId, content) => {
  try {
    const message = {
      chatId: chatId,
      senderId: 'system',
      senderName: 'System',
      senderAvatar: 'ℹ️',
      content: content,
      type: 'system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isRead: false
    };

    await addDoc(collection(db, 'messages'), message);
  } catch (error) {
    console.error('Error adding system message:', error);
  }
};

// Find existing DM between users
const findExistingDM = async (userId1, userId2) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'dm'),
      where('memberCount', '==', 2)
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const chatData = doc.data();
      const memberIds = chatData.members.map(m => m.uid);

      if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
        return { id: doc.id, ...chatData };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding existing DM:', error);
    return null;
  }
};

// Update unread counts for chat members
const updateUnreadCounts = async (chatId, senderId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) return;

    const chatData = chatDoc.data();
    const unreadCount = chatData.unreadCount || {};

    chatData.members.forEach(member => {
      if (member.uid !== senderId) {
        unreadCount[member.uid] = (unreadCount[member.uid] || 0) + 1;
      }
    });

    await updateDoc(chatRef, {
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Error updating unread counts:', error);
  }
};

// Fetch chat members from subcollection
const fetchChatMembers = async (chatId) => {
  try {
    const membersCollection = collection(db, 'chats', chatId, 'members');
    const snapshot = await getDocs(membersCollection);
    const members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate()
    }));
    console.log('Fetched members for chat', chatId, ':', members); // Debug log
    return members;
  } catch (error) {
    console.error('Error fetching chat members:', error);
    throw error;
  }
};

// Chat Service API
const chatService = {
  // Group Management
  async createGroup(groupData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Generate invite code
      const inviteCode = generateInviteCode();

      // Prepare group data
      const group = {
        name: groupData.name,
        description: groupData.description || '',
        destination: groupData.destination || '',
        isPrivate: groupData.isPrivate || false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [{ uid: user.uid, role: 'admin' }],
        inviteCode,
        lastMessage: null,
        lastMessageAt: null,
        lastMessageBy: null,
        memberCount: 1,
        avatar: groupData.avatar || '🗺️',
        unreadCount: {},
        isPinned: false,
        isArchived: false,
        type: 'group'
      };

      // Create group document
      const groupRef = await addDoc(collection(db, 'chats'), group);

      // Add member metadata to subcollection
      await setDoc(doc(db, 'chats', groupRef.id, 'members', user.uid), {
        uid: user.uid,
        role: 'admin',
        joinedAt: serverTimestamp(),
        displayName: user.displayName || 'User'
      });

      // Update user's chat list
      await updateUserChatList(user.uid, groupRef.id, 'joined');

      // Add system message
      await addSystemMessage(groupRef.id, `${user.displayName} created the group`);

      console.log('Group created with ID:', groupRef.id); // Debug log
      return groupRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  async joinGroup(inviteCode) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(collection(db, 'chats'), where('inviteCode', '==', inviteCode));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Invalid invite code');
      }

      const chatDoc = querySnapshot.docs[0];
      const chatData = chatDoc.data();
      const chatRef = doc(db, 'chats', chatDoc.id);

      // Check if user is already a member
      const isAlreadyMember = chatData.members.some(member => member.uid === user.uid);
      if (isAlreadyMember) {
        throw new Error('You are already a member of this group');
      }

      // Add user to members
      await updateDoc(chatRef, {
        members: arrayUnion({ uid: user.uid, role: 'member' }),
        memberCount: increment(1)
      });

      // Add member metadata
      await setDoc(doc(db, 'chats', chatDoc.id, 'members', user.uid), {
        uid: user.uid,
        role: 'member',
        joinedAt: serverTimestamp(),
        displayName: user.displayName || 'User'
      });

      // Update user's chat list
      await updateUserChatList(user.uid, chatDoc.id, 'joined');
      await addSystemMessage(chatDoc.id, `${user.displayName} joined the group`);

      console.log('User joined group:', chatDoc.id); // Debug log
      return chatDoc.id;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  },

  async leaveGroup(groupId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const groupRef = doc(db, 'chats', groupId);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      const updatedMembers = groupData.members.filter(member => member.uid !== user.uid);

      if (updatedMembers.length === 0) {
        await deleteDoc(groupRef);
      } else {
        let newMembers = updatedMembers;
        if (groupData.createdBy === user.uid && updatedMembers.length > 0) {
          newMembers[0].role = 'admin';
          await updateDoc(groupRef, {
            createdBy: newMembers[0].uid
          });
        }

        await updateDoc(groupRef, {
          members: newMembers,
          memberCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      }

      // Remove user from members subcollection
      await deleteDoc(doc(db, 'chats', groupId, 'members', user.uid));

      await updateUserChatList(user.uid, groupId, 'left');
      await addSystemMessage(groupId, `${user.displayName} left the group`);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  },

  // Messaging
  async sendMessage(chatId, messageData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const message = {
        chatId: chatId,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderAvatar: user.photoURL || '👤',
        content: messageData.content || '',
        type: messageData.type || 'text',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isRead: false,
        readBy: [],
        deliveredTo: [],
        attachments: messageData.attachments || [],
        location: messageData.location || null,
        poll: messageData.poll || null,
        reactions: [],
        isAI: messageData.isAI || false,
        aiActions: messageData.aiActions || [],
        replyTo: messageData.replyTo || null,
        threadId: messageData.threadId || null,
        edited: false,
        editedAt: null,
        deleted: false,
        deletedAt: null
      };

      const messageRef = await addDoc(collection(db, 'messages'), message);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageData.content || '',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: user.uid,
        lastMessageType: messageData.type || 'text',
        updatedAt: serverTimestamp()
      });

      await updateUnreadCounts(chatId, user.uid);

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async sendAIMessage(chatId, content, actions = []) {
    try {
      const message = {
        chatId: chatId,
        senderId: 'mr-pebbles',
        senderName: 'Mr. Pebbles',
        senderAvatar: '🤖',
        content: content,
        type: 'ai',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isRead: false,
        readBy: [],
        deliveredTo: [],
        reactions: [],
        isAI: true,
        aiActions: actions,
        replyTo: null,
        threadId: null,
        edited: false,
        editedAt: null,
        deleted: false,
        deletedAt: null
      };

      const messageRef = await addDoc(collection(db, 'messages'), message);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastMessageBy: 'mr-pebbles',
        lastMessageType: 'ai',
        updatedAt: serverTimestamp()
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending AI message:', error);
      throw error;
    }
  },

  listenForMessages(chatId, callback) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      callback(messages);
    });
  },

  listenForUserChats(callback) {
    const user = auth.currentUser;
    if (!user) {
      console.log('No authenticated user, skipping chat listener'); // Debug log
      return () => {};
    }

    // Query the members subcollection across all chats
    const q = query(
      collection(db, 'users', user.uid, 'chats'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (userChatDoc) => {
        const chatId = userChatDoc.id;
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          return {
            id: chatId,
            ...chatDoc.data(),
            lastMessageAt: chatDoc.data().lastMessageAt?.toDate(),
            updatedAt: chatDoc.data().updatedAt?.toDate()
          };
        }
        return null;
      });

      const chats = (await Promise.all(chatPromises)).filter(chat => chat !== null);
      console.log('Fetched user chats:', chats); // Debug log
      callback(chats);
    }, (error) => {
      console.error('Error in listenForUserChats:', error); // Debug log
    });
  },

  async startDirectMessage(otherUserId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const existingDM = await findExistingDM(user.uid, otherUserId);
      if (existingDM) {
        return existingDM.id;
      }

      const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
      if (!otherUserDoc.exists()) {
        throw new Error('User not found');
      }

      const otherUser = otherUserDoc.data();

      const dmDoc = {
        type: 'dm',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [
          {
            uid: user.uid,
            displayName: user.displayName || 'User',
            email: user.email,
            photoURL: user.photoURL,
            role: 'member',
            joinedAt: serverTimestamp(),
            isOnline: true,
            lastSeen: serverTimestamp()
          },
          {
            uid: otherUserId,
            displayName: otherUser.displayName || 'User',
            email: otherUser.email,
            photoURL: otherUser.photoURL,
            role: 'member',
            joinedAt: serverTimestamp(),
            isOnline: false,
            lastSeen: otherUser.lastSeen || null
          }
        ],
        memberCount: 2,
        lastMessage: null,
        lastMessageAt: null,
        lastMessageBy: null,
        unreadCount: {},
        isPinned: false,
        isArchived: false
      };

      const docRef = await addDoc(collection(db, 'chats'), dmDoc);

      // Add to users' chat lists
      await updateUserChatList(user.uid, docRef.id, 'joined');
      await updateUserChatList(otherUserId, docRef.id, 'joined');

      // Add to users/chats subcollection
      await setDoc(doc(db, 'users', user.uid, 'chats', docRef.id), {
        chatId: docRef.id,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'users', otherUserId, 'chats', docRef.id), {
        chatId: docRef.id,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating DM:', error);
      throw error;
    }
  },

  async sendPoll(chatId, question, options) {
    try {
      const poll = {
        question: question,
        options: options.map(option => ({
          text: option,
          votes: [],
          count: 0
        })),
        allowMultiple: false,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        expiresAt: null,
        isActive: true
      };

      return await this.sendMessage(chatId, {
        content: `📊 ${question}`,
        type: 'poll',
        poll: poll
      });
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  },

  async voteInPoll(messageId, optionIndex) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const poll = messageData.poll;

      if (!poll.isActive) {
        throw new Error('Poll is no longer active');
      }

      // Remove previous votes if not allowing multiple
      if (!poll.allowMultiple) {
        poll.options.forEach((option, index) => {
          if (option.votes.includes(user.uid)) {
            option.votes = option.votes.filter(uid => uid !== user.uid);
            option.count--;
          }
        });
      }

      // Add new vote
      if (!poll.options[optionIndex].votes.includes(user.uid)) {
        poll.options[optionIndex].votes.push(user.uid);
        poll.options[optionIndex].count++;
      }

      await updateDoc(messageRef, {
        poll: poll,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error voting in poll:', error);
      throw error;
    }
  },

  async sendLocation(chatId, locationData) {
    try {
      return await this.sendMessage(chatId, {
        content: `📍 ${locationData.name || 'Shared location'}`,
        type: 'location',
        location: {
          name: groupData.name,
          address: locationData.address,
          lat: locationData.lat,
          lng: locationData.lng,
          rating: locationData.rating || null,
          priceRange: locationData.priceRange || null,
          category: locationData.category || null,
          description: locationData.description || null
        }
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      throw error;
    }
  },

  async sendFileMessage(chatId, file) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const fileRef = ref(storage, `chat-files/${chatId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return await this.sendMessage(chatId, {
        content: `📎 ${file.name}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [{
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size
        }]
      });
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  },

  async addReaction(messageId, emoji) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      let reactions = messageData.reactions || [];

      // Find existing reaction
      const existingReactionIndex = reactions.findIndex(
        r => r.emoji === emoji && r.users.includes(user.uid)
      );

      if (existingReactionIndex !== -1) {
        // Remove reaction
        reactions[existingReactionIndex].users = reactions[existingReactionIndex].users.filter(
          uid => uid !== user.uid
        );
        reactions[existingReactionIndex].count--;

        // Remove empty reactions
        if (reactions[existingReactionIndex].count === 0) {
          reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // Add reaction
        const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
        if (reactionIndex !== -1) {
          reactions[reactionIndex].users.push(user.uid);
          reactions[reactionIndex].count++;
        } else {
          reactions.push({
            emoji: emoji,
            users: [user.uid],
            count: 1
          });
        }
      }

      await updateDoc(messageRef, {
        reactions: reactions,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error reacting to message:', error);
      throw error;
    }
  },

  async markMessagesAsRead(chatId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const messagesQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        where('senderId', '!=', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        const messageData = doc.data();
        if (!messageData.readBy.includes(user.uid)) {
          batch.update(doc.ref, {
            readBy: arrayUnion(user.uid),
            updatedAt: serverTimestamp()
          });
        }
      });

      await batch.commit();

      // Reset unread count for user
      await updateDoc(doc(db, 'chats', chatId), {
        [`unreadCount.${user.uid}`]: 0
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  async updateUserOnlineStatus(isOnline) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: isOnline,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update status in all chats
      const userChatsQuery = query(
        collection(db, 'users', user.uid, 'chats')
      );

      const snapshot = await getDocs(userChatsQuery);
      const batch = writeBatch(db);

      for (const userChatDoc of snapshot.docs) {
        const chatId = userChatDoc.id;
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          const updatedMembers = chatData.members.map(member => {
            if (member.uid === user.uid) {
              return {
                ...member,
                isOnline: isOnline,
                lastSeen: new Date()
              };
            }
            return member;
          });

          batch.update(chatRef, { members: updatedMembers });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  },

  initializeOnlineStatus() {
    if (onlineStatusInitialized) return;

    const handleVisibilityChange = () => {
      this.updateUserOnlineStatus(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => this.updateUserOnlineStatus(false));

    // Set initial status
    this.updateUserOnlineStatus(true);
    onlineStatusInitialized = true;
  },

  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  formatChatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
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
  },

  cleanup() {
    if (onlineStatusInitialized) {
      this.updateUserOnlineStatus(false);
      onlineStatusInitialized = false;
    }
  },

  fetchChatMembers
};

export default chatService;