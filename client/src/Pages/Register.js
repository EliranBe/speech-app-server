import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo-verbo.png";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // סטטוס דרישות סיסמה
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  // בדיקה חיה של הסיסמה בזמן הקלדה
  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[\W_]/.test(password),
    });
  }, [password]);

  const handleRegister = async () => {
    setEmailError(false);
    setPasswordError(false);

    if (!email) {
      setEmailError(true);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      setEmailError(true);
      return;
    }

    if (!password) {
      setPasswordError(true);
      return;
    }

    // בדיקה סופית של דרישות סיסמה
    const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
    if (!allCriteriaMet) {
      setError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      );
      setPasswordError(true);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError("Failed to create account. Please try again.");
    } else {
      navigate("/Login");
    }
  };

  return (
    <div
      className="register-container"
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
      <div
        className={`register-card ${fadeIn ? "fade-in" : ""}`}
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
        <img
          src={logo}
          alt="Verbo.io"
          style={{
            width: "140px",
            height: "140px",
            marginBottom: "1rem",
          }}
        />

        <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "1.5rem", color: "#333" }}>
          Get Started with Verbo.io
        </h1>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <div style={{ width: "100%", marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Email</label>
          <input
            type="email"
            placeholder="Enter your Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(6px)",
              border: emailError ? "2px solid red" : "none",
              outline: "none",
            }}
          />
        </div>

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
              border: passwordError ? "2px solid red" : "none",
              outline: "none",
            }}
          />

          {/* תצוגת דרישות הסיסמה */}
          <ul style={{ textAlign: "left", marginTop: "0.5rem", fontSize: "0.75rem", color: "#333" }}>
            <li style={{ color: passwordCriteria.length ? "green" : "red" }}>At least 8 characters</li>
            <li style={{ color: passwordCriteria.uppercase ? "green" : "red" }}>At least 1 uppercase letter</li>
            <li style={{ color: passwordCriteria.lowercase ? "green" : "red" }}>At least 1 lowercase letter</li>
            <li style={{ color: passwordCriteria.number ? "green" : "red" }}>At least 1 number</li>
            <li style={{ color: passwordCriteria.specialChar ? "green" : "red" }}>At least 1 special character</li>
          </ul>
        </div>

        <button
          onClick={handleRegister}
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
          Sign Up
        </button>

        <div style={{ fontSize: "0.85rem", marginTop: "1rem", color: "#333" }}>
          By signing up, you confirm that you accept our{" "}
          <a href="/help/legal" style={{ fontWeight: "600", color: "#333" }}>
            Terms of Service and Privacy Policy
          </a>.
        </div>
      </div>
    </div>
  );
}
