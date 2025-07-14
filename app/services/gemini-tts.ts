import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

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

  async generateAudio(text: string, voiceName: string = 'Zephyr'): Promise<TTSResult> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Truncate very long text to avoid API limits
    const maxLength = 5000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    try {
      console.log(`🎵 Generating real audio for text: "${truncatedText.substring(0, 50)}..."`);
      console.log(`🔊 Using voice: ${voiceName}`);
      
      const config = {
        temperature: 1,
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            }
          }
        },
      };

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: truncatedText,
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      let audioBuffer: Buffer | null = null;
      let mimeType = 'audio/wav';
      
      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }
        
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          mimeType = inlineData.mimeType || 'audio/wav';
          
          let buffer: Buffer = Buffer.from(inlineData.data || '', 'base64');
          
          // Convert to WAV if needed
          let fileExtension = mime.getExtension(mimeType);
          if (!fileExtension) {
            fileExtension = 'wav';
            buffer = this.convertToWav(inlineData.data || '', mimeType);
            mimeType = 'audio/wav';
          }
          
          audioBuffer = buffer;
          break; // Take the first audio chunk
        }
      }

      if (!audioBuffer) {
        throw new Error(`No audio data received from Gemini TTS for text: "${truncatedText.substring(0, 100)}..."`);
      }

      const fileName = `audio_${Date.now()}.wav`;
      
      console.log(`✅ Real audio generated: ${fileName} (${audioBuffer.length} bytes)`);
      
      return {
        audioBuffer,
        fileName,
        mimeType
      };
    } catch (error) {
      console.error('🚨 Gemini TTS Error:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToWav(rawData: string, mimeType: string): Buffer {
    const options = this.parseMimeType(mimeType);
    const rawBuffer = Buffer.from(rawData, 'base64');
    const wavHeader = this.createWavHeader(rawBuffer.length, options);
    return Buffer.concat([wavHeader, rawBuffer]);
  }

  private parseMimeType(mimeType: string): WavConversionOptions {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options: Partial<WavConversionOptions> = {
      numChannels: 1,
      sampleRate: 22050,
      bitsPerSample: 16
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
    const { numChannels, sampleRate, bitsPerSample } = options;

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

  getAvailableVoices(): string[] {
    return [
      'Zephyr',
      'Kore',
      'Aria',
      'Charon'
    ];
  }
}

export default GeminiTTSService; 