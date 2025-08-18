/**
 * ===============================================================================
 * LinkedIn Lead Extension - Background Service Worker
 * ===============================================================================
 * 
 * A professional Chrome extension for extracting and enriching LinkedIn contacts
 * with AI-powered analysis using Google's Gemini models.
 * 
 * Features:
 * - Contact extraction from LinkedIn profiles and search results
 * - Company data enrichment with AI classification (B2B/B2C)
 * - Domain resolution for company websites
 * - Name parsing with title detection (Mr./Mrs.)
 * - Excel export with advanced formatting
 * - Multi-language support (English/Italian)
 * - Rate limiting and caching for API efficiency
 * - Persistent logging system for debugging
 * 
 * AI Model Support:
 * - Gemini 2.5 Flash (default): Fast, cost-effective processing
 * - Gemini 2.5 Flash Lite: Ultra-fast for high-volume operations  
 * - Gemini 2.5 Pro: Advanced reasoning for complex analysis
 * - Local AI models: Can be configured for on-premise deployment
 * 
 * Architecture:
 * - background.js: Service worker for AI processing and data management
 * - content.js: Injection script for LinkedIn page interaction
 * - popup.js/popup.html: User interface for configuration and management
 * 
 * Data Flow:
 * 1. Content script extracts data from LinkedIn pages
 * 2. Background worker processes data through AI models
 * 3. Results are cached and stored locally
 * 4. User can export enriched data to Excel format
 * 
 * @author LinkedIn Lead Extension Team
 * @version 5.2
 * @license MIT
 * ===============================================================================
 */

// ==========================================================================
// ========================== I18N / LOCALIZATION ===========================
// ==========================================================================

const messages = {
  en: {
    // Background Notifications & Logs
    xlsxLibrarySuccess: "BACKGROUND: XLSX library loaded successfully.",
    xlsxLibraryError: "BACKGROUND: CRITICAL ERROR - Failed to import XLSX library. Check that the path '/libs/xlsx.full.min.js' is correct and that there is no 'type: module' in manifest.json for the background.",
    domainRequestLog: "BACKGROUND: Requesting domains for {count} unique companies.",
    nameSplitRequestLog: "BACKGROUND: Requesting name split for {count} contacts.",
    startProcessingLog: "BACKGROUND: Starting processing for \"{folderName}\".",
    exportStartedTitle: "Export Started",
    exportStartedMessage: "Processing for \"{folderName}\" has begun...",
    exportLibraryError: "Export library (XLSX) not loaded.",
    apiError: "API request failed with status {status}.",
    noGeminiContent: "No valid content received from Gemini.",
    invalidGeminiJson: "Invalid JSON format from Gemini response.",
    parsingGeminiErrorLog: "BACKGROUND: Could not parse Gemini JSON response:",
    apiErrorLog: "BACKGROUND: Gemini API Error:",
    noValidCompaniesForDomainSearch: "BACKGROUND: No valid 'LinkedIn Company' found for domain search.",
    apiCallInProgressLog: "BACKGROUND: Starting {count} API calls in parallel.",
    apiCallCompletedLog: "BACKGROUND: All API calls have been completed.",
    creatingExcelLog: "BACKGROUND: Creating Excel file.",
    excelHeaders: ["Full Name", "Title", "First Name", "Last Name", "First Name (ASCII)", "Last Name (ASCII)", "Job Title", "Location", "Contact Company", "Orbis", "LinkedIn Company", "Company Domain", "LinkedIn Profile", "LinkedIn Page URL", "Company Contact Count"],
    companyExcelHeaders: ["Company Name", "Domain", "Industry", "Company Size", "Description", "Location", "Website", "Logo URL"],
    exportCompleteTitle: "Export Complete",
    exportCompleteMessage: "The file for \"{folderName}\" is ready to be saved.",
    exportErrorTitle: "Export Error",
    exportErrorMessage: "Details: {errorMessage}",
    exportErrorLog: "BACKGROUND: ERROR DURING EXPORT:",
    processFinishedLog: "BACKGROUND: Process finished. Status set to 'idle'.",
    // AI Prompts
    domainPrompt: `Given the list of company names, find the main website domain for each.
List: {companyNames}
Respond EXCLUSIVELY with a single JSON object that maps each company name to its domain (e.g., "company.com"). If you cannot find a domain, use "N/A".
Example: { "Example Company Inc.": "example.com", "Ghost Company": "N/A" }`,
    nameSplitPrompt: `Split each name into [firstName, lastName, title]. Title: "Mr."/"Mrs." or "" if ambiguous.
Names: {fullNames}
Return JSON object mapping each name to array [firstName, lastName, title].
Example: { "John Smith": ["John", "Smith", "Mr."], "Maria Garcia": ["Maria", "Garcia", "Mrs."] }`
  },
  it: {
    // Background Notifications & Logs
    xlsxLibrarySuccess: "BACKGROUND: Libreria XLSX caricata correttamente.",
    xlsxLibraryError: "BACKGROUND: ERRORE CRITICO - Impossibile importare la libreria XLSX. Controlla che il percorso '/libs/xlsx.full.min.js' sia corretto e che non ci sia 'type: module' in manifest.json per il background.",
    domainRequestLog: "BACKGROUND: Richiesta domini per {count} aziende uniche.",
    nameSplitRequestLog: "BACKGROUND: Richiesta suddivisione nomi per {count} contatti.",
    startProcessingLog: "BACKGROUND: Inizio elaborazione per \"{selectedFolder}\".",
    exportStartedTitle: "Esportazione Avviata",
    exportStartedMessage: "L'elaborazione per \"{folderName}\" è iniziata...",
    exportLibraryError: "Libreria di esportazione (XLSX) non caricata.",
    apiError: "La richiesta API è fallita con stato {status}.",
    noGeminiContent: "Nessun contenuto valido ricevuto da Gemini.",
    invalidGeminiJson: "Formato JSON non valido dalla risposta di Gemini.",
    parsingGeminiErrorLog: "BACKGROUND: Impossibile parsare la risposta JSON di Gemini:",
    apiErrorLog: "BACKGROUND: Errore API Gemini:",
    noValidCompaniesForDomainSearch: "BACKGROUND: Nessuna 'Azienda LinkedIn' valida trovata per la ricerca dei domini.",
    apiCallInProgressLog: "BACKGROUND: Avvio di {count} chiamate API in parallelo.",
    apiCallCompletedLog: "BACKGROUND: Tutte le chiamate API sono state completate.",
    creatingExcelLog: "BACKGROUND: Creazione del file Excel.",
    excelHeaders: ["Nome Completo", "Titolo", "Nome", "Cognome", "Nome (ASCII)", "Cognome (ASCII)", "Titolo Lavorativo", "Località", "Azienda Contatto", "Orbis", "Azienda LinkedIn", "Dominio Azienda", "Profilo LinkedIn", "URL Pagina LinkedIn", "Numero Contatti Azienda"],
    companyExcelHeaders: ["Nome Azienda", "Dominio", "Settore", "Dimensioni Azienda", "Descrizione", "Località", "Link SalesNavigator", "URL Logo"],
    exportCompleteTitle: "Esportazione Completata",
    exportCompleteMessage: "Il file per \"{folderName}\" è pronto per essere salvato.",
    exportErrorTitle: "Errore di Esportazione",
    exportErrorMessage: "Dettagli: {errorMessage}",
    exportErrorLog: "BACKGROUND: ERRORE DURANTE L'ESPORTAZIONE:",
    processFinishedLog: "BACKGROUND: Processo terminato. Stato impostato su 'idle'.",
    // AI Prompts
    domainPrompt: `Dato l'elenco di nomi di aziende, trova il dominio del sito web principale per ciascuna.
Elenco: {companyNames}
Rispondi ESCLUSIVAMENTE con un singolo oggetto JSON che mappa ogni nome di azienda al suo dominio (es. "azienda.com"). Se non trovi un dominio, usa "N/A".
Esempio: { "Azienda Esempio S.p.A.": "esempio.com", "Azienda Fantasma": "N/A" }`,
    nameSplitPrompt: `Suddividi ogni nome in [nome, cognome, titolo]. Titolo: "Mr."/"Mrs." o "" se ambiguo.
Nomi: {fullNames}
Restituisci oggetto JSON che mappa ogni nome ad array [nome, cognome, titolo].
Esempio: { "Mario Rossi": ["Mario", "Rossi", "Mr."], "Anna Bianchi": ["Anna", "Bianchi", "Mrs."] }`
  }
};

