'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { parseCommand, getCommandSuggestions, findBestJobMatch } from '@/lib/voiceCommands';
import { executeVoiceCommand } from '@/lib/voiceApiService';
import type { ParsedCommand, CommandResult } from '@/types/voice';

type AssistantState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceAssistant({ isOpen, onClose }: VoiceAssistantProps) {
  const router = useRouter();
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceAssistant();

  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; name: string }>>([]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Fetch jobs for fuzzy matching
  useEffect(() => {
    if (user?.id && isOpen) {
      fetch(`/api/jobs?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setJobs(data.data.map((j: any) => ({ id: j.id, name: j.name })));
          }
        })
        .catch(console.error);
    }
  }, [user?.id, isOpen]);

  // Update assistant state based on listening
  useEffect(() => {
    if (isListening) {
      setAssistantState('listening');
    }
  }, [isListening]);

  // Process transcript when speech recognition ends
  useEffect(() => {
    if (!isListening && transcript && assistantState === 'listening') {
      processCommand(transcript);
    }
  }, [isListening, transcript]);

  const processCommand = useCallback(async (text: string) => {
    setAssistantState('processing');
    const command = parseCommand(text);
    setParsedCommand(command);

    if (command.type === 'unknown') {
      setAssistantState('error');
      setResult({
        success: false,
        message: 'I didn\'t understand that command.',
        error: 'unknown_command',
      });
      return;
    }

    // Handle navigation locally
    if (command.type === 'navigation' && command.params.route) {
      setAssistantState('success');
      setResult({
        success: true,
        message: `Navigating to ${command.params.destination}...`,
        navigateTo: command.params.route,
      });
      setTimeout(() => {
        router.push(command.params.route);
        onClose();
      }, 1000);
      return;
    }

    // For time logging, resolve job name
    if (command.type === 'log_time' && command.params.jobName) {
      const matchedJob = findBestJobMatch(command.params.jobName, jobs);
      if (matchedJob) {
        command.params.jobId = matchedJob.id;
        command.params.resolvedJobName = matchedJob.name;
      }
    }

    // Execute API command
    if (!user?.id) {
      setAssistantState('error');
      setResult({
        success: false,
        message: 'Please sign in to use voice commands.',
        error: 'not_authenticated',
      });
      return;
    }

    const cmdResult = await executeVoiceCommand(command, user.id);
    setResult(cmdResult);
    setAssistantState(cmdResult.success ? 'success' : 'error');
  }, [user?.id, jobs, router, onClose]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setResult(null);
      setParsedCommand(null);
      resetTranscript();
      setAssistantState('idle');
      startListening();
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setParsedCommand(null);
    resetTranscript();
    setAssistantState('idle');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-200"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MicIcon className="w-5 h-5" />
            Voice Assistant
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isSupported ? (
          <UnsupportedMessage />
        ) : (
          <>
            {/* Idle State */}
            {assistantState === 'idle' && (
              <IdleState onStart={handleMicClick} />
            )}

            {/* Listening State */}
            {assistantState === 'listening' && (
              <ListeningState
                transcript={interimTranscript || transcript}
                onCancel={stopListening}
              />
            )}

            {/* Processing State */}
            {assistantState === 'processing' && (
              <ProcessingState transcript={transcript} />
            )}

            {/* Success State */}
            {assistantState === 'success' && result && (
              <SuccessState
                result={result}
                command={parsedCommand}
                onNewCommand={handleTryAgain}
                onClose={onClose}
              />
            )}

            {/* Error State */}
            {assistantState === 'error' && (
              <ErrorState
                error={speechError || result?.message || 'Unknown error'}
                transcript={transcript}
                onTryAgain={handleTryAgain}
              />
            )}
          </>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono">V</kbd> to toggle voice
      </div>
    </div>
  );
}

// Sub-components

function UnsupportedMessage() {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <MicOffIcon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-gray-600 text-sm">
        Voice recognition is not supported in this browser.
      </p>
      <p className="text-gray-500 text-xs mt-1">
        Try Chrome, Edge, or Safari.
      </p>
    </div>
  );
}

function IdleState({ onStart }: { onStart: () => void }) {
  const suggestions = getCommandSuggestions();

  return (
    <div className="text-center">
      <button
        onClick={onStart}
        className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 transition-all hover:scale-105 shadow-lg"
      >
        <MicIcon className="w-8 h-8" />
      </button>
      <p className="text-gray-700 font-medium mb-3">Click to start speaking</p>
      <div className="text-left bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Try saying:</p>
        <ul className="space-y-1">
          {suggestions.map((suggestion, i) => (
            <li key={i} className="text-sm text-gray-600">{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ListeningState({ transcript, onCancel }: { transcript: string; onCancel: () => void }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
        <MicIcon className="w-8 h-8" />
      </div>

      {/* Waveform animation */}
      <div className="flex items-center justify-center gap-1 mb-4 h-8">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-blue-500 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.1}s`,
              height: `${Math.random() * 20 + 12}px`,
            }}
          />
        ))}
      </div>

      <p className="text-red-600 font-medium mb-2">Listening...</p>

      {transcript && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-gray-700 text-sm italic">"{transcript}"</p>
        </div>
      )}

      <button
        onClick={onCancel}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}

