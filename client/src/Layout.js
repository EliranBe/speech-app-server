
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import BrandedLoader from '../components/BrandedLoader';
import { supabase } from "./utils/supabaseClient";

async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }
  return data.user; // זה המשתמש האמיתי המחובר
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await loadUser(); // כאן קוראים לפונקציה החדשה
        setUser(currentUser);
              if (!currentUser) {
        navigate("/login");
        return;
      }

        // אם צריך לעדכן את הנתונים במסד שלך, אפשר לעשות זאת כאן
        if (currentUser && !currentUser.user_id) {
          // לדוגמה, קריאה ל-API פנימי שלך או Supabase כדי להוסיף user_id
          await supabase
  .from("user_preferences")
  .upsert({
    user_id: currentUser.id,
    system_language: navigator.language,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
        }
      } catch (e) {
        console.error("Error in checkUser:", e);
        setUser(null);
      }
    };

    checkUser();
  }, []);

  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => setIsPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const showLoader = isPageLoading && currentPageName !== "Call";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Liquid Glass Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Glass Morphism Header */}
      {currentPageName !== "Login" && currentPageName !== "Call" &&
      <header className="relative z-10 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/home" className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68653b82ac1d678501bcb14e/51c242cdf_Verboio.jpg" 
                  alt="Verbo.io Logo" 
                  className="w-10 h-10 rounded-xl object-cover" 
                />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Verbo.io</h1>
                  <p className="text-xs text-gray-600">Real-time Translation</p>
                </div>
              </Link>
              
              {currentPageName !== "Preferences" &&
            <Link
              to="/Preferences"
              className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300">
                  <Settings className="w-5 h-5 text-gray-700" />
                </Link>
            }
            </div>
          </div>
        </header>
      }
      
      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {showLoader ? <BrandedLoader text="Loading..." /> : children}
      </main>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .glass-morphism {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .liquid-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        .liquid-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4);
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        @media (max-width: 768px) {
          .min-h-screen {
            min-height: 100vh;
            min-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
}
