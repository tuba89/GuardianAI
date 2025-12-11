
import { EmergencyContact } from '../types';

// Mock Cloud Service implementation

export const uploadToCloud = async (evidenceId: string, contacts?: EmergencyContact[]): Promise<boolean> => {
    // Simulate network delay for upload
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`[Cloud] Uploaded evidence ${evidenceId} to Google Drive.`);
            console.log(`[Cloud] Notification sent to Owner: iiiassia.beniii@gmail.com`);
            
            if (contacts && contacts.length > 0) {
                const recipients = contacts.map(c => c.email).join(', ');
                console.log(`[Cloud] Emergency Notification sent to: ${recipients}`);
            }

            resolve(true);
        }, 1500); // 1.5 seconds upload time (Fast priority)
    });
};

export const broadcastToCommunity = async (evidenceId: string): Promise<{sightings: number, reach: number}> => {
    // Simulate community API call
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`[Community] Broadcast evidence ${evidenceId} to 5km radius.`);
            resolve({
                sightings: Math.floor(Math.random() * 5) + 1, // Simulate immediate sightings
                reach: 142 // Users reached
            });
        }, 1500);
    });
};
