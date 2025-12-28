import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Share2, Bot, Terminal, Menu, X, Wifi, Target, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
    const [isMobileOpen, setMobileOpen] = useState(false);

    const toggleMobile = () => setMobileOpen(!isMobileOpen);

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#050505] border-b border-[#00f3ff]/20 z-[9999] flex items-center justify-between px-4 shadow-lg shadow-[#00f3ff]/10">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-[#00f3ff] animate-pulse-fast" />
                    <div className="flex flex-col">
                        <span className="font-bold tracking-widest text-white text-sm leading-none">SENTINEL</span>
                        <span className="text-[10px] text-[#00f3ff] tracking-wider leading-none">CYBER SECURITY</span>
                    </div>
                </div>
                <button
                    onClick={toggleMobile}
                    className="p-2 text-[#00f3ff] hover:bg-[#00f3ff]/10 rounded-lg transition-colors"
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Backdrop for Mobile */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-black/80 z-[100] lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <div className={`
                fixed lg:sticky top-0 left-0 h-screen bg-black/95 border-r border-[#00f3ff]/10 
                flex flex-col p-6 font-mono z-[100] shrink-0 transition-transform duration-300
                w-72 pt-20 lg:pt-6 overflow-y-auto custom-scrollbar
                ${isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-10 flex items-center gap-4 px-2 mt-12">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="text-[#00f3ff] shrink-0"
                    >
                        <Shield className="w-10 h-10 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]" />
                    </motion.div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-white tracking-widest">
                            SENTINEL
                        </h1>
                        <span className="text-[#00f3ff] text-xs tracking-[0.3em] font-mono">
                            AI NETWORK
                        </span>
                    </div>
                </div>

                <nav className="flex-1 space-y-4">
                    <NavItem to="/" icon={Terminal} label="OPS DASHBOARD" onClick={() => setMobileOpen(false)} />
                    <NavItem to="/ai-architect" icon={Bot} label="AI ARCHITECT" onClick={() => setMobileOpen(false)} />

                    {/* Deauth Simulator Section */}
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <div className="text-xs text-gray-500 px-3 mb-3 tracking-widest">DEAUTH SIMULATOR</div>
                        <NavItem to="/deauth-sim/net-config" icon={Wifi} label="NETWORK CONFIG" onClick={() => setMobileOpen(false)} />
                        <NavItem to="/deauth-sim/attacker-config" icon={Target} label="ATTACK CONFIG" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* NAT Forwarding Section */}
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <div className="text-xs text-gray-500 px-3 mb-3 tracking-widest">NAT & PROXY SIMULATOR</div>
                        <NavItem to="/nat-forwarding" icon={Share2} label="NAT FORWARDING" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* Compliance & Security Section */}
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <div className="text-xs text-gray-500 px-3 mb-3 tracking-widest">COMPLIANCE & SECURITY</div>
                        <NavItem to="/compliance-check" icon={Lock} label="COMPLIANCE CHECK" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* Subnet Designer Section */}
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <div className="text-xs text-gray-500 px-3 mb-3 tracking-widest">NETWORK PLANNING</div>
                        <NavItem to="/subnet-designer" icon={Share2} label="SUBNET DESIGNER" onClick={() => setMobileOpen(false)} />
                        <NavItem to="/hotspot-generator" icon={Wifi} label="HOTSPOT GENERATOR" onClick={() => setMobileOpen(false)} />
                    </div>
                </nav>

                <div className="mt-auto border-t border-gray-800 pt-6">
                    <div className="bg-[#1a1a1a] p-3 rounded border border-white/5 flex gap-3 items-center">
                        <div className="relative">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                        </div>
                        <div className="text-[10px] space-y-0.5">
                            <p className="text-white font-bold">SYSTEM ONLINE</p>
                            <p className="text-gray-500">v2.0.4 • STABLE</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const NavItem = ({ to, icon: Icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => `
            group flex items-center gap-3 p-3 rounded-lg transition-all duration-300 relative overflow-hidden
            ${isActive ? 'text-[#00f3ff] bg-[#00f3ff]/10 border border-[#00f3ff]/30 shadow-neon-blue' : 'text-gray-500 hover:text-white hover:bg-white/5'}
        `}
    >
        <Icon size={20} className="group-hover:scale-110 transition-transform" />
        <span className="tracking-wide">{label}</span>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00f3ff] transform -translate-x-full transition-transform group-[.active]:translate-x-0" />
    </NavLink>
);

export default Sidebar;
