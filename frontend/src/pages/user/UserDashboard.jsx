import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function UserDashboard() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectingId, setSelectingId] = useState(null);
    const [msg, setMsg] = useState({ text: '', type: '' });
    const [userSelection, setUserSelection] = useState(null);

    const navigate = useNavigate();
    const token = localStorage.getItem('userToken');
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchProblems();
    }, [token, navigate]);

    const getHeaders = () => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'x-user-id': userData?.id || token,
            'x-user-name': userData?.name || 'Team Agent',
            'x-user-email': userData?.email || ''
        }
    });

    const fetchProblems = async () => {
        try {
            setLoading(true);
            const headers = getHeaders();
            const [resProblems, resMySelection] = await Promise.all([
                axios.get('http://localhost:5000/api/problems', headers),
                axios.get('http://localhost:5000/api/my-selection', headers)
            ]);

            setProblems(resProblems.data);
            setUserSelection(resMySelection.data?.selection?.problemId || null);
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProblem = async (problemId) => {
        if (!window.confirm('Are you sure you want to select this problem? You can select only one.')) {
            return;
        }

        setSelectingId(problemId);
        setMsg({ text: '', type: '' });

        try {
            const payload = { problemId };
            await axios.post('http://localhost:5000/api/select-problem', payload, getHeaders());

            setMsg({ text: 'Selection saved successfully. You are now locked from selecting other problems.', type: 'success' });
            setUserSelection(problemId);
            fetchProblems();
        } catch (err) {
            setMsg({ text: err.response?.data?.message || 'Transaction failed.', type: 'error' });
            if (err.response?.data?.message === 'You have already selected a problem') {
                fetchProblems();
            }
        } finally {
            setSelectingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        navigate('/');
    };

    // Animation variants
    const containerVars = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen bg-transparent relative overflow-x-hidden text-slate-900">
            {/* Header */}
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="glass sticky top-0 z-40 border-b-0 m-4 rounded-[30px] shadow-lg shadow-black/20"
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center text-slate-900 border border-slate-200/70 backdrop-blur-sm">
                            <img src="/Logo.png" alt="Campus Creative" className="w-6 h-6 object-contain" />
                        </div>
                        <h1 className="text-xl font-bold tracking-widest">
                            Campus Creative
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors tracking-wider"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                <AnimatePresence>
                    {msg.text && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`p-4 rounded-2xl mb-8 flex border backdrop-blur-md shadow-sm items-center
                ${msg.type === 'success'
                                    ? 'bg-green-50/80 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-300'
                                    : 'bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300'}`}
                        >
                            <div className="mr-3">
                                {msg.type === 'success' ? '✅' : '⚠️'}
                            </div>
                            <p className="font-medium text-sm">{msg.text}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mb-10 text-center sm:text-left">
                    <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight">
                        {userData?.name || 'Team Agent'}
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto sm:mx-0">
                        Review the global challenges below. You are permitted to engage with <strong className="text-slate-900 hover:text-brand-700 transition-colors">only ONE</strong> statement. Choose wisely.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin dark:border-dark-border dark:border-t-brand-500"></div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Syncing mainframe...</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVars}
                        initial="hidden"
                        animate="show"
                        className="glass rounded-3xl overflow-hidden"
                    >
                        {/* Table header */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-extrabold tracking-widest text-slate-600 border-b border-white/15">
                            <div className="col-span-3">Status</div>
                            <div className="col-span-7">Problem Statement</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {(userSelection ? problems.filter((p) => p.id === userSelection) : problems).map((p) => {
                                const isSelectedByMe = userSelection === p.id;
                                const isLocked = Boolean(userSelection) && !isSelectedByMe;
                                const isDisabled = isLocked || selectingId === p.id || isSelectedByMe;

                                return (
                                    <motion.div
                                        key={p.id}
                                        variants={itemVars}
                                        className={`glass rounded-2xl border border-white/15 overflow-hidden ${isSelectedByMe ? 'ring-1 ring-emerald-400/40' : ''}`}
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center px-5 sm:px-6 py-5">
                                            {/* Status */}
                                            <div className="sm:col-span-3 flex items-center gap-3">
                                                <span className={`w-2.5 h-2.5 rounded-full ${isLocked ? 'bg-slate-300' : 'bg-emerald-400'}`} />
                                                <span
                                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest border
                                                        ${isLocked
                                                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                                                            : 'bg-emerald-50/80 text-emerald-700 border-emerald-200'}
                                                    `}
                                                >
                                                    {isLocked ? 'Locked' : 'Available'}
                                                </span>
                                            </div>

                                            {/* Problem */}
                                            <div className="sm:col-span-7 min-w-0">
                                                <div className="text-lg font-extrabold tracking-wide text-slate-900 truncate">
                                                    {p.title}
                                                </div>
                                                <div className="mt-1 text-sm text-slate-600 wrap-break-word">
                                                    {p.description}
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="sm:col-span-2 flex sm:justify-end">
                                                <button
                                                    onClick={() => handleSelectProblem(p.id)}
                                                    disabled={isDisabled}
                                                    className={`btn-primary px-7 py-3 rounded-xl font-bold transition-all duration-300 transform tracking-widest text-xs border border-slate-200/60
                                                        ${isDisabled ? 'cursor-not-allowed active:scale-100' : 'active:scale-95'}
                                                        ${isSelectedByMe ? 'opacity-80' : ''}
                                                        ${isLocked ? 'opacity-45' : ''}
                                                        ${selectingId === p.id ? 'opacity-70' : ''}
                                                    `}
                                                >
                                                    {selectingId === p.id
                                                        ? 'Selecting...'
                                                        : isSelectedByMe
                                                            ? 'Selected'
                                                            : isLocked
                                                                ? 'Already Selected'
                                                                : 'Select'}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {problems.length === 0 && (
                            <motion.div variants={itemVars} className="col-span-full py-20">
                                <div className="glass max-w-md mx-auto rounded-3xl p-8 text-center border-dashed border-2 border-gray-300 dark:border-dark-border">
                                    <div className="text-4xl mb-4">📡</div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Signals Detected</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Organizers have not deployed any active directives yet. Stand by.</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}

export default UserDashboard;
