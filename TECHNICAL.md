# Technical Documentation

## Architecture Overview

The LinkedIn Lead Extension follows a modular Chrome extension architecture with clear separation of concerns:

### Core Components

#### 1. Service Worker (`background.js`)
- **Purpose**: AI processing, data management, and business logic
- **Key Features**:
  - AI model integration (Gemini and local models)
  - Rate limiting and caching
  - Excel export generation
  - Persistent logging system
  - Storage management

#### 2. Content Script (`content.js`)
- **Purpose**: LinkedIn page interaction and data extraction
- **Key Features**:
  - DOM manipulation and data extraction
  - UI injection for extension controls
  - Real-time user feedback
  - Error handling and recovery

#### 3. Popup Interface (`popup.js` + `popup.html`)
- **Purpose**: User interface and configuration
- **Key Features**:
  - Settings management
  - Folder organization
  - Export configuration
  - API usage monitoring

## AI Model Integration

### Supported AI Providers

#### Google Gemini (Primary)
```javascript
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Request format
{
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.1,
    maxOutputTokens: 65536
  }
}
```

#### Local Models (Ollama)
```javascript
const API_URL = 'http://localhost:11434/v1/chat/completions';

// Request format (OpenAI-compatible)
{
  model: "llama2",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.1,
  max_tokens: 4096
}
```

#### Local Models (LocalAI)
```javascript
const API_URL = 'http://localhost:8080/v1/completions';

// Request format
{
  model: "gpt-3.5-turbo",
  prompt: prompt,
  temperature: 0.1,
  max_tokens: 4096
}
```

### Rate Limiting Implementation

The extension implements sophisticated rate limiting to respect API constraints:

```javascript
class RateLimiter {
  constructor() {
    this.calls = {
      'gemini-2.5-flash': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() },
      'gemini-2.5-flash-lite': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() },
      'gemini-2.5-pro': { requests: [], dailyCount: 0, lastReset: new Date().toDateString() }
    };
  }

  async waitForSlot(model) {
    const limits = {
      'gemini-2.5-flash': { rpm: 10, rpd: 250 },
      'gemini-2.5-flash-lite': { rpm: 15, rpd: 1000 },
      'gemini-2.5-pro': { rpm: 5, rpd: 100 }
    };
    
    // Implementation details in background.js
  }
}
```

### Caching Strategy

The extension implements intelligent caching to reduce API calls:

```javascript
class ApiResultsCache {
  // Caches domain resolution results for 7 days
  async saveDomainResults(companyNames, results) {
    const cache = {
      domains: {},
      names: {},
      lastCleanup: Date.now()
    };
    
    companyNames.forEach(company => {
      if (results[company]) {
        cache.domains[company] = {
          result: results[company],
          timestamp: Date.now()
        };
      }
    });
  }
}
```

## Data Extraction

### LinkedIn Selectors

The extension uses robust CSS selectors to extract data from LinkedIn pages:

```javascript
// Profile extraction
const profileSelectors = {
  name: '.text-heading-xlarge, .pv-text-details__left-panel h1',
  title: '.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium',
  company: '.pv-text-details__right-panel .inline-show-more-text',
  location: '.text-body-small.inline.t-black--light.break-words',
  image: '.pv-top-card-profile-picture__image--show, .profile-photo-edit__preview'
};

// Search result extraction
const searchSelectors = {
  container: '.entity-result__item, .search-result__wrapper',
  name: '.entity-result__title-text a span[aria-hidden="true"]',
  title: '.entity-result__primary-subtitle',
  company: '.entity-result__secondary-subtitle'
};
```

### Data Validation

All extracted data goes through validation:

```javascript
function validateContactData(contact) {
  const required = ['personName'];
  const valid = required.every(field => contact[field] && contact[field].trim());
  
  if (!valid) {
    console.warn('Invalid contact data:', contact);
    return false;
  }
  
  return true;
}
```

## Storage Architecture

### Chrome Storage Usage

The extension uses Chrome's local storage with careful space management:

```javascript
// Storage structure
{
  folders: {
    "Folder Name": [
      {
        personName: "John Doe",
        jobTitle: "Software Engineer",
        companyName: "Tech Corp",
        location: "San Francisco",
        profileLink: "https://linkedin.com/in/johndoe",
        profileImage: "https://media.licdn.com/...",
        // ... additional fields
      }
    ]
  },
  companyFolders: {
    "Company Folder": [
      {
        name: "Tech Corp",
        domain: "techcorp.com",
        industry: "Technology",
        employees: "1000-5000",
        // ... additional fields
      }
    ]
  },
  settings: {
    language: "en",
    geminiApiKey: "encrypted_key",
    geminiModel: "gemini-2.5-flash"
  }
}
```

