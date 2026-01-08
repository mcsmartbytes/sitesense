'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VoiceAssistantState, VoiceAssistantConfig } from '@/types/voice';

// Extend Window interface for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const defaultConfig: VoiceAssistantConfig = {
  language: 'en-US',
  continuous: false,
  interimResults: true,
};

export function useVoiceAssistant(config: VoiceAssistantConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };

  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);

  // Check browser support and initialize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setState(prev => ({ ...prev, isSupported: true }));

      if (!isInitializedRef.current) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = mergedConfig.continuous || false;
        recognition.interimResults = mergedConfig.interimResults || true;
        recognition.lang = mergedConfig.language || 'en-US';
        recognition.maxAlternatives = 3;

        recognitionRef.current = recognition;
        isInitializedRef.current = true;
      }
    } else {
      setState(prev => ({
        ...prev,
        isSupported: false,
        error: 'Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari.'
      }));
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  // Set up event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: '',
        interimTranscript: '',
      }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
          }
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: finalTranscript || prev.transcript,
        interimTranscript: interimTranscript,
        confidence: maxConfidence || prev.confidence,
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'An error occurred with voice recognition.';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User cancelled, not an error
          errorMessage = '';
          break;
      }

      setState(prev => ({
        ...prev,
        isListening: false,
        error: errorMessage || null,
      }));
    };

    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
      }));
    };
  }, [state.isSupported]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !state.isSupported) return;

    setState(prev => ({
      ...prev,
      error: null,
      transcript: '',
      interimTranscript: '',
    }));

    try {
      recognition.start();
    } catch (err) {
      // Recognition might already be started
      console.warn('Speech recognition start error:', err);
    }
  }, [state.isSupported]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch (err) {
      console.warn('Speech recognition stop error:', err);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
}
