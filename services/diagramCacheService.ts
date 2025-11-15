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

    private getCacheKey(prompt: string, aspectRatio: string, numberOfImages: number): string {
        const promptHash = this.createHash(prompt);
        // Combine hash, aspectRatio, and numberOfImages for a robust, unique key
        return `${this.prefix}${aspectRatio}|${numberOfImages}|${prompt.length}|${promptHash}`;
    }

    get(prompt: string, aspectRatio: string, numberOfImages: number): string[] | null {
        const key = this.getCacheKey(prompt, aspectRatio, numberOfImages);
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const entry: CacheEntry = JSON.parse(item);
            
            // Update timestamp on access for LRU (Least Recently Used) strategy
            entry.timestamp = Date.now();
            localStorage.setItem(key, JSON.stringify(entry));
            
            return entry.value;
        } catch (error) {
            console.error("Failed to read from localStorage diagram cache:", error);
            return null;
        }
    }

    set(prompt: string, aspectRatio: string, numberOfImages: number, value: string[]): void {
        const key = this.getCacheKey(prompt, aspectRatio, numberOfImages);
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
                    // Retry after cleanup
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