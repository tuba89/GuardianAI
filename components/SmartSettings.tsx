
import React, { useState } from 'react';
import { SmartSettings, Language, TriggerType, EmergencyContact } from '../types';
import { TEXTS, VOICE_TRIGGERS } from '../constants';
import { 
  Zap, Power, Plane, Smartphone, Activity, Lock, MapPin, 
  ChevronLeft, AlertOctagon, PlayCircle, ToggleRight, Users, Plus, Trash2, UserPlus, Hammer, ShieldCheck, Key, X, EyeOff, Mic, CheckCircle, AlertTriangle
} from 'lucide-react';

// ==========================================
// CONFIGURATION
// ==========================================
// Set this to FALSE before deploying to production
const SHOW_DEV_TOOLS = true; 
// ==========================================

interface SmartSettingsProps {
  language: Language;
  settings: SmartSettings;
  onUpdateSettings: (s: SmartSettings) => void;
  onSimulateTrigger: (t: TriggerType) => void;
  onBack: () => void;
  onClearEvidence: () => void;
}

const SmartSettingsView: React.FC<SmartSettingsProps> = ({ 
  language, settings, onUpdateSettings, onSimulateTrigger, onBack, onClearEvidence
}) => {
  const t = TEXTS[language];
  const isRTL = language === 'AR';

  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({
      relationship: 'Family'
  });
  
  const [pinMode, setPinMode] = useState<'NONE' | 'SET' | 'CONFIRM'>('NONE');
  const [tempPin, setTempPin] = useState('');

  // Pin verification for clear evidence
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false); // New custom confirmation state
  const [verifyPinInput, setVerifyPinInput] = useState('');
  const [verifyError, setVerifyError] = useState(false);

  // Voice Test State
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceTestResult, setVoiceTestResult] = useState<string | null>(null);

  const toggle = (key: keyof SmartSettings) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSetPin = (num: string) => {
      const next = tempPin + num;
      if (next.length > 4) return;
      setTempPin(next);

      if (next.length === 4) {
          if (pinMode === 'SET') {
              // Wait a bit then ask for confirm
              setTimeout(() => {
                  setTempPin('');
                  setPinMode('CONFIRM');
                  onUpdateSettings({ ...settings, vaultPin: next });
                  setPinMode('NONE');
                  setTempPin('');
              }, 500);
          }
      }
  };

  const handleAddContact = () => {
      if (newContact.name && newContact.email) {
          const contact: EmergencyContact = {
              id: Date.now().toString(),
              name: newContact.name,
              email: newContact.email,
              phone: newContact.phone,
              relationship: newContact.relationship as any || 'Family'
          };
          onUpdateSettings({
              ...settings,
              contacts: [...(settings.contacts || []), contact]
          });
          setNewContact({ relationship: 'Family' });
          setIsAddingContact(false);
      }
  };

  const removeContact = (id: string) => {
      onUpdateSettings({
          ...settings,
          contacts: settings.contacts.filter(c => c.id !== id)
      });
  };

  const attemptClearEvidence = () => {
      if (settings.vaultPin) {
          setShowPinVerify(true);
      } else {
          setShowConfirmClear(true);
      }
  };

  const executeClearEvidence = () => {
      onClearEvidence();
      setShowConfirmClear(false);
      setShowPinVerify(false);
      setVerifyPinInput('');
  };

  const handleVerifyPinInput = (num: string) => {
      const next = verifyPinInput + num;
      if (next.length > 4) return;
      setVerifyPinInput(next);
      setVerifyError(false);

      if (next.length === 4) {
          if (next === settings.vaultPin) {
               // Success
               setTimeout(() => {
                   executeClearEvidence();
               }, 300);
          } else {
              // Error
              setVerifyError(true);
              setTimeout(() => {
                  setVerifyPinInput('');
              }, 500);
          }
      }
  };

  const handleTestVoice = () => {
      if (isTestingVoice) return;
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Voice recognition not supported in this browser.");
          return;
      }

      setIsTestingVoice(true);
      setVoiceTestResult(null);

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = language === 'AR' ? 'ar-DZ' : (language === 'FR' ? 'fr-FR' : 'en-US');
      
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          const triggers = VOICE_TRIGGERS[language];
          if (triggers.some(trigger => transcript.includes(trigger))) {
              setVoiceTestResult(`✓ Recognized: "${transcript}"`);
          } else {
               setVoiceTestResult(`✗ Heard: "${transcript}" (No trigger match)`);
          }
          setIsTestingVoice(false);
      };
      recognition.onerror = () => {
          setVoiceTestResult("Error: Could not hear voice.");
          setIsTestingVoice(false);
      }
      recognition.onend = () => {
           if (!voiceTestResult) setIsTestingVoice(false);
      };

      try { recognition.start(); } catch(e) { setIsTestingVoice(false); }
  };

  const TriggerItem = ({ 
    icon: Icon, label, description, active, toggleKey, triggerType 
  }: { 
    icon: any, label: string, description?: string, active: boolean, toggleKey: keyof SmartSettings, triggerType: TriggerType 
  }) => (
    <div className={`p-4 rounded-xl border mb-3 transition-all duration-300 ${active ? 'bg-slate-800 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-800/50 border-slate-700 opacity-80'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${active ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm text-white">{label}</span>
        </div>
        <button 
          onClick={() => toggle(toggleKey)}
          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors relative ${active ? 'bg-green-500 shadow-inner' : 'bg-slate-600'}`}
          aria-label={`Toggle ${label}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${active ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
        </button>
      </div>
      
      {description && <p className="text-[11px] text-slate-400 mb-3 ml-[52px] leading-relaxed">{description}</p>}

      {active && (
        <div className="ml-[52px]">
          <button 
            onClick={() => onSimulateTrigger(triggerType)}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-blue-300 flex items-center gap-2 transition-all border border-slate-600 hover:border-blue-400/50 group"
          >
            <PlayCircle className="w-3 h-3 group-hover:text-blue-400 transition-colors" /> 
            {t.simulation}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-white pb-32 ${isRTL ? 'font-arabic' : ''} relative`}>
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-950/90 backdrop-blur-xl z-20 px-4 py-4 border-b border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white text-slate-400 transition-colors border border-slate-700">
              <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              <Zap className="w-6 h-6 text-yellow-500 fill-current" />
              {t.settings}
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">

        {/* Vault Security Section */}
        <section>
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> {t.security.title}
             </h2>
             <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
                 {/* Decorative Glow */}
                 <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full group-hover:bg-green-500/20 transition-all"></div>

                 <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${settings.vaultPin ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-white">{t.security.enable_pin}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                {settings.vaultPin ? (
                                    <><span className="text-green-500">●●●●</span> Active</>
                                ) : (
                                    'Not Configured'
                                )}
                            </p>
                        </div>
                    </div>
                    {!settings.vaultPin ? (
                        <button 
                           onClick={() => setPinMode('SET')}
                           className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95"
                        >
                           {t.security.set_pin}
                        </button>
                    ) : (
                        <button 
                           onClick={() => onUpdateSettings({ ...settings, vaultPin: undefined })}
                           className="px-4 py-2 bg-slate-800 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 rounded-lg text-xs font-bold transition-all"
                        >
                           Disable
                        </button>
                    )}
                 </div>

                 {pinMode === 'SET' && (
                     <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 animate-in fade-in zoom-in-95 mt-4">
                         <p className="text-center text-sm mb-6 font-bold text-white">{t.security.set_pin}</p>
                         <div className="flex justify-center gap-4 mb-8">
                             {[1,2,3,4].map(i => (
                                 <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${tempPin.length >= i ? 'bg-green-500 scale-110 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-800'}`} />
                             ))}
                         </div>
                         <div className="grid grid-cols-3 gap-3">
                             {[1,2,3,4,5,6,7,8,9].map(n => (
                                 <button 
                                   key={n} 
                                   onClick={() => handleSetPin(n.toString())}
                                   className="h-12 bg-slate-800 rounded-lg font-bold text-lg hover:bg-slate-700 active:bg-slate-600 transition-colors text-white"
                                 >
                                     {n}
                                 </button>
                             ))}
                             <div />
                             <button 
                                  onClick={() => handleSetPin('0')}
                                  className="h-12 bg-slate-800 rounded-lg font-bold text-lg hover:bg-slate-700 active:bg-slate-600 transition-colors text-white"
                             >0</button>
                             <button onClick={() => { setPinMode('NONE'); setTempPin(''); }} className="text-xs text-red-400 font-bold hover:text-red-300">Cancel</button>
                         </div>
                     </div>
                 )}
             </div>
        </section>
        
        {/* Stealth Mode Section */}
        <section>
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <EyeOff className="w-4 h-4" /> {t.stealth.title}
             </h2>
             <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                    <div className="max-w-[75%]">
                        <p className="text-sm font-bold text-white mb-1">{t.stealth.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{t.stealth.desc}</p>
                    </div>
                    <div 
                        onClick={() => toggle('stealthMode')}
                        className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors relative ${settings.stealthMode ? 'bg-green-500 shadow-inner' : 'bg-slate-600'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.stealthMode ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
                    </div>
                </div>
             </div>
        </section>

        {/* Emergency Contacts Section */}
        <section>
            <div className="flex items-center justify-between mb-3 ml-1">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t.contacts.title}
                </h2>
                {(!settings.contacts || settings.contacts.length < 3) && !isAddingContact && (
                    <button 
                      onClick={() => setIsAddingContact(true)}
                      className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        <Plus className="w-3 h-3" /> {t.contacts.add}
                    </button>
                )}
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-lg">
                {settings.contacts && settings.contacts.length > 0 ? (
                    settings.contacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                    {contact.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        {contact.name}
                                        <span className="text-[9px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 uppercase tracking-wide">{contact.relationship}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">{contact.email}</div>
                                </div>
                            </div>
                            <button onClick={() => removeContact(contact.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    !isAddingContact && (
                      <div className="text-center py-8 flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6 text-slate-600" />
                          </div>
                          <p className="text-xs text-slate-500 italic max-w-[200px]">{t.contacts.empty}</p>
                      </div>
                    )
                )}

                {isAddingContact && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-blue-500/30 animate-in fade-in zoom-in-95">
                        <h4 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-wide">New Trusted Contact</h4>
                        <div className="space-y-3">
                            <input 
                              type="text" 
                              placeholder={t.contacts.name}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors text-white"
                              value={newContact.name || ''}
                              onChange={e => setNewContact({...newContact, name: e.target.value})}
                            />
                            <input 
                              type="email" 
                              placeholder={t.contacts.email}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors text-white"
                              value={newContact.email || ''}
                              onChange={e => setNewContact({...newContact, email: e.target.value})}
                            />
                            <div className="flex gap-2">
                               <input 
                                  type="tel" 
                                  placeholder={t.contacts.phone}
                                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition-colors text-white"
                                  value={newContact.phone || ''}
                                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                               />
                               <div className="relative">
                                   <select 
                                      className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none appearance-none pr-8 text-white h-full"
                                      value={newContact.relationship}
                                      onChange={e => setNewContact({...newContact, relationship: e.target.value as any})}
                                   >
                                       <option value="Family">Family</option>
                                       <option value="Friend">Friend</option>
                                       <option value="Colleague">Work</option>
                                       <option value="Other">Other</option>
                                   </select>
                               </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-700/50">
                                <button 
                                  onClick={() => setIsAddingContact(false)}
                                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                  onClick={handleAddContact}
                                  disabled={!newContact.name || !newContact.email}
                                  className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-white"
                                >
                                    Save Contact
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* Demo Mode & Voice Test */}
        <section className="bg-slate-900 p-5 rounded-2xl border border-purple-500/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="font-bold text-purple-400 flex items-center gap-2">
                    <ToggleRight className="w-5 h-5" /> {t.demo_mode}
                </span>
                <div 
                  onClick={() => toggle('demoMode')}
                  className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors relative ${settings.demoMode ? 'bg-purple-600 shadow-inner' : 'bg-slate-700'}`}
                  >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.demoMode ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
                </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-6 leading-relaxed relative z-10">Enables simulated triggers and faster mock uploads for demonstration.</p>

            {/* Voice Activation Test Button */}
            {settings.demoMode && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-purple-500/20 relative z-10">
                     <div className="flex justify-between items-center mb-3">
                        <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Voice Check</p>
                        {isTestingVoice && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>}
                     </div>
                     
                     <div className="flex flex-col gap-3">
                         <button 
                           onClick={handleTestVoice}
                           disabled={isTestingVoice}
                           className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${isTestingVoice ? 'bg-slate-800 text-purple-400 border border-purple-500/50' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}`}
                         >
                             <Mic className={`w-4 h-4 ${isTestingVoice ? 'animate-pulse' : ''}`} />
                             {isTestingVoice ? 'Listening for "Help" or "SOS"...' : 'Test Voice Recognition'}
                         </button>
                         {voiceTestResult && (
                             <div className={`text-xs p-2 rounded-lg text-center font-bold ${voiceTestResult.startsWith('✓') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                 {voiceTestResult}
                             </div>
                         )}
                     </div>
                </div>
            )}
        </section>

        {/* Triggers Grid */}
        <div className="space-y-1 pt-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" /> Active Triggers
          </h2>
          <TriggerItem 
            icon={Power} 
            label={t.triggers.power} 
            description={t.trigger_descriptions?.power}
            active={settings.powerButton} 
            toggleKey="powerButton"
            triggerType="POWER_BUTTON"
          />
          <TriggerItem 
            icon={Plane} 
            label={t.triggers.airplane} 
            description={t.trigger_descriptions?.airplane}
            active={settings.airplaneMode} 
            toggleKey="airplaneMode"
            triggerType="AIRPLANE_MODE"
          />
          <TriggerItem 
            icon={Smartphone} 
            label={t.triggers.sim} 
            description={t.trigger_descriptions?.sim}
            active={settings.simEject} 
            toggleKey="simEject"
            triggerType="SIM_EJECT"
          />
          <TriggerItem 
            icon={Activity} 
            label={t.triggers.movement} 
            description={t.trigger_descriptions?.movement}
            active={settings.movement} 
            toggleKey="movement"
            triggerType="MOVEMENT"
          />
          <TriggerItem 
            icon={Lock} 
            label={t.triggers.unlock} 
            description={t.trigger_descriptions?.unlock}
            active={settings.unlockFailed} 
            toggleKey="unlockFailed"
            triggerType="UNLOCK_FAILED"
          />
          <TriggerItem 
            icon={MapPin} 
            label={t.triggers.geofence} 
            description={t.trigger_descriptions?.geofence}
            active={settings.geofence} 
            toggleKey="geofence"
            triggerType="GEOFENCE"
          />
        </div>

        {/* Smart Protection Info */}
        <div className="mt-8 p-5 bg-gradient-to-br from-red-900/30 to-slate-900 border border-red-500/30 rounded-2xl shadow-lg">
          <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5" />
            Smart Protection Mode
          </h3>
          <p className="text-xs text-red-100/70 leading-relaxed">
            GuardianAI monitors sensors in the background. If unauthorized access is detected (e.g., SIM ejection or forced power off), it will instantly capture evidence and upload it to the cloud to help you recover your device.
          </p>
        </div>

        {/* Developer Tools Section - Conditional Render */}
        {SHOW_DEV_TOOLS && (
            <div className="mt-8 border border-red-900/30 bg-red-950/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                
                <h3 className="text-sm font-black text-red-500 mb-4 uppercase tracking-wider flex items-center gap-2 relative z-10">
                    <Hammer className="w-4 h-4" /> Developer Zone
                </h3>
                <p className="text-[10px] text-red-300/70 mb-6 font-mono relative z-10">
                    CAUTION: Actions here are destructive and intended for testing only. Disable `SHOW_DEV_TOOLS` before production.
                </p>
                
                <button 
                    onClick={attemptClearEvidence}
                    className="w-full py-4 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/60 rounded-xl text-red-400 font-bold flex items-center justify-center gap-2 transition-all group relative z-10 active:scale-95"
                >
                    <Trash2 className="w-4 h-4 group-hover:animate-bounce" /> 
                    {t.clear_evidence || "Clear All Test Evidence"}
                </button>
            </div>
        )}
      </div>
      
      {/* Custom Confirmation Modal for Clearing Evidence */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Delete All Evidence?</h3>
                <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
                    This action is <span className="text-white font-bold">permanent</span> and cannot be undone. All locally stored incident reports and photos will be erased.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConfirmClear(false)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeClearEvidence}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-900/20 transition-colors"
                    >
                        Yes, Delete All
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PIN Verification Overlay */}
      {showPinVerify && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="w-full max-w-sm">
                  <div className="flex justify-between items-center mb-8">
                       <h3 className="text-xl font-bold text-white">Security Verification</h3>
                       <button onClick={() => { setShowPinVerify(false); setVerifyPinInput(''); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
                           <X className="w-5 h-5 text-slate-400" />
                       </button>
                  </div>
                  <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-slate-800 shadow-xl relative">
                          <Lock className="w-8 h-8 text-red-500" />
                          {verifyError && (
                              <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 animate-ping"></div>
                          )}
                      </div>
                      <p className="text-slate-400 text-sm font-medium">Enter PIN to clear evidence vault</p>
                  </div>
                  
                  <div className="flex justify-center gap-4 mb-10">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full border border-slate-700 transition-all duration-300 ${verifyPinInput.length >= i ? 'bg-red-500 border-red-500 scale-125 shadow-lg shadow-red-500/50' : 'bg-slate-800'} ${verifyError ? 'animate-shake bg-red-600' : ''}`} />
                        ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                          <button 
                              key={n} 
                              onClick={() => handleVerifyPinInput(n.toString())}
                              className="h-16 bg-slate-900 rounded-2xl font-bold text-2xl hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all text-white"
                          >
                              {n}
                          </button>
                      ))}
                      <div />
                      <button 
                          onClick={() => handleVerifyPinInput('0')}
                          className="h-16 bg-slate-900 rounded-2xl font-bold text-2xl hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all text-white"
                      >0</button>
                      <button onClick={() => { setVerifyPinInput(prev => prev.slice(0, -1)) }} className="flex items-center justify-center h-16 rounded-2xl text-slate-500 hover:text-white transition-colors">
                          <ChevronLeft className="w-6 h-6" />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SmartSettingsView;
