
import React from 'react';
import { Agent } from '../types';
import { X, User, MapPin, Briefcase, Zap, Fingerprint, Brain, Eye, AlertTriangle } from 'lucide-react';

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose }) => {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-cyber-900 border border-cyber-600 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-cyber-800 p-4 border-b border-cyber-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border border-white/10
                    ${agent.profile.gender === '男' ? 'bg-blue-900/50 text-blue-400' : 'bg-pink-900/50 text-pink-400'}`}>
                    {agent.id}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white tracking-wide">观众深层档案 (PERSONA)</h3>
                    <div className="text-xs text-slate-400 font-mono">
                        {agent.profile.job} @ {agent.profile.city}
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
            
            {/* Basic Profile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-cyber-800/50 p-3 rounded border border-cyber-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User size={12}/> 性别/年龄</div>
                    <div className="font-bold text-slate-200">{agent.profile.gender} / {agent.profile.age}</div>
                </div>
                <div className="bg-cyber-800/50 p-3 rounded border border-cyber-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin size={12}/> 城市</div>
                    <div className="font-bold text-slate-200">{agent.profile.city}</div>
                </div>
                <div className="bg-cyber-800/50 p-3 rounded border border-cyber-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Briefcase size={12}/> 职业</div>
                    <div className="font-bold text-slate-200">{agent.profile.job}</div>
                </div>
                <div className="bg-cyber-800/50 p-3 rounded border border-cyber-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Zap size={12}/> 状态</div>
                    <div className="font-bold text-slate-200">{agent.psychology.vibe}</div>
                </div>
            </div>

            {/* THE ICEBERG (Deep Persona) */}
            <div className="space-y-4">
                <h4 className="text-cyber-accent font-bold text-sm uppercase flex items-center gap-2 border-b border-cyber-800 pb-2">
                    <Fingerprint size={16}/> 灵魂深处 (Inner Self)
                </h4>
                
                <div className="bg-cyber-800/30 rounded-lg p-4 border border-cyber-700/50 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
                            <Brain size={12}/> 内在动机与冲突
                        </div>
                        <div className="text-sm text-slate-200 leading-relaxed">
                            {agent.psychology.iceberg?.innerMotivation}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                            <AlertTriangle size={12}/> 局限与偏见
                        </div>
                        <div className="text-sm text-slate-200 leading-relaxed">
                            {agent.psychology.iceberg?.limitations}
                        </div>
                    </div>
                </div>

                <h4 className="text-cyber-400 font-bold text-sm uppercase flex items-center gap-2 border-b border-cyber-800 pb-2 pt-2">
                    <Eye size={16}/> 感官与情境 (Context)
                </h4>

                <div className="bg-black/40 rounded-lg p-4 border border-cyber-700/50 space-y-4">
                     <div>
                        <div className="text-xs font-bold text-slate-500 mb-1">感官环境</div>
                        <div className="text-sm text-slate-300 italic font-mono">
                            "{agent.psychology.iceberg?.sensoryEnv}"
                        </div>
                    </div>
                     <div>
                        <div className="text-xs font-bold text-slate-500 mb-1">典型刷视频情境</div>
                        <div className="text-sm text-slate-300 italic font-mono">
                            "{agent.psychology.iceberg?.browsingContext}"
                        </div>
                    </div>
                </div>
            </div>

            {/* Memory / History */}
            {agent.memory.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-slate-500 font-bold text-sm uppercase flex items-center gap-2 border-b border-cyber-800 pb-2">
                        历史体验 (History)
                    </h4>
                     <div className="bg-black/40 rounded-lg p-4 border border-cyber-800 max-h-48 overflow-y-auto space-y-3 custom-scrollbar">
                        {agent.memory.map((mem, i) => (
                            <div key={i} className="text-xs text-slate-400 border-l-2 border-cyber-700 pl-3">
                                {mem}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
