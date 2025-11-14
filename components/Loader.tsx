import React from 'react';

interface LoaderProps {
    message: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div 
            className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-opacity duration-300"
            role="alert"
            aria-live="assertive"
            aria-busy="true"
        >
            <div className="relative flex flex-col items-center justify-center">
                <svg className="w-24 h-24" style={{ animation: 'spin-slow 1.5s linear infinite' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" className="text-sky-500/20" strokeWidth="8"/>
                    <path d="M50 5 A 45 45 0 0 1 95 50" stroke="url(#loaderGradient)" strokeWidth="8" strokeLinecap="round"/>
                    <defs>
                        <linearGradient id="loaderGradient" x1="50" y1="5" x2="95" y2="50" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="currentColor" className="text-sky-500" stopOpacity="0"/>
                            <stop offset="100%" stopColor="currentColor" className="text-sky-400" stopOpacity="1"/>
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-400 font-bold text-xs">
                    IA
                </div>
            </div>
            <p className="text-slate-300 mt-6 text-center text-lg font-medium tracking-wide">{message}</p>
        </div>
    );
};