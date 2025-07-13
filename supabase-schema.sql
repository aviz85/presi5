-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    credits INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles - users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_public BOOLEAN DEFAULT false,
    audio_generated BOOLEAN DEFAULT false
);

-- Enable RLS on presentations
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Create policies for presentations
CREATE POLICY "Users can view own presentations" ON public.presentations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public presentations" ON public.presentations
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own presentations" ON public.presentations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations" ON public.presentations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations" ON public.presentations
    FOR DELETE USING (auth.uid() = user_id);

-- Create audio_files table
CREATE TABLE IF NOT EXISTS public.audio_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    element_id TEXT NOT NULL,
    element_order INTEGER NOT NULL,
    duration REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on audio_files
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_files
CREATE POLICY "Users can view audio files for own presentations" ON public.audio_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.presentations 
            WHERE presentations.id = audio_files.presentation_id 
            AND presentations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view audio files for public presentations" ON public.audio_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.presentations 
            WHERE presentations.id = audio_files.presentation_id 
            AND presentations.is_public = true
        )
    );

CREATE POLICY "Users can insert audio files for own presentations" ON public.audio_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.presentations 
            WHERE presentations.id = audio_files.presentation_id 
            AND presentations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update audio files for own presentations" ON public.audio_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.presentations 
            WHERE presentations.id = audio_files.presentation_id 
            AND presentations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete audio files for own presentations" ON public.audio_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.presentations 
            WHERE presentations.id = audio_files.presentation_id 
            AND presentations.user_id = auth.uid()
        )
    );

-- Create user_credits table for tracking credit usage
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    credits_used INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'presentation_creation', 'audio_generation', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits
CREATE POLICY "Users can view own credit history" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit usage" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON public.presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON public.presentations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_presentation_id ON public.audio_files(presentation_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_element_order ON public.audio_files(element_order);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_created_at ON public.user_credits(created_at DESC);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits(
    user_uuid UUID,
    credits_amount INTEGER,
    action_description TEXT,
    action_type_param TEXT DEFAULT 'presentation_creation'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits INTO current_credits
    FROM public.profiles
    WHERE id = user_uuid;
    
    -- Check if user has enough credits
    IF current_credits < credits_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    UPDATE public.profiles
    SET credits = credits - credits_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_uuid;
    
    -- Log the credit usage
    INSERT INTO public.user_credits (user_id, credits_used, action_type, description)
    VALUES (user_uuid, credits_amount, action_type_param, action_description);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for admin use)
CREATE OR REPLACE FUNCTION public.add_credits(
    user_uuid UUID,
    credits_amount INTEGER,
    action_description TEXT DEFAULT 'Credits added by admin'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Add credits
    UPDATE public.profiles
    SET credits = credits + credits_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_uuid;
    
    -- Log the credit addition (negative usage means addition)
    INSERT INTO public.user_credits (user_id, credits_used, action_type, description)
    VALUES (user_uuid, -credits_amount, 'credit_addition', action_description);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for audio files
CREATE POLICY "Users can upload audio files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-files' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view audio files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-files'
    );

CREATE POLICY "Users can update own audio files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own audio files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    ); 