/**
 * OAuth configuration for "Continue with Google" / "Continue with Facebook".
 *
 * These are OPTIONAL. Email and Guest login always work with zero setup.
 * Google/Facebook login require YOU (the site owner) to register a free app
 * with each provider and paste the ID below — see AUTH_SETUP.md for the
 * exact steps (takes about 5 minutes each). Until you do, those two buttons
 * will show a friendly "not set up yet" message and suggest Email/Guest instead.
 */
const AUTH_CONFIG = {
    googleClientId: "",   // e.g. "1234567890-abcdefg.apps.googleusercontent.com"
    facebookAppId: ""     // e.g. "1234567890123456"
};
