
import React, { useState, useEffect } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { Plus, ScanLine, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BrandedLoader from '../Components/BrandedLoader';
import { supabase } from "../utils/supabaseClient";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user; // זה המשתמש האמיתי המחובר
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await loadUser();
      setUser(userData);
      
      const userPrefs = await UserPreferencesAPI.get(userData.id);
if (userPrefs) {
  setPreferences(userPrefs);
} else {
  navigate("/Preferences");
  return;
}
    } catch (error) {
      console.error("Error loading user data:", error);
      console.error("User not logged in");
      navigate("/login"); // נוביל למסך login
    }
    setIsLoading(false);
  };

  const handleCreateSession = () => {
        navigate("/CreateSession");
  };

  const handleJoinSession = () => {
        navigate("/JoinSession");
  };

  if (isLoading) {
    return <BrandedLoader text="Loading Verbo.io..." />;
  }

  return (
    <div className="min-h-screen p-4 pt-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Real-time Translation Ready</span>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email}
          </h1>
          <p className="text-xl text-gray-600 mb-2">Ready to break language barriers?</p>
          
          {preferences && (
            <div className="inline-flex items-center gap-4 text-sm text-gray-500 bg-white/50 rounded-full px-4 py-2">
              <span>🌍 {preferences.native_language === 'english' ? 'English' : 'עברית'}</span>
              <span>•</span>
              <span>{preferences.gender === 'male' ? '👨' : '👩'} {preferences.gender === 'male' ? 'Male' : 'Female'} voice</span>
            </div>
          )}
        </div>

{/* Main Actions */}
<div className="grid md:grid-cols-2 gap-8 mb-12">
  {/* Create Session Card */}
  <div
    className="glass-morphism border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer group p-8 text-center rounded-3xl"
    onClick={handleCreateSession}
  >
    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
    <Plus className="w-10 h-10 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-3">Create Verbo</h3>
    <p className="text-gray-600 mb-6">
      Create a multilingual conversation powered by AI. Share your session code, link, or QR with others to connect instantly.
    </p>
    <div className="flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
      <Users className="w-4 h-4" />
      Host a conversation
    </div>
  </div>

  {/* Join Session Card */}
  <div
    className="glass-morphism border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer group p-8 text-center rounded-3xl"
    onClick={handleJoinSession}
  >
    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
      <ScanLine className="w-10 h-10 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-3">Join Verbo</h3>
    <p className="text-gray-600 mb-6">
      Join a live AI-powered call using a QR code, session link, or Meeting ID.
    </p>
    <div className="flex items-center justify-center gap-2 text-sm text-purple-600 font-medium">
      <ScanLine className="w-4 h-4" />
      Scan to join
    </div>
  </div>
</div>


        {/* Feature Highlights */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Why Verbo.io?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Lightning Fast</h4>
              <p className="text-sm text-gray-600">Translation in under 0.5 seconds</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Natural Flow</h4>
              <p className="text-sm text-gray-600">Simultaneous speaking like phone calls</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Powered by AI</h4>
              <p className="text-sm text-gray-600">Speak your language. Hear conversations translated to your language in real time.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-center text-gray-500">
          <p className="text-sm">🔒 Secure • 🌍 Real-time • 💬 No recordings saved</p>
        </div>
      </div>
    </div>
  );
}
