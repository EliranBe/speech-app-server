import React, { useState, useEffect } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { Plus, ScanLine, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BrandedLoader from "../Components/BrandedLoader";
import { supabase } from "../utils/supabaseClient";
import logo from "../images/logo-verbo.png";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user;
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    loadUserData();
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await loadUser();
      if (!userData) {
        navigate("/login");
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
    } catch (error) {
      console.error("Error loading user data:", error);
      navigate("/login");
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
        className={`home-card ${fadeIn ? "fade-in" : ""}`}
        style={{
          width: "100%",
          maxWidth: "1000px",
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          textAlign: "center",
          transition: "opacity 0.7s",
          opacity: fadeIn ? 1 : 0,
        }}
      >
        {/* Logo */}
        <img
          src={logo}
          alt="Verbo.io"
          style={{
            width: "120px",
            height: "120px",
            marginBottom: "1rem",
            cursor: "pointer",
          }}
          onClick={() => navigate("/home")}
        />

        {/* Welcome Section */}
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: "#3b82f6",
            marginBottom: "0.5rem",
          }}
        >
          Welcome back,{" "}
          {user?.user_metadata?.full_name?.split(" ")[0] || user?.email}
        </h1>
        <p style={{ color: "#555", marginBottom: "1rem" }}>
          Ready to break language barriers?
        </p>

        {preferences && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "0.5rem 1rem",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.3)",
              fontSize: "0.9rem",
              color: "#444",
              marginBottom: "2rem",
            }}
          >
            🌍 {preferences.native_language}
            <span>•</span>
            {preferences.gender === "male" ? "👨 Male voice" : "👩 Female voice"}
          </div>
        )}

        {/* Main Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          {/* Create Session Card */}
          <div
            onClick={handleCreateSession}
            style={{
              padding: "2rem",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                borderRadius: "16px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <Plus size={32} color="white" />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Create Verbo
            </h3>
            <p style={{ color: "#555", fontSize: "0.95rem" }}>
              Create a multilingual conversation powered by AI.
            </p>
          </div>

          {/* Join Session Card */}
          <div
            onClick={handleJoinSession}
            style={{
              padding: "2rem",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, #9333ea, #ec4899)",
                borderRadius: "16px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <ScanLine size={32} color="white" />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Join Verbo
            </h3>
            <p style={{ color: "#555", fontSize: "0.95rem" }}>
              Join a live AI-powered call using a QR code or session link.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div
          style={{
            padding: "2rem",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "1rem",
            }}
          >
            Why Verbo.io?
          </h3>
          <p style={{ color: "#555", marginBottom: "1.5rem" }}>
            Translation in under 0.5 seconds. Natural flow. Powered by AI.
          </p>
        </div>

        {/* Footer Info */}
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          🔒 Secure • 🌍 Real-time • 💬 No recordings saved
        </p>
      </div>
    </div>
  );
}
