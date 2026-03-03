import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../../components/PageShell';
import GlassCard from '../../components/GlassCard';

function AdminLogin() {
    const [secretKey, setSecretKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Animation grace time

            const response = await api.post('/api/admin/login', { secretKey });
            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.token);
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authorization protocols denied.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell center>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="z-10 w-full max-w-3xl"
            >
                <GlassCard className="rounded-[40px] relative overflow-hidden p-0">
                    <div className="flex flex-col sm:flex-row">

                        {/* Left Panel: Logo */}
                        <motion.div
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.5 }}
                            className="p-8 sm:p-12 sm:w-5/12 brand-gradient border-b sm:border-b-0 sm:border-r border-white/15 flex items-center justify-center"
                        >
                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center relative overflow-hidden">
                                    <img src="/Logo.png" alt="Campus Creative" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Panel: Admin Key Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="p-8 sm:p-12 sm:w-7/12"
                        >
                            <div className="bg-white/70 border border-slate-200/80 rounded-3xl p-8 sm:p-10">
                                <div className="w-full text-left mb-6">
                                    <h2 className="text-lg sm:text-xl font-extrabold tracking-wide">Enter Admin Key</h2>
                                    <p className="mt-2 text-sm text-slate-600 font-light">This route is not shown to normal users.</p>
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

                                <form onSubmit={handleLogin} className="w-full">
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            className="input-field pb-2 font-mono"
                                            placeholder="Admin key"
                                            required
                                        />
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button type="submit" disabled={loading} className="btn-primary group px-8 py-3 tracking-widest text-xs">
                                            <div className="absolute inset-0 w-full h-full bg-white/40 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                            <span className="relative flex items-center justify-center font-bold">
                                                {loading ? 'AUTHORIZING...' : 'CONTINUE'}
                                            </span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </GlassCard>
            </motion.div>
        </PageShell>
    );
}

export default AdminLogin;
