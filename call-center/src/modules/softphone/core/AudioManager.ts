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
    // Use the ringtone file from assets
    this.ringtoneAudio.src = '/assets/sounds/ringtone.mp3';
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
