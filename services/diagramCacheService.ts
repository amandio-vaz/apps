// services/diagramCacheService.ts

interface CacheEntry {
    value: string[]; // Store an array of base64 strings
    timestamp: number;
}

class DiagramCacheService {
    private prefix = 'diagramCache_';

    // Simple hash function to create a short key from a long string
    private createHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    private getCacheKey(prompt: string, aspectRatio: string, numberOfImages: number, style: string, negativePrompt?: string): string {
        const promptHash = this.createHash(prompt);
        const negativePromptHash = this.createHash(negativePrompt || '');
        // Combina todos os parâmetros para uma chave única e robusta
        return `${this.prefix}${style}|${aspectRatio}|${numberOfImages}|${prompt.length}|${promptHash}|${(negativePrompt || '').length}|${negativePromptHash}`;
    }

    get(prompt: string, aspectRatio: string, numberOfImages: number, style: string, negativePrompt?: string): string[] | null {
        const key = this.getCacheKey(prompt, aspectRatio, numberOfImages, style, negativePrompt);
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const entry: CacheEntry = JSON.parse(item);
            
            // Atualiza o timestamp no acesso para a estratégia LRU (Least Recently Used)
            entry.timestamp = Date.now();
            localStorage.setItem(key, JSON.stringify(entry));
            
            return entry.value;
        } catch (error) {
            console.error("Failed to read from localStorage diagram cache:", error);
            return null;
        }
    }

    set(prompt: string, aspectRatio: string, numberOfImages: number, style: string, value: string[], negativePrompt?: string): void {
        const key = this.getCacheKey(prompt, aspectRatio, numberOfImages, style, negativePrompt);
        const entry: CacheEntry = {
            value,
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
            console.error("Failed to write to localStorage diagram cache:", error);
            if (this.isQuotaExceeded(error)) {
                this.cleanup();
                try {
                    // Tenta novamente após a limpeza
                    localStorage.setItem(key, JSON.stringify(entry));
                } catch (retryError) {
                    console.error("Failed to write to diagram cache even after cleanup:", retryError);
                }
            }
        }
    }
    
    private cleanup(): void {
        console.warn("LocalStorage quota might be exceeded. Cleaning up least recently used diagram cache entry.");
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));

            if (keys.length < 2) return;

            let oldestKey: string | null = null;
            let oldestTimestamp = Infinity;

            for (const key of keys) {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        const entry: CacheEntry = JSON.parse(item);
                        if (entry.timestamp < oldestTimestamp) {
                            oldestTimestamp = entry.timestamp;
                            oldestKey = key;
                        }
                    } catch (e) {
                        localStorage.removeItem(key);
                    }
                }
            }

            if (oldestKey) {
                console.log(`Removing oldest diagram cache entry: ${oldestKey}`);
                localStorage.removeItem(oldestKey);
            }

        } catch (error) {
            console.error("Failed during diagram cache cleanup:", error);
        }
    }
    
    private isQuotaExceeded(e: unknown): boolean {
        if (e instanceof DOMException) {
            return (
                e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
            );
        }
        return false;
    }
}

export const diagramCache = new DiagramCacheService();