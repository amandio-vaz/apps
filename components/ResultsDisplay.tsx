
import React, { useState, useRef } from 'react';
import type { AnalysisResult } from '../types';
import { Icon } from './Icon';

// Fix: Add type declarations for jspdf and html2canvas on the global window object.
// These libraries are likely loaded via script tags and are not imported,
// so TypeScript needs to be informed of their existence to avoid compilation errors.
declare global {
    interface Window {
        jspdf: {
            jsPDF: any; // Using 'any' for simplicity as the full type is complex
        };
        html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    }
}

interface ResultsDisplayProps {
    result: AnalysisResult;
    onGenerateDiagram: () => void;
    isGeneratingDiagram: boolean;
}

type Tab = 'html' | 'markdown' | 'pdf' | 'audio';

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onGenerateDiagram, isGeneratingDiagram }) => {
    const [activeTab, setActiveTab] = useState<Tab>('html');
    const htmlContentRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const showGenerateDiagramButton = result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]');

    const handleDownloadPdf = async () => {
        const { jsPDF } = window.jspdf;
        const content = htmlContentRef.current;
    
        if (!content) {
            console.error("Elemento de conteúdo não encontrado para geração de PDF.");
            alert("Não foi possível encontrar o conteúdo para gerar o PDF.");
            return;
        }
    
        setIsGeneratingPdf(true);
        try {
            // Adiciona uma classe ao corpo para aplicar estilos específicos de PDF
            document.body.classList.add('pdf-rendering');
    
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });
    
            // Usa o método .html() para PDFs de alta qualidade com texto selecionável
            await pdf.html(content, {
                callback: function (doc: any) {
                    doc.save('analise-arquitetura-ia.pdf');
                    // Limpa os estilos e o estado após salvar
                    document.body.classList.remove('pdf-rendering');
                    setIsGeneratingPdf(false);
                },
                margin: [40, 40, 40, 40], // [topo, direita, baixo, esquerda]
                autoPaging: 'slice',
                html2canvas: {
                    scale: 0.7, // Ajusta a escala para melhor encaixe dos elementos
                    useCORS: true,
                    backgroundColor: '#ffffff', // Força um fundo branco
                    onclone: (document: Document) => {
                        // Garante que o documento clonado para renderização não tenha a classe 'dark'
                        document.documentElement.classList.remove('dark');
                    }
                },
                width: 515, // Largura A4 (595pt) - margens horizontais (40+40)
                windowWidth: 1024, // Simula uma viewport mais larga para o cálculo do layout
            });
    
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
            document.body.classList.remove('pdf-rendering');
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!result.markdown) {
            alert("Conteúdo Markdown não disponível para download.");
            return;
        }

        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.md');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    

    const TabButton: React.FC<{ tab: Tab; label: string; icon: string }> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            <Icon name={icon} className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Resultados da Análise</h2>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="flex flex-wrap items-center space-x-2 sm:space-x-4 -mb-px">
                    <TabButton tab="html" label="Página Web" icon="html" />
                    <TabButton tab="markdown" label="Markdown" icon="markdown" />
                    <TabButton tab="pdf" label="PDF" icon="pdf" />
                </nav>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                {activeTab === 'html' && (
                    <>
                        {showGenerateDiagramButton && (
                            <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow text-center no-print border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Visualização da Arquitetura</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Um diagrama visual pode ser gerado por IA para esta seção.</p>
                                <button
                                    onClick={onGenerateDiagram}
                                    disabled={isGeneratingDiagram}
                                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed"
                                >
                                    <Icon name="diagram" className="w-5 h-5" />
                                    {isGeneratingDiagram ? 'Gerando Diagrama...' : 'Gerar Diagrama com IA'}
                                </button>
                            </div>
                        )}
                        <div ref={htmlContentRef} dangerouslySetInnerHTML={{ __html: result.html }} />
                    </>
                )}
                {activeTab === 'markdown' && (
                    <div>
                         <button
                            onClick={handleDownloadMarkdown}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg mb-4 no-print"
                        >
                            <Icon name="download" className="w-5 h-5" />
                            Baixar Markdown
                        </button>
                        <pre className="whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                            <code>{result.markdown}</code>
                        </pre>
                    </div>
                )}
                {activeTab === 'pdf' && (
                    <div>
                        <p className="mb-4">Clique no botão abaixo para gerar e baixar um arquivo PDF do relatório. O conteúdo será paginado automaticamente para se ajustar ao formato A4, garantindo a legibilidade de diagramas e tabelas.</p>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-400"
                        >
                            <Icon name="pdf" className="w-5 h-5" />
                            {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
