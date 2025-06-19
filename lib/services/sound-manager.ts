/**
 * Sound manager for notification sounds
 */

export type SoundType = 'message' | 'notification' | 'mention' | 'error' | 'success';

interface SoundConfig {
  url: string;
  volume?: number;
  duration?: number;
}

// Using data URLs for built-in sounds (small beep sounds)
const SOUNDS: Record<SoundType, SoundConfig> = {
  message: {
    url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAAA=',
    volume: 0.3,
  },
  notification: {
    url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAAA=',
    volume: 0.5,
  },
  mention: {
    url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAAA=',
    volume: 0.7,
  },
  error: {
    url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAAA=',
    volume: 0.5,
  },
  success: {
    url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAAA=',
    volume: 0.4,
  },
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private globalVolume: number = 1.0;

  constructor() {
    // Initialize on first user interaction to comply with browser policies
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          this.preloadSounds();
        }
        // Remove listeners after initialization
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
      };

      document.addEventListener('click', initAudio, { once: true });
      document.addEventListener('keydown', initAudio, { once: true });
    }
  }

  /**
   * Preload all sounds into audio buffers
   */
  private async preloadSounds() {
    if (!this.audioContext) return;

    for (const [type, config] of Object.entries(SOUNDS)) {
      try {
        const response = await fetch(config.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(type as SoundType, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sound: ${type}`, error);
      }
    }
  }

  /**
   * Play a sound
   */
  async play(type: SoundType, volume?: number): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

    const buffer = this.audioBuffers.get(type);
    if (!buffer) {
      console.warn(`Sound not loaded: ${type}`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set volume
      const soundConfig = SOUNDS[type];
      const finalVolume = this.globalVolume * (volume ?? soundConfig.volume ?? 1.0);
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

      source.start(0);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  /**
   * Set global volume (0-1)
   */
  setGlobalVolume(volume: number) {
    this.globalVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a simple beep using oscillator (fallback)
   */
  async beep(frequency = 440, duration = 100, volume = 0.3): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

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

// Singleton instance
let soundManager: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManager && typeof window !== 'undefined') {
    soundManager = new SoundManager();
  }
  return soundManager!;
}

// React hook for using sound manager
export function useSoundManager() {
  return getSoundManager();
}
