import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Terminal, ShieldAlert, Cpu } from 'lucide-react';

const ChatInterface = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'system', content: 'SentinelAI Command Interface Online. waiting for input...' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Direct call to our new backend endpoint
            const response = await axios.post('http://localhost:5001/api/chat', {
                message: userMsg
            });

            const aiData = response.data.ai_interpretation;
            const execData = response.data.execution_result;

            if (aiData.command) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Running: ${aiData.command}`,
                    type: 'command'
                }]);

                if (execData) {
                    setMessages(prev => [...prev, {
                        role: 'system',
                        content: `Output: ${execData.output || execData.error || 'Done'}`,
                        type: execData.status === 'executed' ? 'success' : 'error'
                    }]);
                }
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "I couldn't interpret that as a valid security command. Please try again."
                }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'error',
                content: `Error: ${error.message}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-black/90 border border-cyan-500/50 rounded-lg w-96 h-96 mb-4 flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-sm overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-cyan-950/50 p-3 border-b border-cyan-500/30 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Terminal size={16} />
                            <span className="font-mono text-sm tracking-wider">COMMAND_UPLINK</span>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-3 py-2 rounded max-w-[90%] break-words
                  ${msg.role === 'user'
                                        ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-500/30'
                                        : msg.type === 'command'
                                            ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30'
                                            : msg.type === 'error'
                                                ? 'bg-red-900/20 text-red-400 border border-red-500/30'
                                                : 'bg-black/40 text-gray-300 border border-gray-700/50'
                                    }`}>
                                    {msg.role === 'assistant' && <Cpu size={12} className="inline mr-2 mb-0.5" />}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="text-cyan-500/50 animate-pulse text-xs pl-2">Thinking...</div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-500/30 bg-black/50">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ex host: Block port 4000..."
                                className="w-full bg-cyan-950/30 border border-cyan-500/30 rounded pl-3 pr-10 py-2 text-cyan-100 placeholder-cyan-700 text-sm focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="absolute right-2 top-1.5 text-cyan-500 hover:text-cyan-300 disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400 opacity-20 group-hover:opacity-40"></div>
                <Terminal size={24} />
            </button>
        </div>
    );
};

export default ChatInterface;
