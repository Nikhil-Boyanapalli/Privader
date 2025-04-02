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

### Quick Installation (Recommended)
1. Download the latest release from the [Releases page](https://github.com/Nikhil-Boyanapalli/Privader/releases)
2. Extract the downloaded zip file
3. Follow the [API Key Setup](#api-key-setup) instructions below
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked"
7. Select the extracted folder containing the extension files

### Build from Source
If you prefer to build the extension yourself:

1. Clone the repository:
```bash
git clone https://github.com/Nikhil-Boyanapalli/Privader.git
cd Privader
```

2. Install dependencies:
```bash
npm install
```

3. Follow the [API Key Setup](#api-key-setup) instructions below

4. Build the extension:
```bash
npm run build
```

5. Load in Chrome:
- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `dist` folder from the project directory

### API Key Setup
The Site Safety Check feature requires a Google Safe Browsing API key. Here's how to get one:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Note your project ID

2. **Enable the Safe Browsing API**:
   - In the Cloud Console, go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
   - Search for "Safe Browsing API"
   - Click on the API and click "Enable"

3. **Create API Credentials**:
   - Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" and select "API key"
   - Copy your new API key

4. **Configure the Extension**:
   - Rename `config.template.js` to `config.js`
   - Replace 'YOUR_API_KEY_HERE' with your actual API key
   - Keep this key private and never commit it to version control

**Note about API Usage**:
- The free tier includes 10,000 requests per day
- No credit card is required
- Suitable for personal and small business use
- [Read more about Safe Browsing API quotas](https://developers.google.com/safe-browsing/v4/usage-limits)

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

## Troubleshooting

### Common Issues

1. **"Site Safety Check not working"**:
   - Verify your API key is correctly set in `config.js`
   - Check if you've reached the daily API quota
   - Ensure the Safe Browsing API is enabled in your Google Cloud Console

2. **"Failed to load extension"**:
   - Make sure you've renamed `config.template.js` to `config.js`
   - Verify the API key is properly formatted
   - Try rebuilding the extension with `npm run build`

3. **"API Key errors"**:
   - Confirm your API key is active in Google Cloud Console
   - Check if the API key has the necessary permissions
   - Verify you're not using a restricted API key

For more help, please [open an issue](https://github.com/Nikhil-Boyanapalli/Privader/issues).

## Acknowledgments

- Google Safe Browsing API for threat detection
- Chrome Extensions API
- Various open-source libraries and tools

## Contact

Email: nikhilboyanapalli2@gmail.com
Project Link: https://github.com/Nikhil-Boyanapalli/Privader

## About

A comprehensive privacy security tool 