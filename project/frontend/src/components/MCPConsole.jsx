import { useRef, useEffect } from 'react';

const MCPConsole = ({ logs }) => {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="bg-black border border-cyber-dim rounded-lg p-2 font-mono text-xs h-48 overflow-y-auto shadow-inner shadow-gray-900">
            <div className="text-cyber-neon border-b border-gray-800 pb-1 mb-2">
                &gt; MCP_COMMAND_INTERFACE_V1.0
            </div>
            <div className="flex flex-col space-y-1">
                {logs.length === 0 && <span className="text-gray-600">Waiting for system logs...</span>}
                {logs.map((log, idx) => (
                    <div key={idx} className="break-all">
                        <span className="text-gray-500">[{log.timestamp || '00:00:00'}]</span>{' '}
                        <span
                            className={
                                log.type === 'CRITICAL' ? 'text-cyber-danger' :
                                    log.type === 'ACTION' ? 'text-cyber-success' :
                                        'text-cyber-neon'
                            }
                        >
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default MCPConsole;
