
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { OptionsPanel } from './components/OptionsPanel';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { analyzeArchitecture, generateAudioSummary, generateDiagramImage } from './services/geminiService';
import type { AnalysisResult } from './types';

const App: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [context, setContext] = useState<string>('');
    const [constraints, setConstraints] = useState<string>('');
    const [priorities, setPriorities] = useState<string>('Performance e Custo');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            setError('Por favor, anexe pelo menos um arquivo de documentação.');
            return;
        }

        setIsLoading(true);
        setError(null);
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
            let imageBase64: string | null = null;

            const promises = [];

            if(analysisData.audioSummary) {
                setLoadingMessage('Gerando resumo em áudio com TTS premium...');
                promises.push(
                    generateAudioSummary(analysisData.audioSummary).then(res => audioBase64 = res)
                );
            }

            if(analysisData.diagramPrompt) {
                 setLoadingMessage('Gerando diagrama de arquitetura visual...');
                promises.push(
                    generateDiagramImage(analysisData.diagramPrompt).then(res => imageBase64 = res)
                );
            }
            
            await Promise.all(promises);

            // Embed the generated image into the HTML content
            let finalHtml = analysisData.html;
            if (imageBase64) {
                const imgTag = `<div class="flex justify-center my-8"><img src="data:image/jpeg;base64,${imageBase64}" alt="Diagrama de Arquitetura Gerado por IA" class="rounded-lg shadow-lg max-w-full h-auto border border-slate-200 dark:border-slate-700" /></div>`;
                finalHtml = finalHtml.replace('[[DIAGRAM_PLACEHOLDER]]', imgTag);
            } else {
                 finalHtml = finalHtml.replace('[[DIAGRAM_PLACEHOLDER]]', '');
            }

            setAnalysisResult({
                html: finalHtml,
                markdown: analysisData.markdown,
                audioBase64: audioBase64,
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? `Ocorreu um erro: ${err.message}` : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [files, context, constraints, priorities]);

    return (
        <div className="min-h-screen transition-colors duration-300">
            <Header theme={theme} toggleTheme={toggleTheme} />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">GPS AI: Analisador Inteligente de Arquiteturas</h1>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">Otimize sua arquitetura tecnológica com análises profundas e geração de documentação profissional.</p>
                        </div>
                        
                        <div className="space-y-8">
                            <FileUpload files={files} setFiles={setFiles} />
                            <OptionsPanel 
                                context={context}
                                setContext={setContext}
                                constraints={constraints}
                                setConstraints={setConstraints}
                                priorities={priorities}
                                setPriorities={setPriorities}
                            />

                            {error && <div className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg p-3 text-center">{error}</div>}

                            <div className="text-center pt-4">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isLoading || files.length === 0}
                                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Analisando...' : 'Analisar Arquitetura'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isLoading && <Loader message={loadingMessage} />}

                    {analysisResult && (
                        <div className="mt-12">
                            <ResultsDisplay result={analysisResult} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
