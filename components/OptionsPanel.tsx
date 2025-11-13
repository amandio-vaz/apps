
import React from 'react';

interface OptionsPanelProps {
    context: string;
    setContext: (value: string) => void;
    constraints: string;
    setConstraints: (value: string) => void;
    priorities: string;
    setPriorities: (value: string) => void;
    validationErrors: { [key: string]: boolean };
}

const commonInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ context, setContext, constraints, setConstraints, priorities, setPriorities, validationErrors }) => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">2. Definir Contexto</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Contextualize a arquitetura.</p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="context" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Contexto/Domínio
                    </label>
                    <input
                        id="context"
                        type="text"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Ex: E-commerce B2C de alta disponibilidade"
                        className={`${commonInputClasses} ${validationErrors.context ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        aria-invalid={validationErrors.context ? 'true' : 'false'}
                    />
                    {validationErrors.context && <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                </div>
                <div>
                    <label htmlFor="constraints" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Restrições Conhecidas
                    </label>
                    <input
                        id="constraints"
                        type="text"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        placeholder="Insira seus principais desafios e restrições"
                        className={`${commonInputClasses} ${validationErrors.constraints ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        aria-invalid={validationErrors.constraints ? 'true' : 'false'}
                    />
                    {validationErrors.constraints && <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                </div>
                 <div>
                    <label htmlFor="priorities" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Prioridades
                    </label>
                    <input
                        id="priorities"
                        type="text"
                        value={priorities}
                        onChange={(e) => setPriorities(e.target.value)}
                        placeholder="Insira suas prioridades para aprimoramento da arquitetura"
                        className={`${commonInputClasses} ${validationErrors.priorities ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        aria-invalid={validationErrors.priorities ? 'true' : 'false'}
                    />
                    {validationErrors.priorities && <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                </div>
            </div>
        </div>
    );
};
