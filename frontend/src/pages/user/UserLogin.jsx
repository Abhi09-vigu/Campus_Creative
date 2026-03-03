import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import GlassCard from '../../components/GlassCard';
import users from '../../data/users.json';

function UserLogin() {
    const [teamName, setTeamName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const normalized = teamName.trim().toLowerCase();
            const user = users.find(u => (u.name || '').trim().toLowerCase() === normalized);
            if (!user) {
                setError('Invalid team name');
                return;
            }

            localStorage.setItem('userToken', user.id);
            localStorage.setItem('userData', JSON.stringify({ id: user.id, name: user.name }));
            navigate('/user/dashboard');
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell center>
            <div className="z-10 w-full max-w-3xl">
                <GlassCard className="rounded-[40px] relative overflow-hidden p-0">
                    <div className="flex flex-col sm:flex-row">

                        {/* Left Panel: Logo + Instructions */}
                        <div className="p-8 sm:p-12 sm:w-5/12 brand-gradient text-white border-b sm:border-b-0 sm:border-r border-white/15">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-white/60 border border-slate-200/70 text-slate-700">
                                Sign in required
                            </span>

                            <div className="mt-6">
                                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center relative overflow-hidden">
                                    <img src="/Logo.jpeg" alt="Campus Creative" className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
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
                        </div>

                        {/* Right Panel: Existing Form */}
                        <div className="p-8 sm:p-12 sm:w-7/12">
                            <div className="w-full text-left mb-6">
                                <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide">Login</h2>
                                <p className="mt-2 text-sm text-slate-600 font-light">Enter your team name to sign in.</p>
                            </div>

                            {error && (
                                <div className="w-full bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm text-center backdrop-blur-md">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="w-full space-y-6">
                                <div className="relative mb-8">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Team Name</label>
                                    <input
                                        type="text"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="input-field pb-2"
                                        placeholder="Enter team name"
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary group w-full py-4 tracking-widest text-sm">
                                    <div className="absolute inset-0 w-full h-full bg-white/40 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    <span className="relative flex items-center justify-center font-bold">
                                        {loading ? 'SIGNING IN...' : 'LOGIN'}
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </PageShell>
    );
}

export default UserLogin;
