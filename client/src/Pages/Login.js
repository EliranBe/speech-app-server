import React, { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import logo from "../../public/logo.jpg"; // קישור לקובץ הלוגו שהעלית

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
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* לוגו */}
      <div className="mb-8">
        <img src={logo} alt="Verbo.io" className="w-32 h-auto" />
      </div>

      {/* כרטיס התחברות */}
      <div className="max-w-md w-full bg-white/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">Login to Verbo.io</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold hover:bg-blue-600 transition-colors duration-200"
        >
          Login
        </button>
      </div>
    </div>
  );
}
