const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const vision = require('@google-cloud/vision');
const cors = require('cors');
const express = require('express');

admin.initializeApp();

const sheets = google.sheets('v4');
const client = new vision.ImageAnnotatorClient();

const credentials = require("./serial-scanner-6e7a3-8e97aec1c527.json"); // Path to your credentials
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const app = express();
const allowedOrigins = [
  'https://serial-scanner-6e7a3.web.app', 
  'https://serial-scanner-6e7a3.firebaseapp.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Function to handle OCR
// Function to handle OCR
app.post('/scanSerialNumber', async (req, res) => {
    const { imageBase64 } = req.body;
  
    try {
      if (imageBase64) {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
  
        // Perform text detection using the Vision API
        const [result] = await client.textDetection({ image: { content: imageBuffer } });
        const detections = result.textAnnotations;
  
        if (detections.length > 0) {
          const detectedText = detections[0].description.trim();
  
          // Initialize variables
          let os = null;
          let exp = null;
          let po = null;
          let serialNum = null;
          let warranty = null;
          let other = detectedText; // Initialize 'other' to include all detected text initially
  
          // Regular expressions for each keyword
          const osRegex = /OS[:\s]+([^\n]+)/i;
          const expRegex = /Exp[:\s]+([^\n]+)/i;
          const poRegex = /P+([^\n]+)/i;
          const serialNumRegex = /Serial+([^\n]+)/i;
          const warrantyRegex = /Warranty+([^\n]+)/i;
  
          // Extract text beside each keyword
          const osMatch = detectedText.match(osRegex);
          const expMatch = detectedText.match(expRegex);
          const poMatch = detectedText.match(poRegex);
          const serialNumMatch = detectedText.match(serialNumRegex);
          const warrantyMatch = detectedText.match(warrantyRegex);
  
          // Assign extracted values
          if (osMatch) os = osMatch[1].trim();
          if (expMatch) exp = expMatch[1].trim();
          if (poMatch) po = poMatch[1].trim();
          if (serialNumMatch) serialNum = serialNumMatch[1].trim();
          if (warrantyMatch) warranty = warrantyMatch[1].trim();
  
          // Ensure P/O is not part of the Exp field (like "Exp: June, 2020 P/O: 450165")
          if (exp && exp.includes('P/O:')) {
            const expSplit = exp.split('P/O:');
            exp = expSplit[0].trim();
            po = po || expSplit[1].trim(); // Use P/O from the Exp field if no separate P/O found
          }
  
          // Remove matched text from 'other'
          other = other.replace(osMatch ? osMatch[0] : '', '')
            .replace(expMatch ? expMatch[0] : '', '')
            .replace(poMatch ? poMatch[0] : '', '')
            .replace(serialNumMatch ? serialNumMatch[0] : '', '')
            .replace(warrantyMatch ? warrantyMatch[0] : '', '')
            .trim();
  
          // Order fields correctly
          const responseData = {
            serialNum: serialNum || 'N/A',
            exp: exp || 'N/A',
            warranty: warranty || 'N/A',
            po: po || 'N/A',
            os: os || 'N/A',
            other: other || 'N/A'
          };
  
          // Return the sorted and cleaned data
          return res.status(200).send(responseData);
        } else {
          return res.status(400).send({ message: "No text detected in the image." });
        }
      } else {
        return res.status(400).send({ message: "No image provided." });
      }
    } catch (error) {
      console.error("Error processing request: ", error);
      res.status(500).send({ message: "Error processing request", error: error.message });
    }
  });
  

// Function to handle saving to Firestore and Google Sheets
// Function to handle saving to Firestore and Google Sheets
app.post('/saveSerialNumber', async (req, res) => {
    const { roomNumber, serialNumber, os, po, warranty, exp, other } = req.body; // Include exp here
  
    try {
      if (!serialNumber) {
        return res.status(400).send({ message: "No serial number provided." });
      }
  
      // Default all fields to empty strings if they are null or undefined
      const room = roomNumber || 'N/A';
      const serial = serialNumber || 'N/A';
      const operatingSystem = os || 'N/A';
      const purchaseOrder = po || 'N/A';
      const productWarranty = warranty || 'N/A';
      const expirationDate = exp || 'N/A'; // Use exp here
      const additionalInfo = other || 'N/A';
  
      // Save to Google Sheets
      const authClient = await auth.getClient();
      const sheetId = '1hV5StAky9kluUnwIY42q_lH28hI6osdn-cDfnhmbS1A'; // Replace with your actual sheet ID
      const request = {
        spreadsheetId: sheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          // Ensure that all fields (including warranty and exp) are passed to Google Sheets
          values: [[room, serial, operatingSystem, purchaseOrder, productWarranty, expirationDate, additionalInfo]],
        },
        auth: authClient,
      };
  
      await sheets.spreadsheets.values.append(request);
  
      res.status(200).send({ message: "Data saved successfully" });
    } catch (error) {
      console.error("Error saving data: ", error);
      res.status(500).send({ message: "Error saving data", error: error.message });
    }
  });

  

exports.scanSerialNumber = functions.https.onRequest(app);
exports.saveSerialNumber = functions.https.onRequest(app);
