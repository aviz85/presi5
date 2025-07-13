# Presi5 - Supabase Integration Setup Guide

## Overview

Presi5 now includes full user authentication, presentation management, and credit system powered by Supabase. This guide will walk you through setting up your Supabase project and configuring the application.

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
- Storage bucket for audio files

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

### 🎵 Audio File Management
- **File Storage**: Audio files stored in organized directory structure
- **Database Tracking**: Metadata stored in database for quick access
- **User Isolation**: Users can only access audio for their presentations
- **Cleanup Functions**: Built-in functions to manage old audio files

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
- Audio file metadata
- Element-level audio tracking
- Duration and order information

#### `user_credits`
- Credit usage history
- Action tracking (presentation_creation, etc.)
- Audit trail for all credit transactions

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

### Authentication Middleware
- Automatic session refresh
- Protected route redirection
- Server-side user verification

### API Security
- User authentication required for all content generation
- Presentation ownership verification
- Credit validation before processing

## 🚀 Deployment Considerations

### Environment Variables
Update your production environment with:
- Production Supabase URL and keys
- Correct redirect URLs in Supabase settings
- Secure API keys for OpenRouter and Gemini

### Database Setup
- Run the schema SQL in your production Supabase project
- Ensure RLS is enabled
- Test all functions and policies

### Storage Configuration
- Configure storage bucket permissions
- Set up CDN if needed for audio file delivery
- Implement cleanup policies for old files

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
- Check Gemini API key is valid
- Verify file system permissions
- Check audio directory creation

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
```

## 📝 Next Steps

1. **Customize Credit Amounts**: Modify default credit values in schema
2. **Add Payment Integration**: Implement credit purchasing system
3. **Enhanced Analytics**: Add usage tracking and analytics
4. **Admin Panel**: Create admin interface for user management
5. **Email Templates**: Customize Supabase auth email templates

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase logs in the dashboard
3. Verify all environment variables
4. Test database connections and permissions

For additional help, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Guide](https://nextjs.org/docs/app)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) 