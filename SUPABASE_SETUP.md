# Presi5 - Supabase Integration Setup Guide

## Overview

Presi5 now includes full user authentication, presentation management, credit system, and **Gemini TTS audio generation** powered by Supabase. This guide will walk you through setting up your Supabase project and configuring the application.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization and enter project details:
   - **Name**: `presi5` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
4. Wait for the project to be created (2-3 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-ref.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### 3. Configure Environment Variables

1. In your project root, create `.env.local` file:

```bash
# Copy from env.example
cp env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your existing OpenRouter and Gemini keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Make sure you have a valid `GEMINI_API_KEY` for the audio generation feature to work.

### 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from your project root
3. Paste it into a new query and click **Run**

This will create:
- **profiles** table (user data + credits)
- **presentations** table (user presentations)
- **audio_files** table (audio file metadata)
- **user_credits** table (credit usage tracking)
- Row Level Security (RLS) policies
- Database functions for credit management
- **Storage bucket for audio files** (`audio-files`)

### 5. Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure **Site URL**: `http://localhost:3000` (for development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - For production, add your domain: `https://yourdomain.com/auth/callback`

### 6. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000`
3. You should be redirected to `/login`
4. Try creating a new account
5. Check your Supabase dashboard to see the new user in **Authentication** → **Users**

## 📋 Features Overview

### 🔐 Authentication System
- **User Registration**: Email/password signup with email confirmation
- **User Login**: Secure authentication with JWT tokens
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Session Management**: Persistent sessions across browser refreshes

### 👤 User Management
- **User Profiles**: Customizable profiles with full name, username, website
- **Credits System**: Each user starts with 10 free credits
- **Credit Tracking**: Detailed history of credit usage
- **Dashboard**: Personal dashboard showing presentations and account stats

### 🎯 Presentation Management
- **User-Owned Presentations**: Each presentation belongs to a specific user
- **Database Storage**: Presentations stored securely with metadata
- **Access Control**: Users can only access their own presentations
- **Audio Integration**: Audio files linked to presentations with metadata

### 💳 Credits System
- **Credit Deduction**: 1 credit per presentation generation
- **Automatic Tracking**: Credits automatically deducted on successful generation
- **Usage History**: Detailed log of all credit transactions
- **Refund Logic**: Credits refunded if presentation generation fails

### 🎵 Audio File Management with Gemini TTS
- **Gemini TTS Integration**: Uses Google's Gemini 2.5 Pro TTS model for high-quality audio
- **Supabase Storage**: Audio files stored securely in Supabase Storage bucket
- **Automatic Generation**: Audio automatically generated for each presentation element
- **User Isolation**: Audio files organized by user ID and presentation ID
- **Public URLs**: Audio files accessible via public URLs for playback
- **Multiple Voices**: Support for different voice options (Kore, Charon, Fenrir, etc.)

#### Audio Generation Process:
1. **Text Extraction**: Speech content extracted from presentation elements
2. **TTS Generation**: Each speech element converted to audio using Gemini TTS
3. **Storage Upload**: Audio files uploaded to `audio-files` bucket in Supabase Storage
4. **Database Tracking**: Metadata stored in `audio_files` table
5. **Public Access**: Files accessible via public URLs for presentation playback

#### Audio File Structure:
```
audio-files/
├── {user-id}/
│   └── {presentation-id}/
│       ├── slide-1-element-1.wav
│       ├── slide-1-element-2.wav
│       └── ...
```

## 🗂️ Database Schema

### Tables

#### `profiles`
- User profile information
- Credit balance tracking
- Linked to Supabase auth.users

#### `presentations`
- User presentation content
- JSONB storage for flexible content structure
- Audio generation status tracking

#### `audio_files`
- Audio file metadata and paths
- Element-level audio tracking
- Duration and order information
- Links to Supabase Storage files

#### `user_credits`
- Credit usage history
- Action tracking (presentation_creation, etc.)
- Audit trail for all credit transactions

### Storage Buckets

#### `audio-files`
- **Public bucket** for audio file storage
- Organized by user ID and presentation ID
- Automatic cleanup policies via database CASCADE
- Supports WAV audio format

### Functions

#### `deduct_credits(user_uuid, amount, description, action_type)`
- Safely deduct credits from user account
- Atomic operation with validation
- Automatic usage logging

#### `add_credits(user_uuid, amount, description)`
- Add credits to user account (admin function)
- Automatic logging with negative usage

## 🔒 Security Features

### Row Level Security (RLS)
- **Profiles**: Users can only access their own profile
- **Presentations**: Users can only CRUD their own presentations
- **Audio Files**: Access limited to owner's presentations
- **Credits**: Users can only view their own credit history
- **Storage**: Audio files organized by user ID with access policies

### Storage Security
- **Upload Policy**: Only authenticated users can upload
- **Access Policy**: Public read access for audio playback
- **Update/Delete Policy**: Users can only modify their own files
- **Path Structure**: User ID in path prevents cross-user access

### Authentication Middleware
- Automatic session refresh
- Protected route redirection
- Server-side user verification

### API Security
- User authentication required for all content generation
- Presentation ownership verification
- Credit validation before processing
- Audio file cleanup on failures

## 🎵 Audio Generation Details

### Gemini TTS Configuration
- **Model**: `gemini-2.5-pro-preview-tts`
- **Default Voice**: `Kore` (Hebrew-compatible)
- **Output Format**: WAV with automatic conversion
- **Quality**: High-quality speech synthesis

### Voice Options
Available voices for different languages and styles:
- **Kore**: Default voice, works well with Hebrew and English
- **Charon**: Alternative voice option
- **Fenrir**: Alternative voice option  
- **Aoede**: Alternative voice option
- **Puck**: Alternative voice option

### Audio Processing
1. **Text Preparation**: Clean speech text from presentation elements
2. **TTS Generation**: Stream-based generation for efficiency
3. **Format Conversion**: Automatic WAV conversion if needed
4. **Upload**: Direct upload to Supabase Storage
5. **Metadata**: Store file info in database for quick access

## 🚀 Deployment Considerations

### Environment Variables
Update your production environment with:
- Production Supabase URL and keys
- Correct redirect URLs in Supabase settings
- Secure API keys for OpenRouter and Gemini
- **Valid Gemini API key for TTS functionality**

### Database Setup
- Run the schema SQL in your production Supabase project
- Ensure RLS is enabled
- Test all functions and policies
- **Verify storage bucket creation and policies**

### Storage Configuration
- **Audio Bucket**: Ensure `audio-files` bucket is created and public
- **Cleanup Policies**: Set up automatic cleanup for old files if needed
- **CDN**: Consider CDN for audio file delivery in production
- **Backup**: Regular backup of audio files if required

## 🔧 Troubleshooting

### Common Issues

**1. "Authentication required" errors**
- Check environment variables are set correctly
- Verify Supabase URL and anon key
- Ensure user is logged in

**2. "Insufficient credits" error**
- Check user's credit balance in profiles table
- Use `add_credits()` function to add credits
- Verify credit deduction logic

**3. Database permission errors**
- Check RLS policies are enabled
- Verify user authentication
- Test policies in Supabase SQL editor

**4. Audio generation failures**
- **Check Gemini API key is valid and has TTS permissions**
- Verify Supabase Storage bucket exists and is accessible
- Check upload permissions and storage policies
- Verify audio file cleanup on errors

**5. Audio playback issues**
- Check if audio files exist in Supabase Storage
- Verify public URL generation
- Test audio file accessibility
- Check browser audio permissions

### Audio-Specific Troubleshooting

**1. "No audio data received from Gemini TTS"**
- Verify `GEMINI_API_KEY` is set and valid
- Check if Gemini TTS model is available in your region
- Test with shorter text samples

**2. "Failed to upload audio file"**
- Check Supabase Storage bucket permissions
- Verify bucket `audio-files` exists
- Test storage policies in Supabase dashboard

**3. Audio files not playing**
- Check public URL generation
- Verify browser supports WAV format
- Test direct file access in browser

### Useful SQL Queries

```sql
-- Check user credits
SELECT id, email, credits FROM profiles 
JOIN auth.users ON profiles.id = auth.users.id;

-- Add credits to a user
SELECT add_credits('user-uuid-here', 5, 'Admin credit bonus');

-- View credit usage history
SELECT * FROM user_credits 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC;

-- Check presentation count by user
SELECT user_id, COUNT(*) as presentation_count 
FROM presentations 
GROUP BY user_id;

-- Check audio files for a presentation
SELECT af.*, p.title 
FROM audio_files af
JOIN presentations p ON af.presentation_id = p.id
WHERE af.presentation_id = 'presentation-uuid-here';

-- Check storage usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects 
WHERE bucket_id = 'audio-files'
GROUP BY bucket_id;
```

## 📝 Next Steps

1. **Customize Credit Amounts**: Modify default credit values in schema
2. **Add Payment Integration**: Implement credit purchasing system
3. **Enhanced Analytics**: Add usage tracking and analytics
4. **Admin Panel**: Create admin interface for user management
5. **Email Templates**: Customize Supabase auth email templates
6. **Audio Optimization**: Implement audio compression and caching
7. **Voice Customization**: Add user voice preference settings
8. **Batch Processing**: Optimize audio generation for large presentations

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase logs in the dashboard
3. Verify all environment variables
4. Test database connections and permissions
5. **Check Gemini API key validity and permissions**
6. **Verify Supabase Storage bucket setup**

For additional help, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage) 