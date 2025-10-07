import React from 'react';
import logo from "../images/logo-verbo.png";

export default function BrandedLoader({ text }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #c9d6ff, #e2e2e2)", // רקע כמו ב‑Home
        fontFamily: "'Segoe UI', sans-serif"
      }}
    >
      <div
        style={{
          padding: "2rem",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* הלוגו */}
        <img
          src={logo}
          alt="Verbo.io"
          style={{
            width: "140px",
            height: "140px",
            marginBottom: "1rem"
          }}
        />

        {/* מלל */}
        <p style={{
          fontSize: "1rem",
          color: "#333",
          textAlign: "center",
          marginTop: "0"
        }}>
          {text || "Loading Verbo.io..."}
        </p>
      </div>
    </div>
  );
}
