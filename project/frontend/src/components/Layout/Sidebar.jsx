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
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-purple-950/90 via-pink-950/90 to-purple-950/90 backdrop-blur-xl border-b border-purple-500/30 z-[9999] flex items-center justify-between px-4 shadow-lg shadow-purple-500/20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Shield className="w-6 h-6 text-purple-400 animate-pulse-fast" />
                        <div className="absolute inset-0 bg-purple-500 blur-md opacity-30 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold tracking-widest text-white text-sm leading-none">SENTINEL</span>
                        <span className="text-[10px] text-purple-400 tracking-wider leading-none">CYBER SECURITY</span>
                    </div>
                </div>
                <button
                    onClick={toggleMobile}
                    className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-all duration-300 hover:shadow-neon-purple"
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
                        className="fixed inset-0 bg-black/90 z-[100] lg:hidden backdrop-blur-md"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <div className={`
                fixed lg:sticky top-0 left-0 h-screen 
                bg-gradient-to-b from-black via-purple-950/20 to-black
                border-r border-purple-500/20
                flex flex-col p-6 font-mono z-[100] shrink-0 
                transition-all duration-300
                w-72 pt-20 lg:pt-6 overflow-y-auto custom-scrollbar
                ${isMobileOpen ? 'translate-x-0 shadow-2xl shadow-purple-500/30' : '-translate-x-full lg:translate-x-0'}
                relative
            `}>
                {/* Animated Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 animate-gradient-flow opacity-50 pointer-events-none" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-purple-500 rounded-full filter blur-[100px] opacity-10 animate-pulse" />
                <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-pink-500 rounded-full filter blur-[80px] opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="mb-10 flex items-center gap-4 px-2 mt-12 relative z-10">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="text-purple-400 shrink-0 relative"
                    >
                        <Shield className="w-10 h-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" />
                        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-40 animate-pulse" />
                    </motion.div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-gradient-animate tracking-widest">
                            SENTINEL
                        </h1>
                        <span className="text-purple-400 text-xs tracking-[0.3em] font-mono drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                            AI NETWORK
                        </span>
                    </div>
                </div>

                <nav className="flex-1 space-y-4 relative z-10">
                    <NavItem to="/" icon={Terminal} label="OPS DASHBOARD" onClick={() => setMobileOpen(false)} />
                    <NavItem to="/ai-architect" icon={Bot} label="AI ARCHITECT" onClick={() => setMobileOpen(false)} />

                    {/* Deauth Simulator Section */}
                    <div className="pt-4 mt-4 border-t border-purple-900/50">
                        <div className="text-xs text-purple-500/70 px-3 mb-3 tracking-widest font-semibold">DEAUTH SIMULATOR</div>
                        <NavItem to="/deauth-sim/net-config" icon={Wifi} label="NETWORK CONFIG" onClick={() => setMobileOpen(false)} />
                        <NavItem to="/deauth-sim/attacker-config" icon={Target} label="ATTACK CONFIG" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* NAT Forwarding Section */}
                    <div className="pt-4 mt-4 border-t border-purple-900/50">
                        <div className="text-xs text-purple-500/70 px-3 mb-3 tracking-widest font-semibold">NAT & PROXY SIMULATOR</div>
                        <NavItem to="/nat-forwarding" icon={Share2} label="NAT FORWARDING" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* Compliance & Security Section */}
                    <div className="pt-4 mt-4 border-t border-purple-900/50">
                        <div className="text-xs text-purple-500/70 px-3 mb-3 tracking-widest font-semibold">COMPLIANCE & SECURITY</div>
                        <NavItem to="/compliance-check" icon={Lock} label="COMPLIANCE CHECK" onClick={() => setMobileOpen(false)} />
                    </div>

                    {/* Subnet Designer Section */}
                    <div className="pt-4 mt-4 border-t border-purple-900/50">
                        <div className="text-xs text-purple-500/70 px-3 mb-3 tracking-widest font-semibold">NETWORK PLANNING</div>
                        <NavItem to="/subnet-designer" icon={Share2} label="SUBNET DESIGNER" onClick={() => setMobileOpen(false)} />
                        <NavItem to="/hotspot-generator" icon={Wifi} label="HOTSPOT GENERATOR" onClick={() => setMobileOpen(false)} />
                    </div>
                </nav>

                <div className="mt-auto border-t border-purple-900/50 pt-6 relative z-10">
                    <div className="bg-gradient-to-br from-purple-950/60 via-pink-950/40 to-purple-950/60 p-3 rounded-lg border border-purple-500/30 backdrop-blur-sm flex gap-3 items-center shadow-neon-purple transition-all duration-300 hover:shadow-neon-pink hover:scale-[1.02]">
                        <div className="relative">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30" />
                        </div>
                        <div className="text-[10px] space-y-0.5">
                            <p className="text-white font-bold tracking-wide">SYSTEM ONLINE</p>
                            <p className="text-purple-400">v2.0.4 • STABLE</p>
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
            ${isActive
                ? 'text-purple-300 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 border border-purple-500/40 shadow-neon-purple'
                : 'text-gray-400 hover:text-white hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30'
            }
        `}
    >
        {/* Gradient Background on Hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-pink-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Shimmer Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        <Icon size={20} className="group-hover:scale-110 transition-transform relative z-10 drop-shadow-[0_0_5px_currentColor]" />
        <span className="tracking-wide font-medium relative z-10">{label}</span>

        {/* Active Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-pink-400 to-orange-400 transform -translate-x-full transition-transform group-[.active]:translate-x-0 shadow-[0_0_10px_currentColor]" />
    </NavLink>
);

export default Sidebar;
