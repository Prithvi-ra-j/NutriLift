# Voice transcription deployment gate

The mobile voice-food flow now calls the authenticated Supabase Edge Function `ai-transcribe`. The function must be deployed to the same Supabase project used by the app before device testing can pass.

## One-time server setup

1. Confirm the Supabase project has the existing `ai_request_usage` table used by `ai-chat`.
2. Set `GROQ_API_KEY` as a **Supabase Edge Function secret**. Do not put this provider key in the Expo app or commit it to the repository.
3. Deploy the function from the repository root:

   ```sh
   supabase functions deploy ai-transcribe
   ```

4. Confirm the project has the normal Supabase URL and anon key configured in the app environment and that the user is signed in.
5. Test an English recording and a Hindi/Hinglish recording. Verify empty audio, missing session, provider failure, oversized recording, and daily quota errors are shown to the user and do not create food logs.
6. Confirm usage entries are recorded in `ai_request_usage` and that the 100-request daily cap is enforced.

## Release gate

A green GitHub workflow only type-checks the function; it does not deploy it or prove the remote provider credentials are valid. Keep voice transcription marked **not device-verified** until the deployed function has passed the checks above on an Android device/emulator.
