import React, { useState, useEffect } from "react";
import { Globe, Info, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import logo from "../images/logo-verbo.png";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";

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
    display_name: "",
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          <img src={logo} alt="Verbo.io" style={{ width: "140px", height: "140px", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "1.8rem", fontWeight: "600", color: "#3b82f6", marginBottom: "0.5rem" }}>
            Setup Your Profile
          </h1>
          <p style={{ color: "#555", textAlign: "center" }}>Configure your preferences for the best experience</p>
        </div>

        {/* Language & Voice Card */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#3b82f6", marginBottom: "1rem" }}>
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

        {/* Display Name Card */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#3b82f6", marginBottom: "1rem" }}>
            Display Name
          </h2>
          <input
            type="text"
            value={preferences.display_name}
            onChange={(e) => updatePreference("display_name", e.target.value)}
            placeholder="Enter your display name"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={savePreferences}
          disabled={isSaving}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "30px",
            background: isSaving ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.9)",
            color: "white",
            fontWeight: "600",
            cursor: isSaving ? "not-allowed" : "pointer",
            marginBottom: "1rem",
          }}
        >
          {isSaving ? "Saving..." : saveSuccess ? "Preferences Saved!" : "Save Preferences"}
        </button>

        {saveError && (
          <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{saveError}</p>
        )}
      </div>
    </div>
  );
}
