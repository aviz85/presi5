import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile } from 'fs/promises';
import path from 'path';

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

interface TTSResult {
  audioBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

class GeminiTTSService {
  private ai: GoogleGenAI;
  private model = 'gemini-2.5-pro-preview-tts';

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async generateAudio(text: string, voiceName: string = 'Kore'): Promise<TTSResult> {
    const config = {
      temperature: 1,
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          }
        }
      },
    };

    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: text,
          },
        ],
      },
    ];

    try {
      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }

        const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData) {
          const fileName = `audio_${Date.now()}`;
          let fileExtension = mime.getExtension(inlineData.mimeType || '');
          let buffer: Buffer = Buffer.from(inlineData.data || '', 'base64');
          
          if (!fileExtension) {
            fileExtension = 'wav';
            buffer = this.convertToWav(inlineData.data || '', inlineData.mimeType || '');
          }

          return {
            audioBuffer: buffer,
            fileName: `${fileName}.${fileExtension}`,
            mimeType: inlineData.mimeType || 'audio/wav'
          };
        }
      }

      throw new Error('No audio data received from Gemini TTS');
    } catch (error) {
      console.error('Gemini TTS Error:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateAndSaveAudio(text: string, outputPath: string, voiceName: string = 'Kore'): Promise<string> {
    const result = await this.generateAudio(text, voiceName);
    
    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    await this.ensureDirectoryExists(dir);
    
    // Save the audio file
    await writeFile(outputPath, result.audioBuffer);
    
    return outputPath;
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await import('fs/promises').then(fs => fs.mkdir(dir, { recursive: true }));
    } catch {
      // Directory might already exist, ignore error
    }
  }

  private convertToWav(rawData: string, mimeType: string): Buffer {
    const options = this.parseMimeType(mimeType);
    const wavHeader = this.createWavHeader(rawData.length, options);
    const buffer = Buffer.from(rawData, 'base64');

    return Buffer.concat([wavHeader, buffer]);
  }

  private parseMimeType(mimeType: string): WavConversionOptions {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [, format] = fileType.split('/');

    const options: Partial<WavConversionOptions> = {
      numChannels: 1,
    };

    if (format && format.startsWith('L')) {
      const bits = parseInt(format.slice(1), 10);
      if (!isNaN(bits)) {
        options.bitsPerSample = bits;
      }
    }

    for (const param of params) {
      const [key, value] = param.split('=').map(s => s.trim());
      if (key === 'rate') {
        options.sampleRate = parseInt(value, 10);
      }
    }

    return options as WavConversionOptions;
  }

  private createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
    const {
      numChannels,
      sampleRate,
      bitsPerSample,
    } = options;

    // http://soundfile.sapp.org/doc/WaveFormat
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);                      // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
    buffer.write('WAVE', 8);                      // Format
    buffer.write('fmt ', 12);                     // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
    buffer.writeUInt32LE(byteRate, 28);           // ByteRate
    buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
    buffer.write('data', 36);                     // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

    return buffer;
  }

  // Get available voice options
  getAvailableVoices(): string[] {
    return [
      'Kore',
      'Charon',
      'Fenrir',
      'Aoede',
      'Puck'
    ];
  }
}

export default GeminiTTSService; 