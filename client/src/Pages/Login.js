import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logo from "../images/logo-verbo.png";
import BrandedLoader from "../Components/BrandedLoader";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  const fromRegister = location.state?.fromRegister || false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // בדיקה אם יש session פעיל
  useEffect(() => {
    async function checkSession() {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error checking session:", error.message);
      }

      if (session) {
        console.log("User already logged in — redirecting to Home");
        navigate("/");
        return; // מונע המשך רינדור ה־Login
      } else {
        setLoading(false); // אין session → עצור מצב טעינה
      }
    }

    checkSession();
  }, [navigate]);

  // אפקט ל־fade-in
  useEffect(() => {
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  // אם אנחנו עדיין בטעינה → להציג את ה־loader
  if (loading) {
    return <BrandedLoader text="Checking session..." />;
  }

  const handleLogin = async () => {
    setEmailError(false);
    setPasswordError(false);
    setError(null);

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

    // כניסה עם סיסמה
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError("Invalid Email or password. Please try again.");
      setEmailError(true);
      setPasswordError(true);
      return;
    }

    if (signInData?.session) {
      console.log("Login response session:", signInData.session);
      console.log("Access token:", signInData.session?.access_token);
      console.log("Token expires at:", new Date(signInData.session?.expires_at * 1000));
      console.log("User logged in, session stored by Supabase");
    }

    // בדיקה אם קיימת רשומה ב־user_preferences
    const userId = signInData.user.id;
    const { data: prefsData, error: prefsError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefsError || !prefsData) {
      navigate("/Preferences"); // אין נתונים → לכיוון Preferences
    } else {
      navigate("/"); // יש נתונים → לכיוון Home
    }
  };

    const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://speech-app-server.onrender.com/",
      }
    });
    if (error) {
      console.error("Error during Google login:", error.message);
      setError("Error logging in with Google");
    }
  };
  
  return (
    <div
      className="login-container"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "3rem",
        overflow: "auto",
      }}
    >
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
        {/* לוגו */}
        <img
          src={logo}
          alt="Verbo.io"
          style={{
            width: "140px",
            height: "140px",
            marginBottom: "0 auto 1.5rem auto",
          }}
        />

       <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1E90FF" }}>
  Welcome to Verbo.io
</h1>

<div
  style={{
    padding: "1rem 1.5rem", // padding קטן יותר
    borderRadius: "20px",
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    maxWidth: "500px",
    textAlign: "center", // רק הכותרת תהיה במרכז
    margin: "1rem auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch", // לאפשר פסקה משמאל לימין
  }}
>
  {/* כותרת מרכזית */}
  <h2 style={{
    color: "#1E90FF",
    fontWeight: "700",
    marginTop: "0",
    marginBottom: "0.5rem",
    textAlign: "center" // כותרת במרכז
  }}>
    Connect beyond words.
  </h2>

  {/* פסקה משמאל לימין */}
  <p style={{
    color: "#333",
    fontSize: "1rem",
    lineHeight: "1.5",
    margin: "0",
    textAlign: "left"
  }}>
    <strong style={{ color: "#1E90FF" }}>Verbo.io</strong> enables real-time voice translation for smooth, human communication across languages.
    <br />
    Anywhere and anytime: travel, teamwork, connecting with loved ones, and beyond.
  </p>
</div>

        {/* הודעת שגיאה */}
        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        {/* הודעה אם המשתמש הגיע מרישום */}
        {fromRegister && (
          <p style={{ color: "green", marginBottom: "1rem" }}>
            Please confirm your email to activate your account.
          </p>
        )}

{/* טופס התחברות */}
<form
  onSubmit={(e) => {
    e.preventDefault(); // מונע רענון דף
    handleLogin();
  }}
  style={{ width: "100%" }}
>
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
        border: emailError ? "2px solid red" : "none",
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
        border: passwordError ? "2px solid red" : "none",
        outline: "none",
      }}
    />
  </div>

  {/* Login button */}
  <button
    type="submit" // <-- זה מה שחשוב
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
</form>

{/* כפתור התחברות עם גוגל */}
<button
  onClick={handleGoogleLogin}
  type="button"
  style={{
    marginTop: "1rem",
    width: "100%",
    padding: "0.75rem",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.3)", // רקע כמו כפתור Login
    backdropFilter: "blur(6px)",
    fontWeight: "600",
    color: "#333",
    cursor: "pointer",
    transition: "0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem", // מרווח בין הלוגו לטקסט
    marginBottom: "1rem",
  }}
>
  {/* לוגו גוגל */}
  <img
    src="https://developers.google.com/identity/images/g-logo.png"
    alt="Google logo"
    style={{ width: "24px", height: "24px" }}
  />
  Continue with Google
</button>

        {/* Sign up */}
        <div style={{ fontSize: "0.9rem", marginTop: "1rem" }}>
          <span>Don't have an account?</span>
          <Link to="/register" style={{ display: "block", fontWeight: "600", marginTop: "0.5rem", color: "#333" }}>
            Sign Up
          </Link>
        </div>

              {/* Terms and Privacy */}
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
