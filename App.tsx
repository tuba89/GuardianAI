
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Radio, FileText, Globe, Cloud, ExternalLink, Settings, Zap } from 'lucide-react';
import EmergencyMode from './components/EmergencyMode';
import ReportGenerator from './components/ReportGenerator';
import CommunityMap from './components/CommunityMap';
import IncidentSummary from './components/IncidentSummary';
import SmartSettingsView from './components/SmartSettings.tsx';
import Onboarding from './components/Onboarding';
import { uploadToCloud, broadcastToCommunity } from './services/cloudService';
import { TEXTS, MOCK_INCIDENTS, VOICE_TRIGGERS } from './constants';
import { AppView, EvidenceItem, Language, IncidentMarker, TriggerType, SmartSettings } from './types';

// Speech Recognition type definition shim
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [language, setLanguage] = useState<Language>('EN');
  
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
    if (view === AppView.ONBOARDING) return;
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
  }, [isListening, language, view]);

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

  const handleClearEvidence = useCallback(() => {
    setEvidence([]);
    setIncidents(MOCK_INCIDENTS); // Reset community map to defaults
    localStorage.removeItem('guardianai_evidence');
    console.log("[App] Evidence vault cleared.");
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

  const renderDashboard = () => (
    <div className={`min-h-screen pb-24 ${isRTL ? 'font-arabic' : ''} bg-slate-900 text-white`}>
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight">{t.app_name}</h1>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => {
                   setLanguage(l => l === 'EN' ? 'FR' : (l === 'FR' ? 'AR' : 'EN'));
                }}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 font-bold w-10 h-10 flex items-center justify-center text-xs"
            >
                {language}
            </button>
            <button
                onClick={() => setView(AppView.SETTINGS)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            >
                <Settings className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        
        {/* Persistent Voice Reminder */}
        {isListening && (
            <div className="bg-slate-800/50 rounded-lg p-2 text-center border border-slate-700/50">
                <p className="text-xs text-slate-500">
                    Say <span className="font-bold text-red-400">"{VOICE_TRIGGERS[language][0]}"</span> for help
                </p>
            </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                    <Cloud className={`w-4 h-4 ${pendingUploads > 0 ? 'text-blue-400 animate-pulse' : 'text-green-500'}`} />
                    <span className="text-xs text-slate-400">{t.cloud_backup}</span>
                </div>
                <span className="text-sm font-semibold text-white">
                    {pendingUploads > 0 ? t.uploading : t.secured}
                </span>
            </div>
            
             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center" onClick={() => setView(AppView.SETTINGS)}>
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-slate-400">{t.settings}</span>
                </div>
                <span className="text-sm font-semibold text-white">
                    {smartSettings.contacts.length > 0 ? `${smartSettings.contacts.length} Contacts` : 'Setup Needed'}
                </span>
            </div>
        </div>

        {/* SOS Button */}
        <button 
          onClick={() => { setTriggerSource('MANUAL'); setView(AppView.EMERGENCY); }}
          className="w-full aspect-square rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col items-center justify-center transform active:scale-95 transition-all duration-200 border-8 border-slate-800 relative group overflow-hidden"
        >
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
           <Shield className="w-20 h-20 text-white mb-2 animate-pulse" />
           <span className="text-4xl font-black text-white tracking-widest">{t.sos}</span>
           <span className="text-red-200 text-sm mt-2 opacity-80">{t.start_monitoring}</span>
        </button>

        {/* Voice Toggle */}
        <div 
            onClick={() => setIsListening(!isListening)}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${isListening ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}>
                    <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Voice Guard</h3>
                    <p className="text-xs text-slate-400">{isListening ? 'Active' : 'Inactive'}</p>
                </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500' : 'bg-slate-600'}`} />
        </div>

        {/* Map Section */}
        <div className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                {t.community_map}
            </h2>
            <CommunityMap incidents={incidents} />
        </div>

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-4 flex justify-around z-20">
        <button onClick={() => setView(AppView.DASHBOARD)} className={`flex flex-col items-center gap-1 ${view === AppView.DASHBOARD ? 'text-red-500' : 'text-slate-500'}`}>
            <Shield className="w-6 h-6" />
            <span className="text-xs font-medium">{t.dashboard}</span>
        </button>
        <button onClick={() => setView(AppView.REPORT)} className={`flex flex-col items-center gap-1 ${view === AppView.REPORT ? 'text-red-500' : 'text-slate-500'}`}>
            <FileText className="w-6 h-6" />
            <span className="text-xs font-medium">{t.history}</span>
        </button>
      </nav>
    </div>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
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
            onClose={() => setView(AppView.DASHBOARD)}
        />
      )}
      {view === AppView.REPORT && (
        <ReportGenerator 
            language={language}
            evidence={evidence} 
            onBack={() => setView(AppView.DASHBOARD)} 
        />
      )}
      {view === AppView.SETTINGS && (
        <SmartSettingsView 
            language={language}
            settings={smartSettings}
            onUpdateSettings={setSmartSettings}
            onSimulateTrigger={handleTrigger}
            onBack={() => setView(AppView.DASHBOARD)}
            onClearEvidence={handleClearEvidence}
        />
      )}
      {view === AppView.DASHBOARD && renderDashboard()}
    </div>
  );
};

export default App;
