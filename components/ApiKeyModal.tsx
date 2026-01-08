
import React, { useState, useEffect } from 'react';
import { Settings, Lock } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'doubao', model: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'deepseek' | 'gemini' | 'qwen' | 'doubao'>('gemini');
  const [model, setModel] = useState('gemini-3-flash-preview');

  useEffect(() => {
    const storedKey = localStorage.getItem('audience_sim_api_key');
    const storedProvider = localStorage.getItem('audience_sim_provider');
    if (storedKey) setApiKey(storedKey);
    if (storedProvider) setProvider(storedProvider as any);
  }, []);

  const handleSave = () => {
    if (!apiKey) return;
    localStorage.setItem('audience_sim_api_key', apiKey);
    localStorage.setItem('audience_sim_provider', provider);
    onSave(apiKey, provider, model);
    setIsOpen(false);
  };

  const handleProviderChange = (p: string) => {
      const newProvider = p as any;
      setProvider(newProvider);
      // Set defaults
      if (newProvider === 'gemini') setModel('gemini-3-flash-preview');
      if (newProvider === 'deepseek') setModel('deepseek-chat');
      if (newProvider === 'openai') setModel('gpt-4o-mini');
      if (newProvider === 'qwen') setModel('qwen-max');
      if (newProvider === 'doubao') setModel('doubao-seed-1-6-251015');
  }

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 left-4 p-2 bg-cyber-800 text-slate-400 rounded-full hover:bg-cyber-700 hover:text-white transition-colors"
    >
      <Settings size={20} />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-cyber-900 border border-cyber-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 mb-6 text-white">
          <Lock className="text-cyber-accent" />
          <h2 className="text-xl font-bold">系统配置 (System Config)</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">模型厂商 (Provider)</label>
            <select 
              value={provider} 
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
            >
              <option value="gemini">Google Gemini</option>
              <option value="deepseek">DeepSeek (深度求索)</option>
              <option value="doubao">Doubao (Seed 1.6)</option>
              <option value="qwen">Qwen (通义千问)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">模型名称 (Model Name)</label>
            {/* Render a select for common options but allow editing if needed, or just Input */}
            {provider === 'gemini' && (
               <select 
                 value={model} 
                 onChange={(e) => setModel(e.target.value)}
                 className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
               >
                 <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                 <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
               </select>
            )}
            {provider === 'deepseek' && (
               <select 
                 value={model} 
                 onChange={(e) => setModel(e.target.value)}
                 className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
               >
                 <option value="deepseek-chat">DeepSeek V3 (Chat)</option>
                 <option value="deepseek-reasoner">DeepSeek R1 (Reasoner)</option>
               </select>
            )}
             {provider === 'qwen' && (
               <select 
                 value={model} 
                 onChange={(e) => setModel(e.target.value)}
                 className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
               >
                 <option value="qwen-max">Qwen3-MAX (qwen-max)</option>
                 <option value="qwen-plus">Qwen Plus</option>
                 <option value="qwen-turbo">Qwen Turbo</option>
               </select>
            )}
            {(provider === 'openai' || provider === 'doubao') && (
                <input 
                  type="text" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === 'doubao' ? "doubao-seed-1-6-251015" : "gpt-4o"}
                  className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
                />
            )}
            {provider === 'doubao' && (
                <p className="text-[10px] text-slate-500 mt-1">
                    注意: Doubao 需要填写接入点 ID (Endpoint ID) 或完整的模型名，例如: doubao-seed-1-6-251015
                </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-cyber-800 border border-cyber-600 rounded p-2 text-white focus:outline-none focus:border-cyber-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">Key 仅保存在本地浏览器中 (Stored locally).</p>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-cyber-500 hover:bg-cyber-400 text-white font-bold py-2 rounded transition-colors mt-4"
          >
            连接系统 (Connect)
          </button>
        </div>
      </div>
    </div>
  );
};
