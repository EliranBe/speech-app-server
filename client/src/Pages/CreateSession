
import React, { useState, useEffect } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { useNavigate } from "react-router-dom";
import QRCode from "../Components/ui/QRCode";
import { supabase } from "../utils/supabaseClient";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user; // זה המשתמש האמיתי המחובר
}

export default function CreateSession() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [session, setSession] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    loadUserAndCreateSession();
  }, []);

  const loadUserAndCreateSession = async () => {
try {
  const userData = await loadUser();
  if (!userData) {
    console.error("No user found");
    navigate("/login"); // מפנים למסך ההתחברות
    return;
  }
  setUser(userData);

const userPrefs = await UserPreferencesAPI.get(userData.id);
if (userPrefs) {
  setPreferences(userPrefs);
} else {
  navigate("/Preferences");
  return;
}
  
  await createNewSession(userData, userPrefs[0] || null);
} catch (error) {
  console.error("Error loading user:", error);
  navigate("/login"); // מפנים למסך ההתחברות במקרה של שגיאה
}
  };

  const generateSessionCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  const generateMeetingId = () => {
    return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
  };

  const createNewSession = async (userData, userPreferencesAPI) => {
    setIsCreating(true);
    try {
      const sessionCode = generateSessionCode();
      const meetingId = generateMeetingId();
      
      // First, create the session to get its unique ID
      // קריאה ל-API של ה-server ליצירת פגישה
const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "http://localhost:3001"}/api/meetings/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    host_user_id: userData.id,
    meeting_password: sessionCode
  })
});

const { meeting: newSession, error: apiError } = await response.json();

if (apiError) {
  console.error("Error creating meeting:", apiError);
  return;
}

setSession({
  ...newSession,
  session_url: newSession.url_meeting,
  qr_data: newSession.qr_data,
  session_code: sessionCode
});
     
    } catch (error) {
      console.error("Error creating session:", error);
      setSession(null);
    }
    setIsCreating(false);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

const startCall = () => {
  if (session) {
    navigate(`/Call?sessionId=${session.meeting_id}&role=creator`);
  }
};

  if (isCreating || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Creating your Verbo session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            variant="outline"
            size="icon"
onClick={() => navigate("/")}
            className="bg-white/50 border-white/30"
          >
            <span className="text-base">⬅️</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verbo Created</h1>
            <p className="text-gray-600">Share these details to start communicating</p>
          </div>
        </div>

{/* QR Code Card */}
<div className="glass-morphism border-0 shadow-2xl mb-6 rounded-3xl p-6">
  {/* Card Header */}
  <div className="text-center pb-4">
    <h3 className="flex items-center justify-center gap-2 text-xl font-semibold">
      <span className="text-blue-600 text-lg">📷</span> {/* מייצג את ה-QR */}
      Scan to Join
    </h3>
  </div>

  {/* Card Content */}
  <div className="text-center">
    <div className="bg-white p-8 rounded-3xl inline-block mb-6 shadow-lg">
      <QRCode
        value={session.qr_data}
        size={200}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
      />
    </div>
  </div>
</div>

            
            <div className="space-y-4">
              {/* Shareable URL */}
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-sm text-gray-600 mb-2">Shareable URL</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-green-700 break-all">
                    {session.session_url}
                  </span>
                  <button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(session.session_url, 'url')}
                    className="text-green-600 hover:bg-green-100 flex-shrink-0"
                  >
                    <span className="text-base text-green-600">✔️</span>
                  </button>
                </div>
                {copiedUrl && (
                  <p className="text-xs text-green-600 mt-1">URL copied to clipboard!</p>
                )}
              </div>

              {/* Meeting ID */}
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-sm text-gray-600 mb-2">Meeting ID</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-blue-600 tracking-widest">
                    {session.meeting_id?.replace(/(\d{5})/g, '$1 ').trim()}
                  </span>
                  <button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(session.meeting_id, 'id')}
                    className="text-blue-600 hover:bg-blue-100"
                  >
                    <span className="text-base text-green-600">✔️</span>
                  </button>
                </div>
                {copiedId && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>
              
              {/* Session Password */}
              <div className="bg-purple-50 rounded-2xl p-4">
                <p className="text-sm text-gray-600 mb-2">Session Password</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-purple-600 tracking-widest">
                    {session.session_code}
                  </span>
                  <button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(session.session_code, 'code')}
                    className="text-purple-600 hover:bg-purple-100"
                  >
                    <span className="text-base text-green-600">✔️</span>
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>
            </div>

{/* Instructions */}
<div className="glass-morphism border-0 shadow-xl mb-6 rounded-3xl p-6">
  <h3 className="font-semibold text-gray-900 mb-4">How Others Can Join</h3>
  <div className="space-y-3">
    <div className="flex gap-3">
      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
      <p className="text-gray-700">Share the URL, QR code, or Meeting ID + Password</p>
    </div>
    <div className="flex gap-3">
      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
      <p className="text-gray-700">They open Verbo and choose "Join Verbo"</p>
    </div>
    <div className="flex gap-3">
      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
      <p className="text-gray-700">They scan QR code, paste URL, or enter Meeting ID + Password</p>
    </div>
    <div className="flex gap-3">
      <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">✓</div>
      <p className="text-gray-700">Start your translated conversation!</p>
    </div>
  </div>
</div>


        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={startCall}
            className="w-full liquid-button text-white font-semibold py-4 rounded-2xl text-lg"
          >
            <span className="text-base">👥</span>
            Start Verbo Call
          </button>
        </div>
      </div>
    </div>
  );
}
