import React, { useEffect, useRef, useState } from 'react';
import { Agent, AudienceFeedback, SimulationStepResult } from '../types';
import { AgentCard } from './AgentCard';
import { AgentDetailModal } from './AgentDetailModal';
import { Play, Square, Loader2, Users, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

interface SimulationDashboardProps {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentEpisode: number;
  totalEpisodes: number;
  agents: Agent[];
  results: SimulationStepResult[];
  activeAgentIds: string[];
  onStart: () => void;
  logs: string[];
}

export const SimulationDashboard: React.FC<SimulationDashboardProps> = ({
  status,
  currentEpisode,
  totalEpisodes,
  agents,
  results,
  activeAgentIds,
  onStart,
  logs
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Get latest feedback for each agent
  const getLatestFeedback = (agentId: string): AudienceFeedback | undefined => {
    if (results.length === 0) return undefined;
    const lastResult = results[results.length - 1];
    return lastResult.feedback.find(f => f.agent_id === agentId);
  };

  const retentionData = results.map(r => ({
    episode: `Ep ${r.episodeIndex}`,
    retention: r.retentionRate,
    count: r.activeAgents
  }));

  const isRunning = status === 'running';

  return (
    <div className="h-full flex flex-col gap-6 relative">
      <AgentDetailModal 
        agent={selectedAgent!} 
        onClose={() => setSelectedAgent(null)} 
      />

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-cyber-800/50 p-4 rounded-xl border border-cyber-700 backdrop-blur-sm">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">系统状态 (Status)</div>
          <div className="flex items-center gap-2">
            {isRunning ? <Loader2 className="animate-spin text-cyber-accent" /> : <div className="w-4 h-4 rounded-full bg-slate-500" />}
            <span className="text-xl font-bold font-mono uppercase text-white">{status}</span>
          </div>
        </div>
        <div className="bg-cyber-800/50 p-4 rounded-xl border border-cyber-700 backdrop-blur-sm">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">当前进度 (Progress)</div>
          <div className="text-2xl font-bold font-mono text-white">
            <span className="text-cyber-400">{currentEpisode}</span> <span className="text-slate-600">/</span> {totalEpisodes}
          </div>
        </div>
        <div className="bg-cyber-800/50 p-4 rounded-xl border border-cyber-700 backdrop-blur-sm">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">观众留存 (Retention)</div>
          <div className="text-2xl font-bold font-mono text-cyber-accent">
            {activeAgentIds.length} <span className="text-sm text-slate-500">/ {agents.length}</span>
          </div>
        </div>
        <div className="flex items-center justify-end">
           {status === 'idle' && (
              <button 
                onClick={onStart}
                disabled={totalEpisodes === 0}
                className="flex items-center gap-2 bg-cyber-500 hover:bg-cyber-400 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-cyber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={18} fill="currentColor" />
                开始仿真 (START)
              </button>
           )}
           {status === 'running' && (
             <div className="flex items-center gap-2 text-cyber-accent animate-pulse">
                <Users size={18} />
                <span>市场模拟中...</span>
             </div>
           )}
           {status === 'paused' && (
             <div className="text-yellow-500 font-bold border border-yellow-500 px-4 py-2 rounded">
               已暂停 (PAUSED)
             </div>
           )}
           {status === 'completed' && (
             <div className="text-green-500 font-bold border border-green-500 px-4 py-2 rounded">
               仿真已完成 (COMPLETED)
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Main Agent Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-cyber-900/50 rounded-xl border border-cyber-800 p-4">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-cyber-accent font-mono text-sm flex items-center gap-2">
               <Users size={16} /> 实时观众反馈 (Live Feedback)
             </h3>
             <div className="text-xs text-slate-500 flex items-center gap-1">
                <Info size={12} />
                点击卡片查看完整人设详情
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {agents.map(agent => {
              const isActive = activeAgentIds.includes(agent.id);
              // If simulation hasn't started, everyone is active. If running, check active list. 
              // If dropped, status is dropped.
              let agentStatus: 'active' | 'dropped' | 'waiting' = 'waiting';
              if (currentEpisode > 0 || status === 'completed') {
                  agentStatus = isActive ? 'active' : 'dropped';
              }
              
              return (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
                  status={agentStatus}
                  feedback={getLatestFeedback(agent.id)}
                  onClick={() => setSelectedAgent(agent)}
                />
              );
            })}
          </div>
        </div>

        {/* Analytics & Logs Sidebar */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Retention Chart */}
          <div className="h-64 bg-cyber-800/30 rounded-xl border border-cyber-800 p-4">
             <h3 className="text-slate-400 text-xs uppercase mb-2">留存曲线 (Retention Curve)</h3>
             <div className="h-full w-full">
               <ResponsiveContainer width="100%" height="90%">
                 <LineChart data={retentionData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                   <XAxis dataKey="episode" stroke="#94a3b8" fontSize={10} />
                   <YAxis stroke="#94a3b8" fontSize={10} domain={[0, agents.length]} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                   />
                   <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{r: 4, fill: '#06b6d4'}} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Console Logs */}
          <div className="flex-1 bg-black rounded-xl border border-cyber-800 p-4 font-mono text-xs overflow-hidden flex flex-col">
            <div className="text-green-500 mb-2 border-b border-cyber-900 pb-1">系统日志 (System Logs) >_</div>
            <div className="flex-1 overflow-y-auto space-y-1 text-slate-300">
               {logs.length === 0 && <span className="text-slate-600 italic">Ready to initialize...</span>}
               {logs.map((log, i) => (
                 <div key={i} className="break-words">
                    <span className="text-cyber-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                 </div>
               ))}
               <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};