
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, User, Car, MapPin, StopCircle, RotateCcw, Cloud, RefreshCw, XCircle, Zap, Upload, CheckCircle, FileText, EyeOff } from 'lucide-react';
import { analyzeSceneFrame } from '../services/geminiService';
import { AnalysisResult, EvidenceItem, Language, TriggerType } from '../types';
import { TEXTS } from '../constants';

interface EmergencyModeProps {
  language: Language;
  triggerType: TriggerType;
  onExit: () => void;
  onEvidenceCaptured: (evidence: EvidenceItem) => void;
  pendingUploads: number;
  isStealth: boolean;
  isDemo: boolean;
}

const EmergencyMode: React.FC<EmergencyModeProps> = ({ 
  language, triggerType, onExit, onEvidenceCaptured, pendingUploads, isStealth, isDemo
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locationRef = useRef<{lat: number, lng: number} | null>(null);

  const [isRecording, setIsRecording] = useState(true);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [camFacingMode, setCamFacingMode] = useState<'user' | 'environment'>('environment');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  
  const t = TEXTS[language];

  // Logic: Stealth applies ONLY if trigger is auto (not manual or voice) AND stealth setting is ON.
  const isAutoTrigger = triggerType !== 'MANUAL' && triggerType !== 'VOICE';
  const effectiveStealth = isAutoTrigger && isStealth;

  // Critical triggers skip the countdown
  const isCriticalTrigger = ['SIM_EJECT', 'POWER_BUTTON', 'AIRPLANE_MODE'].includes(triggerType);

  const [timeLeftToCancel, setTimeLeftToCancel] = useState<number | null>(
    isAutoTrigger && !isCriticalTrigger && !effectiveStealth ? 5 : null
  );

  // Fake upload progress for Demo visualization
  useEffect(() => {
    if (pendingUploads > 0) {
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 100));
        }, 150);
        return () => clearInterval(interval);
    } else {
        setUploadProgress(100);
    }
  }, [pendingUploads]);

  // Countdown for false alarm (Only if NOT in stealth mode)
  useEffect(() => {
    if (timeLeftToCancel === null) return;
    if (timeLeftToCancel <= 0) {
        setTimeLeftToCancel(null);
        return;
    }
    const timer = setInterval(() => setTimeLeftToCancel(prev => (prev ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeftToCancel]);

  // Start Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        // In Stealth Mode, prioritize front camera for face capture if user triggered? 
        // Actually for theft (SIM eject), front camera is better to catch the face.
        // Let's stick to environment for now or auto-switch? 
        // For 'SIM_EJECT' or 'UNLOCK_FAILED', front camera makes sense.
        // For this demo, we'll respect the state but maybe default to user for stealth?
        const facing = effectiveStealth && (triggerType === 'UNLOCK_FAILED' || triggerType === 'SIM_EJECT') ? 'user' : camFacingMode;
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();

    const geoId = navigator.geolocation.watchPosition(
        (pos) => { locationRef.current = {lat: pos.coords.latitude, lng: pos.coords.longitude}; },
        (err) => console.error(`Geo error (${err.code}): ${err.message}`),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      navigator.geolocation.clearWatch(geoId);
    };
  }, [camFacingMode, effectiveStealth, triggerType]);

  const captureFrame = useCallback(async () => {
      if (isAnalyzing || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      // In stealth mode, video might be hidden but should still be 'ready'
      if (video.readyState !== 4) return; 

      setIsAnalyzing(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const scale = 512 / video.videoWidth;
        const w = 512;
        const h = video.videoHeight * scale;

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        
        try {
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          if (base64) {
            // Pass language for localized analysis
            const result = await analyzeSceneFrame(base64, language);
            setCurrentAnalysis(result);
            
            // Always save
            const shouldSave = true;

            if (shouldSave) {
               const id = Date.now().toString();
               onEvidenceCaptured({
                   id: id,
                   imageUrl: canvas.toDataURL('image/jpeg', 0.8),
                   analysis: result,
                   timestamp: Date.now(),
                   latitude: locationRef.current?.lat,
                   longitude: locationRef.current?.lng,
                   backupStatus: 'pending',
                   isShared: false,
                   sightings: 0,
                   triggerType: triggerType
               });
               setLastSavedId(id);
               // Hide toast after 3s
               setTimeout(() => setLastSavedId(prev => prev === id ? null : prev), 3000);
            }
          }
        } catch (e) {
            console.error("Analysis error", e);
        }
      }
      setIsAnalyzing(false);
  }, [isAnalyzing, onEvidenceCaptured, triggerType, language]);

  useEffect(() => {
    if (!isRecording || timeLeftToCancel !== null) return; 
    captureFrame();
    const interval = setInterval(captureFrame, 4000); 
    return () => clearInterval(interval);
  }, [isRecording, timeLeftToCancel, captureFrame]);

  const toggleCamera = () => setCamFacingMode(prev => prev === 'user' ? 'environment' : 'user');

  const getThreatColor = (level?: string) => {
    switch(level) {
      case 'HIGH': return 'bg-red-600 animate-pulse';
      case 'MEDIUM': return 'bg-orange-500';
      case 'LOW': return 'bg-green-600';
      default: return 'bg-slate-600';
    }
  };

  // Stealth Overlay Component
  if (effectiveStealth) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center pointer-events-auto">
            {/* Hidden capture elements */}
            <video ref={videoRef} autoPlay playsInline muted className="absolute opacity-0 pointer-events-none w-1 h-1" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Fake Lock Screen */}
            <div className="text-center opacity-30 select-none pointer-events-none">
                <div className="text-6xl font-thin text-white mb-2">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <div className="text-sm text-white">
                    {new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
                </div>
            </div>

            {/* Demo Indicator (Only visible if isDemo is true) */}
            {isDemo && (
                <div className="absolute top-4 right-4 z-50">
                     <button 
                        onClick={onExit}
                        className="bg-red-900/80 border border-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2"
                     >
                         <EyeOff className="w-3 h-3" />
                         🔴 Stealth Recording (Demo) - Click to Stop
                     </button>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* False Alarm Cancellation Overlay */}
      {timeLeftToCancel !== null && timeLeftToCancel > 0 && (
        <div className="absolute inset-0 z-50 bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <AlertTriangle className="w-20 h-20 text-white mb-4 animate-bounce" />
            <h2 className="text-3xl font-black text-white mb-2">{t.auto_trigger}</h2>
            <div className="text-xl font-bold text-red-200 mb-8 bg-black/20 px-4 py-2 rounded-lg">
                {t.triggers[triggerType === 'POWER_BUTTON' ? 'power' : triggerType === 'MOVEMENT' ? 'movement' : 'sim']}
            </div>
            
            <button 
                onClick={onExit}
                className="w-full max-w-xs bg-white text-red-600 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
                <XCircle className="w-6 h-6" /> {t.cancel_alarm} ({timeLeftToCancel}s)
            </button>
            <p className="mt-4 text-white/80 text-sm">Recording starts automatically...</p>
        </div>
      )}

      {/* Evidence Saved Toast Notification */}
      {lastSavedId && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-max max-w-[90%] z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="bg-slate-900/90 backdrop-blur border border-green-500/50 text-white px-4 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <div className="bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-sm font-bold text-green-400">Evidence Captured</span>
                      <span className="text-[10px] text-slate-400">Securely stored in Vault</span>
                  </div>
                  <button 
                      onClick={onExit} // Exit takes user to Summary/Vault flow
                      className="ml-2 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                      <FileText className="w-3 h-3" /> View Vault
                  </button>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <div className="flex flex-col">
                <span className="font-bold text-red-500 text-sm tracking-wider flex items-center gap-2">
                    {t.recording}
                    {triggerType !== 'MANUAL' && (
                        <span className="text-[10px] bg-red-900/50 px-1 rounded border border-red-500/30">AUTO</span>
                    )}
                </span>
                
                {/* Enhanced Upload Visualization */}
                <div className="mt-1">
                    {pendingUploads > 0 ? (
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <span className="text-[10px] text-blue-400 font-mono">UPLOADING</span>
                        </div>
                    ) : (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                            <Cloud className="w-3 h-3" /> {t.secured}
                        </span>
                    )}
                </div>
            </div>
        </div>
        
        {isCriticalTrigger && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-1 whitespace-nowrap z-20">
                <Zap className="w-3 h-3 fill-white" /> CRITICAL UPLOAD
            </div>
        )}

        <button onClick={toggleCamera} className="p-2 rounded-full bg-white/20 backdrop-blur-md">
            <RotateCcw className="w-6 h-6 text-white" />
        </button>
      </div>

      <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Analysis Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 rounded-t-3xl">
        <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${getThreatColor(currentAnalysis?.threatLevel)}`}>
            <span className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {currentAnalysis?.threatLevel || t.analyzing}
            </span>
            <span className="text-xs opacity-80">{t.threat_level}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
            <div className="bg-slate-800/80 p-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <User className="w-4 h-4" /> {t.persons}
                </div>
                <div className="text-white truncate">{currentAnalysis?.persons[0] || '-'}</div>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Car className="w-4 h-4" /> {t.vehicles}
                </div>
                <div className="text-white truncate">{currentAnalysis?.vehicles[0] || '-'}</div>
            </div>
             <div className="col-span-2 bg-slate-800/80 p-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <MapPin className="w-4 h-4" /> {t.location}
                </div>
                <div className="text-white text-xs line-clamp-2">{currentAnalysis?.locationContext || '-'}</div>
            </div>
        </div>

        <div className="flex justify-center pb-4">
            <button onClick={onExit} className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-600 group-active:scale-95 transition-transform">
                    <StopCircle className="w-8 h-8 text-white fill-current" />
                </div>
                <span className="font-bold text-white uppercase tracking-widest text-sm">{t.stop}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyMode;
