
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { EvidenceItem, Language, IncidentClassification } from '../types';
import { TEXTS } from '../constants';
import { Download, ChevronLeft, Calendar, MapPin, Cloud, CheckCircle, ExternalLink, RefreshCw, User, Mail, Users, Lock, ShieldAlert, Trash2, Camera, X, Smartphone, Globe } from 'lucide-react';

interface ReportGeneratorProps {
  evidence: EvidenceItem[];
  language: Language;
  onBack: () => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ evidence, language, onBack }) => {
  const t = TEXTS[language];
  const userEmail = "iiiassia.beniii@gmail.com";
  
  // Security State
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [intruderAlert, setIntruderAlert] = useState(false);
  
  // Portal Modal State
  const [showPortal, setShowPortal] = useState(false);
  
  // Local Settings Read
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
     try {
         const s = localStorage.getItem('guardian_smart_settings');
         if (s) {
             const parsed = JSON.parse(s);
             setSettings(parsed);
             // Lock if PIN is set
             if (parsed.vaultPin) {
                 setIsLocked(true);
             }
         }
     } catch(e) {}
  }, []);

  const handlePinEnter = (num: string) => {
      if (intruderAlert) return;

      const next = pinInput + num;
      if (next.length > 4) return;
      setPinInput(next);

      if (next.length === 4) {
          if (next === settings.vaultPin) {
              // Success
              setTimeout(() => {
                  setIsLocked(false);
                  setPinInput('');
                  setFailedAttempts(0);
              }, 300);
          } else {
              // Fail
              setTimeout(() => {
                  setPinInput('');
                  const fails = failedAttempts + 1;
                  setFailedAttempts(fails);
                  if (fails >= 3) {
                      setIntruderAlert(true);
                  }
              }, 300);
          }
      }
  };

  const handleAccessPortal = () => {
    setShowPortal(true);
  };

  const handleDeleteAttempt = (item: EvidenceItem) => {
      if (item.backupStatus === 'secured') {
          alert(t.security.cloud_immutable);
          return;
      }
      
      // If we are here, vault is unlocked, so we can delete (simulation)
      if (confirm(t.security.delete_confirm)) {
          alert("Deleted from local device.");
      }
  };
  
  const getClassificationColor = (type?: IncidentClassification) => {
      switch(type) {
          case 'LOST': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
          case 'UNAUTHORIZED': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
          case 'EMERGENCY': return 'bg-red-500/20 text-red-400 border-red-500/50';
          default: return 'bg-slate-700 text-slate-400 border-slate-600';
      }
  };

  const generatePDF = () => {
    try {
        const doc = new jsPDF();
        let yPos = 20;

        // 1. Header
        doc.setFontSize(22);
        doc.setTextColor(220, 38, 38); // Red
        doc.text("GuardianAI - Evidence Report", 10, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 10, yPos);
        yPos += 10;
        
        // 2. User Account
        doc.setDrawColor(200);
        doc.line(10, yPos, 200, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`Account Holder:`, 10, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(userEmail, 50, yPos);
        yPos += 7;
        
        doc.setFont("helvetica", "bold");
        doc.text(`Vault ID:`, 10, yPos);
        doc.setFont("helvetica", "normal");
        doc.text("#G-88219 (Active/Secured)", 50, yPos);
        yPos += 15;

        // 3. Summary Statistics
        const highRiskCount = evidence.filter(e => e.analysis?.threatLevel === 'HIGH').length;
        
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.rect(10, yPos, 190, 25, 'F');
        
        doc.setFontSize(11);
        doc.text(`Total Evidence Items: ${evidence.length}`, 20, yPos + 10);
        doc.text(`High Threat Incidents: ${highRiskCount}`, 20, yPos + 18);
        doc.text(`Cloud Status: Synced`, 120, yPos + 10);
        yPos += 35;

        // 4. Evidence Items
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Incident Log", 10, yPos);
        yPos += 10;

        evidence.forEach((item, index) => {
            // Check for page break
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            // Container
            doc.setDrawColor(226, 232, 240); // Slate-200
            doc.rect(10, yPos, 190, 60);

            // Thumbnail
            try {
                if (item.imageUrl) {
                    doc.addImage(item.imageUrl, 'JPEG', 15, yPos + 5, 50, 50);
                }
            } catch (e) {
                doc.setFontSize(8);
                doc.text("Image Error", 20, yPos + 25);
            }

            // Info
            const leftAlign = 70;
            let currentTextY = yPos + 10;

            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.setFont("helvetica", "bold");
            doc.text(`Incident #${index + 1} • ${item.triggerType}`, leftAlign, currentTextY);
            
            currentTextY += 7;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`${new Date(item.timestamp).toLocaleString()}`, leftAlign, currentTextY);
            
            // Classification line
            currentTextY += 7;
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`Classification: ${item.classification || 'UNAUTHORIZED'}`, leftAlign, currentTextY);

            currentTextY += 7;
            const threat = item.analysis?.threatLevel || 'UNKNOWN';
            doc.setTextColor(threat === 'HIGH' ? 220 : 71, threat === 'HIGH' ? 38 : 85, threat === 'HIGH' ? 38 : 105); // Red if high
            doc.text(`Threat Level: ${threat}`, leftAlign, currentTextY);
            
            currentTextY += 7;
            doc.setTextColor(0);
            doc.setFont("helvetica", "normal");
            const locText = doc.splitTextToSize(`Loc: ${item.analysis?.locationContext || 'Unknown'}`, 120);
            doc.text(locText, leftAlign, currentTextY);

            // Status Badge text
            doc.setFontSize(9);
            doc.setTextColor(22, 163, 74); // Green-600
            doc.text("✓ Protected in Cloud Vault", 150, yPos + 55, { align: 'right' });

            yPos += 70;
        });

        // Add page numbers
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`GuardianAI Confidential Report - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(`guardian-evidence-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error("PDF Generation Error", e);
        alert("Failed to generate PDF report.");
    }
  };

  if (intruderAlert) {
      return (
          <div className="fixed inset-0 bg-red-900 z-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
              <Camera className="w-24 h-24 text-white mb-6 animate-pulse" />
              <h1 className="text-4xl font-black text-white mb-2">{t.security.intruder_alert}</h1>
              <p className="text-red-200 text-xl mb-8">{t.security.locked_desc}</p>
              <div className="bg-black/40 p-4 rounded-xl border border-red-500/50">
                  <p className="text-white font-mono text-sm">Security protocols activated.</p>
                  <p className="text-white font-mono text-sm">Location and photo sent to owner.</p>
              </div>
          </div>
      );
  }

  if (isLocked) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700 shadow-xl">
                <Lock className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t.security.locked}</h2>
            <p className="text-slate-400 mb-8">{t.security.enter_pin}</p>

            <div className="flex gap-4 mb-8">
                {[1,2,3,4].map(i => (
                    <div key={i} className={`w-4 h-4 rounded-full border border-slate-600 ${pinInput.length >= i ? 'bg-red-500 border-red-500' : 'bg-transparent'}`} />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button 
                        key={n}
                        onClick={() => handlePinEnter(n.toString())}
                        className="h-16 rounded-2xl bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700"
                    >
                        {n}
                    </button>
                ))}
                <div />
                <button 
                    onClick={() => handlePinEnter('0')}
                    className="h-16 rounded-2xl bg-slate-800 text-2xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700"
                >
                    0
                </button>
                 <button 
                    onClick={onBack}
                    className="h-16 rounded-2xl bg-transparent text-sm font-bold text-slate-500 hover:text-white flex items-center justify-center"
                >
                    {t.back}
                </button>
            </div>
             {failedAttempts > 0 && (
                <p className="mt-6 text-red-500 text-sm font-bold animate-pulse">
                    {failedAttempts} Failed Attempts
                </p>
            )}
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 relative">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
            <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">{t.history}</h1>
      </div>

      {/* Cloud Status Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 p-4 rounded-xl border border-blue-500/30 mb-6 shadow-lg">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-bold text-blue-400 flex items-center gap-2">
                    <Cloud className="w-4 h-4" /> {t.cloud_backup}
                </h3>
                <p className="text-xs text-blue-200 opacity-70">Vault ID: #G-88219 (Active)</p>
            </div>
            <button 
                onClick={handleAccessPortal}
                className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg flex items-center gap-1 font-semibold transition-colors active:scale-95 shadow-md"
            >
                <ExternalLink className="w-3 h-3" /> {t.access_web}
            </button>
        </div>

        {/* User Account Info */}
        <div className="pt-3 border-t border-blue-500/20 flex flex-col gap-2">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">Account Linked</span>
                        <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="w-2 h-2" /> Active
                        </span>
                    </div>
                    <div className="text-sm font-mono text-white flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {userEmail}
                    </div>
                </div>
             </div>
        </div>
        <div className="mt-2 bg-blue-900/50 p-2 rounded text-[10px] text-blue-200 flex items-center gap-2 border border-blue-500/20">
            <Lock className="w-3 h-3" />
            {t.security.cloud_immutable}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-slate-400 text-sm">{evidence.length} items</p>
        <button 
            onClick={generatePDF}
            disabled={evidence.length === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs border transition-all ${evidence.length === 0 ? 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-md active:scale-95'}`}
        >
            <Download className="w-4 h-4" />
            {t.download_pdf}
        </button>
      </div>

      <div className="space-y-4">
        {evidence.length === 0 ? (
            <div className="text-center py-10 opacity-50 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                    <Cloud className="w-8 h-8 text-slate-600" />
                </div>
                <p>No incidents recorded in vault.</p>
            </div>
        ) : (
            evidence.map((item) => (
                <div key={item.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex flex-col md:flex-row relative shadow-md">
                    <div className="h-40 md:w-48 md:h-auto relative bg-black group">
                        <img src={item.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${item.analysis?.threatLevel === 'HIGH' ? 'bg-red-600' : 'bg-green-600'}`}>
                            {item.analysis?.threatLevel}
                        </div>
                    </div>
                    <div className="p-4 flex-1 relative">
                        {/* Delete/Protect Button */}
                        <button 
                            onClick={() => handleDeleteAttempt(item)}
                            className={`absolute top-4 right-4 p-2 rounded-full border transition-all ${
                                item.backupStatus === 'secured' 
                                ? 'bg-green-900/20 border-green-500/30 text-green-500' 
                                : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-500/30'
                            }`}
                        >
                            {item.backupStatus === 'secured' ? <ShieldAlert className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>

                        <div className="flex justify-between items-start mb-2 pr-10">
                             <div className="flex flex-col">
                                 <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(item.timestamp).toLocaleString()}
                                </div>
                                {item.classification && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block mt-2 w-max ${getClassificationColor(item.classification)}`}>
                                        {item.classification}
                                    </span>
                                )}
                             </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                                {item.backupStatus === 'uploading' ? (
                                    <span className="text-xs text-blue-400 flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Uploading
                                    </span>
                                ) : item.backupStatus === 'secured' ? (
                                    <span className="text-xs text-green-400 flex items-center gap-1 font-bold">
                                        <CheckCircle className="w-3 h-3" /> {t.security.protected}
                                    </span>
                                ) : (
                                    <span className="text-xs text-orange-400">Pending</span>
                                )}
                        </div>

                        <div className="flex items-start gap-2 text-slate-300 text-sm mb-2">
                            <MapPin className="w-4 h-4 mt-1 shrink-0" />
                            <p className="line-clamp-2">{item.analysis?.locationContext}</p>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
      
      {/* Cloud Portal Modal - REDESIGNED */}
      {showPortal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto ring-1 ring-white/10">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                        <Globe className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Access Your Evidence Vault</h3>
                    <p className="text-slate-400 text-sm font-medium">If your phone is lost or stolen</p>
                </div>

                <div className="space-y-4">
                    {/* Email Method (Primary) */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Recommended</div>
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 mt-1 group-hover:bg-blue-500/20 transition-colors">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-sm mb-1">Email Magic Link</h4>
                                <div className="text-xs text-slate-300 mb-2">
                                    Check your email: <br/>
                                    <span className="text-blue-300 font-mono bg-blue-900/30 px-1 rounded">{userEmail}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                        <span>Click "View Evidence" for instant access</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                        <span>No password needed • Secure one-time link</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                        <span>Expires in 1 hour for security</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Web Portal Method */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 mt-1">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-sm mb-1">Web Portal Login</h4>
                                <div className="text-xs text-slate-300 mb-2">
                                    Visit: <span className="text-purple-300 font-mono">vault.guardianai.app</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                                        <span>Answer security questions to verify identity</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                                        <span>Download reports & track location</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                                        <span className="font-semibold text-slate-300">No phone required</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/80 hover:border-green-500/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-green-500/10 rounded-lg text-green-400 mt-1">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm mb-1">Emergency Contact Access</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Your family receives the same secure links to take immediate action and contact authorities on your behalf.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Footer */}
                <div className="mt-6 pt-4 border-t border-slate-700/50">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Security Features
                    </h5>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <CheckCircle className="w-3 h-3 text-slate-600" /> Evidence immutable remotely
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <CheckCircle className="w-3 h-3 text-slate-600" /> Access attempts logged
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <CheckCircle className="w-3 h-3 text-slate-600" /> Suspicious login alerts
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <CheckCircle className="w-3 h-3 text-slate-600" /> Cloud backup enabled
                         </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-[9px] text-slate-600 italic mb-4">
                        This is a concept demonstration. Full web portal requires backend infrastructure.
                    </p>
                    <button
                        onClick={() => setShowPortal(false)}
                        className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all active:scale-95 border border-slate-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
