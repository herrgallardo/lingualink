/**
 * Sound manager for notification sounds
 */

export type SoundType = 'message' | 'notification' | 'mention' | 'error' | 'success';

interface SoundConfig {
  frequency: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
}

// Using oscillator-based sounds instead of base64 data
const SOUNDS: Record<SoundType, SoundConfig> = {
  message: {
    frequency: 440,
    duration: 100,
    volume: 0.3,
    type: 'sine',
  },
  notification: {
    frequency: 587,
    duration: 150,
    volume: 0.5,
    type: 'sine',
  },
  mention: {
    frequency: 880,
    duration: 200,
    volume: 0.7,
    type: 'square',
  },
  error: {
    frequency: 200,
    duration: 300,
    volume: 0.5,
    type: 'sawtooth',
  },
  success: {
    frequency: 659,
    duration: 150,
    volume: 0.4,
    type: 'sine',
  },
};

// Type augmentation for webkit prefix
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Public interface for sound manager
export interface ISoundManager {
  play(type: SoundType, volume?: number): Promise<void>;
  setGlobalVolume(volume: number): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  beep(frequency?: number, duration?: number, volume?: number): Promise<void>;
}

class SoundManager implements ISoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private globalVolume: number = 1.0;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize in constructor, wait for user interaction
  }

  /**
   * Initialize audio context on first user interaction
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      const windowWithWebkit = window as WindowWithWebkit;
      const AudioContextConstructor = window.AudioContext || windowWithWebkit.webkitAudioContext;

      if (AudioContextConstructor) {
        this.audioContext = new AudioContextConstructor();
        this.initialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Play a sound using oscillator
   */
  async play(type: SoundType, volume?: number): Promise<void> {
    if (!this.enabled || typeof window === 'undefined') return;

    // Initialize on first play
    if (!this.initialized) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) return;

    try {
      const config = SOUNDS[type];
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = config.frequency;
      oscillator.type = config.type || 'sine';

      const finalVolume = this.globalVolume * (volume ?? config.volume);
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

      // Fade out to prevent clicks
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + config.duration / 1000,
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration / 1000);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  /**
   * Set global volume (0-1)
   */
  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a custom beep
   */
  async beep(frequency = 440, duration = 100, volume = 0.3): Promise<void> {
    if (!this.enabled || typeof window === 'undefined') return;

    // Initialize on first beep
    if (!this.initialized) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.value = volume * this.globalVolume;
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration / 1000,
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Failed to play beep:', error);
    }
  }
}

// Mock implementation for SSR
class MockSoundManager implements ISoundManager {
  async play(_type: SoundType, _volume?: number): Promise<void> {
    // Do nothing on server
  }

  setGlobalVolume(_volume: number): void {
    // Do nothing on server
  }

  setEnabled(_enabled: boolean): void {
    // Do nothing on server
  }

  isEnabled(): boolean {
    return false;
  }

  async beep(_frequency?: number, _duration?: number, _volume?: number): Promise<void> {
    // Do nothing on server
  }
}

// Singleton instance - only created on client
let soundManager: ISoundManager | null = null;

export function getSoundManager(): ISoundManager {
  if (typeof window === 'undefined') {
    // Return a mock for SSR that does nothing
    return new MockSoundManager();
  }

  if (!soundManager) {
    soundManager = new SoundManager();
  }

  return soundManager;
}

// React hook for using sound manager
export function useSoundManager(): ISoundManager {
  return getSoundManager();
}
