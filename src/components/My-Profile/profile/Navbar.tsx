import React, { useState, useEffect } from "react";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "../ui/navigation-menu";
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../../lib/firebase.cjs';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  sendPhoneVerificationCode, 
  verifyPhoneCode,
  signOut,
  getCurrentUserData
} from '../../../lib/authService.cjs';
import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";
import { AvatarSelector } from '../../AvatarSelector';

const Navbar = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("home");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState('initial'); // 'initial', 'phone-verify', 'email-signin', 'email-signup'

  // Auth states
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.photoURL);
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDetails = await getCurrentUserData();
          console.log("User details from Firestore:", userDetails);
          setUserData(userDetails);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to auth user data if Firestore fails
          setUserData({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL
          });
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const getUserPhotoURL = () => {
    // Priority: userData (from Firestore) > user (from Auth) > default
    const photoURL = userData?.photoURL || user?.photoURL;
    console.log("Photo URL being used:", photoURL);
    return photoURL || "https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/f2c04753faeb06e92f8c18ca0b4f344bb630c7e7?placeholderIfAbsent=true";
  };

  useEffect(() => {
    // Set active menu based on URL
    const path = window.location.pathname;
    if (path === "/") setSelectedSection("home");
    else if (path.includes("TripPlanner")) setSelectedSection("Trip Planner");
    else if (path.includes("Events")) setSelectedSection("Events");
    else if (path.includes("About")) setSelectedSection("About Us");
    else if (path.includes("Contact")) setSelectedSection("Contact Us");
  }, [window.location.pathname]);

  const toggleAuthModal = () => {
    setShowAuthModal(!showAuthModal);
    resetForm();
  };

  const resetForm = () => {
    setAuthStep('initial');
    setPhoneNumber('');
    setVerificationCode('');
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  };

  const handlePhoneLogin = async () => {
    try {
      // Validate phone number
      if (!phoneNumber || phoneNumber.length !== 10) {
        setError('Please enter a valid 10-digit phone number.');
        return;
      }

      // Update UI state
      setError('');
      setAuthStep('phone-verify');
      setIsLoading(true);

      // Send verification code
      await sendPhoneVerificationCode(`+91${phoneNumber}`, 'recaptcha-container');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setError('');
      await verifyPhoneCode(verificationCode, displayName || null);
      toggleAuthModal();
      navigate('/Feed');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      setError('');
      await signInWithEmail(email, password);
      toggleAuthModal();
      navigate('/Feed');
    } catch (error) {
      setError(error.message);
    }
  };

  // List of default Google avatar options
  const GOOGLE_AVATAR_OPTIONS = [
    "https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/f2c04753faeb06e92f8c18ca0b4f344bb630c7e7?placeholderIfAbsent=true",
    "https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/7ba09782b451dbfbc5be2cd9243cebe4ac815288?placeholderIfAbsent=true",
    "https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/99410d3970fe67ea532993d1c196093377128b25?placeholderIfAbsent=true"
  ];
  
  const handleEmailSignUp = async (avatar) => {
    try {
      setError('');
      setIsLoading(true);
      
      // Basic validation
      if (!email || !password || !displayName) {
        throw new Error('Please fill all fields');
      }
  
      const finalAvatar = avatar || 
        GOOGLE_AVATAR_OPTIONS[Math.floor(Math.random() * GOOGLE_AVATAR_OPTIONS.length)];
      
      await signUpWithEmail(email, password, displayName, finalAvatar);
      
      // Show success message
      setError('');
      setAuthStep('initial');
      setShowAuthModal(false);
      
      // Optional: Show toast notification
      alert('Sign up successful! Welcome to our community!');
      
    } catch (error) {
      setError(error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      toggleAuthModal();
      navigate('/Feed');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const renderAuthContent = () => {
    switch (authStep) {
      case 'initial':
        return (
          <>
            {/* Phone Number Input */}
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <div className="flex items-center pr-2 border-r border-gray-400">
                <span className="text-gray-500">+91</span>
                <span className="ml-1">▼</span>
              </div>
              <input
                type="text"
                className="ml-2 w-full outline-none text-gray-500"
                placeholder="Enter Mobile Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Continue Button */}
            <button 
              className={`w-full ${phoneNumber ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-lg h-14 font-medium`}
              disabled={!phoneNumber}
              onClick={handlePhoneLogin}
            >
              Continue
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-400"></div>
              <span className="text-gray-500 text-sm">Other login options:</span>
              <div className="flex-1 h-px bg-gray-400"></div>
            </div>

            {/* Google Login */}
            <button 
              className="w-full flex justify-center items-center gap-2 border border-gray-200 rounded-lg h-12 shadow-md"
              onClick={handleGoogleSignIn}
            >
              <img src="google.png" alt="Google" className="w-6 h-6" />
              <span className="font-medium">Log in with Google</span>
            </button>

            {/* Email Login */}
            <button 
              className="w-full flex justify-center items-center gap-2 border border-gray-200 rounded-lg h-12 shadow-md"
              onClick={() => setAuthStep('email-signin')}
            >
              <img src="mail.png" alt="Email" className="w-6 h-6" />
              <span className="font-medium">Log in with Email ID</span>
            </button>
            
            <div id="recaptcha-container"></div>
          </>
        );
        
      case 'phone-verify':
        return (
          <>
            <p className="text-gray-600">We've sent a verification code to +91 {phoneNumber}</p>
            
            {/* Verification Code Input */}
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="text"
                className="w-full outline-none text-gray-700"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
            
            {/* For new users, ask for display name */}
            {!user && (
              <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
                <input
                  type="text"
                  className="w-full outline-none text-gray-700"
                  placeholder="Enter your name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            {/* Verify Button */}
            <button 
              className={`w-full ${verificationCode ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-lg h-14 font-medium`}
              disabled={!verificationCode}
              onClick={handleVerifyCode}
            >
              Verify & Continue
            </button>
            
            <button 
              className="text-blue-500"
              onClick={() => setAuthStep('initial')}
            >
              Back
            </button>
          </>
        );
        
      case 'email-signin':
        return (
          <>
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="email"
                className="w-full outline-none text-gray-700"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="password"
                className="w-full outline-none text-gray-700"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              className={`w-full ${email && password ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-lg h-14 font-medium`}
              disabled={!email || !password}
              onClick={handleEmailSignIn}
            >
              Sign In
            </button>
            
            <p className="text-center">
              Don't have an account?{" "}
              <button 
                className="text-blue-500"
                onClick={() => setAuthStep('email-signup')}
              >
                Sign Up
              </button>
            </p>
            
            <button 
              className="text-blue-500"
              onClick={() => setAuthStep('initial')}
            >
              Back
            </button>
          </>
        );
        
      case 'email-signup':
        return (
          <>
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="text"
                className="w-full outline-none text-gray-700"
                placeholder="Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <AvatarSelector 
              onSelect={(avatar) => setSelectedAvatar(avatar)} 
            />

            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="email"
                className="w-full outline-none text-gray-700"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="flex items-center border border-gray-400 rounded-lg h-14 px-2">
              <input
                type="password"
                className="w-full outline-none text-gray-700"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              className={`w-full ${email && password && displayName ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-lg h-14 font-medium`}
              disabled={!email || !password || !displayName}
              onClick={() => handleEmailSignUp(selectedAvatar)}
            >
              Sign Up
            </button>
            
            <p className="text-center">
              Already have an account?{" "}
              <button 
                className="text-blue-500"
                onClick={() => setAuthStep('email-signin')}
              >
                Sign In
              </button>
            </p>
            
            <button 
              className="text-blue-500"
              onClick={() => setAuthStep('initial')}
            >
              Back
            </button>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-white shadow-sm hover:shadow-xl h-[64px] flex w-full items-center justify-between px-16 py- border-b border-gray-200">
      <div className="flex items-center gap-4">
        <img
          src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/7ba09782b451dbfbc5be2cd9243cebe4ac815288?placeholderIfAbsent=true"
          alt="Logo"
          className="h-[64px] object-contain"
        />
        <div className="flex items-center border border-[#8B8A8F] bg-white rounded-full px-3 py-1.5">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/99410d3970fe67ea532993d1c196093377128b25?placeholderIfAbsent=true"
            alt="Search icon"
            className="w-5 h-5 mr-2"
          />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-transparent border-none outline-none text-[#8B8A8F] w-40"
          />
          <button className="bg-[#EA6100] text-white text-sm px-4 py-1 rounded-full ml-2">
            Search
          </button>
        </div>
      </div>
      
      <NavigationMenu>
        <NavigationMenuList className="flex items-center gap-6">
          {/* My Profile */}
          <NavigationMenuItem className="flex flex-col items-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/06d56ea533aecd9a2b8ddf71ea41700f8c6b6951?placeholderIfAbsent=true"
              alt="Groups icon"
              className="w-5 h-5"
              onClick={() => navigate('/My-Profile')}
            />
            <span className="text-xs text-gray-600 mt-1">My Profile</span>
          </NavigationMenuItem>

          {/* Groups */}
          <NavigationMenuItem className="flex flex-col items-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/06d56ea533aecd9a2b8ddf71ea41700f8c6b6951?placeholderIfAbsent=true"
              alt="Groups icon"
              className="w-5 h-5"
            />
            <span className="text-xs text-gray-600 mt-1">Groups</span>
          </NavigationMenuItem>

          {/* Notifications */}
          <NavigationMenuItem className="flex flex-col items-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/f1c2c538ee76c0ea7bf7020c040724f2ac094442?placeholderIfAbsent=true"
              alt="Notifications icon"
              className="w-5 h-5"
            />
            <span className="text-xs text-gray-600 mt-1">Notifications</span>
          </NavigationMenuItem>
          
          {/* Quests */}
          <NavigationMenuItem className="flex flex-col items-center">
            <Link to="/TripPlanner">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/06d56ea533aecd9a2b8ddf71ea41700f8c6b6951?placeholderIfAbsent=true"
                alt="Trip Planner icon"
                className="w-5 h-5"
              />
              <span className="text-xs text-gray-600 mt-1">Quests</span>
            </Link>
          </NavigationMenuItem>
          
          {/* Events */}
          <NavigationMenuItem className="flex flex-col items-center">
            <Link to="/Events">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/b783a7681e9247dfa6d0b0f79c8d7bb8/60120c5b52eabefbdfcb273cc759ee8e7af48e75?placeholderIfAbsent=true"
                alt="Events icon"
                className="w-5 h-5"
              />
              <span className="text-xs text-gray-600 mt-1">Events</span>
            </Link>
          </NavigationMenuItem>
          
          <div className="border-l border-gray-600 w-0.5 h-10 mx-2"></div>
          
          {/* Auth Section */}
          <NavigationMenuItem>
            {loading ? (
              <div className="h-[48px] w-[48px] bg-gray-200 animate-pulse rounded-full"></div>
            ) : user ? (
              <div className="relative">
                <img
                  src={getUserPhotoURL()}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full cursor-pointer"
                  onClick={() => setIsOpen(!isOpen)}
                />
                {isOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium">{userData?.displayName || user?.displayName || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <button
                        className="mt-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setIsOpen(false);
                          navigate('/My-Profile');
                        }}
                      >
                        My Profile
                      </button>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-4 items-center">
                <button 
                  className="text-blue-500 font-medium"
                  onClick={() => {
                    setAuthStep('email-signin');
                    setShowAuthModal(true);
                  }}
                >
                  Sign In
                </button>
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium"
                  onClick={() => {
                    setAuthStep('email-signup');
                    setShowAuthModal(true);
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      {/* Mobile Menu Button */}
      <button
        className="px-2 md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <RxHamburgerMenu size={30} />
      </button>

      {/* Sign In/Sign Up Modal */}
      {showAuthModal && (
        <>
          {/* Modal Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
            onClick={toggleAuthModal}
          >
            {/* Modal Content */}
            <div 
              className="flex w-full max-w-2xl h-auto bg-white rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Image Section */}
              <div className="hidden md:block relative w-2/5">
                <img 
                  className="w-full h-full object-cover rounded-l-xl" 
                  src="login.png" 
                  alt="Travel" 
                />
                <div className="absolute bottom-8 left-4 text-white text-3xl">
                  <i className="font-bold">Travel</i>
                  <i> with us</i>
                </div>
              </div>

              {/* Right Form Section */}
              <div className="w-full md:w-3/5 p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-black">
                    {authStep === 'email-signup' ? 'Create Account' : 'Log in to OnQuest'}
                  </h2>
                  <button onClick={toggleAuthModal}>
                    <IoClose size={24} />
                  </button>
                </div>
                
                {/* Error message */}
                {error && (
                  <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                {renderAuthContent()}
                
                {/* Terms - show only on initial screen */}
                {authStep === 'initial' && (
                  <p className="text-center text-sm text-gray-500">
                    By proceeding, you agree to our <span className="text-blue-500">T&C</span> and
                    <span className="text-blue-500"> Privacy policy</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Navbar;