// Global popup state
let isPopupVisible = false;
let hasUserContinued = false;  // Track if user has clicked continue in this session

// Function to check if a site is trusted
async function checkSiteTrust(domain) {
  try {
    const result = await chrome.storage.local.get('trustedSites');
    return result.trustedSites && result.trustedSites[domain] !== undefined;
  } catch (error) {
    console.error('Error checking site trust:', error);
    return false;
  }
}

// Function to save trusted site
async function saveTrustedSite(domain) {
  try {
    const result = await chrome.storage.local.get('trustedSites');
    const trustedSites = result.trustedSites || {};
    trustedSites[domain] = {
      dateAdded: Date.now()
    };
    await chrome.storage.local.set({ trustedSites });
    console.log('Site saved as trusted:', domain);
  } catch (error) {
    console.error('Error saving trusted site:', error);
  }
}

// Function to show site trust prompt
function showSiteTrustPrompt(domain) {
  if (isPopupVisible || hasUserContinued) return;  // Don't show if already visible or user has continued
  isPopupVisible = true;
  
  const prompt = document.createElement('div');
  prompt.className = 'owasp-trust-prompt';
  prompt.innerHTML = `
    <div class="owasp-trust-content">
      <h3>Site Security Check</h3>
      <p>You're about to enter a password on ${domain}.</p>
      <div class="owasp-trust-actions">
        <button class="owasp-trust-check">Continue</button>
        <label>
          <input type="checkbox" class="owasp-trust-remember"> Don't ask again for this site
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(prompt);

  // Handle button clicks
  prompt.querySelector('.owasp-trust-check').addEventListener('click', async () => {
    const remember = prompt.querySelector('.owasp-trust-remember').checked;
    if (remember) {
      await saveTrustedSite(domain);
    }
    hasUserContinued = true;  // Set the flag when user clicks continue
    isPopupVisible = false;
    prompt.remove();
  });
}

// Monitor password fields
function monitorPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  passwordFields.forEach(field => {
    field.addEventListener('focus', async () => {
      if (hasUserContinued) return;  // Don't show popup if user has already continued
      
      const domain = window.location.hostname;
      const isTrusted = await checkSiteTrust(domain);
      
      if (!isTrusted) {
        showSiteTrustPrompt(domain);
      }
    });

    // Add click handler for the test password button
    field.addEventListener('click', (e) => {
      if (hasUserContinued) return;  // Don't show popup if user has already continued
      
      const testButton = e.target.closest('.owasp-test-button');
      if (testButton) {
        hasUserContinued = true;  // Set the flag when user clicks test button
        const password = field.value;
        if (password) {
          chrome.runtime.sendMessage({
            action: 'openPasswordTester',
            password: password
          });
        }
      }
    });
  });
}

// Start monitoring
monitorPasswordFields();

// Store username in session storage for multi-page forms
document.addEventListener('input', function(e) {
  if (e.target.type === 'text' || e.target.type === 'email') {
    const inputValue = e.target.value;
    // Check if this looks like a username/email field
    if (e.target.name.toLowerCase().includes('user') || 
        e.target.name.toLowerCase().includes('email') ||
        e.target.id.toLowerCase().includes('user') ||
        e.target.id.toLowerCase().includes('email')) {
      // Store the username/email temporarily
      sessionStorage.setItem('privader_temp_username', inputValue);
    }
  }
});

// Listen for password input changes
document.addEventListener('input', function(e) {
  if (e.target.type === 'password') {
    handlePasswordInput(e.target);
  }
});

// Function to handle password input
async function handlePasswordInput(input) {
  const domain = window.location.hostname;
  
  // Check if site is already trusted
  const isTrusted = await checkSiteTrust(domain);
  if (isTrusted) {
    return;
  }

  // Get stored username if available
  const storedUsername = sessionStorage.getItem('privader_temp_username') || '';

  // Create security check dialog
  const dialog = document.createElement('div');
  dialog.className = 'security-check-dialog';
  dialog.innerHTML = `
    <div class="security-check-content">
      <h2>Site Security Check</h2>
      <p>You're about to enter a password on ${domain}.</p>
      ${storedUsername ? `<p>Associated username/email: ${storedUsername}</p>` : ''}
      <button id="continueBtn">Continue</button>
      <div class="trust-option">
        <input type="checkbox" id="trustSite">
        <label for="trustSite">Don't ask again for this site</label>
      </div>
    </div>
  `;

  // Add dialog styles
  const styles = document.createElement('style');
  styles.textContent = `
    .security-check-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 999999;
      color: #e0e0e0;
    }
    .security-check-content {
      text-align: center;
    }
    .security-check-content h2 {
      margin-top: 0;
      color: #2196f3;
    }
    .security-check-content p {
      margin: 10px 0;
      color: #e0e0e0;
    }
    .security-check-content button {
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 0;
    }
    .security-check-content button:hover {
      background: #1976d2;
    }
    .trust-option {
      margin-top: 10px;
    }
    .trust-option label {
      margin-left: 8px;
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(dialog);

  // Handle continue button click
  const continueBtn = dialog.querySelector('#continueBtn');
  const trustCheckbox = dialog.querySelector('#trustSite');

  continueBtn.addEventListener('click', async () => {
    if (trustCheckbox.checked) {
      // Save site as trusted
      await saveTrustedSite(domain);
    }
    dialog.remove();
    // Send password and username to extension for testing
    chrome.runtime.sendMessage({
      action: 'openPasswordTester',
      password: input.value,
      username: storedUsername
    });
    // Clear stored username after use
    sessionStorage.removeItem('privader_temp_username');
  });
}

