import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

function AdminDashboard() {
    const [problems, setProblems] = useState([]);
    const [selections, setSelections] = useState([]);
    const [activeTab, setActiveTab] = useState('problems');
    const [viewMode, setViewMode] = useState(false);
    const [viewModeSaving, setViewModeSaving] = useState(false);

    const [logsQuery, setLogsQuery] = useState('');

    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });
    const [dashboardLoading, setDashboardLoading] = useState(true);

    const navigate = useNavigate();
    const token = localStorage.getItem('adminToken');

    useEffect(() => {
        if (!token) {
            navigate('/admin');
            return;
        }
        fetchData();
    }, [token, navigate]);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${token}` }
    });

    const fetchData = async () => {
        setDashboardLoading(true);
        try {
            const [resProb, resSel, resSettings] = await Promise.all([
                api.get('/api/admin/problems', getHeaders()),
                api.get('/api/admin/selections', getHeaders()),
                api.get('/api/admin/settings', getHeaders())
            ]);
            setProblems(resProb.data);
            setSelections(resSel.data);
            setViewMode(Boolean(resSettings.data?.viewMode));
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('adminToken');
                navigate('/admin');
            }
        } finally {
            setDashboardLoading(false);
        }
    };

    const handleToggleViewMode = async () => {
        setViewModeSaving(true);
        setMsg({ text: '', type: '' });
        try {
            const next = !viewMode;
            const res = await api.patch(
                '/api/admin/settings/view-mode',
                { viewMode: next },
                getHeaders()
            );

            setViewMode(Boolean(res.data?.viewMode));
            setMsg({ text: `View Mode ${res.data?.viewMode ? 'ENABLED' : 'DISABLED'}.`, type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err) {
            setMsg({ text: err.response?.data?.message || 'Failed to update View Mode', type: 'error' });
        } finally {
            setViewModeSaving(false);
        }
    };

    const handleAddProblem = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        setMsg({ text: '', type: '' });
        try {
            const payload = { title: newTitle, description: newDesc, difficulty: 'Medium', isActive: true };
            await api.post('/api/admin/problems', payload, getHeaders());

            setMsg({ text: 'Directive uploaded to mainframe successfully.', type: 'success' });
            setNewTitle('');
            setNewDesc('');
            fetchData();

            // Auto clear message
            setTimeout(() => setMsg({ text: '', type: '' }), 4000);
        } catch (err) {
            setMsg({ text: err.response?.data?.message || 'Error transmitting parameters', type: 'error' });
        } finally {
            setAddLoading(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/api/admin/problems/${id}/toggle`, {}, getHeaders());
            fetchData();
        } catch (err) {
            alert('Failed to execute state toggle');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/');
    };

    const normalizedLogsQuery = logsQuery.trim().toLowerCase();
    const filteredSelections = normalizedLogsQuery
        ? selections.filter((s) => {
            const fields = [s?.teamName, s?.problemTitle, s?.email];
            return fields.some((v) => String(v ?? '').toLowerCase().includes(normalizedLogsQuery));
        })
        : selections;

    // Content fade variants
    const contentFade = {
        hidden: { opacity: 0, x: 20 },
        show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <div className="flex h-screen bg-transparent font-sans overflow-hidden text-slate-900">

            {/* Sidebar - Glassmorphism */}
            <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
                className="w-72 glass border-r border-y-0 border-l-0 z-20 flex flex-col m-4 mr-0 rounded-2xl shadow-xl dark:shadow-black/40 overflow-hidden shrink-0 relative"
            >
                <div aria-hidden="true" className="absolute inset-0 brand-gradient opacity-20" />

                <div className="p-8 border-b border-gray-200/50 dark:border-dark-border relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-900">
                            <img src="/Logo.png" alt="Campus Creative" className="w-10 h-10 object-contain" />
                        </div>
                        <h2 className="text-xl font-bold tracking-widest">
                            Control <br />Center
                        </h2>
                    </div>
                </div>

                <div className="flex-1 px-4 py-8 space-y-3 overflow-y-auto relative z-10">
                    <p className="px-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Modules</p>

                    <button
                        onClick={() => setActiveTab('problems')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative tracking-wider text-sm
              ${activeTab === 'problems'
                                ? 'bg-white/70 shadow-md text-slate-900 border border-slate-200/70'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'}`}
                    >
                        {activeTab === 'problems' && (
                            <motion.div layoutId="activeInd" className="absolute left-0 w-1 h-6 brand-gradient rounded-r-full" />
                        )}
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Manage Data Set
                    </button>

                    <button
                        onClick={() => setActiveTab('selections')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative tracking-wider text-sm
              ${activeTab === 'selections'
                                ? 'bg-white/70 shadow-md text-slate-900 border border-slate-200/70'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'}`}
                    >
                        {activeTab === 'selections' && (
                            <motion.div layoutId="activeInd" className="absolute left-0 w-1 h-6 brand-gradient rounded-r-full" />
                        )}
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Operative Logs
                        {selections.length > 0 && (
                            <span className={`ml-auto px-2 py-0.5 rounded-md text-xs font-bold
                ${activeTab === 'selections' ? 'bg-white/70 text-slate-900 border border-slate-200/70' : 'bg-white/60 text-slate-600 border border-slate-200/70'}`}>
                                {selections.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="p-6 border-t border-slate-200/70 relative z-10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 hover:bg-white/60 rounded-xl text-brand-700 font-semibold transition-colors duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Terminate Session
                    </button>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 md:p-8 xl:p-12 overflow-y-auto z-10 custom-scrollbar">
                {dashboardLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">

                        {/* PROBLEMS TAB */}
                        {activeTab === 'problems' && (
                            <motion.div key="problems" variants={contentFade} initial="hidden" animate="show" exit="exit" className="max-w-6xl mx-auto space-y-8">

                                <div className="flex justify-between items-end mb-10">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-widest">Directives Hub</h1>
                                        <p className="text-slate-600">Initialize and moderate system challenges from this console.</p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">View Mode</p>
                                            <p className={`text-sm font-semibold ${viewMode ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {viewMode ? 'ON' : 'OFF'}
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleToggleViewMode}
                                            disabled={viewModeSaving}
                                            className={`relative inline-flex items-center h-7 rounded-full w-14 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-60
                                                                                            ${viewMode ? 'bg-brand-500' : 'bg-slate-200'}`}
                                            title="Toggle View Mode"
                                        >
                                            <span
                                                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow
                                                  ${viewMode ? 'translate-x-8' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Add Form Glass Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                    className="glass rounded-[30px] p-6 md:p-8 relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-white/70 text-slate-900 rounded-lg border border-slate-200/70">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold tracking-widest">Initialize New Directive</h3>
                                    </div>

                                    <AnimatePresence>
                                        {msg.text && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border backdrop-blur-sm
                          ${msg.type === 'success' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                                                        : 'bg-rose-50/80 border-rose-200 text-rose-700'}`}
                                            >
                                                <span className="text-xl">{msg.type === 'success' ? '✔️' : '⚠️'}</span> {msg.text}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleAddProblem} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-12">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Designation (Title)</label>
                                            <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-field" placeholder="e.g. Build Quantum Node UI" />
                                        </div>
                                        <div className="md:col-span-12">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Parameters (Description)</label>
                                            <textarea required value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input-field resize-none min-h-25" placeholder="Detailed spec requirements..."></textarea>
                                        </div>
                                        <div className="md:col-span-12 flex justify-end mt-2">
                                            <button type="submit" disabled={addLoading} className="btn-primary w-full md:w-auto px-10">
                                                {addLoading ? 'Compiling...' : 'Deploy Directive'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>

                                {/* Problems Table Card */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-[30px] overflow-hidden">
                                    <div className="p-6 border-b border-slate-200/70 flex justify-between items-center">
                                        <h3 className="text-lg font-bold tracking-widest text-brand-700">Database Registry</h3>
                                        <span className="text-sm font-medium bg-white/70 px-3 py-1 rounded-full border border-slate-200/70 text-slate-700">Total: {problems.length}</span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200/70">
                                            <thead>
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Designation</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Parameters</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Network State</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/50 text-sm">
                                                {problems.map((p, idx) => (
                                                    <motion.tr
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                                                        key={p.id}
                                                        className="group hover:bg-white/60 transition-colors"
                                                    >
                                                        <td className="px-6 py-5 align-top">
                                                            <p className="font-bold mb-1 group-hover:text-brand-700 transition-colors uppercase tracking-widest">{p.title}</p>
                                                        </td>
                                                        <td className="px-6 py-5 align-top text-slate-600 max-w-sm"><p className="line-clamp-2 leading-relaxed text-sm font-light">{p.description}</p></td>
                                                        <td className="px-6 py-5 align-top text-center">
                                                            <button
                                                                onClick={() => handleToggle(p.id)}
                                                                className={`relative inline-flex items-center h-7 rounded-full w-14 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500
                                  ${p.isActive ? 'bg-brand-500' : 'bg-slate-200'}`}
                                                            >
                                                                <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform shadow
                                  ${p.isActive ? 'translate-x-8' : 'translate-x-1'}`}
                                                                />
                                                            </button>
                                                            <p className="text-[10px] mt-2 font-semibold text-slate-500 uppercase tracking-widest">{p.isActive ? 'Broadcasting' : 'Hidden'}</p>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {problems.length === 0 && (
                                            <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                                </div>
                                                <p className="font-medium text-lg">Registry is empty.</p>
                                                <p className="text-sm">Initialize a new directive using the console above.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                            </motion.div>
                        )}

                        {/* SELECTIONS TAB */}
                        {activeTab === 'selections' && (
                            <motion.div key="selections" variants={contentFade} initial="hidden" animate="show" exit="exit" className="max-w-6xl mx-auto space-y-8">
                                <div className="flex justify-between items-end mb-10">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Operative Logs</h1>
                                        <p className="text-gray-600 dark:text-gray-400">Track network engagements and verified team assignments.</p>
                                    </div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-200/50 dark:border-dark-border bg-white/40 dark:bg-dark-surface/40 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Active Deployments</h3>
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={logsQuery}
                                                onChange={(e) => setLogsQuery(e.target.value)}
                                                placeholder="Search team"
                                                className="w-72 max-w-[55vw] px-4 py-2 rounded-xl text-sm bg-white/70 dark:bg-dark-surface/70 border border-gray-200/70 dark:border-dark-border/70 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selections.length} Teams Online</span>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border/50">
                                            <thead className="bg-gray-50/50 dark:bg-dark-surface/50 backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operative (Team)</th>
                                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Directive</th>
                                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acquisition Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200/50 dark:divide-dark-border/50 text-sm">
                                                {filteredSelections.map((s, idx) => (
                                                    <motion.tr
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.1 }}
                                                        key={idx}
                                                        className="group hover:bg-white/40 dark:hover:bg-dark-surface/40 transition-colors"
                                                    >
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-700/30 border border-brand-200/70 dark:border-brand-700/40 flex justify-center items-center text-brand-800 dark:text-brand-300 font-bold text-lg">
                                                                    {s.teamName.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-base">{s.teamName}</p>
                                                                    <p className="text-xs text-gray-500 font-mono tracking-tight mt-0.5">{s.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 shadow-sm">
                                                                {s.problemTitle}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                                            {new Date(s.timestamp).toLocaleString(undefined, {
                                                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                            })}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {selections.length > 0 && filteredSelections.length === 0 && (
                                            <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" /></svg>
                                                </div>
                                                <p className="font-medium text-lg">No matching results.</p>
                                                <p className="text-sm">Try a different search term.</p>
                                            </div>
                                        )}

                                        {selections.length === 0 && (
                                            <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                </div>
                                                <p className="font-medium text-lg">No teams deployed yet.</p>
                                                <p className="text-sm">Logs will populate when operatives secure directives.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
