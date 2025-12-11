
import React, { useState } from 'react';
import { EvidenceItem, Language, IncidentClassification } from '../types';
import { TEXTS } from '../constants';
import { Cloud, CheckCircle, Share2, ShieldAlert, ArrowRight, UploadCloud, Mail, Users, AlertTriangle } from 'lucide-react';

interface IncidentSummaryProps {
  evidence: EvidenceItem[];
  language: Language;
  onShare: (id: string) => void;
  onClose: () => void;
}

const IncidentSummary: React.FC<IncidentSummaryProps> = ({ evidence, language, onShare, onClose }) => {
  const t = TEXTS[language];
  const recentEvidence = evidence.slice(0, 3); // Show top 3
  const userEmail = "iiiassia.beniii@gmail.com";

  // Retrieve contacts from local storage for display since we don't pass settings prop here directly (simplified for this structure)
  const contacts = React.useMemo(() => {
     try {
         const settings = localStorage.getItem('guardian_smart_settings');
         if (settings) {
             const parsed = JSON.parse(settings);
             return parsed.contacts || [];
         }
     } catch(e) {}
     return [];
  }, []);

  const [classification, setClassification] = useState<IncidentClassification | null>(null);

  const getClassificationColor = (type: IncidentClassification) => {
      switch(type) {
          case 'LOST': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
          case 'UNAUTHORIZED': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
          case 'EMERGENCY': return 'bg-red-500/20 text-red-400 border-red-500/50';
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full pt-10">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500">
                    <Cloud className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t.secured}</h2>
                
                <div className="space-y-2">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 inline-block text-left w-full max-w-xs mx-auto">
                        <p className="text-slate-400 text-xs mb-2 border-b border-slate-700 pb-1">{t.contacts.notified}:</p>
                        
                        <div className="flex items-center gap-2 text-white font-mono text-xs mb-1">
                            <Mail className="w-3 h-3 text-blue-400" />
                            {userEmail} <span className="text-[10px] text-slate-500">(You)</span>
                        </div>

                        {contacts.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-2 text-white font-mono text-xs">
                                <Users className="w-3 h-3 text-green-400" />
                                {c.email} <span className="text-[10px] text-slate-500">({c.name})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Classification Section */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">{t.classify.title}</h3>
                <div className="grid grid-cols-3 gap-2">
                    {(['LOST', 'UNAUTHORIZED', 'EMERGENCY'] as IncidentClassification[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setClassification(type)}
                            className={`p-2 rounded-lg border text-xs font-bold transition-all ${classification === type ? getClassificationColor(type) : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                        >
                            {type === 'LOST' && t.classify.lost}
                            {type === 'UNAUTHORIZED' && t.classify.unauthorized}
                            {type === 'EMERGENCY' && t.classify.emergency}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold border-b border-slate-700 pb-2">{t.incident_summary}</h3>
                {recentEvidence.length === 0 ? (
                    <div className="p-4 bg-slate-800 rounded-lg text-slate-400 text-center">No high risk evidence recorded.</div>
                ) : (
                    recentEvidence.map(item => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex gap-4">
                                <img src={item.imageUrl} className="w-20 h-20 object-cover rounded-lg bg-black" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                        {item.backupStatus === 'secured' && (
                                            <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                                                <CheckCircle className="w-3 h-3" /> Cloud
                                            </span>
                                        )}
                                        {item.backupStatus === 'uploading' && (
                                            <span className="flex items-center gap-1 text-blue-400 text-xs font-bold animate-pulse">
                                                <UploadCloud className="w-3 h-3" /> Sync
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold mb-2 line-clamp-2">{item.analysis?.locationContext}</p>
                                    
                                    {!item.isShared ? (
                                        <button 
                                            onClick={() => onShare(item.id)}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Share2 className="w-3 h-3" /> {t.share_community}
                                        </button>
                                    ) : (
                                        <div className="w-full py-2 bg-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 text-green-400">
                                            <ShieldAlert className="w-3 h-3" /> {t.alert_sent} ({item.sightings} {t.sightings})
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-8">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Community Action
                </h4>
                <p className="text-sm text-blue-100 opacity-80 mb-0">
                    {t.share_prompt}
                </p>
            </div>

            <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
                {t.dashboard} <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    </div>
  );
};

export default IncidentSummary;
