import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import type { AnalysisResult, DiagramConfig } from '../types';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

// Fix: Add type declarations for jspdf and html2canvas to the global window object.
// These libraries are loaded dynamically, so TypeScript needs to be aware of them.
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
        hljs: {
            highlightElement: (element: HTMLElement) => void;
            lineNumbersBlock: (element: HTMLElement, options?: { startFrom?: number }) => void;
        };
    }
}

const loadedScripts = new Map<string, Promise<void>>();

const loadScript = (src: string): Promise<void> => {
    if (loadedScripts.has(src)) {
        return loadedScripts.get(src)!;
    }
    const promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
    loadedScripts.set(src, promise);
    return promise;
};


interface ResultsDisplayProps {
    result: AnalysisResult;
    onGenerateDiagram: (config: DiagramConfig) => Promise<string[] | null>;
}

type Tab = 'html' | 'markdown';
type DownloadStatus = 'idle' | 'loading' | 'success';

const DownloadButtonContent: React.FC<{
    status: DownloadStatus;
    idleIcon: string;
    idleText: string;
    loadingText?: string;
    successText?: string;
}> = ({ status, idleIcon, idleText, loadingText = 'Gerando...', successText = 'Sucesso!' }) => {
    switch (status) {
        case 'loading':
            return (
                <>
                    <Icon name="spinner" className="w-5 h-5 animate-spin" />
                    <span>{loadingText}</span>
                </>
            );
        case 'success':
            return (
                <>
                    <Icon name="check" className="w-5 h-5" />
                    <span>{successText}</span>
                </>
            );
        case 'idle':
        default:
            return (
                <>
                    <Icon name={idleIcon} className="w-5 h-5" />
                    <span>{idleText}</span>
                </>
            );
    }
};

const diagramLoadingMessages = [
    "Analisando o prompt do diagrama...",
    "Inicializando o modelo de imagem Imagen 4.0...",
    "Configurando o pipeline de renderização...",
    "Gerando conceitos visuais iniciais...",
    "Renderizando variações de alta resolução...",
    "Aplicando toques finais e otimizando...",
    "Quase pronto! A IA está finalizando a obra de arte.",
];

const DiagramLoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-500/10 dark:bg-slate-900/50 rounded-lg border border-slate-200/20 dark:border-slate-700/50 transition-all duration-300">
        <div className="relative w-20 h-20">
            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Animação do 'Blueprint' */}
                <rect x="10" y="10" width="80" height="80" rx="4" stroke="currentColor" className="text-sky-500/30" strokeWidth="2"/>
                <path d="M30 70 L30 50 L50 30 L70 50 L70 70" stroke="currentColor" className="text-sky-400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                    strokeDasharray="150" strokeDashoffset="150" style={{ animation: 'draw 2s ease-in-out forwards' }}/>
                <rect x="45" y="60" width="10" height="10" stroke="currentColor" className="text-sky-400" strokeWidth="2"
                    strokeDasharray="40" strokeDashoffset="40" style={{ animation: 'draw 1.5s ease-in-out 1s forwards' }} />
            </svg>
            <style>{`
                @keyframes draw { to { stroke-dashoffset: 0; } }
            `}</style>
        </div>
        <p className="mt-4 text-center text-slate-600 dark:text-slate-300 font-medium">{message}</p>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full" style={{ width: '100%', animation: 'progress 3s ease-in-out infinite' }}></div>
            <style>{`
                @keyframes progress { 
                    0% { transform: translateX(-100%); } 
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onGenerateDiagram }) => {
    const [activeTab, setActiveTab] = useState<Tab>('html');
    const [downloadStatus, setDownloadStatus] = useState<{
        pdf: DownloadStatus;
        markdown: DownloadStatus;
        audio: DownloadStatus;
        diagram: DownloadStatus;
        txt: DownloadStatus;
        json: DownloadStatus;
    }>({
        pdf: 'idle',
        markdown: 'idle',
        audio: 'idle',
        diagram: 'idle',
        txt: 'idle',
        json: 'idle',
    });

    const [isDiagramVisible, setIsDiagramVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [copyStatusMessage, setCopyStatusMessage] = useState('');
    
    // State for pagination
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const scrollPositions = useRef<{ html: number, markdown: number }>({ html: 0, markdown: 0 }); // Ref para posições de rolagem
    const [diagramAspectRatio, setDiagramAspectRatio] = useState<DiagramConfig['aspectRatio']>('16:9');
    const [diagramNumberOfImages, setDiagramNumberOfImages] = useState<number>(2);
    const [diagramStyle, setDiagramStyle] = useState<string>('Arquitetura de Blocos');
    const [diagramNegativePrompt, setDiagramNegativePrompt] = useState<string>('');
    const [diagramNegativePromptError, setDiagramNegativePromptError] = useState<string | null>(null);
    const [diagramError, setDiagramError] = useState<string | null>(null);


    // State for Diagram Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState('');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const startPanPoint = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    // State for diagram loading messages
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (downloadStatus.diagram === 'loading') {
            setLoadingMessageIndex(0); // Reset on start
            loadingIntervalRef.current = setInterval(() => {
                setLoadingMessageIndex(prevIndex => (prevIndex + 1) % diagramLoadingMessages.length);
            }, 2500);
        } else {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
                loadingIntervalRef.current = null;
            }
        }
        return () => {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        };
    }, [downloadStatus.diagram]);


    // --- LÓGICA PARA PERSISTÊNCIA DA POSIÇÃO DE ROLAGEM ---
    const handleTabChange = (newTab: Tab) => {
        if (newTab === activeTab) return;

        // Armazena a posição de rolagem atual da aba que está sendo desativada.
        scrollPositions.current[activeTab] = window.scrollY;
        setActiveTab(newTab);
    };

    useLayoutEffect(() => {
        // Restaura a posição de rolagem para a nova aba ativa.
        // O uso de useLayoutEffect previne um "salto" visual.
        const savedPosition = scrollPositions.current[activeTab];
        window.scrollTo({ top: savedPosition, behavior: 'auto' });
    }, [activeTab]);


    const setStatusWithTimeout = useCallback((key: keyof typeof downloadStatus, status: DownloadStatus, timeout = 2000) => {
        setDownloadStatus(s => ({ ...s, [key]: status }));
        if (status === 'success') {
            setTimeout(() => {
                setDownloadStatus(s => ({ ...s, [key]: 'idle' }));
            }, timeout);
        }
    }, []);

    useEffect(() => {
        // Trigger animation shortly after the component mounts
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const diagramElement = document.querySelector('img[id^="aiGeneratedDiagram-"]');
        setIsDiagramVisible(!!diagramElement);
    }, [result.html]);

    // Efeito para recalcular as páginas quando o conteúdo ou a aba mudam.
    useEffect(() => {
        if (activeTab === 'html' && result.html) {
            const rawPages = result.html.split(/(?=<h[1-2][^>]*>)/).filter(page => page.trim() !== '');
            const mergedPages: string[] = [];
            let pageBuffer = '';
    
            rawPages.forEach((page, index) => {
                pageBuffer += page;
                const hasContentAfterHeading = /<\/h[1-2]>\s*<[a-z]/i.test(page);
    
                if (hasContentAfterHeading || index === rawPages.length - 1) {
                    if (pageBuffer.trim()) {
                        mergedPages.push(pageBuffer);
                    }
                    pageBuffer = '';
                }
            });
    
            if (pageBuffer.trim()) mergedPages.push(pageBuffer);
    
            setPages(mergedPages.length > 0 ? mergedPages : (result.html ? [result.html] : []));
        }
    }, [result.html, activeTab]);

    // Efeito para redefinir a página e a rolagem APENAS quando um novo resultado é carregado.
    useEffect(() => {
        setCurrentPage(0);
        scrollPositions.current = { html: 0, markdown: 0 };
    }, [result.html]);


    // Efeito para aplicar realce de sintaxe e numeração de linhas
    useEffect(() => {
        if (activeTab === 'html' && window.hljs) {
            const timer = setTimeout(() => {
                try {
                    const codeBlocks = document.querySelectorAll('#tabpanel-html pre code');
                    codeBlocks.forEach((block) => {
                        window.hljs.highlightElement(block as HTMLElement);
                        window.hljs.lineNumbersBlock(block as HTMLElement);
                    });
                } catch (e) {
                    console.error("Erro ao aplicar realce de sintaxe:", e);
                }
            }, 100); // Pequeno atraso para garantir que o DOM seja renderizado
    
            return () => clearTimeout(timer);
        }
    }, [pages, currentPage, activeTab, result.html]); // Re-executa quando o conteúdo visível muda


    const showGenerateDiagramButton = result.diagramPrompt && result.html.includes('[[DIAGRAM_PLACEHOLDER]]');
    const showDiagramGenerationUI = showGenerateDiagramButton || downloadStatus.diagram !== 'idle';


    const handleGenerateDiagramClick = async () => {
        if (!showGenerateDiagramButton || downloadStatus.diagram === 'loading' || !!diagramNegativePromptError) return;
        
        setDiagramError(null);
        setStatusWithTimeout('diagram', 'loading', 0);

        try {
            const imagesBase64 = await onGenerateDiagram({
                aspectRatio: diagramAspectRatio,
                numberOfImages: diagramNumberOfImages,
                style: diagramStyle,
                negativePrompt: diagramNegativePrompt,
            });
    
            if (imagesBase64 && imagesBase64.length > 0) {
                setStatusWithTimeout('diagram', 'success', 2000);
            } else {
                // Este caso pode ocorrer se a API retornar nulo sem um erro explícito.
                setDiagramError("A geração do diagrama não retornou imagens, mas não especificou um erro.");
                setStatusWithTimeout('diagram', 'idle', 0);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao gerar o diagrama.';
            setDiagramError(message);
            setStatusWithTimeout('diagram', 'idle', 0); // Reseta o estado de carregamento no erro
        }
    };

    const handleNegativePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDiagramNegativePrompt(value);

        if (value.trim() === '' && value.length > 0) {
            setDiagramNegativePromptError('O prompt negativo não pode conter apenas espaços em branco.');
        } else if (value.length > 200) {
            setDiagramNegativePromptError('O prompt negativo não pode exceder 200 caracteres.');
        } else {
            setDiagramNegativePromptError(null);
        }
    };

    const handleDownloadPdf = async () => {
        setStatusWithTimeout('pdf', 'loading', 0);
        try {
            await Promise.all([
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js")
            ]);

            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
                throw new Error("PDF generation libraries not loaded correctly.");
            }
            
            const { jsPDF } = window.jspdf;
            const style = document.createElement('style');
            style.id = 'pdf-print-styles';
            // Refined CSS page-break logic
            style.innerHTML = `
                .pdf-export-container h1, .pdf-export-container h2 { page-break-before: always; }
                .pdf-export-container h1 + h2 { page-break-before: auto; } /* Don't break between h1 and immediate h2 */
                .pdf-export-container > .prose > h1:first-child, .pdf-export-container > .prose > h2:first-child { page-break-before: auto; }
                .pdf-export-container h1, .pdf-export-container h2, .pdf-export-container h3, .pdf-export-container h4, .pdf-export-container figure, .pdf-export-container table, .pdf-export-container pre, .pdf-export-container blockquote, .pdf-export-container .pdf-no-break, .pdf-export-container ul, .pdf-export-container ol { page-break-inside: avoid; }
            `;
            document.head.appendChild(style);

            const container = document.createElement('div');
            container.className = 'pdf-export-container';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '515pt';
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'prose prose-slate max-w-none';
            contentWrapper.innerHTML = result.html;
            container.appendChild(contentWrapper);
            document.body.appendChild(container);

            document.body.classList.add('pdf-rendering');
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            await pdf.html(contentWrapper, {
                margin: [40, 40, 40, 40],
                autoPaging: 'slice',
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', onclone: (doc: Document) => doc.documentElement.classList.remove('dark') },
                width: 515,
                windowWidth: 1024,
            });
            pdf.save('analise-arquitetura-ia.pdf');
            setStatusWithTimeout('pdf', 'success');

            document.body.removeChild(container);
            document.body.classList.remove('pdf-rendering');
            style.remove();

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
            setStatusWithTimeout('pdf', 'idle', 0);
        }
    };

    const handleDownloadMarkdown = () => {
        setStatusWithTimeout('markdown', 'loading');
        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.md');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusWithTimeout('markdown', 'success');
    };

    const handleDownloadAudio = () => {
        if (!result.audioBase64) return;
        setStatusWithTimeout('audio', 'loading');
        const binaryString = window.atob(result.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'resumo-arquitetura.mp3');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusWithTimeout('audio', 'success');
    };
    
    const handleDownloadDiagram = () => {
        const imgElements = document.querySelectorAll<HTMLImageElement>('img[id^="aiGeneratedDiagram-"]');
        if (!imgElements || imgElements.length === 0) return;

        setStatusWithTimeout('diagram', 'loading');
        
        imgElements.forEach((imgElement, index) => {
            const link = document.createElement('a');
            link.href = imgElement.src;
            link.setAttribute('download', `diagrama-arquitetura-${index + 1}.png`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        setStatusWithTimeout('diagram', 'success');
    };
    
    const handleDownloadTxt = () => {
        setStatusWithTimeout('txt', 'loading');
        const blob = new Blob([result.markdown], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusWithTimeout('txt', 'success');
    };

    const handleDownloadJson = () => {
        setStatusWithTimeout('json', 'loading');
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                title: "StackArch Cortex Platform - Analysis Report",
            },
            content: {
                html: result.html,
                markdown: result.markdown,
            },
            assets: {
                hasAudio: !!result.audioBase64,
                diagramPrompt: result.diagramPrompt || "Nenhum prompt de diagrama disponível ou diagrama já gerado.",
            }
        };
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'analise-arquitetura-ia.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatusWithTimeout('json', 'success');
    };

    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(result.markdown).then(() => {
            setIsCopied(true);
            setCopyStatusMessage('Conteúdo copiado!');
            setTimeout(() => { setIsCopied(false); setCopyStatusMessage(''); }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar:', err);
            setCopyStatusMessage('Falha ao copiar.');
            setTimeout(() => setCopyStatusMessage(''), 2000);
        });
    };

    // Diagram Modal Handlers
    const openModal = (src: string) => {
        setModalImageSrc(src);
        setIsModalOpen(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };
    const closeModal = () => setIsModalOpen(false);
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        setZoom(Math.max(0.5, Math.min(newZoom, 5)));
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsPanning(true);
        startPanPoint.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setPan({
            x: e.clientX - startPanPoint.current.x,
            y: e.clientY - startPanPoint.current.y,
        });
    };
    const handleMouseUp = () => setIsPanning(false);

    // Event delegation for opening the modal
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.id.startsWith('aiGeneratedDiagram-') && target.tagName === 'IMG') {
            openModal(target.getAttribute('src') || '');
        }
    };
    
    const baseButtonClass = "inline-flex items-center justify-center gap-2 w-full sm:w-auto text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-60";
    const commonSelectClasses = "w-full px-4 py-2 bg-slate-50/10 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-600/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition appearance-none text-slate-800 dark:text-slate-200";
    const commonInputClasses = "w-full px-4 py-2 bg-slate-50/10 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-600/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-800 dark:text-slate-200";
    const commonLabelClasses = "block text-sm text-left font-medium text-slate-700 dark:text-slate-300 mb-1.5";


    const TabButton: React.FC<{ tab: Tab; label: string; icon: string; tooltip: string }> = ({ tab, label, icon, tooltip }) => (
        <Tooltip text={tooltip}>
            <button
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                onClick={() => handleTabChange(tab)}
                className={`relative flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-md transition-all duration-300 transform hover:scale-110 ${
                    activeTab === tab 
                    ? 'text-sky-400' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400'
                }`}
            >
                <Icon name={icon} className="w-5 h-5" />
                <span>{label}</span>
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-400 rounded-full" />}
            </button>
        </Tooltip>
    );

    const PaginationControls: React.FC = () => {
        if (pages.length <= 1) return null;

        return (
            <div className="flex justify-between items-center my-6 p-3 bg-white/10 dark:bg-slate-900/50 rounded-lg no-print">
                <Tooltip text="Ir para a página anterior do documento.">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-700/50 hover:bg-white/30 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        Anterior
                    </button>
                </Tooltip>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Página {currentPage + 1} de {pages.length}
                </span>
                <Tooltip text="Ir para a próxima página do documento.">
                    <button
                        onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                        disabled={currentPage === pages.length - 1}
                        className="inline-flex items-center gap-2 bg-white/20 dark:bg-slate-700/50 hover:bg-white/30 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        Próximo
                    </button>
                </Tooltip>
            </div>
        );
    };

    const aspectRatios: DiagramConfig['aspectRatio'][] = ['16:9', '1:1', '9:16', '4:3', '3:4'];
    const diagramStyles = [
        'Arquitetura de Blocos', 
        'Fluxo de Dados', 
        'Componentes Detalhados',
        'Diagrama de Sequência',
        'Visão Isométrica 3D',
        'Estilo Blueprint Técnico'
    ];

    return (
        <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200/20 dark:border-slate-700/50">
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 transition-all duration-500 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Resultados da Análise</h2>
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 flex-wrap">
                    {isDiagramVisible && (
                        <Tooltip text="Baixar o diagrama de arquitetura gerado pela IA como uma imagem PNG.">
                            <button
                                onClick={handleDownloadDiagram}
                                disabled={downloadStatus.diagram !== 'idle'}
                                className={`${baseButtonClass} bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600`}
                                aria-label="Baixar diagrama como imagem PNG"
                            >
                                <DownloadButtonContent status={downloadStatus.diagram} idleIcon="diagram" idleText=".PNG" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    {result.audioBase64 && (
                        <Tooltip text="Baixar o resumo executivo em formato de áudio MP3.">
                            <button
                                onClick={handleDownloadAudio}
                                disabled={downloadStatus.audio !== 'idle'}
                                className={`${baseButtonClass} bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600`}
                                aria-label="Baixar resumo em áudio no formato MP3"
                            >
                                <DownloadButtonContent status={downloadStatus.audio} idleIcon="audio" idleText=".MP3" loadingText="Baixando..." />
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip text="Baixar o relatório como um arquivo de texto simples (.txt).">
                        <button
                            onClick={handleDownloadTxt}
                            disabled={downloadStatus.txt !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700`}
                            aria-label="Baixar análise em formato de texto"
                        >
                            <DownloadButtonContent status={downloadStatus.txt} idleIcon="text" idleText=".TXT" loadingText="Baixando..." />
                        </button>
                    </Tooltip>
                    <Tooltip text="Exportar todos os dados da análise em um formato JSON estruturado.">
                        <button
                            onClick={handleDownloadJson}
                            disabled={downloadStatus.json !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600`}
                            aria-label="Exportar análise para formato JSON"
                        >
                            <DownloadButtonContent status={downloadStatus.json} idleIcon="json" idleText="JSON" loadingText="Exportando..." />
                        </button>
                    </Tooltip>
                    <Tooltip text="Baixar o relatório completo da análise no formato Markdown.">
                        <button
                            onClick={handleDownloadMarkdown}
                            disabled={downloadStatus.markdown !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600`}
                            aria-label="Baixar análise em formato Markdown"
                        >
                             <DownloadButtonContent status={downloadStatus.markdown} idleIcon="markdown" idleText=".MD" loadingText="Baixando..." />
                        </button>
                    </Tooltip>
                    <Tooltip text="Gerar e baixar um relatório completo e profissional no formato PDF.">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadStatus.pdf !== 'idle'}
                            className={`${baseButtonClass} bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600`}
                            aria-label="Exportar análise para formato PDF"
                        >
                            <DownloadButtonContent status={downloadStatus.pdf} idleIcon="pdf" idleText="PDF" />
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            <div className={`border-b border-slate-200/20 dark:border-slate-700/50 mb-6 transition-all duration-500 ease-out delay-150 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <nav role="tablist" aria-label="Formatos de resultado" className="flex flex-wrap items-center space-x-2 sm:space-x-4">
                    <TabButton tab="html" label="Página Web" icon="html" tooltip="Visualizar o relatório como uma página web interativa." />
                    <div className="flex items-center gap-2">
                        <TabButton tab="markdown" label="Markdown" icon="markdown" tooltip="Visualizar o relatório em formato Markdown puro." />
                        {activeTab === 'markdown' && (
                            <Tooltip text="Copiar todo o conteúdo Markdown para a área de transferência.">
                                <button
                                    onClick={handleCopyMarkdown}
                                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-all bg-slate-200/20 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-300/30 dark:hover:bg-slate-600/60 transform hover:scale-105"
                                    aria-label="Copiar conteúdo Markdown para a área de transferência"
                                >
                                    {isCopied ? (
                                        <>
                                            <Icon name="check" className="w-4 h-4 text-green-500" />
                                            <span>Copiado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="copy" className="w-4 h-4" />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </nav>
            </div>

            <div role="status" aria-live="polite" className="sr-only">
              {copyStatusMessage}
            </div>

            <div className={`prose prose-slate dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white transition-opacity duration-700 ease-out delay-300 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
                <div 
                    id="tabpanel-html"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="tab-html"
                    hidden={activeTab !== 'html'}
                    onClick={handleContentClick}
                >
                     {showDiagramGenerationUI && (
                        <div className="my-6 no-print">
                            {downloadStatus.diagram === 'loading' ? (
                                <DiagramLoadingState message={diagramLoadingMessages[loadingMessageIndex]} />
                            ) : (
                                <div className="p-4 bg-slate-500/10 dark:bg-slate-900/50 rounded-lg shadow text-center border border-slate-200/20 dark:border-slate-700/50 transition-opacity duration-300">
                                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Visualização da Arquitetura</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Um diagrama visual pode ser gerado por IA para esta seção. Refine as opções abaixo.</p>
                                    
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label htmlFor="aspect-ratio" className={commonLabelClasses}>
                                                    Proporção
                                                </label>
                                                <Tooltip text="Selecione a proporção (aspect ratio) para o diagrama.">
                                                    <div className="relative w-full">
                                                        <select
                                                            id="aspect-ratio"
                                                            value={diagramAspectRatio}
                                                            onChange={(e) => setDiagramAspectRatio(e.target.value as DiagramConfig['aspectRatio'])}
                                                            className={`${commonSelectClasses} h-[42px] pl-3 pr-8`}
                                                        >
                                                            {aspectRatios.map(ratio => (
                                                                <option key={ratio} value={ratio}>{ratio}</option>
                                                            ))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="http://www.w3.org/2000/svg"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            </div>
                                            <div>
                                                <label htmlFor="number-of-images" className={commonLabelClasses}>
                                                    Nº de Imagens
                                                </label>
                                                <Tooltip text="Selecione o número de imagens a serem geradas.">
                                                    <div className="relative w-full">
                                                        <select
                                                            id="number-of-images"
                                                            value={diagramNumberOfImages}
                                                            onChange={(e) => setDiagramNumberOfImages(Number(e.target.value))}
                                                            className={`${commonSelectClasses} h-[42px] pl-3 pr-8`}
                                                        >
                                                            {[1, 2, 3, 4].map(num => (
                                                                <option key={num} value={num}>{num} imagem{num > 1 ? 's' : ''}</option>
                                                            ))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="http://www.w3.org/2000/svg"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            </div>
                                            <div>
                                                <label htmlFor="diagram-style" className={commonLabelClasses}>
                                                    Estilo Visual
                                                </label>
                                                <Tooltip text="Selecione o estilo visual para o diagrama.">
                                                    <div className="relative w-full">
                                                        <select
                                                            id="diagram-style"
                                                            value={diagramStyle}
                                                            onChange={(e) => setDiagramStyle(e.target.value)}
                                                            className={`${commonSelectClasses} h-[42px] pl-3 pr-8`}
                                                        >
                                                            {diagramStyles.map(style => (
                                                                <option key={style} value={style}>{style}</option>
                                                            ))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="http://www.w3.org/2000/svg"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                        </div>
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="negative-prompt" className={commonLabelClasses}>
                                                Prompt Negativo (Opcional)
                                            </label>
                                            <Tooltip text="Descreva elementos ou estilos a serem evitados na imagem. Ex: texto, escrita, pessoas, cores feias, desfocado.">
                                                <input
                                                    id="negative-prompt"
                                                    type="text"
                                                    value={diagramNegativePrompt}
                                                    onChange={handleNegativePromptChange}
                                                    placeholder="Ex: texto, desfocado, cartoon"
                                                    className={`${commonInputClasses} h-[42px] ${diagramNegativePromptError ? 'border-red-500/50 ring-1 ring-red-500' : ''}`}
                                                    aria-label="Prompt negativo para geração de diagrama"
                                                    aria-invalid={!!diagramNegativePromptError}
                                                    aria-describedby={diagramNegativePromptError ? "negative-prompt-error" : undefined}
                                                />
                                            </Tooltip>
                                            {diagramNegativePromptError && (
                                                <p id="negative-prompt-error" className="mt-1 text-sm text-left text-red-500 dark:text-red-400" role="alert">
                                                    {diagramNegativePromptError}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {diagramError && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-700 dark:text-red-300 text-center" role="alert">
                                                <p><strong>Falha na Geração:</strong> {diagramError}</p>
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            <Tooltip text={`Solicitar à IA que gere ${diagramNumberOfImages} ${diagramNumberOfImages > 1 ? 'diagramas visuais' : 'diagrama visual'} no estilo "${diagramStyle}" (${diagramAspectRatio}).`}>
                                                <button
                                                    onClick={handleGenerateDiagramClick}
                                                    disabled={!showGenerateDiagramButton || !!diagramNegativePromptError}
                                                    className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto text-white font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed
                                                        ${downloadStatus.diagram === 'success' ? 'bg-green-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}
                                                        
                                                        ${downloadStatus.diagram === 'idle' && !showGenerateDiagramButton ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
                                                    `}
                                                >
                                                <DownloadButtonContent 
                                                        status={downloadStatus.diagram}
                                                        idleIcon="diagram"
                                                        idleText="Gerar Diagrama com IA"
                                                        loadingText="Gerando Diagrama..."
                                                        successText="Diagrama Gerado!"
                                                />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <PaginationControls />
                    <div dangerouslySetInnerHTML={{ __html: pages[currentPage] || '' }} />
                    <PaginationControls />
                </div>
                <div
                    id="tabpanel-markdown"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="tab-markdown"
                    hidden={activeTab !== 'markdown'}
                >
                    <pre className="whitespace-pre-wrap bg-slate-500/10 dark:bg-slate-900/50 p-4 rounded-md text-sm text-slate-800 dark:text-slate-200">
                        <code>{result.markdown}</code>
                    </pre>
                </div>
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
                    onClick={closeModal}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <Tooltip text="Fechar">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <Icon name="close" className="w-8 h-8"/>
                        </button>
                    </Tooltip>
                    <div 
                        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden cursor-grab"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            ref={imageRef}
                            src={modalImageSrc} 
                            alt="Diagrama de arquitetura ampliado" 
                            className="transition-transform duration-200 ease-out"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};