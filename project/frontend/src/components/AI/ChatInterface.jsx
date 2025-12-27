import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Terminal, ChevronRight } from 'lucide-react';

const ChatInterface = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "I am SentinelAI Architect. I can analyze your network configuration and suggest security improvements. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:5001/api/chat', { message: input });
            const aiResponse = res.data.ai_interpretation;

            let assistantMsg = {
                role: 'assistant',
                content: aiResponse.explanation,
                command: aiResponse.command,
                risk: aiResponse.risk_level
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI Reasoning Engine.", risk: "ERROR" }]);
        }
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] p-6">
            <div className="flex-1 overflow-auto space-y-6 mb-4 pr-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-[#00f3ff]/20 text-[#00f3ff]' : 'bg-gray-700 text-white'}`}>
                            {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                        </div>

                        <div className={`max-w-2xl rounded-lg p-4 space-y-2 ${msg.role === 'assistant' ? 'bg-[#1a1a1a] border border-white/5' : 'bg-blue-600/20 border border-blue-500/30'}`}>
                            <div className="prose prose-invert prose-sm">
                                {msg.content}
                            </div>

                            {msg.command && (
                                <div className="mt-3 bg-black rounded p-3 font-mono text-xs border border-gray-800 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Terminal size={12} />
                                        <span>SUGGESTED ACTION</span>
                                    </div>
                                    <code className="text-green-400">$ {msg.command}</code>
                                    {/* Action Button (Mock MCP trigger) */}
                                    <button className="self-end bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] px-3 py-1 rounded text-[10px] flex items-center gap-1 transition-colors border border-[#00f3ff]/30">
                                        <ChevronRight size={12} />
                                        EXECUTE
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#00f3ff]/20 text-[#00f3ff] flex items-center justify-center animate-pulse">
                            <Bot size={20} />
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg p-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce delay-75" />
                            <span className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask SentinelAI to secure your network..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 pr-16 text-white text-lg focus:outline-none focus:border-[#00f3ff]/50 transition-colors"
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-[#00f3ff] hover:bg-[#00f3ff]/90 text-black rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
