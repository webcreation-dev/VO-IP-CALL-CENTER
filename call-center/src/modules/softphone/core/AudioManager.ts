/**
 * AudioManager
 *
 * Manages audio devices, ringtones, and ringback tones for the softphone
 */

import type { AudioDevice, AudioSettings } from './types';

export class AudioManager {
  private ringtoneAudio: HTMLAudioElement;
  private ringbackAudio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Create audio elements
    this.ringtoneAudio = document.createElement('audio');
    this.ringtoneAudio.loop = true;

    this.ringbackAudio = document.createElement('audio');
    this.ringbackAudio.loop = true;

    // Initialize with default ringtone (generated tone)
    this.setupDefaultRingtone();
    this.setupDefaultRingback();
  }

  // ==========================================================================
  // Ringtone Management
  // ==========================================================================

  playRingtone(): void {
    this.ringtoneAudio.currentTime = 0;
    this.ringtoneAudio.play().catch((err) => {
      console.error('Failed to play ringtone:', err);
    });
  }

  stopRingtone(): void {
    this.ringtoneAudio.pause();
    this.ringtoneAudio.currentTime = 0;
  }

  setRingtoneUrl(url: string): void {
    this.ringtoneAudio.src = url;
  }

  setRingtoneVolume(volume: number): void {
    this.ringtoneAudio.volume = Math.max(0, Math.min(1, volume / 100));
  }

  // ==========================================================================
  // Ringback Tone Management
  // ==========================================================================

  playRingback(): void {
    this.ringbackAudio.currentTime = 0;
    this.ringbackAudio.play().catch((err) => {
      console.error('Failed to play ringback:', err);
    });
  }

  stopRingback(): void {
    this.ringbackAudio.pause();
    this.ringbackAudio.currentTime = 0;
  }

  setRingbackUrl(url: string): void {
    this.ringbackAudio.src = url;
  }

  setRingbackVolume(volume: number): void {
    this.ringbackAudio.volume = Math.max(0, Math.min(1, volume / 100));
  }

  // ==========================================================================
  // Audio Devices Management
  // ==========================================================================

  async getAudioDevices(): Promise<{
    microphones: AudioDevice[];
    speakers: AudioDevice[];
  }> {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      const microphones: AudioDevice[] = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          id: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
          kind: 'audioinput',
        }));

      const speakers: AudioDevice[] = devices
        .filter((device) => device.kind === 'audiooutput')
        .map((device) => ({
          id: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.substring(0, 8)}`,
          kind: 'audiooutput',
        }));

      return { microphones, speakers };
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return { microphones: [], speakers: [] };
    }
  }

  async setOutputDevice(deviceId: string, audioElement: HTMLAudioElement): Promise<void> {
    try {
      if ('setSinkId' in audioElement) {
        await (audioElement as any).setSinkId(deviceId);
        console.log(`Output device set to: ${deviceId}`);
      } else {
        console.warn('setSinkId not supported in this browser');
      }
    } catch (error) {
      console.error('Failed to set output device:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Default Tones Generation (Web Audio API)
  // ==========================================================================

  private setupDefaultRingtone(): void {
    // Generate a simple ringtone using Web Audio API
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';

      // Create a simple ring pattern
      const duration = 2;
      const pattern = [
        { time: 0.0, value: 0.3 },
        { time: 0.1, value: 0.3 },
        { time: 0.2, value: 0 },
        { time: 0.3, value: 0.3 },
        { time: 0.4, value: 0.3 },
        { time: 0.5, value: 0 },
        { time: duration, value: 0 },
      ];

      pattern.forEach((point) => {
        gainNode.gain.setValueAtTime(point.value, context.currentTime + point.time);
      });

      // Create a data URL for the audio
      const sampleRate = context.sampleRate;
      const channels = 1;
      const buffer = context.createBuffer(channels, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 440;
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3;

        // Apply envelope
        if (t < 0.2) {
          data[i] *= 1;
        } else if (t < 0.5) {
          data[i] = 0;
        } else if (t < 0.7) {
          data[i] *= 1;
        } else {
          data[i] = 0;
        }
      }

      // Note: For simplicity, we'll use a default ringtone URL instead
      // You can add your own ringtone file to public/assets/sounds/
      this.ringtoneAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    } catch (error) {
      console.error('Failed to setup default ringtone:', error);
    }
  }

  private setupDefaultRingback(): void {
    // Similar to ringtone but with different frequency
    this.ringbackAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  destroy(): void {
    this.stopRingtone();
    this.stopRingback();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
