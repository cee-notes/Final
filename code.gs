/**
 * ============================================================================
 * NEXUS WEBSITE — Google Apps Script Backend
 * ============================================================================
 * This script acts as your free backend API:
 *   1. Receives POST requests from the contact form
 *   2. Saves submissions to a Google Sheet
 *   3. Optionally sends email notifications
 * 
 * DEPLOYMENT INSTRUCTIONS:
 *   1. Create a new Google Sheet (or use existing one)
 *   2. Go to Extensions → Apps Script
 *   3. Delete any default code and paste this entire file
 *   4. Save the project (give it a name like "Nexus Website Backend")
 *   5. Click Deploy → New deployment
 *      - Select type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   6. Click Deploy and copy the Web App URL
 *   7. Paste that URL into script.js (CONFIG.SCRIPT_URL)
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION — Edit these settings if needed
// ============================================================================
const CONFIG = {
  // Sheet name where submissions are stored
  SHEET_NAME: 'ContactSubmissions',
  
  // Enable email notifications (true/false)
  EMAIL_NOTIFICATIONS_ENABLED: false,
  
  // Email address to receive notifications (defaults to script owner)
  NOTIFICATION_EMAIL: Session.getActiveUser().getEmail(),
  
  // Email subject line for notifications
  EMAIL_SUBJECT_PREFIX: '[NEXUS Website] New Contact Form Submission'
};

// ============================================================================
// MAIN HANDLER — doGet serves a simple confirmation page
// ============================================================================
function doGet(e) {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NEXUS Backend Active</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            color: #fff;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          h1 { font-size: 2.5rem; margin-bottom: 10px; }
          p { font-size: 1.1rem; opacity: 0.9; }
          .status { 
            display: inline-block; 
            padding: 8px 16px; 
            background: #10b981; 
            border-radius: 999px;
            margin-top: 20px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>NEXUS Backend</h1>
          <p>Your contact form backend is active and ready.</p>
          <div class="status">✓ Operational</div>
        </div>
      </body>
    </html>
  `).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================================
// MAIN HANDLER — doPost receives contact form submissions
// ============================================================================
function doPost(e) {
  try {
    // Parse incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    const validation = validateSubmission(data);
    if (!validation.valid) {
      return jsonResponse({
        success: false,
        message: validation.error
      });
    }
    
    // Save to Google Sheet
    const sheet = getOrCreateSheet();
    const timestamp = new Date();
    
    const rowData = [
      timestamp.toISOString(),
      data.name || '',
      data.email || '',
      data.subject || '',
      data.message || '',
      data.page || '',
      data.submittedAt || ''
    ];
    
    sheet.appendRow(rowData);
    
    // Send email notification if enabled
    if (CONFIG.EMAIL_NOTIFICATIONS_ENABLED) {
      sendEmailNotification(data, timestamp);
    }
    
    // Return success response
    return jsonResponse({
      success: true,
      message: 'Thank you! Your message has been received.',
      timestamp: timestamp.toISOString()
    });
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return jsonResponse({
      success: false,
      message: 'Server error. Please try again later.'
    }, 500);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create the submissions sheet
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    
    // Create header row
    sheet.appendRow([
      'Timestamp',
      'Name',
      'Email',
      'Subject',
      'Message',
      'Page URL',
      'Submitted At'
    ]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setBackground('#2563eb');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 7);
  }
  
  return sheet;
}

/**
 * Validate form submission data
 */
function validateSubmission(data) {
  if (!data.name || data.name.trim().length < 2) {
    return { valid: false, error: 'Name is required (minimum 2 characters)' };
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    return { valid: false, error: 'Valid email is required' };
  }
  
  if (!data.message || data.message.trim().length < 10) {
    return { valid: false, error: 'Message must be at least 10 characters' };
  }
  
  return { valid: true };
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Send email notification
 */
function sendEmailNotification(data, timestamp) {
  try {
    const subject = `${CONFIG.EMAIL_SUBJECT_PREFIX} from ${data.name}`;
    const body = `
New Contact Form Submission
============================

Name:    ${data.name}
Email:   ${data.email}
Subject: ${data.subject || 'N/A'}
Message: ${data.message}

Page: ${data.page || 'N/A'}
Received: ${timestamp.toLocaleString()}

---
This email was sent automatically by your NEXUS website backend.
    `.trim();
    
    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });
    
    Logger.log('Email notification sent to: ' + CONFIG.NOTIFICATION_EMAIL);
  } catch (error) {
    Logger.log('Failed to send email notification: ' + error.toString());
    // Don't fail the submission if email fails
  }
}

/**
 * Return JSON response with proper headers
 */
function jsonResponse(data, statusCode) {
  statusCode = statusCode || 200;
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
