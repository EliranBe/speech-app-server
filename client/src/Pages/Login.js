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
      className="min-h-screen w-full flex justify-center items-center relative"
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)", // רקע אחיד
      }}
    >
      {/* לוגו */}
      <div className="absolute top-4 left-4">
        <img
          src={logo}
          alt="Verbo.io"
          className="w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-md object-cover"
        />
      </div>

      {/* כרטיס התחברות */}
      <div
        className={`w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl transition-opacity duration-700 flex flex-col justify-center items-center ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "rgba(255,255,255,0.1)", // חצי שקוף כמו ב-call.html
          backdropFilter: "blur(12px)",
        }}
      >
        <h1 className="text-2xl font-semibold text-center text-blue-700 mb-6">
          Welcome to Verbo.io
        </h1>

        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}

        <div className="w-full mb-4 flex flex-col items-center">
          <label className="text-sm font-medium text-gray-700 mb-2 w-full text-center">
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

        <div className="w-full mb-6 flex flex-col items-center">
          <label className="text-sm font-medium text-gray-700 mb-2 w-full text-center">
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

        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 shadow"
        >
          Login
        </button>

        <div className="mt-5 text-center text-sm sm:text-base w-full">
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
