
import React, { useState, useEffect } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { Camera, Mic, Globe, User as UserIcon, ArrowRight, Info, ArrowLeft, ShieldCheck, Settings, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user; // זה המשתמש האמיתי המחובר
}


const BrandedLoader = ({ text }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">{text}</p>
    </div>
  </div>
);

export default function Preferences() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    native_language: "english",
    gender: "male",
    camera_permission: false,
    microphone_permission: false,
    system_language: "english"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);


  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await loadUser();
      if (!userData) {
            navigate("/login");
            return;
          }
      setUser(userData);
      
      const existingPrefs = await UserPreferencesAPI.get(userData.id);
          if (existingPrefs) {
      setPreferences(prev => ({ ...prev, ...existingPrefs }));
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
  setIsLoading(false);
};

  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const requestPermissions = async () => {
    let cameraGranted = false;
    let microphoneGranted = false;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
          cameraGranted = true;
          cameraStream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.log("Camera permission denied");
        }

        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          microphoneGranted = true;
          micStream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.log("Microphone permission denied");
        }
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }

    updatePreference("camera_permission", cameraGranted);
    updatePreference("microphone_permission", microphoneGranted);
  };

  const savePreferences = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
          await UserPreferencesAPI.createOrUpdate(user.id, preferences); 
    setSaveSuccess(true);
      
      // Redirect to the Home screen after saving
    setTimeout(() => {
      navigate("/home");
    }, 1000);
  } catch (error) {
  console.error("Error saving preferences:", error);
  setSaveError("Failed to save preferences. Please try again.");
}
  setIsSaving(false);
};

  if (isLoading) {
    return <BrandedLoader text="Loading your preferences..." />;
  }

  return (
    <div className="min-h-screen p-4 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate("/home")}
                className="bg-white/50 border-white/30 p-2 rounded-full hover:bg-blue-100 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Setup Your Profile
              </h1>
              <p className="text-gray-600">Configure your preferences for the best experience</p>
            </div>
        </div>

        <div className="space-y-6">

{/* Permissions Card */}
<div className="bg-white/50 backdrop-blur-md rounded-xl shadow-xl p-6 space-y-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
      <ShieldCheck className="w-5 h-5 text-white" />
    </div>
    <h2 className="text-xl font-bold">Permissions</h2>
  </div>

  {/* Camera */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Camera className="w-5 h-5 text-gray-600" />
      <div>
        <p className="font-medium">Camera Access</p>
        <p className="text-sm text-gray-500">Required for QR code scanning and video calls</p>
      </div>
    </div>
    <input
      type="checkbox"
      checked={preferences.camera_permission}
      onChange={e => updatePreference("camera_permission", e.target.checked)}
      className="w-10 h-6 rounded-full bg-gray-300 checked:bg-blue-500 transition"
    />
  </div>

  {/* Microphone */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Mic className="w-5 h-5 text-gray-600" />
      <div>
        <p className="font-medium">Microphone Access</p>
        <p className="text-sm text-gray-500">Essential for voice translation</p>
      </div>
    </div>
    <input
      type="checkbox"
      checked={preferences.microphone_permission}
      onChange={e => updatePreference("microphone_permission", e.target.checked)}
      className="w-10 h-6 rounded-full bg-gray-300 checked:bg-blue-500 transition"
    />
  </div>

  {/* Grant Button */}
  <button
    onClick={requestPermissions}
    className="w-full border border-blue-200 py-2 px-4 rounded-lg hover:bg-blue-100 hover:text-blue-700"
  >
    Grant Permissions
  </button>
</div>

{/* Language & Voice Card */}
<div className="bg-white/50 backdrop-blur-md rounded-xl shadow-xl p-6 space-y-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
      <Globe className="w-5 h-5 text-white" />
    </div>
    <h2 className="text-xl font-bold">Language & Voice</h2>
  </div>

  {/* Native Language */}
  <div>
    <label className="block text-sm font-medium mb-2">Native Language</label>
    <select
      value={preferences.native_language}
      onChange={e => updatePreference("native_language", e.target.value)}
      className="w-full border rounded-lg p-2 bg-white"
    >
      <option value="english">🇺🇸 English</option>
      <option value="hebrew">🇮🇱 עברית</option>
    </select>
  </div>

  {/* Voice Gender */}
  <div>
    <label className="block text-sm font-medium mb-2">Voice Gender</label>
    <select
      value={preferences.gender}
      onChange={e => updatePreference("gender", e.target.value)}
      className="w-full border rounded-lg p-2 bg-white"
    >
      <option value="male">👨 Male Voice</option>
      <option value="female">👩 Female Voice</option>
    </select>

    <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2">
      <Info className="h-4 w-4 text-blue-600" />
      <p className="text-blue-700 text-sm">
        The selected gender affects how your voice sounds to the other participant, ensuring your appearance matches your translated voice.
      </p>
    </div>
  </div>
</div>

{/* System Settings Card */}
<div className="bg-white/50 backdrop-blur-md rounded-xl shadow-xl p-6 space-y-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center">
      <Settings className="w-5 h-5 text-white" />
    </div>
    <h2 className="text-xl font-bold">System Settings</h2>
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">System Language</label>
    <select
      value={preferences.system_language}
      onChange={e => updatePreference("system_language", e.target.value)}
      className="w-full border rounded-lg p-2 bg-white"
    >
      <option value="english">🇺🇸 English</option>
      <option value="hebrew">🇮🇱 עברית</option>
    </select>

    <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
      <Info className="h-4 w-4 text-amber-600" />
      <p className="text-amber-700 text-sm">
        Note: This UI setting is for demonstration only. Full app translation is not yet available.
      </p>
    </div>
  </div>
</div>

{/* Save button */}
<div className="space-y-4">
  <button
    onClick={savePreferences}
    disabled={isSaving || !preferences.camera_permission || !preferences.microphone_permission}
    className={`w-full text-white font-semibold py-4 px-6 rounded-2xl text-lg transition 
      ${isSaving || !preferences.camera_permission || !preferences.microphone_permission 
        ? "bg-blue-300 cursor-not-allowed" 
        : "bg-blue-500 hover:bg-blue-700"}`
    }
  >
    {isSaving ? (
      <div className="flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        Saving...
      </div>
    ) : saveSuccess ? (
      <div className="flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5" />
        Preferences Saved!
      </div>
    ) : (
      "Save Preferences"
    )}
  </button>

  {/* Save Error */}
  {saveError && (
    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
      <Info className="h-4 w-4 text-red-600" />
      <p className="text-red-700 text-sm">{saveError}</p>
    </div>
  )}

  {/* Permissions Warning */}
  {(!preferences.camera_permission || !preferences.microphone_permission) && (
    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
      <Info className="h-4 w-4 text-amber-600" />
      <p className="text-amber-700 text-sm">
        Both camera and microphone permissions are required to use Verbo effectively.
      </p>
    </div>
  )}
</div>

        </div>
      </div>
    </div>
  );
}
