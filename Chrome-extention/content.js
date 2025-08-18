
/**
 * ===============================================================================
 * LinkedIn Lead Extension - Content Script
 * ===============================================================================
 * 
 * This content script runs on LinkedIn pages and provides:
 * 
 * Core Functionality:
 * - Real-time contact data extraction from LinkedIn profiles and search pages
 * - Dynamic UI injection for extension controls
 * - Company data extraction from LinkedIn company pages
 * - Interactive contact management with visual feedback
 * - Automated batch processing of contact lists
 * 
 * Data Extraction Features:
 * - Profile information (name, title, company, location)
 * - Profile images and LinkedIn URLs
 * - Company details and industry information
 * - Contact relationship data
 * - Search result pagination handling
 * 
 * User Interface:
 * - Floating action buttons for quick extraction
 * - Progress indicators for batch operations
 * - Success/error notifications with localization
 * - Badge system for processed contacts
 * - Responsive design for different LinkedIn layouts
 * 
 * Integration with AI:
 * - Passes extracted data to background worker for AI processing
 * - Supports real-time enrichment with company analysis
 * - Handles AI-powered contact deduplication
 * - Manages rate limiting for API calls
 * 
 * Error Handling:
 * - Graceful degradation when extension context is lost
 * - Automatic retry mechanisms for failed operations
 * - Comprehensive logging for debugging
 * - User-friendly error messages with recovery suggestions
 * 
 * @author LinkedIn Lead Extension Team
 * @version 5.2
 * @license MIT
 * ===============================================================================
 */

const messages = {
  en: {
    contentInit: "Contacts Miner: Initializing content script...",
    errorExtracting: "Error while extracting contact data:",
    notificationRemoved: "\"{contactName}\" has been removed",
    notificationAdded: "Added: {contactName}",
    selectFolderBeforeSave: "Select a folder before saving contacts",
    scanInProgress: "Scanning and extracting in progress...",
    newContactsAdded: "{count} new contacts added successfully!",
    noNewContacts: "No new contacts to add found on the page.",
    extractionOptions: "Extraction Options",
    orbisNamePlaceholder: "Enter Orbis Name",
    saveOrbisBtn: "Save",
    extractAllBtn: "Extract All",
    showBadgesBtn: "Badges",
    orbisNameSaved: "Orbis name saved!",
    scanAndBadgeUpdate: "Scanning and updating badges...",
    badgesUpdated: "Badges updated!",
    contactsSavedForOrbis: "<strong>{count}</strong> contacts saved for <strong>{orbisName}</strong>",
    badgeAdded: "Added",
  },
  it: {
    contentInit: "Contacts Miner: Inizializzazione del content script...",
    errorExtracting: "Errore durante l'estrazione dei dati del contatto:",
    notificationRemoved: "Il contatto \"{contactName}\" è stato rimosso",
    notificationAdded: "Contatto aggiunto: {contactName}",
    selectFolderBeforeSave: "Seleziona una cartella prima di salvare i contatti",
    scanInProgress: "Scansione e estrazione in corso...",
    newContactsAdded: "{count} nuovi contatti aggiunti con successo!",
    noNewContacts: "Nessun nuovo contatto da aggiungere trovato sulla pagina.",
    extractionOptions: "Opzioni di Estrazione",
    orbisNamePlaceholder: "Inserisci Nome Orbis",
    saveOrbisBtn: "Salva",
    extractAllBtn: "Estrai Tutti",
    showBadgesBtn: "Badge",
    orbisNameSaved: "Nome Orbis salvato!",
    scanAndBadgeUpdate: "Scansione e aggiornamento badge...",
    badgesUpdated: "Badge aggiornati!",
    contactsSavedForOrbis: "<strong>{count}</strong> contatti salvati per <strong>{orbisName}</strong>",
    badgeAdded: "Aggiunto",
  }
};


/**
 * Wrapper per operazioni Chrome API con gestione errori
 */
// Global flag to prevent spam notifications
let extensionErrorNotified = false;

async function safeExtensionCall(fn, fallback = null) {
    // Verifica che chrome e chrome.storage esistano
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome extension API not available');
        if (!extensionErrorNotified) {
            extensionErrorNotified = true;
            showNotification('Estensione disconnessa. Ricarica la pagina.', 'error');
            setTimeout(() => { extensionErrorNotified = false; }, 30000);
        }
        return null;
    }

    try {
        return await fn();
    } catch (error) {
        if (error.message.includes('Extension context invalidated') || error.message.includes('Cannot read properties of undefined')) {
            console.warn('Extension context invalidated - attempting to recover');
            // Prova a ricaricare la pagina per ricollegare il content script
            if (fallback) {
                try {
                    return await fallback();
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    // Solo mostra notifica una volta ogni 30 secondi
                    if (!extensionErrorNotified) {
                        extensionErrorNotified = true;
                        showNotification('Estensione disconnessa. Ricarica la pagina.', 'error');
                        setTimeout(() => { extensionErrorNotified = false; }, 30000);
                    }
                    return null;
                }
            } else {
                // Solo mostra notifica una volta ogni 30 secondi
                if (!extensionErrorNotified) {
                    extensionErrorNotified = true;
                    showNotification('Estensione disconnessa. Ricarica la pagina.', 'error');
                    setTimeout(() => { extensionErrorNotified = false; }, 30000);
                }
                return null;
            }
        } else {
            console.error('Extension API call failed:', error);
            throw error;
        }
    }
}

/**
 * Safe chrome.storage.local.get wrapper
 */
async function safeStorageGet(keys, defaultValues = {}) {
    return await safeExtensionCall(
        () => chrome.storage.local.get(keys),
        async () => {
            // Fallback: riprova una volta dopo 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                return await chrome.storage.local.get(keys);
            } catch {
                console.log('Storage fallback also failed, using defaults');
                return defaultValues;
            }
        }
    );
}

/**
 * Safe chrome.storage.local.set wrapper
 */
async function safeStorageSet(data) {
    const result = await safeExtensionCall(
        async () => {
            await chrome.storage.local.set(data);
            return true; // Salvataggio riuscito
        },
        async () => {
            // Fallback: riprova una volta dopo 500ms
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                await chrome.storage.local.set(data);
                console.log('Storage save succeeded on retry');
                return true;
            } catch {
                console.log('Could not save to storage, extension disconnected');
                return false; // Salvataggio fallito per estensione disconnessa
            }
        }
    );
    return result !== null ? result : true; // Se non è null, usa il risultato, altrimenti considera successo
}

/**
 * Log function that sends logs to background script for persistent storage
 */
async function logToExtension(level, message, source = 'content') {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            await chrome.runtime.sendMessage({
                action: 'log',
                level,
                message,
                source
            });
        }
        // Also log to console for immediate debugging
        console.log(`[${source.toUpperCase()}] ${message}`);
    } catch (error) {
        // Fallback to console only if extension context is invalid
        console.log(`[${source.toUpperCase()}] ${message}`);
    }
}

// This script runs in the content page, so we need a way to get the language.
// We'll read it from storage with safe wrapper.
async function getMessage(key, substitutions = {}) {
    const storage = await safeStorageGet({ language: 'it' });
    const language = storage ? storage.language : 'it';
    const langMessages = messages[language] || messages.it;
    let message = langMessages[key] || messages.it[key];

    if (message) {
        for (const [subKey, subValue] of Object.entries(substitutions)) {
            message = message.replace(new RegExp(`{${subKey}}`, 'g'), subValue);
        }
    }
    return message || key;
}



/**
 * Funzione di avvio del content script.
 * Ora esegue direttamente l'inizializzazione dell'observer per l'UI.
 */
(function initialize() {
    // This log is for developers, so we can keep it in one language.
    console.log('Contacts Miner: Initializing content script...');
    initializeUIObserver();
})();

/**
 * Mostra una notifica temporanea (toaster).
 * @param {string} message - Il messaggio da visualizzare.
 * @param {'success'|'error'} type - Il tipo di notifica, per il colore di sfondo.
 * @param {boolean} centerTop - Se true, mostra al centro-alto, altrimenti in basso-destra.
 */
