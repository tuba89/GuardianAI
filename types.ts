
export type Language = 'EN' | 'FR' | 'AR';

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type BackupStatus = 'pending' | 'uploading' | 'secured' | 'failed';

export type TriggerType = 'MANUAL' | 'VOICE' | 'POWER_BUTTON' | 'AIRPLANE_MODE' | 'SIM_EJECT' | 'MOVEMENT' | 'UNLOCK_FAILED' | 'GEOFENCE';

export type IncidentClassification = 'LOST' | 'UNAUTHORIZED' | 'EMERGENCY';

export interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: 'Family' | 'Friend' | 'Colleague' | 'Other';
}

export interface SmartSettings {
  powerButton: boolean;
  airplaneMode: boolean;
  simEject: boolean;
  movement: boolean;
  unlockFailed: boolean;
  geofence: boolean;
  safeZones: string[];
  demoMode: boolean;
  stealthMode: boolean; // New Stealth Mode
  contacts: EmergencyContact[]; 
  vaultPin?: string; 
  lockoutUntil?: number; 
  failedAttempts?: number;
}

export interface AnalysisResult {
  threatLevel: ThreatLevel;
  persons: string[];
  vehicles: string[];
  locationContext: string;
  timestamp: string;
}

export interface EvidenceItem {
  id: string;
  imageUrl: string; // Base64
  analysis: AnalysisResult | null;
  timestamp: number;
  latitude?: number;
  longitude?: number;
  backupStatus: BackupStatus;
  isShared: boolean;
  sightings: number;
  triggerType: TriggerType;
  classification?: IncidentClassification; 
}

export interface IncidentMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'Theft' | 'Harassment' | 'Suspicious' | 'Sighting'; 
  description: string;
  time: string;
  isUserReported?: boolean;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  EMERGENCY = 'EMERGENCY',
  SUMMARY = 'SUMMARY',
  REPORT = 'REPORT',
  SETTINGS = 'SETTINGS'
}
