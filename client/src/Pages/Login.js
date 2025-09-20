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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className="w-screen h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
      }}
    >
      {/* לוגו מופרד לחלוטין */}
      <img
        src={logo}
        alt="Verbo.io"
        className="fixed top-4 left-4 w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-md object-cover z-50"
      />

      {/* מרכז המסך */}
      <div className="w-full h-full flex justify-center items-center">
        {/* כרטיס התחברות */}
        <div
          className={`w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-[20px] transition-opacity duration-700 flex flex-col justify-center items-center text-center ${
            fadeIn ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">
            Welcome to Verbo.io
          </h1>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {/* Email */}
          <div className="w-full mb-4 flex flex-col items-center">
            <label className="text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full max-w-xs p-3 rounded-xl bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Password */}
          <div className="w-full mb-6 flex flex-col items-center">
            <label className="text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full max-w-xs p-3 rounded-xl bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full max-w-xs py-3 rounded-[30px] bg-white/30 backdrop-blur-md font-semibold text-gray-900 hover:bg-white/50 transition-colors duration-200 shadow-md"
          >
            Login
          </button>

          {/* Sign up */}
          <div className="mt-5 text-sm sm:text-base flex flex-col items-center">
            <span className="text-gray-700">Don't have an account?</span>
            <Link
              to="/register"
              className="inline-block font-semibold text-gray-800 hover:text-gray-900 mt-2"
            >
              Sign up
              <div className="h-[2px] bg-gray-800 mt-1 mx-auto w-16" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