function ProcessingState({ transcript }: { transcript: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-700 font-medium mb-2">Processing...</p>
      {transcript && (
        <p className="text-gray-500 text-sm italic">"{transcript}"</p>
      )}
    </div>
  );
}

function SuccessState({
  result,
  command,
  onNewCommand,
  onClose,
}: {
  result: CommandResult;
  command: ParsedCommand | null;
  onNewCommand: () => void;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckIcon className="w-6 h-6 text-green-600" />
      </div>
      <p className="text-green-700 font-medium mb-2">Done!</p>
      <p className="text-gray-600 text-sm mb-4">{result.message}</p>

      {result.data && (
        <div className="bg-gray-50 rounded-lg p-3 text-left text-sm mb-4">
          {command?.type === 'add_expense' && (
            <>
              <p><span className="text-gray-500">Amount:</span> ${result.data.amount}</p>
              <p><span className="text-gray-500">Description:</span> {result.data.description}</p>
            </>
          )}
          {command?.type === 'log_time' && (
            <>
              <p><span className="text-gray-500">Hours:</span> {result.data.hours}</p>
              {result.data.job_name && (
                <p><span className="text-gray-500">Job:</span> {result.data.job_name}</p>
              )}
            </>
          )}
          {command?.type === 'add_todo' && (
            <>
              <p><span className="text-gray-500">Task:</span> {result.data.title}</p>
              {result.data.due_date && (
                <p><span className="text-gray-500">Due:</span> {result.data.due_date}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-center">
        {result.navigateTo && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            View
          </button>
        )}
        <button
          onClick={onNewCommand}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          New Command
        </button>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  transcript,
  onTryAgain,
}: {
  error: string;
  transcript: string;
  onTryAgain: () => void;
}) {
  const suggestions = getCommandSuggestions().slice(0, 3);

  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <XIcon className="w-6 h-6 text-red-600" />
      </div>
      <p className="text-red-700 font-medium mb-2">Could not understand</p>

      {transcript && (
        <p className="text-gray-500 text-sm italic mb-3">"{transcript}"</p>
      )}

      <p className="text-gray-600 text-sm mb-3">{error}</p>

      <div className="bg-gray-50 rounded-lg p-3 text-left text-sm mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Try saying:</p>
        {suggestions.map((s, i) => (
          <p key={i} className="text-gray-600">{s}</p>
        ))}
      </div>

      <button
        onClick={onTryAgain}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
      >
        Try Again
      </button>
    </div>
  );
}

// Icons
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
