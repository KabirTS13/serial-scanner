import React, { useState, useCallback, useRef } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImage";

function WebcamCapture() {
  const [roomNumber, setRoomNumber] = useState("");
  const [scannedText, setScannedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) setImageSrc(imageSrc);
  }, [webcamRef]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndScan = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedImageBase64 = croppedImage.replace(/^data:image\/jpeg;base64,/, "");

      setIsLoading(true);
      const response = await axios.post(
        "https://us-central1-serial-scanner-6e7a3.cloudfunctions.net/scanSerialNumber/scanSerialNumber",
        { imageBase64: croppedImageBase64, roomNumber }
      );
      setScannedText(response.data.serialNumber);
    } catch (error) {
      console.error("Error scanning:", error);
      alert("Failed to scan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(
        "https://us-central1-serial-scanner-6e7a3.cloudfunctions.net/saveSerialNumber/saveSerialNumber",
        { roomNumber, serialNumber: scannedText }
      );
      alert("Serial number saved successfully!");
      resetFields();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const resetFields = () => {
    setScannedText("");
    setIsCapturing(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Serial Number Scanner</h1>

      <input
        type="text"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value)}
        placeholder="Enter Room Number"
        style={styles.input}
      />

      <div style={styles.buttonContainer}>
        <button onClick={() => setIsCapturing(!isCapturing)} style={styles.button}>
          {isCapturing ? "Stop Capturing" : "Start Capturing"}
        </button>
      </div>

      {isCapturing && (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: { exact: "environment" } }}
            style={styles.webcam}
          />
          <button onClick={capture} style={styles.button}>Capture</button>
        </>
      )}

      {imageSrc && (
        <div style={styles.cropContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}

      {imageSrc && (
        <button onClick={handleCropAndScan} style={styles.button} disabled={isLoading}>
          {isLoading ? "Scanning..." : "Scan Cropped Area"}
        </button>
      )}

      <textarea
        value={scannedText}
        onChange={(e) => setScannedText(e.target.value)}
        placeholder={isCapturing ? "Scanned serial number" : "Enter serial number manually"}
        style={styles.textArea}
      />

      {scannedText && (
        <button onClick={handleSave} style={styles.button}>
          Save Serial Number
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#121212',
    color: '#ffffff',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '24px',
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    fontSize: '16px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: '15px',
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  webcam: {
    width: '100%',
    borderRadius: '5px',
    marginBottom: '15px',
  },
  cropContainer: {
    position: 'relative',
    width: '100%',
    height: '300px',
    marginBottom: '15px',
  },
  textArea: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    fontSize: '16px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    resize: 'vertical',
    minHeight: '100px',
  },
};

export default WebcamCapture;