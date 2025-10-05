import React, { useState, useEffect } from "react";
import {
  Camera,
  ArrowLeft,
  Loader2,
  ScanLine,
  AlertCircle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import BrandedLoader from '../Components/BrandedLoader';
import QRCode from "../Components/ui/QRCode";
import { supabase } from "../utils/supabaseClient";
import logo from "../images/logo-verbo.png";

export default function JoinSession() {
  const navigate = useNavigate();
  const location = useLocation();

  const [meetingId, setMeetingId] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [sessionUrl, setSessionUrl] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (!location) return;
    const params = new URLSearchParams(location.search);
    const sessionUrlParam = params.get("sessionUrl");
    const meetingIdParam = params.get("meetingId");
    const sessionCodeParam = params.get("sessionCode");

    if (sessionUrlParam) setSessionUrl(sessionUrlParam);
    if (meetingIdParam) setMeetingId(meetingIdParam);
    if (sessionCodeParam) setSessionCode(sessionCodeParam);

    setTimeout(() => setFadeIn(true), 50);
  }, [location]);

  const joinSession = async () => {
  if (!sessionUrl.trim() && (!meetingId.trim() || !sessionCode.trim())) {
  setError("Please enter a Meeting URL or both Meeting ID and Password.");
  return;
}

  setIsJoining(true);

  try {
    const {
      data: { session: authSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !authSession?.user) {
      alert("Session expired, please log in again");
      navigate("/login");
      return;
    }

    const accessToken = authSession.access_token;
    const user_id = authSession.user.id;

const bodyData = sessionUrl.trim()
  ? { url_meeting: sessionUrl.trim() }
  : {
      meeting_id: meetingId.trim(),
      meeting_password: sessionCode.trim(),
    };

const resp = await fetch(
  `${process.env.REACT_APP_API_BASE_URL || "http://localhost:3001"}/api/meetings/join`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(bodyData),
  }
);

const { url, error: apiError } = await resp.json();

if (apiError) {
  setError(apiError);
  setIsJoining(false);
  return;
}

if (url) {
  window.location.href = url;
} else {
  setError("No redirect URL returned from server.");
  setIsJoining(false);
}

  } catch (error) {
    console.error("Error joining session:", error);
    setError("Failed to join session. Please try again.");
    setIsJoining(false);
  }
};

  const handleScanSuccess = (scannedData) => {
    setIsScanning(false);
    if (scannedData === "detected_pattern") {
      setError(
        "QR code detected! Please enter the Meeting details manually below."
      );
    } else if (scannedData) {
      try {
        const url = new URL(scannedData);
        window.location.href = scannedData;
      } catch (e) {
        setError("Invalid QR code format. Please use manual entry below.");
      }
    }
  };

const joinWithCredentials = async () => {
  setError("");

  if (!sessionUrl.trim() && (!meetingId.trim() || !sessionCode.trim())) {
    setError("Please enter a Meeting URL or both Meeting ID and Password.");
    return;
  }

  setIsJoining(true);

  try {
    const {
      data: { session: authSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !authSession?.user) {
      alert("Session expired, please log in again");
      navigate("/login");
      return;
    }

    const user_id = authSession.user.id;

    const accessToken = authSession.access_token;

    const response = await fetch(
      `${process.env.REACT_APP_API_BASE_URL || "http://localhost:3001"}/api/meetings/join`,
      {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`, // ✅
},

        body: JSON.stringify({
          url_meeting: sessionUrl.trim(),
          meeting_id: meetingId.trim(),
          meeting_password: sessionCode.trim(),
                  }),
      }
    );

    const { url, error: apiError } = await response.json();

    if (apiError) {
      setError(apiError);
      setIsJoining(false);
      return;
    }

    if (url) {
      window.location.href = url;
    } else {
      setError("No redirect URL returned from server.");
      setIsJoining(false);
    }
  } catch (error) {
    console.error("Error joining session:", error);
    setError("Failed to join session. Please try again.");
    setIsJoining(false);
  }
};

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
        overflowY: "auto"
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
          opacity: fadeIn ? 1 : 0
        }}
      >
        {/* Back / Home */}
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
            fontWeight: "600"
          }}
        >
          <ArrowLeft size={20} style={{ marginRight: "8px" }} />
          {location.state?.fromLogin ? "Home" : "Back"}
        </button>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <img
            src={logo}
            alt="Verbo Logo"
            style={{ width: "140px", height: "140px", objectFit: "contain" }}
            onClick={() => navigate("/")}
          />
        </div>

        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            color: "#3b82f6",
            marginBottom: "1rem",
            textAlign: "center"
          }}
        >
          Join Verbo Call
        </h1>

        {error && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "12px",
              background: "rgba(255,0,0,0.1)",
              color: "#b91c1c",
              marginBottom: "1rem",
              textAlign: "center"
            }}
          >
            <AlertCircle size={18} style={{ marginRight: "8px" }} />
            {error}
          </div>
        )}

        {/* QR Scanner */}
        {isScanning && (
          <QRCode
            onScanSuccess={handleScanSuccess}
            onClose={() => {
              setIsScanning(false);
              setError("");
            }}
          />
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => {
              setError("");
              setIsScanning(true);
            }}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "20px",
              background: "#3b82f6",
              color: "white",
              fontWeight: "600",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem"
            }}
          >
            <ScanLine size={18} />
            Scan QR Code
          </button>

          {/* Manual Entry */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="url"
              value={sessionUrl}
              onChange={(e) => setSessionUrl(e.target.value)}
              placeholder="Enter Meeting URL"
              style={{
                padding: "1rem",
                borderRadius: "12px",
                border: "1px solid #ccc",
                width: "100%",
                fontSize: "1rem"
              }}
            />
            
            <div style={{ textAlign: "center", fontSize: "0.9rem", color: "#555" }}>
              — OR —
            </div>

            <input
              type="text"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value.replace(/\s/g, ""))}
              placeholder="Enter Meeting ID"
              maxLength={20}
              style={{
                padding: "1rem",
                borderRadius: "12px",
                border: "1px solid #ccc",
                fontFamily: "'Courier New', monospace",
                fontSize: "1.2rem",
                textAlign: "center"
              }}
            />
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="Enter Meeting Password"
              maxLength={8}
              style={{
                padding: "1rem",
                borderRadius: "12px",
                border: "1px solid #ccc",
                fontFamily: "'Courier New', monospace",
                fontSize: "1.2rem",
                textAlign: "center"
              }}
            />
<button
  onClick={joinSession}
  disabled={isJoining}
  style={{
    width: "100%",
    padding: "1rem",
    borderRadius: "20px",
    background: "#2563eb",
    color: "white",
    fontWeight: "600"
  }}
>

              {isJoining ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Loader2 size={18} className="animate-spin" />
                  Joining...
                </div>
              ) : (
                "Join Verbo Call"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
