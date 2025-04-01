// Privacy policy analysis patterns
const PRIVACY_PATTERNS = {
  high_risk: [
    { pattern: /sell.*personal.*data|share.*personal.*data/i, type: 'Data Selling' },
    { pattern: /location.*track/i, type: 'Location Tracking' },
    { pattern: /biometric/i, type: 'Biometric Data' },
    { pattern: /indefinite.*retention|store.*indefinitely/i, type: 'Indefinite Retention' },
    { pattern: /share.*third.*part/i, type: 'Third-party Sharing' }
  ],
  medium_risk: [
    { pattern: /cookie/i, type: 'Cookies Usage' },
    { pattern: /analytic/i, type: 'Analytics' },
    { pattern: /advertis/i, type: 'Advertising' },
    { pattern: /profil/i, type: 'User Profiling' },
    { pattern: /retain.*data|data.*retention/i, type: 'Data Retention' }
  ],
  low_risk: [
    { pattern: /necessary.*data|essential.*data/i, type: 'Necessary Collection' },
    { pattern: /security.*measure/i, type: 'Security Measures' },
    { pattern: /improve.*service/i, type: 'Service Improvement' },
    { pattern: /preference/i, type: 'User Preferences' }
  ]
};

// Function to analyze privacy policy text
function analyzePrivacyPolicy(text) {
  const findings = {
    high_risk: [],
    medium_risk: [],
    low_risk: []
  };

  // Split text into sentences for better context
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Check each sentence against patterns
  sentences.forEach(sentence => {
    Object.entries(PRIVACY_PATTERNS).forEach(([risk_level, patterns]) => {
      patterns.forEach(({ pattern, type }) => {
        if (pattern.test(sentence)) {
          // Get context (20 chars before and after the match)
          const match = sentence.match(pattern);
          const start = Math.max(0, match.index - 20);
          const end = Math.min(sentence.length, match.index + match[0].length + 20);
          const context = sentence.substring(start, end).trim();

          findings[risk_level].push({
            type,
            context,
            sentence: sentence.trim()
          });
        }
      });
    });
  });

  // Calculate overall risk level
  const riskScore = calculateRiskScore(findings);
  const overallRisk = determineOverallRisk(riskScore);

  return {
    findings,
    riskScore,
    overallRisk,
    summary: generateSummary(findings)
  };
}

// Calculate risk score based on findings
function calculateRiskScore(findings) {
  const weights = {
    high_risk: 3,
    medium_risk: 2,
    low_risk: 1
  };

  let totalScore = 0;
  let maxPossibleScore = 0;

  Object.entries(findings).forEach(([level, items]) => {
    totalScore += items.length * weights[level];
    maxPossibleScore += PRIVACY_PATTERNS[level].length * weights[level];
  });

  return (totalScore / maxPossibleScore) * 100;
}

// Determine overall risk level
function determineOverallRisk(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

// Generate summary of findings
function generateSummary(findings) {
  return {
    total_concerns: Object.values(findings).reduce((sum, arr) => sum + arr.length, 0),
    by_risk_level: {
      high: findings.high_risk.length,
      medium: findings.medium_risk.length,
      low: findings.low_risk.length
    }
  };
}

// Export the analyzer
export { analyzePrivacyPolicy }; 