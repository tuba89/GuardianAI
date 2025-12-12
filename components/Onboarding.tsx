
import React, { useState, useEffect, useRef } from 'react';
import { Language, AppView } from '../types';
import { TEXTS, VOICE_TRIGGERS } from '../constants';
import { Mic, Check, ChevronRight, Globe, Shield, Camera, Lock } from 'lucide-react';
import GuardianLogo from './GuardianLogo';

interface OnboardingProps {
  onComplete: (lang: Language) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'LANG' | 'PERMISSIONS' | 'VOICE'>('LANG');
  const [selectedLang, setSelectedLang] = useState<Language>('EN');
  const [isListening, setIsListening] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const t = TEXTS[selectedLang].onboarding;
  const isRTL = selectedLang === 'AR';

  const languages: { code: Language, label: string, flag: string }[] = [
    { code: 'EN', label: 'English', flag: 'EN' },
    { code: 'FR', label: 'Français', flag: 'FR' },
    { code: 'AR', label: 'العربية', flag: 'AR' }
  ];

  // Voice Practice Logic
  useEffect(() => {
    if (step === 'VOICE' && isListening) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = selectedLang === 'AR' ? 'ar-DZ' : (selectedLang === 'FR' ? 'fr-FR' : 'en-US');
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            const triggers = VOICE_TRIGGERS[selectedLang];
            
            if (triggers.some(trigger => transcript.includes(trigger))) {
                setVoiceSuccess(true);
                setIsListening(false);
            }
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
        recognitionRef.current = recognition;
    }
  }, [step, isListening, selectedLang]);

  const handleLangSelect = (lang: Language) => {
    setSelectedLang(lang);
  };

  const requestPermissions = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          // Stop tracks immediately after granting to save battery until needed
          stream.getTracks().forEach(track => track.stop());
          setPermissionsGranted(true);
          setTimeout(() => setStep('VOICE'), 1000);
      } catch (e) {
          alert("Permissions denied. The app cannot function without camera/mic access.");
      }
  };

  const renderLangStep = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 p-4">
             <div className="w-32 h-32">
                <GuardianLogo variant="full" animated />
             </div>
        </div>
        
        <p className="text-blue-300 font-medium mb-8 text-center text-sm italic opacity-80 max-w-xs">
            "Protection that works faster than threats."
        </p>

        <p className="text-slate-400 mb-6 text-center text-xs uppercase tracking-widest font-semibold">
            Select Language / Choisir la langue
        </p>
        
        <div className="grid gap-3 w-full max-w-sm mb-8">
            {languages.map(l => {
                const isSelected = selectedLang === l.code;
                return (
                    <button
                        key={l.code}
                        onClick={() => handleLangSelect(l.code)}
                        className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                            isSelected 
                            ? 'bg-blue-600 border-2 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-[1.02] z-10' 
                            : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 opacity-80 hover:opacity-100'
                        }`}
                    >
                        <div className="flex items-center gap-4 z-10">
                            <span className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg border ${isSelected ? 'bg-blue-500 border-blue-300 text-white' : 'bg-slate-900 border-slate-600 text-slate-400'}`}>
                                {l.flag}
                            </span>
                            <div className="flex flex-col items-start">
                                <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-200'}`}>{l.label}</span>
                                {isSelected && <span className="text-[10px] text-blue-200 animate-pulse font-medium uppercase tracking-wider">Selected</span>}
                            </div>
                        </div>
                        {isSelected && <Check className="w-6 h-6 text-white z-10 animate-in zoom-in duration-300" />}
                    </button>
                );
            })}
        </div>

        <button
            onClick={() => setStep('PERMISSIONS')}
            className="w-full max-w-sm py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
        >
            {selectedLang === 'AR' ? 'استمرار' : (selectedLang === 'FR' ? 'Continuer' : 'Continue')} 
            <ChevronRight className={`w-5 h-5 ${selectedLang === 'AR' ? 'rotate-180' : ''}`} />
        </button>
    </div>
  );

  const renderPermissionsStep = () => (
      <div className={`flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-white animate-in fade-in slide-in-from-right-4 duration-500 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-sm flex items-center mb-8">
            <button onClick={() => setStep('LANG')} className="p-2 -ml-2 text-slate-400 hover:text-white">
                <ChevronRight className={`w-6 h-6 ${isRTL ? '' : 'rotate-180'}`} />
            </button>
            <h2 className="text-xl font-bold text-center flex-1 pr-6">{t.permissions_title}</h2>
          </div>

          <div className="flex gap-4 mb-8">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 animate-bounce delay-100">
                  <Camera className="w-10 h-10 text-blue-400" />
              </div>
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 animate-bounce delay-200">
                  <Mic className="w-10 h-10 text-red-400" />
              </div>
          </div>

          <p className="text-center text-slate-400 mb-8 max-w-xs leading-relaxed">
              {t.permissions_desc}
          </p>

          <button
            onClick={requestPermissions}
            disabled={permissionsGranted}
            className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${permissionsGranted ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
            {permissionsGranted ? (
                <>
                   <Check className="w-5 h-5" /> {t.granted}
                </>
            ) : (
                <>
                   <Lock className="w-5 h-5" /> {t.grant}
                </>
            )}
        </button>
      </div>
  );

  const renderVoiceStep = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-white animate-in fade-in slide-in-from-right-4 duration-500 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm flex items-center mb-8">
            <button onClick={() => setStep('PERMISSIONS')} className="p-2 -ml-2 text-slate-400 hover:text-white">
                <ChevronRight className={`w-6 h-6 ${isRTL ? '' : 'rotate-180'}`} />
            </button>
            <h2 className="text-xl font-bold text-center flex-1 pr-6">{t.voice_setup}</h2>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 w-full max-w-sm text-center mb-8 shadow-xl">
            <p className="text-slate-400 text-sm mb-4 uppercase tracking-wider font-semibold">
                {voiceSuccess ? "✓ Voice Recognized!" : t.say_phrase}
            </p>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-2">
                {voiceSuccess ? (
                    <div className="text-green-400 font-bold">
                        <p className="mb-2">GuardianAI is now active.</p>
                        <p className="text-xs text-slate-400 font-normal">You can activate it anytime by saying:</p>
                    </div>
                ) : (
                    <h3 className="text-2xl font-black text-red-500 tracking-wider">
                        "{VOICE_TRIGGERS[selectedLang][0].toUpperCase()}"
                    </h3>
                )}
            </div>
            {/* Show all triggers */}
            <div className="flex flex-wrap justify-center gap-2 mt-3">
                {VOICE_TRIGGERS[selectedLang].map(trig => (
                    <span key={trig} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">
                        {trig}
                    </span>
                ))}
            </div>
        </div>

        <div className="mb-12 relative">
            <button
                onClick={() => { setVoiceSuccess(false); setIsListening(true); }}
                disabled={voiceSuccess}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${voiceSuccess ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] scale-110' : isListening ? 'bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
                {voiceSuccess ? (
                    <Check className="w-10 h-10 text-white animate-in zoom-in" />
                ) : (
                    <Mic className={`w-10 h-10 text-white ${isListening ? 'animate-pulse' : ''}`} />
                )}
            </button>
            {isListening && (
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-slate-400 animate-pulse font-medium">
                    {t.listening}
                </div>
            )}
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
            <button 
                onClick={() => onComplete(selectedLang)}
                className={`w-full py-4 rounded-xl font-bold transition-all ${voiceSuccess ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 scale-105' : 'bg-slate-800 text-slate-500'}`}
                disabled={!voiceSuccess}
            >
                {t.finish}
            </button>
            <button 
                onClick={() => onComplete(selectedLang)}
                className="text-slate-500 text-sm hover:text-white transition-colors py-2"
            >
                {t.skip}
            </button>
        </div>
    </div>
  );

  switch(step) {
      case 'LANG': return renderLangStep();
      case 'PERMISSIONS': return renderPermissionsStep();
      case 'VOICE': return renderVoiceStep();
  }
};

export default Onboarding;
