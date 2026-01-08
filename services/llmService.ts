
import { GoogleGenAI, Type } from "@google/genai";
import { AudienceFeedback } from "../types";

// Base interface for LLM Providers
interface LLMProvider {
  chatCompletion(systemPrompt: string, userContent: string): Promise<AudienceFeedback>;
}

// ---------------------------------------------------------
// OpenAI / DeepSeek / Qwen / Doubao Compatible Provider
// ---------------------------------------------------------
export class OpenAICompatibleProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chatCompletion(systemPrompt: string, userContent: string): Promise<AudienceFeedback> {
    
    const body: any = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      // ADJUSTED TEMPERATURE TO 1.2
      // 1.5 was too chaotic, causing random drops. 1.2 strikes a balance between "System 1" emotion and coherent scoring.
      temperature: 1.2,
    };

    // DeepSeek Reasoner (R1) and some other specific models DO NOT support response_format: json_object
    // They will throw 400 error if this is passed.
    if (this.model !== 'deepseek-reasoner') {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
        // Strategy 1: Direct Parse
        return JSON.parse(content);
    } catch (e) {
        // Strategy 2: Robust Extraction (Find first '{' and last '}')
        // This handles cases where models say "Here is the JSON: ```json { ... } ```"
        const firstOpen = content.indexOf('{');
        const lastClose = content.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const cleanContent = content.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(cleanContent);
            } catch (innerE) {
                console.error("Failed to parse extracted JSON:", cleanContent);
                throw innerE;
            }
        }
        
        // Strategy 3: Markdown Cleanup (Legacy)
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanContent);
    }
  }
}

// ---------------------------------------------------------
// Gemini Implementation
// ---------------------------------------------------------
export class GeminiService implements LLMProvider {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.client = new GoogleGenAI({ apiKey: apiKey });
    this.modelName = modelName;
  }

  async chatCompletion(systemPrompt: string, userContent: string): Promise<AudienceFeedback> {
    
    // Define the schema for structured output - UPDATED for V3 Logic
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          agent_id: { type: Type.STRING },
          episode_index: { type: Type.INTEGER },
          decision: { type: Type.STRING, enum: ["STAY", "DROP", "PAY_AND_STAY", "WATCH_AD_AND_STAY"] },
          emotion_score: { type: Type.INTEGER },
          bullet_screen: { type: Type.STRING },
          
          // New Short Drama Metrics
          hook_score: { type: Type.INTEGER },
          conflict_density: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          plot_type: { type: Type.STRING, enum: ["GRATIFICATION", "SUPPRESSION", "SETUP", "WATER"] },
          dopamine_response: { type: Type.STRING },

          inner_thought: { type: Type.STRING },
          churn_reason: { type: Type.STRING, nullable: true },
        },
        required: ["agent_id", "episode_index", "decision", "emotion_score", "bullet_screen", "hook_score", "conflict_density", "plot_type", "dopamine_response", "inner_thought"]
    };

    try {
        const response = await this.client.models.generateContent({
            model: this.modelName,
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userContent }] }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                // ADJUSTED TEMPERATURE TO 1.2
                temperature: 1.2 
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini");
        
        return JSON.parse(text) as AudienceFeedback;
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
  }
}

// ---------------------------------------------------------
// Factory to get provider
// ---------------------------------------------------------
export const getLLMProvider = (
  provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'doubao', 
  apiKey: string, 
  model?: string
): LLMProvider => {
    if (provider === 'gemini') {
        const m = model || 'gemini-3-flash-preview'; 
        return new GeminiService(apiKey, m);
    } else if (provider === 'deepseek') {
        const m = model || 'deepseek-chat';
        // DeepSeek API Base URL
        return new OpenAICompatibleProvider(apiKey, 'https://api.deepseek.com', m);
    } else if (provider === 'qwen') {
        const m = model || 'qwen-max';
        return new OpenAICompatibleProvider(apiKey, 'https://dashscope.aliyuncs.com/compatible-mode/v1', m);
    } else if (provider === 'doubao') {
        const m = model || 'doubao-seed-1-6-251015';
        return new OpenAICompatibleProvider(apiKey, 'https://ark.cn-beijing.volces.com/api/v3', m);
    } else {
        const m = model || 'gpt-4o-mini';
        return new OpenAICompatibleProvider(apiKey, 'https://api.openai.com/v1', m);
    }
};