// Utility to get a specific message
async function getMessage(key, substitutions = {}) {
    const { language } = await chrome.storage.local.get({ language: 'it' }); // Default to Italian
    const langMessages = messages[language] || messages.it;
    let message = langMessages[key] || messages.it[key]; // Fallback to Italian if key not found in current lang
    
    if (typeof message !== 'string') return message; // Handle non-string messages like arrays (headers)

    for (const [subKey, subValue] of Object.entries(substitutions)) {
        // Use a global regex to replace all occurrences
        message = message.replace(new RegExp(`{${subKey}}`, 'g'), subValue);
    }
    return message;
}

// ==========================================================================
// ============================ LOGGING SYSTEM ===============================
// ==========================================================================

/**
 * Sistema di logging persistente che salva tutti i log
 */
class PersistentLogger {
    constructor() {
        this.maxLogEntries = 1000; // Mantieni massimo 1000 log entries
        this.initializeLogger();
    }
    
    async initializeLogger() {
        // Intercetta console.log, console.error, console.warn
        this.originalLog = console.log;
        this.originalError = console.error;
        this.originalWarn = console.warn;
        
        console.log = (...args) => {
            this.saveLog('LOG', args);
            this.originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.saveLog('ERROR', args);
            this.originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.saveLog('WARN', args);
            this.originalWarn.apply(console, args);
        };
        
        // Inizializza storage se non esiste
        const { extensionLogs } = await chrome.storage.local.get('extensionLogs');
        if (!extensionLogs) {
            await chrome.storage.local.set({ extensionLogs: [] });
        }
        
        // Log di inizializzazione
        this.saveLog('SYSTEM', ['Persistent logger initialized at', new Date().toISOString()]);
    }
    
    async saveLog(level, args) {
        try {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            const logEntry = {
                timestamp,
                level,
                message,
                source: 'background'
            };
            
            const { extensionLogs } = await chrome.storage.local.get('extensionLogs');
            const logs = extensionLogs || [];
            
            // Aggiungi nuovo log
            logs.push(logEntry);
            
            // Mantieni solo gli ultimi N log
            if (logs.length > this.maxLogEntries) {
                logs.splice(0, logs.length - this.maxLogEntries);
            }
            
            await chrome.storage.local.set({ extensionLogs: logs });
            
        } catch (error) {
            // Usa originalError per evitare loop infiniti
            this.originalError('Failed to save log:', error);
        }
    }
    
    async exportLogs() {
        try {
            const { extensionLogs } = await chrome.storage.local.get('extensionLogs');
            const logs = extensionLogs || [];
            
            if (logs.length === 0) {
                return 'No logs available to export.';
            }
            
            let logText = `SCRAPY EXTENSION LOGS\n`;
            logText += `Generated: ${new Date().toISOString()}\n`;
            logText += `Total entries: ${logs.length}\n`;
            logText += `${'='.repeat(80)}\n\n`;
            
            logs.forEach((log, index) => {
                logText += `[${log.timestamp}] [${log.level}] [${log.source}]\n`;
                logText += `${log.message}\n`;
                logText += `${'-'.repeat(40)}\n`;
            });
            
            return logText;
            
        } catch (error) {
            this.originalError('Failed to export logs:', error);
            return 'Error exporting logs: ' + error.message;
        }
    }
    
    async clearLogs() {
        try {
            await chrome.storage.local.set({ extensionLogs: [] });
            return true;
        } catch (error) {
            this.originalError('Failed to clear logs:', error);
            return false;
        }
    }
    
