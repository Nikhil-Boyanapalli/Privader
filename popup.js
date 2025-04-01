// Import the policy analyzer
import { analyzePrivacyPolicy } from './policy-analyzer.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Initialize privacy status elements
  const siteSafety = document.getElementById('site-safety');
  const dataCollection = document.getElementById('data-collection');
  const privacyPolicy = document.getElementById('privacy-policy');
  const policyResults = document.getElementById('policy-results');
  const analyzeButton = document.getElementById('analyze-policy');
  const riskIndicator = document.getElementById('risk-indicator');
  const highRiskCount = document.getElementById('high-risk-count');
  const mediumRiskCount = document.getElementById('medium-risk-count');
  const lowRiskCount = document.getElementById('low-risk-count');
  const policyConcerns = document.getElementById('policy-concerns');
  
  // Function to update policy results
  function updatePolicyResults(analysis) {
    const riskIndicator = document.getElementById('risk-indicator');
    const highRiskCount = document.getElementById('high-risk-count');
    const mediumRiskCount = document.getElementById('medium-risk-count');
    const lowRiskCount = document.getElementById('low-risk-count');
    const concernsList = document.getElementById('policy-concerns');

    // Show the results section
    policyResults.style.display = 'block';

    // Update risk indicator
    riskIndicator.textContent = analysis.overallRisk;
    riskIndicator.className = `risk-indicator ${analysis.overallRisk.toLowerCase()}`;

    // Update risk counts
    highRiskCount.textContent = analysis.findings.high_risk.length;
    mediumRiskCount.textContent = analysis.findings.medium_risk.length;
    lowRiskCount.textContent = analysis.findings.low_risk.length;

    // Clear existing concerns
    concernsList.innerHTML = '';

    // Function to create a risk section
    function createRiskSection(riskLevel, findings) {
      if (findings.length === 0) return '';
      
      return `
        <div class="risk-section">
          <div class="risk-header ${riskLevel.toLowerCase()}">
            <span>${riskLevel} Risk Concerns</span>
            <span>${findings.length} found</span>
          </div>
          <div class="risk-content">
            ${findings.map(finding => `
              <div class="concern-item">
                <div class="concern-type">${finding.type}</div>
                <div class="concern-context">${finding.context}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // If no concerns found
    if (Object.values(analysis.findings).every(arr => arr.length === 0)) {
      concernsList.innerHTML = '<div class="no-concerns">No privacy concerns detected</div>';
      return;
    }

    // Add concerns by risk level
    const concernsHtml = [
      createRiskSection('High', analysis.findings.high_risk),
      createRiskSection('Medium', analysis.findings.medium_risk),
      createRiskSection('Low', analysis.findings.low_risk)
    ].join('');

    concernsList.innerHTML = concernsHtml;
  }
  
  // Function to update status elements with appropriate styling
  function updateStatusElement(element, status) {
    if (!element) return;
    
    element.textContent = status.status;
    element.className = `status-indicator ${status.level}`;
    element.title = status.details;
  }

  // Function to check data collection
  async function checkDataCollection(hostname) {
    try {
      // Get recent warnings for this domain
      const { privacyWarnings = [] } = await chrome.storage.local.get('privacyWarnings');
      const domainWarnings = privacyWarnings.filter(w => w.domain === hostname);
      
      if (domainWarnings.length > 0) {
        return {
          status: 'Warning',
          level: 'warning',
          details: `Found ${domainWarnings.length} data collection warnings`
        };
      }
      
      return {
        status: 'Safe',
        level: 'safe',
        details: 'No suspicious data collection detected'
      };
    } catch (error) {
      console.error('Error checking data collection:', error);
      return {
        status: 'Error',
        level: 'warning',
        details: 'Could not check data collection'
      };
    }
  }

  // Function to update privacy status
  function updatePrivacyStatus(status) {
    updateStatusElement(siteSafety, status.siteSafety);
    updateStatusElement(dataCollection, status.dataCollection);
  }
  
  // Get current tab and check privacy immediately
  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      try {
        const url = new URL(tab.url);
        
        // Update status while checking
        siteSafety.textContent = 'Checking...';
        dataCollection.textContent = 'Checking...';
        
        // Send message to background script to check site safety
        chrome.runtime.sendMessage(
          { action: 'checkSafety', url: tab.url },
          async (response) => {
            if (response && response.safety) {
              const dataStatus = await checkDataCollection(url.hostname);
              updatePrivacyStatus({
                siteSafety: response.safety,
                dataCollection: dataStatus
              });
            } else {
              updatePrivacyStatus({
                siteSafety: { 
                  status: 'Error', 
                  level: 'warning', 
                  details: 'Could not check site safety' 
                },
                dataCollection: { 
                  status: 'Error', 
                  level: 'warning', 
                  details: 'Could not check data collection' 
                }
              });
            }
          }
        );

        // Check for privacy policy
        if (analyzeButton) {
          analyzeButton.addEventListener('click', async () => {
            try {
              const privacyPolicy = document.getElementById('privacy-policy');
              const policyResults = document.getElementById('policy-results');
              
              if (!privacyPolicy || !policyResults) {
                console.error('Required elements not found');
                return;
              }

              privacyPolicy.textContent = 'Analyzing...';
              const tabs = await chrome.tabs.query({active: true, currentWindow: true});
              const tab = tabs[0];
              const url = new URL(tab.url);
              
              // Find privacy policy link
              const policyUrl = await findPrivacyPolicyLink(url.origin);
              if (!policyUrl) {
                throw new Error('Privacy policy not found');
              }

              // Fetch and analyze policy
              const policyText = await fetchPolicyContent(policyUrl);
              const analysis = analyzePrivacyPolicy(policyText);
              
              // Update results
              privacyPolicy.textContent = `Found ${analysis.summary.total_concerns} privacy concerns`;
              updatePolicyResults(analysis);
              
              // Store the analysis result
              await chrome.storage.local.set({
                [`policyAnalysis_${url.hostname}`]: {
                  timestamp: Date.now(),
                  analysis
                }
              });
              
            } catch (error) {
              console.error('Error analyzing privacy policy:', error);
              const privacyPolicy = document.getElementById('privacy-policy');
              const policyResults = document.getElementById('policy-results');
              
              if (privacyPolicy) {
                privacyPolicy.textContent = 'Analysis failed';
              }
              if (policyResults) {
                policyResults.style.display = 'block';
                policyResults.innerHTML = `<div class="error-message">Could not analyze privacy policy: ${error.message}</div>`;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking privacy:', error);
        updatePrivacyStatus({
          siteSafety: { status: 'Error', level: 'warning', details: 'Check failed' },
          dataCollection: { status: 'Error', level: 'warning', details: 'Check failed' }
        });
      }
    }
  });

  // Initialize password testing elements
  const passwordInput = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const strengthBar = document.getElementById('strengthBar');
  const resultDiv = document.getElementById('result');
  const requirementsDiv = document.getElementById('requirements');
  const crackTimeDiv = document.getElementById('crackTime');
  const testButton = document.getElementById('test-button');
  const strengthIndicator = document.getElementById('strength-indicator');
  const feedbackList = document.getElementById('feedback-list');
  const requirementsList = document.getElementById('requirements-list');

  console.log('Elements found:', {
    passwordInput: !!passwordInput,
    usernameInput: !!usernameInput,
    testButton: !!testButton
  });

  // Update username in OWASP config when changed
  usernameInput.addEventListener('input', function() {
    owaspPasswordStrengthTest.config({
      username: this.value
    });
  });

  // Check for pending password test
  const { pendingPasswordTest } = await chrome.storage.local.get('pendingPasswordTest');
  if (pendingPasswordTest) {
    console.log('Found pending password test');
    passwordInput.value = pendingPasswordTest.password;
    testPassword(pendingPasswordTest.password);
    
    // Clear the pending test
    await chrome.storage.local.remove('pendingPasswordTest');
  }

  // Test password on input
  passwordInput.addEventListener('input', async function() {
    console.log('Password input changed');
    const password = this.value;
    await testPassword(password);
  });

  // Test button click handler
  testButton.addEventListener('click', async () => {
    console.log('Test button clicked');
    const password = passwordInput.value;
    if (password) {
      console.log('Testing password');
      await testPassword(password);
    } else {
      console.log('No password entered');
    }
  });

  // Function to test password
  async function testPassword(password) {
    console.log('Running password test');
    const username = usernameInput.value;
    
    if (!password) {
      updateResults('Please enter a password to test');
      return;
    }

    // Additional checks for password containing username
    if (username && password.toLowerCase().includes(username.toLowerCase())) {
      updateResults('Password should not contain your username', 'weak');
      return;
    }

    const result = checkPasswordStrength(password);
    console.log('Test result:', result);
    updateStrengthIndicator(result.strength);
    updateFeedback(result.feedback);
    
    // Update strength meter
    const strength = calculateStrength(result);
    strengthBar.style.width = strength + '%';
    strengthBar.style.backgroundColor = getStrengthColor(strength);

    // Show result message
    resultDiv.style.display = 'block';
    resultDiv.className = 'result ' + (result.strong ? 'success' : 'error');
    resultDiv.textContent = result.strong ? 'Password is strong!' : 'Password needs improvement';

    // Show requirements
    displayRequirements(result);

    // Show crack time
    crackTimeDiv.textContent = result.estimatedCrackTime;

    // Send result back to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'passwordTestResult',
        result: result
      });
    });

    // Store the result
    await chrome.storage.local.set({ 
      lastTestResult: {
        ...result,
        timestamp: Date.now()
      }
    });
  }

  function calculateStrength(result) {
    const totalTests = owaspPasswordStrengthTest.tests.required.length + owaspPasswordStrengthTest.tests.optional.length;
    const passedTests = result.passedTests.length;
    return Math.round((passedTests / totalTests) * 100);
  }

  function getStrengthColor(strength) {
    if (strength < 30) return '#d32f2f';
    if (strength < 60) return '#ff9800';
    if (strength < 80) return '#4caf50';
    return '#2e7d32';
  }

  function displayRequirements(result) {
    const requirements = [
      { text: 'Minimum 10 characters', met: !result.requiredTestErrors.includes('The password must be at least 10 characters long.') },
      { text: 'Maximum 128 characters', met: !result.requiredTestErrors.includes('The password must be fewer than 128 characters.') },
      { text: 'No repeated sequences', met: !result.requiredTestErrors.includes('The password may not contain sequences of three or more repeated characters.') },
      { text: 'Not in common passwords', met: !result.requiredTestErrors.includes('The password is too common and easy to guess.') },
      { text: 'Contains lowercase letter', met: !result.optionalTestErrors.includes('The password must contain at least one lowercase letter.') },
      { text: 'Contains uppercase letter', met: !result.optionalTestErrors.includes('The password must contain at least one uppercase letter.') },
      { text: 'Contains number', met: !result.optionalTestErrors.includes('The password must contain at least one number.') },
      { text: 'Contains special character', met: !result.optionalTestErrors.includes('The password must contain at least one special character.') }
    ];

    requirementsDiv.innerHTML = requirements.map(req => `
      <div class="requirement ${req.met ? 'met' : 'unmet'}">
        ${req.met ? '✓' : '✗'} ${req.text}
      </div>
    `).join('');
  }

  // Function to check password strength
  function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    // Character type checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeated characters');
    }

    // Check for common words
    const commonWords = ['password', '123456', 'qwerty', 'admin'];
    if (commonWords.some(word => password.toLowerCase().includes(word))) {
      score -= 1;
      feedback.push('Avoid common words');
    }

    // Determine strength level
    let strength;
    if (score >= 5) {
      strength = 'Strong';
    } else if (score >= 3) {
      strength = 'Medium';
    } else {
      strength = 'Weak';
    }

    return {
      score,
      strength,
      feedback
    };
  }

  // Function to update strength indicator
  function updateStrengthIndicator(strength) {
    strengthIndicator.className = `strength-indicator ${strength.toLowerCase()}`;
    strengthIndicator.textContent = strength;
  }

  // Function to update feedback
  function updateFeedback(feedback) {
    feedbackList.innerHTML = '';
    feedback.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      feedbackList.appendChild(li);
    });
  }

  // Function to update results
  function updateResults(message, strength = '') {
    strengthIndicator.className = `strength-indicator ${strength}`;
    strengthIndicator.textContent = message;
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkPassword') {
      const password = message.password;
      const username = message.username;
      
      if (checkUsernameWords(password, username)) {
        sendResponse({
          error: 'Password contains words from username/email',
          strong: false
        });
        return true;
      }
    }

    if (message.action === 'openPasswordTester') {
      console.log('Received password test request:', message);
      if (message.password) {
        passwordInput.value = message.password;
      }
      if (message.username) {
        usernameInput.value = message.username;
      }
      // Trigger password test
      testPassword();
    }
  });

  // Function to find privacy policy link
  async function findPrivacyPolicyLink(origin) {
    const commonPolicyPaths = [
      '/privacy',
      '/privacy-policy',
      '/privacy-statement',
      '/privacypolicy',
      '/privacy_policy',
      '/legal/privacy',
      '/legal/privacy-policy',
      '/about/privacy',
      '/about/privacy-policy',
      '/terms-and-privacy',
      '/terms/privacy'
    ];

    // Try common paths first
    for (const path of commonPolicyPaths) {
      try {
        const response = await fetch(origin + path);
        if (response.ok) {
          return origin + path;
        }
      } catch (e) {
        continue;
      }
    }

    // If common paths fail, try to find link in page
    try {
      const response = await fetch(origin);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Look for privacy policy links
      const links = Array.from(doc.querySelectorAll('a'));
      const policyLink = links.find(link => {
        const text = (link.textContent || '').toLowerCase();
        const href = (link.getAttribute('href') || '').toLowerCase();
        return text.includes('privacy') || href.includes('privacy');
      });

      if (policyLink) {
        const href = policyLink.getAttribute('href');
        if (!href) return null;
        return href.startsWith('http') ? href : origin + href;
      }
    } catch (e) {
      console.error('Error finding policy link:', e);
    }

    return null;
  }

  // Function to fetch policy content
  async function fetchPolicyContent(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch policy');
      
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Remove scripts, styles, and other non-content elements
      doc.querySelectorAll('script, style, meta, link, header, footer, nav').forEach(el => el.remove());
      
      // Try to find main content
      const mainContent = doc.querySelector('main, article, [role="main"], .content, #content');
      const content = (mainContent || doc.body).textContent.replace(/\s+/g, ' ').trim();
      
      return content;
    } catch (error) {
      console.error('Error fetching policy:', error);
      throw error;
    }
  }

  // Function to analyze policy content
  async function analyzePolicyContent(text) {
    const analysis = {
      highRisk: [],
      mediumRisk: [],
      lowRisk: [],
      overallRisk: 'low'
    };

    const riskTerms = {
      high: [
        'sell your data',
        'share with third parties',
        'without your consent',
        'may disclose',
        'reserve the right',
        'at our discretion',
        'without notice',
        'personal information sale',
        'transfer of ownership',
        'unlimited rights'
      ],
      medium: [
        'third party services',
        'advertising partners',
        'marketing purposes',
        'analytics providers',
        'tracking technologies',
        'profiling',
        'automated decision',
        'data retention',
        'may combine information',
        'social media integration'
      ],
      low: [
        'cookies',
        'log files',
        'device information',
        'usage data',
        'aggregate statistics',
        'anonymous data',
        'technical information',
        'security measures',
        'encrypted',
        'industry standard'
      ]
    };

    const lowerText = text.toLowerCase();

    // Check for each risk term
    Object.entries(riskTerms).forEach(([severity, terms]) => {
      terms.forEach(term => {
        if (lowerText.includes(term.toLowerCase())) {
          const context = findTermContext(lowerText, term);
          analysis[severity + 'Risk'].push({
            term,
            context,
            severity
          });
        }
      });
    });

    // Calculate overall risk
    const riskScores = {
      high: analysis.highRisk.length * 3,
      medium: analysis.mediumRisk.length * 2,
      low: analysis.lowRisk.length
    };

    const totalScore = riskScores.high + riskScores.medium + riskScores.low;
    analysis.overallRisk = totalScore > 15 ? 'high' : totalScore > 8 ? 'medium' : 'low';

    return analysis;
  }

  // Helper function to find context around a term
  function findTermContext(text, term) {
    const index = text.indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + term.length + 50);
    let context = text.slice(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  // Function to display analysis results
  function displayAnalysisResults(analysis) {
    // Show results section
    policyResults.style.display = 'block';

    // Update risk indicator
    riskIndicator.textContent = analysis.overallRisk.toUpperCase();
    riskIndicator.className = `risk-value ${analysis.overallRisk}`;

    // Update risk counts
    highRiskCount.textContent = analysis.highRisk.length;
    mediumRiskCount.textContent = analysis.mediumRisk.length;
    lowRiskCount.textContent = analysis.lowRisk.length;

    // Display concerns
    const concerns = [
      ...analysis.highRisk.map(item => ({ ...item, severity: 'high' })),
      ...analysis.mediumRisk.map(item => ({ ...item, severity: 'medium' })),
      ...analysis.lowRisk.map(item => ({ ...item, severity: 'low' }))
    ];

    if (concerns.length === 0) {
      policyConcerns.innerHTML = '<li class="no-concerns">No concerning terms found</li>';
    } else {
      policyConcerns.innerHTML = concerns.map(concern => `
        <li>
          <span class="concern-text">${concern.term}</span>
          <span class="concern-severity ${concern.severity}">${concern.severity}</span>
        </li>
      `).join('');
    }
  }
}); 