// Function to check if site is trusted
async function checkTrustedSite(url) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkTrustedSite',
      url: url
    });
    return response.trusted;
  } catch (error) {
    console.error('Error checking trusted site:', error);
    return false;
  }
}

// Enhanced tracker patterns
const TRACKER_PATTERNS = {
  analytics: [
    { name: 'Google Analytics', pattern: /google-analytics\.com|googletagmanager\.com/ },
    { name: 'Facebook Pixel', pattern: /connect\.facebook\.net|facebook\.com\/tr/ },
    { name: 'Mixpanel', pattern: /api\.mixpanel\.com/ },
    { name: 'Hotjar', pattern: /hotjar\.com/ },
    { name: 'Segment', pattern: /segment\.com|segment\.io/ }
  ],
  advertising: [
    { name: 'Google Ads', pattern: /doubleclick\.net|googlesyndication\.com/ },
    { name: 'Facebook Ads', pattern: /facebook\.com\/audience/ },
    { name: 'AdRoll', pattern: /adroll\.com/ },
    { name: 'Twitter Ads', pattern: /static\.ads-twitter\.com/ },
    { name: 'Amazon Ads', pattern: /amazon-adsystem\.com/ }
  ],
  fingerprinting: [
    { name: 'Canvas Fingerprinting', pattern: /\.toDataURL|\.getImageData/ },
    { name: 'WebGL Fingerprinting', pattern: /\.getParameter|\.getSupportedExtensions/ },
    { name: 'Audio Fingerprinting', pattern: /\.createOscillator|\.createAnalyser/ },
    { name: 'Font Fingerprinting', pattern: /document\.fonts|@font-face/ }
  ],
  session: [
    { name: 'Session Recording', pattern: /\.sessionstack\.com|\.hotjar\.com\/rec/ },
    { name: 'Heatmap Tracking', pattern: /\.crazyegg\.com|\.mouseflow\.com/ }
  ]
};

