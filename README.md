# TargetClip Chrome Extension

TargetClip is a Chrome extension that allows users to easily capture and copy the content of web pages using a configurable target URL. This extension streamlines the process of extracting web content and saving it to your clipboard with just one click.

## Features

- One-click content extraction using a configurable target URL
- Automatic copying of extracted content to clipboard
- Configurable target URL template in the options page
- **NEW**: 5-second timeout with automatic retry (up to 2 retries)
- **NEW**: Background processing - works even when switching tabs
- **NEW**: Success sound notification when content is copied
- **NEW**: Desktop notifications for success/error status

## Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link to be updated once published)
2. Search for "TargetClip"
3. Click "Add to Chrome"

### Manual Installation (for developers)

1. Clone this repository:
   ```
   git clone https://github.com/rkumagai/targetclip-chrome-extension.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the cloned repository folder

## Usage

1. Navigate to the web page you want to extract content from
2. Click the TargetClip extension icon in your Chrome toolbar
3. The content will be automatically extracted and copied to your clipboard
4. A popup will display the target URL used for the extraction

## Configuration

1. Right-click on the TargetClip icon in your Chrome toolbar
2. Select "Options" from the context menu
3. Enter your desired target URL template
4. Click "Save"

The default target URL template is `https://r.jina.ai/${targetUrl}`. You can modify this to use any service that accepts a URL as a parameter and returns the desired content.

**Important**: When setting up your custom URL template, use `${targetUrl}` as a placeholder for the current page URL. Do not use additional URL encoding in your template, as the extension will handle this automatically.

Example of a valid template:
```
https://example.com/api?url=${targetUrl}
```

Incorrect template (do not use additional encoding):
```
https://example.com/api?url=${encodeURIComponent(targetUrl)}
```
