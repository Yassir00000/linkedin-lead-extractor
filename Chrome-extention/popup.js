/**
 * ===============================================================================
 * LinkedIn Lead Extension - Popup Interface Controller
 * ===============================================================================
 * 
 * This file manages the extension's popup interface, providing users with:
 * 
 * Core Features:
 * - Contact and company folder management
 * - AI model configuration (Gemini 2.5 Flash/Pro or local models)
 * - Export options with AI enrichment settings
 * - Multi-language support (English/Italian)
 * - Real-time API usage monitoring
 * - Memory usage tracking and optimization
 * 
 * AI Model Configuration:
 * Users can choose between:
 * 1. Gemini 2.5 Flash (default): 10 RPM, 250 RPD - Best for general use
 * 2. Gemini 2.5 Flash Lite: 15 RPM, 1000 RPD - High-volume processing
 * 3. Gemini 2.5 Pro: 5 RPM, 100 RPD - Advanced analysis and reasoning
 * 4. Local Models: Configure custom endpoints for on-premise AI
 * 
 * Local AI Setup Guide:
 * To use local AI models instead of Gemini:
 * 1. Install a local AI server (Ollama, LocalAI, LM Studio)
 * 2. Start your local server with desired model
 * 3. In extension settings, modify the model configuration
 * 4. Update API endpoint in background.js if needed
 * 
 * Tab Structure:
 * - Contacts: Manage contact folders and export settings
 * - Companies: Handle company data and AI enrichment
 * - Settings: Configure API keys, models, and preferences
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
    // General
    save: "Save",
    delete: "Delete",
    create: "Create",
    processing: "Processing...",
    orbisLabel: "Orbis",
    linkedinLabel: "LinkedIn",
    // Popup UI
    contactsTitle: "Contacts",
    companiesTitle: "Companies",
    settingsTitle: "Settings",
    languageLabel: "Language",
    modelLabel: "Gemini Model",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "Paste your API key here",
    saveKeyBtn: "Save Key",
    newFolderPlaceholder: "New folder name...",
    selectFolder: "Select a folder",
    savedContacts: "Saved Contacts",
    savedCompanies: "Saved Companies",
    deleteContactTitle: "Delete Contact",
    deleteCompanyTitle: "Delete Company",
    newCompanyFolderPlaceholder: "New company folder name...",
    selectContactFolder: "Select contact folder...",
    linkContactFolderLabel: "Link to contact folder:",
    findDomainsLabel: "Find company domains",
    splitNamesLabel: "Split names and get title (Mr./Mrs.)",
    exportToExcel: "Export to Excel",
    exportCompaniesToExcel: "Export Companies to Excel",
    enableCompanySearchExtraction: "Extract data from company search pages",
    // Popup Logic/Notifications
    apiKeySaved: "API key saved!",
    invalidApiKey: "Please enter a valid API key.",
    folderExists: "Folder already exists.",
    folderNameEmpty: "Folder name cannot be empty.",
    folderCreated: "Folder created!",
    confirmDeleteFolder: "Are you sure you want to delete the folder \"{folderName}\"?",
    folderDeleted: "Folder deleted.",
    selectFolderToDelete: "Please select a folder to delete.",
    viewContactsInFolder: "Select a folder to see contacts.",
    noContactsInFolder: "No contacts in this folder.",
    exporting: "Processing...",
    noContactsToExport: "No contacts to export.",
    needApiKeyForAI: "Enter an API key to use AI features.",
    startProcessing: "Starting background processing... You will be notified when the file is ready.",
    keyPlaceholderSaved: "•••••••••••••••••••••",
    flashUsageLabel: "Flash (today):",
    flashLiteUsageLabel: "Flash Lite (today):",
    proUsageLabel: "Pro (today):",
    usageResetInfo: "Resets at 00:00 UTC",
    exportLogsBtn: "📝 Export Logs",
    clearLogsBtn: "🗑️ Clear Logs",
    logsExported: "Logs exported successfully!",
    logsCleared: "Logs cleared successfully!",
    logsExportError: "Error exporting logs.",
    memoryUsageLabel: "Memory Usage",
    memorySafe: "Safe",
    memoryWarning: "Warning",
    memoryDanger: "Risk",
    targetCompaniesLabel: "Target Companies",
    folderManagementLabel: "Folder Management",
    aiModelLabel: "AI Model for Companies:",
    enableB2BB2CClassification: "B2B/B2C Classification",
    enableSimilarCompanies: "Similar Companies",
    clear: "Clear",
    targetCompaniesSaved: "Target companies information saved!",
    targetCompaniesCleared: "Target companies information cleared!"
  },
  it: {
    // General
    save: "Salva",
    delete: "Elimina",
    create: "Crea",
    processing: "Elaborazione in corso...",
    orbisLabel: "Orbis",
    linkedinLabel: "LinkedIn",
    // Popup UI
    contactsTitle: "Contatti",
    companiesTitle: "Aziende",
    settingsTitle: "Impostazioni",
    languageLabel: "Lingua",
    modelLabel: "Modello Gemini",
    apiKeyLabel: "Chiave API Gemini",
    apiKeyPlaceholder: "Incolla la tua chiave API qui",
    saveKeyBtn: "Salva Chiave",
    newFolderPlaceholder: "Nome nuova cartella...",
    selectFolder: "Seleziona una cartella",
    savedContacts: "Contatti Salvati",
    savedCompanies: "Aziende Salvate",
    deleteContactTitle: "Elimina Contatto",
    deleteCompanyTitle: "Elimina Azienda",
    newCompanyFolderPlaceholder: "Nome nuova cartella aziende...",
    selectContactFolder: "Seleziona cartella contatti...",
    linkContactFolderLabel: "Collega a cartella contatti:",
    findDomainsLabel: "Trova domini delle aziende",
    splitNamesLabel: "Suddividi nomi e cognomi (con titolo)",
    exportToExcel: "Esporta in Excel",
    exportCompaniesToExcel: "Esporta Aziende in Excel",
    enableCompanySearchExtraction: "Estrai dati dalle pagine di ricerca aziende",
    // Popup Logic/Notifications
    apiKeySaved: "Chiave API salvata!",
    invalidApiKey: "Inserisci una chiave API valida.",
    folderExists: "Cartella già esistente.",
    folderNameEmpty: "Il nome non può essere vuoto.",
    folderCreated: "Cartella creata!",
    confirmDeleteFolder: "Sei sicuro di eliminare la cartella \"{folderName}\"?",
    folderDeleted: "Cartella eliminata.",
    selectFolderToDelete: "Seleziona una cartella da eliminare.",
    viewContactsInFolder: "Seleziona una cartella per vedere i contatti.",
    noContactsInFolder: "Nessun contatto in questa cartella.",
    exporting: "Elaborazione in corso...",
    noContactsToExport: "Nessun contatto da esportare.",
    needApiKeyForAI: "Inserisci una chiave API per usare le funzioni AI.",
    startProcessing: "Avvio elaborazione in background... Riceverai una notifica quando il file sarà pronto.",
    keyPlaceholderSaved: "•••••••••••••••••••••",
    flashUsageLabel: "Flash (oggi):",
    flashLiteUsageLabel: "Flash Lite (oggi):",
    proUsageLabel: "Pro (oggi):",
    usageResetInfo: "Reset alle 00:00 UTC",
    exportLogsBtn: "📝 Esporta Log",
    clearLogsBtn: "🗑️ Pulisci Log",
    logsExported: "Log esportati con successo!",
    logsCleared: "Log cancellati con successo!",
    logsExportError: "Errore nell'esportazione dei log.",
    memoryUsageLabel: "Utilizzo Memoria",
    memorySafe: "Sicuro",
    memoryWarning: "Attenzione",
    memoryDanger: "Rischio",
    targetCompaniesLabel: "Aziende Target",
    folderManagementLabel: "Gestione Cartelle",
    aiModelLabel: "Modello AI per Aziende:",
    enableB2BB2CClassification: "Classificazione B2B/B2C",
    enableSimilarCompanies: "Aziende simili",
    clear: "Pulisci",
    targetCompaniesSaved: "Informazioni aziende target salvate!",
    targetCompaniesCleared: "Informazioni aziende target cancellate!"
  }
};

let currentLang = 'it';
let currentMessages = messages.it;

async function setLanguage() {
    const { language } = await chrome.storage.local.get({ language: 'it' });
    currentLang = language;
    currentMessages = messages[language] || messages.it;
}

function updateUIWithTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = currentMessages[key] || el.textContent;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = currentMessages[key] || el.placeholder;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = currentMessages[key] || el.title;
    });
}

// ==========================================================================
// ============================ ORIGINAL CODE ===============================
// ==========================================================================


document.addEventListener('DOMContentLoaded', initializePopup);

function toAscii(str) {
    if (!str) return '';
    let newStr = str
        .replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O').replace(/å/g, 'a').replace(/Å/g, 'A')
        .replace(/ł/g, 'l').replace(/Ł/g, 'L');
    return newStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function initializePopup() {
    // Mostra immediatamente l'interfaccia base
    document.getElementById('popup-content').style.opacity = '1';
    
    // Carica lingua in background
    setLanguage().then(() => {
        updateUIWithTranslations();
    });

    // Selettori elementi UI
    const folderSelect = document.getElementById('folder-select');
    const createFolderButton = document.getElementById('create-folder');
    const folderNameInput = document.getElementById('folder-name');
    const deleteFolderButton = document.getElementById('delete-folder');
    const contactList = document.getElementById('contact-list');
    const contactCount = document.getElementById('contact-count');
    const downloadExcelButton = document.getElementById('download-excel');
    const notification = document.getElementById('notification');
    
    // Company elements
    const companyFolderSelect = document.getElementById('company-folder-select');
    const createCompanyFolderButton = document.getElementById('create-company-folder');
    const companyFolderNameInput = document.getElementById('company-folder-name');
    const deleteCompanyFolderButton = document.getElementById('delete-company-folder');
    const companyList = document.getElementById('company-list');
    const companyCount = document.getElementById('company-count');
    const downloadCompaniesExcelButton = document.getElementById('download-companies-excel');
    const notificationAziende = document.getElementById('notification-aziende');
    const linkedContactFolderSelect = document.getElementById('linked-contact-folder');
    
    // Folder management expandable elements
    const folderManagementToggle = document.getElementById('folder-management-toggle');
    const folderManagementExpandable = document.getElementById('folder-management-expandable');
    const folderContentIndicator = document.getElementById('folder-content-indicator');
    
    // Target companies elements
    const targetCompaniesText = document.getElementById('target-companies-text');
    const saveTargetCompaniesBtn = document.getElementById('save-target-companies');
    const clearTargetCompaniesBtn = document.getElementById('clear-target-companies');
    const targetCompaniesToggle = document.getElementById('target-companies-toggle');
    const targetCompaniesExpandable = document.getElementById('target-companies-expandable');
    const targetContentIndicator = document.getElementById('target-content-indicator');
    const aiModelSelect = document.getElementById('ai-model-select');
    
    // New AI checkboxes
    const enableB2BB2CClassificationCheckbox = document.getElementById('enable-b2b-b2c-classification');
    const enableSimilarCompaniesCheckbox = document.getElementById('enable-similar-companies');
    
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const findDomainsCheckbox = document.getElementById('find-domains-checkbox');
    const splitNamesCheckbox = document.getElementById('split-names-checkbox');
    const enableCompanySearchExtractionCheckbox = document.getElementById('enable-company-search-extraction');
    const languageSelect = document.getElementById('language-select');
    const modelSelect = document.getElementById('gemini-model-select');
    const exportLogsBtn = document.getElementById('export-logs-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    
    // Tab system elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Target companies functionality
    async function loadTargetCompanies() {
        const { targetCompaniesText: savedText } = await chrome.storage.local.get({ targetCompaniesText: '' });
        if (targetCompaniesText) {
            targetCompaniesText.value = savedText;
            await updateContentIndicator();
        }
    }

    async function updateContentIndicator() {
        if (targetContentIndicator && targetCompaniesText) {
            const hasContent = targetCompaniesText.value.trim().length > 0;
            if (hasContent) {
                targetContentIndicator.classList.add('has-content');
                targetContentIndicator.title = 'Contiene testo';
            } else {
                targetContentIndicator.classList.remove('has-content');
                targetContentIndicator.title = 'Vuoto';
            }
        }
        await updateCheckboxDependencies();
    }

    function toggleTargetCompaniesSection() {
        if (targetCompaniesExpandable) {
            targetCompaniesExpandable.classList.toggle('expanded');
        }
    }

    function updateFolderContentIndicator() {
        if (folderContentIndicator && companyFolderSelect) {
            const hasFolders = companyFolderSelect.options.length > 1; // >1 because of default option
            if (hasFolders) {
                folderContentIndicator.classList.add('has-content');
                folderContentIndicator.title = 'Cartelle presenti';
            } else {
                folderContentIndicator.classList.remove('has-content');
                folderContentIndicator.title = 'Nessuna cartella';
            }
        }
    }

    function toggleFolderManagementSection() {
        if (folderManagementExpandable) {
            folderManagementExpandable.classList.toggle('expanded');
        }
    }

    async function updateCheckboxDependencies() {
        const extractionEnabled = enableCompanySearchExtractionCheckbox.checked;
        const hasTargetText = targetCompaniesText.value.trim().length > 0;
        
        // Check if API key exists
        const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
        const hasApiKey = geminiApiKey && geminiApiKey.trim().length > 0;
        
        // B2B/B2C depends on extraction being enabled AND API key
        const canUseB2BC = extractionEnabled && hasApiKey;
        if (!enableB2BB2CClassificationCheckbox.disabled) {
            enableB2BB2CClassificationCheckbox.disabled = !canUseB2BC;
        }
        if (!canUseB2BC) {
            enableB2BB2CClassificationCheckbox.checked = false;
        }
        
        // Similar companies depends on extraction AND target text AND API key
        const canUseSimilar = extractionEnabled && hasTargetText && hasApiKey;
        if (!enableSimilarCompaniesCheckbox.disabled) {
            enableSimilarCompaniesCheckbox.disabled = !canUseSimilar;
        }
        if (!canUseSimilar) {
            enableSimilarCompaniesCheckbox.checked = false;
        }
    }

    // Function to update AI checkbox availability based on API key
    async function updateAICheckboxAvailability(apiKey = null) {
        if (apiKey === null) {
            const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
            apiKey = geminiApiKey || '';
        }
        
        const hasApiKey = apiKey && apiKey.trim().length > 0;
        
        if (!hasApiKey) {
            // Disable AI checkboxes in companies section
            enableB2BB2CClassificationCheckbox.disabled = true;
            enableSimilarCompaniesCheckbox.disabled = true;
            enableB2BB2CClassificationCheckbox.checked = false;
            enableSimilarCompaniesCheckbox.checked = false;
            aiModelSelect.disabled = true;
            
            // Disable AI checkboxes in contacts section
            findDomainsCheckbox.disabled = true;
            splitNamesCheckbox.disabled = true;
            findDomainsCheckbox.checked = false;
            splitNamesCheckbox.checked = false;
            
            // Add warning indicators
            addAPIKeyWarning();
        } else {
            // Enable AI features based on normal dependencies
            aiModelSelect.disabled = false;
            
            // Enable contacts AI features
            findDomainsCheckbox.disabled = false;
            splitNamesCheckbox.disabled = false;
            
            removeAPIKeyWarning();
            await updateCheckboxDependencies();
        }
    }

    // Function to add API key warning indicators
    function addAPIKeyWarning() {
        // Add settings tab indicator
        const settingsTab = document.querySelector('[data-tab="settings"]');
        if (settingsTab && !settingsTab.querySelector('.api-key-warning-dot')) {
            const warningDot = document.createElement('span');
            warningDot.className = 'api-key-warning-dot';
            warningDot.style.cssText = `
                display: inline-block;
                width: 8px;
                height: 8px;
                background: #dc3545;
                border-radius: 50%;
                margin-left: 4px;
                animation: pulse-warning 2s infinite;
            `;
            settingsTab.appendChild(warningDot);
        }
        
        // Add API key section indicator in settings
        const apiKeyLabel = document.querySelector('label[for="gemini-api-key"]');
        if (apiKeyLabel && !apiKeyLabel.querySelector('.api-key-section-dot')) {
            const sectionDot = document.createElement('span');
            sectionDot.className = 'api-key-section-dot';
            sectionDot.style.cssText = `
                display: inline-block;
                width: 6px;
                height: 6px;
                background: #dc3545;
                border-radius: 50%;
                margin-left: 6px;
                animation: pulse-warning 2s infinite;
            `;
            apiKeyLabel.appendChild(sectionDot);
        }
        
        // Add CSS animation if not exists
        if (!document.getElementById('api-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'api-warning-styles';
            style.textContent = `
                @keyframes pulse-warning {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Function to remove API key warning indicators
    function removeAPIKeyWarning() {
        // Remove settings tab indicator
        const settingsTab = document.querySelector('[data-tab="settings"]');
        const warningDot = settingsTab?.querySelector('.api-key-warning-dot');
        if (warningDot) {
            warningDot.remove();
        }
        
        // Remove API key section indicator
        const apiKeyLabel = document.querySelector('label[for="gemini-api-key"]');
        const sectionDot = apiKeyLabel?.querySelector('.api-key-section-dot');
        if (sectionDot) {
            sectionDot.remove();
        }
    }


    // Tab switching functionality
    function switchTab(targetTab) {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to target button and content
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetContent = document.getElementById(`${targetTab}-tab`);
        
        if (targetButton && targetContent) {
            targetButton.classList.add('active');
            targetContent.classList.add('active');
        }
        
        // Load data when switching to specific tabs
        if (targetTab === 'aziende') {
            loadCompanyFolders();
        }
    }

    // Add click listeners to tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    function showNotification(message, type = 'success', duration = 3000) {
        notification.textContent = message;
        notification.className = type === 'success' ? 'notification-success' : 'notification-error';
        notification.style.display = 'block';
        notification.style.opacity = '1';
        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => { notification.style.display = 'none'; }, 500);
            }, duration);
        }
    }

    function setExportButtonState(status) {
        if (status === 'processing') {
            downloadExcelButton.disabled = true;
            downloadExcelButton.textContent = currentMessages.exporting;
            downloadExcelButton.classList.add('processing');
        } else { // 'idle' or any other state
            downloadExcelButton.disabled = false;
            downloadExcelButton.textContent = currentMessages.exportToExcel;
            downloadExcelButton.classList.remove('processing');
        }
    }

    async function loadFolders() {
        try {
            const { folders, selectedFolder } = await chrome.storage.local.get(['folders', 'selectedFolder']);
            const allFolders = folders || {};
            
            // Popolamento veloce del select
            const fragment = document.createDocumentFragment();
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = currentMessages.selectFolder;
            fragment.appendChild(defaultOption);
            
            Object.keys(allFolders).forEach(folderName => {
                const option = document.createElement('option');
                option.value = folderName;
                option.textContent = folderName;
                option.title = folderName; // Tooltip con nome completo
                fragment.appendChild(option);
            });
            
            folderSelect.innerHTML = '';
            folderSelect.appendChild(fragment);
            
            if (selectedFolder && allFolders[selectedFolder]) {
                folderSelect.value = selectedFolder;
                // Carica i contatti in background per non bloccare l'UI
                setTimeout(() => loadContacts(selectedFolder), 0);
            } else {
                await chrome.storage.local.remove('selectedFolder');
                await loadContacts(null);
            }
        } catch (error) {
            console.error('Error loading folders:', error);
            // Fallback per continuare a funzionare anche con errori
            folderSelect.innerHTML = `<option value="">Seleziona cartella</option>`;
        }
    }

    async function loadContacts(folderName) {
        if (!folderName) {
            contactList.innerHTML = `<p class="contact-list-message">${currentMessages.viewContactsInFolder}</p>`;
            contactCount.textContent = '0';
            downloadExcelButton.style.display = 'none';
            return;
        }
        const { folders, exportStatus } = await chrome.storage.local.get(['folders', 'exportStatus']);
        const contacts = folders?.[folderName] || [];
        contactCount.textContent = contacts.length;
        contactList.innerHTML = '';
        if (contacts.length > 0) {
            downloadExcelButton.style.display = 'block';
            setExportButtonState(exportStatus || 'idle');
            contacts.forEach((contact, index) => {
                const card = document.createElement('div');
                card.className = 'contact-card';
                const orbisHtml = contact.orbisName ? `<div class="orbis-name">${currentMessages.orbisLabel}: ${contact.orbisName}</div>` : '';
                const linkedinHtml = contact.filteredCompany ? `<div class="orbis-name" style="color: #0073b1;">${currentMessages.linkedinLabel}: ${contact.filteredCompany}</div>` : '';
                card.innerHTML = `<img src="${contact.profileImage || 'icon48.png'}" alt="Profile Picture"><div class="contact-info"><div class="name"><a href="${contact.profileLink}" target="_blank">${contact.personName||'N/A'}</a></div><div class="headline">${contact.jobTitle||'N/A'}</div><div class="company">${contact.companyName||'N/A'}</div><div class="location">${contact.location||'N/A'}</div>${orbisHtml}${linkedinHtml}</div><button class="delete-contact" data-index="${index}" title="${currentMessages.deleteContactTitle}">×</button>`;
                contactList.appendChild(card);
            });
            contactList.querySelectorAll('.delete-contact').forEach(btn => {
                btn.addEventListener('click', (e) => removeContact(folderName, parseInt(e.currentTarget.dataset.index, 10)));
            });
        } else {
            contactList.innerHTML = `<p class="contact-list-message">${currentMessages.noContactsInFolder}</p>`;
            downloadExcelButton.style.display = 'none';
        }
    }

    async function removeContact(folderName, index) {
        const { folders } = await chrome.storage.local.get('folders');
        if (!folders?.[folderName]) return;
        folders[folderName].splice(index, 1);
        await chrome.storage.local.set({ folders });
        await loadContacts(folderName);
    }

    
    languageSelect.value = currentLang;
    languageSelect.addEventListener('change', async (e) => {
        const newLang = e.target.value;
        await chrome.storage.local.set({ language: newLang });
        await setLanguage();
        updateUIWithTranslations();
        // Reload folders and contacts to update language in dynamic elements
        await loadFolders();
    });

    // Aggiungi listener per salvare immediatamente la selezione del modello
    modelSelect.addEventListener('change', async (e) => {
        const selectedModel = e.target.value;
        await chrome.storage.local.set({ geminiModel: selectedModel });
        console.log('POPUP: Model selection saved:', selectedModel);
    });

    saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        if (apiKey) {
            await chrome.storage.local.set({ 
                geminiApiKey: apiKey,
                geminiModel: selectedModel 
            });
            showNotification(currentMessages.apiKeySaved, 'success');
            apiKeyInput.value = '';
            apiKeyInput.placeholder = currentMessages.keyPlaceholderSaved;
            
            // Update AI checkbox availability after saving API key
            await updateAICheckboxAvailability(apiKey);
            
            switchTab('main');
        } else {
            showNotification(currentMessages.invalidApiKey, 'error');
        }
    });

    // Listen for API key input changes to update availability in real-time
    apiKeyInput.addEventListener('input', async () => {
        const apiKey = apiKeyInput.value.trim();
        await updateAICheckboxAvailability(apiKey);
    });

    createFolderButton.addEventListener('click', async () => {
        const folderName = folderNameInput.value.trim();
        if (!folderName) { showNotification(currentMessages.folderNameEmpty, 'error'); return; }
        const { folders } = await chrome.storage.local.get('folders');
        const allFolders = folders || {};
        if (allFolders[folderName]) { showNotification(currentMessages.folderExists, 'error'); return; }
        allFolders[folderName] = [];
        await chrome.storage.local.set({ folders: allFolders, selectedFolder: folderName });
        folderNameInput.value = '';
        showNotification(currentMessages.folderCreated, 'success');
        await loadFolders();
    });

    folderSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        if (selectedValue && selectedValue.trim() !== '') {
            await chrome.storage.local.set({ selectedFolder: selectedValue });
        } else {
            await chrome.storage.local.remove('selectedFolder');
        }
        await loadContacts(selectedValue);
    });

    deleteFolderButton.addEventListener('click', async () => {
        const selectedFolder = folderSelect.value;
        if (!selectedFolder) { showNotification(currentMessages.selectFolderToDelete, 'error'); return; }
        
        const confirmMessage = currentMessages.confirmDeleteFolder.replace('{folderName}', selectedFolder);
        if (confirm(confirmMessage)) {
            const { folders } = await chrome.storage.local.get('folders');
            delete folders[selectedFolder];
            await chrome.storage.local.set({ folders });
            await chrome.storage.local.remove('selectedFolder');
            showNotification(currentMessages.folderDeleted, 'success');
            await loadFolders();
        }
    });

    // Load company search extraction setting
    const { enableCompanySearchExtraction } = await chrome.storage.local.get({ enableCompanySearchExtraction: false });
    enableCompanySearchExtractionCheckbox.checked = enableCompanySearchExtraction;

    // Save company search extraction setting when changed
    enableCompanySearchExtractionCheckbox.addEventListener('change', async () => {
        await chrome.storage.local.set({ enableCompanySearchExtraction: enableCompanySearchExtractionCheckbox.checked });
        await updateCheckboxDependencies();
    });

    // Load and save AI model selection
    async function loadAIModelSettings() {
        const { companyAIModel, enableB2BB2CClassification, enableSimilarCompanies, geminiApiKey } = await chrome.storage.local.get({
            companyAIModel: 'gemini-2.5-flash',
            enableB2BB2CClassification: false,
            enableSimilarCompanies: false,
            geminiApiKey: ''
        });
        aiModelSelect.value = companyAIModel;
        enableB2BB2CClassificationCheckbox.checked = enableB2BB2CClassification;
        enableSimilarCompaniesCheckbox.checked = enableSimilarCompanies;
        await updateCheckboxDependencies();
        await updateAICheckboxAvailability(geminiApiKey);
    }

    aiModelSelect.addEventListener('change', async () => {
        await chrome.storage.local.set({ companyAIModel: aiModelSelect.value });
    });

    enableB2BB2CClassificationCheckbox.addEventListener('change', async () => {
        await chrome.storage.local.set({ enableB2BB2CClassification: enableB2BB2CClassificationCheckbox.checked });
    });

    enableSimilarCompaniesCheckbox.addEventListener('change', async () => {
        // If similarity is enabled, automatically enable B2B/B2C as well
        if (enableSimilarCompaniesCheckbox.checked) {
            enableB2BB2CClassificationCheckbox.checked = true;
            await chrome.storage.local.set({ 
                enableSimilarCompanies: true,
                enableB2BB2CClassification: true 
            });
        } else {
            await chrome.storage.local.set({ enableSimilarCompanies: false });
        }
    });

    // Folder management event listeners
    if (folderManagementToggle) {
        folderManagementToggle.addEventListener('click', toggleFolderManagementSection);
    }

    // Target companies event listeners
    if (targetCompaniesToggle) {
        targetCompaniesToggle.addEventListener('click', toggleTargetCompaniesSection);
    }

    if (saveTargetCompaniesBtn) {
        saveTargetCompaniesBtn.addEventListener('click', async () => {
            const text = targetCompaniesText.value.trim();
            await chrome.storage.local.set({ targetCompaniesText: text });
            await updateContentIndicator();
            showCompanyNotification(currentMessages.targetCompaniesSaved, 'success');
        });
    }

    if (clearTargetCompaniesBtn) {
        clearTargetCompaniesBtn.addEventListener('click', async () => {
            targetCompaniesText.value = '';
            await chrome.storage.local.set({ targetCompaniesText: '' });
            await updateContentIndicator();
            showCompanyNotification(currentMessages.targetCompaniesCleared, 'success');
        });
    }

    // Update indicator when typing
    if (targetCompaniesText) {
        targetCompaniesText.addEventListener('input', async () => {
            await updateContentIndicator();
        });
    }

    downloadExcelButton.addEventListener('click', async () => {
        console.log("POPUP: Click on 'Export'.");
        const { folders, selectedFolder, geminiApiKey, geminiModel } = await chrome.storage.local.get(['folders', 'selectedFolder', 'geminiApiKey', 'geminiModel']);
        const contacts = folders?.[selectedFolder] || [];
        if (contacts.length === 0) { showNotification(currentMessages.noContactsToExport, 'error'); return; }
        
        const doFindDomains = findDomainsCheckbox.checked;
        const doSplitNames = splitNamesCheckbox.checked;

        if ((doFindDomains || doSplitNames) && !geminiApiKey) {
            showNotification(currentMessages.needApiKeyForAI, 'error');
            return;
        }

        setExportButtonState('processing');
        showNotification(currentMessages.startProcessing, 'info', 5000);

        chrome.runtime.sendMessage({
            action: 'processContactsForExport',
            payload: { 
                contacts, 
                findDomains: doFindDomains, 
                splitNames: doSplitNames, 
                apiKey: geminiApiKey, 
                selectedFolder,
                model: geminiModel || 'gemini-2.5-flash'
            }
        });

        setTimeout(() => window.close(), 1500);
    });

    // Company notification function
    function showCompanyNotification(message, type = 'success', duration = 3000) {
        notificationAziende.textContent = message;
        notificationAziende.className = type === 'success' ? 'notification-success' : 'notification-error';
        notificationAziende.style.display = 'block';
        notificationAziende.style.opacity = '1';
        if (duration > 0) {
            setTimeout(() => {
                notificationAziende.style.opacity = '0';
                setTimeout(() => { notificationAziende.style.display = 'none'; }, 500);
            }, duration);
        }
    }

    // Company folder management functions
    async function loadCompanyFolders() {
        try {
            const { companyFolders, selectedCompanyFolder, folders } = await chrome.storage.local.get(['companyFolders', 'selectedCompanyFolder', 'folders']);
            const allCompanyFolders = companyFolders || {};
            const contactFolders = folders || {};
            
            // Populate company folder select
            const fragment = document.createDocumentFragment();
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = currentMessages.selectFolder;
            fragment.appendChild(defaultOption);
            
            Object.keys(allCompanyFolders).forEach(folderName => {
                const option = document.createElement('option');
                option.value = folderName;
                option.textContent = folderName;
                option.title = folderName;
                fragment.appendChild(option);
            });
            
            companyFolderSelect.innerHTML = '';
            companyFolderSelect.appendChild(fragment);
            
            // Populate contact folder linking select
            const contactFragment = document.createDocumentFragment();
            const contactDefaultOption = document.createElement('option');
            contactDefaultOption.value = '';
            contactDefaultOption.textContent = currentMessages.selectContactFolder;
            contactFragment.appendChild(contactDefaultOption);
            
            Object.keys(contactFolders).forEach(folderName => {
                const option = document.createElement('option');
                option.value = folderName;
                option.textContent = folderName;
                contactFragment.appendChild(option);
            });
            
            linkedContactFolderSelect.innerHTML = '';
            linkedContactFolderSelect.appendChild(contactFragment);
            
            if (selectedCompanyFolder && allCompanyFolders[selectedCompanyFolder]) {
                companyFolderSelect.value = selectedCompanyFolder;
                setTimeout(() => loadCompanies(selectedCompanyFolder), 0);
            } else {
                await chrome.storage.local.remove('selectedCompanyFolder');
                await loadCompanies(null);
            }
            
            // Update folder content indicator
            updateFolderContentIndicator();
        } catch (error) {
            console.error('Error loading company folders:', error);
            companyFolderSelect.innerHTML = `<option value="">Seleziona cartella</option>`;
            updateFolderContentIndicator();
        }
    }

    async function loadCompanies(folderName) {
        if (!folderName) {
            companyList.innerHTML = `<p class="contact-list-message">${currentMessages.viewContactsInFolder.replace('contatti', 'aziende')}</p>`;
            companyCount.textContent = '0';
            downloadCompaniesExcelButton.style.display = 'none';
            return;
        }
        const { companyFolders, companyFolderLinks } = await chrome.storage.local.get(['companyFolders', 'companyFolderLinks']);
        const companies = companyFolders?.[folderName] || [];
        const folderLink = companyFolderLinks?.[folderName];
        
        companyCount.textContent = companies.length;
        companyList.innerHTML = '';
        
        if (folderLink) {
            linkedContactFolderSelect.value = folderLink;
        }
        
        if (companies.length > 0) {
            downloadCompaniesExcelButton.style.display = 'block';
            companies.forEach((company, index) => {
                const card = document.createElement('div');
                card.className = 'company-card';
                const orbisHtml = company.orbisName ? `<div class="orbis-name">${currentMessages.orbisLabel}: ${company.orbisName}</div>` : '';
                
                // Generate AI tags
                let aiTagsHtml = '';
                const aiTags = [];
                
                // B2B/B2C Classification tag
                if (company.b2bB2cClassification) {
                    const classification = company.b2bB2cClassification.toLowerCase();
                    aiTags.push(`<span class="ai-tag ${classification}">${company.b2bB2cClassification}</span>`);
                }
                
                // Similarity tag
                if (company.similarityScore !== undefined) {
                    const score = parseInt(company.similarityScore);
                    let similarityClass = 'similarity';
                    if (score >= 70) similarityClass += ' high';
                    else if (score >= 40) similarityClass += ' medium';
                    else similarityClass += ' low';
                    
                    aiTags.push(`<span class="ai-tag ${similarityClass}">${score}%</span>`);
                }
                
                // Create revenue line with AI tags inline
                let revenueWithTags = company.revenue || 'N/A';
                if (aiTags.length > 0) {
                    revenueWithTags += ` <span class="ai-tags-inline">${aiTags.join(' ')}</span>`;
                }
                
                card.innerHTML = `
                    <a href="${company.salesNavigatorLink || company.linkedinLink || '#'}" target="_blank" class="company-logo-link">
                        <img src="${company.logoUrl || 'icon48.png'}" alt="Company Logo" class="company-logo">
                    </a>
                    <div class="company-info">
                        <div class="name">${company.name || 'N/A'}</div>
                        <div class="industry">${company.industry || 'N/A'}</div>
                        <div class="employees">${company.employees || 'N/A'}</div>
                        <div class="revenue">${revenueWithTags}</div>
                        ${orbisHtml}
                    </div>
                    <button class="delete-company" data-index="${index}" title="${currentMessages.deleteCompanyTitle}">×</button>
                `;
                companyList.appendChild(card);
            });
            companyList.querySelectorAll('.delete-company').forEach(btn => {
                btn.addEventListener('click', (e) => removeCompany(folderName, parseInt(e.currentTarget.dataset.index, 10)));
            });
        } else {
            companyList.innerHTML = `<p class="contact-list-message">${currentMessages.noContactsInFolder.replace('contatti', 'aziende')}</p>`;
            downloadCompaniesExcelButton.style.display = 'none';
        }
    }

    async function removeCompany(folderName, index) {
        const { companyFolders } = await chrome.storage.local.get('companyFolders');
        if (!companyFolders?.[folderName]) return;
        companyFolders[folderName].splice(index, 1);
        await chrome.storage.local.set({ companyFolders });
        await loadCompanies(folderName);
    }

    // Company folder event listeners
    createCompanyFolderButton.addEventListener('click', async () => {
        const folderName = companyFolderNameInput.value.trim();
        if (!folderName) { showCompanyNotification(currentMessages.folderNameEmpty, 'error'); return; }
        const { companyFolders } = await chrome.storage.local.get('companyFolders');
        const allCompanyFolders = companyFolders || {};
        if (allCompanyFolders[folderName]) { showCompanyNotification(currentMessages.folderExists, 'error'); return; }
        allCompanyFolders[folderName] = [];
        await chrome.storage.local.set({ companyFolders: allCompanyFolders, selectedCompanyFolder: folderName });
        companyFolderNameInput.value = '';
        showCompanyNotification(currentMessages.folderCreated, 'success');
        await loadCompanyFolders();
    });

    companyFolderSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        if (selectedValue && selectedValue.trim() !== '') {
            await chrome.storage.local.set({ selectedCompanyFolder: selectedValue });
        } else {
            await chrome.storage.local.remove('selectedCompanyFolder');
        }
        await loadCompanies(selectedValue);
    });

    deleteCompanyFolderButton.addEventListener('click', async () => {
        const selectedFolder = companyFolderSelect.value;
        if (!selectedFolder) { showCompanyNotification(currentMessages.selectFolderToDelete, 'error'); return; }
        
        const confirmMessage = currentMessages.confirmDeleteFolder.replace('{folderName}', selectedFolder);
        if (confirm(confirmMessage)) {
            const { companyFolders, companyFolderLinks } = await chrome.storage.local.get(['companyFolders', 'companyFolderLinks']);
            delete companyFolders[selectedFolder];
            if (companyFolderLinks) {
                delete companyFolderLinks[selectedFolder];
                await chrome.storage.local.set({ companyFolderLinks });
            }
            await chrome.storage.local.set({ companyFolders });
            await chrome.storage.local.remove('selectedCompanyFolder');
            showCompanyNotification(currentMessages.folderDeleted, 'success');
            await loadCompanyFolders();
        }
    });

    // Link company folder to contact folder
    linkedContactFolderSelect.addEventListener('change', async (e) => {
        const selectedCompanyFolder = companyFolderSelect.value;
        const selectedContactFolder = e.target.value;
        
        if (selectedCompanyFolder) {
            const { companyFolderLinks } = await chrome.storage.local.get('companyFolderLinks');
            const links = companyFolderLinks || {};
            
            if (selectedContactFolder) {
                links[selectedCompanyFolder] = selectedContactFolder;
            } else {
                delete links[selectedCompanyFolder];
            }
            
            await chrome.storage.local.set({ companyFolderLinks: links });
        }
    });

    // Export companies functionality
    downloadCompaniesExcelButton.addEventListener('click', async () => {
        const { companyFolders, selectedCompanyFolder } = await chrome.storage.local.get(['companyFolders', 'selectedCompanyFolder']);
        const companies = companyFolders?.[selectedCompanyFolder] || [];
        if (companies.length === 0) { showCompanyNotification(currentMessages.noContactsToExport.replace('contatti', 'aziende'), 'error'); return; }
        
        chrome.runtime.sendMessage({
            action: 'exportCompanies',
            payload: { 
                companies, 
                selectedFolder: selectedCompanyFolder
            }
        });
        
        setTimeout(() => window.close(), 1500);
    });

    // Controlla lo stato all'avvio e aggiorna l'UI
    chrome.storage.local.get('exportStatus', ({ exportStatus }) => {
        console.log('POPUP: Current export status on load:', exportStatus);
        setExportButtonState(exportStatus || 'idle');
    });

    // Aggiorna l'UI se lo stato cambia mentre il popup è aperto
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.exportStatus) {
            console.log('POPUP: Export status changed to:', changes.exportStatus.newValue);
            setExportButtonState(changes.exportStatus.newValue);
        }
    });

    // Funzione per aggiornare i conteggi delle chiamate API
    async function updateApiUsageDisplay() {
        const flashCountEl = document.getElementById('flash-usage-count');
        const flashLiteCountEl = document.getElementById('flash-lite-usage-count');
        const proCountEl = document.getElementById('pro-usage-count');
        
        try {
            const { apiUsageStats } = await chrome.storage.local.get('apiUsageStats');
            const today = new Date().toDateString();
            
            if (apiUsageStats && apiUsageStats[today]) {
                const todayStats = apiUsageStats[today];
                flashCountEl.textContent = `${todayStats['gemini-2.5-flash'] || 0}/250`;
                flashLiteCountEl.textContent = `${todayStats['gemini-2.5-flash-lite'] || 0}/1000`;
                proCountEl.textContent = `${todayStats['gemini-2.5-pro'] || 0}/100`;
            } else {
                flashCountEl.textContent = '0/250';
                flashLiteCountEl.textContent = '0/1000';
                proCountEl.textContent = '0/100';
            }
        } catch (error) {
            console.error('POPUP: Error loading API usage stats:', error);
            flashCountEl.textContent = '0/250';
            flashLiteCountEl.textContent = '0/1000';
            proCountEl.textContent = '0/100';
        }
    }

    // Funzione per calcolare la dimensione dei dati in bytes
    function calculateDataSize(obj) {
        return new Blob([JSON.stringify(obj)]).size;
    }

    // Funzione per formattare i bytes in formato leggibile
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Funzione per aggiornare l'indicatore di memoria
    async function updateMemoryIndicator() {
        const memoryFill = document.getElementById('memory-fill');
        const memoryText = document.getElementById('memory-text');
        const memoryContacts = document.getElementById('memory-contacts');
        
        if (!memoryFill || !memoryText || !memoryContacts) return;
        
        try {
            // Ottieni tutti i dati dall'storage
            const allData = await chrome.storage.local.get(null);
            const totalSize = calculateDataSize(allData);
            
            // Conta i contatti totali
            const folders = allData.folders || {};
            const totalContacts = Object.values(folders).reduce((total, contacts) => total + contacts.length, 0);
            
            // Limiti Chrome storage: 10MB per estensione
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB
            const SAFE_THRESHOLD = 0.6;  // 60% = 6MB (sicuro)
            const WARNING_THRESHOLD = 0.8; // 80% = 8MB (attenzione)
            // 80%+ = rischio
            
            const percentage = (totalSize / MAX_SIZE) * 100;
            const usageRatio = totalSize / MAX_SIZE;
            
            // Aggiorna la barra
            memoryFill.style.width = `${Math.min(percentage, 100)}%`;
            
            // Determina il colore in base alle soglie
            memoryFill.className = 'memory-fill';
            if (usageRatio < SAFE_THRESHOLD) {
                memoryFill.classList.add('safe');
            } else if (usageRatio < WARNING_THRESHOLD) {
                memoryFill.classList.add('warning');
            } else {
                memoryFill.classList.add('danger');
            }
            
            // Aggiorna i testi
            memoryText.textContent = `${formatBytes(totalSize)} / ${formatBytes(MAX_SIZE)}`;
            memoryContacts.textContent = `${totalContacts} contatti`;
            
        } catch (error) {
            console.error('POPUP: Error calculating memory usage:', error);
            memoryFill.style.width = '0%';
            memoryText.textContent = '0 B / 10 MB';
            memoryContacts.textContent = '0 contatti';
        }
    }

    // Carica i dati critici immediatamente
    loadFolders();
    
    // Differisce il caricamento delle impostazioni per non bloccare l'UI
    setTimeout(() => {
        chrome.storage.local.get(['geminiApiKey', 'geminiModel'], ({ geminiApiKey, geminiModel }) => {
            if (geminiApiKey) {
                apiKeyInput.placeholder = currentMessages.keyPlaceholderSaved;
            }
            if (geminiModel) {
                modelSelect.value = geminiModel;
                console.log('POPUP: Loaded saved model:', geminiModel);
            } else {
                // Imposta il valore di default se non presente
                modelSelect.value = 'gemini-2.5-flash';
                chrome.storage.local.set({ geminiModel: 'gemini-2.5-flash' });
                console.log('POPUP: Set default model: gemini-2.5-flash');
            }
        });
        
        // Carica e mostra i conteggi API in background
        updateApiUsageDisplay();
        
        // Aggiorna l'indicatore di memoria
        updateMemoryIndicator();
    }, 10);
    
    // Aggiorna i conteggi quando cambiano nello storage
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.apiUsageStats) {
                updateApiUsageDisplay();
            }
            // Aggiorna memoria quando cambiano cartelle o contatti
            if (changes.folders || changes.selectedFolder) {
                updateMemoryIndicator();
            }
        }
    });
    
    // Listener per il bottone di esportazione log
    exportLogsBtn.addEventListener('click', async () => {
        try {
            exportLogsBtn.disabled = true;
            exportLogsBtn.textContent = '⏳ Esportando...';
            
            // Timeout per evitare attese infinite
            const messagePromise = chrome.runtime.sendMessage({ action: 'exportLogs' });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            const response = await Promise.race([messagePromise, timeoutPromise]);
            
            if (response && response.success) {
                showNotification(currentMessages.logsExported, 'success');
            } else {
                showNotification(currentMessages.logsExportError + (response?.error ? ' ' + response.error : ''), 'error');
            }
        } catch (error) {
            if (error.message.includes('message port closed') || error.message.includes('Timeout')) {
                // Il popup si è chiuso, ma l'operazione potrebbe essere completata
                console.log('Popup closed during export, operation may still complete');
            } else {
                showNotification(currentMessages.logsExportError + ' ' + error.message, 'error');
            }
        } finally {
            exportLogsBtn.disabled = false;
            exportLogsBtn.textContent = currentMessages.exportLogsBtn;
        }
    });
    
    // Listener per il bottone di pulizia log
    clearLogsBtn.addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler cancellare tutti i log? Questa azione non può essere annullata.')) {
            return;
        }
        
        try {
            clearLogsBtn.disabled = true;
            clearLogsBtn.textContent = '⏳ Pulendo...';
            
            // Timeout per evitare attese infinite
            const messagePromise = chrome.runtime.sendMessage({ action: 'clearLogs' });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const response = await Promise.race([messagePromise, timeoutPromise]);
            
            if (response && response.success) {
                showNotification(currentMessages.logsCleared, 'success');
            } else {
                showNotification('Errore nella cancellazione dei log.', 'error');
            }
        } catch (error) {
            if (error.message.includes('message port closed') || error.message.includes('Timeout')) {
                // Il popup si è chiuso, ma l'operazione potrebbe essere completata
                console.log('Popup closed during clear, operation may still complete');
            } else {
                showNotification('Errore nella cancellazione dei log: ' + error.message, 'error');
            }
        } finally {
            clearLogsBtn.disabled = false;
            clearLogsBtn.textContent = currentMessages.clearLogsBtn;
        }
    });

    // Load target companies data on startup
    loadTargetCompanies();
    
    // Load AI model settings
    loadAIModelSettings();
    
}