function showNotification(message, type = 'error', centerTop = false) {
    const notification = document.createElement('div');
    notification.innerText = message;
    
    const baseStyle = {
        position: 'fixed',
        backgroundColor: type === 'success' ? '#28a745' : '#d9534f',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: '999999',
        transition: 'all 0.3s ease-in-out',
        opacity: '1',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        textAlign: 'center',
    };

    if (centerTop) {
        // Notifiche di estrazione al centro-alto
        Object.assign(notification.style, {
            ...baseStyle,
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            border: type === 'success' ? '2px solid #1e7e34' : '2px solid #c82333',
        });
    } else {
        // Notifiche normali in basso-destra
        Object.assign(notification.style, {
            ...baseStyle,
            bottom: '20px',
            right: '20px',
            transform: 'none',
        });
    }
    
    document.body.appendChild(notification);

    if (centerTop) {
        // Animazione per notifiche centro-alto
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    } else {
        // Animazione standard per notifiche basso-destra
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

/**
 * Funzione per lo scorrimento automatico di un container o della finestra.
 * @param {string|null} containerSelector - Selettore CSS del container. Se null, scorre la finestra.
 * @returns {Promise<void>}
 */
function autoScroll(containerSelector = null) {
    return new Promise(resolve => {
        try {
            const element = containerSelector ? document.querySelector(containerSelector) : window;
            const scroller = containerSelector ? element : document.documentElement;
            
            // Verifica che gli elementi esistano
            if (containerSelector && !element) {
                console.warn(`autoScroll: Container ${containerSelector} not found`);
                resolve();
                return;
            }
            
            let scrollAttempts = 0;
            const maxScrollAttempts = 100; // Limite di sicurezza

            const interval = setInterval(() => {
                try {
                    scrollAttempts++;
                    
                    const isAtBottom = containerSelector && element
                        ? element.scrollTop + element.clientHeight >= element.scrollHeight - 10
                        : window.innerHeight + window.scrollY >= document.body.scrollHeight - 10;

                    if (isAtBottom || scrollAttempts >= maxScrollAttempts) {
                        clearInterval(interval);
                        resolve();
                    } else {
                        if (containerSelector && element) {
                            element.scrollBy(0, 250);
                        } else {
                            window.scrollBy(0, 250);
                        }
                    }
                } catch (error) {
                    console.error('Error during scroll:', error);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        } catch (error) {
            console.error('Error initializing autoScroll:', error);
            resolve();
        }
    });
}

/**
 * --- VERSIONE FUNZIONANTE RIPRISTINATA ---
 * Estrae i nomi da TUTTI i filtri "Azienda attuale" attivi.
 * @returns {string|null} - Una stringa con i nomi delle aziende separati da virgola, o null.
 */
function extractFilteredCompanyNames() {
    const companyNames = [];
    const companyFilterContainer = document.querySelector('fieldset[data-x-search-filter="CURRENT_COMPANY"]');

    if (companyFilterContainer) {
        const pillElements = companyFilterContainer.querySelectorAll('.artdeco-pill--green');
        pillElements.forEach(pill => {
            const nameElement = pill.querySelector('span.nowrap-ellipsis');
            if (nameElement) {
                companyNames.push(nameElement.innerText.trim());
            }
        });
    }
    
    return companyNames.length > 0 ? companyNames.join(', ') : null;
}


/**
 * Funzione centralizzata per estrarre i dati di un contatto da un elemento <li>.
 * @param {HTMLElement} liElement - L'elemento <li> del contatto.
 * @returns {object|null}
 */
function extractContactData(liElement) {
    try {
        const personName = liElement.querySelector("span[data-anonymize='person-name']")?.innerText.trim() || "N/A";
        const jobTitle = liElement.querySelector("span[data-anonymize='title']")?.innerText.trim() || "N/A";
        
        let companyName = "N/A";
        const companyElement = liElement.querySelector("a[data-anonymize='company-name']") || liElement.querySelector("div.artdeco-entity-lockup__subtitle");
        if (companyElement) {
            const rawText = companyElement.innerText.trim();
            companyName = jobTitle !== "N/A" && rawText.startsWith(jobTitle) ? rawText.replace(jobTitle, "").trim() : rawText;
        }

        let profileLink = liElement.querySelector("a[data-control-name='view_lead_panel_via_search_lead_name']")?.href || "N/A";
        if (profileLink.includes(',')) {
            profileLink = profileLink.split(',')[0];
        }

        const location = liElement.querySelector("span[data-anonymize='location']")?.innerText.trim() || "N/A";
        const profileImage = liElement.querySelector("img[data-anonymize='headshot-photo']")?.src || "";

        const resultsElement = document.querySelector('.t-14.flex.align-items-center.mlA.pl3 > span');
        const numeroContattiPerAzienda = resultsElement ? resultsElement.innerText.trim().replace(/\s*(risultati|results)$/i, '').trim() : "N/A";
        
        const filteredCompanies = extractFilteredCompanyNames();

        return {
            personName, jobTitle, companyName, location, profileLink, profileImage,
            pageUrl: window.location.href,
            numeroContattiPerAzienda,
            filteredCompany: filteredCompanies,
        };
    } catch (error) {
        console.error("Error while extracting contact data:", error);
        return null;
    }
}

/**
 * Invia i dati estratti al background per salvarli nella cartella selezionata.
 * @param {object} contactData - Dati del contatto.
 */
async function sendExtractedDataToFolder(contactData) {
    const storage = await safeStorageGet(['folders', 'selectedFolder', 'currentOrbisName']);
    if (!storage) {
        showNotification('Estensione disconnessa. Ricarica la pagina per continuare.', 'error');
        return;
    }
    
    const { folders, selectedFolder, currentOrbisName } = storage;

    if (!selectedFolder || selectedFolder.trim() === '') {
        showNotification(await getMessage('selectFolderBeforeSave'), 'error');
        return;
    }
    
    const allFolders = folders || {};
    const contactsInFolder = allFolders[selectedFolder] || [];
    
    if (currentOrbisName) contactData.orbisName = currentOrbisName;

    const existingContactIndex = contactsInFolder.findIndex(c => c.profileLink === contactData.profileLink);

    if (existingContactIndex > -1) {
        contactsInFolder.splice(existingContactIndex, 1);
        showNotification(await getMessage('notificationRemoved', { contactName: contactData.personName }), 'error');
    } else {
        contactsInFolder.push(contactData);
        showNotification(await getMessage('notificationAdded', { contactName: contactData.personName }), 'success');
    }
    
    allFolders[selectedFolder] = contactsInFolder;
    const saved = await safeStorageSet({ folders: allFolders });
    
    if (!saved) {
        showNotification('Impossibile salvare. Estensione disconnessa.', 'error');
    }
}

/**
 * Applica i badge "Aggiunto" ai contatti già salvati nella cartella corrente.
 */
async function loadAndApplyBadges() {
    const storage = await safeStorageGet(['folders', 'selectedFolder']);
    if (!storage) return;
    
    const { folders, selectedFolder } = storage;
    if (!selectedFolder || !folders?.[selectedFolder]) return;

    const savedProfileLinks = new Set(folders[selectedFolder].map(contact => contact.profileLink));
    const badgeText = await getMessage('badgeAdded');

    document.querySelectorAll('li.artdeco-list__item').forEach(liElement => {
        let profileLink = liElement.querySelector("a[data-control-name='view_lead_panel_via_search_lead_name']")?.href;
        if (!profileLink) return;

        if (profileLink.includes(',')) {
            profileLink = profileLink.split(',')[0];
        }

        const titleElement = liElement.querySelector(".artdeco-entity-lockup__title");
        if (!titleElement) return;

        let badge = titleElement.querySelector('.badge-saved-contact');
        
        if (savedProfileLinks.has(profileLink)) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-saved-contact';
                badge.innerText = badgeText;
                Object.assign(badge.style, {
                    backgroundColor: '#28a745', color: '#fff', fontSize: '12px',
                    padding: '2px 6px', borderRadius: '4px', marginLeft: '5px'
                });
                titleElement.appendChild(badge);
            }
        } else {
            badge?.remove();
        }
    });
}

/**
 * Estrae tutti i contatti visibili e non ancora salvati.
 */
async function extractAllVisibleContacts() {
    const storage = await safeStorageGet(['folders', 'selectedFolder', 'currentOrbisName']);
    if (!storage) {
        showNotification('Estensione non disponibile. Riprova tra qualche secondo.', 'error');
        return;
    }
    const { folders, selectedFolder, currentOrbisName } = storage;
    
    if (!selectedFolder || selectedFolder.trim() === '') {
        showNotification(await getMessage('selectFolderBeforeSave'), 'error');
        return;
    }

    showNotification(await getMessage('scanInProgress'), 'success', true);
    await autoScroll('#search-results-container');

    const allFolders = folders || {};
    const contactsInFolder = allFolders[selectedFolder] || [];
    const savedProfileLinks = new Set(contactsInFolder.map(c => c.profileLink));
    const newContacts = [];

    document.querySelectorAll('li.artdeco-list__item').forEach(liElement => {
        const contactData = extractContactData(liElement);
        if (contactData && !savedProfileLinks.has(contactData.profileLink)) {
            if (currentOrbisName) contactData.orbisName = currentOrbisName;
            newContacts.push(contactData);
        }
    });

    if (newContacts.length > 0) {
        allFolders[selectedFolder] = [...contactsInFolder, ...newContacts];
        const saved = await safeStorageSet({ folders: allFolders });
        if (saved) {
            showNotification(await getMessage('newContactsAdded', { count: newContacts.length }), 'success', true);
        } else {
            showNotification('Alcuni contatti potrebbero non essere stati salvati.', 'error');
        }
    } else {
        showNotification(await getMessage('noNewContacts'), 'error', true);
    }
}

/**
 * Inizializza l'interfaccia utente dell'estensione sulla pagina di LinkedIn.
 */
async function initializeUI() {
    const referenceElement = document.querySelector('.flex-1._column_c69tab > fieldset:first-child');
    if (!referenceElement || document.querySelector('.sezione-nome-orbis')) return;

    const style = document.createElement('style');
    style.textContent = `
        .switch { position: relative; display: inline-block; width: 50px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #28a745; }
        input:checked + .slider:before { transform: translateX(26px); }
    `;
    document.head.appendChild(style);

    const newSection = document.createElement('fieldset');
    newSection.className = 'sezione-nome-orbis pv3 _container_bguac2 _container-divider_bguac2 _column_c69tab';
    
    // Fetch translated strings for the UI
    const extractionOptions = await getMessage('extractionOptions');
    const orbisPlaceholder = await getMessage('orbisNamePlaceholder');
    const saveOrbisText = await getMessage('saveOrbisBtn');
    const extractAllText = await getMessage('extractAllBtn');
    const showBadgesText = await getMessage('showBadgesBtn');

    newSection.innerHTML = `
        <div class="ph4 flex align-items-center relative" style="margin-bottom: 10px; padding-left: 8px; padding-right: 24px;">
            <legend class="t-14 pr2 overflow-hidden t-black flex align-items-center" style="font-size: 15px; color: #0073b1;">${extractionOptions}</legend>
        </div>
        <div class="ph4" style="padding-left: 8px; padding-right: 24px;">
            <input id="orbis-name-input" type="text" placeholder="${orbisPlaceholder}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 15px;">
            <div style="display: flex; gap: 8px;">
                <button id="save-orbis-btn" style="padding: 8px 10px; background-color: #0073b1; color: #fff; border: none; border-radius: 4px; cursor: pointer; flex-grow: 1; font-size: 13px; white-space: nowrap;">${saveOrbisText}</button>
                <button id="extract-all-btn" style="padding: 8px 10px; background-color: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; flex-grow: 1; font-size: 13px; white-space: nowrap;">${extractAllText}</button>
                <button id="show-badges-btn" style="padding: 8px 10px; background-color: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; flex-grow: 1; font-size: 13px; white-space: nowrap;">${showBadgesText}</button>
            </div>
            <div id="orbis-contact-count" style="margin-top: 10px; text-align: center; font-size: 13px;"></div>
        </div>`;
    
    referenceElement.insertAdjacentElement('beforebegin', newSection);
    
    const orbisInput = document.getElementById('orbis-name-input');
    const saveOrbisBtn = document.getElementById('save-orbis-btn');
    const extractAllBtn = document.getElementById('extract-all-btn');
    const showBadgesBtn = document.getElementById('show-badges-btn');

    // Carica il nome Orbis salvato in modo sicuro
    safeStorageGet(['currentOrbisName']).then((result) => {
        if (result && result.currentOrbisName) {
            orbisInput.value = result.currentOrbisName;
            orbisInput.style.backgroundColor = '#eaffea';
        }
    }).catch(() => {
        console.log('Could not load Orbis name on initialization');
    });

    saveOrbisBtn.addEventListener('click', async () => {
        const orbisName = orbisInput.value.trim();
        const saved = await safeStorageSet({ currentOrbisName: orbisName });
        if (saved) {
            orbisInput.style.backgroundColor = orbisName ? '#eaffea' : '#ffffff';
            showNotification(await getMessage('orbisNameSaved'), 'success');
        } else {
            showNotification('Impossibile salvare il nome Orbis. Riprova.', 'error');
        }
    });

    extractAllBtn.addEventListener('click', extractAllVisibleContacts);
    showBadgesBtn.addEventListener('click', async () => {
        showNotification(await getMessage('scanAndBadgeUpdate'), 'success', true);
        await autoScroll('#search-results-container');
        await loadAndApplyBadges();
        showNotification(await getMessage('badgesUpdated'), 'success', true);
    });
    
    displayContactCountForOrbis();
    loadAndApplyBadges();
}

/**
 * Visualizza il numero di contatti salvati per l'Orbis corrente.
 */
async function displayContactCountForOrbis() {
    const storage = await safeStorageGet(['folders', 'selectedFolder', 'currentOrbisName']);
    const countElement = document.getElementById('orbis-contact-count');
    if (!countElement || !storage) return;
    
    const { folders, selectedFolder, currentOrbisName } = storage;

    if (!selectedFolder || selectedFolder.trim() === '' || !currentOrbisName || !folders?.[selectedFolder]) {
        countElement.innerHTML = '';
        return;
    }
    
    const orbisContactCount = folders[selectedFolder].filter(c => c.orbisName === currentOrbisName).length;
    countElement.innerHTML = await getMessage('contactsSavedForOrbis', { count: orbisContactCount, orbisName: currentOrbisName });
}

/**
 * Inizializza un MutationObserver per attendere il caricamento dell'UI di LinkedIn.
 */
function initializeUIObserver() {
    let isUiInitialized = false;
    const observer = new MutationObserver((mutations, obs) => {
        const referenceElement = document.querySelector('.flex-1._column_c69tab > fieldset:first-child');
        if (referenceElement && !isUiInitialized) {
            initializeUI();
            isUiInitialized = true;
            obs.disconnect(); // Ottimizzazione: smettiamo di osservare una volta inizializzata l'UI
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Listener per i click su tutta la pagina per salvare un singolo contatto.
document.addEventListener('click', (event) => {
    // Assicurati di non catturare click su bottoni o link dentro la card stessa
    if (event.target.closest('button, a')) {
        return;
    }

    const liElement = event.target.closest('li.artdeco-list__item');
    if (liElement?.querySelector("span[data-anonymize='person-name']")) {
        const contactData = extractContactData(liElement);
        if (contactData) {
            sendExtractedDataToFolder(contactData);
        }
    }
}, true);

// Listener per aggiornare dinamicamente l'UI quando i dati cambiano.
try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        try {
            if (namespace === 'local' && (changes.folders || changes.selectedFolder || changes.currentOrbisName || changes.language)) {
                if (document.querySelector('.sezione-nome-orbis')) {
                    loadAndApplyBadges();
                    displayContactCountForOrbis();
                    // If language changed, we might need to re-render the UI box
                    if (changes.language) {
                        const oldSection = document.querySelector('.sezione-nome-orbis');
                        if (oldSection) oldSection.remove();
                        initializeUI();
                    }
                }
            }
        } catch (error) {
            console.error('Storage listener error:', error);
            if (error.message.includes('Extension context invalidated')) {
                console.warn('Extension context invalidated in storage listener');
                // Non fare niente, l'estensione è stata ricaricata
            }
        }
    });
} catch (error) {
    console.error('Failed to set up storage listener:', error);
}

/* ========================================================================== */
/* ===  SalesCompanyExtractor + SYNC Google Sheets  ========================= */
/* ========================================================================== */

(function SalesCompanyExtractor() {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygJcxP-70rWQ4IJU0G5XCPH95cgvWZON5NAR_1aVlEZlO2kiC2O3DKRf3VkzjzqQ/exec';
    
    // Global cache to prevent duplicate API calls for the same company
    if (!window.sentCompaniesCache) {
        window.sentCompaniesCache = new Set();
    }

    function sendCompanyToSheet(data) {
        fetch(APPS_SCRIPT_URL, {
            method : 'POST',
            mode   : 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(data)
        }).then(() => {
            console.log('[GS SYNC] Dati inviati a Google Sheets con successo');
        }).catch(err => {
            console.error('[GS SYNC] Errore invio a Google Sheets:', err);
        });
    }

    async function sendCompanyToLocalStorage(companyData) {
        try {
            const storage = await safeStorageGet(['companyFolders', 'selectedCompanyFolder']);
            if (!storage) {
                console.warn('[LOCAL SYNC] Estensione disconnessa, impossibile salvare dati azienda');
                return;
            }
            
            const { companyFolders, selectedCompanyFolder } = storage;
            
            if (!selectedCompanyFolder || selectedCompanyFolder.trim() === '') {
                console.warn('[LOCAL SYNC] Nessuna cartella aziende selezionata, dati non salvati');
                return;
            }
            
            const allCompanyFolders = companyFolders || {};
            const companiesInFolder = allCompanyFolders[selectedCompanyFolder] || [];
            
            // Prepare company data object
            const companyRecord = {
                name: companyData.companyName || 'N/A',
                domain: companyData.domain || 'N/A',
                industry: companyData.industry || 'N/A',
                size: companyData.employees || 'N/A',
                location: companyData.location || 'N/A',
                description: companyData.description || 'N/A',
                foundedYear: companyData.foundedYear || 'N/A',
                companyType: companyData.companyType || 'N/A',
                logoUrl: companyData.logoUrl || 'N/A',
                linkedinLink: 'N/A', // Not available from company page directly
                revenue: 'N/A', // Not available from company page directly
                website: companyData.domain !== 'N/A' ? `https://${companyData.domain}` : '',
                extractedAt: new Date().toISOString(),
                source: 'LinkedIn Company Page'
            };
            
            // Check if company already exists (using only company name as unique identifier)
            const existingIndex = companiesInFolder.findIndex(c => 
                c.name.toLowerCase() === companyRecord.name.toLowerCase()
            );
            
            if (existingIndex !== -1) {
                // Merge with existing company - company page data takes priority over search data
                const existingCompany = companiesInFolder[existingIndex];
                const mergedCompany = { ...existingCompany };
                
                // Company page data is more complete, so update all non-empty fields
                Object.keys(companyRecord).forEach(key => {
                    if (companyRecord[key] !== 'N/A' && companyRecord[key] !== '') {
                        mergedCompany[key] = companyRecord[key];
                    }
                });
                
                // Always update source and extractedAt
                mergedCompany.extractedAt = companyRecord.extractedAt;
                if (!mergedCompany.source.includes('Company Page')) {
                    if (mergedCompany.source.includes('Company Search')) {
                        mergedCompany.source = 'LinkedIn Company Search, LinkedIn Company Page';
                    } else {
                        mergedCompany.source = 'LinkedIn Company Page';
                    }
                }
                
                companiesInFolder[existingIndex] = mergedCompany;
                console.log('[LOCAL SYNC] Merged company page data with existing:', mergedCompany.name);
                
                // Now that we have domain, send to API if domain is available
                if (mergedCompany.domain !== 'N/A' && mergedCompany.domain !== '') {
                    sendCompanyToSheetWithCache({
                        companyName: mergedCompany.name,
                        domain: mergedCompany.domain,
                        industry: mergedCompany.industry,
                        employees: mergedCompany.size,
                        location: mergedCompany.location,
                        description: mergedCompany.description,
                        foundedYear: mergedCompany.foundedYear,
                        companyType: mergedCompany.companyType,
                        logoUrl: mergedCompany.logoUrl
                    });
                }
            } else {
                // Add new company
                companiesInFolder.push(companyRecord);
                console.log('[LOCAL SYNC] Added new company from company page:', companyRecord.name);
                
                // Send to API if domain is available
                if (companyRecord.domain !== 'N/A' && companyRecord.domain !== '') {
                    sendCompanyToSheetWithCache({
                        companyName: companyRecord.name,
                        domain: companyRecord.domain,
                        industry: companyRecord.industry,
                        employees: companyRecord.size,
                        location: companyRecord.location,
                        description: companyRecord.description,
                        foundedYear: companyRecord.foundedYear,
                        companyType: companyRecord.companyType,
                        logoUrl: companyRecord.logoUrl
                    });
                }
            }
            
            allCompanyFolders[selectedCompanyFolder] = companiesInFolder;
            
            await safeStorageSet({ companyFolders: allCompanyFolders });
            console.log('[LOCAL SYNC] Dati azienda salvati con successo nella cartella:', selectedCompanyFolder);
            
        } catch (error) {
            console.error('[LOCAL SYNC] Errore nel salvare dati azienda:', error);
        }
    }

    function sendCompanyToSheetWithCache(data) {
        const companyKey = data.companyName.toLowerCase().trim();
        
        // Check if we already sent this company to the API
        if (window.sentCompaniesCache.has(companyKey)) {
            console.log('[GS SYNC] Company already sent to API, skipping:', data.companyName);
            return;
        }
        
        // Mark as sent before making the API call
        window.sentCompaniesCache.add(companyKey);
        
        // Use the original function
        sendCompanyToSheet(data);
    }

    const SALES_COMPANY_REGEX = /^https:\/\/www\.linkedin\.com\/sales\/company\/\d+/;
    if (!SALES_COMPANY_REGEX.test(location.href)) return;

    console.log('[SalesCompanyExtractor] Pagina company rilevata:', location.href);

    function extractCompanyData() {
        const sidebar = document.querySelector('nav._sidebar-container_1808vy');
        if (!sidebar) return null;

        const companyName = sidebar.querySelector('[data-anonymize="company-name"]')?.innerText.trim() || 'N/A';
        const industry    = sidebar.querySelector('[data-anonymize="industry"]')?.innerText.trim()     || 'N/A';
        const location    = sidebar.querySelector('[data-anonymize="location"]')?.innerText.trim()     || 'N/A';
        
        let employees = 'N/A';
        const sizeEl  = sidebar.querySelector('[data-anonymize="company-size"]');
        if (sizeEl) {
            const raw = sizeEl.textContent.trim();
            if (raw) employees = raw;
        }
        
        let domain   = 'N/A';
        const siteA  = sidebar.querySelector('a[data-control-name="visit_company_website"]');
        if (siteA && siteA.href) {
            try   { domain = new URL(siteA.href).hostname; }
            catch { domain = siteA.href; }
        }

        // Extract description from the About section
        let description = 'N/A';
        const descriptionEl = document.querySelector('[data-anonymize="company-blurb"]');
        if (descriptionEl) {
            description = descriptionEl.innerText.trim() || 'N/A';
        }

        // Extract founded year and company type from metadata
        let foundedYear = 'N/A';
        let companyType = 'N/A';
        
        const metadataItems = document.querySelectorAll('._metadata_mb60vc');
        metadataItems.forEach(item => {
            const label = item.querySelector('dt')?.innerText.trim().toLowerCase();
            const value = item.querySelector('dd')?.innerText.trim();
            
            if (label === 'founded' && value) {
                foundedYear = value;
            } else if (label === 'type' && value) {
                companyType = value;
            }
        });

        // Extract company logo URL
        let logoUrl = 'N/A';
        const logoImg = document.querySelector('img[data-anonymize="company-logo"]');
        if (logoImg && logoImg.src) {
            logoUrl = logoImg.src;
        }

        return { 
            companyName, 
            industry, 
            location, 
            employees, 
            domain, 
            description, 
            foundedYear, 
            companyType,
            logoUrl
        };
    }

    let attempts = 0;
    let hasExtracted = false;
    
    // MutationObserver per rilevamento istantaneo
    const observer = new MutationObserver(() => {
        if (hasExtracted) return;
        
        const data = extractCompanyData();
        if (data && data.employees !== 'N/A') {
            console.log('[SalesCompanyExtractor] Dati estratti via MutationObserver:', data);
            sendCompanyToLocalStorage(data); // Only save to local storage, API call happens inside
            hasExtracted = true;
            observer.disconnect();
        }
    });
    
    // Osserva cambiamenti nella sidebar
    const sidebar = document.querySelector('nav._sidebar-container_1808vy') || document.body;
    observer.observe(sidebar, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['data-anonymize'] 
    });
    
    // Fallback polling più aggressivo
    const POLL_MS = 200, MAX_ATTEMPTS = 75;
    const intervalId = setInterval(() => {
        if (hasExtracted) {
            clearInterval(intervalId);
            return;
        }
        
        attempts++;
        const data = extractCompanyData();

        if (data && data.employees !== 'N/A') {
            console.log('[SalesCompanyExtractor] Dati estratti via polling:', data);
            sendCompanyToLocalStorage(data); // Only save to local storage, API call happens inside
            hasExtracted = true;
            observer.disconnect();
            clearInterval(intervalId);
        } else if (attempts >= MAX_ATTEMPTS) {
            console.warn('[SalesCompanyExtractor] Timeout, dati parziali:', data);
            if (data) {
                sendCompanyToLocalStorage(data); // Only save to local storage, API call happens inside
            }
            hasExtracted = true;
            observer.disconnect();
            clearInterval(intervalId);
        }
    }, POLL_MS);
})();

/* ========================================================================== */
/* ===  CompanySearchExtractor + Advanced Extraction  ====================== */
/* ========================================================================== */

(function CompanySearchExtractor() {
    const COMPANY_SEARCH_REGEX = /^https:\/\/www\.linkedin\.com\/sales\/search\/company/;
    if (!COMPANY_SEARCH_REGEX.test(location.href)) return;

    logToExtension('info', `Company search page detected: ${location.href}`, 'CompanySearchExtractor');

    let isExtractionEnabled = false;
    let originalBodyStyles = null;
    let originalHtmlStyles = null;

    // Check if extraction is enabled
    async function checkExtractionEnabled() {
        const storage = await safeStorageGet({ enableCompanySearchExtraction: false });
        isExtractionEnabled = storage ? storage.enableCompanySearchExtraction : false;
        logToExtension('info', `DEBUG: Company extraction enabled: ${isExtractionEnabled}`, 'CompanySearchExtractor');
    }

    // Initialize and check settings
    checkExtractionEnabled();

    // Listen for settings changes
    try {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.enableCompanySearchExtraction) {
                isExtractionEnabled = changes.enableCompanySearchExtraction.newValue;
                logToExtension('info', `Extraction setting changed: ${isExtractionEnabled}`, 'CompanySearchExtractor');
            }
        });
    } catch (error) {
        console.error('[CompanySearchExtractor] Failed to set up storage listener:', error);
    }

    // Function to save current styles before modifications
    function saveOriginalStyles() {
        logToExtension('info', 'Saving original styles before zoom...', 'CompanySearchExtractor');
        
        // Save body styles
        originalBodyStyles = {
            transform: document.body.style.transform || '',
            transformOrigin: document.body.style.transformOrigin || '',
            overflow: document.body.style.overflow || '',
            zoom: document.body.style.zoom || ''
        };
        
        // Save html styles
        originalHtmlStyles = {
            transform: document.documentElement.style.transform || '',
            transformOrigin: document.documentElement.style.transformOrigin || '',
            zoom: document.documentElement.style.zoom || ''
        };
        
        logToExtension('info', 'Original styles saved successfully', 'CompanySearchExtractor');
    }

    // Function to apply maximum zoom out for content visibility
    function applyMaximumZoomOut() {
        logToExtension('info', 'Applying maximum zoom out for better content visibility...', 'CompanySearchExtractor');
        
        // Save original styles first
        saveOriginalStyles();
        
        // Apply aggressive zoom out using CSS transform (more reliable than zoom property)
        document.body.style.transform = 'scale(0.3)'; // Scale down to 30%
        document.body.style.transformOrigin = 'top left'; // Ensure scaling from top-left
        document.body.style.overflow = 'visible'; // Ensure content is not clipped
        
        // Also apply to html element for better compatibility
        document.documentElement.style.transform = 'scale(0.3)';
        document.documentElement.style.transformOrigin = 'top left';
        
        logToExtension('info', 'Maximum zoom out applied (30% scale)', 'CompanySearchExtractor');
    }

    // Function to restore original zoom level
    function restoreOriginalZoom() {
        logToExtension('info', 'Restoring original zoom level...', 'CompanySearchExtractor');
        
        try {
            if (originalBodyStyles) {
                // Restore body styles
                document.body.style.transform = originalBodyStyles.transform;
                document.body.style.transformOrigin = originalBodyStyles.transformOrigin;
                document.body.style.overflow = originalBodyStyles.overflow;
                document.body.style.zoom = originalBodyStyles.zoom;
                
                logToExtension('info', 'Body styles restored', 'CompanySearchExtractor');
            }
            
            if (originalHtmlStyles) {
                // Restore html element styles
                document.documentElement.style.transform = originalHtmlStyles.transform;
                document.documentElement.style.transformOrigin = originalHtmlStyles.transformOrigin;
                document.documentElement.style.zoom = originalHtmlStyles.zoom;
                
                logToExtension('info', 'HTML styles restored', 'CompanySearchExtractor');
            }
            
            // Fallback: Force reset if restoration seems to have failed
            setTimeout(() => {
                if (document.body.style.transform.includes('scale(0.3)')) {
                    logToExtension('warn', 'Zoom restoration failed, applying fallback reset...', 'CompanySearchExtractor');
                    document.body.style.transform = '';
                    document.body.style.transformOrigin = '';
                    document.documentElement.style.transform = '';
                    document.documentElement.style.transformOrigin = '';
                    logToExtension('info', 'Fallback zoom reset applied', 'CompanySearchExtractor');
                }
            }, 500);
            
            logToExtension('info', 'Original zoom level restored successfully', 'CompanySearchExtractor');
        } catch (error) {
            logToExtension('error', `Error restoring zoom: ${error.message}`, 'CompanySearchExtractor');
            
            // Emergency fallback
            document.body.style.transform = '';
            document.body.style.transformOrigin = '';
            document.body.style.overflow = '';
            document.body.style.zoom = '';
            document.documentElement.style.transform = '';
            document.documentElement.style.transformOrigin = '';
            document.documentElement.style.zoom = '';
            
            logToExtension('info', 'Emergency zoom reset applied', 'CompanySearchExtractor');
        }
    }

    // Function to force full text visibility in descriptions only (pure CSS approach)
    // Function to shrink text size temporarily to make all content visible for extraction
    function shrinkTextForExtraction() {
        logToExtension('info', 'Shrinking text size to make all descriptions visible for extraction...', 'CompanySearchExtractor');
        
        let modifiedCount = 0;
        
        // Add global CSS rules to shrink all text in descriptions
        let styleSheet = document.getElementById('company-search-extractor-styles');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'company-search-extractor-styles';
            document.head.appendChild(styleSheet);
        }
        
        // Global CSS rules to shrink font size dramatically
        styleSheet.textContent = `
            /* Shrink all text in company cards to minimum size */
            li.artdeco-list__item dd,
            li.artdeco-list__item dd *,
            li.artdeco-list__item div[data-truncated],
            li.artdeco-list__item div[data-truncated] *,
            li.artdeco-list__item .t-12,
            li.artdeco-list__item .t-14,
            li.artdeco-list__item .t-16,
            li.artdeco-list__item [class*="description"],
            li.artdeco-list__item [class*="description"] * {
                font-size: 2px !important;
                line-height: 3px !important;
            }
        `;
        
        // Also apply direct style modifications for extra safety
        const companyCards = document.querySelectorAll('li.artdeco-list__item, [data-x-search-result="ACCOUNT"]');
        
        companyCards.forEach(card => {
            // Target all text elements in description areas
            const textElements = card.querySelectorAll('dd, dd *, div[data-truncated], div[data-truncated] *, .t-12, .t-14, .t-16, [class*="description"], [class*="description"] *');
            
            textElements.forEach(element => {
                // Store original font size if not already stored
                if (!element.dataset.originalFontSize) {
                    const computedStyle = window.getComputedStyle(element);
                    element.dataset.originalFontSize = computedStyle.fontSize;
                    element.dataset.originalLineHeight = computedStyle.lineHeight;
                }
                
                // Apply minimum font size
                element.style.setProperty('font-size', '2px', 'important');
                element.style.setProperty('line-height', '3px', 'important');
                
                modifiedCount++;
            });
        });
        
        logToExtension('info', `Text size reduced on ${modifiedCount} elements for extraction`, 'CompanySearchExtractor');
    }

    // Function to restore original text sizes after extraction
    function restoreOriginalTextSizes() {
        logToExtension('info', 'Restoring original text sizes after extraction...', 'CompanySearchExtractor');
        
        let restoredCount = 0;
        
        // Remove the shrinking CSS
        const styleSheet = document.getElementById('company-search-extractor-styles');
        if (styleSheet) {
            styleSheet.remove();
        }
        
        // Restore original font sizes from stored data
        const companyCards = document.querySelectorAll('li.artdeco-list__item, [data-x-search-result="ACCOUNT"]');
        
        companyCards.forEach(card => {
            const textElements = card.querySelectorAll('[data-original-font-size]');
            
            textElements.forEach(element => {
                if (element.dataset.originalFontSize) {
                    element.style.setProperty('font-size', element.dataset.originalFontSize, 'important');
                    element.style.setProperty('line-height', element.dataset.originalLineHeight, 'important');
                    
                    // Clean up stored data
                    delete element.dataset.originalFontSize;
                    delete element.dataset.originalLineHeight;
                    
                    restoredCount++;
                }
            });
        });
        
        // Additional cleanup - remove any inline font-size styles we added
        const allTextElements = document.querySelectorAll('li.artdeco-list__item dd, li.artdeco-list__item dd *, li.artdeco-list__item div[data-truncated], li.artdeco-list__item div[data-truncated] *, li.artdeco-list__item .t-12, li.artdeco-list__item .t-14, li.artdeco-list__item .t-16');
        allTextElements.forEach(element => {
            if (element.style.fontSize === '2px') {
                element.style.removeProperty('font-size');
                element.style.removeProperty('line-height');
                restoredCount++;
            }
        });
        
        logToExtension('info', `Original text sizes restored on ${restoredCount} elements`, 'CompanySearchExtractor');
    }

    // Function to restore original description styles (if needed)
    function restoreDescriptionStyles() {
        logToExtension('info', 'Restoring original description styles...', 'CompanySearchExtractor');
        
        const modifiedElements = document.querySelectorAll('[data-original-styles]');
        let restoredCount = 0;
        
        modifiedElements.forEach(element => {
            try {
                const originalStyles = JSON.parse(element.dataset.originalStyles);
                Object.keys(originalStyles).forEach(property => {
                    if (originalStyles[property] === '') {
                        element.style.removeProperty(property.replace(/([A-Z])/g, '-$1').toLowerCase());
                    } else {
                        element.style[property] = originalStyles[property];
                    }
                });
                delete element.dataset.originalStyles;
                restoredCount++;
            } catch (error) {
                // If restoration fails, just remove the modifications
                element.style.maxHeight = '';
                element.style.height = '';
                element.style.overflow = '';
                element.style.textOverflow = '';
                element.style.whiteSpace = '';
                element.style.webkitLineClamp = '';
                element.style.webkitBoxOrient = '';
                delete element.dataset.originalStyles;
            }
        });
        
        logToExtension('info', `Restored styles for ${restoredCount} elements`, 'CompanySearchExtractor');
    }


    // Function to extract company data from a search result card
    function extractCompanyDataFromCard(card) {
        if (!card) {
            return null;
        }

        try {
            // Extract company name - basato sull'HTML reale fornito
            let companyNameEl = card.querySelector('a[data-anonymize="company-name"]');
            if (!companyNameEl) {
                // Fallback per diversi possibili selettori
                companyNameEl = card.querySelector('.artdeco-entity-lockup__title a') ||
                               card.querySelector('a[data-control-name="view_company_via_result_name"]') ||
                               card.querySelector('a[href*="/sales/company/"]');
            }
            const companyName = companyNameEl?.innerText.trim() || 'N/A';
            logToExtension('info', `Processing company: ${companyName} | Found element: ${!!companyNameEl}`, 'CompanySearchExtractor');
            
            // Debug logging per vedere la struttura HTML
            if (companyName === 'N/A') {
                const allLinks = card.querySelectorAll('a');
                logToExtension('info', `DEBUG: Found ${allLinks.length} links in card. First few hrefs: ${Array.from(allLinks).slice(0, 3).map(a => a.href).join(', ')}`, 'CompanySearchExtractor');
                const allDataAnonymize = card.querySelectorAll('[data-anonymize]');
                logToExtension('info', `DEBUG: Found ${allDataAnonymize.length} data-anonymize elements: ${Array.from(allDataAnonymize).map(el => el.getAttribute('data-anonymize')).join(', ')}`, 'CompanySearchExtractor');
            }

            // Extract LinkedIn Sales Navigator link - dall'HTML reale
            const linkedinLink = companyNameEl?.getAttribute('href') || 'N/A';
            let fullLinkedinLink = 'N/A';
            if (linkedinLink !== 'N/A' && linkedinLink.startsWith('/sales/company/')) {
                fullLinkedinLink = 'https://www.linkedin.com' + linkedinLink;
            }

            // Extract company logo URL - basato sull'HTML reale
            let logoImg = card.querySelector('img[data-anonymize="company-logo"]') ||
                         card.querySelector('a[data-anonymize="company-logo"] img') ||
                         card.querySelector('.artdeco-entity-lockup__image img') ||
                         card.querySelector('img[alt*="logo"]') ||
                         card.querySelector('img[loading="lazy"]');
            const logoUrl = logoImg?.src || 'N/A';
            logToExtension('info', `DEBUG Logo: Found logo element: ${!!logoImg}, URL: ${logoUrl}`, 'CompanySearchExtractor');

            // Extract industry/sector - dall'HTML reale
            let industryEl = card.querySelector('span[data-anonymize="industry"]') ||
                            card.querySelector('.artdeco-entity-lockup__subtitle span:first-child');
            const industry = industryEl?.innerText.trim() || 'N/A';
            logToExtension('info', `DEBUG Industry: Found industry element: ${!!industryEl}, Text: ${industry}`, 'CompanySearchExtractor');

            // Extract company size (employees) - dall'HTML reale
            let sizeEl = card.querySelector('a[data-anonymize="company-size"]') ||
                        card.querySelector('a[aria-label*="employees"]') ||
                        card.querySelector('a[href*="employees"]') ||
                        card.querySelector('.artdeco-entity-lockup__subtitle a');
            
            let employees = 'N/A';
            if (sizeEl) {
                const sizeText = sizeEl.innerText.trim();
                logToExtension('info', `DEBUG Employees: Found size element, raw text: "${sizeText}"`, 'CompanySearchExtractor');
                // Extract number from text like "36 employees"
                const employeesMatch = sizeText.match(/(\d+[\d,\s]*)\s*employees?/i);
                employees = employeesMatch ? employeesMatch[1].trim() + ' employees' : sizeText.replace(/\s*on LinkedIn$/i, '').trim() || 'N/A';
            } else {
                logToExtension('info', `DEBUG Employees: No size element found`, 'CompanySearchExtractor');
            }

            // Extract revenue - cercare in tutto il testo dell'elemento
            let revenue = 'N/A';
            const revenueEl = card.querySelector('span[data-anonymize="revenue"]');
            if (revenueEl) {
                const revenueText = revenueEl.innerText.trim();
                revenue = revenueText || 'N/A';
                logToExtension('info', `DEBUG Revenue: Found revenue element, text: "${revenueText}"`, 'CompanySearchExtractor');
            } else {
                // Look for revenue patterns in all text content
                const allText = card.innerText || card.textContent || '';
                const revenueMatch = allText.match(/\$[\d\w\s\-]+(?:\s*-\s*\$[\d\w\s]+)?\s*(?:in\s*)?revenue/i) ||
                                   allText.match(/\$[\d\w\s\-]+\s*-\s*\$[\d\w\s]+/);
                if (revenueMatch) {
                    revenue = revenueMatch[0].trim();
                    logToExtension('info', `DEBUG Revenue: Found revenue in text: "${revenue}"`, 'CompanySearchExtractor');
                } else {
                    logToExtension('info', `DEBUG Revenue: No revenue found. Text length: ${allText.length}`, 'CompanySearchExtractor');
                }
            }

            // BACKUP APPROACH: Se tutto è N/A, proviamo selettori più generici basati sull'HTML fornito
            if (companyName === 'N/A' || industry === 'N/A' || employees === 'N/A') {
                logToExtension('info', `DEBUG: Using backup approach for missing data`, 'CompanySearchExtractor');
                
                // Prova a cercare nell'HTML structure fornito
                const entityLockup = card.querySelector('.artdeco-entity-lockup');
                if (entityLockup) {
                    // Company name dal link principale
                    if (companyName === 'N/A') {
                        const nameLink = entityLockup.querySelector('.artdeco-entity-lockup__title a');
                        if (nameLink) {
                            const backupName = nameLink.innerText.trim();
                            logToExtension('info', `DEBUG: Backup company name found: "${backupName}"`, 'CompanySearchExtractor');
                        }
                    }
                    
                    // Industry dal subtitle
                    if (industry === 'N/A') {
                        const subtitleSpans = entityLockup.querySelectorAll('.artdeco-entity-lockup__subtitle span');
                        if (subtitleSpans.length > 0) {
                            const backupIndustry = subtitleSpans[0].innerText.trim();
                            logToExtension('info', `DEBUG: Backup industry found: "${backupIndustry}"`, 'CompanySearchExtractor');
                        }
                    }
                    
                    // Employees dal link con "employees"
                    if (employees === 'N/A') {
                        const employeeLinks = entityLockup.querySelectorAll('a');
                        for (const link of employeeLinks) {
                            const text = link.innerText || '';
                            if (text.includes('employees')) {
                                const backupEmployees = text.trim();
                                logToExtension('info', `DEBUG: Backup employees found: "${backupEmployees}"`, 'CompanySearchExtractor');
                                break;
                            }
                        }
                    }
                }
            }

            // Extract description from "About" section - ora con testo minimizzato
            let description = 'N/A';
            const aboutSection = card.querySelector('dd') || 
                                card.querySelector('[data-truncated]') ||
                                card.querySelector('.inline-flex.align-items-baseline dd');
            
            if (aboutSection) {
                // Get full text content after expansion and minimization
                let aboutText = aboutSection.innerText || aboutSection.textContent || '';
                
                // Clean up common patterns
                aboutText = aboutText
                    .replace(/…see more$/, '')
                    .replace(/…see less$/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                description = aboutText || 'N/A';
                
                // Se la descrizione è ancora troncata, prova a cercare in altri elementi
                if (description.length < 50 || description.includes('…')) {
                    const alternativeDesc = card.querySelector('.artdeco-entity-lockup__caption') ||
                                          card.querySelector('div[style*="webkit-line-clamp"]');
                    if (alternativeDesc) {
                        const altText = alternativeDesc.innerText || alternativeDesc.textContent || '';
                        if (altText.length > description.length) {
                            description = altText.replace(/…see more$/, '').replace(/…see less$/, '').trim();
                        }
                    }
                }
            }

            if (companyName === 'N/A') {
                logToExtension('warn', 'No valid company name found, skipping card', 'CompanySearchExtractor');
                return null;
            }

            const extractedData = { 
                companyName, 
                salesNavigatorLink: fullLinkedinLink, // Link Sales Navigator (diverso dal dominio)
                logoUrl,
                sector: industry, // Settore/industry
                employees, 
                revenue, // Fatturato
                description,
                // Fields to be filled later from company page
                domain: 'N/A',
                location: 'N/A',
                foundedYear: 'N/A',
                companyType: 'N/A'
            };
            
            logToExtension('info', `Successfully extracted data for: ${companyName} - Sector: ${industry}, Employees: ${employees}, Revenue: ${revenue}, Description length: ${description.length}`, 'CompanySearchExtractor');
            return extractedData;
        } catch (error) {
            logToExtension('error', `Error extracting company data: ${error.message}`, 'CompanySearchExtractor');
            return null;
        }
    }

    // Function to save company data to local storage
    async function saveCompanyToLocalStorage(companyData) {
        logToExtension('info', `Attempting to save company data: ${companyData.companyName}`, 'CompanySearchExtractor');
        
        try {
            const storage = await safeStorageGet(['companyFolders', 'selectedCompanyFolder']);
            
            if (!storage) {
                logToExtension('warn', 'Extension disconnected, cannot save company data', 'CompanySearchExtractor');
                return;
            }
            
            const { companyFolders, selectedCompanyFolder } = storage;
            
            if (!selectedCompanyFolder || selectedCompanyFolder.trim() === '') {
                logToExtension('warn', 'No company folder selected, data not saved', 'CompanySearchExtractor');
                return;
            }
            
            const allCompanyFolders = companyFolders || {};
            const companiesInFolder = allCompanyFolders[selectedCompanyFolder] || [];
            
            // Prepare company data object
            const companyRecord = {
                name: companyData.companyName || 'N/A',
                salesNavigatorLink: companyData.salesNavigatorLink || 'N/A', // Link Sales Navigator
                logoUrl: companyData.logoUrl || 'N/A', // Link del logo
                sector: companyData.sector || 'N/A', // Settore
                employees: companyData.employees || 'N/A', // Dipendenti
                revenue: companyData.revenue || 'N/A', // Fatturato
                description: companyData.description || 'N/A', // Descrizione completa
                // Fields to be filled later
                domain: 'N/A',
                location: 'N/A',
                foundedYear: 'N/A',
                companyType: 'N/A',
                website: '',
                extractedAt: new Date().toISOString(),
                source: 'LinkedIn Company Search'
            };
            
            // Check if company already exists (using company name as unique identifier)
            const existingIndex = companiesInFolder.findIndex(c => 
                c.name.toLowerCase() === companyRecord.name.toLowerCase()
            );
            
            if (existingIndex !== -1) {
                // Merge with existing company - preserve complete data over partial data
                const existingCompany = companiesInFolder[existingIndex];
                const mergedCompany = { ...existingCompany };
                
                // Only update fields that are empty or 'N/A' in existing record
                Object.keys(companyRecord).forEach(key => {
                    if (key !== 'extractedAt' && key !== 'source' && 
                        (existingCompany[key] === 'N/A' || !existingCompany[key] || existingCompany[key] === '') &&
                        companyRecord[key] !== 'N/A' && companyRecord[key] !== '') {
                        mergedCompany[key] = companyRecord[key];
                    }
                });
                
                // Always update extractedAt and source
                mergedCompany.extractedAt = companyRecord.extractedAt;
                if (!mergedCompany.source || mergedCompany.source === '') {
                    mergedCompany.source = companyRecord.source;
                } else if (!mergedCompany.source.includes('Company Search')) {
                    mergedCompany.source += ', LinkedIn Company Search';
                }
                
                companiesInFolder[existingIndex] = mergedCompany;
                logToExtension('info', `Merged with existing company: ${mergedCompany.name}`, 'CompanySearchExtractor');
            } else {
                // Add new company
                companiesInFolder.push(companyRecord);
                logToExtension('info', `Added new company: ${companyRecord.name}`, 'CompanySearchExtractor');
            }
            
            allCompanyFolders[selectedCompanyFolder] = companiesInFolder;
            
            await safeStorageSet({ companyFolders: allCompanyFolders });
            logToExtension('info', `Company data saved successfully to folder: ${selectedCompanyFolder}`, 'CompanySearchExtractor');
            
        } catch (error) {
            logToExtension('error', `Error saving company data: ${error.message}`, 'CompanySearchExtractor');
        }
    }

    // Function to wait for page content to fully load
    async function waitForPageLoad() {
        logToExtension('info', 'Waiting for page content to load...', 'CompanySearchExtractor');
        
        // Wait for initial page load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for any lazy-loaded content
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const loadingIndicators = document.querySelectorAll('[data-test="loading"], .artdeco-spinner, .loading');
            if (loadingIndicators.length === 0) {
                break;
            }
            
            logToExtension('info', `Found ${loadingIndicators.length} loading indicators, waiting...`, 'CompanySearchExtractor');
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        logToExtension('info', 'Page loading complete', 'CompanySearchExtractor');
    }




    // Main function to process company cards - SOLO la versione che funziona
    async function processCompanyCards() {
        logToExtension('info', `processCompanyCards called, isExtractionEnabled: ${isExtractionEnabled}`, 'CompanySearchExtractor');
        
        if (!isExtractionEnabled) {
            logToExtension('info', 'Extraction disabled, skipping', 'CompanySearchExtractor');
            return;
        }

        // Step 1: Wait for page to fully load
        await waitForPageLoad();

        // Step 2: SOLO espansione descrizioni + estrazione (SENZA scroll iniziale)
        await extractCompaniesWithoutScroll();
    }

    // Rimossa funzione slowAutoScrollForCompanies - non più necessaria

    // ESPANDI TUTTE LE DESCRIZIONI DELLE AZIENDE CON MINIMIZZAZIONE TESTO
    async function expandAllCompanyDescriptions() {
        logToExtension('info', 'EXPAND DESCRIPTIONS: Starting to expand all company descriptions...', 'CompanySearchExtractor');
        
        const allCompanyCards = document.querySelectorAll('li.artdeco-list__item');
        let expandedCount = 0;
        
        for (let i = 0; i < allCompanyCards.length; i++) {
            const card = allCompanyCards[i];
            
            // Prima rimpicciolisci il testo per vedere tutto
            const textElements = card.querySelectorAll('dd, dd *, div[data-truncated], div[data-truncated] *, .t-12, .t-14, .t-16');
            textElements.forEach(element => {
                if (!element.dataset.originalFontSize) {
                    element.dataset.originalFontSize = window.getComputedStyle(element).fontSize;
                }
                element.style.setProperty('font-size', '4px', 'important');
                element.style.setProperty('line-height', '5px', 'important');
            });
            
            // Cerca tutti i possibili pulsanti "see more" o "…see less"
            const seeMoreButtons = card.querySelectorAll('button.t-12.button--unstyled, button[type="button"]:not([aria-label])');
            
            for (const button of seeMoreButtons) {
                const buttonText = button.textContent.trim();
                if (buttonText.includes('see more') || buttonText.includes('…see more') || 
                    buttonText.includes('more') || buttonText.includes('…')) {
                    
                    logToExtension('info', `EXPAND DESCRIPTIONS: Expanding card ${i + 1}/${allCompanyCards.length} - found button: "${buttonText}"`, 'CompanySearchExtractor');
                    
                    // Scroll della card nella vista prima di cliccare
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Clicca per espandere
                    try {
                        button.click();
                        expandedCount++;
                        
                        // Attendi che l'espansione si completi
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        // Verifica se il testo è stato espanso controllando se il pulsante è cambiato
                        const updatedButton = card.querySelector('button.t-12.button--unstyled');
                        if (updatedButton && updatedButton.textContent.includes('see less')) {
                            logToExtension('info', `EXPAND DESCRIPTIONS: Successfully expanded description for card ${i + 1}`, 'CompanySearchExtractor');
                        }
                    } catch (error) {
                        logToExtension('warn', `EXPAND DESCRIPTIONS: Error clicking expand button for card ${i + 1}: ${error.message}`, 'CompanySearchExtractor');
                    }
                    
                    break; // Esci dal loop dei bottoni una volta trovato quello giusto
                }
            }
            
            // Attendi tra una card e l'altra per non sovraccaricare
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        logToExtension('info', `EXPAND DESCRIPTIONS: Expanded ${expandedCount} descriptions out of ${allCompanyCards.length} companies`, 'CompanySearchExtractor');
        
        // Attendi che tutte le espansioni siano completate
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Function to call AI for company classification
    async function callAIForCompany(companyData, aiSettings) {
        try {
            const { geminiApiKey } = await safeStorageGet(['geminiApiKey']);
            if (!geminiApiKey) {
                logToExtension('warn', 'No API key found for AI classification', 'CompanySearchExtractor');
                return null;
            }

            const aiResults = {};
            
            // Check if similarity analysis is enabled (which automatically includes B2B/B2C)
            if (aiSettings.enableSimilarCompanies && aiSettings.targetCompaniesText) {
                // Combined prompt for both B2B/B2C and Similarity
                const combinedPrompt = `Analyze this company for both B2B/B2C classification and similarity to target criteria.

Company Data:
Name: ${companyData.companyName || 'N/A'}
Industry: ${companyData.sector || 'N/A'}
Size: ${companyData.employees || 'N/A'}
Description: ${companyData.description || 'N/A'}

Target Companies Criteria:
${aiSettings.targetCompaniesText}

Analyze the company's business model and target customers, then compare it to the target criteria.

Respond ONLY with a JSON object:
{
  "classification": "B2B" | "B2C" | "Both",
  "confidence": 0.1-1.0,
  "similarity": 0-100,
  "reasoning": "brief explanation covering both classification and similarity"
}`;

                try {
                    const combinedResult = await chrome.runtime.sendMessage({
                        action: 'callAIForCompany',
                        payload: { prompt: combinedPrompt, model: aiSettings.companyAIModel }
                    });
                    
                    if (combinedResult && combinedResult.success) {
                        // Map combined result to separate structures
                        aiResults.b2bB2c = {
                            classification: combinedResult.data.classification,
                            confidence: combinedResult.data.confidence,
                            reasoning: combinedResult.data.reasoning
                        };
                        aiResults.similarity = {
                            similarity: combinedResult.data.similarity,
                            reasoning: combinedResult.data.reasoning
                        };
                        logToExtension('info', `Combined analysis for ${companyData.companyName}: ${combinedResult.data.classification}, ${combinedResult.data.similarity}%`, 'CompanySearchExtractor');
                    }
                } catch (error) {
                    logToExtension('error', `Combined analysis failed for ${companyData.companyName}: ${error.message}`, 'CompanySearchExtractor');
                }
            } 
            // B2B/B2C Classification only (when similarity is not enabled)
            else if (aiSettings.enableB2BB2CClassification) {
                const b2bB2cPrompt = `Analyze this company and classify it as B2B, B2C, or Both based on its business model and target customers.

Company Data:
Name: ${companyData.companyName || 'N/A'}
Industry: ${companyData.sector || 'N/A'}
Size: ${companyData.employees || 'N/A'}
Description: ${companyData.description || 'N/A'}

Respond ONLY with a JSON object:
{
  "classification": "B2B" | "B2C" | "Both",
  "confidence": 0.1-1.0,
  "reasoning": "brief explanation"
}`;

                try {
                    const b2bResult = await chrome.runtime.sendMessage({
                        action: 'callAIForCompany',
                        payload: { prompt: b2bB2cPrompt, model: aiSettings.companyAIModel }
                    });
                    
                    if (b2bResult && b2bResult.success) {
                        aiResults.b2bB2c = b2bResult.data;
                        logToExtension('info', `B2B/B2C classification for ${companyData.companyName}: ${b2bResult.data.classification}`, 'CompanySearchExtractor');
                    }
                } catch (error) {
                    logToExtension('error', `B2B/B2C classification failed for ${companyData.companyName}: ${error.message}`, 'CompanySearchExtractor');
                }
            }


            return aiResults;
        } catch (error) {
            logToExtension('error', `AI analysis failed for ${companyData.companyName}: ${error.message}`, 'CompanySearchExtractor');
            return null;
        }
    }

    // ESTRAZIONE AZIENDE - Solo espansione descrizioni + estrazione dati (senza scroll iniziale)
    async function extractCompaniesWithoutScroll() {
        const storage = await safeStorageGet([
            'companyFolders', 'selectedCompanyFolder', 'currentOrbisName',
            'companyAIModel', 'enableB2BB2CClassification', 'enableSimilarCompanies', 'targetCompaniesText'
        ]);
        if (!storage) {
            logToExtension('warn', 'Extension disconnected, cannot extract companies', 'CompanySearchExtractor');
            return 0;
        }
        const { companyFolders, selectedCompanyFolder, currentOrbisName, companyAIModel, enableB2BB2CClassification, enableSimilarCompanies, targetCompaniesText } = storage;
        
        if (!selectedCompanyFolder || selectedCompanyFolder.trim() === '') {
            logToExtension('warn', 'No company folder selected', 'CompanySearchExtractor');
            return 0;
        }

        // Check if AI analysis is needed
        const aiSettings = {
            companyAIModel: companyAIModel || 'gemini-2.5-flash',
            enableB2BB2CClassification: enableB2BB2CClassification || false,
            enableSimilarCompanies: enableSimilarCompanies || false,
            targetCompaniesText: targetCompaniesText || ''
        };
        
        const needsAI = aiSettings.enableB2BB2CClassification || 
                       (aiSettings.enableSimilarCompanies && aiSettings.targetCompaniesText.trim());

        logToExtension('info', `DEBUG AI SETTINGS: B2B/B2C=${aiSettings.enableB2BB2CClassification}, Similarity=${aiSettings.enableSimilarCompanies}, Target Text Length=${aiSettings.targetCompaniesText.length}, Needs AI=${needsAI}`, 'CompanySearchExtractor');

        logToExtension('info', 'COMPANY EXTRACTION: Starting expansion and extraction (NO initial scroll)...', 'CompanySearchExtractor');
        if (needsAI) {
            logToExtension('info', `AI analysis enabled: B2B/B2C=${aiSettings.enableB2BB2CClassification}, Similarity=${aiSettings.enableSimilarCompanies}, Model=${aiSettings.companyAIModel}`, 'CompanySearchExtractor');
        }
        
        // SOLO ESPANSIONE DESCRIZIONI (senza scroll iniziale)
        await expandAllCompanyDescriptions();

        const allCompanyFolders = companyFolders || {};
        const companiesInFolder = allCompanyFolders[selectedCompanyFolder] || [];
        const savedCompanyLinks = new Set(companiesInFolder.map(c => c.salesNavigatorLink || c.linkedinLink));
        const newCompanies = [];

        // ESTRAI TUTTI I DATI COMPLETI dopo espansione descrizioni - SOLO li.artdeco-list__item per evitare duplicati
        const allCompanyCards = document.querySelectorAll('li.artdeco-list__item');
        logToExtension('info', `COMPANY EXTRACTION: Processing ${allCompanyCards.length} companies...`, 'CompanySearchExtractor');
        
        // Step 1: Extract all company data quickly
        const extractedCompanies = [];
        for (let index = 0; index < allCompanyCards.length; index++) {
            const card = allCompanyCards[index];
            const companyData = extractCompanyDataFromCard(card);
            
            if (companyData && !savedCompanyLinks.has(companyData.salesNavigatorLink)) {
                const companyRecord = {
                    name: companyData.companyName || 'N/A',
                    salesNavigatorLink: companyData.salesNavigatorLink || 'N/A',
                    logoUrl: companyData.logoUrl || 'N/A',
                    industry: companyData.sector || 'N/A',
                    employees: companyData.employees || 'N/A',
                    revenue: companyData.revenue || 'N/A',
                    description: companyData.description || 'N/A',
                    linkedinLink: companyData.salesNavigatorLink || 'N/A',
                    domain: 'N/A',
                    location: 'N/A',
                    extractedAt: new Date().toISOString(),
                    source: 'LinkedIn Company Search'
                };
                
                if (currentOrbisName) companyRecord.orbisName = currentOrbisName;
                
                extractedCompanies.push({ 
                    companyRecord, 
                    companyData, 
                    card, 
                    index,
                    needsAI: needsAI 
                });
                newCompanies.push(companyRecord);
                
                // Extracted successfully
            } else if (companyData) {
                // Already saved - skip
            } else {
                // Failed to extract - skip
            }
        }

        // Ripristina i font size originali per tutte le cards
        allCompanyCards.forEach(card => {
            const textElements = card.querySelectorAll('[data-original-font-size]');
            textElements.forEach(element => {
                if (element.dataset.originalFontSize) {
                    element.style.setProperty('font-size', element.dataset.originalFontSize, 'important');
                    element.style.removeProperty('line-height');
                    delete element.dataset.originalFontSize;
                }
            });
            
            // Cleanup any remaining small fonts
            const smallTextElements = card.querySelectorAll('dd, dd *, div[data-truncated], div[data-truncated] *, .t-12, .t-14, .t-16');
            smallTextElements.forEach(element => {
                if (element.style.fontSize === '4px') {
                    element.style.removeProperty('font-size');
                    element.style.removeProperty('line-height');
                }
            });
        });

        // Step 2: Save extracted companies immediately to extension storage
        if (newCompanies.length > 0) {
            allCompanyFolders[selectedCompanyFolder] = [...companiesInFolder, ...newCompanies];
            const saved = await safeStorageSet({ companyFolders: allCompanyFolders });
            if (saved) {
                logToExtension('info', `COMPANY EXTRACTION: Saved ${newCompanies.length} new companies`, 'CompanySearchExtractor');
            }
        } else {
            logToExtension('info', `COMPANY EXTRACTION: No new companies found (all already saved)`, 'CompanySearchExtractor');
        }

        // Step 3: Restore original font sizes immediately (already done above)
        
        // Step 4: Scroll back to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Step 5: Add AI analysis placeholders if needed
        if (needsAI && extractedCompanies.length > 0) {
            logToExtension('info', `DEBUG: About to add placeholders for ${extractedCompanies.length} companies`, 'CompanySearchExtractor');
            addAIPlaceholdersToPage(extractedCompanies);
            logToExtension('info', `AI ANALYSIS: Added placeholders for ${extractedCompanies.length} companies`, 'CompanySearchExtractor');
        } else {
            logToExtension('info', `DEBUG: Skipping placeholders - needsAI: ${needsAI}, extractedCompanies: ${extractedCompanies.length}`, 'CompanySearchExtractor');
        }

        // Step 6: Process AI analysis progressively
        logToExtension('info', `DEBUG: Step 6 - needsAI: ${needsAI}, extractedCompanies.length: ${extractedCompanies.length}`, 'CompanySearchExtractor');
        if (needsAI && extractedCompanies.length > 0) {
            logToExtension('info', `DEBUG: Starting AI analysis for ${extractedCompanies.length} companies`, 'CompanySearchExtractor');
            processAIAnalysisProgressively(extractedCompanies, selectedCompanyFolder, allCompanyFolders, aiSettings);
        } else {
            logToExtension('info', `COMPANY EXTRACTION: Process complete - ${newCompanies.length} companies extracted (no AI analysis)`, 'CompanySearchExtractor');
        }
        
        return newCompanies.length;
    }

    // Function to add AI analysis placeholders to LinkedIn pages
    function addAIPlaceholdersToPage(extractedCompanies) {
        extractedCompanies.forEach(({ card, companyRecord }, index) => {
            // Check if placeholders already exist
            const existingPlaceholders = card.querySelector('.scrapy-ai-placeholders');
            if (existingPlaceholders) return;

            // Create placeholders container
            const placeholdersContainer = document.createElement('div');
            placeholdersContainer.className = 'scrapy-ai-placeholders';
            placeholdersContainer.style.cssText = `
                display: flex;
                gap: 4px;
                margin-left: 12px;
                margin-bottom: 2px;
                flex-wrap: wrap;
                z-index: 1000;
                position: relative;
            `;

            // Add B2B/B2C placeholder
            const b2bPlaceholder = document.createElement('span');
            b2bPlaceholder.className = 'scrapy-ai-placeholder b2b-placeholder';
            b2bPlaceholder.textContent = '🔄 Analyzing...';
            b2bPlaceholder.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #f8f9fa;
                color: #6c757d;
                white-space: nowrap;
                border: 1px dashed #dee2e6;
                animation: pulse-analysis 1.5s infinite;
            `;

            // Add similarity placeholder (if target text exists)
            const similarityPlaceholder = document.createElement('span');
            similarityPlaceholder.className = 'scrapy-ai-placeholder similarity-placeholder';
            similarityPlaceholder.textContent = '🔄 Comparing...';
            similarityPlaceholder.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #f8f9fa;
                color: #6c757d;
                white-space: nowrap;
                border: 1px dashed #dee2e6;
                animation: pulse-analysis 1.5s infinite;
            `;

            placeholdersContainer.appendChild(b2bPlaceholder);
            placeholdersContainer.appendChild(similarityPlaceholder);

            // Add CSS animation if not exists
            if (!document.getElementById('ai-placeholder-styles')) {
                const style = document.createElement('style');
                style.id = 'ai-placeholder-styles';
                style.textContent = `
                    @keyframes pulse-analysis {
                        0%, 100% { opacity: 0.5; }
                        50% { opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            // Find the flex container next to the company name
            const companyNameLink = card.querySelector('a[data-anonymize="company-name"]');
            const titleContainer = companyNameLink?.closest('.artdeco-entity-lockup__title');
            const flexContainer = titleContainer?.parentElement;
            
            if (flexContainer && flexContainer.classList.contains('flex')) {
                // Add placeholders to the flex container, right after the title
                flexContainer.appendChild(placeholdersContainer);
            } else {
                // Fallback to original method
                const companyInfoContainer = card.querySelector('.artdeco-entity-lockup__content') ||
                                           companyNameLink?.parentElement;
                
                if (companyInfoContainer) {
                    companyInfoContainer.appendChild(placeholdersContainer);
                }
            }
        });
    }

    // Function to process AI analysis progressively with rate limiting
    async function processAIAnalysisProgressively(extractedCompanies, selectedCompanyFolder, allCompanyFolders, aiSettings) {
        logToExtension('info', `AI ANALYSIS: Starting progressive analysis for ${extractedCompanies.length} companies`, 'CompanySearchExtractor');
        logToExtension('info', `DEBUG AI SETTINGS: ${JSON.stringify(aiSettings)}`, 'CompanySearchExtractor');
        
        // Calculate delay based on model rate limits
        const modelDelays = {
            'gemini-2.5-pro': 12000,      // 5 RPM = 12 seconds between requests
            'gemini-2.5-flash': 6000,     // 10 RPM = 6 seconds between requests  
            'gemini-2.5-flash-lite': 4000 // 15 RPM = 4 seconds between requests
        };
        
        const delay = modelDelays[aiSettings.companyAIModel] || 6000;
        logToExtension('info', `AI ANALYSIS: Using ${delay}ms delay between requests for ${aiSettings.companyAIModel}`, 'CompanySearchExtractor');
        
        for (let i = 0; i < extractedCompanies.length; i++) {
            const { companyRecord, companyData, card } = extractedCompanies[i];
            
            // Add delay between requests (except for the first one)
            if (i > 0) {
                logToExtension('info', `AI ANALYSIS: Waiting ${delay}ms before next request...`, 'CompanySearchExtractor');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            try {
                logToExtension('info', `AI ANALYSIS: Processing company ${i + 1}/${extractedCompanies.length}: ${companyRecord.name}`, 'CompanySearchExtractor');
                
                // Call AI analysis
                const aiResults = await callAIForCompany(companyData, aiSettings);
                
                if (aiResults) {
                    // Update company record with AI results
                    if (aiResults.b2bB2c) {
                        companyRecord.b2bB2cClassification = aiResults.b2bB2c.classification;
                        companyRecord.b2bB2cConfidence = aiResults.b2bB2c.confidence;
                        companyRecord.b2bB2cReasoning = aiResults.b2bB2c.reasoning;
                    }
                    if (aiResults.similarity) {
                        companyRecord.similarityScore = aiResults.similarity.similarity;
                        companyRecord.similarityReasoning = aiResults.similarity.reasoning;
                    }

                    // Update storage immediately
                    const saved = await safeStorageSet({ companyFolders: allCompanyFolders });
                    if (saved) {
                        logToExtension('info', `AI ANALYSIS: Updated storage for ${companyRecord.name}`, 'CompanySearchExtractor');
                    }

                    // Update LinkedIn page immediately
                    updateCompanyTagsOnPage(card, companyRecord);
                    
                    // Trigger extension popup update if open (send message to popup)
                    try {
                        chrome.runtime.sendMessage({
                            action: 'companyUpdated',
                            payload: { companyRecord, folderName: selectedCompanyFolder }
                        });
                    } catch (error) {
                        // Popup might not be open, that's okay
                    }
                }
            } catch (error) {
                logToExtension('error', `AI ANALYSIS: Failed for ${companyRecord.name}: ${error.message}`, 'CompanySearchExtractor');
                
                // Remove placeholders and show error
                const placeholders = card.querySelector('.scrapy-ai-placeholders');
                if (placeholders) {
                    placeholders.innerHTML = '<span style="font-size: 10px; color: #dc3545;">❌ AI Error</span>';
                }
            }
        }
        
        logToExtension('info', `AI ANALYSIS: Progressive analysis completed for all ${extractedCompanies.length} companies`, 'CompanySearchExtractor');
    }

    // Function to update company tags on LinkedIn page
    function updateCompanyTagsOnPage(card, companyRecord) {
        // Remove placeholders
        const placeholders = card.querySelector('.scrapy-ai-placeholders');
        if (placeholders) {
            placeholders.remove();
        }

        // Check if real tags already exist
        const existingTags = card.querySelector('.scrapy-ai-tags');
        if (existingTags) {
            existingTags.remove();
        }

        // Create real AI tags
        if (companyRecord.b2bB2cClassification || companyRecord.similarityScore !== undefined) {
            const aiTagsContainer = document.createElement('div');
            aiTagsContainer.className = 'scrapy-ai-tags';
            aiTagsContainer.style.cssText = `
                display: flex;
                gap: 4px;
                margin-left: 12px;
                margin-bottom: 2px;
                flex-wrap: wrap;
                z-index: 1000;
                position: relative;
            `;

            // Add B2B/B2C tag
            if (companyRecord.b2bB2cClassification) {
                const b2bTag = document.createElement('span');
                b2bTag.textContent = companyRecord.b2bB2cClassification;
                const classification = companyRecord.b2bB2cClassification.toLowerCase();
                
                let bgColor = '#e3f2fd', textColor = '#1976d2';
                if (classification === 'b2c') {
                    bgColor = '#f3e5f5';
                    textColor = '#7b1fa2';
                } else if (classification === 'both') {
                    bgColor = '#fff3e0';
                    textColor = '#f57c00';
                }
                
                b2bTag.style.cssText = `
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: ${bgColor};
                    color: ${textColor};
                    white-space: nowrap;
                    line-height: 1.1;
                    vertical-align: top;
                `;
                
                aiTagsContainer.appendChild(b2bTag);
            }

            // Add similarity tag
            if (companyRecord.similarityScore !== undefined) {
                const similarityTag = document.createElement('span');
                const score = parseInt(companyRecord.similarityScore);
                similarityTag.textContent = `${score}% Similar`;
                
                let bgColor = '#e8f5e8', textColor = '#388e3c';
                if (score >= 70) {
                    bgColor = '#c8e6c9';
                    textColor = '#2e7d32';
                } else if (score >= 40) {
                    bgColor = '#fff9c4';
                    textColor = '#f9a825';
                } else {
                    bgColor = '#ffcdd2';
                    textColor = '#d32f2f';
                }
                
                similarityTag.style.cssText = `
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: ${bgColor};
                    color: ${textColor};
                    white-space: nowrap;
                    line-height: 1.1;
                    vertical-align: top;
                `;
                
                aiTagsContainer.appendChild(similarityTag);
            }

            // Find the flex container next to the company name (same logic as placeholders)
            const companyNameLink = card.querySelector('a[data-anonymize="company-name"]');
            const titleContainer = companyNameLink?.closest('.artdeco-entity-lockup__title');
            const flexContainer = titleContainer?.parentElement;
            
            if (flexContainer && flexContainer.classList.contains('flex')) {
                // Add tags to the flex container, right after the title
                flexContainer.appendChild(aiTagsContainer);
                logToExtension('info', `Updated LinkedIn page tags for: ${companyRecord.name}`, 'CompanySearchExtractor');
            } else {
                // Fallback to original method
                const companyInfoContainer = card.querySelector('.artdeco-entity-lockup__content') ||
                                           companyNameLink?.parentElement;
                
                if (companyInfoContainer) {
                    companyInfoContainer.appendChild(aiTagsContainer);
                    logToExtension('info', `Updated LinkedIn page tags for: ${companyRecord.name}`, 'CompanySearchExtractor');
                }
            }
        }
    }

    // Function to inject AI tags into LinkedIn company search results
    async function injectAITagsIntoLinkedInPage() {
        logToExtension('info', 'DEBUG: Starting AI tags injection process...', 'CompanySearchExtractor');
        const storage = await safeStorageGet(['companyFolders', 'selectedCompanyFolder']);
        if (!storage || !storage.companyFolders || !storage.selectedCompanyFolder) {
            logToExtension('info', 'DEBUG: No storage or folder found for AI tags injection', 'CompanySearchExtractor');
            return;
        }

        const { companyFolders, selectedCompanyFolder } = storage;
        const companies = companyFolders[selectedCompanyFolder] || [];
        
        logToExtension('info', `DEBUG: Found ${companies.length} companies in folder "${selectedCompanyFolder}" for AI tags`, 'CompanySearchExtractor');
        
        // Create lookup map for quick access to company data by link
        const companyMap = new Map();
        companies.forEach(company => {
            if (company.salesNavigatorLink) {
                companyMap.set(company.salesNavigatorLink, company);
            }
        });

        // Find all company cards on the page
        const allCompanyCards = document.querySelectorAll('li.artdeco-list__item');
        
        allCompanyCards.forEach(card => {
            // Find company name link to get the Sales Navigator URL
            const companyNameEl = card.querySelector('a[data-anonymize="company-name"]') ||
                                 card.querySelector('.artdeco-entity-lockup__title a') ||
                                 card.querySelector('a[data-control-name="view_company_via_result_name"]') ||
                                 card.querySelector('a[href*="/sales/company/"]');
            
            if (!companyNameEl) return;

            const linkedinLink = companyNameEl.getAttribute('href');
            if (!linkedinLink) return;

            const fullLinkedinLink = linkedinLink.startsWith('/sales/company/') 
                ? 'https://www.linkedin.com' + linkedinLink 
                : linkedinLink;

            // Check if we have AI data for this company
            const companyData = companyMap.get(fullLinkedinLink);
            if (!companyData || (!companyData.b2bB2cClassification && companyData.similarityScore === undefined)) {
                return;
            }

            // Check if tags already exist
            const existingTags = card.querySelector('.scrapy-ai-tags');
            if (existingTags) return;

            // Create AI tags container
            const aiTagsContainer = document.createElement('div');
            aiTagsContainer.className = 'scrapy-ai-tags';
            aiTagsContainer.style.cssText = `
                display: flex;
                gap: 4px;
                margin-top: 4px;
                flex-wrap: wrap;
                z-index: 1000;
                position: relative;
            `;

            // Add B2B/B2C tag
            if (companyData.b2bB2cClassification) {
                const b2bTag = document.createElement('span');
                b2bTag.className = 'scrapy-ai-tag';
                b2bTag.textContent = companyData.b2bB2cClassification;
                
                const classification = companyData.b2bB2cClassification.toLowerCase();
                let bgColor = '#e3f2fd', textColor = '#1976d2';
                if (classification === 'b2c') {
                    bgColor = '#f3e5f5';
                    textColor = '#7b1fa2';
                } else if (classification === 'both') {
                    bgColor = '#fff3e0';
                    textColor = '#f57c00';
                }
                
                b2bTag.style.cssText = `
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: ${bgColor};
                    color: ${textColor};
                    white-space: nowrap;
                    line-height: 1.1;
                    vertical-align: top;
                `;
                
                aiTagsContainer.appendChild(b2bTag);
            }

            // Add similarity tag
            if (companyData.similarityScore !== undefined) {
                const similarityTag = document.createElement('span');
                similarityTag.className = 'scrapy-ai-tag';
                
                const score = parseInt(companyData.similarityScore);
                similarityTag.textContent = `${score}% Similar`;
                
                let bgColor = '#e8f5e8', textColor = '#388e3c';
                if (score >= 70) {
                    bgColor = '#c8e6c9';
                    textColor = '#2e7d32';
                } else if (score >= 40) {
                    bgColor = '#fff9c4';
                    textColor = '#f9a825';
                } else {
                    bgColor = '#ffcdd2';
                    textColor = '#d32f2f';
                }
                
                similarityTag.style.cssText = `
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: ${bgColor};
                    color: ${textColor};
                    white-space: nowrap;
                    line-height: 1.1;
                    vertical-align: top;
                `;
                
                aiTagsContainer.appendChild(similarityTag);
            }

            // Find a good place to insert the tags (after company info)
            const companyInfoContainer = card.querySelector('.artdeco-entity-lockup__content') ||
                                       card.querySelector('.artdeco-entity-lockup__subtitle')?.parentElement ||
                                       companyNameEl.parentElement;
            
            if (companyInfoContainer) {
                companyInfoContainer.appendChild(aiTagsContainer);
                logToExtension('info', `Injected AI tags for company: ${companyData.name}`, 'CompanySearchExtractor');
            }
        });
    }

    // Debug function to inject test AI tags
    function injectTestAITags() {
        const allCompanyCards = document.querySelectorAll('li.artdeco-list__item');
        logToExtension('info', `DEBUG: Found ${allCompanyCards.length} company cards for test tag injection`, 'CompanySearchExtractor');
        
        allCompanyCards.forEach((card, index) => {
            // Only add to first 3 companies for testing
            if (index >= 3) return;

            // Check if test tags already exist
            const existingTestTags = card.querySelector('.scrapy-test-tags');
            if (existingTestTags) return;

            // Create test AI tags container
            const testTagsContainer = document.createElement('div');
            testTagsContainer.className = 'scrapy-test-tags';
            testTagsContainer.style.cssText = `
                display: flex;
                gap: 4px;
                margin-top: 4px;
                flex-wrap: wrap;
                z-index: 1000;
                position: relative;
            `;

            // Add test B2B tag
            const testB2BTag = document.createElement('span');
            testB2BTag.textContent = 'TEST B2B';
            testB2BTag.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #e3f2fd;
                color: #1976d2;
                white-space: nowrap;
                border: 2px solid #ff0000;
            `;

            // Add test similarity tag
            const testSimilarityTag = document.createElement('span');
            testSimilarityTag.textContent = 'TEST 85% Similar';
            testSimilarityTag.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #c8e6c9;
                color: #2e7d32;
                white-space: nowrap;
                border: 2px solid #ff0000;
            `;

            testTagsContainer.appendChild(testB2BTag);
            testTagsContainer.appendChild(testSimilarityTag);

            // Find a good place to insert the tags
            const companyInfoContainer = card.querySelector('.artdeco-entity-lockup__content') ||
                                       card.querySelector('.artdeco-entity-lockup__subtitle')?.parentElement ||
                                       card.querySelector('a[data-anonymize="company-name"]')?.parentElement;
            
            if (companyInfoContainer) {
                companyInfoContainer.appendChild(testTagsContainer);
                logToExtension('info', `DEBUG: Injected test tags for company card ${index + 1}`, 'CompanySearchExtractor');
            } else {
                logToExtension('warn', `DEBUG: Could not find container for test tags on company card ${index + 1}`, 'CompanySearchExtractor');
            }
        });
    }

    // Rimosso l'Observer che causava doppie estrazioni - ora estrazione singola solo all'inizializzazione

    // Estrazione singola iniziale dopo 3 secondi dal caricamento della pagina
    setTimeout(() => {
        logToExtension('info', 'Starting single company extraction process...', 'CompanySearchExtractor');
        processCompanyCards();
    }, 3000);

    // AI tags are now injected progressively during analysis
    // No need for separate injection timing

    // Debug: Inject test tags after a delay (commented out for production)
    // setTimeout(() => {
    //     logToExtension('info', 'DEBUG: Injecting test AI tags for debugging...', 'CompanySearchExtractor');
    //     injectTestAITags();
    // }, 7000);
    
    logToExtension('info', 'Initialized and monitoring for company cards', 'CompanySearchExtractor');
})();

