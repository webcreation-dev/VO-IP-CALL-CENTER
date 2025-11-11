import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from 'src/core/logger/logger.service';
import { IvrAudioFile } from '../entities/ivr-audio-file.entity';
import * as path from 'path';
import * as fs from 'fs';

// ivr-audio.service.ts
@Injectable()
export class IvrAudioService {
  private readonly soundsBasePath: string;

  constructor(
    @InjectRepository(IvrAudioFile)
    private audioRepo: Repository<IvrAudioFile>,
    private configService: ConfigService,
    private logger: CustomLoggerService,
  ) {
    // Utiliser variable d'env ou fallback sur ./uploads/sounds
    this.soundsBasePath = this.configService.get<string>('ASTERISK_SOUNDS_PATH') || './uploads/sounds';
  }

  /**
   * Upload un fichier audio
   */
  async uploadAudioFile(
    tenantId: number,
    file: Express.Multer.File,
    metadata: { name: string; language?: string },
  ): Promise<IvrAudioFile> {
    // 1. Générer le nom de fichier avec préfixe tenant
    const extension = path.extname(file.originalname);
    const filename = `t${tenantId}_${metadata.name}${extension}`;
    const filepath = path.join(this.soundsBasePath, filename);

    // 2. Créer le répertoire si nécessaire
    await fs.promises.mkdir(this.soundsBasePath, { recursive: true });

    // 3. Copier le fichier
    await fs.promises.writeFile(filepath, file.buffer);

    // 4. Obtenir la durée (via sox ou ffprobe)
    const duration = await this.getAudioDuration(filepath);

    // 5. Enregistrer en base
    const audioFile = this.audioRepo.create({
      tenant_id: tenantId,
      name: metadata.name,
      filename,
      filepath,
      format: extension.replace('.', ''),
      duration,
      language: metadata.language,
      filesize: file.size,
    });

    return this.audioRepo.save(audioFile);
  }

  /**
   * Résout le chemin d'un son (avec support des formats spéciaux)
   */
  async resolveSoundPath(sound: string, tenantId: number): Promise<string> {
    // Format spécial : "say:Bonjour" → TTS à la volée
    if (sound.startsWith('say:')) {
      const text = sound.replace('say:', '');
      return this.generateTempTts(text, tenantId);
    }

    // Format spécial : "number:123" → Say number
    if (sound.startsWith('number:')) {
      const number = sound.replace('number:', '');
      return `number:${number}`; // Asterisk gère nativement
    }

    // Format spécial : "digits:456" → Say digits
    if (sound.startsWith('digits:')) {
      const digits = sound.replace('digits:', '');
      return `digits:${digits}`;
    }

    // Chercher d'abord dans les fichiers audio custom du tenant
    const audioFile = await this.audioRepo.findOne({
      where: { tenant_id: tenantId, name: sound },
    });

    if (audioFile) {
      // Retourner le chemin sans extension (Asterisk le gère)
      return audioFile.filepath.replace(path.extname(audioFile.filepath), '');
    }

    // Fallback: Son standard Asterisk (dans /var/lib/asterisk/sounds/)
    if (!sound.includes('/') && !sound.startsWith('t')) {
      return `sound:${sound}`; // Ex: "beep" → "/var/lib/asterisk/sounds/beep"
    }

    // Si aucun fichier trouvé, utiliser beep système comme fallback
    this.logger.warn(`Fichier audio introuvable: ${sound} (tenant ${tenantId})`);
    return 'sound:beep';
  }

  /**
   * Obtient la durée d'un fichier audio
   */
  private async getAudioDuration(filepath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      // Utiliser ffprobe (plus fiable que sox)
      exec(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`,
        (error, stdout) => {
          if (error) {
            this.logger.warn(`Impossible de déterminer la durée: ${error.message}`);
            resolve(0);
          } else {
            resolve(parseFloat(stdout.trim()));
          }
        },
      );
    });
  }

  /**
   * Génère un fichier TTS temporaire
   */
  private async generateTempTts(text: string, tenantId: number): Promise<string> {
    // TODO: Intégrer Google TTS, Amazon Polly, ou Festival
    // Pour l'instant, retourner un son par défaut
    this.logger.warn('TTS non implémenté, utilisation du son par défaut');
    return 'sound:beep';
  }

  /**
   * Génère un audio via TTS et l'enregistre
   */
  async generateTtsAudio(
    tenantId: number,
    dto: { text: string; language: string; voice?: string; name: string },
  ): Promise<IvrAudioFile> {
    // Exemple avec Google TTS (nécessite @google-cloud/text-to-speech)
    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();

    const request = {
      input: { text: dto.text },
      voice: {
        languageCode: dto.language,
        name: dto.voice,
      },
      audioConfig: { audioEncoding: 'LINEAR16' },
    };

    const [response] = await client.synthesizeSpeech(request);

    // Sauvegarder le fichier
    const filename = `t${tenantId}_${dto.name}_tts.wav`;
    const filepath = path.join(this.soundsBasePath, filename);
    await fs.promises.writeFile(filepath, response.audioContent, 'binary');

    // Obtenir la durée
    const duration = await this.getAudioDuration(filepath);

    // Enregistrer en base
    const audioFile = this.audioRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      filename,
      filepath,
      format: 'wav',
      duration,
      language: dto.language,
      filesize: response.audioContent.length,
    });

    return this.audioRepo.save(audioFile);
  }

  /**
   * Convertit un fichier audio dans un format Asterisk
   */
  async convertAudioFile(
    id: number,
    tenantId: number,
    targetFormat: 'wav' | 'gsm' | 'sln16',
  ): Promise<IvrAudioFile> {
    const audioFile = await this.audioRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!audioFile) {
      throw new NotFoundException('Fichier audio introuvable');
    }

    // Utiliser sox pour la conversion
    const newFilename = audioFile.filename.replace(
      path.extname(audioFile.filename),
      `.${targetFormat}`,
    );
    const newFilepath = path.join(this.soundsBasePath, newFilename);

    await new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(
        `sox "${audioFile.filepath}" -r 8000 -c 1 "${newFilepath}"`,
        (error) => {
          if (error) reject(error);
          else resolve(null);
        },
      );
    });

    // Créer une nouvelle entrée
    const stat = await fs.promises.stat(newFilepath);
    const duration = await this.getAudioDuration(newFilepath);

    const convertedFile = this.audioRepo.create({
      tenant_id: tenantId,
      name: `${audioFile.name}_${targetFormat}`,
      filename: newFilename,
      filepath: newFilepath,
      format: targetFormat,
      duration,
      language: audioFile.language,
      filesize: stat.size,
    });

    return this.audioRepo.save(convertedFile);
  }

  async findAllAudioFiles(
    tenantId: number,
    language?: string,
  ): Promise<IvrAudioFile[]> {
    const where: any = { tenant_id: tenantId };
    if (language) where.language = language;

    return this.audioRepo.find({ where, order: { name: 'ASC' } });
  }

  async findAudioFileById(id: number, tenantId: number): Promise<IvrAudioFile> {
    const file = await this.audioRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!file) {
      throw new NotFoundException('Fichier audio introuvable');
    }

    return file;
  }

  async removeAudioFile(id: number, tenantId: number): Promise<void> {
    const file = await this.findAudioFileById(id, tenantId);

    // Supprimer le fichier physique
    try {
      await fs.promises.unlink(file.filepath);
    } catch (error) {
      this.logger.warn(`Impossible de supprimer ${file.filepath}: ${error.message}`);
    }

    // Supprimer de la base
    await this.audioRepo.delete({ id, tenant_id: tenantId });
  }
}