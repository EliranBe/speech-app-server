import React from 'react';
import logo from "../images/logo-verbo.png"; // נתיב ללוגו שלך

export default function BrandedLoader({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1E90FF" }}>
      <div className="flex flex-col items-center justify-center">
        {/* לוגו עם רקע וPulse effect */}
        <div className="relative w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-2xl flex items-center justify-center">
            <img src={logo} alt="Verbo.io Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>

        {/* טקסט */}
        <p className="text-white text-lg animate-pulse text-center">
          {text || 'Loading...'}
        </p>
      </div>
    </div>
  );
}
