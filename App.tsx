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
import type { AnalysisResult, HistoryEntry } from './types';

const App: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [context, setContext] = useState<string>('');
    const [constraints, setConstraints] = useState<string>('');
    const [priorities, setPriorities] = useState<string>('Performance e Custo');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<Error | string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [voice, setVoice] = useState<string>('Puck');
    const [narrationStyle, setNarrationStyle] = useState<string>('Profissional e Claro');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setHistory(getHistory());
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
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

        try {
            setLoadingMessage('Processando arquivos e extraindo informações...');
            const fileContents = await Promise.all(
                files.map(async (file) => ({
                    name: file.name,
                    mimeType: file.type,
                    base64: await fileToBase64(file),
                }))
            );

            setLoadingMessage('Analisando arquitetura com IA (Modo Pensamento Profundo)...');
            const analysisData = await analyzeArchitecture(fileContents, context, constraints, priorities);
            
            let audioBase64: string | null = null;
            
            if (analysisData.audioSummary) {
                setLoadingMessage('Gerando resumo em áudio com TTS premium...');
                audioBase64 = await generateAudioSummary(analysisData.audioSummary, voice, narrationStyle);
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
                       <div class="print-only">
                           <h3>Resumo Executivo em Áudio</h3>
                           <p>O resumo executivo em áudio está disponível na versão interativa online desta documentação.</p>
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
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [files, context, constraints, priorities, voice, narrationStyle]);

    const handleGenerateDiagram = async () => {
        if (!analysisResult?.diagramPrompt || isLoading) return;
    
        setIsLoading(true);
        setLoadingMessage('Criando diagrama visual com IA...');
        setError(null);
    
        try {
            const imageBase64 = await generateDiagramImage(analysisResult.diagramPrompt);
            
            if (imageBase64) {
                const imgTag = `<figure class="my-8 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"><img id="aiGeneratedDiagram" src="data:image/jpeg;base64,${imageBase64}" alt="Diagrama de Arquitetura Gerado por IA" class="rounded-md shadow-lg w-full h-auto object-contain" /><figcaption class="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Diagrama de arquitetura visual gerado por IA.</figcaption></figure>`;
                
                setAnalysisResult(prevResult => {
                    if (!prevResult) return null;
                    return {
                        ...prevResult,
                        html: prevResult.html.replace('[[DIAGRAM_PLACEHOLDER]]', imgTag),
                        diagramPrompt: null, 
                    };
                });
            } else {
                setError(new Error('A geração da imagem não retornou dados.'));
            }
    
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err : new Error('Falha ao gerar o diagrama.'));
            setAnalysisResult(prevResult => {
                if (!prevResult) return null;
                const errorHtml = '<div class="my-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-center text-red-700 dark:text-red-300">Falha ao gerar o diagrama. Por favor, tente novamente mais tarde.</div>';
                return {
                    ...prevResult,
                    html: prevResult.html.replace('[[DIAGRAM_PLACEHOLDER]]', errorHtml),
                    diagramPrompt: null,
                };
            });
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

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
        <div className="min-h-screen transition-colors duration-300">
            <Header theme={theme} toggleTheme={toggleTheme} />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Analisador de Arquitetura Inteligente</h1>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">Otimize sua arquitetura tecnológica com análises profundas e geração de documentação profissional.</p>
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
                            />

                            {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

                            <div className="text-center pt-4">
                                <Tooltip text={files.length === 0 ? "Adicione ao menos um arquivo para iniciar a análise." : "Iniciar a análise da arquitetura com base nos documentos e opções fornecidas."} className="w-full sm:w-auto">
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isLoading || files.length === 0}
                                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Analisando...' : 'Analisar Arquitetura'}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {history.length > 0 && (
                        <HistoryPanel
                            history={history}
                            onLoadEntry={handleLoadHistoryEntry}
                            onClearHistory={handleClearHistory}
                        />
                    )}

                    {isLoading && <Loader message={loadingMessage} />}

                    {analysisResult && (
                        <div className="mt-12" ref={resultsRef}>
                            <ResultsDisplay 
                                result={analysisResult}
                                onGenerateDiagram={handleGenerateDiagram}
                                isLoading={isLoading}
                             />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