// Enhanced tracker detection
async function detectTrackers() {
  const trackers = {
    analytics: [],
    advertising: [],
    fingerprinting: [],
    session: []
  };

  // Check script sources
  document.querySelectorAll('script').forEach(script => {
    const src = script.src;
    if (src) {
      Object.entries(TRACKER_PATTERNS).forEach(([category, patterns]) => {
        patterns.forEach(({ name, pattern }) => {
          if (pattern.test(src)) {
            trackers[category].push({
              name,
              source: src,
              type: 'script'
            });
          }
        });
      });
    }
  });

  // Check image pixels
  document.querySelectorAll('img').forEach(img => {
    const src = img.src;
    if (src && img.width <= 1 && img.height <= 1) {
      Object.entries(TRACKER_PATTERNS).forEach(([category, patterns]) => {
        patterns.forEach(({ name, pattern }) => {
          if (pattern.test(src)) {
            trackers[category].push({
              name,
              source: src,
              type: 'pixel'
            });
          }
        });
      });
    }
  });

  // Check localStorage
  Object.keys(localStorage).forEach(key => {
    Object.entries(TRACKER_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(({ name, pattern }) => {
        if (pattern.test(key)) {
          trackers[category].push({
            name,
            source: key,
            type: 'localStorage'
          });
        }
      });
    });
  });

  // Check cookies
  document.cookie.split(';').forEach(cookie => {
    Object.entries(TRACKER_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(({ name, pattern }) => {
        if (pattern.test(cookie)) {
          trackers[category].push({
            name,
            source: cookie.split('=')[0].trim(),
            type: 'cookie'
          });
        }
      });
    });
  });

  // Monitor network requests
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      const url = entry.name;
      Object.entries(TRACKER_PATTERNS).forEach(([category, patterns]) => {
        patterns.forEach(({ name, pattern }) => {
          if (pattern.test(url)) {
            trackers[category].push({
              name,
              source: url,
              type: 'network'
            });
          }
        });
      });
    });
  });

  observer.observe({ entryTypes: ['resource'] });

  // Check for fingerprinting attempts
  const fingerprintingAttempts = detectFingerprintingAttempts();
  if (fingerprintingAttempts.length > 0) {
    trackers.fingerprinting.push(...fingerprintingAttempts);
  }

  return {
    trackers,
    summary: {
      total: Object.values(trackers).reduce((sum, arr) => sum + arr.length, 0),
      byCategory: Object.fromEntries(
        Object.entries(trackers).map(([category, items]) => [category, items.length])
      )
    }
  };
}

// Detect fingerprinting attempts
function detectFingerprintingAttempts() {
  const attempts = [];
  const originalMethods = {
    canvas: HTMLCanvasElement.prototype.toDataURL,
    webgl: WebGLRenderingContext.prototype.getParameter,
    audio: AudioContext.prototype.createOscillator
  };

  // Monitor canvas fingerprinting
  HTMLCanvasElement.prototype.toDataURL = function() {
    attempts.push({
      name: 'Canvas Fingerprinting',
      source: document.currentScript?.src || 'inline script',
      type: 'fingerprinting',
      method: 'canvas.toDataURL'
    });
    return originalMethods.canvas.apply(this, arguments);
  };

  // Monitor WebGL fingerprinting
  WebGLRenderingContext.prototype.getParameter = function() {
    attempts.push({
      name: 'WebGL Fingerprinting',
      source: document.currentScript?.src || 'inline script',
      type: 'fingerprinting',
      method: 'webgl.getParameter'
    });
    return originalMethods.webgl.apply(this, arguments);
  };

  // Monitor audio fingerprinting
  if (typeof AudioContext !== 'undefined') {
    AudioContext.prototype.createOscillator = function() {
      attempts.push({
        name: 'Audio Fingerprinting',
        source: document.currentScript?.src || 'inline script',
        type: 'fingerprinting',
        method: 'audio.createOscillator'
      });
      return originalMethods.audio.apply(this, arguments);
    };
  }

  return attempts;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkTrackers') {
    detectTrackers().then(results => {
      sendResponse(results);
    });
    return true; // Keep the message channel open for async response
  }
});

// Start monitoring immediately
detectTrackers().then(results => {
  // Send initial results to background script
  chrome.runtime.sendMessage({
    action: 'trackersDetected',
    results
  });
}); 