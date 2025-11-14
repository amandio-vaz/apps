import React from 'react';
import type { HistoryEntry, AnalysisResult } from '../types';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface HistoryPanelProps {
    history: HistoryEntry[];
    onLoadEntry: (result: AnalysisResult) => void;
    onClearHistory: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoadEntry, onClearHistory }) => {

    const handleClear = () => {
        if (window.confirm('Tem certeza de que deseja limpar todo o histórico de análises? Esta ação não pode ser desfeita.')) {
            onClearHistory();
        }
    };

    return (
        <div className="mt-12">
            <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200/20 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        <Icon name="history" className="w-7 h-7" />
                        <span>Histórico de Análises</span>
                    </h2>
                    <Tooltip text="Apagar permanentemente todo o histórico de análises.">
                        <button
                            onClick={handleClear}
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                            aria-label="Limpar todo o histórico de análises"
                        >
                            <Icon name="trash" className="w-4 h-4" />
                            <span>Limpar Histórico</span>
                        </button>
                    </Tooltip>
                </div>
                <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {history.map((entry) => (
                        <li key={entry.id} className="p-4 bg-slate-500/10 dark:bg-slate-900/50 rounded-lg border border-slate-200/20 dark:border-slate-700/50 transition-all hover:shadow-lg hover:border-sky-500/50">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-blue-600 dark:text-sky-400">
                                        {new Date(entry.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 truncate" title={entry.summary}>
                                        <strong className="text-slate-700 dark:text-slate-200">Resumo:</strong> {entry.summary}
                                    </p>
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate" title={entry.files.join(', ')}>
                                        <strong>Arquivos:</strong> {entry.files.join(', ')}
                                    </div>
                                </div>
                                <Tooltip text="Carregar e visualizar os resultados desta análise anterior.">
                                    <button
                                        onClick={() => onLoadEntry(entry.result)}
                                        className="flex-shrink-0 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm transform hover:scale-105"
                                    >
                                        Revisar Análise
                                    </button>
                                </Tooltip>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};