### Memory Optimization

The extension includes memory monitoring:

```javascript
async function updateMemoryIndicator() {
  const allData = await chrome.storage.local.get(null);
  const totalSize = new Blob([JSON.stringify(allData)]).size;
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB Chrome limit
  
  const percentage = (totalSize / MAX_SIZE) * 100;
  
  // Update UI indicators based on usage
  if (percentage > 80) {
    // Show warning
  }
}
```

## Security Considerations

### API Key Protection

API keys are stored securely in Chrome's local storage:

```javascript
// Keys are never logged or exposed in console
async function saveApiKey(apiKey) {
  await chrome.storage.local.set({ 
    geminiApiKey: apiKey // Chrome storage is encrypted
  });
}
```

### Content Security Policy

The extension follows strict CSP guidelines:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Data Privacy

- All data is stored locally in the user's browser
- No data is sent to third-party servers except AI APIs
- Users control their data export and deletion
- Optional local AI processing for complete privacy

## Error Handling

### Graceful Degradation

The extension handles various error conditions:

```javascript
async function safeExtensionCall(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      // Attempt recovery or show user-friendly message
      return fallback ? await fallback() : null;
    }
    throw error;
  }
}
```

### Retry Mechanisms

API calls include intelligent retry logic:

```javascript
async function callApi(prompt, apiKey, model, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000];
  
  try {
    // API call implementation
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
      return callApi(prompt, apiKey, model, retryCount + 1);
    }
    throw error;
  }
}
```

## Performance Optimization

### Chunked Processing

Large datasets are processed in chunks to prevent timeouts:

```javascript
async function processInChunks(items, chunkSize = 50) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    await processChunk(chunk);
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### Efficient DOM Queries

Content script uses efficient DOM querying:

```javascript
// Cache selectors to avoid repeated queries
const selectors = {
  contactCards: document.querySelectorAll('.entity-result__item'),
  // ... other cached elements
};

// Use event delegation for dynamic content
document.addEventListener('click', (event) => {
  if (event.target.matches('.extraction-button')) {
    // Handle click
  }
});
```

## Testing Guidelines

### Manual Testing Checklist

1. **LinkedIn Page Compatibility**
   - Profile pages
   - Search results
   - Company pages
   - Different LinkedIn layouts

2. **AI Model Testing**
   - Gemini 2.5 Flash
   - Gemini 2.5 Pro
   - Local model integration
   - Rate limiting behavior

3. **Data Integrity**
   - Contact extraction accuracy
   - Company data validation
   - Export file format
   - Storage limits

4. **Error Scenarios**
   - Network failures
   - Invalid API keys
   - Storage quota exceeded
   - Extension context invalidation

### Performance Testing

```javascript
// Measure extraction performance
console.time('contact-extraction');
const contacts = await extractContactsFromPage();
console.timeEnd('contact-extraction');

// Monitor memory usage
const memoryInfo = await chrome.system.memory.getInfo();
console.log('Memory usage:', memoryInfo);
```

## Deployment

### Pre-deployment Checklist

1. **Code Quality**
   - [ ] All functions documented
   - [ ] No console.log statements in production
   - [ ] Error handling in place
   - [ ] Rate limiting configured

2. **Security**
   - [ ] No hardcoded API keys
   - [ ] CSP properly configured
   - [ ] Permissions minimized
   - [ ] Data validation implemented

3. **Functionality**
   - [ ] All LinkedIn page types tested
   - [ ] AI models working correctly
   - [ ] Export functionality verified
   - [ ] Error recovery tested

### Build Process

No build process required - the extension runs directly from source files.

### Chrome Web Store Preparation

1. Create store listing with screenshots
2. Prepare privacy policy
3. Test on multiple Chrome versions
4. Validate manifest.json
5. Review permissions usage

## Maintenance

### Regular Updates

- **LinkedIn Layout Changes**: Monitor for UI updates
- **AI Model Updates**: Keep up with Gemini API changes
- **Chrome API Changes**: Update for new extension APIs
- **Security Patches**: Regular security reviews

### Monitoring

- **Error Tracking**: Monitor console errors and user reports
- **Performance Metrics**: Track extraction speed and success rates
- **API Usage**: Monitor rate limiting and quota usage
- **User Feedback**: Collect and analyze user feedback

## Contributing

### Development Setup

1. Clone repository
2. Load unpacked extension in Chrome
3. Make changes to source files
4. Reload extension in Chrome
5. Test thoroughly

### Code Style

- Use consistent indentation (2 spaces)
- Comment complex functions
- Follow JSDoc standards
- Use descriptive variable names
- Implement proper error handling

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with description