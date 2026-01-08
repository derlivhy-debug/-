
import React from 'react';
import { Agent, AudienceFeedback } from '../types';
import { User, MessageSquare, Brain } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  feedback?: AudienceFeedback;
  status: 'active' | 'dropped' | 'waiting';
  onClick?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, feedback, status, onClick }) => {
  const isDropped = status === 'dropped';
  const isMale = agent.profile.gender === '男';
  
  return (
    <div 
      onClick={onClick}
      className={`
      relative overflow-hidden rounded-lg border p-3 transition-all duration-300
      ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
      ${isDropped 
        ? 'border-red-900/30 bg-red-950/10 opacity-60 grayscale' 
        : 'border-cyber-700 bg-cyber-800 hover:border-cyber-500 hover:shadow-lg hover:shadow-cyber-500/20'}
    `}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${isMale ? 'bg-blue-900/50 text-blue-400' : 'bg-pink-900/50 text-pink-400'}`}>
            <User size={14} />
          </div>
          <div>
            <div className="text-xs font-bold text-cyber-400 flex items-center gap-1">
              {agent.id} 
              <span className="text-[9px] text-yellow-500/80 font-normal px-1">{agent.psychology.iceberg?.mbti?.split(' ')[0]}</span>
            </div>
            <div className="text-[10px] text-slate-400">{agent.profile.job}</div>
          </div>
        </div>
        <div className={`text-[10px] px-1.5 py-0.5 rounded border 
          ${isDropped 
            ? 'border-red-500/50 text-red-500' 
            : 'border-green-500/50 text-green-500'}`}>
          {isDropped ? 'DROP' : 'ACTIVE'}
        </div>
      </div>

      {feedback ? (
        <div className="space-y-2">
          <div className="bg-black/30 p-2 rounded text-xs border-l-2 border-cyber-500">
             <div className="flex items-center gap-1 text-cyber-accent mb-0.5">
                <MessageSquare size={10} />
                <span className="font-mono opacity-70">弹幕</span>
             </div>
             <p className="text-white italic">"{feedback.bullet_screen}"</p>
          </div>

          <div className="text-[10px] text-slate-400">
             <div className="flex items-center gap-1 mb-0.5">
                <Brain size={10} />
                <span>潜意识 (System 1 & 2)...</span>
             </div>
             {/* Show the synthesized inner thought which now contains the System 1/2 chain */}
             <p className="line-clamp-3 leading-tight whitespace-pre-line">{feedback.inner_thought}</p>
          </div>

          {isDropped && feedback.churn_reason && (
             <div className="text-[10px] text-red-400 font-semibold mt-1">
               弃剧原因: {feedback.churn_reason}
             </div>
          )}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-slate-600 text-xs italic flex-col gap-1">
           <div>{status === 'waiting' ? '等待剧本...' : '已初始化'}</div>
           <div className="text-[9px] text-slate-700">{agent.lifeStatus.split('。')[0]}</div>
        </div>
      )}

      {/* Vibe Tags */}
      <div className="mt-3 flex flex-wrap gap-1">
        <span className="text-[9px] px-1 bg-cyber-900/50 text-slate-400 rounded">
            {agent.psychology.vibe}
        </span>
      </div>
    </div>
  );
};