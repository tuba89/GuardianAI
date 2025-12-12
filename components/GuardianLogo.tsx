
import React from 'react';

interface GuardianLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'lockup';
  animated?: boolean;
}

const GuardianLogo: React.FC<GuardianLogoProps> = ({ 
  className = "w-16 h-16", 
  variant = 'icon',
  animated = false
}) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Outer Glow Container */}
      <div className={`absolute inset-0 bg-blue-500/20 blur-xl rounded-full ${animated ? 'animate-pulse' : ''}`} />
      
      <svg 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="shieldMain" x1="60" y1="5" x2="60" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" /> {/* Blue-500 */}
            <stop offset="50%" stopColor="#1d4ed8" /> {/* Blue-700 */}
            <stop offset="100%" stopColor="#0f172a" /> {/* Slate-900 */}
          </linearGradient>
          
          <linearGradient id="shieldRim" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#bfdbfe" /> {/* Blue-200 */}
            <stop offset="50%" stopColor="#60a5fa" /> {/* Blue-400 */}
            <stop offset="100%" stopColor="#2563eb" /> {/* Blue-600 */}
          </linearGradient>

          <linearGradient id="coreGlow" x1="60" y1="40" x2="60" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f87171" /> {/* Red-400 */}
            <stop offset="100%" stopColor="#dc2626" /> {/* Red-600 */}
          </linearGradient>
          
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Shield Body */}
        <path 
          d="M60 5L15 25V55C15 82 35 105 60 115C85 105 105 82 105 55V25L60 5Z" 
          fill="url(#shieldMain)" 
          stroke="url(#shieldRim)" 
          strokeWidth="2.5"
        />

        {/* Inner Tech Lines */}
        <path 
          d="M60 25V45 M60 75V95 M35 55H45 M75 55H85" 
          stroke="#60a5fa" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.6"
        />
        
        {/* Central Core Structure */}
        <path d="M60 60L48 50L60 40L72 50L60 60Z" fill="#1e3a8a" opacity="0.5" />
        
        {/* The AI Core (Pulsing) */}
        <circle cx="60" cy="60" r="12" fill="url(#coreGlow)" stroke="#fecaca" strokeWidth="2" filter="url(#neonGlow)">
           {animated && (
             <animate attributeName="r" values="10;13;10" dur="2s" repeatCount="indefinite" />
           )}
           {animated && (
             <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
           )}
        </circle>
        
        {/* Orbiting Satellite/Node */}
        {animated && (
            <g>
               <circle cx="60" cy="60" r="28" stroke="white" strokeWidth="1" opacity="0.2" strokeDasharray="4 4" />
               <circle r="3" fill="white">
                  <animateMotion 
                    dur="4s" 
                    repeatCount="indefinite"
                    path="M60 32 A28 28 0 1 1 60 88 A28 28 0 1 1 60 32"
                  />
               </circle>
            </g>
        )}
        
      </svg>
      
      {/* Branding Text for Full Splash Variant */}
      {variant === 'full' && (
        <div className="mt-6 text-center animate-in slide-in-from-bottom-5 fade-in duration-1000">
            <h1 className="text-5xl font-black tracking-tighter text-white font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                Guardian<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">AI</span>
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3 opacity-90">
                <div className="h-[1px] w-8 bg-blue-500/50"></div>
                <p className="text-xs text-blue-200 font-bold uppercase tracking-[0.4em] glow-text">
                    Global Safety Network
                </p>
                <div className="h-[1px] w-8 bg-blue-500/50"></div>
            </div>
        </div>
      )}
      
      {/* Lockup for Header */}
      {variant === 'lockup' && (
          <div className="ml-3 leading-none">
              <span className="block text-2xl font-black text-white tracking-tight">Guardian<span className="text-blue-400">AI</span></span>
          </div>
      )}
    </div>
  );
};

export default GuardianLogo;
