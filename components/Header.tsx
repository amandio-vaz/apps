import React from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
    return (
        <header className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200/20 dark:border-slate-700/50 shadow-lg">
            <div className="container mx-auto px-4 h-16 flex items-center justify-center relative">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-wider">
                    StackArch Cortex Platform
                </h1>
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Tooltip text={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            aria-label="Mudar tema"
                        >
                            {theme === 'light' ? <Icon name="moon" className="w-6 h-6" /> : <Icon name="sun" className="w-6 h-6" />}
                        </button>
                    </Tooltip>
                </div>
            </div>
        </header>
    );
};