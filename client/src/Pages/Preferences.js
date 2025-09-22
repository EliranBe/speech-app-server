import React, { useState, useEffect } from "react";
import { Globe, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import logo from "../images/logo-verbo.png";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";

// Load current logged-in user
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  if (!data.user || !data.user.id) {
    console.error("No user logged in or missing UUID");
    return null;
  }
  console.log("Logged-in user:", data.user);
  return data.user;
}

// Loader component
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
    native_language: "",
    gender: "",
    display_name: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [errorField, setErrorField] = useState("");
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    loadUserData();
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const userData = await loadUser();
      if (!userData) {
        navigate("/login");
        return;
      }
      setUser(userData);

      try {
        console.log("Fetching preferences for user_id:", userData.id);
        const existingPrefs = await UserPreferencesAPI.get(userData.id);
        console.log("Existing preferences:", existingPrefs);
        if (existingPrefs) {
          setPreferences({
            native_language: existingPrefs.native_language || "",
            gender: existingPrefs.gender || "",
            display_name: existingPrefs.display_name || "",
          });
        }
      } catch (prefError) {
        console.error("Error loading preferences:", prefError);
        setSaveError("Failed to load preferences. Check RLS policies.");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setSaveError("Failed to load user data.");
    }
    setIsLoading(false);
  };

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (errorField === key) setErrorField("");
    if (saveSuccess) setSaveSuccess(false); // כפתור חוזר לפעול והודעת ההצלחה מוסרת
  };

  const savePreferences = async () => {
    if (!user) return;

    if (!preferences.native_language) {
      setErrorField("native_language");
      setSaveError("Native Language cannot be empty.");
      return;
    }
    if (!preferences.gender) {
      setErrorField("gender");
      setSaveError("Voice Gender cannot be empty.");
      return;
    }
    if (!preferences.display_name) {
      setErrorField("display_name");
      setSaveError("Display Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setErrorField("");

    try {
      console.log("Saving preferences for user_id:", user.id, preferences);
      await UserPreferencesAPI.createOrUpdate(user.id, preferences);
      setSaveSuccess(true);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setSaveError("Failed to save preferences. Check RLS policies and DB schema.");
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
        className={`preferences-card ${fadeIn ? "fade-in" : ""}`}
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          textAlign: "left",
          transition: "opacity 0.7s",
          opacity: fadeIn ? 1 : 0,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#3b82f6",
            fontWeight: "600",
          }}
        >
          <ArrowLeft size={20} style={{ marginRight: "8px" }} />
          Back
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <img
            src={logo}
            alt="Verbo.io"
            style={{
              width: "140px",
              height: "140px",
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={() => navigate("/home")}
          />
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "0.5rem",
            }}
          >
            <b>Setup Your Profile</b>
          </h1>
          <p style={{ color: "#555", textAlign: "center" }}>
            Configure your preferences for the best experience
          </p>
        </div>

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
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "1rem",
            }}
          >
            <Globe size={18} style={{ marginRight: "8px", display: "inline" }} />
            <b>Language & Voice</b>
          </h2>

          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Native Language
          </label>
          <select
            value={preferences.native_language}
            onChange={(e) => updatePreference("native_language", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "10px",
              border: errorField === "native_language"
                ? "2px solid red"
                : "1px solid rgba(0,0,0,0.2)",
            }}
          >
            <option value="">Select your native language</option>
            <option>Australia (English)</option>
            <option>Belgium (Dutch)</option>
            <option>Brazil (Portuguese)</option>
            <option>Denmark (Danish)</option>
            <option>France (French)</option>
            <option>Germany (German)</option>
            <option>India (English)</option>
            <option>Indonesia (Indonesian)</option>
            <option>Italy (Italian)</option>
            <option>Japan (Japanese)</option>
            <option>Netherlands (Dutch)</option>
            <option>Norway (Norwegian)</option>
            <option>Portugal (Portuguese)</option>
            <option>Russia (Russian)</option>
            <option>Spain (Spanish)</option>
            <option>Sweden (Swedish)</option>
            <option>Turkey (Turkish)</option>
            <option>UK (English)</option>
            <option>USA (English)</option>
            <option>USA (Spanish)</option>
          </select>

          <label
            style={{
              display: "block",
              marginTop: "1rem",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Voice Gender
          </label>
          <select
            value={preferences.gender}
            onChange={(e) => updatePreference("gender", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "10px",
              border: errorField === "gender"
                ? "2px solid red"
                : "1px solid rgba(0,0,0,0.2)",
            }}
          >
            <option value="">Select voice gender</option>
            <option value="male">👨 Male</option>
            <option value="female">👩 Female</option>
          </select>
          <p style={{ fontSize: "0.85rem", color: "#444", marginTop: "0.5rem" }}>
            Voice characteristics are adjusted based on your selected native
            language and gender.
          </p>
        </div>

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
          <h2
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "1rem",
            }}
          >
            <User size={18} style={{ marginRight: "8px", display: "inline" }} />
            <b>Display Name</b>
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
              border: errorField === "display_name"
                ? "2px solid red"
                : "1px solid rgba(0,0,0,0.2)",
            }}
          />
        </div>

        {saveSuccess && (
          <p
            style={{
              color: "green",
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            Preferences Saved!
          </p>
        )}

        <button
          onClick={savePreferences}
          disabled={isSaving || saveSuccess} // <--- כפתור לא לחיץ אם בשמירה או אחרי הצלחה
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "30px",
            background: isSaving || saveSuccess
              ? "rgba(59,130,246,0.3)" // צבע בהיר יותר
              : "rgba(59,130,246,0.9)",
            color: "white",
            fontWeight: "600",
            cursor: isSaving || saveSuccess ? "not-allowed" : "pointer",
            marginBottom: "1rem",
            border: "none",
          }}
        >
          {isSaving ? "Saving..." : saveSuccess ? "Preferences Saved!" : "Save Preferences"}
        </button>

        {saveError && (
          <p
            style={{
              color: "red",
              fontSize: "0.9rem",
              marginBottom: "0.5rem",
            }}
          >
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}
