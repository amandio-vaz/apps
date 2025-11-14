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
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Processo em Andamento...</h2>
                <div className="flex items-center justify-center space-x-2 my-6">
                    <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500"></div>
                    <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-4 text-center px-4 animate-pulse">{message}</p>
            </div>
        </div>
    );
};
