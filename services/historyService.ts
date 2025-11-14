import type { AnalysisResult, HistoryEntry } from '../types';

const HISTORY_KEY = 'analysisHistory';
const MAX_HISTORY_ITEMS = 10;

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

export const addHistoryEntry = (
    result: AnalysisResult,
    files: File[],
    summary: string
): HistoryEntry[] => {
    const newEntry: HistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        files: files.map(f => f.name),
        summary: summary,
        result: result,
    };

    const currentHistory = getHistory();
    const newHistory = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error("Failed to save history to localStorage:", error);
    }

    return newHistory;
};

export const clearHistory = (): void => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage:", error);
    }
};
