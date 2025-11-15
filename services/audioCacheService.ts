// services/audioCacheService.ts

interface CacheEntry {
    value: string;
    timestamp: number;
}

class AudioCacheService {
    private prefix = 'audioCache_';

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

    private getCacheKey(summaryText: string, voice: string, narrationStyle: string): string {
        const textHash = this.createHash(summaryText);
        // Combine hash, length, voice, and style for a robust, unique, and short key
        return `${this.prefix}${voice}|${narrationStyle}|${summaryText.length}|${textHash}`;
    }

    get(summaryText: string, voice: string, narrationStyle: string): string | null {
        const key = this.getCacheKey(summaryText, voice, narrationStyle);
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const entry: CacheEntry = JSON.parse(item);
            
            // Update timestamp on access for LRU (Least Recently Used) strategy
            entry.timestamp = Date.now();
            localStorage.setItem(key, JSON.stringify(entry));
            
            return entry.value;
        } catch (error) {
            console.error("Failed to read from localStorage cache:", error);
            return null;
        }
    }

    set(summaryText: string, voice: string, narrationStyle: string, value: string): void {
        const key = this.getCacheKey(summaryText, voice, narrationStyle);
        const entry: CacheEntry = {
            value,
            timestamp: Date.now(),
        };
        try {
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
            console.error("Failed to write to localStorage cache:", error);
            if (this.isQuotaExceeded(error)) {
                this.cleanup();
                try {
                    // Retry after cleanup
                    localStorage.setItem(key, JSON.stringify(entry));
                } catch (retryError) {
                    console.error("Failed to write to cache even after cleanup:", retryError);
                }
            }
        }
    }
    
    /**
     * A more robust LRU (Least Recently Used) cleanup strategy.
     * When quota is exceeded, this function removes a batch of the oldest entries
     * to free up a significant amount of space at once.
     */
    private cleanup(): void {
        console.warn("LocalStorage quota might be exceeded. Cleaning up audio cache.");
        try {
            const cacheItems: { key: string; timestamp: number }[] = [];
            const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));

            for (const key of keys) {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        const entry: CacheEntry = JSON.parse(item);
                        cacheItems.push({ key, timestamp: entry.timestamp });
                    } catch (e) {
                        // If parsing fails, it's a corrupted entry, remove it immediately.
                        console.warn(`Removing corrupted cache entry: ${key}`);
                        localStorage.removeItem(key);
                    }
                }
            }
            
            if (cacheItems.length < 2) {
                console.log("Cache cleanup aborted: Not enough items to clean.");
                return; 
            }

            // Sort by timestamp to find the oldest entries
            cacheItems.sort((a, b) => a.timestamp - b.timestamp);

            // Determine how many items to remove (20% of the cache, or at least one)
            const itemsToRemoveCount = Math.max(1, Math.floor(cacheItems.length * 0.2));
            const itemsToRemove = cacheItems.slice(0, itemsToRemoveCount);

            console.log(`Attempting to remove ${itemsToRemove.length} oldest audio cache entries.`);
            for (const item of itemsToRemove) {
                localStorage.removeItem(item.key);
            }

        } catch (error) {
            console.error("Failed during audio cache cleanup:", error);
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

export const audioCache = new AudioCacheService();