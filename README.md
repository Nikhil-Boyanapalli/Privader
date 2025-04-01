# Privader Web Security

A comprehensive Chrome extension for web security and privacy protection. This extension helps users identify potential privacy concerns, analyze privacy policies, and ensure safe browsing experiences.

## Features

### 1. Site Safety Check
- Real-time website safety verification using Google Safe Browsing API
- HTTPS connection validation
- SSL certificate verification
- Threat detection for malware, phishing, and unwanted software

### 2. Privacy Policy Analysis
- Automatic detection and analysis of website privacy policies
- Classification of privacy concerns into high, medium, and low risk levels
- Detection of concerning terms and practices
- Clear visualization of privacy risks

### 3. Data Collection Monitoring
- Tracks potential data collection activities
- Monitors form submissions and data transfers
- Alerts for suspicious data gathering

### 4. Password Security
- Password strength testing
- Common vulnerability checks
- Secure password recommendations
- Protection against password-based attacks

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd privader-web-security
```

2. Install dependencies:
```bash
npm install
```

3. Set up API keys:
- Rename `config.template.js` to `config.js`
- Add your Google Safe Browsing API key (Get one from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

4. Build the extension:
```bash
npm run build
```

5. Load in Chrome:
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `dist` folder from the project directory

## Development

### Project Structure
```
privader-web-security/
├── src/
│   ├── background.js      # Service worker for background tasks
│   ├── content.js         # Content script for webpage interaction
│   ├── popup.js          # Popup UI functionality
│   └── policy-analyzer.js # Privacy policy analysis logic
├── public/
│   ├── manifest.json      # Extension manifest
│   ├── popup.html        # Popup UI layout
│   └── icons/            # Extension icons
└── dist/                 # Build output directory
```

### Build Commands
- `npm run build`: Build the extension for production
- `npm run dev`: Build with watch mode for development

## Privacy & Security Features

### Site Safety Analysis
- Checks websites against Google's Safe Browsing database
- Verifies SSL certificates and HTTPS connections
- Monitors for malicious content and behavior

### Privacy Policy Scanner
- Analyzes privacy policies for concerning terms
- Categorizes privacy risks:
  - High Risk: Data selling, location tracking, biometric data
  - Medium Risk: Cookies, analytics, advertising
  - Low Risk: Essential data collection, security measures

### Data Protection
- Monitors form submissions
- Tracks data collection attempts
- Provides warnings for excessive data gathering

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

- Never commit API keys or sensitive information
- Use the provided `config.template.js` for configuration
- Always use the latest version of dependencies
- Report security vulnerabilities responsibly

## Acknowledgments

- Google Safe Browsing API for threat detection
- Chrome Extensions API
- Various open-source libraries and tools

## Contact

Email: nikhilboyanapalli2@gmail.com
Project Link: https://github.com/Nikhil-Boyanapalli/Privader

## About

A comprehensive privacy security tool 