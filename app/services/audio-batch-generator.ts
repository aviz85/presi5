import GeminiTTSService from './gemini-tts';
import { PresentationContent } from './content-generator';
import HTMLConverterService from './html-converter';
import { createClient } from '@/lib/supabase/server';

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

  constructor() {
    this.ttsService = new GeminiTTSService();
    this.htmlConverter = new HTMLConverterService();
  }

  async generatePresentationAudio(
    presentationContent: PresentationContent,
    voiceName: string = 'Kore',
    userId: string
  ): Promise<BatchAudioResult> {
    const presentationId = this.generatePresentationId(presentationContent.title);
    const audioFiles: AudioFile[] = [];
    let totalDuration = 0;

    try {
      const supabase = await createClient();

      // Convert presentation to HTML format to extract speech content
      const htmlPresentation = this.htmlConverter.convertToHTML(presentationContent);
      const elementSpeechContent = this.htmlConverter.extractElementSpeechContent(htmlPresentation);

      console.log(`🎵 Generating ${elementSpeechContent.length} audio files for presentation ${presentationId}`);

      // Generate audio for each speech element
      for (let i = 0; i < elementSpeechContent.length; i++) {
        const elementContent = elementSpeechContent[i];
        
        if (elementContent.speechText.trim()) {
          console.log(`🔊 Generating audio for element ${elementContent.elementId}: "${elementContent.speechText.substring(0, 50)}..."`);

          // Generate audio using Gemini TTS
          const audioResult = await this.ttsService.generateAudio(
            elementContent.speechText,
            voiceName
          );

          // Create file path in Supabase Storage
          const fileName = `${elementContent.slideId}-${elementContent.elementId}.wav`;
          const filePath = `${userId}/${presentationId}/${fileName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('audio-files')
            .upload(filePath, audioResult.audioBuffer, {
              contentType: audioResult.mimeType,
              upsert: true
            });

          if (uploadError) {
            console.error(`❌ Failed to upload audio file ${fileName}:`, uploadError);
            throw new Error(`Failed to upload audio file: ${uploadError.message}`);
          }

          // Get public URL for the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('audio-files')
            .getPublicUrl(filePath);

          // Estimate duration (rough calculation: 150 words per minute)
          const wordCount = elementContent.speechText.split(/\s+/).length;
          const estimatedDuration = Math.max(2, (wordCount / 150) * 60); // minimum 2 seconds

          audioFiles.push({
            slideId: elementContent.slideId,
            elementId: elementContent.elementId,
            elementOrder: elementContent.order,
            audioPath: filePath,
            audioUrl: publicUrl,
            duration: estimatedDuration
          });

          totalDuration += estimatedDuration;
          console.log(`✅ Audio file uploaded: ${fileName} (${estimatedDuration.toFixed(1)}s)`);
        }
      }

      console.log(`🎉 Audio generation completed: ${audioFiles.length} files, total duration: ${totalDuration.toFixed(1)}s`);

      return {
        presentationId,
        audioFiles,
        totalDuration,
        status: 'success'
      };

    } catch (error) {
      console.error('❌ Batch audio generation error:', error);
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
      const supabase = await createClient();
      
      // Get audio files from database
      const { data: audioFiles, error } = await supabase
        .from('audio_files')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('element_order');

      if (error) {
        console.error('Error loading audio files from database:', error);
        return [];
      }

      // Convert database records to AudioFile format with public URLs
      const audioFileList: AudioFile[] = [];
      
      for (const file of audioFiles) {
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(file.file_path);

        audioFileList.push({
          slideId: `slide-${Math.floor(file.element_order / 10) + 1}`,
          elementId: file.element_id,
          elementOrder: file.element_order,
          audioPath: file.file_path,
          audioUrl: publicUrl,
          duration: file.duration || undefined
        });
      }

      return audioFileList;
    } catch (error) {
      console.error('Error loading audio metadata:', error);
      return [];
    }
  }

  async deleteAudioFiles(presentationId: string): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Get all audio files for this presentation
      const { data: audioFiles, error: fetchError } = await supabase
        .from('audio_files')
        .select('file_path')
        .eq('presentation_id', presentationId);

      if (fetchError) {
        console.error('Error fetching audio files for deletion:', fetchError);
        return;
      }

      // Delete files from storage
      if (audioFiles && audioFiles.length > 0) {
        const filePaths = audioFiles.map(file => file.file_path);
        
        const { error: deleteError } = await supabase.storage
          .from('audio-files')
          .remove(filePaths);

        if (deleteError) {
          console.error('Error deleting audio files from storage:', deleteError);
        } else {
          console.log(`🗑️ Deleted ${filePaths.length} audio files from storage`);
        }
      }

      // Delete metadata from database (will be handled by CASCADE)
      console.log('✅ Audio files cleanup completed');
    } catch (error) {
      console.error('Error deleting audio files:', error);
    }
  }

  private generatePresentationId(title: string): string {
    const timestamp = Date.now();
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    return `${sanitizedTitle}-${timestamp}`;
  }
}

export default AudioBatchGenerator; 