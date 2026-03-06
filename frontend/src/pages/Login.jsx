import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import users from '../data/users.json';

function Login() {
    const [teamName, setTeamName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const normalizeTeamId = (name) => (name || '').trim().toLowerCase();

    const toDisplayRole = (role) => {
        const value = (role || '').trim().toLowerCase();
        if (!value) return '';
        if (value.includes('leader')) return 'Lead';

        const memberMatch = value.match(/member\s*(\d+)/);
        if (memberMatch?.[1]) return `Member ${memberMatch[1]}`;

        if (value.startsWith('team member')) return (role || '').replace(/team\s+/i, '');
        return role;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            const normalized = teamName.trim().toLowerCase();
            const members = users.filter(u => (u.teamName || '').trim().toLowerCase() === normalized);
            if (!members.length) {
                setError('Invalid team name');
                return;
            }

            const canonicalTeamName = members[0]?.teamName || teamName.trim();
            const teamId = normalizeTeamId(canonicalTeamName);
            const leaderEmail = members.find((m) => (m.role || '').toLowerCase().includes('leader'))?.email || '';

            localStorage.setItem('userToken', teamId);
            localStorage.setItem(
                'userData',
                JSON.stringify({
                    id: teamId,
                    name: canonicalTeamName,
                    email: leaderEmail,
                    teamMembers: members.map((m) => ({
                        role: toDisplayRole(m.role),
                        name: m.name,
                        registerNumber: m.registerNumber,
                        email: m.email
                    }))
                })
            );
            navigate('/user/dashboard');
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-transparent">

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="z-10 w-full max-w-3xl"
            >
                <div className="glass rounded-[40px] relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row">

                        {/* Left Panel: Logo + Instructions */}
                        <motion.div
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.5 }}
                            className="p-8 sm:p-12 sm:w-5/12 brand-gradient text-white border-b sm:border-b-0 sm:border-r border-white/15"
                        >
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-white/60 border border-slate-200/70 text-slate-700">
                                Sign in required
                            </span>

                            <div className="mt-6">
                                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center relative overflow-hidden">
                                    <img src="/Logo.png" alt="Campus Creative" className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
                                </div>
                            </div>

                            <h2 className="mt-7 text-2xl font-extrabold tracking-tight text-white">Welcome back</h2>
                            <p className="mt-2 text-sm text-white/80 font-light">Please sign in to access the app.</p>

                            <ul className="mt-6 space-y-3 text-sm text-white/80 font-light">
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 w-5 h-5 rounded-full bg-white/60 border border-white/20 flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                    <span>Use your team name to sign in</span>
                                </li>
                            </ul>
                        </motion.div>

                        {/* Right Panel: Existing Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="p-8 sm:p-12 sm:w-7/12"
                        >
                            <div className="w-full text-left mb-6">
                                <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide">Login</h2>
                                <p className="mt-2 text-sm text-slate-600 font-light">Enter your team name to sign in.</p>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm text-center backdrop-blur-md"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleLogin} className="w-full space-y-6">

                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                    className="relative mb-8"
                                >
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Team Name</label>
                                    <input
                                        type="text"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="input-field pb-2"
                                        placeholder="Enter team name"
                                        required
                                    />
                                </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                            className="pt-2"
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary group w-full py-4 tracking-widest text-sm"
                            >
                                <div className="absolute inset-0 w-full h-full bg-white/40 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span className="relative flex items-center justify-center font-bold">
                                    {loading ? (
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : 'LOGIN'}
                                </span>
                            </button>
                        </motion.div>

                            </form>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default Login;
