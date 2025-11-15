import type { AnalysisResult, HistoryEntry } from '../types';

const HISTORY_KEY = 'analysisHistory';
const MAX_HISTORY_ITEMS = 5; // Reduzido para evitar problemas de quota

export const getHistory = (): HistoryEntry[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        if (historyJson) {
            return JSON.parse(historyJson);
        }
    } catch (error) {
        console.error("Failed to load history from localStorage:", error);
        localStorage.removeItem(HISTORY_KEY);
    }
    return [];
};

const saveHistory = (history: HistoryEntry[]): void => {
    if (history.length === 0) {
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch (e) {
            console.error("Failed to clear history from localStorage:", e);
        }
        return;
    }
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save history to localStorage:", error);
        // Se a quota for excedida, remova o item mais antigo e tente novamente.
        if (history.length > 1 && (error as DOMException).name === 'QuotaExceededError') {
            console.warn(`Quota exceeded. Removing oldest history entry and retrying.`);
            saveHistory(history.slice(0, history.length - 1));
        }
    }
}

export const addHistoryEntry = (
    result: AnalysisResult,
    files: File[],
    summary: string
): HistoryEntry[] => {

    // Sanitize result for storage to avoid localStorage quota errors
    const resultForStorage: AnalysisResult = {
        ...result,
        audioBase64: null, // Don't store large audio file in history
        // Remove potentially large base64 image data from HTML
        html: result.html.replace(/src="data:image\/[^;]+;base64,[^"]+"/g, 'src="" alt="Diagrama removido do histórico para economizar espaço."'),
    };

    const newEntry: HistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        files: files.map(f => f.name),
        summary: summary,
        result: resultForStorage, // Store the sanitized result
    };

    const currentHistory = getHistory();
    const newHistory = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    
    saveHistory(newHistory);

    return newHistory;
};

export const clearHistory = (): void => {
    try {
        localStorage.removeItem(HISTORY_KEY);
        saveHistory([]);
    } catch (error) {
        console.error("Failed to clear history from localStorage:", error);
    }
};