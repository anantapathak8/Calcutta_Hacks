import { useState, useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, message, type = 'info', onConfirm }) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return 'border-green-500 bg-green-900/20';
            case 'error':
                return 'border-red-500 bg-red-900/20';
            case 'warning':
                return 'border-yellow-500 bg-yellow-900/20';
            case 'confirm':
                return 'border-cyan-500 bg-cyan-900/20';
            default:
                return 'border-gray-500 bg-gray-900/20';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'confirm':
                return '❓';
            default:
                return 'ℹ️';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={`bg-gray-800 rounded-lg border-2 ${getTypeStyles()} shadow-2xl max-w-md w-full mx-4 animate-scale-in`}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">{getIcon()}</div>
                        <div className="flex-1">
                            {title && (
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {title}
                                </h3>
                            )}
                            <p className="text-gray-300">{message}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3 p-4 bg-black/30 rounded-b-lg">
                    {type === 'confirm' ? (
                        <>
                            <button
                                onClick={() => {
                                    onConfirm && onConfirm();
                                    onClose();
                                }}
                                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition"
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PromptModal = ({ isOpen, onClose, title, message, defaultValue = '', onConfirm }) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg border-2 border-cyan-500 bg-cyan-900/20 shadow-2xl max-w-md w-full mx-4 animate-scale-in">
                <div className="p-6">
                    {title && (
                        <h3 className="text-xl font-bold text-white mb-4">
                            {title}
                        </h3>
                    )}
                    {message && (
                        <p className="text-gray-300 mb-4">{message}</p>
                    )}
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onConfirm && onConfirm(value);
                                onClose();
                            }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-white"
                        autoFocus
                    />
                </div>
                
                <div className="flex gap-3 p-4 bg-black/30 rounded-b-lg">
                    <button
                        onClick={() => {
                            onConfirm && onConfirm(value);
                            onClose();
                        }}
                        className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition"
                    >
                        OK
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export { Modal, PromptModal };
