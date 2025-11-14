import React, { useState } from 'react';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

interface ErrorDisplayProps {
    error: Error | string;
    onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    if (!error) return null;

    const message = typeof error === 'string' ? error : error.message;
    const hasDetails = typeof error !== 'string' && error.stack;

    return (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 p-4 rounded-r-lg" role="alert">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Icon name="error" className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div className="ml-3 flex-1">
                    <p className="font-bold text-red-800 dark:text-red-200">Ocorreu um Erro</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{message}</p>
                    {hasDetails && (
                         <div className="mt-2">
                            <Tooltip text="Exibir ou ocultar os detalhes técnicos do erro.">
                                <button
                                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                    className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline focus:outline-none"
                                >
                                    {isDetailsOpen ? 'Esconder detalhes' : 'Mostrar detalhes'}
                                </button>
                            </Tooltip>
                         </div>
                    )}
                </div>
                <div className="ml-auto pl-3">
                    <Tooltip text="Fechar esta notificação de erro.">
                        <button onClick={onDismiss} aria-label="Fechar notificação de erro" className="p-1 -mt-1 -mr-1 rounded-full text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <Icon name="close" className="w-5 h-5" />
                        </button>
                    </Tooltip>
                </div>
            </div>
            {hasDetails && isDetailsOpen && (
                <div className="mt-4">
                    <pre className="bg-red-200/50 dark:bg-slate-800 text-red-900 dark:text-red-200 text-xs p-3 rounded-md overflow-x-auto">
                        <code>{error.stack}</code>
                    </pre>
                </div>
            )}
        </div>
    );
};
