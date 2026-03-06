import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import users from '../../data/users.json';

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

    const [marksTab, setMarksTab] = useState('grading'); // grading | results
    const [marksRounds, setMarksRounds] = useState([]);
    const [activeRoundId, setActiveRoundId] = useState('');
    const [marksQuery, setMarksQuery] = useState('');
    const [activeTeamName, setActiveTeamName] = useState('');
    const [marksSaving, setMarksSaving] = useState(false);

    const [createRoundOpen, setCreateRoundOpen] = useState(false);
    const [createRoundName, setCreateRoundName] = useState('');

    const [criteria, setCriteria] = useState({
        clarity: 0,
        relevance: 0,
        technical: 0,
        prototype: 0
    });

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
            const [resProb, resSel, resSettings, resRounds] = await Promise.all([
                api.get('/api/admin/problems', getHeaders()),
                api.get('/api/admin/selections', getHeaders()),
                api.get('/api/admin/settings', getHeaders()),
                api.get('/api/admin/marks/rounds', getHeaders())
            ]);
            setProblems(resProb.data);
            setSelections(resSel.data);
            setViewMode(Boolean(resSettings.data?.viewMode));

            const rounds = Array.isArray(resRounds.data?.rounds) ? resRounds.data.rounds : [];
            setMarksRounds(rounds);
            setActiveRoundId(String(resRounds.data?.activeRoundId || rounds?.[0]?.id || ''));
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

    const clampInt = (value, min, max) => {
        const n = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
        return Math.max(min, Math.min(max, n));
    };

    // Per-round score is out of 10: average of the 4 criteria (each 0..10).
    const criteriaTotal = useMemo(() => {
        const sum =
            clampInt(criteria.clarity, 0, 10) +
            clampInt(criteria.relevance, 0, 10) +
            clampInt(criteria.technical, 0, 10) +
            clampInt(criteria.prototype, 0, 10);

        return clampInt(Math.round(sum / 4), 0, 10);
    }, [criteria]);

    const openCreateRound = () => {
        setMsg({ text: '', type: '' });
        setCreateRoundOpen(true);
    };

    const closeCreateRound = () => {
        setCreateRoundOpen(false);
    };

    const handleCreateRound = async () => {
        setMsg({ text: '', type: '' });
        if (!createRoundName.trim()) {
            setMsg({ text: 'Round name is required.', type: 'error' });
            return;
        }
        try {
            const res = await api.post('/api/admin/marks/rounds', { name: createRoundName }, getHeaders());
            const rounds = Array.isArray(res.data?.rounds) ? res.data.rounds : [];
            setMarksRounds(rounds);
            setActiveRoundId(String(res.data?.activeRoundId || res.data?.round?.id || ''));
            setCreateRoundOpen(false);
            setCreateRoundName('');
            setMsg({ text: 'Round created.', type: 'success' });
            setTimeout(() => setMsg({ text: '', type: '' }), 2500);
            fetchData();
        } catch (err) {
            setMsg({ text: err.response?.data?.message || 'Failed to create round.', type: 'error' });
        }
    };

    const teams = useMemo(() => {
        const byTeam = new Map();
        (users || []).forEach((row) => {
            const teamName = String(row?.teamName ?? '').trim();
            if (!teamName) return;
            if (!byTeam.has(teamName)) {
                byTeam.set(teamName, []);
            }
            byTeam.get(teamName).push(row);
        });

        const result = Array.from(byTeam.entries()).map(([teamName, members]) => {
            const leader = members.find((m) => /leader/i.test(String(m?.role ?? ''))) ?? members[0];
            return {
                teamName,
                email: String(leader?.email ?? '').trim(),
                members
            };
        });

        result.sort((a, b) => a.teamName.localeCompare(b.teamName));
        return result;
    }, []);

    const selectionsByTeam = useMemo(() => {
        const map = new Map();
        (selections || []).forEach((s) => {
            const teamName = String(s?.teamName ?? '').trim();
            if (!teamName) return;
            if (!map.has(teamName)) {
                map.set(teamName, s);
            }
        });
        return map;
    }, [selections]);

    // Initialize active team once teams are known
    useEffect(() => {
        if (!activeTeamName && teams.length > 0) {
            setActiveTeamName(teams[0].teamName);
        }
    }, [teams, activeTeamName]);

    const activeTeam = useMemo(() => teams.find((t) => t.teamName === activeTeamName) || null, [teams, activeTeamName]);
    const activeSelection = useMemo(
        () => (activeTeamName ? selectionsByTeam.get(activeTeamName) : null),
        [selectionsByTeam, activeTeamName]
    );

    useEffect(() => {
        const roundKey = String(activeRoundId || '').trim();
        const byRound = activeSelection?.marksByRound;
        const saved = roundKey && byRound ? byRound[roundKey] : null;
        const savedCriteria = saved && typeof saved === 'object' ? saved.criteria : null;

        if (savedCriteria && typeof savedCriteria === 'object') {
            setCriteria({
                clarity: clampInt(savedCriteria.clarity, 0, 10),
                relevance: clampInt(savedCriteria.relevance, 0, 10),
                technical: clampInt(savedCriteria.technical, 0, 10),
                prototype: clampInt(savedCriteria.prototype, 0, 10)
            });
            return;
        }
        setCriteria({ clarity: 0, relevance: 0, technical: 0, prototype: 0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTeamName, activeRoundId]);

    const normalizedMarksQuery = marksQuery.trim().toLowerCase();
    const filteredTeams = normalizedMarksQuery
        ? teams.filter((t) => String(t.teamName).toLowerCase().includes(normalizedMarksQuery))
        : teams;

    const marksRows = useMemo(() => {
        return teams.map((team) => {
            const selection = selectionsByTeam.get(team.teamName);
            return {
                teamName: team.teamName,
                email: team.email,
                problemTitle: selection?.problemTitle ? String(selection.problemTitle) : '-',
                userId: selection?.userId ? String(selection.userId) : '',
                marksByRound: selection?.marksByRound || {}
            };
        });
    }, [teams, selectionsByTeam]);

    const filteredMarksRows = normalizedMarksQuery
        ? marksRows.filter((r) => String(r.teamName).toLowerCase().includes(normalizedMarksQuery))
        : marksRows;

    const activeRoundKey = String(activeRoundId || '').trim();
    const roundTotals = useMemo(() => {
        if (!activeRoundKey) return [];
        return marksRows
            .map((row) => {
                const entry = row?.marksByRound?.[activeRoundKey];
                if (!entry || typeof entry !== 'object') return null;
                const v = entry.total;
                return typeof v === 'number' ? Math.max(0, Math.min(10, v)) : null;
            })
            .filter((v) => typeof v === 'number');
    }, [marksRows, activeRoundKey]);

    const gradedCount = roundTotals.length;
    const pendingCount = Math.max(0, teams.length - gradedCount);
    const avgScore = gradedCount ? roundTotals.reduce((a, b) => a + b, 0) / gradedCount : 0;

    const handleSaveMarks = async () => {
        if (!activeSelection?.userId) {
            setMsg({ text: 'This team has not selected a problem yet.', type: 'error' });
            return;
        }
        if (!activeRoundId) {
            setMsg({ text: 'Create a round first.', type: 'error' });
            return;
        }

        setMarksSaving(true);
        setMsg({ text: '', type: '' });
        try {
            await api.patch(
                `/api/admin/selections/${encodeURIComponent(String(activeSelection.userId))}/marks`,
                {
                    roundId: activeRoundId,
                    total: criteriaTotal,
                    criteria: {
                        clarity: clampInt(criteria.clarity, 0, 10),
                        relevance: clampInt(criteria.relevance, 0, 10),
                        technical: clampInt(criteria.technical, 0, 10),
                        prototype: clampInt(criteria.prototype, 0, 10)
                    }
                },
                getHeaders()
            );

            setMsg({ text: 'Marks saved successfully.', type: 'success' });
            fetchData();
            setTimeout(() => setMsg({ text: '', type: '' }), 3000);
        } catch (err) {
            const data = err.response?.data;
            const issues = Array.isArray(data?.issues) ? data.issues : [];
            const details = issues.length
                ? issues
                    .map((i) => {
                        const path = String(i?.path || '').trim();
                        const msg = String(i?.message || '').trim();
                        return path ? `${path}: ${msg}` : msg;
                    })
                    .filter(Boolean)
                    .join(' | ')
                : '';

            setMsg({
                text: data?.message ? (details ? `${data.message} — ${details}` : data.message) : 'Failed to save marks.',
                type: 'error'
            });
        } finally {
            setMarksSaving(false);
        }
    };

    const handleNextTeam = () => {
        if (filteredTeams.length === 0) return;
        const idx = filteredTeams.findIndex((t) => t.teamName === activeTeamName);
        const next = idx >= 0 ? filteredTeams[(idx + 1) % filteredTeams.length] : filteredTeams[0];
        setActiveTeamName(next.teamName);
    };

    const operativeLogs = useMemo(() => {
        return teams.map((team) => {
            const selection = selectionsByTeam.get(team.teamName);
            return {
                teamName: team.teamName,
                email: String(selection?.email ?? team.email ?? '').trim(),
                problemTitle: selection?.problemTitle ? String(selection.problemTitle) : '-',
                timestamp: selection?.timestamp ?? null
            };
        });
    }, [teams, selectionsByTeam]);

    const normalizedLogsQuery = logsQuery.trim().toLowerCase();
    const filteredLogs = normalizedLogsQuery
        ? operativeLogs.filter((s) => {
            const fields = [s?.teamName, s?.problemTitle, s?.email];
            return fields.some((v) => String(v ?? '').toLowerCase().includes(normalizedLogsQuery));
        })
        : operativeLogs;

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
                        {operativeLogs.length > 0 && (
                            <span className={`ml-auto px-2 py-0.5 rounded-md text-xs font-bold
                ${activeTab === 'selections' ? 'bg-white/70 text-slate-900 border border-slate-200/70' : 'bg-white/60 text-slate-600 border border-slate-200/70'}`}>
                                {operativeLogs.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('marks')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative tracking-wider text-sm
              ${activeTab === 'marks'
                                ? 'bg-white/70 shadow-md text-slate-900 border border-slate-200/70'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'}`}
                    >
                        {activeTab === 'marks' && (
                            <motion.div layoutId="activeInd" className="absolute left-0 w-1 h-6 brand-gradient rounded-r-full" />
                        )}
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h6m2 10V7a2 2 0 00-2-2H7a2 2 0 00-2 2v14l4-4h10a2 2 0 002-2z" />
                        </svg>
                        Marks
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
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{operativeLogs.length} Teams</span>
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
                                                {filteredLogs.map((s, idx) => (
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
                                                                    <p className="text-xs text-gray-500 font-mono tracking-tight mt-0.5">{s.email || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 shadow-sm">
                                                                {s.problemTitle}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                                            {s.timestamp
                                                                ? new Date(s.timestamp).toLocaleString(undefined, {
                                                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                                })
                                                                : '-'}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {operativeLogs.length > 0 && filteredLogs.length === 0 && (
                                            <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" /></svg>
                                                </div>
                                                <p className="font-medium text-lg">No matching results.</p>
                                                <p className="text-sm">Try a different search term.</p>
                                            </div>
                                        )}

                                        {operativeLogs.length === 0 && (
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

                        {/* MARKS TAB */}
                        {activeTab === 'marks' && (
                            <motion.div key="marks" variants={contentFade} initial="hidden" animate="show" exit="exit" className="max-w-6xl mx-auto space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                    <div>
                                        <div className="flex items-end gap-3 flex-wrap">
                                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-wide">Marks Management</h1>
                                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/60 border border-slate-200/70 text-slate-700 tracking-wider">
                                                Total: {teams.length}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400">Grading panel for hackathon</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="inline-flex rounded-2xl bg-white/60 border border-slate-200/70 overflow-hidden">
                                            <button
                                                onClick={() => setMarksTab('grading')}
                                                className={`px-5 py-2 text-sm font-bold tracking-wide transition-colors ${marksTab === 'grading' ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-white/70'}`}
                                            >
                                                Grading
                                            </button>
                                            <button
                                                onClick={() => setMarksTab('results')}
                                                className={`px-5 py-2 text-sm font-bold tracking-wide transition-colors ${marksTab === 'results' ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-white/70'}`}
                                            >
                                                Results Table
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-primary px-5 py-2 rounded-xl font-bold tracking-wide text-sm"
                                            title="Create Round"
                                            onClick={openCreateRound}
                                        >
                                            + Create Round
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {createRoundOpen && (
                                        <motion.div
                                            key="create-round-modal"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                                        >
                                            <div
                                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                                onClick={closeCreateRound}
                                                role="button"
                                                tabIndex={0}
                                                aria-label="Close"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') closeCreateRound();
                                                }}
                                            />

                                            <motion.div
                                                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                                                className="relative w-full max-w-lg glass rounded-3xl border border-white/15 p-6"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-xl font-extrabold tracking-wide text-slate-900">Create Round</h3>
                                                        <p className="text-sm text-slate-600 mt-1">Enter a name for the new evaluation round.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={closeCreateRound}
                                                        className="px-3 py-2 rounded-xl font-bold tracking-wide text-sm border border-slate-200/70 bg-white/60 text-slate-700 hover:bg-white/70"
                                                    >
                                                        Close
                                                    </button>
                                                </div>

                                                <form
                                                    className="mt-6 space-y-4"
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleCreateRound();
                                                    }}
                                                >
                                                    <div>
                                                        <label className="block text-xs font-extrabold tracking-widest text-slate-500">ROUND NAME</label>
                                                        <input
                                                            value={createRoundName}
                                                            onChange={(e) => setCreateRoundName(e.target.value)}
                                                            placeholder={marksRounds.length === 0 ? 'Round 1' : `Round ${marksRounds.length + 1}`}
                                                            className="mt-2 w-full px-4 py-3 rounded-2xl text-sm bg-white/70 border border-slate-200/70 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                            autoFocus
                                                            required
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={closeCreateRound}
                                                            className="px-5 py-3 rounded-xl font-bold tracking-wide text-sm border border-slate-200/70 bg-white/60 text-slate-700 hover:bg-white/70"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="btn-primary px-6 py-3 rounded-xl font-bold tracking-wide text-sm"
                                                        >
                                                            Create
                                                        </button>
                                                    </div>
                                                </form>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {msg.text && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`p-4 rounded-xl text-sm flex items-center gap-3 border backdrop-blur-sm
                          ${msg.type === 'success' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                                                    : 'bg-rose-50/80 border-rose-200 text-rose-700'}`}
                                        >
                                            <span className="text-xl">{msg.type === 'success' ? '✔️' : '⚠️'}</span> {msg.text}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">TOTAL TEAMS</div>
                                        <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{teams.length}</div>
                                    </div>
                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">GRADED</div>
                                        <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{gradedCount}</div>
                                    </div>
                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">PENDING</div>
                                        <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{pendingCount}</div>
                                    </div>
                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">AVG SCORE</div>
                                        <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{avgScore.toFixed(1)}</div>
                                    </div>
                                </div>

                                {marksTab === 'grading' && (
                                    <>
                                        {marksRounds.length > 0 && (
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="inline-flex rounded-2xl bg-white/60 border border-slate-200/70 overflow-hidden">
                                                    {marksRounds.map((r) => (
                                                        <button
                                                            key={r.id}
                                                            onClick={() => setActiveRoundId(String(r.id))}
                                                            className={`px-5 py-2 text-sm font-bold tracking-wide transition-colors ${String(activeRoundId) === String(r.id) ? 'bg-white/70 text-slate-900' : 'text-slate-600 hover:bg-white/70'}`}
                                                        >
                                                            {r.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            <div className="lg:col-span-4 glass rounded-3xl overflow-hidden border border-white/15">
                                                <div className="p-5 border-b border-white/15">
                                                    <input
                                                        value={marksQuery}
                                                        onChange={(e) => setMarksQuery(e.target.value)}
                                                        placeholder="Search teams..."
                                                        className="w-full px-4 py-3 rounded-2xl text-sm bg-white/70 border border-slate-200/70 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div className="max-h-130 overflow-y-auto p-3 space-y-2">
                                                    {filteredTeams.map((t, idx) => (
                                                        <button
                                                            key={t.teamName}
                                                            type="button"
                                                            onClick={() => setActiveTeamName(t.teamName)}
                                                            className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors ${
                                                                t.teamName === activeTeamName
                                                                    ? 'bg-brand-500/15 border-brand-500/30 text-slate-900'
                                                                    : 'bg-white/40 border-white/10 text-slate-700 hover:bg-white/60'
                                                            }`}
                                                        >
                                                            <div className="text-xs font-extrabold tracking-widest text-slate-500">{idx + 1}. {t.teamName}</div>
                                                        </button>
                                                    ))}
                                                    {filteredTeams.length === 0 && (
                                                        <div className="p-10 text-center text-slate-500 text-sm">No teams found.</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="lg:col-span-8 glass rounded-3xl border border-white/15 p-6">
                                                <div className="flex items-start justify-between gap-6 flex-wrap">
                                                    <div>
                                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">ACTIVE TEAM</div>
                                                        <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{activeTeam?.teamName || '-'}</div>
                                                        <div className="mt-1 text-sm text-slate-600">{activeSelection?.problemTitle ? `Problem: ${activeSelection.problemTitle}` : 'Problem: -'}</div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-[11px] font-extrabold tracking-widest text-slate-500">CURRENT SCORE</div>
                                                        <div className="mt-2 text-3xl font-black tracking-tight text-brand-700">{criteriaTotal} / 10</div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                                        <div className="text-xs font-extrabold tracking-widest text-slate-500">CLARITY</div>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            value={criteria.clarity}
                                                            onChange={(e) => setCriteria((c) => ({ ...c, clarity: clampInt(e.target.value, 0, 10) }))}
                                                            className="input-field w-24 mt-3"
                                                            disabled={!activeSelection?.userId}
                                                        />
                                                    </div>
                                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                                        <div className="text-xs font-extrabold tracking-widest text-slate-500">RELEVANCE</div>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            value={criteria.relevance}
                                                            onChange={(e) => setCriteria((c) => ({ ...c, relevance: clampInt(e.target.value, 0, 10) }))}
                                                            className="input-field w-24 mt-3"
                                                            disabled={!activeSelection?.userId}
                                                        />
                                                    </div>
                                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                                        <div className="text-xs font-extrabold tracking-widest text-slate-500">TECHNICAL</div>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            value={criteria.technical}
                                                            onChange={(e) => setCriteria((c) => ({ ...c, technical: clampInt(e.target.value, 0, 10) }))}
                                                            className="input-field w-24 mt-3"
                                                            disabled={!activeSelection?.userId}
                                                        />
                                                    </div>
                                                    <div className="glass rounded-2xl p-5 border border-white/15">
                                                        <div className="text-xs font-extrabold tracking-widest text-slate-500">PROTOTYPE</div>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={10}
                                                            value={criteria.prototype}
                                                            onChange={(e) => setCriteria((c) => ({ ...c, prototype: clampInt(e.target.value, 0, 10) }))}
                                                            className="input-field w-24 mt-3"
                                                            disabled={!activeSelection?.userId}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleNextTeam}
                                                        className="px-5 py-3 rounded-xl font-bold tracking-wide text-sm border border-slate-200/70 bg-white/60 text-slate-700 hover:bg-white/70"
                                                    >
                                                        Skip to Next
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveMarks}
                                                        disabled={marksSaving || !activeSelection?.userId}
                                                        className={`btn-primary px-6 py-3 rounded-xl font-bold tracking-wide text-sm ${marksSaving || !activeSelection?.userId ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                    >
                                                        {marksSaving ? 'Saving...' : 'Save Marks'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {marksTab === 'results' && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-gray-200/50 dark:border-dark-border bg-white/40 dark:bg-dark-surface/40 flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Results Table</h3>
                                            <input
                                                value={marksQuery}
                                                onChange={(e) => setMarksQuery(e.target.value)}
                                                placeholder="Search team"
                                                className="w-72 max-w-[55vw] px-4 py-2 rounded-xl text-sm bg-white/70 dark:bg-dark-surface/70 border border-gray-200/70 dark:border-dark-border/70 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border/50">
                                                <thead className="bg-gray-50/50 dark:bg-dark-surface/50 backdrop-blur-sm">
                                                    <tr>
                                                        <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                                                        <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Problem Statement</th>
                                                        {marksRounds.map((r) => (
                                                            <th
                                                                key={r.id}
                                                                className={`px-8 py-5 text-left text-xs font-bold uppercase tracking-wider ${
                                                                    String(r.id) === String(activeRoundId)
                                                                        ? 'text-brand-700'
                                                                        : 'text-gray-500 dark:text-gray-400'
                                                                }`}
                                                            >
                                                                {r.name}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200/50 dark:divide-dark-border/50 text-sm">
                                                    {filteredMarksRows.map((row, idx) => (
                                                        <motion.tr
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: idx * 0.02 }}
                                                            key={`${row.teamName}-${idx}`}
                                                            className="group hover:bg-white/40 dark:hover:bg-dark-surface/40 transition-colors"
                                                        >
                                                            <td className="px-8 py-6">
                                                                <div>
                                                                    <p className="font-bold text-gray-900 dark:text-white text-base">{row.teamName}</p>
                                                                    <p className="text-xs text-gray-500 font-mono tracking-tight mt-0.5">{row.email || '-'}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-200 shadow-sm">
                                                                    {row.problemTitle}
                                                                </span>
                                                            </td>
                                                            {marksRounds.map((r) => {
                                                                const key = String(r.id);
                                                                const entry = row?.marksByRound?.[key];
                                                                const raw = entry && typeof entry === 'object' ? entry.total : null;
                                                                const v = typeof raw === 'number' ? Math.max(0, Math.min(10, raw)) : raw;
                                                                return (
                                                                    <td key={`${row.teamName}-${r.id}`} className="px-8 py-6 whitespace-nowrap">
                                                                        <span
                                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-extrabold border shadow-sm ${
                                                                                String(r.id) === String(activeRoundId)
                                                                                    ? 'bg-brand-500/10 border-brand-500/20 text-slate-900'
                                                                                    : 'bg-white/70 dark:bg-dark-surface border-slate-200/70 dark:border-dark-border text-slate-900 dark:text-gray-100'
                                                                            }`}
                                                                        >
                                                                            {v === null || v === undefined ? '-' : `${v} / 10`}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
