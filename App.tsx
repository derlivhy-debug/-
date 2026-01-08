
import React, { useState, useCallback } from 'react';
import { DEMO_SCRIPT } from './constants';
import { SimulationConfig, SimulationState, SimulationStepResult, Agent, Episode, PaywallConfig, PaywallType } from './types';
import { runSimulationStep, parseScript } from './services/simulationService';
import { generateAgents } from './services/agentGenerator';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SimulationDashboard } from './components/SimulationDashboard';
import { ReportView } from './components/ReportView';
import { FileText, LayoutDashboard, FileInput, DollarSign, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<Omit<SimulationConfig, 'paywall'> | null>(null);
  const [scriptInput, setScriptInput] = useState(DEMO_SCRIPT);
  const [activeTab, setActiveTab] = useState<'input' | 'simulation' | 'report'>('input');
  
  // Paywall Settings State
  const [paywallType, setPaywallType] = useState<PaywallType>('none');
  const [paywallStartEp, setPaywallStartEp] = useState<number>(10);

  const [simState, setSimState] = useState<SimulationState>({
    status: 'idle',
    currentEpisodeIndex: 0,
    totalEpisodes: 0,
    results: [],
    activeAgentIds: [],
    logs: ["等待剧本录入及系统初始化..."]
  });

  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]); 
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const handleConfigSave = (apiKey: string, provider: any, model: string) => {
    setConfig({
      apiKey,
      provider,
      modelName: model,
      script: scriptInput
    });
  };

  const addLog = (msg: string) => {
    setSimState(prev => ({ ...prev, logs: [...prev.logs, msg] }));
  };

  const initializeSimulation = () => {
    if (!config) return;
    const parsedEpisodes = parseScript(scriptInput);
    setEpisodes(parsedEpisodes);

    // Generate 70 new agents with improved logic
    const newAgents = generateAgents(70);
    setAllAgents(newAgents);
    setActiveAgents(newAgents);

    setSimState({
      status: 'idle',
      currentEpisodeIndex: 0,
      totalEpisodes: parsedEpisodes.length,
      results: [],
      activeAgentIds: newAgents.map(a => a.id),
      logs: [`仿真系统已初始化: ${newAgents.length} 位虚拟观众已生成 (V2.0 Logic)。`, `已解析剧本: 共 ${parsedEpisodes.length} 集。`]
    });
    
    setActiveTab('simulation');
  };

  const startSimulation = async () => {
    if (!config || episodes.length === 0) return;

    // Construct full config with paywall settings
    const fullConfig: SimulationConfig = {
        ...config,
        script: scriptInput,
        paywall: {
            type: paywallType,
            startEpisode: paywallStartEp
        }
    };

    setSimState(prev => ({ ...prev, status: 'running' }));
    
    let paywallLog = "无付费墙";
    if (paywallType !== 'none') {
        paywallLog = `付费墙类型: ${paywallType}, 起始集: 第${paywallStartEp}集`;
    }
    addLog(`仿真开始. ${paywallLog}`);

    let currentAgents = [...activeAgents];
    
    for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];
        
        if (currentAgents.length === 0) {
            addLog("所有观众已离场。仿真结束。");
            break;
        }

        addLog(`正在播放第 ${episode.index} 集给 ${currentAgents.length} 位观众...`);
        setSimState(prev => ({ ...prev, currentEpisodeIndex: episode.index }));

        const { feedbacks, nextAgents } = await runSimulationStep(fullConfig, currentAgents, episode, episodes.length);
        
        const droppedCount = currentAgents.length - nextAgents.length;
        addLog(`第 ${episode.index} 集播放完毕。 流失观众: ${droppedCount} 人。`);

        const stepResult: SimulationStepResult = {
            episodeIndex: episode.index,
            feedback: feedbacks,
            activeAgents: nextAgents.length,
            retentionRate: (nextAgents.length / allAgents.length) * 100
        };

        setSimState(prev => ({
            ...prev,
            results: [...prev.results, stepResult],
            activeAgentIds: nextAgents.map(a => a.id)
        }));

        currentAgents = nextAgents;
        setActiveAgents(nextAgents);

        await new Promise(r => setTimeout(r, 1500));
    }

    setSimState(prev => ({ ...prev, status: 'completed' }));
    addLog("仿真会话结束。数据报告已生成。");
  };

  const NavButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-mono text-sm border
        ${activeTab === id 
            ? 'bg-cyber-800 border-cyber-500 text-cyber-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
            : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-cyber-800/50'}`}
      >
        <Icon size={16} />
        {label}
      </button>
  );

  return (
    <div className="min-h-screen bg-cyber-900 text-slate-200 font-sans selection:bg-cyber-500 selection:text-white">
      <ApiKeyModal onSave={handleConfigSave} />

      <div className="flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-cyber-800 bg-cyber-900/80 flex items-center justify-between px-6 backdrop-blur z-10">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-cyber-500 to-cyber-900 flex items-center justify-center border border-cyber-400">
                    <span className="font-bold text-white">AZ</span>
                </div>
                <h1 className="font-mono font-bold tracking-widest text-lg hidden md:block">
                    AUDIENCE<span className="text-cyber-500">ZERO</span>
                </h1>
            </div>
            
            <nav className="flex gap-2">
                <NavButton id="input" label="剧本配置" icon={FileInput} />
                <NavButton id="simulation" label="仿真矩阵" icon={LayoutDashboard} />
                <NavButton id="report" label="分析报告" icon={FileText} />
            </nav>
        </header>

        <main className="flex-1 overflow-hidden p-6 relative">
            {activeTab === 'input' && (
                <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500">
                    
                    {/* Paywall Config Section */}
                    <div className="bg-cyber-800/50 p-6 rounded-xl border border-cyber-700">
                         <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <DollarSign className="text-cyber-accent" size={20}/>
                            商业化模型配置 (Monetization)
                         </h3>
                         <div className="flex flex-wrap gap-6">
                             <div>
                                 <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">付费墙类型</label>
                                 <div className="flex gap-2">
                                     {(['none', 'paid', 'ad_5s', 'ad_15s'] as PaywallType[]).map(type => (
                                         <button
                                            key={type}
                                            onClick={() => setPaywallType(type)}
                                            className={`px-3 py-1.5 rounded text-sm border transition-all
                                            ${paywallType === type 
                                                ? 'bg-cyber-500 text-white border-cyber-400 font-bold' 
                                                : 'bg-cyber-900 text-slate-400 border-cyber-700 hover:border-slate-500'}`}
                                         >
                                             {type === 'none' && '无 (Free)'}
                                             {type === 'paid' && '付费解锁 (Paid)'}
                                             {type === 'ad_5s' && '5秒广告 (Ad 5s)'}
                                             {type === 'ad_15s' && '15秒广告 (Ad 15s)'}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             {paywallType !== 'none' && (
                                 <div>
                                     <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">起始集数 (Start Ep)</label>
                                     <div className="flex items-center gap-2 bg-cyber-900 border border-cyber-700 rounded px-2 py-1">
                                         <Clock size={14} className="text-slate-500"/>
                                         <input 
                                            type="number" 
                                            min={1} 
                                            max={100}
                                            value={paywallStartEp}
                                            onChange={(e) => setPaywallStartEp(parseInt(e.target.value))}
                                            className="bg-transparent w-16 text-white text-sm focus:outline-none"
                                         />
                                         <span className="text-xs text-slate-500">集</span>
                                     </div>
                                 </div>
                             )}
                         </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">剧本录入 (Script Ingestion)</h2>
                                <p className="text-slate-400 text-sm">系统将按 "第X集" 或 "Episode X" 格式分集。支持Word/Txt粘贴。</p>
                            </div>
                            <button 
                                onClick={initializeSimulation}
                                className="bg-cyber-500 hover:bg-cyber-400 text-white px-6 py-2 rounded font-bold shadow-lg shadow-cyber-500/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                            >
                                <FileInput size={18} />
                                解析 & 初始化
                            </button>
                        </div>
                        <textarea 
                            className="flex-1 bg-cyber-800/50 border border-cyber-700 rounded-xl p-6 font-mono text-sm focus:outline-none focus:border-cyber-500 text-slate-300 resize-none leading-relaxed shadow-inner"
                            value={scriptInput}
                            onChange={(e) => setScriptInput(e.target.value)}
                            placeholder="格式示例：&#10;&#10;第1集：重生&#10;(场景描述...)&#10;&#10;第2集：复仇&#10;(场景描述...)"
                        />
                    </div>
                </div>
            )}

            {activeTab === 'simulation' && (
                <div className="h-full animate-in fade-in duration-500">
                    <SimulationDashboard 
                        status={simState.status}
                        currentEpisode={simState.currentEpisodeIndex}
                        totalEpisodes={simState.totalEpisodes}
                        agents={allAgents} 
                        results={simState.results}
                        activeAgentIds={simState.activeAgentIds}
                        onStart={startSimulation}
                        logs={simState.logs}
                    />
                </div>
            )}

            {activeTab === 'report' && (
                <div className="h-full animate-in fade-in duration-500">
                    <ReportView 
                        results={simState.results}
                        agents={allAgents}
                        logs={simState.logs}
                    />
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;
