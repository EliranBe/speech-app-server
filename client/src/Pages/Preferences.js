import React, { useState, useEffect } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { Camera, Mic, Globe, Info, ArrowLeft, ShieldCheck, Settings, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user;
}

const BrandedLoader = ({ text }) => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', sans-serif",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "4px solid rgba(59,130,246,0.3)",
          borderTop: "4px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px auto",
        }}
      />
      <p style={{ color: "#555" }}>{text}</p>
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
    system_language: "english",
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
        setPreferences((prev) => ({ ...prev, ...existingPrefs }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    setIsLoading(false);
  };

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
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
          cameraStream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.log("Camera permission denied");
        }

        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          microphoneGranted = true;
          micStream.getTracks().forEach((track) => track.stop());
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
    <div
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          textAlign: "left",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "rgba(255,255,255,0.3)",
              border: "none",
              padding: "0.5rem",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "600", color: "#333" }}>Setup Your Profile</h1>
            <p style={{ color: "#666" }}>Configure your preferences for the best experience</p>
          </div>
        </div>

        {/* Permissions */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem", color: "#333" }}>
            <ShieldCheck size={18} style={{ marginRight: "8px", display: "inline" }} />
            Permissions
          </h2>

          {/* Camera */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Camera size={18} />
              <div>
                <p style={{ fontWeight: "500" }}>Camera Access</p>
                <p style={{ fontSize: "0.85rem", color: "#555" }}>Required for QR scanning and video calls</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.camera_permission}
              onChange={(e) => updatePreference("camera_permission", e.target.checked)}
            />
          </div>

          {/* Microphone */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Mic size={18} />
              <div>
                <p style={{ fontWeight: "500" }}>Microphone Access</p>
                <p style={{ fontSize: "0.85rem", color: "#555" }}>Essential for voice translation</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.microphone_permission}
              onChange={(e) => updatePreference("microphone_permission", e.target.checked)}
            />
          </div>

          <button
            onClick={requestPermissions}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              border: "none",
              fontWeight: "500",
            }}
          >
            Grant Permissions
          </button>
        </div>

        {/* Language */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem", color: "#333" }}>
            <Globe size={18} style={{ marginRight: "8px", display: "inline" }} />
            Language & Voice
          </h2>

          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Native Language</label>
          <select
            value={preferences.native_language}
            onChange={(e) => updatePreference("native_language", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "10px" }}
          >
            <option value="english">🇺🇸 English</option>
            <option value="hebrew">🇮🇱 עברית</option>
          </select>

          <label style={{ display: "block", marginTop: "1rem", marginBottom: "0.5rem", fontWeight: "500" }}>
            Voice Gender
          </label>
          <select
            value={preferences.gender}
            onChange={(e) => updatePreference("gender", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "10px" }}
          >
            <option value="male">👨 Male</option>
            <option value="female">👩 Female</option>
          </select>
        </div>

        {/* System */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "1rem", color: "#333" }}>
            <Settings size={18} style={{ marginRight: "8px", display: "inline" }} />
            System Settings
          </h2>

          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>System Language</label>
          <select
            value={preferences.system_language}
            onChange={(e) => updatePreference("system_language", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "10px" }}
          >
            <option value="english">🇺🇸 English</option>
            <option value="hebrew">🇮🇱 עברית</option>
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={savePreferences}
          disabled={isSaving || !preferences.camera_permission || !preferences.microphone_permission}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "30px",
            background:
              isSaving || !preferences.camera_permission || !preferences.microphone_permission
                ? "rgba(59,130,246,0.3)"
                : "rgba(59,130,246,0.9)",
            color: "white",
            fontWeight: "600",
            cursor:
              isSaving || !preferences.camera_permission || !preferences.microphone_permission
                ? "not-allowed"
                : "pointer",
            marginBottom: "1rem",
          }}
        >
          {isSaving ? "Saving..." : saveSuccess ? "Preferences Saved!" : "Save Preferences"}
        </button>

        {saveError && (
          <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{saveError}</p>
        )}

        {(!preferences.camera_permission || !preferences.microphone_permission) && (
          <p style={{ color: "orange", fontSize: "0.9rem" }}>
            Both camera and microphone permissions are required.
          </p>
        )}
      </div>
    </div>
  );
}
