import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert, Linking } from "react-native";
import { CameraView, Camera } from "expo-camera";
import axios from "axios";

const BASE_URL = "https://8926b087-4e0b-4b4e-8f08-c5b755ab7767.mock.pstmn.io";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState("scanner"); // 'scanner' or 'question'

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async (result) => {
    setScanned(true);
    setLoading(true);

    try {
      // Construct full URL from scanned endpoint ID
      const fullURL = `${BASE_URL}/${result.data}`;
      console.log("Fetching from:", fullURL);

      // Fetch question data
      const response = await axios.get(fullURL);
      setCurrentQuestion({
        ...response.data,
        endpointUrl: fullURL,
      });
      setScreen("question");
    } catch (error) {
      Alert.alert("Error", "Failed to fetch question data");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (selectedAnswer) => {
    if (!currentQuestion) return;

    console.log("Submitting answer:", selectedAnswer);

    setLoading(true);
    try {
      const response = await axios.post(
        `${currentQuestion.endpointUrl}?answer=${encodeURIComponent(
          selectedAnswer
        )}`
      );

      if (response.data.isCorrect) {
        Alert.alert("Correct!", "Opening next location...", [
          {
            text: "OK",
            onPress: () => openMapsWithCoordinates(response.data.coordinates),
          },
        ]);
      } else {
        Alert.alert("Incorrect", "Try again!");
      }
    } catch (error) {
      Alert.alert("Error", "Wrong answer please try again.");
      // console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openMapsWithCoordinates = (coordinates) => {
    const url = `https://maps.google.com/?q=${coordinates}`;
    Linking.openURL(url);
    resetToScanner();
  };

  const resetToScanner = () => {
    setCurrentQuestion(null);
    setScanned(false);
    setScreen("scanner");
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <Button
          title="Request Permission Again"
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
          }}
        />
      </View>
    );
  }

  if (screen === "question" && currentQuestion) {
    return (
      <View style={styles.container}>
        <Text style={styles.question}>{currentQuestion.question}</Text>

        {currentQuestion.responseType === "multipleChoice" && (
          <View style={styles.choicesContainer}>
            {currentQuestion.choices.map((choice, index) => (
              <View key={index} style={styles.choiceButtonContainer}>
                <Button
                  title={choice}
                  onPress={() => submitAnswer(choice)}
                  disabled={loading}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Back to Scanner" onPress={resetToScanner} />
        </View>

        {loading && <Text style={styles.loadingText}>Loading...</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scavenger Hunt</Text>
      <Text style={styles.subtitle}>Scan QR Code to Start</Text>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.scanner}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      </View>

      {scanned && (
        <View style={styles.buttonContainer}>
          <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
        </View>
      )}

      {loading && <Text style={styles.loadingText}>Loading question...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: "#666",
  },
  cameraContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  scanner: {
    width: 300,
    height: 300,
  },
  question: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
    fontWeight: "500",
  },
  choicesContainer: {
    width: "100%",
    marginBottom: 20,
  },
  choiceButtonContainer: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
});
