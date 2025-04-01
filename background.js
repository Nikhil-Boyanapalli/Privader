// Import configuration
import config from './config.js';

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Google Safe Browsing API configuration
const SAFE_BROWSING_API_KEY = config.SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

// Function to check URL against Google Safe Browsing API
async function checkUrlWithSafeBrowsing(url) {
  try {
    const response = await fetch(`${SAFE_BROWSING_API_URL}?key=${SAFE_BROWSING_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          clientId: 'privader-web-security',
          clientVersion: '1.0.0'
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION'
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Safe Browsing API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.matches ? data.matches : [];
  } catch (error) {
    console.error('Safe Browsing API error:', error);
    return null;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    // Check if site is trusted first
    checkTrustedSite(sender.tab.url).then(isTrusted => {
      if (!isTrusted) {
        // Open the popup programmatically
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 400,
          height: 600,
          focused: true
        });
      }
    });
  } else if (message.action === 'trustSite') {
    // Add site to trusted sites
    addTrustedSite(message.url);
    sendResponse({ success: true });
  } else if (message.action === 'checkTrustedSite') {
    // Check if site is trusted
    checkTrustedSite(message.url).then(isTrusted => {
      sendResponse({ trusted: isTrusted });
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'checkSafety') {
    // Check site safety
    checkSiteSafety(message.url).then(safety => {
      sendResponse({ safety });
    });
    return true; // Keep the message channel open for async response
  }
  return true;
});

// Function to validate URL
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// Function to check site safety
async function checkSiteSafety(url) {
  try {
    // Handle empty or invalid URLs
    if (!url || typeof url !== 'string') {
      return {
        status: 'Error',
        level: 'warning',
        details: 'Invalid URL provided'
      };
    }

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Validate URL
    if (!isValidUrl(url)) {
      return {
        status: 'Error',
        level: 'warning',
        details: 'Invalid URL format'
      };
    }

    const urlObj = new URL(url);
    const isSecure = urlObj.protocol === 'https:';
    
    // Check with Google Safe Browsing API
    const threats = await checkUrlWithSafeBrowsing(url);
    
    if (threats === null) {
      // API error, fallback to basic check
      if (!isSecure) {
        return {
          status: 'Warning',
          level: 'warning',
          details: 'Site does not use HTTPS'
        };
      }
      return {
        status: 'Unknown',
        level: 'warning',
        details: 'Could not verify site safety'
      };
    }
    
    if (threats.length > 0) {
      // Site has threats
      const threatTypes = threats.map(t => t.threatType).join(', ');
      return {
        status: 'Unsafe',
        level: 'danger',
        details: `Site flagged for: ${threatTypes}`
      };
    }
    
    // Site is safe
    return {
      status: 'Safe',
      level: 'safe',
      details: 'No threats detected'
    };

  } catch (error) {
    console.error('Error checking site safety:', error);
    return {
      status: 'Error',
      level: 'warning',
      details: 'Could not check site safety'
    };
  }
}

// Function to check if a site is trusted
async function checkTrustedSite(url) {
  try {
    const hostname = new URL(url).hostname;
    const { trustedSites = [] } = await chrome.storage.local.get('trustedSites');
    return trustedSites.includes(hostname);
  } catch (error) {
    console.error('Error checking trusted site:', error);
    return false;
  }
}

// Function to add a site to trusted sites
async function addTrustedSite(url) {
  try {
    const hostname = new URL(url).hostname;
    const { trustedSites = [] } = await chrome.storage.local.get('trustedSites');
    if (!trustedSites.includes(hostname)) {
      trustedSites.push(hostname);
      await chrome.storage.local.set({ trustedSites });
    }
  } catch (error) {
    console.error('Error adding trusted site:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPasswordTester' && message.password) {
    // Check if site is trusted first
    checkTrustedSite(sender.tab.url).then(isTrusted => {
      if (!isTrusted) {
        // Store the password temporarily
        chrome.storage.local.set({
          pendingPasswordTest: {
            password: message.password,
            timestamp: Date.now()
          }
        }, () => {
          // Open the default popup
          chrome.action.openPopup();
        });
      }
    });
  }
});

// Monitor for privacy concerns
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Only check main frame
    const tab = await chrome.tabs.get(details.tabId);
    
    // Check site safety
    const siteSafety = await checkSiteSafety(tab.url);
    
    // Check for privacy policy
    try {
      const url = new URL(tab.url);
      const privacyPolicyUrl = `${url.origin}/privacy-policy`;
      const response = await fetch(privacyPolicyUrl);
      if (response.ok) {
        const text = await response.text();
        analyzePrivacyPolicy(text, url.hostname);
      }
    } catch (error) {
      console.log('No privacy policy found');
    }
  }
});

// Monitor for downloads
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  if (downloadItem.danger === 'safe') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Privader Web Security',
      message: `A file is being downloaded from ${downloadItem.url}`
    });
  }
});

// Keep track of recent warnings to prevent duplicates
let recentWarnings = new Map();
const WARNING_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

// Function to store a new warning
async function storeWarning(domain, type, message) {
  const now = Date.now();
  const warningKey = `${domain}-${type}`;
  
  // Check if we've recently stored this warning
  if (!recentWarnings.has(warningKey) || 
      (now - recentWarnings.get(warningKey)) > WARNING_COOLDOWN) {
    
    // Update the recent warnings tracker
    recentWarnings.set(warningKey, now);
    
    // Clean up old entries
    for (const [key, time] of recentWarnings.entries()) {
      if (now - time > WARNING_COOLDOWN) {
        recentWarnings.delete(key);
      }
    }
    
    // Get existing warnings
    const { privacyWarnings = [] } = await chrome.storage.local.get('privacyWarnings');
    
    // Add new warning
    const newWarning = {
      domain,
      type,
      message,
      timestamp: now
    };
    
    // Keep only the last 50 warnings
    const updatedWarnings = [newWarning, ...privacyWarnings].slice(0, 50);
    
    // Store updated warnings
    await chrome.storage.local.set({ privacyWarnings: updatedWarnings });
  }
}

// Monitor for web requests
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.type === 'xmlhttprequest') {
      const url = new URL(details.url);
      const hostname = url.hostname;
      
      if (url.searchParams.toString().length > 100) {
        await storeWarning(
          hostname,
          'data_collection',
          `Large amount of data being sent to ${hostname}`
        );
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Function to analyze privacy policy
async function analyzePrivacyPolicy(text, domain) {
  const concerns = [];
  
  // Check for invasive terms
  const invasiveTerms = [
    'third-party sharing',
    'data collection',
    'tracking',
    'cookies',
    'advertising',
    'analytics',
    'personal information',
    'data retention',
    'data transfer',
    'user data'
  ];

  const lowerText = text.toLowerCase();
  invasiveTerms.forEach(term => {
    if (lowerText.includes(term)) {
      concerns.push(`Found mention of "${term}" in privacy policy`);
    }
  });

  // Check for one-sided terms
  const oneSidedTerms = [
    'we reserve the right',
    'without notice',
    'at our discretion',
    'may change',
    'can modify',
    'without consent'
  ];

  oneSidedTerms.forEach(term => {
    if (lowerText.includes(term)) {
      concerns.push(`Found potentially one-sided term: "${term}"`);
    }
  });

  // If concerns found, store them
  if (concerns.length > 0) {
    await storeWarning(
      domain,
      'privacy_policy',
      `Found ${concerns.length} potential privacy concerns`
    );
    
    // Store detailed concerns
    concerns.forEach(async (concern) => {
      await storeWarning(domain, 'privacy_detail', concern);
    });
  }
}

// Helper function to check SSL certificate
async function checkSSLCertificate(hostname) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`https://${hostname}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('SSL check error:', error);
    return false;
  }
}
