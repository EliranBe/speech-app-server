import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import logo from "../images/logo-verbo.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // הפעלת האנימציה כשהדף נטען
    const timeout = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate("/"); 
    }
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center items-center relative"
      style={{
        background: "#c9d6ff", // צבע אחיד על כל המסך
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* לוגו קטן בצד שמאל-למעלה */}
      <div className="absolute top-4 left-4">
        <img
          src={logo}
          alt="Verbo.io"
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-md object-cover"
        />
      </div>

      {/* כרטיס התחברות עם fade-in */}
      <div
        className={`w-full max-w-sm sm:max-w-md bg-white/85 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-md transition-opacity duration-700 ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-xl sm:text-2xl font-semibold text-center text-blue-700 mb-6">
          Welcome to Verbo.io
        </h1>

        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 shadow"
        >
          Login
        </button>

        {/* Sign up */}
        <div className="mt-5 text-center text-sm sm:text-base">
          <span className="text-gray-700">Don't have an account? </span>
          <div className="mt-2">
            <Link
              to="/register"
              className="inline-block font-semibold text-blue-600 hover:text-blue-800"
            >
              Sign up
              <div className="h-[2px] bg-blue-600 mt-1 mx-auto w-16" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
