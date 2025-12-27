import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect } from 'react';

const AIExplanation = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');

    // Typing effect logic
    useEffect(() => {
        if (!text) {
            setDisplayedText('');
            return;
        }

        // If text is very long, show it immediately to avoid waiting too long
        if (text.length > 500) {
            setDisplayedText(text);
            return;
        }

        let i = 0;
        const speed = 15; // ms per char
        setDisplayedText('');

        const intervalId = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(intervalId);
        }, speed);

        return () => clearInterval(intervalId);
    }, [text]);

    return (
        <div className="bg-cyber-light/50 border-l-4 border-cyber-neon p-4 rounded backdrop-blur-sm min-h-[100px]">
            <h3 className="text-cyber-neon text-sm font-bold uppercase mb-2 tracking-wider">AI Risk Assessment</h3>
            <div className="text-gray-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                {displayedText ? (
                    <ReactMarkdown>{displayedText}</ReactMarkdown>
                ) : (
                    <span className="animate-pulse">Analyzing system telemetry...</span>
                )}
            </div>
        </div>
    );
};

export default AIExplanation;
