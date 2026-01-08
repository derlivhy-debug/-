
export enum Gender {
  Male = "男",
  Female = "女"
}

export interface AgentProfile {
  gender: Gender;
  age: string;
  city: string;
  job: string;
  incomeLevel: 'Low' | 'Medium' | 'High';
}

// 1. Iceberg Model: Deep Psychology & Context
export interface IcebergProfile {
  innerMotivation?: string; // 内在动机与冲突
  limitations?: string;     // 局限与偏见
  sensoryEnv?: string;      // 感官与环境
  browsingContext?: string; // 刷视频情境

  // Legacy fields (from constants.ts)
  mbti?: string;
  coreValue?: string;
  lifeScript?: string;
  cognitiveBias?: string;
}

export interface NarrativeSensitivity {
  patience: number; 
  curiosity: number;
  cringeThreshold: number;
}

export interface AgentPsychology {
  // Simplified Vibe/Likes (Optional/Derived)
  vibe: string;
  likes: string[];
  dislikes: string[];
  
  cognitiveLevel: 'Low' | 'High'; 
  payPropensity: 'High' | 'Medium' | 'Low'; 
  adTolerance: 'High' | 'Low';
  
  narrativeSensitivity?: NarrativeSensitivity;

  // New Rich Persona Layer
  iceberg: IcebergProfile;
}

// NEW: Tracking dynamic emotional state across episodes
export interface AgentState {
  dopamineLevel: number; // 0-100, purely for visualization now
  impatienceScore: number; 
  lastFeeling: string; 
  
  consecutiveSuppression: number; 
  lastPlotType: 'GRATIFICATION' | 'SUPPRESSION' | 'SETUP' | 'WATER' | 'NONE';
}

export interface Agent {
  id: string;
  profile: AgentProfile;
  psychology: AgentPsychology;
  lifeStatus: string; // Used for UI display summary
  memory: string[];
  
  // Dynamic State
  dynamicState: AgentState;
}

export type Decision = "STAY" | "DROP" | "PAY_AND_STAY" | "WATCH_AD_AND_STAY";

export interface AudienceFeedback {
  agent_id: string;
  episode_index: number;
  decision: Decision;
  
  // Visualization Metrics (Derived from qualitative analysis, not drivers)
  emotion_score: number; // 0-10
  hook_score: number; // 0-100 (Interest Level)
  
  bullet_screen: string;
  churn_reason: string | null;
  
  // The qualitative analysis
  inner_thought: string; 
  
  plot_type: 'GRATIFICATION' | 'SUPPRESSION' | 'SETUP' | 'WATER';
  dopamine_response: string; 
}

export interface SimulationStepResult {
  episodeIndex: number;
  feedback: AudienceFeedback[];
  activeAgents: number;
  retentionRate: number;
}

export type PaywallType = 'none' | 'paid' | 'ad_5s' | 'ad_15s';

export interface PaywallConfig {
  type: PaywallType;
  startEpisode: number;
}

export interface SimulationConfig {
  apiKey: string;
  provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'doubao';
  modelName: string;
  script: string;
  paywall: PaywallConfig;
}

export interface Episode {
  index: number;
  content: string;
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentEpisodeIndex: number;
  totalEpisodes: number;
  results: SimulationStepResult[];
  activeAgentIds: string[];
  logs: string[];
}