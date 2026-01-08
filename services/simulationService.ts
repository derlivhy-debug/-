
import { Agent, AudienceFeedback, Episode, SimulationConfig, PaywallConfig } from "../types";
import { getLLMProvider } from "./llmService";

const buildSystemPrompt = (
    agent: Agent, 
    currentEpisode: number, 
    totalEpisodes: number,
    paywall: PaywallConfig
) => {
    
    // Unpack The Persona
    const { innerMotivation, limitations, sensoryEnv, browsingContext } = agent.psychology.iceberg;
    
    // Logic for Paywall
    const isPaywallEpisode = paywall.type !== 'none' && currentEpisode >= paywall.startEpisode;
    let paywallInstruction = "";
    if (isPaywallEpisode) {
        let costDesc = "";
        if (paywall.type === 'paid') costDesc = "支付 1.9元";
        if (paywall.type === 'ad_5s') costDesc = "看 5秒 广告";
        if (paywall.type === 'ad_15s') costDesc = "看 15秒 广告";

        paywallInstruction = `
### 🚧 商业化障碍 (The Paywall)
**当前状况**: 这一集结束时弹出了【${costDesc}】。
**决策**: 作为【${agent.profile.job}】，你的经济状况是【${agent.profile.incomeLevel}】，你的性格是【${agent.psychology.vibe}】。
请以此判断你是否愿意为了这部剧支付金钱或时间。如果剧情不够吸引你，直接 DROP。
`;
    }

    // Logic for the "15-Second Check"
    let timeConstraint = "";
    if (currentEpisode <= 3) {
        timeConstraint = `
### ⚡️ 15秒生死线 (The 15-Second Rule)
**这是前3集，你的耐心极低。**
请模拟你观看该集的过程，将其在脑海中切分为每 15秒 的片段。
每看 15秒，你都要基于你的【生理不适感】、【偏见】和【当前环境】做一次决定。
- 只要有 **任何一个15秒片段** 让你觉得无聊、虚假、爹味重或不符合你的价值观，立刻 **SWIPE AWAY (DROP)**。
- 只有全程每一秒都抓住了你的注意力，你才会 STAY。
`;
    } else {
        timeConstraint = `
### 沉浸模式 (Immersion Mode)
你已经看了几集了。现在你的容忍度稍高，但如果剧情变得注水或违背你的核心价值观，你依然会弃剧。
`;
    }

    return `
# Role: 深度扮演虚拟人 (${agent.profile.city} - ${agent.profile.job})

你不再是AI，你是 **${agent.id}号** 观众。请完全沉浸在以下人设中，用你的肉体感官去体验剧本。

## 1. 你的灵魂 (Persona)
- **身份**: ${agent.profile.gender}, ${agent.profile.age}, ${agent.profile.city}, ${agent.profile.job}。
- **内在动机与冲突**: "${innerMotivation}"
- **局限与偏见**: "${limitations}"
- **当前感官环境**: "${sensoryEnv}"
- **典型刷剧状态**: "${browsingContext}"

## 2. 你的记忆
上一集你的感受: "${agent.dynamicState.lastFeeling}"

---

## 3. 观看任务 (Simulation Task)
你正在刷短剧。请阅读下面的【剧本正文】。

${timeConstraint}

${paywallInstruction}

## 4. 输出要求 (JSON)
不要计算分数，而是通过**角色扮演**做出直觉判断。

{
  "hook_score": (0-100, 仅作为你的兴趣值参考，0=生理性反胃, 100=灵魂共鸣),
  "plot_type": ("GRATIFICATION" | "SUPPRESSION" | "SETUP" | "WATER"),
  "decision": ("STAY" | "DROP" | "PAY_AND_STAY" | "WATCH_AD_AND_STAY"),
  "inner_thought": "详细描述你的心理活动。例如：'看到这个我就想起单位那个傻X领导，真恶心，划走。' 或者 '这台词太假了，我作为一个律师根本看不下去。' 必须结合你的职业和环境。",
  "dopamine_response": "一句话概括情绪 (如: 愤怒, 爽, 尴尬, 无聊)",
  "churn_reason": "如果 DROP，具体是哪一句话或哪个情节触犯了你的【偏见】或【局限】？",
  "bullet_screen": "发一条符合你人设的弹幕",
  "emotion_score": (0-10),
  "conflict_density": ("High" | "Medium" | "Low")
}
`;
};

