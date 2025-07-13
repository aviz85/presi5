import GeminiTTSService from './gemini-tts';
import { PresentationContent } from './content-generator';
import HTMLConverterService from './html-converter';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

interface AudioFile {
  slideId: string;
  elementId?: string;
  elementOrder?: number;
  audioPath: string;
  audioUrl: string;
  duration?: number;
}

interface BatchAudioResult {
  presentationId: string;
  audioFiles: AudioFile[];
  totalDuration: number;
  status: 'success' | 'error';
  error?: string;
}

class AudioBatchGenerator {
  private ttsService: GeminiTTSService;
  private htmlConverter: HTMLConverterService;
  private audioDir: string;

  constructor() {
    this.ttsService = new GeminiTTSService();
    this.htmlConverter = new HTMLConverterService();
    this.audioDir = path.join(process.cwd(), 'public', 'audio');
  }

  async generatePresentationAudio(
    presentationContent: PresentationContent,
    voiceName: string = 'Kore'
  ): Promise<BatchAudioResult> {
    const presentationId = this.generatePresentationId(presentationContent.title);
    const audioFiles: AudioFile[] = [];
    let totalDuration = 0;

    try {
      // Ensure audio directory exists
      await this.ensureAudioDirectory(presentationId);

      // Convert presentation to HTML format to extract speech content
      const htmlPresentation = this.htmlConverter.convertToHTML(presentationContent);
      const elementSpeechContent = this.htmlConverter.extractElementSpeechContent(htmlPresentation);

      // Generate audio for each speech element
      for (let i = 0; i < elementSpeechContent.length; i++) {
        const elementContent = elementSpeechContent[i];
        
        if (elementContent.speechText.trim()) {
          const fileName = `${elementContent.slideId}-${elementContent.elementId}.wav`;
          const audioPath = path.join(this.audioDir, presentationId, fileName);
          const audioUrl = `/audio/${presentationId}/${fileName}`;

          // Generate and save audio
          await this.ttsService.generateAndSaveAudio(
            elementContent.speechText,
            audioPath,
            voiceName
          );

          // Estimate duration (rough calculation: 150 words per minute)
          const wordCount = elementContent.speechText.split(/\s+/).length;
          const estimatedDuration = Math.max(2, (wordCount / 150) * 60); // minimum 2 seconds

          audioFiles.push({
            slideId: elementContent.slideId,
            elementId: elementContent.elementId,
            elementOrder: elementContent.order,
            audioPath,
            audioUrl,
            duration: estimatedDuration
          });

          totalDuration += estimatedDuration;
        }
      }

      // Save audio metadata
      await this.saveAudioMetadata(presentationId, {
        presentationId,
        audioFiles,
        totalDuration,
        status: 'success'
      });

      return {
        presentationId,
        audioFiles,
        totalDuration,
        status: 'success'
      };

    } catch (error) {
      console.error('Batch audio generation error:', error);
      return {
        presentationId,
        audioFiles: [],
        totalDuration: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAudioFiles(presentationId: string): Promise<AudioFile[]> {
    try {
      const metadataPath = path.join(this.audioDir, presentationId, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        return metadata.audioFiles || [];
      }
      return [];
    } catch (error) {
      console.error('Error loading audio metadata:', error);
      return [];
    }
  }

  private generatePresentationId(title: string): string {
    const timestamp = Date.now();
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${sanitizedTitle}-${timestamp}`;
  }

  private async ensureAudioDirectory(presentationId: string): Promise<void> {
    const dirPath = path.join(this.audioDir, presentationId);
    await mkdir(dirPath, { recursive: true });
  }

  private async saveAudioMetadata(presentationId: string, metadata: BatchAudioResult): Promise<void> {
    const metadataPath = path.join(this.audioDir, presentationId, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  // Clean up old audio files (optional - for maintenance)
  async cleanupOldAudio(olderThanDays: number = 7): Promise<void> {
    try {
      const { readdir, stat, rm } = await import('fs/promises');
      const audioBaseDir = this.audioDir;
      
      const entries = await readdir(audioBaseDir, { withFileTypes: true });
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(audioBaseDir, entry.name);
          const stats = await stat(dirPath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await rm(dirPath, { recursive: true, force: true });
            console.log(`Cleaned up old audio directory: ${entry.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old audio files:', error);
    }
  }
}

export default AudioBatchGenerator; 