    // Method to manually log messages from content scripts
    async log(level, message, source) {
        await this.saveLog(level.toUpperCase(), [message]);
    }
}

// Inizializza il logger
const persistentLogger = new PersistentLogger();

// ==========================================================================
// ========================= API RESULTS CACHE ============================
// ==========================================================================

/**
 * Sistema di cache per i risultati API per evitare chiamate duplicate
 */
class ApiResultsCache {
    constructor() {
        this.initializeCache();
    }
    
    async initializeCache() {
        const { apiCache } = await chrome.storage.local.get('apiCache');
        if (!apiCache) {
            await chrome.storage.local.set({ 
                apiCache: {
                    domains: {},
                    names: {},
                    lastCleanup: Date.now()
                }
            });
        }
    }
    
    // Genera chiave hash per un array di input
    generateCacheKey(inputArray, type) {
        const sortedInput = [...inputArray].sort().join('|');
        return `${type}_${btoa(sortedInput).substring(0, 16)}`;
    }
    
    // Salva risultati domains nella cache
    async saveDomainResults(companyNames, results) {
        try {
            const { apiCache } = await chrome.storage.local.get('apiCache');
            const cache = apiCache || { domains: {}, names: {}, lastCleanup: Date.now() };
            
            // Salva ogni singola azienda nella cache
            companyNames.forEach(company => {
                if (results[company]) {
                    cache.domains[company] = {
                        result: results[company],
                        timestamp: Date.now()
                    };
                }
            });
            
            await chrome.storage.local.set({ apiCache: cache });
            console.log(`BACKGROUND: Cached ${Object.keys(results).length} domain results`);
        } catch (error) {
            console.error('BACKGROUND: Error saving domain cache:', error);
        }
    }
    
    // Salva risultati names nella cache
    async saveNameResults(fullNames, results) {
        try {
            const { apiCache } = await chrome.storage.local.get('apiCache');
            const cache = apiCache || { domains: {}, names: {}, lastCleanup: Date.now() };
            
            // Salva ogni singolo nome nella cache
            fullNames.forEach(name => {
                if (results[name]) {
                    cache.names[name] = {
                        result: results[name],
                        timestamp: Date.now()
                    };
                }
            });
            
            await chrome.storage.local.set({ apiCache: cache });
            console.log(`BACKGROUND: Cached ${Object.keys(results).length} name results`);
        } catch (error) {
            console.error('BACKGROUND: Error saving name cache:', error);
        }
    }
    
    // Recupera risultati domains dalla cache
    async getCachedDomains(companyNames) {
        try {
            const { apiCache } = await chrome.storage.local.get('apiCache');
            if (!apiCache || !apiCache.domains) return { cached: {}, missing: companyNames };
            
            const cached = {};
            const missing = [];
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni
            const now = Date.now();
            
            companyNames.forEach(company => {
                const cacheEntry = apiCache.domains[company];
                if (cacheEntry && (now - cacheEntry.timestamp < maxAge)) {
                    cached[company] = cacheEntry.result;
                } else {
                    missing.push(company);
                }
            });
            
            console.log(`BACKGROUND: Found ${Object.keys(cached).length} cached domains, ${missing.length} missing`);
            return { cached, missing };
        } catch (error) {
            console.error('BACKGROUND: Error reading domain cache:', error);
            return { cached: {}, missing: companyNames };
        }
    }
    
    // Recupera risultati names dalla cache
    async getCachedNames(fullNames) {
        try {
            const { apiCache } = await chrome.storage.local.get('apiCache');
            if (!apiCache || !apiCache.names) return { cached: {}, missing: fullNames };
            
            const cached = {};
            const missing = [];
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni
            const now = Date.now();
            
            fullNames.forEach(name => {
                const cacheEntry = apiCache.names[name];
                if (cacheEntry && (now - cacheEntry.timestamp < maxAge)) {
                    cached[name] = cacheEntry.result;
                } else {
                    missing.push(name);
                }
            });
            
            console.log(`BACKGROUND: Found ${Object.keys(cached).length} cached names, ${missing.length} missing`);
            return { cached, missing };
        } catch (error) {
            console.error('BACKGROUND: Error reading name cache:', error);
            return { cached: {}, missing: fullNames };
        }
    }
    
    // Pulizia periodica della cache
    async cleanupCache() {
        try {
            const { apiCache } = await chrome.storage.local.get('apiCache');
            if (!apiCache) return;
            
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 giorni
            const now = Date.now();
            let cleaned = 0;
            
            // Pulisci domains scaduti
            Object.keys(apiCache.domains).forEach(key => {
                if (now - apiCache.domains[key].timestamp > maxAge) {
                    delete apiCache.domains[key];
                    cleaned++;
                }
            });
            
            // Pulisci names scaduti
            Object.keys(apiCache.names).forEach(key => {
                if (now - apiCache.names[key].timestamp > maxAge) {
                    delete apiCache.names[key];
                    cleaned++;
                }
            });
            
            apiCache.lastCleanup = now;
            await chrome.storage.local.set({ apiCache });
            
            if (cleaned > 0) {
                console.log(`BACKGROUND: Cleaned ${cleaned} expired cache entries`);
            }
        } catch (error) {
            console.error('BACKGROUND: Error cleaning cache:', error);
        }
    }
}

const apiCache = new ApiResultsCache();



// Importa la libreria. Il percorso con '/' iniziale è cruciale.
try {
    importScripts('/libs/xlsx.full.min.js');
    console.log(messages.it.xlsxLibrarySuccess); // Use a fixed language for internal logs
} catch (e) {
    console.error(messages.it.xlsxLibraryError, e);
}

// Resetta lo stato all'installazione/aggiornamento dell'estensione
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ 
        exportStatus: 'idle',
        language: 'it', // Set default language on first install
        geminiModel: 'gemini-2.5-flash' // Set default model
    });
});

