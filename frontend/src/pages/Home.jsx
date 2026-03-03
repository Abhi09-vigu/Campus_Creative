import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import GlassCard from '../components/GlassCard';

function Home() {
    return (
        <PageShell center>
            <div className="z-10 w-full max-w-sm">
                <GlassCard className="rounded-[40px] p-8 sm:p-12 relative flex flex-col items-center">
                    <div className="mb-10 mt-2">
                        <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center relative overflow-hidden">
                            <img src="/Logo.jpeg" alt="Campus Creative" className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
                        </div>
                    </div>

                    <div className="w-full text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest">HACKATHON PORTAL</h1>
                        <p className="mt-3 text-sm text-slate-600 font-light">
                            Select your role to continue.
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        <Link to="/" className="btn-primary w-full">
                            <span className="relative">TEAM LOGIN</span>
                        </Link>

                        <Link to="/admin" className="btn-primary w-full">
                            <span className="relative">ADMIN LOGIN</span>
                        </Link>
                    </div>
                </GlassCard>
            </div>
        </PageShell>
    );
}

export default Home;
