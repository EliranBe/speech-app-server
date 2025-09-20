import React, { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import logo from "../images/logo-verbo.jpg";

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
      className="min-h-screen flex flex-col justify-center items-center p-6 relative"
      style={{
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* לוגו בצד שמאל למעלה */}
      <div className="absolute top-4 left-4">
        <img
          src={logo}
          alt="Verbo.io"
          className="w-16 h-16 object-cover rounded-2xl shadow-md"
        />
      </div>

      {/* תוכן ממורכז */}
      <div className="max-w-md w-full bg-white/80 p-10 rounded-3xl shadow-2xl backdrop-blur-md text-center">
        {/* כותרת ברוכים הבאים */}
        <h1 className="text-4xl font-bold text-blue-700 mb-8">
          Welcome to Verbo.io
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* שדה אימייל */}
        <div className="mb-6 text-left">
          <label className="block text-gray-700 font-semibold mb-2">
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

        {/* שדה סיסמה */}
        <div className="mb-6 text-left">
          <label className="block text-gray-700 font-semibold mb-2">
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

        {/* כפתור התחברות */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold hover:bg-blue-600 transition-colors duration-200"
        >
          Login
        </button>

        {/* לינק להרשמה */}
        <p className="mt-6 text-gray-700">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 font-semibold underline hover:text-blue-800"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
