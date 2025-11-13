
import React from 'react';

interface OptionsPanelProps {
    context: string;
    setContext: (value: string) => void;
    constraints: string;
    setConstraints: (value: string) => void;
    priorities: string;
    setPriorities: (value: string) => void;
    validationErrors: { [key: string]: boolean };
    voice: string;
    setVoice: (value: string) => void;
    narrationStyle: string;
    setNarrationStyle: (value: string) => void;
}

const commonInputClasses = "w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
const commonSelectClasses = `${commonInputClasses} appearance-none`;

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ 
    context, setContext, 
    constraints, setConstraints, 
    priorities, setPriorities, 
    validationErrors,
    voice, setVoice,
    narrationStyle, setNarrationStyle
}) => {
    return (
        <div className="space-y-8">
            {/* Section 2 */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">2. Definir Contexto e Prioridades</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Forneça os detalhes essenciais para guiar a análise da IA.</p>
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

            {/* Section 3 */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">3. Opções de Áudio</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Personalize a narração do resumo executivo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Voz
                        </label>
                        <div className="relative">
                            <select
                                id="voice"
                                value={voice}
                                onChange={(e) => setVoice(e.target.value)}
                                className={commonSelectClasses}
                            >
                                <option value="Puck">Masculina Profissional</option>
                                <option value="Zephyr">Masculina Amigável</option>
                                <option value="Charon">Feminina Profissional</option>
                                <option value="Kore">Feminina Suave</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="narrationStyle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Estilo de Narração
                        </label>
                         <div className="relative">
                            <select
                                id="narrationStyle"
                                value={narrationStyle}
                                onChange={(e) => setNarrationStyle(e.target.value)}
                                className={commonSelectClasses}
                            >
                                <option>Profissional e Claro</option>
                                <option>Entusiasmado e Dinâmico</option>
                                <option>Calmo e Ponderado</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
