import React from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    return (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden selection:bg-[#00f3ff] selection:text-black">
            <Sidebar />
            <main className="flex-1 relative overflow-auto">
                {/* Animated Grid Background */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] animate-grid-flow" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent h-32 bottom-0" />
                </div>

                <div className="relative z-10 h-full mt-12">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
