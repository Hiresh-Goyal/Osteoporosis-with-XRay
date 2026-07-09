import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 z-50">
      <div className="flex flex-col items-center gap-8 animate-slide-up">
        {/* Logo */}
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-2xl">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="28" y="4" width="8" height="56" rx="4" fill="white" opacity="0.9"/>
              <rect x="4" y="28" width="56" height="8" rx="4" fill="white" opacity="0.9"/>
              <circle cx="32" cy="32" r="10" fill="white" opacity="0.3"/>
              <circle cx="32" cy="32" r="6" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent-400 border-2 border-primary-900 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight">OsteoCare</h1>
          <p className="text-primary-200 mt-2 text-lg font-medium">AI-Powered Osteoporosis Prediction</p>
        </div>

        {/* Tagline */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2.5">
          <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></div>
          <span className="text-white/80 text-sm font-medium">Advanced Bone Health Analytics</span>
        </div>

        {/* Progress bar */}
        <div className="w-64 mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-400 to-white rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-primary-300 text-xs text-center mt-2">Initializing systems...</p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-primary-400 text-xs font-medium tracking-wider">
        HOSPITAL MANAGEMENT SYSTEM · v2.0
      </div>
    </div>
  );
}
