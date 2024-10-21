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
app.post('/scanSerialNumber', async (req, res) => {
    const { imageBase64 } = req.body;
  
    try {
      if (imageBase64) {
        const imageBuffer = Buffer.from(imageBase64, 'base64');
  
        // Perform text detection using the Vision API
        const [result] = await client.textDetection({ image: { content: imageBuffer } });
        const detections = result.textAnnotations;
  
        if (detections.length > 0) {
          const detectedSerialNumber = detections[0].description.trim();
          return res.status(200).send({ serialNumber: detectedSerialNumber });
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
app.post('/saveSerialNumber', async (req, res) => {
    const { roomNumber, serialNumber } = req.body;

    try {
      if (!serialNumber) {
        return res.status(400).send({ message: "No serial number provided." });
      }
  
      // Save to Firestore
      await admin.firestore().collection("scannedData").add({
        room: roomNumber,
        serialNumber,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  
      // Save to Google Sheets
      const authClient = await auth.getClient();
      const sheetId = '1hV5StAky9kluUnwIY42q_lH28hI6osdn-cDfnhmbS1A'; // Replace with your actual sheet ID
      const request = {
        spreadsheetId: sheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [[roomNumber, serialNumber]],
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
