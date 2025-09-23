import React, { useState, useEffect } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
import { UserPreferencesAPI } from "../Entities/UserPreferencesAPI";
import { useNavigate, useLocation } from "react-router-dom";
import QRCode from "../Components/ui/QRCode";
import { supabase } from "../utils/supabaseClient";
import logo from "../images/logo-verbo.png";

// Loader ממותג (כמו ב-Preferences)
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

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user;
}

export default function CreateSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [session, setSession] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    loadUserAndCreateSession();
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const loadUserAndCreateSession = async () => {
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
        navigate("/preferences");
        return;
      }

      await createNewSession(userData);
    } catch (error) {
      console.error("Error loading user:", error);
      navigate("/login");
    }
  };

  const createNewSession = async (userData) => {
    setIsCreating(true);
    try {
      const response = await fetch(
        `https://speech-app-server.onrender.com/api/meetings/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host_user_id: userData.id,
            meeting_password: sessionCode,
          }),
        }
      );

      if (!response.ok) {
        console.error("Error creating meeting: ", response.statusText);
        setSession(null);
        setIsCreating(false);
        return;
      }

      const { meeting: newSession } = await response.json();

      setSession({
        ...newSession,
        session_url: newSession.url_meeting,
        qr_data: newSession.qr_data,
        session_code: newSession.meeting_password, // שימוש במידע מהשרת
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
      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === "url") {
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
    return <BrandedLoader text="Creating your Verbo session..." />;
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
        className={`session-card ${fadeIn ? "fade-in" : ""}`}
        style={{
          width: "100%",
          maxWidth: "600px",
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          transition: "opacity 0.7s",
          opacity: fadeIn ? 1 : 0,
        }}
      >
        {/* Back / Home Button */}
        <button
          onClick={() =>
            location.state?.fromLogin ? navigate("/") : navigate(-1)
          }
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
          {location.state?.fromLogin ? "Home" : "Back"}
        </button>

        {/* Logo + Header */}
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
              width: "120px",
              height: "120px",
              marginBottom: "1rem",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          />
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: "700",
              color: "#3b82f6",
              marginBottom: "0.5rem",
            }}
          >
            <b>Session Created</b>
          </h1>
          <p style={{ color: "#555", textAlign: "center" }}>
            Share these details to start communicating
          </p>
        </div>

        {/* QR Code Card */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "1.5rem",
            textAlign: "center",
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
            <QrCode size={18} style={{ marginRight: "8px" }} /> Scan to Join
          </h2>
          <div
            style={{
              background: "#fff",
              padding: "1rem",
              borderRadius: "12px",
              display: "inline-block",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            <QRCode
              value={session.qr_data}
              size={180}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>
        </div>

        {/* Session Details */}
        {[
          {
            label: "Shareable URL",
            value: session.session_url,
            color: "#16a34a",
            type: "url",
            copied: copiedUrl,
          },
          {
            label: "Meeting ID",
            value: session.meeting_id?.replace(/(\d{5})/g, "$1 ").trim(),
            color: "#2563eb",
            type: "id",
            copied: copiedId,
          },
          {
            label: "Session Password",
            value: session.session_code,
            color: "#9333ea",
            type: "code",
            copied: copiedCode,
          },
        ].map(({ label, value, color, type, copied }) => (
          <div
            key={type}
            style={{
              padding: "1rem",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              marginBottom: "1rem",
            }}
          >
            <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}>
              {label}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: "600",
                  fontSize: type === "id" ? "1.3rem" : "1rem",
                  color,
                  wordBreak: "break-all",
                }}
              >
                {value}
              </span>
              <button
                onClick={() => copyToClipboard(
                  type === "id"
                    ? session.meeting_id
                    : type === "url"
                    ? session.session_url
                    : session.session_code,
                  type
                )}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color,
                  fontWeight: "600",
                }}
              >
                📋
              </button>
            </div>
            {copied && (
              <p style={{ fontSize: "0.8rem", color: "green", marginTop: "0.3rem" }}>
                Copied to clipboard!
              </p>
            )}
          </div>
        ))}

        {/* Instructions */}
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
          <h3 style={{ fontWeight: "700", color: "#3b82f6", marginBottom: "1rem" }}>
            How Others Can Join
          </h3>
          {[
            "Share the URL, QR code, or Meeting ID + Password",
            'They open Verbo and choose "Join Verbo"',
            "They scan QR code, paste URL, or enter Meeting ID + Password",
            "Start your translated conversation!",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: i === 3 ? "#bbf7d0" : "#dbeafe",
                  color: i === 3 ? "#16a34a" : "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                }}
              >
                {i === 3 ? "✓" : i + 1}
              </div>
              <p style={{ color: "#333" }}>{step}</p>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={startCall}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "30px",
            background: "rgba(59,130,246,0.9)",
            color: "white",
            fontWeight: "600",
            cursor: "pointer",
            border: "none",
          }}
        >
          👥 Start Verbo Call
        </button>
      </div>
    </div>
  );
}
