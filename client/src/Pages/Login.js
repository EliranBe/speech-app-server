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
      className="w-screen h-screen flex justify-center items-center relative bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* כרטיס התחברות */}
      <div
        className={`w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl transition-opacity duration-700 flex flex-col justify-center items-center text-center ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "rgba(255,255,255,0.15)", // חצי שקוף כמו ב-call.html
          backdropFilter: "blur(12px)",
        }}
      >
        <h1 className="text-2xl font-semibold text-blue-700 mb-6">
          Welcome to Verbo.io
        </h1>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* Email */}
        <div className="w-full mb-4 flex flex-col items-center">
          <label className="text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div className="w-full mb-6 flex flex-col items-center">
          <label className="text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="w-full max-w-xs py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 shadow"
        >
          Login
        </button>

        {/* Sign up */}
        <div className="mt-5 text-sm sm:text-base flex flex-col items-center">
          <span className="text-gray-700">Don't have an account?</span>
          <Link
            to="/register"
            className="inline-block font-semibold text-blue-600 hover:text-blue-800 mt-2"
          >
            Sign up
            <div className="h-[2px] bg-blue-600 mt-1 mx-auto w-16" />
          </Link>
        </div>
      </div>
    </div>
  );
}
