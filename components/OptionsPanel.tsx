import React from 'react';
import { Tooltip } from './Tooltip';

interface OptionsPanelProps {
    context: string;
    setContext: (value: string) => void;
    constraints: string;
    setConstraints: (value:string) => void;
    priorities: string;
    setPriorities: (value: string) => void;
    validationErrors: { [key: string]: boolean };
    voice: string;
    setVoice: (value: string) => void;
    narrationStyle: string;
    setNarrationStyle: (value: string) => void;
    validateContextOnBlur: () => void;
}

const commonInputClasses = "w-full px-4 py-2 bg-slate-50/10 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-600/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition placeholder:text-slate-500 dark:placeholder:text-slate-400";
const commonSelectClasses = `${commonInputClasses} appearance-none`;
const commonLabelClasses = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";


export const OptionsPanel: React.FC<OptionsPanelProps> = ({ 
    context, setContext, 
    constraints, setConstraints, 
    priorities, setPriorities, 
    validationErrors,
    voice, setVoice,
    narrationStyle, setNarrationStyle,
    validateContextOnBlur
}) => {
    return (
        <div className="space-y-8">
            {/* Section 2 */}
            <section role="group" aria-labelledby="context-heading" className="space-y-4">
                <h2 id="context-heading" className="text-xl font-semibold text-slate-800 dark:text-slate-100">2. Definir Contexto e Prioridades</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Forneça os detalhes essenciais para guiar a análise da IA. Campos marcados com <span className="text-red-500 font-semibold" aria-hidden="true">*</span> são obrigatórios.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="context" className={commonLabelClasses}>
                            Contexto/Domínio <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <Tooltip text="Descreva o propósito e o ambiente da arquitetura. Ex: Sistema de e-commerce B2C com foco em alta disponibilidade." className="w-full">
                            <input
                                id="context"
                                type="text"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                onBlur={validateContextOnBlur}
                                placeholder="Ex: E-commerce B2C de alta disponibilidade"
                                className={`${commonInputClasses} ${validationErrors.context ? 'border-red-500/50 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                aria-required="true"
                                aria-invalid={validationErrors.context ? 'true' : 'false'}
                                aria-describedby={validationErrors.context ? "context-error" : undefined}
                            />
                        </Tooltip>
                        {validationErrors.context && <p id="context-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                    </div>
                    <div>
                        <label htmlFor="constraints" className={commonLabelClasses}>
                            Restrições Conhecidas <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <Tooltip text="Liste as limitações técnicas ou de negócio. Ex: Orçamento limitado, equipe pequena, uso obrigatório de AWS." className="w-full">
                            <input
                                id="constraints"
                                type="text"
                                value={constraints}
                                onChange={(e) => setConstraints(e.target.value)}
                                placeholder="Ex: Orçamento limitado, uso obrigatório de AWS"
                                className={`${commonInputClasses} ${validationErrors.constraints ? 'border-red-500/50 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                aria-required="true"
                                aria-invalid={validationErrors.constraints ? 'true' : 'false'}
                                aria-describedby={validationErrors.constraints ? "constraints-error" : undefined}
                            />
                        </Tooltip>
                        {validationErrors.constraints && <p id="constraints-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                    </div>
                    <div>
                        <label htmlFor="priorities" className={commonLabelClasses}>
                            Prioridades <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <Tooltip text="Indique os principais objetivos da otimização. Ex: Redução de custos, aumento de performance, melhoria na segurança." className="w-full">
                            <input
                                id="priorities"
                                type="text"
                                value={priorities}
                                onChange={(e) => setPriorities(e.target.value)}
                                placeholder="Ex: Redução de custos, escalabilidade"
                                className={`${commonInputClasses} ${validationErrors.priorities ? 'border-red-500/50 ring-1 ring-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                                aria-required="true"
                                aria-invalid={validationErrors.priorities ? 'true' : 'false'}
                                aria-describedby={validationErrors.priorities ? "priorities-error" : undefined}
                            />
                        </Tooltip>
                        {validationErrors.priorities && <p id="priorities-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">Este campo é obrigatório.</p>}
                    </div>
                </div>
            </section>

            {/* Section 3 */}
            <section role="group" aria-labelledby="audio-heading" className="space-y-4">
                <h2 id="audio-heading" className="text-xl font-semibold text-slate-800 dark:text-slate-100">3. Opções de Áudio</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Personalize a narração do resumo executivo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="voice" className={commonLabelClasses}>
                            Voz
                        </label>
                        <Tooltip text="Escolha a voz para a narração do resumo em áudio.">
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
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-700 dark:text-slate-300">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                    <div>
                        <label htmlFor="narrationStyle" className={commonLabelClasses}>
                            Estilo de Narração
                        </label>
                        <Tooltip text="Defina o tom da narração para o resumo em áudio.">
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
                                    <option>Formal e Conciso</option>
                                    <option>Narrativa Cativante</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-700 dark:text-slate-300">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </section>
        </div>
    );
};