import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRCodeScanner({ onScanSuccess, onClose }) {
  const qrRegionRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("qr-reader");

    scannerRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scannerRef.current.stop().then(() => {
            onScanSuccess(decodedText);
          });
        },
        (error) => {
          console.log("QR scanning...", error);
        }
      )
      .catch((err) => {
        console.error("Error starting QR scanner:", err);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (scannerRef.current) {
        scannerRef.current.stop().then(onClose);
      } else {
        onClose();
      }
    }
  };

  return (
  <div
    onClick={handleOverlayClick}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        borderRadius: "16px",
        padding: "1rem",
        boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative", // חשוב ל־overlay
      }}
    >
      <div
        id="qr-reader"
        ref={qrRegionRef}
        style={{
          width: "280px",
          height: "280px",
          border: "2px solid #3b82f6",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden",
        }}
      ></div>

      {/* Overlay עם גבולות הדרכה */}
      <div
        style={{
          position: "absolute",
          top: "0", // מתואם עם padding של ההורה
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            width: "250px",
            height: "250px",
            border: "4px solid white",
            borderRadius: "12px",
            boxSizing: "border-box",
          }}
        ></div>
      </div>

      <p style={{ color: "#333", marginTop: "1rem", fontWeight: "600" }}>
        Align QR Code within the frame
      </p>
    </div>
  </div>
);
}