// Resetta lo stato se il service worker si riavvia durante l'elaborazione
chrome.runtime.onStartup.addListener(async () => {
    console.log('BACKGROUND: Service worker startup - checking for stuck processing state');
    const { exportStatus } = await chrome.storage.local.get('exportStatus');
    if (exportStatus === 'processing') {
        console.log('BACKGROUND: Found stuck processing state, resetting to idle');
        await chrome.storage.local.set({ exportStatus: 'idle' });
        chrome.alarms.clear('keepAlive');
    }
});

/**
 * Converte una stringa in un formato più vicino all'ASCII.
 */
function toAscii(str) {
    if (!str) return '';
    let newStr = str
        .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/ł/g, 'l').replace(/Ł/g, 'L');
    return newStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


/**
 * Generic function to call Gemini AI API with automatic retry and fallback.
 * 
 * Supports multiple Gemini models:
 * - gemini-2.5-flash: Fast and cost-effective (default)
 * - gemini-2.5-flash-lite: Ultra-fast for high-volume operations
 * - gemini-2.5-pro: Advanced reasoning capabilities
 * 
 * For local AI models:
 * Users can configure their own local models by:
 * 1. Setting up a local AI server (e.g., Ollama, LocalAI)
 * 2. Modifying the API_URL to point to local endpoint
 * 3. Adjusting authentication method if needed
 * 
 * Example local setup:
 * - const API_URL = 'http://localhost:11434/v1/chat/completions' // Ollama
 * - const API_URL = 'http://localhost:8080/v1/completions' // LocalAI
 * 
 * @param {string} prompt - The prompt to send to the AI model
 * @param {string} apiKey - API key for authentication (or local token)
 * @param {string} model - Model to use (gemini-2.5-flash, gemini-2.5-pro, or local model name)
 * @param {number} retryCount - Current retry attempt count
 * @returns {Promise<object>} - Parsed JSON response from the AI model
 */