export const runSimulationStep = async (
    config: SimulationConfig,
    activeAgents: Agent[],
    episode: Episode,
    totalEpisodes: number
): Promise<{ feedbacks: AudienceFeedback[]; nextAgents: Agent[] }> => {
    
    const provider = getLLMProvider(config.provider, config.apiKey, config.modelName);
    const CHUNK_SIZE = 5;
    const feedbacks: AudienceFeedback[] = [];
    
    for (let i = 0; i < activeAgents.length; i += CHUNK_SIZE) {
        const chunk = activeAgents.slice(i, i + CHUNK_SIZE);
        const chunkPromises = chunk.map(async (agent) => {
             try {
                const systemPrompt = buildSystemPrompt(agent, episode.index, totalEpisodes, config.paywall);
                const userContent = `【剧本正文】:\n${episode.content}`;
                
                const feedback = await provider.chatCompletion(systemPrompt, userContent);
                
                // Polyfill for safety
                if (typeof feedback.hook_score === 'undefined') feedback.hook_score = 50;
                if (!feedback.agent_id) feedback.agent_id = agent.id;
                
                return { agent, feedback };
            } catch (error) {
                console.error(`Agent ${agent.id} failed:`, error);
                // Return a safe error feedback
                return {
                    agent,
                    feedback: {
                        agent_id: agent.id,
                        episode_index: episode.index,
                        decision: "DROP",
                        emotion_score: 0,
                        bullet_screen: "...",
                        hook_score: 0,
                        conflict_density: 'Low',
                        plot_type: 'WATER',
                        dopamine_response: "System Error",
                        inner_thought: "系统调用失败",
                        churn_reason: "API Error"
                    } as AudienceFeedback
                };
            }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(r => feedbacks.push(r.feedback));
    }

    const nextAgents: Agent[] = [];
    activeAgents.forEach(agent => {
        const feedback = feedbacks.find(f => f.agent_id === agent.id);
        
        if (feedback) {
            // Update Agent State based on qualitative feedback
            // Note: We no longer use score thresholds. We trust the LLM's "decision" field.
            
            const plotType = feedback.plot_type || 'WATER';
            
            // Just for visualization tracking, we still update metrics, but they don't drive logic anymore
            let newDopamine = feedback.hook_score; 
            
            agent.dynamicState = {
                dopamineLevel: newDopamine,
                impatienceScore: 0, // Deprecated logic
                lastFeeling: feedback.dopamine_response,
                consecutiveSuppression: 0, // Deprecated logic
                lastPlotType: plotType
            };

            // STRICT DECISION EXECUTION
            // The LLM persona has spoken. We obey.
            if (feedback.decision === "STAY" || feedback.decision === "PAY_AND_STAY" || feedback.decision === "WATCH_AD_AND_STAY") {
                const newMemory = `Ep${episode.index}: ${feedback.inner_thought.substring(0, 50)}...`;
                const memory = [...agent.memory, newMemory].slice(-5);
                const updatedAgent = { ...agent, memory };
                nextAgents.push(updatedAgent);
            }
        }
    });

    return { feedbacks, nextAgents };
};

export const parseScript = (fullText: string): Episode[] => {
    const splitRegex = /(?:^|\n)(?=\s*(?:Episode|第)\s*[0-90-9一二三四五六七八九十]+\s*(?:集|:|：))/i;
    const parts = fullText.split(splitRegex).filter(t => t.trim().length > 0);
    if (parts.length === 0 && fullText.trim().length > 0) return [{ index: 1, content: fullText }];
    return parts.map((content, idx) => ({ index: idx + 1, content: content.trim() }));
};
