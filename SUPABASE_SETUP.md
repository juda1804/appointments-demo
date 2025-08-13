# Supabase Project Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Select "São Paulo (South America)" as the region
4. Choose a project name: "appointments-demo"
5. Set a secure database password and save it
6. Click "Create new project"

## Step 2: Get Project Credentials

Once your project is created:

1. Go to Settings → API
2. Copy the following values:
   - **Project URL** → NEXT_PUBLIC_SUPABASE_URL
   - **Anon public key** → NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - **Service role key** → SUPABASE_SERVICE_ROLE_KEY

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Replace the placeholder values with your actual Supabase credentials
3. Keep the Colombian configuration values as they are

## Step 4: Verify Setup

Run the application and check that the Supabase client initializes without errors.

## Security Notes

- Never commit `.env.local` to version control
- Service role key has admin privileges - keep it secure
- Anon key is safe for client-side use