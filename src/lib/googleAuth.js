// Google auth disabled in demo mode
// This will be implemented with real OAuth later

export function signInWithGoogle(appName = "Lumen") {
  alert(
    "Google authentication is not available in demo mode. Use the form to sign in.",
  );
}

export async function handleGoogleRedirect() {
  // No-op in demo mode
}
