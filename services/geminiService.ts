import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ThreatLevel, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSceneFrame = async (base64Image: string, language: Language = 'EN'): Promise<AnalysisResult> => {
  try {
    const langName = language === 'AR' ? 'Arabic' : (language === 'FR' ? 'French' : 'English');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: `Analyze this scene for safety in Algeria. Respond in ${langName}. Identify threat level (LOW, MEDIUM, HIGH), persons (clothing, features), vehicles (color, type, plate if visible), and location context. Return valid JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            threatLevel: {
              type: Type.STRING,
              enum: ["LOW", "MEDIUM", "HIGH"]
            },
            persons: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vehicles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            locationContext: {
              type: Type.STRING
            }
          },
          required: ["threatLevel", "persons", "vehicles", "locationContext"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const json = JSON.parse(text);

    return {
      threatLevel: json.threatLevel as ThreatLevel,
      persons: json.persons || [],
      vehicles: json.vehicles || [],
      locationContext: json.locationContext || "Unknown location",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      threatLevel: "LOW",
      persons: [],
      vehicles: [],
      locationContext: language === 'AR' ? "فشل التحليل" : (language === 'FR' ? "Analyse échouée" : "Analysis failed"),
      timestamp: new Date().toISOString()
    };
  }
};