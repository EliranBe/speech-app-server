import React from 'react';

export default function QRCode({ value, size = 200, ...props }) {
  if (!value) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-gray-200 flex items-center justify-center text-sm text-gray-500 p-4"
        {...props}
      >
        <span>No data for QR Code</span>
      </div>
    );
  }

  const encodedValue = encodeURIComponent(value);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedValue}&size=${size}x${size}&bgcolor=ffffff&qzone=1`;

  return (
    <div className="flex flex-col items-center" {...props}>
      <img
        src={qrApiUrl}
        alt="Verbo Session QR Code"
        width={size}
        height={size}
        className="bg-white"
      />
    </div>
  );
}

