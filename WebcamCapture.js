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

  // State for manually entering details
  const [manualEntry, setManualEntry] = useState(false);
  const [os, setOs] = useState("");
  const [po, setPo] = useState("");
  const [warranty, setWarranty] = useState("");
  const [serialNum, setSerialNum] = useState("");
  const [other, setOther] = useState("");
  const [exp, setExp] = useState(""); // New state for expiration date

  // New state for scanned values
  const [scannedWarranty, setScannedWarranty] = useState("");
  const [scannedExp, setScannedExp] = useState("");

  // Capture the screenshot from the webcam
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

      const { os, exp, po, serialNum, warranty, other } = response.data;

      // Update the state with scanned data or fallback to an empty string
      setOs(os || "");
      setPo(po || "");
      setSerialNum(serialNum || "");
      setScannedWarranty(warranty || ""); // Store scanned warranty
      setScannedExp(exp || ""); // Store scanned expiration
      setOther(other || "");

      // Adjusted text format with each piece of data on a new line
      setScannedText(
        `OS: ${os || "N/A"}\nExp: ${exp || "N/A"}\nP/O: ${po || "N/A"}\nSerial No: ${serialNum || "N/A"}\nWarranty: ${warranty || "N/A"}\nOther: ${other || "N/A"}`
      );
    } catch (error) {
      console.error("Error scanning:", error);
      alert("Failed to scan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (isManual = false) => {
    const dataToSave = {
      roomNumber,
      serialNumber: serialNum || "",
      os: os || "",
      po: po || "",
      warranty: isManual ? warranty : scannedWarranty || "", // Use scanned warranty if not manual
      exp: isManual ? exp : scannedExp || "", // Use scanned exp if not manual
      other: other || "",
    };

    try {
      await axios.post(
        "https://us-central1-serial-scanner-6e7a3.cloudfunctions.net/saveSerialNumber/saveSerialNumber",
        dataToSave
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
    setOs("");
    setPo("");
    setSerialNum("");
    setWarranty("");
    setOther("");
    setExp(""); // Reset exp state
    setScannedWarranty(""); // Reset scanned warranty
    setScannedExp(""); // Reset scanned expiration
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
        <button onClick={() => setManualEntry(!manualEntry)} style={styles.button}>
          {manualEntry ? "Cancel Manual Entry" : "Enter Manually"}
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
          <button onClick={capture} style={styles.button}>
            Capture
          </button>
        </>
      )}

      {manualEntry && (
        <div style={styles.manualEntry}>
          <input
            type="text"
            value={serialNum}
            onChange={(e) => setSerialNum(e.target.value)}
            placeholder="Serial Number"
            style={styles.input}
          />
          <input
            type="text"
            value={os}
            onChange={(e) => setOs(e.target.value)}
            placeholder="Operating System"
            style={styles.input}
          />
          <input
            type="text"
            value={po}
            onChange={(e) => setPo(e.target.value)}
            placeholder="P/O Number"
            style={styles.input}
          />
          <input
            type="text"
            value={warranty}
            onChange={(e) => setWarranty(e.target.value)}
            placeholder="Warranty"
            style={styles.input}
          />
          <input
            type="text"
            value={exp} // New input for exp
            onChange={(e) => setExp(e.target.value)} // Update exp state
            placeholder="Expiration Date"
            style={styles.input}
          />
          <input
            type="text"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Other Info"
            style={styles.input}
          />
          <button onClick={() => handleSave(true)} style={styles.button}>
            Submit Manually Entered Info
          </button>
        </div>
      )}

      {imageSrc && (
        <>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
          <div style={styles.buttonContainer}>
            <button onClick={handleCropAndScan} style={styles.button}>
              {isLoading ? "Scanning..." : "Scan"}
            </button>
          </div>
        </>
      )}

      {scannedText && (
        <>
          <div style={styles.results}>
            <p>{scannedText.split("\n").map((line, idx) => (
              <span key={idx}>{line}<br /></span>
            ))}</p>
          </div>
          <div style={styles.buttonContainer}>
            <button onClick={() => handleSave()} style={styles.button}>
              Save to Google Sheets
            </button>
          </div>
        </>
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
    marginBottom: '20px',
  },
  input: {
    margin: '5px',
    padding: '10px',
    width: '300px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  button: {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#6200ea',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: '10px',
  },
  results: {
    marginTop: '20px',
    backgroundColor: '#1e1e1e',
    padding: '15px',
    borderRadius: '4px',
  },
  manualEntry: {
    marginTop: '20px',
    backgroundColor: '#1e1e1e',
    padding: '15px',
    borderRadius: '4px',
  },
  webcam: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '4px',
    marginBottom: '10px',
  },
};

export default WebcamCapture;
