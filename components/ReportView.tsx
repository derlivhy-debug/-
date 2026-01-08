
import React, { useMemo, useState } from 'react';
import { Agent, SimulationStepResult, AudienceFeedback, AgentProfile } from '../types';
import { AgentCard } from './AgentCard';
import { AgentDetailModal } from './AgentDetailModal';
import { FileText, TrendingDown, Users, AlertTriangle, Download, PieChart, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportViewProps {
  results: SimulationStepResult[];
  agents: Agent[];
  logs: string[];
}

interface GroupStat {
  total: number;
  retained: number;
  rate: string;
}

export const ReportView: React.FC<ReportViewProps> = ({ results, agents, logs }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // 1. Calculate Retention Data
  const retentionData = useMemo(() => {
    return results.map(r => ({
      name: `Ep ${r.episodeIndex}`,
      count: r.activeAgents,
      rate: r.retentionRate.toFixed(1)
    }));
  }, [results]);

  // 2. Determine Final State for each Agent
  const agentFinalStates = useMemo(() => {
    const states: { agent: Agent, feedback: AudienceFeedback | undefined, status: 'active' | 'dropped', dropEpisode?: number }[] = [];
    
    agents.forEach(agent => {
      let lastFeedback: AudienceFeedback | undefined;
      let isDropped = false;
      let dropEpisode = 0;

      // Find where they dropped or last feedback
      for (const step of results) {
        const f = step.feedback.find(fb => fb.agent_id === agent.id);
        if (f) {
          lastFeedback = f;
          if (f.decision === 'DROP') {
            isDropped = true;
            dropEpisode = step.episodeIndex;
            break; // Stop looking once dropped
          }
        }
      }

      states.push({
        agent,
        feedback: lastFeedback,
        status: isDropped ? 'dropped' : 'active',
        dropEpisode
      });
    });
    return states;
  }, [agents, results]);

  // 3. Generate Statistical Summary
  const summary = useMemo(() => {
    if (results.length === 0) return null;
    
    const initialCount = agents.length;
    const finalCount = results[results.length - 1].activeAgents;
    const retentionRate = ((finalCount / initialCount) * 100).toFixed(1);
    
    // Find episode with max churn
    let maxChurn = 0;
    let worstEpisode = 0;
    let previousCount = initialCount;
    
    results.forEach(r => {
        const churn = previousCount - r.activeAgents;
        if (churn > maxChurn) {
            maxChurn = churn;
            worstEpisode = r.episodeIndex;
        }
        previousCount = r.activeAgents;
    });

    // Collect common churn reasons (unique list roughly)
    const churnReasons = results
        .flatMap(r => r.feedback)
        .filter(f => f.decision === 'DROP' && f.churn_reason)
        .map(f => `${f.agent_id}: ${f.churn_reason}`);

    return {
        initialCount,
        finalCount,
        retentionRate,
        worstEpisode,
        maxChurn,
        churnReasons: churnReasons // All reasons
    };
  }, [results, agents]);

  // 4. Segmentation Analysis Logic
  const segmentationStats = useMemo(() => {
    if (!summary) return null;

    // Use agentFinalStates as source of truth for who is active
    const activeAgentIds = agentFinalStates
        .filter(s => s.status === 'active')
        .map(s => s.agent.id);
    
    const calculateGroupRetention = (key: keyof AgentProfile) => {
        const groups: Record<string, GroupStat> = {};
        
        agents.forEach(agent => {
            const val = agent.profile[key];
            if (!groups[val]) groups[val] = { total: 0, retained: 0, rate: '0.0' };
            
            groups[val].total += 1;
            if (activeAgentIds.includes(agent.id)) {
                groups[val].retained += 1;
            }
        });

        // Calculate rates
        Object.keys(groups).forEach(k => {
            const g = groups[k];
            g.rate = g.total > 0 ? ((g.retained / g.total) * 100).toFixed(1) : '0.0';
        });

        return groups;
    };

    return {
        gender: calculateGroupRetention('gender'),
        city: calculateGroupRetention('city'),
        age: calculateGroupRetention('age')
    };
  }, [agents, summary, agentFinalStates]);

  // 5. Download Report Handler
  const downloadReport = () => {
    if (!summary || !segmentationStats) return;

    const date = new Date().toLocaleString();
    let text = `AUDIENCE ZERO - 仿真分析报告\n生成时间: ${date}\n`;
    text += `============================================\n\n`;

    text += `[1. 核心指标]\n`;
    text += `- 初始观众: ${summary.initialCount} 人\n`;
    text += `- 最终留存: ${summary.finalCount} 人\n`;
    text += `- 完播率 (Retention): ${summary.retentionRate}%\n`;
    text += `- 最大流失点: 第 ${summary.worstEpisode} 集 (流失 ${summary.maxChurn} 人)\n\n`;

    text += `[2. 群体画像留存分析]\n`;
    
    const appendSeg = (title: string, data: any) => {
        text += `--- ${title} ---\n`;
        Object.entries(data).forEach(([key, val]: [string, any]) => {
            text += `${key}: 留存 ${val.retained}/${val.total} (率: ${val.rate}%)\n`;
        });
        text += `\n`;
    };

    appendSeg("性别维度", segmentationStats.gender);
    appendSeg("城市维度", segmentationStats.city);
    appendSeg("年龄维度", segmentationStats.age);

    text += `[3. 关键流失原因记录]\n`;
    summary.churnReasons.forEach(r => text += `- ${r}\n`);
    text += `\n`;

    text += `[4. 分集数据]\n`;
    retentionData.forEach(d => {
        text += `${d.name}: 剩余 ${d.count} 人 (留存率 ${d.rate}%)\n`;
    });

    // Trigger download
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AudienceZero_Report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (results.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <AlertTriangle size={48} className="mb-4 text-yellow-500" />
              <h2 className="text-xl font-bold">暂无数据</h2>
              <p>请先运行仿真以生成报告。</p>
          </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-8 pb-10 relative">
      <AgentDetailModal 
        agent={selectedAgent!} 
        onClose={() => setSelectedAgent(null)} 
      />

      {/* Header & Download */}
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
              <FileText className="text-cyber-accent" />
              <h2 className="text-2xl font-bold text-white font-mono">仿真总结报告 (ANALYSIS)</h2>
          </div>
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 bg-cyber-500 hover:bg-cyber-400 text-white px-4 py-2 rounded font-bold shadow-lg shadow-cyber-500/20 transition-all"
          >
              <Download size={18} />
              下载报告 (TXT)
          </button>
      </div>
      
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-cyber-800/50 p-6 rounded-xl border border-cyber-700 backdrop-blur-sm">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">完播率 (Retention Rate)</div>
              <div className={`text-4xl font-bold font-mono ${Number(summary?.retentionRate) > 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {summary?.retentionRate}%
              </div>
              <div className="text-sm text-slate-500 mt-2">
                  {summary?.finalCount} / {summary?.initialCount} 观众留存
              </div>
          </div>
          <div className="bg-cyber-800/50 p-6 rounded-xl border border-cyber-700 backdrop-blur-sm">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">最大流失点 (High Churn Ep)</div>
              <div className="text-4xl font-bold font-mono text-yellow-400">
                  第 {summary?.worstEpisode} 集
              </div>
              <div className="text-sm text-slate-500 mt-2">
                  该集流失 {summary?.maxChurn} 人
              </div>
          </div>
          <div className="bg-cyber-800/50 p-6 rounded-xl border border-cyber-700 backdrop-blur-sm flex flex-col">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">关键流失原因 (Churn Reasons)</div>
              <div className="flex-1 overflow-y-auto max-h-[80px] pr-2">
                  <ul className="text-xs text-slate-300 space-y-2">
                      {summary?.churnReasons.slice(0, 10).map((r, i) => (
                          <li key={i} className="whitespace-normal break-words border-b border-cyber-800 pb-1 last:border-0">
                             • {r}
                          </li>
                      ))}
                      {summary && summary.churnReasons.length > 10 && (
                          <li className="text-slate-500 italic">...及更多 (请下载完整报告)</li>
                      )}
                  </ul>
              </div>
          </div>
      </div>

      {/* Segmentation Analysis */}
      {segmentationStats && (
        <div className="bg-cyber-900 border border-cyber-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <PieChart className="text-pink-500" />
                <h3 className="text-lg font-bold text-white font-mono">群体留存透视 (DEMOGRAPHIC ANALYSIS)</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gender Table */}
                <div>
                    <h4 className="text-cyber-400 text-sm font-bold mb-3 uppercase border-l-2 border-cyber-400 pl-2">性别维度</h4>
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs uppercase bg-cyber-800 text-slate-300">
                            <tr>
                                <th className="px-3 py-2 rounded-l">类型</th>
                                <th className="px-3 py-2">留存/总数</th>
                                <th className="px-3 py-2 rounded-r">留存率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(segmentationStats.gender).map(([key, val]: [string, GroupStat]) => (
                                <tr key={key} className="border-b border-cyber-800 hover:bg-cyber-800/30">
                                    <td className="px-3 py-2 font-medium text-white">{key}</td>
                                    <td className="px-3 py-2">{val.retained} / {val.total}</td>
                                    <td className={`px-3 py-2 font-bold ${Number(val.rate) > 60 ? 'text-green-400' : Number(val.rate) < 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {val.rate}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* City Table */}
                <div>
                    <h4 className="text-purple-400 text-sm font-bold mb-3 uppercase border-l-2 border-purple-400 pl-2">城市维度</h4>
                     <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs uppercase bg-cyber-800 text-slate-300">
                            <tr>
                                <th className="px-3 py-2 rounded-l">类型</th>
                                <th className="px-3 py-2">留存/总数</th>
                                <th className="px-3 py-2 rounded-r">留存率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(segmentationStats.city).map(([key, val]: [string, GroupStat]) => (
                                <tr key={key} className="border-b border-cyber-800 hover:bg-cyber-800/30">
                                    <td className="px-3 py-2 font-medium text-white">{key}</td>
                                    <td className="px-3 py-2">{val.retained} / {val.total}</td>
                                    <td className={`px-3 py-2 font-bold ${Number(val.rate) > 60 ? 'text-green-400' : Number(val.rate) < 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {val.rate}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Age Table */}
                <div>
                    <h4 className="text-orange-400 text-sm font-bold mb-3 uppercase border-l-2 border-orange-400 pl-2">年龄维度</h4>
                     <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs uppercase bg-cyber-800 text-slate-300">
                            <tr>
                                <th className="px-3 py-2 rounded-l">类型</th>
                                <th className="px-3 py-2">留存/总数</th>
                                <th className="px-3 py-2 rounded-r">留存率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(segmentationStats.age).map(([key, val]: [string, GroupStat]) => (
                                <tr key={key} className="border-b border-cyber-800 hover:bg-cyber-800/30">
                                    <td className="px-3 py-2 font-medium text-white">{key}</td>
                                    <td className="px-3 py-2">{val.retained} / {val.total}</td>
                                    <td className={`px-3 py-2 font-bold ${Number(val.rate) > 60 ? 'text-green-400' : Number(val.rate) < 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {val.rate}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Retention Chart */}
      <div className="bg-cyber-900 border border-cyber-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="text-cyber-500" />
              <h3 className="text-lg font-bold text-white font-mono">留存曲线 (RETENTION CURVE)</h3>
          </div>
          <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={retentionData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                   <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                   <YAxis stroke="#94a3b8" fontSize={12} domain={[0, agents.length]} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#06b6d4' }}
                   />
                   <Line type="monotone" dataKey="count" name="留存人数" stroke="#06b6d4" strokeWidth={3} dot={{r: 4, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 2}} />
                 </LineChart>
               </ResponsiveContainer>
          </div>
      </div>

      {/* Audience Detail Grid */}
      <div>
          <div className="flex items-center gap-2 mb-4">
              <Users className="text-cyber-400" />
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  观众画像与最终状态 (AUDIENCE MATRIX)
                  <span className="text-[10px] bg-cyber-800 text-slate-400 px-2 py-1 rounded font-normal normal-case border border-cyber-700 flex items-center gap-1">
                      <Info size={10} /> 点击查看详情
                  </span>
              </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agentFinalStates.map(({ agent, feedback, status }) => (
                  <AgentCard 
                    key={agent.id}
                    agent={agent}
                    feedback={feedback}
                    status={status}
                    onClick={() => setSelectedAgent(agent)}
                  />
              ))}
          </div>
      </div>

      {/* System Logs */}
      <div className="bg-black border border-cyber-800 rounded-xl p-4 font-mono text-xs">
          <h3 className="text-green-500 mb-2 border-b border-cyber-900 pb-1 font-bold">完整系统日志 (SYSTEM LOGS) >_</h3>
          <div className="h-48 overflow-y-auto space-y-1 text-slate-400">
               {logs.map((log, i) => (
                 <div key={i} className="break-words">
                    <span className="text-cyber-700 mr-2">[{i}]</span>
                    {log}
                 </div>
               ))}
          </div>
      </div>

    </div>
  );
};
