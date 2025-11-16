import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { OptionsPanel } from './components/OptionsPanel';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { HistoryPanel } from './components/HistoryPanel';
import { Tooltip } from './components/Tooltip';
import { analyzeArchitecture, generateAudioSummary, generateDiagramImage } from './services/geminiService';
import { getHistory, addHistoryEntry, clearHistory } from './services/historyService';
import type { AnalysisResult, HistoryEntry, DiagramConfig } from './types';

// Lista de mensagens de carregamento para a análise principal da IA
const ANALYSIS_MESSAGES = [
    "Analisando dependências e inicializando o modelo...",
    "Processando arquivos de documentação fornecidos...",
    "Extraindo entidades e diagramas da arquitetura original...",
    "Executando análise de pontos fortes e fracos (Deep Dive)...",
    "Consultando base de conhecimento para arquiteturas alternativas...",
    "Gerando propostas de otimização com base nas prioridades...",
    "Compilando a matriz de decisão e o relatório técnico...",
    "Finalizando a documentação em HTML e Markdown...",
    "Quase lá, a IA está revisando o conteúdo final...",
];


const App: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [context, setContext] = useState<string>('');
    const [constraints, setConstraints] = useState<string>('');
    const [priorities, setPriorities] = useState<string>('Performance e Custo');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<Error | string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [voice, setVoice] = useState<string>('Puck');
    const [narrationStyle, setNarrationStyle] = useState<string>('Profissional e Claro');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setHistory(getHistory());
        // Delay mounting to allow CSS transitions to apply
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const body = document.body;
        body.style.transition = 'background-color 0.3s ease, color 0.3s ease';

        const lightThemeLink = document.getElementById('hljs-light-theme') as HTMLLinkElement | null;
        const darkThemeLink = document.getElementById('hljs-dark-theme') as HTMLLinkElement | null;

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            body.classList.add('animated-gradient-bg', 'text-slate-200');
            body.classList.remove('bg-slate-50', 'text-slate-800');
            if (lightThemeLink) lightThemeLink.disabled = true;
            if (darkThemeLink) darkThemeLink.disabled = false;
        } else {
            document.documentElement.classList.remove('dark');
            body.classList.remove('animated-gradient-bg', 'text-slate-200');
            body.classList.add('bg-slate-50', 'text-slate-800');
            if (lightThemeLink) lightThemeLink.disabled = false;
            if (darkThemeLink) darkThemeLink.disabled = true;
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const updateContext = (value: string) => {
        setContext(value);
        if (validationErrors.context) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.context;
                return newErrors;
            });
        }
    };
    
    const validateContextOnBlur = () => {
        if (!context.trim()) {
            setValidationErrors(prev => ({...prev, context: true}));
        }
    };

    const updateConstraints = (value: string) => {
        setConstraints(value);
        if (validationErrors.constraints) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.constraints;
                return newErrors;
            });
        }
    };

    const updatePriorities = (value: string) => {
        setPriorities(value);
        if (validationErrors.priorities) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.priorities;
                return newErrors;
            });
        }
    };

    const handleAnalyze = useCallback(async () => {
        setError(null);
        setValidationErrors({});

        if (files.length === 0) {
            setError('Por favor, anexe pelo menos um arquivo de documentação.');
            return;
        }

        const newValidationErrors: { [key: string]: boolean } = {};
        if (!context.trim()) newValidationErrors.context = true;
        if (!constraints.trim()) newValidationErrors.constraints = true;
        if (!priorities.trim()) newValidationErrors.priorities = true;

        if (Object.keys(newValidationErrors).length > 0) {
            setValidationErrors(newValidationErrors);
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        let loadingInterval: NodeJS.Timeout | null = null;

        try {
            setLoadingMessage('Preparando ambiente de análise...');
            const fileContents = await Promise.all(
                files.map(async (file) => ({
                    name: file.name,
                    mimeType: file.type,
                    base64: await fileToBase64(file),
                }))
            );

            // Inicia o ciclo de mensagens dinâmicas para a análise principal
            let messageIndex = 0;
            setLoadingMessage(ANALYSIS_MESSAGES[messageIndex]);
            loadingInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % ANALYSIS_MESSAGES.length;
                setLoadingMessage(ANALYSIS_MESSAGES[messageIndex]);
            }, 2800);

            const analysisData = await analyzeArchitecture(fileContents, context, constraints, priorities);
            
            if (loadingInterval) clearInterval(loadingInterval); // Para o ciclo após a análise
            
            let audioBase64: string | null = null;
            
            if (analysisData.audioSummary) {
                setLoadingMessage('Gerando resumo em áudio com TTS premium...'); // Mensagem específica para áudio
                setIsGeneratingAudio(true);
                audioBase64 = await generateAudioSummary(analysisData.audioSummary, voice, narrationStyle);
                setIsGeneratingAudio(false);
            }

            const audioPlayerTag = audioBase64
                ? `<div class="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow pdf-no-break">
                       <div class="no-print">
                           <h3 class="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Ouvir Resumo Executivo</h3>
                           <audio controls class="w-full">
                               <source src="data:audio/mpeg;base64,${audioBase64}" type="audio/mpeg">
                               Seu navegador não suporta o elemento de áudio.
                           </audio>
                       </div>
                       <div class="print-only" style="padding:1rem; border:1px solid #e2e8f0; border-radius: 0.5rem; background-color: #f8fafc;">
                           <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;">Resumo Executivo em Áudio</h3>
                           <div style="display: flex; align-items: center; gap: 0.75rem; color: #475569;">
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                               <div style="flex-grow: 1; height: 8px; background-color: #e2e8f0; border-radius: 9999px;">
                                   <div style="width: 20%; height: 100%; background-color: #3b82f6; border-radius: 9999px;"></div>
                               </div>
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                           </div>
                           <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.75rem;">O resumo em áudio está disponível na versão interativa online.</p>
                       </div>
                   </div>`
                : '';

            const finalHtml = analysisData.html.replace('[[AUDIO_PLAYER_PLACEHOLDER]]', audioPlayerTag);

            const resultPayload: AnalysisResult = {
                html: finalHtml,
                markdown: analysisData.markdown,
                audioBase64: audioBase64,
                diagramPrompt: analysisData.diagramPrompt || null,
            };

            setAnalysisResult(resultPayload);
            const newHistory = addHistoryEntry(resultPayload, files, analysisData.audioSummary);
            setHistory(newHistory);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err : new Error('Ocorreu um erro desconhecido.'));
        } finally {
            if (loadingInterval) clearInterval(loadingInterval); // Garante a limpeza em caso de erro
            setIsLoading(false);
            setLoadingMessage('');
            setIsGeneratingAudio(false);
        }
    }, [files, context, constraints, priorities, voice, narrationStyle]);

    const handleGenerateDiagram = useCallback(async (config: DiagramConfig): Promise<string[] | null> => {
        if (!analysisResult?.diagramPrompt) return null;
    
        setError(null);
    
        try {
            const imagesBase64 = await generateDiagramImage(analysisResult.diagramPrompt, config);
            
            if (imagesBase64 && imagesBase64.length > 0) {
                 const imgTags = imagesBase64.map((imageBase64, index) => 
                    `<figure class="my-8 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden pdf-no-break">
                        <img id="aiGeneratedDiagram-${index}" src="data:image/png;base64,${imageBase64}" alt="Diagrama de Arquitetura Gerado por IA #${index + 1}" class="rounded-md shadow-lg w-full h-auto object-contain cursor-zoom-in" title="Clique para ampliar" />
                        <figcaption class="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Diagrama de arquitetura visual #${index + 1} gerado por IA. Clique para ampliar.</figcaption>
                    </figure>`
                ).join('');
                
                setAnalysisResult(prevResult => {
                    if (!prevResult) return null;
                    return {
                        ...prevResult,
                        html: prevResult.html.replace('[[DIAGRAM_PLACEHOLDER]]', imgTags),
                        diagramPrompt: null, 
                    };
                });
                return imagesBase64;
            } else {
                throw new Error('A geração da imagem não retornou dados.');
            }
    
        } catch (err) {
            console.error("Propagating diagram generation error to UI:", err);
            // Re-lança o erro para que o componente ResultsDisplay possa capturá-lo e exibir uma mensagem específica.
            throw err;
        }
    }, [analysisResult]);

    const handleLoadHistoryEntry = (result: AnalysisResult) => {
        setAnalysisResult(result);
        setError(null);
        setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleClearHistory = () => {
        clearHistory();
        setHistory([]);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header theme={theme} toggleTheme={toggleTheme} isMounted={isMounted} />
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="space-y-12">
                    <div className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200/20 dark:border-slate-700/50">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Analisador de Arquitetura Inteligente</h2>
                                <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">Otimize sua arquitetura tecnológica com análises profundas e geração de documentação profissional.</p>
                            </div>
                            
                            <div className="space-y-8">
                                <FileUpload files={files} setFiles={setFiles} />
                                <OptionsPanel 
                                    context={context}
                                    setContext={updateContext}
                                    constraints={constraints}
                                    setConstraints={updateConstraints}
                                    priorities={priorities}
                                    setPriorities={updatePriorities}
                                    validationErrors={validationErrors}
                                    voice={voice}
                                    setVoice={setVoice}
                                    narrationStyle={narrationStyle}
                                    setNarrationStyle={setNarrationStyle}
                                    validateContextOnBlur={validateContextOnBlur}
                                />

                                {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

                                <div className="text-center pt-4">
                                    <Tooltip text={files.length === 0 ? "Adicione ao menos um arquivo para iniciar a análise." : "Iniciar a análise da arquitetura com base nos documentos e opções fornecidas."} className="w-full sm:w-auto">
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isLoading || files.length === 0}
                                            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 disabled:from-slate-400 disabled:to-slate-500 dark:disabled:from-slate-600 dark:disabled:to-slate-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            {isLoading ? 'Analisando...' : 'Analisar Arquitetura'}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>

                    {history.length > 0 && (
                         <div className={`transition-all duration-700 ease-out delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <HistoryPanel
                                history={history}
                                onLoadEntry={handleLoadHistoryEntry}
                                onClearHistory={handleClearHistory}
                            />
                        </div>
                    )}

                    {isLoading && <Loader message={loadingMessage} isGeneratingAudio={isGeneratingAudio} />}

                    {analysisResult && (
                        <div ref={resultsRef} className={`transition-all duration-700 ease-out delay-300 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <ResultsDisplay 
                                result={analysisResult}
                                onGenerateDiagram={handleGenerateDiagram}
                             />
                        </div>
                    )}
                </div>
            </main>
            <footer className={`text-center py-4 text-sm text-slate-500 dark:text-slate-400 transition-opacity duration-700 delay-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
                <p>
                    Desenvolvido com ❤️ por Amândio Vaz - 2025
                </p>
            </footer>
        </div>
    );
};

export default App;
