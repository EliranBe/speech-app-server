import React from 'react';
import logo from "../images/logo-verbo.png"; // נתיב ללוגו שלך

export default function BrandedLoader({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-2xl flex items-center justify-center">
            <img src={logo} alt="Verbo.io Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
        <p className="text-gray-600 text-lg animate-pulse">{text || 'Loading...'}</p>
      </div>
    </div>
  );
}
