
import React, { useState } from 'react';
import { SmartSettings, Language, TriggerType, EmergencyContact } from '../types';
import { TEXTS } from '../constants';
import { 
  Zap, Power, Plane, Smartphone, Activity, Lock, MapPin, 
  ChevronLeft, AlertOctagon, PlayCircle, ToggleRight, Users, Plus, Trash2, UserPlus, Hammer, ShieldCheck, Key, X, EyeOff
} from 'lucide-react';

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
  const [verifyPinInput, setVerifyPinInput] = useState('');
  const [verifyError, setVerifyError] = useState(false);

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
          if (confirm(t.confirm_clear || "Are you sure? This will delete all stored evidence permanently.")) {
              onClearEvidence();
          }
      }
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
                   setShowPinVerify(false);
                   setVerifyPinInput('');
                   onClearEvidence();
                   alert("Evidence cleared successfully.");
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

  const TriggerItem = ({ 
    icon: Icon, label, active, toggleKey, triggerType 
  }: { 
    icon: any, label: string, active: boolean, toggleKey: keyof SmartSettings, triggerType: TriggerType 
  }) => (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <div 
          onClick={() => toggle(toggleKey)}
          className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${active ? 'bg-green-500' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${active ? (isRTL ? '-translate-x-6' : 'translate-x-6') : ''}`} />
        </div>
      </div>
      
      {active && (
        <button 
          onClick={() => onSimulateTrigger(triggerType)}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-blue-300 flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-500"
        >
          <PlayCircle className="w-3 h-3" /> {t.simulation}
        </button>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-900 text-white p-4 pb-20 ${isRTL ? 'font-arabic' : ''} relative`}>
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-900 z-10 py-2">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
            <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            {t.settings}
          </h1>
        </div>
      </div>

      {/* Vault Security Section */}
      <div className="mb-8">
           <h2 className="text-lg font-bold flex items-center gap-2 text-green-400 mb-4">
              <ShieldCheck className="w-5 h-5" /> {t.security.title}
           </h2>
           <div className="bg-slate-800 rounded-xl border border-green-500/30 p-4">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-700 rounded-lg text-green-400">
                          <Key className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="font-bold text-sm">{t.security.enable_pin}</p>
                          <p className="text-[10px] text-slate-400">{settings.vaultPin ? '****' : 'Not Set'}</p>
                      </div>
                  </div>
                  {!settings.vaultPin ? (
                      <button 
                         onClick={() => setPinMode('SET')}
                         className="px-3 py-1 bg-green-600 rounded text-xs font-bold"
                      >
                         {t.security.set_pin}
                      </button>
                  ) : (
                      <button 
                         onClick={() => onUpdateSettings({ ...settings, vaultPin: undefined })}
                         className="px-3 py-1 bg-slate-700 text-red-400 rounded text-xs font-bold"
                      >
                         Disable
                      </button>
                  )}
               </div>

               {pinMode === 'SET' && (
                   <div className="bg-slate-900 p-4 rounded-lg animate-in fade-in">
                       <p className="text-center text-sm mb-4">{t.security.set_pin}</p>
                       <div className="flex justify-center gap-4 mb-4">
                           {[1,2,3,4].map(i => (
                               <div key={i} className={`w-3 h-3 rounded-full ${tempPin.length >= i ? 'bg-green-500' : 'bg-slate-700'}`} />
                           ))}
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                           {[1,2,3,4,5,6,7,8,9].map(n => (
                               <button 
                                 key={n} 
                                 onClick={() => handleSetPin(n.toString())}
                                 className="h-10 bg-slate-800 rounded font-bold text-lg hover:bg-slate-700"
                               >
                                   {n}
                               </button>
                           ))}
                           <div />
                           <button 
                                onClick={() => handleSetPin('0')}
                                className="h-10 bg-slate-800 rounded font-bold text-lg hover:bg-slate-700"
                           >0</button>
                           <button onClick={() => { setPinMode('NONE'); setTempPin(''); }} className="text-xs text-red-400">Cancel</button>
                       </div>
                   </div>
               )}
           </div>
      </div>
      
      {/* Stealth Mode Section */}
      <div className="mb-8">
           <h2 className="text-lg font-bold flex items-center gap-2 text-slate-300 mb-4">
              <EyeOff className="w-5 h-5" /> {t.stealth.title}
           </h2>
           <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between">
                  <div className="max-w-[80%]">
                      <p className="text-sm font-semibold">{t.stealth.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.stealth.desc}</p>
                  </div>
                  <div 
                      onClick={() => toggle('stealthMode')}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.stealthMode ? 'bg-green-500' : 'bg-slate-600'}`}
                  >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.stealthMode ? (isRTL ? '-translate-x-6' : 'translate-x-6') : ''}`} />
                  </div>
              </div>
           </div>
      </div>

      {/* Emergency Contacts Section */}
      <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                  <Users className="w-5 h-5" /> {t.contacts.title}
              </h2>
              {(!settings.contacts || settings.contacts.length < 3) && !isAddingContact && (
                  <button 
                    onClick={() => setIsAddingContact(true)}
                    className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                  >
                      <Plus className="w-3 h-3" /> {t.contacts.add}
                  </button>
              )}
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
              {settings.contacts && settings.contacts.length > 0 ? (
                  settings.contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                          <div>
                              <div className="font-bold text-sm flex items-center gap-2">
                                  {contact.name}
                                  <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{contact.relationship}</span>
                              </div>
                              <div className="text-xs text-slate-400">{contact.email}</div>
                          </div>
                          <button onClick={() => removeContact(contact.id)} className="p-2 text-slate-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))
              ) : (
                  !isAddingContact && (
                    <div className="text-center py-4 text-slate-500 text-sm italic flex flex-col items-center gap-2">
                        <UserPlus className="w-6 h-6 opacity-50" />
                        {t.contacts.empty}
                    </div>
                  )
              )}

              {isAddingContact && (
                  <div className="bg-slate-800 p-3 rounded-lg border border-blue-500/50 animate-in fade-in zoom-in-95">
                      <div className="space-y-3">
                          <input 
                            type="text" 
                            placeholder={t.contacts.name}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            value={newContact.name || ''}
                            onChange={e => setNewContact({...newContact, name: e.target.value})}
                          />
                          <input 
                            type="email" 
                            placeholder={t.contacts.email}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                            value={newContact.email || ''}
                            onChange={e => setNewContact({...newContact, email: e.target.value})}
                          />
                          <div className="flex gap-2">
                             <input 
                                type="tel" 
                                placeholder={t.contacts.phone}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                                value={newContact.phone || ''}
                                onChange={e => setNewContact({...newContact, phone: e.target.value})}
                             />
                             <select 
                                className="bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                                value={newContact.relationship}
                                onChange={e => setNewContact({...newContact, relationship: e.target.value as any})}
                             >
                                 <option value="Family">Family</option>
                                 <option value="Friend">Friend</option>
                                 <option value="Colleague">Colleague</option>
                                 <option value="Other">Other</option>
                             </select>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                              <button 
                                onClick={() => setIsAddingContact(false)}
                                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={handleAddContact}
                                disabled={!newContact.name || !newContact.email}
                                className="px-3 py-1.5 bg-blue-600 rounded text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
                              >
                                  Save Contact
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 flex items-center gap-2">
                  <ToggleRight className="w-5 h-5" /> {t.demo_mode}
              </span>
              <div 
                onClick={() => toggle('demoMode')}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.demoMode ? 'bg-purple-500' : 'bg-slate-600'}`}
                >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${settings.demoMode ? (isRTL ? '-translate-x-6' : 'translate-x-6') : ''}`} />
              </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Enables simulated triggers and faster mock uploads for demonstration.</p>
      </div>

      <div className="space-y-1">
        <TriggerItem 
          icon={Power} 
          label={t.triggers.power} 
          active={settings.powerButton} 
          toggleKey="powerButton"
          triggerType="POWER_BUTTON"
        />
        <TriggerItem 
          icon={Plane} 
          label={t.triggers.airplane} 
          active={settings.airplaneMode} 
          toggleKey="airplaneMode"
          triggerType="AIRPLANE_MODE"
        />
        <TriggerItem 
          icon={Smartphone} 
          label={t.triggers.sim} 
          active={settings.simEject} 
          toggleKey="simEject"
          triggerType="SIM_EJECT"
        />
        <TriggerItem 
          icon={Activity} 
          label={t.triggers.movement} 
          active={settings.movement} 
          toggleKey="movement"
          triggerType="MOVEMENT"
        />
        <TriggerItem 
          icon={Lock} 
          label={t.triggers.unlock} 
          active={settings.unlockFailed} 
          toggleKey="unlockFailed"
          triggerType="UNLOCK_FAILED"
        />
        <TriggerItem 
          icon={MapPin} 
          label={t.triggers.geofence} 
          active={settings.geofence} 
          toggleKey="geofence"
          triggerType="GEOFENCE"
        />
      </div>

      <div className="mt-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
        <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5" />
          Smart Protection Mode
        </h3>
        <p className="text-xs text-red-200/70 leading-relaxed">
          GuardianAI monitors sensors in the background. If unauthorized access is detected (e.g., SIM ejection or forced power off), it will instantly capture evidence and upload it to the cloud to help you recover your device.
        </p>
      </div>

      {/* Developer Tools Section */}
      <div className="mt-6 border-t border-slate-700 pt-6">
          <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Hammer className="w-4 h-4" /> Developer Tools
          </h3>
          <p className="text-[10px] text-slate-600 mb-4">Note: These tools will be disabled in the production release.</p>
          <button 
              onClick={attemptClearEvidence}
              className="w-full py-3 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 rounded-xl text-red-400 font-bold flex items-center justify-center gap-2 transition-all"
          >
              <Trash2 className="w-4 h-4" /> {t.clear_evidence || "Clear All Test Evidence"}
          </button>
      </div>
      
      {/* PIN Verification Overlay */}
      {showPinVerify && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="w-full max-w-sm">
                  <div className="flex justify-between items-center mb-8">
                       <h3 className="text-xl font-bold text-white">Security Verification</h3>
                       <button onClick={() => { setShowPinVerify(false); setVerifyPinInput(''); }} className="p-2 bg-slate-800 rounded-full">
                           <X className="w-5 h-5" />
                       </button>
                  </div>
                  <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                          <Lock className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="text-slate-400 text-sm">Enter PIN to clear evidence vault</p>
                  </div>
                  
                  <div className="flex justify-center gap-4 mb-8">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full border border-slate-600 ${verifyPinInput.length >= i ? 'bg-red-500 border-red-500' : 'bg-transparent'} ${verifyError ? 'animate-pulse bg-red-600' : ''}`} />
                        ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                          <button 
                              key={n} 
                              onClick={() => handleVerifyPinInput(n.toString())}
                              className="h-14 bg-slate-800 rounded-xl font-bold text-xl hover:bg-slate-700 border border-slate-700"
                          >
                              {n}
                          </button>
                      ))}
                      <div />
                      <button 
                          onClick={() => handleVerifyPinInput('0')}
                          className="h-14 bg-slate-800 rounded-xl font-bold text-xl hover:bg-slate-700 border border-slate-700"
                      >0</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SmartSettingsView;
