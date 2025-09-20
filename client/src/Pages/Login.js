import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import logo from "../images/logo-verbo.png";
import "../styles/Login.css"; // אם אתה רוצה להפריד CSS לקובץ

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className="login-container"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* לוגו במרכז או בפינה */}
      <img
        src={logo}
        alt="Verbo.io"
        className="logo"
        style={{
          position: "fixed",
          top: "4px",
          left: "4px",
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 50,
        }}
      />

      {/* כרטיס התחברות */}
      <div
        className={`login-card ${fadeIn ? "fade-in" : ""}`}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transition: "opacity 0.7s",
          opacity: fadeIn ? 1 : 0,
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "1.5rem", color: "#333" }}>
          Welcome to Verbo.io
        </h1>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        {/* Email */}
        <div style={{ width: "100%", marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Email</label>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              border: "none",
              outline: "none",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ width: "100%", marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              border: "none",
              outline: "none",
            }}
          />
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "30px",
            background: "rgba(255,255,255,0.3)",
            backdropFilter: "blur(6px)",
            fontWeight: "600",
            color: "#333",
            cursor: "pointer",
            transition: "0.2s",
            marginBottom: "1rem",
          }}
        >
          Login
        </button>

        {/* Sign up */}
        <div style={{ fontSize: "0.9rem", marginTop: "1rem" }}>
          <span>Don't have an account?</span>
          <Link to="/register" style={{ display: "block", fontWeight: "600", marginTop: "0.5rem", color: "#333" }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
