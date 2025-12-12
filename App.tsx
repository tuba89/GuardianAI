
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Radio, FileText, Globe, Cloud, ExternalLink, Settings, Zap, Smartphone, Mic, CheckCircle, Trash2 } from 'lucide-react';
import EmergencyMode from './components/EmergencyMode';
import ReportGenerator from './components/ReportGenerator';
import CommunityMap from './components/CommunityMap';
import IncidentSummary from './components/IncidentSummary';
import SmartSettingsView from './components/SmartSettings.tsx';
import Onboarding from './components/Onboarding';
import GuardianLogo from './components/GuardianLogo';
import { uploadToCloud, broadcastToCommunity } from './services/cloudService';
import { TEXTS, MOCK_INCIDENTS, VOICE_TRIGGERS } from './constants';
import { AppView, EvidenceItem, Language, IncidentMarker, TriggerType, SmartSettings, IncidentClassification } from './types';

// Speech Recognition type definition shim
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [language, setLanguage] = useState<Language>('EN');
  
  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Initialize evidence from Local Storage
  const [evidence, setEvidence] = useState<EvidenceItem[]>(() => {
    if (typeof window !== 'undefined') {
        try {
            const saved = localStorage.getItem('guardianai_evidence');
            console.log(`[App] Loading evidence: ${saved ? 'Found' : 'Empty'}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load evidence", e);
            return [];
        }
    }
    return [];
  });

  const [isListening, setIsListening] = useState(false);
  const [incidents, setIncidents] = useState<IncidentMarker[]>(MOCK_INCIDENTS);
  
  // Smart Trigger State
  const [triggerSource, setTriggerSource] = useState<TriggerType>('MANUAL');
  const [smartSettings, setSmartSettings] = useState<SmartSettings>(() => {
      try {
          const saved = localStorage.getItem('guardian_smart_settings');
          if (saved) return JSON.parse(saved);
      } catch (e) {}
      return {
          powerButton: true,
          airplaneMode: true,
          simEject: true,
          movement: true,
          unlockFailed: true,
          geofence: false,
          safeZones: [],
          demoMode: false,
          stealthMode: true, // Default to true for better security
          contacts: []
      };
  });

  const recognitionRef = useRef<any>(null);

  const t = TEXTS[language];
  const isRTL = language === 'AR';

  // Show Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Load basic settings from local storage
  useEffect(() => {
    const savedLang = localStorage.getItem('guardian_lang');
    const onboarded = localStorage.getItem('guardian_onboarded');
    
    if (savedLang) setLanguage(savedLang as Language);
    if (onboarded === 'true') {
        setView(AppView.DASHBOARD);
        setIsListening(true); // Auto-enable voice on return
    }
  }, []);

  // Persist evidence changes to Local Storage
  useEffect(() => {
    try {
        localStorage.setItem('guardianai_evidence', JSON.stringify(evidence));
    } catch (e) {
        console.error("Failed to save evidence to storage", e);
    }
  }, [evidence]);

  // Persist Smart Settings
  useEffect(() => {
      try {
          localStorage.setItem('guardian_smart_settings', JSON.stringify(smartSettings));
      } catch(e) {}
  }, [smartSettings]);

  const handleOnboardingComplete = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('guardian_lang', lang);
      localStorage.setItem('guardian_onboarded', 'true');
      setView(AppView.DASHBOARD);
      setIsListening(true);
  };

  const pendingUploads = evidence.filter(e => e.backupStatus === 'uploading' || e.backupStatus === 'pending').length;

  // Background Cloud Upload Worker
  useEffect(() => {
    const processUploads = async () => {
        const pendingItems = evidence.filter(e => e.backupStatus === 'pending');
        if (pendingItems.length === 0) return;

        setEvidence(prev => prev.map(item => 
            item.backupStatus === 'pending' ? { ...item, backupStatus: 'uploading' } : item
        ));

        for (const item of pendingItems) {
            // Pass contacts for simulation
            await uploadToCloud(item.id, smartSettings.contacts);
            setEvidence(prev => prev.map(e => 
                e.id === item.id ? { ...e, backupStatus: 'secured' } : e
            ));
        }
    };
    processUploads();
  }, [evidence, smartSettings.contacts]);

  // Voice Activation
  useEffect(() => {
    if (view === AppView.ONBOARDING || showSplash) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = language === 'AR' ? 'ar-DZ' : (language === 'FR' ? 'fr-FR' : 'en-US');

        recognition.onresult = (event: any) => {
          const last = event.results.length - 1;
          const transcript = event.results[last][0].transcript.toLowerCase();
          
          // Check against language specific triggers
          const triggers = VOICE_TRIGGERS[language];
          if (triggers.some(trigger => transcript.includes(trigger))) {
            console.log("Voice trigger detected:", transcript);
            setTriggerSource('VOICE');
            setView(AppView.EMERGENCY);
          }
        };
        recognition.onend = () => { if (isListening) recognition.start(); };
        recognitionRef.current = recognition;
    } else {
        recognitionRef.current.lang = language === 'AR' ? 'ar-DZ' : (language === 'FR' ? 'fr-FR' : 'en-US');
    }

    if (isListening) {
        try { recognitionRef.current.start(); } catch(e) {}
    } else {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    return () => { try { recognitionRef.current.stop(); } catch(e) {} };
  }, [isListening, language, view, showSplash]);

  // Movement Detection (Shake)
  useEffect(() => {
    if (!smartSettings.movement || view === AppView.EMERGENCY) return;

    const handleMotion = (event: DeviceMotionEvent) => {
        const acc = event.acceleration;
        if (!acc) return;
        const totalAcc = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
        
        if (totalAcc > 30) {
            handleTrigger('MOVEMENT');
        }
    };

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion);
    }
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [smartSettings.movement, view]);

  const handleTrigger = (type: TriggerType) => {
      setTriggerSource(type);
      setView(AppView.EMERGENCY);
  };

  const handleEvidenceCaptured = useCallback((item: EvidenceItem) => {
    console.log("Evidence Captured:", item.id);
    setEvidence(prev => {
        // Keep only last 50 items to prevent localStorage overflow
        const updated = [item, ...prev].slice(0, 50);
        return updated;
    });
  }, []);

  const handleClassifyEvidence = useCallback((id: string, type: IncidentClassification) => {
      setEvidence(prev => prev.map(e => e.id === id ? { ...e, classification: type } : e));
  }, []);

  const handleClearEvidence = useCallback(() => {
    setEvidence([]);
    setIncidents(MOCK_INCIDENTS); // Reset community map to defaults
    localStorage.removeItem('guardianai_evidence');
    console.log("[App] Evidence vault cleared.");
    showToast("Evidence Vault Cleared", "success");
  }, []);

  const handleCommunityShare = async (id: string) => {
     setEvidence(prev => prev.map(e => e.id === id ? { ...e, isShared: true } : e));
     const result = await broadcastToCommunity(id);
     setEvidence(prev => prev.map(e => e.id === id ? { ...e, sightings: result.sightings } : e));
     
     const item = evidence.find(e => e.id === id);
     if (item && item.analysis) {
         setIncidents(prev => [
             {
                 id: `user-${Date.now()}`,
                 lat: item.latitude || 36.75,
                 lng: item.longitude || 3.05,
                 type: 'Theft', // Still used internally for coloring, but mapped to neutral text in Map
                 description: 'Incident Reported by User',
                 time: 'Just now',
                 isUserReported: true
             },
             ...prev
         ]);
     }
  };

  const toggleLanguage = () => {
       setLanguage(l => l === 'EN' ? 'FR' : (l === 'FR' ? 'AR' : 'EN'));
  };

  const renderDashboard = () => (
    <div className={`flex-1 flex flex-col p-5 max-w-md mx-auto w-full ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* PROFESSIONAL HEADER */}
      <header className="flex justify-between items-center bg-transparent mb-4">
        <div className="flex-1"></div> {/* Spacer */}
        <div className="flex gap-3">
             <button 
                onClick={toggleLanguage}
                className="p-2 rounded-xl bg-slate-800/80 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 font-bold w-10 h-10 flex items-center justify-center text-[10px] transition-all"
            >
                {language}
            </button>
        </div>
      </header>

      {/* CENTERED BRANDING SECTION - LARGER & GLOWING */}
      <div className="flex flex-col items-center justify-center pt-6 pb-8 animate-in fade-in zoom-in duration-700">
             {/* Logo - Increased to 96px (w-24 h-24) */}
             <div className="w-24 h-24 mb-6 drop-shadow-[0_0_35px_rgba(59,130,246,0.4)]">
                 <GuardianLogo variant="icon" animated />
             </div>
             
             {/* Title */}
             <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white text-center leading-tight drop-shadow-sm mb-3">
                 Guardian<span className="text-blue-500">AI</span>
             </h1>
             
             {/* Tagline */}
             <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-[0.25em] text-center opacity-70">
                 Global Safety Network
             </p>
             
             {/* Voice Hint Badge */}
             {isListening && (
                 <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                     <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm shadow-lg hover:bg-white/10 transition-colors cursor-default">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        <span className="text-[11px] text-slate-300 font-medium tracking-wide">
                            Say <span className="text-white font-bold px-0.5">"Help"</span> for instant protection
                        </span>
                     </div>
                 </div>
             )}
        </div>

        {/* SOS Button */}
        <div className="py-2 mb-6">
            <button 
              onClick={() => { setTriggerSource('MANUAL'); setView(AppView.EMERGENCY); }}
              className="w-full aspect-square max-w-[260px] mx-auto rounded-full bg-gradient-to-br from-red-600 to-red-900 shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col items-center justify-center transform active:scale-95 transition-all duration-200 border-8 border-slate-800 relative group overflow-hidden"
            >
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
               <div className="relative z-10 flex flex-col items-center">
                   <Shield className="w-24 h-24 text-white mb-3 animate-pulse drop-shadow-xl" strokeWidth={1.5} />
                   <span className="text-5xl font-black text-white tracking-widest drop-shadow-md">{t.sos}</span>
                   <span className="text-red-200 text-sm mt-2 opacity-90 font-bold tracking-wider uppercase bg-red-950/30 px-3 py-1 rounded-full">{t.start_monitoring}</span>
               </div>
            </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center shadow-md">
                <div className="flex items-center gap-2 mb-1">
                    <Cloud className={`w-4 h-4 ${pendingUploads > 0 ? 'text-blue-400 animate-pulse' : 'text-green-500'}`} />
                    <span className="text-xs text-slate-400 font-medium">{t.cloud_backup}</span>
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                    {pendingUploads > 0 ? t.uploading : t.secured}
                </span>
            </div>
            
             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center shadow-md active:bg-slate-700 cursor-pointer transition-colors" onClick={() => setView(AppView.SETTINGS)}>
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-slate-400 font-medium">{t.settings}</span>
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                    {smartSettings.contacts.length > 0 ? `${smartSettings.contacts.length} Contacts` : 'Setup Needed'}
                </span>
            </div>
        </div>

        {/* Voice Toggle */}
        <div 
            onClick={() => setIsListening(!isListening)}
            className={`p-5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all shadow-lg mb-4 ${isListening ? 'bg-slate-800/80 border-red-500/20 shadow-red-900/10' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isListening ? 'bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-700 text-slate-400'}`}>
                    <Mic className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg">Voice Guard</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">{isListening ? 'Microphone Active' : 'Microphone Paused'}</p>
                </div>
            </div>
            <div className={`w-3 h-3 rounded-full transition-colors ${isListening ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
        </div>

        {/* Map Section */}
        <div className="space-y-3 pt-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                <Globe className="w-5 h-5 text-blue-500" />
                {t.community_map}
            </h2>
            <CommunityMap incidents={incidents} />
        </div>
    </div>
  );

  // Splash Screen Render
  if (showSplash) {
      return (
          <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center animate-out fade-out duration-500">
              <div className="animate-in zoom-in duration-700 flex flex-col items-center">
                  <div className="w-64 h-64 mb-6">
                      <GuardianLogo variant="full" animated />
                  </div>
                  <div className="mt-16 opacity-0 animate-in fade-in slide-in-from-bottom-4 delay-500 duration-700">
                      <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] text-center font-bold mb-3">Powered By</p>
                      <div className="flex items-center gap-3 bg-slate-800 px-6 py-3 rounded-full border border-slate-700 shadow-xl">
                          <Zap className="w-5 h-5 text-purple-400 fill-current" />
                          <span className="text-xl font-bold text-white tracking-tight">Gemini 3</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen bg-slate-900 text-white ${isRTL ? 'font-arabic' : ''}`}>
      
      {/* Toast Notification */}
      {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl border ${
                  toast.type === 'success' ? 'bg-green-900/90 border-green-500/50 text-green-100' : 
                  toast.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' : 
                  'bg-slate-800/90 border-slate-600 text-white'
              }`}>
                  {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {toast.type === 'error' && <Shield className="w-4 h-4" />}
                  <span className="text-sm font-bold">{toast.message}</span>
              </div>
          </div>
      )}

      {/* Content Rendering */}
      <div className="pb-24">
          {view === AppView.ONBOARDING && (
            <Onboarding onComplete={handleOnboardingComplete} />
          )}
          {view === AppView.EMERGENCY && (
            <EmergencyMode 
                language={language}
                triggerType={triggerSource}
                onExit={() => setView(AppView.SUMMARY)} 
                onEvidenceCaptured={handleEvidenceCaptured}
                pendingUploads={pendingUploads}
                isStealth={smartSettings.stealthMode}
                isDemo={smartSettings.demoMode}
            />
          )}
          {view === AppView.SUMMARY && (
            <IncidentSummary 
                language={language}
                evidence={evidence}
                onShare={handleCommunityShare}
                onClassify={handleClassifyEvidence}
                onClose={() => setView(AppView.DASHBOARD)}
            />
          )}
          {view === AppView.REPORT && (
            <>
               {/* Custom header for Report view to include language toggle */}
               <div className="fixed top-0 right-0 p-4 z-20">
                   <button 
                        onClick={toggleLanguage}
                        className="p-2 rounded-xl bg-slate-800/80 backdrop-blur text-slate-400 hover:text-white border border-slate-700 font-bold w-10 h-10 flex items-center justify-center text-[10px]"
                    >
                        {language}
                    </button>
               </div>
               <ReportGenerator 
                    language={language}
                    evidence={evidence} 
                    onBack={() => setView(AppView.DASHBOARD)} 
                />
            </>
          )}
          {view === AppView.SETTINGS && (
            <>
                <div className="fixed top-0 right-0 p-4 z-20">
                   <button 
                        onClick={toggleLanguage}
                        className="p-2 rounded-xl bg-slate-800/80 backdrop-blur text-slate-400 hover:text-white border border-slate-700 font-bold w-10 h-10 flex items-center justify-center text-[10px]"
                    >
                        {language}
                    </button>
               </div>
                <SmartSettingsView 
                    language={language}
                    settings={smartSettings}
                    onUpdateSettings={setSmartSettings}
                    onSimulateTrigger={handleTrigger}
                    onBack={() => setView(AppView.DASHBOARD)}
                    onClearEvidence={handleClearEvidence}
                />
            </>
          )}
          {view === AppView.DASHBOARD && renderDashboard()}
      </div>

      {/* Persistent Bottom Navigation - Visible on Main Screens */}
      {(view === AppView.DASHBOARD || view === AppView.REPORT || view === AppView.SETTINGS) && (
          <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 p-4 flex justify-around z-30 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
            <button 
                onClick={() => setView(AppView.DASHBOARD)} 
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${view === AppView.DASHBOARD ? 'text-red-500 bg-red-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Shield className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide uppercase">{t.dashboard}</span>
            </button>
            <button 
                onClick={() => setView(AppView.REPORT)} 
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${view === AppView.REPORT ? 'text-red-500 bg-red-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <FileText className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide uppercase">{t.history}</span>
            </button>
            <button 
                onClick={() => setView(AppView.SETTINGS)} 
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${view === AppView.SETTINGS ? 'text-red-500 bg-red-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Settings className="w-6 h-6" />
                <span className="text-[10px] font-bold tracking-wide uppercase">{t.settings}</span>
            </button>
          </nav>
      )}
    </div>
  );
};

export default App;
