
import { GoogleGenAI, Type } from "@google/genai";

// Initialize with environment variable
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Chat with Search Grounding and Thinking Mode
 */
export const streamStrategyChat = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  useThinking: boolean,
  useSearch: boolean,
  systemInstruction: string, // Dynamic Personality
  onChunk: (text: string, grounding?: any[]) => void
) => {
  const ai = getAiClient();
  
  let modelName = 'gemini-3-flash-preview';
  
  const config: any = {
    systemInstruction: systemInstruction || `
      You are Klutch Vision PRO, an Omni-Lingual Gaming Superintelligence.
      Identity: Elite, Tactical, "Cyberpunk", Precise.
    `,
  };

  if (useSearch) {
    modelName = 'gemini-3-flash-preview';
    config.tools = [{ googleSearch: {} }];
  } else if (useThinking) {
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const chat = ai.chats.create({
    model: modelName,
    history: history,
    config: config,
  });

  try {
    const resultStream = await chat.sendMessageStream({ message: newMessage });
    
    for await (const chunk of resultStream) {
      const text = chunk.text || "";
      const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      onChunk(text, grounding);
    }
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

/**
 * Detect Active Game from Screenshot (For Overlay)
 */
export const detectActiveGame = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', // Fast model
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify the video game in this image. Return ONLY the name of the game. If no game is visible, return 'Unknown'." }
        ]
      }
    });
    return response.text?.trim() || "Unknown";
  } catch (e) {
    return "Unknown";
  }
};

/**
 * Get Tactical Intel for a specific game
 */
export const getTacticalIntel = async (gameName: string): Promise<string[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a tactical assistant. The user is playing "${gameName}". 
      Provide 3 concise, high-level tactical tips or current meta advice for this game.
      Format: just 3 bullet points. No intro.`,
    });
    const text = response.text || "";
    return text.split('\n').map(line => line.replace(/^[\*-]\s*/, '').trim()).filter(t => t.length > 0).slice(0, 3);
  } catch (e) {
    return ["Analyze situation.", "Check corners.", "Play objective."];
  }
};

/**
 * Analyzes game screenshots using Vision capabilities
 */
export const analyzeGameScreenshot = async (
  base64Image: string,
  prompt: string,
  onChunk: (text: string) => void
) => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';

  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image
            }
          },
          { text: prompt ? `User Prompt: "${prompt}".` : "Analyze this game frame. Identify HUD elements, enemies, health bars, and loot. Give tactical advice." }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Vision error:", error);
    throw error;
  }
};

/**
 * Theory Craft Engine
 */
export const runTheoryCraft = async (
  scenario: string,
  data: string,
  onChunk: (text: string) => void
) => {
  const ai = getAiClient();
  const model = 'gemini-3-pro-preview';
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: `SCENARIO: ${scenario}\nDATA: ${data}\nTASK: Perform a deep theorycraft analysis.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }

  } catch (error) {
    console.error("TheoryCraft error:", error);
    throw error;
  }
};


/**
 * Asset Generation
 */
export const generateGameAsset = async (
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
  size: "1K" | "2K" | "4K"
): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: size,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

/**
 * Game Recommendation
 */
export const getGameRecommendations = async (
  userHistory: string,
  preferences: string
): Promise<any> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Research current games.\nUser History: "${userHistory}"\nPreferences: "${preferences}"\nReturn JSON Array.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  matchScore: { type: Type.INTEGER },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);
    return parsed.recommendations || [];
  } catch (error) {
    console.error("Recs Error:", error);
    return [];
  }
}

/**
 * Live API Helper
 */
export const getLiveClient = () => {
  const ai = getAiClient();
  return ai.live;
};
