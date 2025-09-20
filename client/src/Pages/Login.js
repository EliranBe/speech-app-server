import React, { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import logo from "../images/logo-verbo.jpg";
import './Login.css'; // אם יש קובץ CSS

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate("/"); // אחרי ההתחברות נלך ל-Home
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* לוגו קטן בצד שמאל-למעלה */}
      <div className="absolute top-4 left-4">
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md bg-white/60 flex items-center justify-center">
          <img
            src={logo}
            alt="Verbo.io"
            className="logo-small" // השתמש במחלקה החדשה
          />
        </div>
      </div>

      {/* כרטיס התחברות - רוחב צר וממוקד במרכז */}
      <div className="w-full max-w-sm bg-white/85 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        {/* כותרת ברוכים הבאים */}
        <h1 className="text-2xl font-semibold text-center text-blue-700 mb-6">
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
        <div className="mt-5 text-center">
          <span className="text-sm text-gray-700">
            Don&apos;t have an account?{" "}
          </span>
          <div className="mt-2">
            {/* המילה Sign up עם קו מתחת (border-bottom) שמייצגת קישור */}
            <Link to="/register" className="inline-block text-sm font-semibold">
              <span className="text-blue-600 hover:text-blue-800">Sign up</span>
              <div className="h-[2px] bg-blue-600 mt-1 mx-auto w-16" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
