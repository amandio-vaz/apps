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
            <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico de Análises</h2>
                    <Tooltip text="Apagar permanentemente todo o histórico de análises.">
                        <button
                            onClick={handleClear}
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                            aria-label="Limpar todo o histórico de análises"
                        >
                            <Icon name="close" className="w-4 h-4" />
                            <span>Limpar Histórico</span>
                        </button>
                    </Tooltip>
                </div>
                <ul className="space-y-4">
                    {history.map((entry) => (
                        <li key={entry.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {new Date(entry.date).toLocaleString('pt-BR')}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate" title={entry.summary}>
                                        <strong>Resumo:</strong> {entry.summary}
                                    </p>
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-500" title={entry.files.join(', ')}>
                                        <strong>Arquivos:</strong> {entry.files.join(', ')}
                                    </div>
                                </div>
                                <Tooltip text="Carregar e visualizar os resultados desta análise anterior.">
                                    <button
                                        onClick={() => onLoadEntry(entry.result)}
                                        className="flex-shrink-0 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
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
