/**
 * Voice Input/Output Utilities
 * Provides speech recognition and text-to-speech capabilities
 */

export interface VoiceConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export class VoiceRecognition {
  private recognition: any;
  private isListening: boolean = false;

  constructor(config: VoiceConfig = {}) {
    if (typeof window === 'undefined') return;

    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = config.lang || 'en-US';
    this.recognition.continuous = config.continuous || false;
    this.recognition.interimResults = config.interimResults || true;
  }

  start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (error: any) => void
  ): void {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;
      onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      onError?.(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
    this.isListening = false;
  }

  isActive(): boolean {
    return this.isListening;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
}

export class VoiceSynthesis {
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      volume?: number;
      voice?: string;
      onEnd?: () => void;
      onStart?: () => void;
    } = {}
  ): void {
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = options.rate || 1.0;
    this.utterance.pitch = options.pitch || 1.0;
    this.utterance.volume = options.volume || 1.0;

    // Set voice if specified
    if (options.voice) {
      const voices = this.synth.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) {
        this.utterance.voice = selectedVoice;
      }
    }

    this.utterance.onstart = () => {
      this.isSpeaking = true;
      options.onStart?.();
    };

    this.utterance.onend = () => {
      this.isSpeaking = false;
      options.onEnd?.();
    };

    this.synth.speak(this.utterance);
  }

  stop(): void {
    if (!this.synth) return;
    this.synth.cancel();
    this.isSpeaking = false;
  }

  pause(): void {
    if (!this.synth || !this.isSpeaking) return;
    this.synth.pause();
  }

  resume(): void {
    if (!this.synth) return;
    this.synth.resume();
  }

  isActive(): boolean {
    return this.isSpeaking;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

// Utility function to read debate aloud
export function readDebateAloud(
  messages: Array<{ type: string; content: string; agent?: string }>,
  synthesis: VoiceSynthesis,
  onComplete?: () => void
): void {
  const relevantMessages = messages.filter(
    m => m.type === 'agent' || m.type === 'final' || m.type === 'moderator'
  );

  let currentIndex = 0;

  const readNext = () => {
    if (currentIndex >= relevantMessages.length) {
      onComplete?.();
      return;
    }

    const message = relevantMessages[currentIndex];
    let text = message.content;

    // Add speaker prefix
    if (message.type === 'agent' && message.agent) {
      text = `${message.agent} says: ${text}`;
    } else if (message.type === 'moderator') {
      text = `Moderator: ${text}`;
    } else if (message.type === 'final') {
      text = `Final consensus: ${text}`;
    }

    synthesis.speak(text, {
      onEnd: () => {
        currentIndex++;
        readNext();
      }
    });
  };

  readNext();
}
