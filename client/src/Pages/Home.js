import React, { useState, useEffect, useRef } from "react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { Rocket, Plus, ScanLine, Menu, Bot, Settings, LogOut, Zap, AudioLines } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuRef = useRef();

  useEffect(() => {
    loadUserData();
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

const loadUserData = async () => {
  try {
    // קודם בודקים אם יש session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching session:", sessionError.message);
      navigate("/login");
      return;
    }

    if (!session) {
      console.warn("No session found → redirecting to Login");
      navigate("/login");
      return;
    }

    // אם יש session, מביאים את המשתמש
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error fetching user:", userError.message);
      navigate("/login");
      return;
    }

    setUser(userData.user);

    // מביא את ההעדפות של המשתמש
    const userPrefs = await UserPreferencesAPI.get(userData.user.id);
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

  const handleCreateSession = () => navigate("/CreateSession");
  const handleJoinSession = () => navigate("/JoinSession");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) return <BrandedLoader text="Loading Verbo.io..." />;

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
          position: "relative",
        }}
      >
        {/* Logo Centered */}
        <img
          src={logo}
          alt="Verbo.io"
          style={{
            width: "140px",
            height: "140px",
            margin: "0 auto 1.5rem auto",
          }}
        />

        {/* Dropdown Menu Button */}
        <div style={{ position: "absolute", top: "2rem", right: "2rem" }} ref={menuRef}>
          <Menu
            size={32}
            style={{ cursor: "pointer" }}
            onClick={() => setMenuOpen(!menuOpen)}
          />
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "40px",
                right: 0,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(12px)",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "0.5rem 0",
                zIndex: 10,
                width: "180px",
              }}
            >
              <div
                onClick={() => {
                  navigate("/Preferences");
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  color: "#333",
                }}
              >
                <Settings size={18} /> Preferences
              </div>
              <div
                onClick={() => {
                  setShowLogoutConfirm(true);
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  color: "#333",
                }}
              >
                <LogOut size={18} /> Log out
              </div>
            </div>
          )}
        </div>

        {/* Welcome Section */}
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: "#3b82f6",
            marginBottom: "0.5rem",
          }}
        >
          Welcome back{" "}
          {preferences?.display_name ? preferences.display_name : ""}
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
              Join a live AI-powered call using a QR code or session link or Meeting ID.
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
          <h3 style={{ textAlign: "center",color: "#3b82f6",fontSize: "1.3rem", marginBottom: "1.5rem" }}>Why Verbo.io?</h3>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            {/* Feature 1 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1 }}>
              <Bot size={28} color="#3b82f6" />
              <strong>Powered by AI</strong>
              <p style={{ fontSize: "0.9rem", color: "#555", textAlign: "center" }}>
                Speak your language. let AI translate conversations for you.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1 }}>
              <Zap size={28} color="#9333ea" />
              <strong>Real-time Translation</strong>
              <p style={{ fontSize: "0.9rem", color: "#555", textAlign: "center" }}>
                Verbo.io makes cross-language communication smooth and intuitive.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1 }}>
              <Rocket size={28} color="#10b981" />
              <strong>Easy to Use</strong>
              <p style={{ fontSize: "0.9rem", color: "#555", textAlign: "center" }}>
                Verbo.io offers a smooth, user friendly experience for effortless communication.
              </p>
            </div>
          </div>
        </div>
                                    {/* Pricing Section */}
              <h3
  style={{
    textAlign: "center",
    color: "#3b82f6",
    fontSize: "1.3rem",
    marginBottom: "1.5rem",
  }}
>
  Pricing
</h3>

<div
  style={{
    margin: "0 auto 2rem auto", // מרכז את ה‑CARD במסך
    width: "50%", // חצי מה‑width של Create Verbo
    padding: "1.5rem",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
    textAlign: "center",
  }}
>
<h4 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem" }}>Free</h4>

<ul style={{ listStyle: "none", padding: 0, fontSize: "0.95rem", color: "#555", textAlign: "center" }}>
  <li style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
    <AudioLines size={18} /> <strong>4 meetings</strong> per month
  </li>
  
  <li style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
    <AudioLines size={18} /> Each meeting has a duration of up to <strong>50 seconds</strong>
  </li>

  <li style={{ fontStyle: "italic", textAlign: "left", marginBottom: "0.3rem" }}>
    The meeting timer starts when the first participant joins.
  </li>
  
  <li style={{ fontStyle: "italic", textAlign: "left", marginBottom: "0.3rem" }}>
    Each meeting is considered fully used even if not all seconds are consumed.
  </li>
      
  <li style={{ fontStyle: "italic", textAlign: "left" }}>
    Monthly limit applies; it may not be possible to use all meetings – first come, first served.
  </li>
</ul>
</div>    
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(12px)",
              padding: "2rem",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "400px",
              textAlign: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ marginBottom: "1rem", fontWeight: "700", color: "#333" }}>
              Are you sure you want to log out?
            </h3>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#e5e7eb",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
