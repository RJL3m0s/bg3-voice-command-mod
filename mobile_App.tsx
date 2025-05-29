// File: mobile/App.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechRecognizedEvent,
} from '@react-native-voice/voice';
import { io, Socket } from 'socket.io-client';

const PC_SERVER_IP = 'YOUR_PC_LOCAL_IP'; // Replace with your PC's local IP address
const PC_SERVER_PORT = 8765;

const App = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const appendMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev, msg]);
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  useEffect(() => {
    const connectSocket = () => {
      if (socketRef.current && socketRef.current.connected) {
        return;
      }
      console.log(`Attempting to connect to ws://${PC_SERVER_IP}:${PC_SERVER_PORT}`);
      const newSocket = io(`http://${PC_SERVER_IP}:${PC_SERVER_PORT}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        appendMessage('Connected to PC server!');
        setIsConnected(true);
        console.log('Socket.IO connected');
      });

      newSocket.on('disconnect', (reason) => {
        appendMessage(`Disconnected from PC server: ${reason}`);
        setIsConnected(false);
        console.log('Socket.IO disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        appendMessage(`Connection Error: ${error.message}`);
        setIsConnected(false);
        console.error('Socket.IO connection error:', error);
      });

      socketRef.current = newSocket;
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.offAny();
        socketRef.current = null;
      }
    };
  }, [appendMessage]);

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechRecognized = onSpeechRecognized;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = (e: any) => {
    setRecognizedText('');
    setIsRecording(true);
    appendMessage('Listening...');
  };

  const onSpeechEnd = (e: any) => {
    setIsRecording(false);
    appendMessage('Stopped listening.');
    if (recognizedText.trim() !== '') {
      sendCommand(recognizedText);
    } else {
      appendMessage('No speech recognized.');
    }
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      setRecognizedText(e.value[0]);
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    setIsRecording(false);
    appendMessage(`Speech error: ${e.error?.message}`);
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {};

  const startRecognizing = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please ensure the PC server is running and you are connected.');
      return;
    }
    try {
      setRecognizedText('');
      await Voice.start('en-US');
    } catch (e) {
      Alert.alert('Voice Error', `Could not start voice recognition: ${e}`);
    }
  };

  const stopRecognizing = async () => {
    try {
      await Voice.stop();
    } catch (e) {}
  };

  const sendCommand = (command: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      appendMessage('Error: Not connected to PC server.');
      return;
    }
    if (command.trim() === '') {
      appendMessage('Error: Command cannot be empty.');
      return;
    }
    try {
      socketRef.current.emit('message', command.trim());
      appendMessage(`Sent: "${command.trim()}"`);
      setInputText('');
      setRecognizedText('');
    } catch (error) {
      appendMessage(`Failed to send: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>BG3 Voice Commander</Text>
          <Text style={[styles.status, { color: isConnected ? 'green' : 'red' }]}>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg, index) => (
            <Text key={index} style={styles.messageText}>
              {msg}
            </Text>
          ))}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type command or speak..."
            value={recognizedText || inputText}
            onChangeText={(text) => {
              setInputText(text);
              setRecognizedText('');
            }}
            onSubmitEditing={() => sendCommand(inputText)}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Button title="Send" onPress={() => sendCommand(inputText)} disabled={!isConnected} />
        </View>
        <View style={styles.voiceControlContainer}>
          <Button
            title={isRecording ? 'Stop Voice' : 'Start Voice'}
            onPress={isRecording ? stopRecognizing : startRecognizing}
            color={isRecording ? 'red' : 'blue'}
            disabled={!isConnected}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  keyboardAvoidingView: { flex: 1 },
  header: {
    padding: 15,
    backgroundColor: '#333',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  status: { fontSize: 16, fontWeight: '600' },
  messagesContainer: { flex: 1, padding: 10 },
  messagesContent: { justifyContent: 'flex-end', minHeight: '100%' },
  messageText: { fontSize: 14, marginBottom: 5, color: '#333' },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  voiceControlContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});

export default App;