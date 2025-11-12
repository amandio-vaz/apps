
import React from 'react';

interface OptionsPanelProps {
    context: string;
    setContext: (value: string) => void;
    constraints: string;
    setConstraints: (value: string) => void;
    priorities: string;
    setPriorities: (value: string) => void;
}

const commonInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ context, setContext, constraints, setConstraints, priorities, setPriorities }) => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">2. Definir Contexto</h2>
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
                        className={commonInputClasses}
                    />
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
                        placeholder="Ex: Orçamento limitado, equipe enxuta, stack AWS"
                        className={commonInputClasses}
                    />
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
                        placeholder="Ex: Performance, Custo, Segurança"
                        className={commonInputClasses}
                    />
                </div>
            </div>
        </div>
    );
};