async function callApi(prompt, apiKey, model = 'gemini-2.5-flash', retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    console.log(`BACKGROUND: Calling ${model} API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 65536 // Entrambi i modelli supportano 65k
        }
    };

    try {
        // Timeout di 120 secondi per l'intera operazione API
        const controller = new AbortController();
        let timeoutId = setTimeout(() => {
            controller.abort();
            console.log('BACKGROUND: API call timed out after 120 seconds');
        }, 120000);
        
        const response = await fetch(`${API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        
        // Non pulire ancora il timeout - lo teniamo per l'elaborazione della risposta

        // Gestione errori HTTP
        if (!response.ok) {
            clearTimeout(timeoutId); // Pulisci il timeout per errori HTTP
            const errorBody = await response.text();
            console.error(messages.it.apiErrorLog, errorBody);
            
            // Errore 503 (overloaded) - retry con backoff
            if (response.status === 503 && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount];
                console.log(`BACKGROUND: Model overloaded (503), retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return await callApi(prompt, apiKey, model, retryCount + 1);
            }
            
            // Fallback al modello alternativo se disponibile
            if ((response.status === 503 || response.status === 429) && retryCount === 0) {
                const fallbackModel = model === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
                console.log(`BACKGROUND: Falling back to ${fallbackModel} due to ${response.status} error`);
                return await callApi(prompt, apiKey, fallbackModel, 0);
            }
            
            const errorMessage = await getMessage('apiError', { status: response.status });
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('BACKGROUND: API call successful');
        
        // Controlla errori nella struttura della risposta
        if (!data.candidates || data.candidates.length === 0) {
            clearTimeout(timeoutId);
            console.error('BACKGROUND: No candidates in response:', data);
            const errorMessage = await getMessage('noGeminiContent');
            throw new Error(errorMessage);
        }
        
        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            clearTimeout(timeoutId);
            console.error('BACKGROUND: No content parts in candidate:', candidate);
            const errorMessage = await getMessage('noGeminiContent');
            throw new Error(errorMessage);
        }
        
        const textContent = candidate.content.parts[0].text;
        if (!textContent || textContent.trim() === '') {
            clearTimeout(timeoutId);
            console.error('BACKGROUND: Empty text content in response part:', candidate.content.parts[0]);
            const errorMessage = await getMessage('noGeminiContent');
            throw new Error(errorMessage);
        }
        
        const cleanedText = textContent.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        
        try {
            const parsedResult = JSON.parse(cleanedText);
            clearTimeout(timeoutId); // Pulisci il timeout solo se tutto va bene
            
            // Conta solo le chiamate API riuscite (che arrivano qui)
            await recordSuccessfulApiCall(model);
            
            return parsedResult;
        } catch (e) {
            console.error(messages.it.parsingGeminiErrorLog, cleanedText.substring(0, 500));
            console.error('BACKGROUND: JSON Parse error:', e);
            clearTimeout(timeoutId); // Pulisci il timeout anche in caso di errore di parsing
            const errorMessage = await getMessage('invalidGeminiJson');
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        // Pulisci sempre il timeout in caso di errore
        if (timeoutId) clearTimeout(timeoutId);
        
        // Gestione timeout e errori di rete con retry
        if (retryCount < MAX_RETRIES && (
            error.name === 'AbortError' || 
            error.name === 'TypeError' || 
            error.message.includes('fetch') ||
            error.message.includes('timeout')
        )) {
            const delay = RETRY_DELAYS[retryCount];
            const errorType = error.name === 'AbortError' ? 'timeout' : 'network error';
            console.log(`BACKGROUND: ${errorType}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await callApi(prompt, apiKey, model, retryCount + 1);
        }
        
        // Se tutti i retry falliscono, tenta fallback al modello alternativo
        if (retryCount >= MAX_RETRIES && (error.name === 'AbortError' || error.name === 'TypeError')) {
            const fallbackModel = model === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
            console.log(`BACKGROUND: All retries failed, attempting fallback to ${fallbackModel}`);
            return await callApi(prompt, apiKey, fallbackModel, 0);
        }
        
        throw error;
    }
}

/**
 * Trova i domini per una lista di nomi di aziende univoci con chunking intelligente.
 * @param {string[]} companyNames - Array di nomi di aziende senza duplicati.
 * @param {string} apiKey - La chiave API.
 * @param {string} model - Il modello da usare.
 * @returns {Promise<Object<string, string>>} - Una mappa { nomeAzienda: dominio }.
 */
async function findCompanyDomains(companyNames, apiKey, model) {
    if (!companyNames || companyNames.length === 0) return {};
    
    console.log(messages.it.domainRequestLog.replace('{count}', companyNames.length));
    
    // Controlla cache prima di fare chiamate API
    const { cached, missing } = await apiCache.getCachedDomains(companyNames);
    let results = { ...cached }; // Inizia con i risultati cached
    
    if (missing.length === 0) {
        console.log('BACKGROUND: All domain results found in cache, no API calls needed');
        return results;
    }
    
    console.log(`BACKGROUND: Processing ${missing.length} missing domains (${companyNames.length - missing.length} from cache)`);
    
    // Calcolo chunk size basato sui limiti reali: 65k token output, ~15 token per azienda
    // RIDOTTO per evitare timeout e crash del service worker
    const maxOutputTokens = 65536 * 0.5; // 32k token safe limit (più conservativo)
    const tokensPerCompany = 15; // "Company Name": "domain.com"
    const chunkSize = Math.min(100, Math.floor(maxOutputTokens / tokensPerCompany)); // MAX 100 aziende per chunk
    
    const chunks = [];
    
    // Dividi SOLO i missing in chunks ottimali
    for (let i = 0; i < missing.length; i += chunkSize) {
        chunks.push(missing.slice(i, i + chunkSize));
    }
    
    if (chunks.length > 0) {
        console.log(`BACKGROUND: Processing ${missing.length} missing companies in ${chunks.length} chunks`);
        
        const maxConcurrent = model === 'gemini-2.5-pro' ? 2 : 3;
        
        // Processa chunks in batch con concorrenza limitata
        for (let i = 0; i < chunks.length; i += maxConcurrent) {
            const batchChunks = chunks.slice(i, i + maxConcurrent);
            const batchPromises = batchChunks.map(async (chunk, chunkIndex) => {
                const actualChunkIndex = i + chunkIndex + 1;
                console.log(`BACKGROUND: Processing domains chunk ${actualChunkIndex}/${chunks.length} (${chunk.length} companies)`);
                
                try {
                    await rateLimiter.waitForSlot(model);
                    const promptTemplate = await getMessage('domainPrompt');
                    const prompt = promptTemplate.replace('{companyNames}', JSON.stringify(chunk));
                    const chunkResult = await callApi(prompt, apiKey, model);
                    
                    // Salva immediatamente i risultati nella cache
                    await apiCache.saveDomainResults(chunk, chunkResult);
                    
                    return chunkResult;
                } catch (error) {
                    console.error(`BACKGROUND: Error processing domains chunk ${actualChunkIndex}:`, error);
                    return {};
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(chunkResult => Object.assign(results, chunkResult));
            
            // Small delay between batches
            if (i + maxConcurrent < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    return results;
}

/**
 * Mutex semplice per operazioni atomiche
 */
class SimpleMutex {
    constructor() {
        this.locked = false;
        this.queue = [];
    }
    
    async lock() {
        return new Promise((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }
    
    unlock() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        } else {
            this.locked = false;
        }
    }
}

/**
 * Rate limiter per rispettare i limiti API di Gemini e tenere traccia dell'uso
 */
class RateLimiter {
    constructor() {
        this.calls = {
            'gemini-2.5-flash': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() },
            'gemini-2.5-flash-lite': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() },
            'gemini-2.5-pro': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() }
        };
        this.mutex = new SimpleMutex();
        this.initializeUsageStats();
    }
    
    async initializeUsageStats() {
        try {
            const { apiUsageStats } = await chrome.storage.local.get('apiUsageStats');
            if (!apiUsageStats) {
                await chrome.storage.local.set({ apiUsageStats: {} });
            } else {
                // Sincronizza i contatori in memoria con quelli persistenti
                const today = new Date().toDateString();
                if (apiUsageStats[today]) {
                    this.calls['gemini-2.5-flash'].dailyCount = apiUsageStats[today]['gemini-2.5-flash'] || 0;
                    this.calls['gemini-2.5-flash-lite'].dailyCount = apiUsageStats[today]['gemini-2.5-flash-lite'] || 0;
                    this.calls['gemini-2.5-pro'].dailyCount = apiUsageStats[today]['gemini-2.5-pro'] || 0;
                    console.log('BACKGROUND: Synchronized usage stats from storage:', apiUsageStats[today]);
                }
            }
        } catch (error) {
            console.error('BACKGROUND: Error initializing usage stats:', error);
        }
    }
    
    async updateUsageStats(model) {
        await this.mutex.lock();
        try {
            const today = new Date().toDateString();
            const { apiUsageStats } = await chrome.storage.local.get('apiUsageStats');
            const stats = apiUsageStats || {};
            
            // Inizializza il giorno se non esiste
            if (!stats[today]) {
                stats[today] = {
                    'gemini-2.5-flash': 0,
                    'gemini-2.5-flash-lite': 0,
                    'gemini-2.5-pro': 0
                };
            }
            
            // Incrementa il contatore per il modello (ATOMICO)
            stats[today][model] = (stats[today][model] || 0) + 1;
            
            // NOTA: Non sincronizziamo più con dailyCount perché ora sono separati:
            // - dailyCount = contatore conservativo per rate limiting
            // - stats = contatore accurato per usage stats (solo successi)
            
            // Pulisci i dati vecchi (mantieni solo ultimi 7 giorni)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            
            Object.keys(stats).forEach(dateStr => {
                if (new Date(dateStr) < cutoffDate) {
                    delete stats[dateStr];
                }
            });
            
            await chrome.storage.local.set({ apiUsageStats: stats });
            console.log(`BACKGROUND: Updated usage stats for ${model} (atomic):`, stats[today][model]);
            
        } catch (error) {
            console.error('BACKGROUND: Error updating usage stats:', error);
        } finally {
            this.mutex.unlock();
        }
    }
    
    async waitForSlot(model) {
        const limits = {
            'gemini-2.5-flash': { rpm: 10, rpd: 250 },
            'gemini-2.5-flash-lite': { rpm: 15, rpd: 1000 },
            'gemini-2.5-pro': { rpm: 5, rpd: 100 }
        };
        
        const now = Date.now();
        const todayStr = new Date().toDateString();
        const modelData = this.calls[model];
        
        // Reset daily counter if new day
        if (modelData.lastReset !== todayStr) {
            modelData.dailyCount = 0;
            modelData.lastReset = todayStr;
        }
        
        // Check daily limit
        if (modelData.dailyCount >= limits[model].rpd) {
            throw new Error(`Daily limit reached for ${model} (${limits[model].rpd} requests/day)`);
        }
        
        // Clean old requests (older than 1 minute)
        modelData.requests = modelData.requests.filter(timestamp => now - timestamp < 60000);
        
        // Check per-minute limit
        if (modelData.requests.length >= limits[model].rpm) {
            const oldestRequest = Math.min(...modelData.requests);
            const waitTime = 60000 - (now - oldestRequest) + 100; // +100ms buffer
            console.log(`BACKGROUND: Rate limit reached for ${model}, waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Record this request for rate limiting (but don't count it as successful yet)
        modelData.requests.push(now);
        modelData.dailyCount++; // Per rate limiting conservativo
    }
}

const rateLimiter = new RateLimiter();

/**
 * Conta solo le chiamate API riuscite (dopo il successo)
 * Aggiorna gli usage stats persistenti mostrati nel popup
 * @param {string} model - Il modello usato per la chiamata riuscita
 */
async function recordSuccessfulApiCall(model) {
    // Aggiorna solo gli usage stats persistenti (non il rate limiting counter)
    await rateLimiter.updateUsageStats(model);
}

/**
 * Suddivide i nomi completi e ne deduce il titolo con chunking intelligente.
 * @param {string[]} fullNames - Array di nomi completi.
 * @param {string} apiKey - La chiave API.
 * @param {string} model - Il modello da usare.
 * @returns {Promise<Object<string, [string, string, string]>>}
 */
async function splitContactNames(fullNames, apiKey, model) {
    if (!fullNames || fullNames.length === 0) return {};

    console.log(messages.it.nameSplitRequestLog.replace('{count}', fullNames.length));
    
    // Controlla cache prima di fare chiamate API
    const { cached, missing } = await apiCache.getCachedNames(fullNames);
    let results = { ...cached }; // Inizia con i risultati cached
    
    if (missing.length === 0) {
        console.log('BACKGROUND: All name results found in cache, no API calls needed');
        return results;
    }
    
    console.log(`BACKGROUND: Processing ${missing.length} missing names (${fullNames.length - missing.length} from cache)`);
    
    // Calcolo chunk size basato sui limiti reali: 65k token output, ~12 token per nome
    // RIDOTTO per evitare timeout e crash del service worker con dataset grandi
    const maxOutputTokens = 65536 * 0.5; // 32k token safe limit (più conservativo)
    const tokensPerName = 12; // "Name": ["First", "Last", "Title"]
    const chunkSize = Math.min(50, Math.floor(maxOutputTokens / tokensPerName)); // MAX 50 nomi per chunk
    
    const chunks = [];
    
    // Dividi SOLO i missing in chunks ottimali
    for (let i = 0; i < missing.length; i += chunkSize) {
        chunks.push(missing.slice(i, i + chunkSize));
    }
    
    if (chunks.length > 0) {
        console.log(`BACKGROUND: Processing ${missing.length} missing names in ${chunks.length} chunks`);
        
        const maxConcurrent = model === 'gemini-2.5-pro' ? 2 : 3;
        
        // Processa chunks in batch con concorrenza limitata
        for (let i = 0; i < chunks.length; i += maxConcurrent) {
            const batchChunks = chunks.slice(i, i + maxConcurrent);
            const batchPromises = batchChunks.map(async (chunk, chunkIndex) => {
                const actualChunkIndex = i + chunkIndex + 1;
                console.log(`BACKGROUND: Processing names chunk ${actualChunkIndex}/${chunks.length} (${chunk.length} names)`);
                
                try {
                    await rateLimiter.waitForSlot(model);
                    const promptTemplate = await getMessage('nameSplitPrompt');
                    const prompt = promptTemplate.replace('{fullNames}', JSON.stringify(chunk));
                    const chunkResult = await callApi(prompt, apiKey, model);
                    
                    // Salva immediatamente i risultati nella cache
                    await apiCache.saveNameResults(chunk, chunkResult);
                    
                    return chunkResult;
                } catch (error) {
                    console.error(`BACKGROUND: Error processing names chunk ${actualChunkIndex}:`, error);
                    return {};
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(chunkResult => Object.assign(results, chunkResult));
            
            // Small delay between batches
            if (i + maxConcurrent < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    return results;
}

/**
 * Funzione per esportare aziende in Excel.
 */
async function exportCompanies({ companies, selectedFolder }) {
    console.log('BACKGROUND: Starting company export for folder:', selectedFolder);
    
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error(await getMessage('exportLibraryError'));
        }

        console.log(await getMessage('creatingExcelLog'));
        const headers = await getMessage('companyExcelHeaders');
        const ws_data = [headers, ...companies.map(c => [
            c.name || '', c.domain || '', c.industry || '', c.employees || '',
            c.description || '', c.location || '', c.salesNavigatorLink || '', c.logoUrl || ''
        ])];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Companies");

        const wbout_base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const dataUri = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbout_base64;
        
        chrome.downloads.download({
            url: dataUri,
            filename: `${selectedFolder}_companies.xlsx`,
            saveAs: true
        });

        chrome.notifications.create('export-success', {
            type: 'basic', iconUrl: 'icon48.png', 
            title: await getMessage('exportCompleteTitle'),
            message: await getMessage('exportCompleteMessage', { folderName: selectedFolder }), 
            priority: 2
        });

    } catch (error) {
        console.error(messages.it.exportErrorLog, error);
        chrome.notifications.create('export-error', {
            type: 'basic', iconUrl: 'icon48.png', 
            title: await getMessage('exportErrorTitle'),
            message: await getMessage('exportErrorMessage', { errorMessage: error.message }), 
            priority: 2
        });
    }
}

/**
 * Funzione principale che orchestra l'elaborazione e il download.
 */
async function processAndDownload({ contacts, findDomains, splitNames, apiKey, selectedFolder, model }) {
    // Crea un alarm per mantenere attivo il service worker durante l'elaborazione
    chrome.alarms.create('keepAlive', { delayInMinutes: 0.1, periodInMinutes: 0.5 });
    
    await chrome.storage.local.set({ 
        exportStatus: 'processing',
        lastProcessingStart: Date.now()
    });
    
    console.log('BACKGROUND: Export status set to processing');
    console.log(await getMessage('startProcessingLog', { selectedFolder }));
    chrome.notifications.create('export-start', {
        type: 'basic', iconUrl: 'icon48.png', 
        title: await getMessage('exportStartedTitle'),
        message: await getMessage('exportStartedMessage', { folderName: selectedFolder }), 
        priority: 1
    });

    try {
        if (typeof XLSX === 'undefined') {
            throw new Error(await getMessage('exportLibraryError'));
        }

        let domainMap = {};
        let nameMap = {};
        let companyEnrichmentData = {};

        // Check if this contact folder is linked to a company folder
        const { companyFolderLinks, companyFolders } = await chrome.storage.local.get(['companyFolderLinks', 'companyFolders']);
        let linkedCompanyFolderName = null;
        let linkedCompanies = [];
        
        if (companyFolderLinks) {
            // Find if any company folder is linked to this contact folder
            for (const [companyFolder, contactFolder] of Object.entries(companyFolderLinks)) {
                if (contactFolder === selectedFolder) {
                    linkedCompanyFolderName = companyFolder;
                    linkedCompanies = companyFolders?.[companyFolder] || [];
                    console.log(`BACKGROUND: Found linked company folder: ${companyFolder} with ${linkedCompanies.length} companies`);
                    break;
                }
            }
        }

        // Create company lookup map for enrichment
        if (linkedCompanies.length > 0) {
            linkedCompanies.forEach(company => {
                const companyNames = [
                    company.name,
                    company.domain?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
                ].filter(Boolean);
                
                companyNames.forEach(name => {
                    if (name) {
                        companyEnrichmentData[name.toLowerCase()] = company;
                    }
                });
            });
            console.log(`BACKGROUND: Created company enrichment lookup for ${Object.keys(companyEnrichmentData).length} company variants`);
        }

        if ((findDomains || splitNames) && apiKey) {
            const apiPromises = [];
            const selectedModel = model || 'gemini-2.5-flash';
            console.log(`BACKGROUND: Using model: ${selectedModel}`);

            if (findDomains) {
                const uniqueLinkedInCompanies = [...new Set(contacts.map(c => c.filteredCompany).filter(Boolean))];
                
                if (uniqueLinkedInCompanies.length > 0) {
                    apiPromises.push(findCompanyDomains(uniqueLinkedInCompanies, apiKey, selectedModel).then(res => domainMap = res));
                } else {
                    console.log(await getMessage('noValidCompaniesForDomainSearch'));
                }
            }

            if (splitNames) {
                const fullNames = contacts.map(c => c.personName).filter(Boolean);
                if (fullNames.length > 0) {
                    apiPromises.push(splitContactNames(fullNames, apiKey, selectedModel).then(res => nameMap = res));
                }
            }

            if (apiPromises.length > 0) {
                console.log(`BACKGROUND: Starting ${apiPromises.length} API processing tasks with ${selectedModel}...`);
                
                // Usa Promise.allSettled invece di Promise.all per non bloccare su errori singoli
                const results = await Promise.allSettled(apiPromises);
                
                // Log dei risultati
                results.forEach((result, index) => {
                    const taskName = index === 0 ? 'domains' : 'names';
                    if (result.status === 'fulfilled') {
                        console.log(`BACKGROUND: ${taskName} task completed successfully`);
                    } else {
                        console.error(`BACKGROUND: ${taskName} task failed:`, result.reason);
                    }
                });
                
                console.log(await getMessage('apiCallCompletedLog'));
            }
        }

        const processedContacts = contacts.map(contact => {
            const enrichedContact = { ...contact };

            if (findDomains && contact.filteredCompany && domainMap[contact.filteredCompany]) {
                enrichedContact.companyDomain = domainMap[contact.filteredCompany];
            }

            if (splitNames && contact.personName && nameMap[contact.personName]) {
                const [firstName, lastName, title] = nameMap[contact.personName];
                enrichedContact.firstName = firstName;
                enrichedContact.lastName = lastName;
                enrichedContact.title = title;
            }

            // Enrich with company data if folders are linked
            if (Object.keys(companyEnrichmentData).length > 0) {
                const companyMatches = [];
                
                // Try to match by various company fields
                [
                    contact.companyName,
                    contact.filteredCompany,
                    contact.orbisName,
                    enrichedContact.companyDomain?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
                ].forEach(companyIdentifier => {
                    if (companyIdentifier) {
                        const matchingCompany = companyEnrichmentData[companyIdentifier.toLowerCase()];
                        if (matchingCompany && !companyMatches.find(c => c.name === matchingCompany.name)) {
                            companyMatches.push(matchingCompany);
                        }
                    }
                });

                // Use the first matching company for enrichment
                if (companyMatches.length > 0) {
                    const matchedCompany = companyMatches[0];
                    enrichedContact.companyIndustry = matchedCompany.industry;
                    enrichedContact.companySize = matchedCompany.size;
                    enrichedContact.companyDescription = matchedCompany.description;
                    enrichedContact.companyLocation = matchedCompany.location;
                    enrichedContact.companyWebsite = matchedCompany.website;
                    enrichedContact.companyFoundedYear = matchedCompany.foundedYear;
                    enrichedContact.companyType = matchedCompany.companyType;
                    enrichedContact.companyLogoUrl = matchedCompany.logoUrl;
                    console.log(`BACKGROUND: Enriched contact ${contact.personName} with company data from ${matchedCompany.name}`);
                }
            }

            return enrichedContact;
        });

        console.log(await getMessage('creatingExcelLog'));
        const headers = await getMessage('excelHeaders');
        
        // Extended headers if company data is available
        let extendedHeaders = [...headers];
        let hasCompanyEnrichment = Object.keys(companyEnrichmentData).length > 0;
        
        if (hasCompanyEnrichment) {
            extendedHeaders.push(...[
                'Company Industry', 'Company Size', 'Company Description', 
                'Company Location', 'Company Website', 'Company Founded Year', 'Company Type', 'Company Logo URL'
            ]);
        }
        
        const ws_data = [extendedHeaders, ...processedContacts.map(c => {
            const baseData = [
                c.personName || '', c.title || '', c.firstName || '', c.lastName || '',
                toAscii(c.firstName || ''), toAscii(c.lastName || ''),
                c.jobTitle || '', c.location || '', c.companyName || '',
                c.orbisName || '', c.filteredCompany || '', c.companyDomain || '',
                c.profileLink || '', c.pageUrl || '', c.numeroContattiPerAzienda || ''
            ];
            
            if (hasCompanyEnrichment) {
                baseData.push(...[
                    c.companyIndustry || '', c.companySize || '', c.companyDescription || '',
                    c.companyLocation || '', c.companyWebsite || '', c.companyFoundedYear || '', c.companyType || '', c.companyLogoUrl || ''
                ]);
            }
            
            return baseData;
        })];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");

        const wbout_base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const dataUri = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbout_base64;
        
        const filename = hasCompanyEnrichment ? 
            `${selectedFolder}_contacts_enriched_with_companies.xlsx` : 
            `${selectedFolder}_contacts_enriched.xlsx`;
        
        chrome.downloads.download({
            url: dataUri,
            filename: filename,
            saveAs: true
        });

        chrome.notifications.create('export-success', {
            type: 'basic', iconUrl: 'icon48.png', 
            title: await getMessage('exportCompleteTitle'),
            message: await getMessage('exportCompleteMessage', { folderName: selectedFolder }), 
            priority: 2
        });

    } catch (error) {
        console.error(messages.it.exportErrorLog, error); // Internal log
        chrome.notifications.create('export-error', {
            type: 'basic', iconUrl: 'icon48.png', 
            title: await getMessage('exportErrorTitle'),
            message: await getMessage('exportErrorMessage', { errorMessage: error.message }), 
            priority: 2
        });
    } finally {
        // Rimuove l'alarm al termine dell'elaborazione
        chrome.alarms.clear('keepAlive');
        await chrome.storage.local.set({ 
            exportStatus: 'idle',
            lastProcessingStart: null
        });
        console.log('BACKGROUND: Export status set to idle');
        console.log(messages.it.processFinishedLog);
    }
}

// Listener per gli alarms con auto-recovery per processi bloccati
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'keepAlive') {
        // Auto-recovery: controlla se il processo è bloccato da troppo tempo
        const { exportStatus, lastProcessingStart } = await chrome.storage.local.get(['exportStatus', 'lastProcessingStart']);
        
        if (exportStatus === 'processing' && lastProcessingStart) {
            const timeStuck = Date.now() - lastProcessingStart;
            const MAX_PROCESSING_TIME = 10 * 60 * 1000; // 10 minuti
            
            if (timeStuck > MAX_PROCESSING_TIME) {
                console.log('BACKGROUND: Process stuck for', Math.round(timeStuck/1000), 'seconds - auto-resetting to idle');
                await chrome.storage.local.set({ 
                    exportStatus: 'idle',
                    lastProcessingStart: null
                });
                chrome.alarms.clear('keepAlive');
                
                // Notifica l'utente del reset
                chrome.notifications.create('auto-reset', {
                    type: 'basic',
                    iconUrl: 'icon48.png',
                    title: 'Processo Auto-Reset',
                    message: 'Il processo è stato resettato automaticamente dopo 10 minuti di inattività.',
                    priority: 1
                });
            }
        }
    }
});


// Listener principale per i messaggi dal popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'processContactsForExport') {
        processAndDownload(message.payload);
        return true; // Indica che il processo è asincrono
    }
    
    if (message.action === 'exportCompanies') {
        exportCompanies(message.payload);
        return true; // Indica che il processo è asincrono
    }
    
    if (message.action === 'callAIForCompany') {
        // Handle AI calls for individual companies
        const { prompt, model } = message.payload;
        
        (async () => {
            try {
                const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
                if (!geminiApiKey) {
                    sendResponse({ success: false, error: 'No API key found' });
                    return;
                }
                
                const result = await callApi(prompt, geminiApiKey, model || 'gemini-2.5-flash');
                sendResponse({ success: true, data: result });
            } catch (error) {
                console.error('BACKGROUND: AI call failed:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        
        return true; // Indica che la risposta è asincrona
    }
    
    if (message.action === 'log') {
        // Handle logging from content scripts
        persistentLogger.log(message.level || 'info', message.message, message.source || 'content');
        sendResponse({ success: true });
        return true;
    }
    
    if (message.action === 'exportLogs') {
        persistentLogger.exportLogs().then(logText => {
            // Crea data URI direttamente (funziona in service worker)
            const base64Data = btoa(unescape(encodeURIComponent(logText)));
            const dataUri = `data:text/plain;charset=utf-8;base64,${base64Data}`;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            chrome.downloads.download({
                url: dataUri,
                filename: `scrapy-logs-${timestamp}.txt`,
                saveAs: true
            });
            
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Indica che la risposta è asincrona
    }
    
    if (message.action === 'clearLogs') {
        persistentLogger.clearLogs().then(success => {
            sendResponse({ success });
        });
        return true; // Indica che la risposta è asincrona
    }
});