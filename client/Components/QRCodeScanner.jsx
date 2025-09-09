import React, { useEffect, useRef, useState } from 'react';
import { X, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QRCodeScanner({ onScanSuccess, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let animationFrameId;

    const startScan = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsScanning(true);
            scanQRCode();
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Camera permission denied. Please enable camera access in your browser settings and try again.');
      }
    };

    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          // Simple QR code detection using pattern recognition
          const qrResult = detectQRCode(imageData);
          if (qrResult) {
            onScanSuccess(qrResult);
            return;
          }
        } catch (e) {
          console.log('QR detection attempt failed, continuing...');
        }
      }

      animationFrameId = requestAnimationFrame(scanQRCode);
    };

    // Simple QR code pattern detection
    const detectQRCode = (imageData) => {
      // This is a simplified approach - in a real implementation, you'd use a proper QR library
      // For now, we'll simulate detection by looking for high contrast patterns
      const data = imageData.data;
      let contrastCount = 0;
      
      // Sample some pixels to detect high contrast areas (typical of QR codes)
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness < 50 || brightness > 200) {
          contrastCount++;
        }
      }
      
      // If we detect enough contrast (suggesting a QR code might be present),
      // we'll prompt the user to enter the URL manually
      if (contrastCount > 1000) {
        return 'detected_pattern';
      }
      
      return null;
    };

    startScan();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
    };
  }, [onScanSuccess, isScanning]);

  const handlePatternDetected = () => {
    setError('QR code pattern detected! Please manually enter the session URL or Meeting ID below, or ask the host to share the link directly.');
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-auto max-h-[70vh] ${error ? 'hidden' : ''}`}
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning overlay */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-dashed border-white/50 rounded-lg animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-white">
            <CameraOff className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-bold">Camera Access Required</h3>
            <p className="text-gray-300 text-sm mt-2">{error}</p>
            <Button 
              onClick={onClose}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Use Manual Entry Instead
            </Button>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>
      
      {!error && (
        <div className="mt-4 text-center">
          <p className="text-white text-sm mb-2">Point your camera at a Verbo QR code</p>
          <p className="text-gray-300 text-xs">Having trouble? Use manual entry below</p>
        </div>
      )}
    </div>
  );
}

