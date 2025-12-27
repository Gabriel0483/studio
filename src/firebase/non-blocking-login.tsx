'use client';
import {
  Auth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';

/**
 * Initiate anonymous sign-in (non-blocking) if no user is currently signed in.
 * It now awaits the authentication state to confirm login before resolving.
 */
export function initiateAnonymousSignIn(authInstance: Auth): Promise<void> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      authInstance,
      (user) => {
        unsubscribe(); // Unsubscribe to avoid memory leaks
        if (user) {
          // User is already signed in (or sign-in was successful)
          resolve();
        } else {
          // No user is signed in, so proceed with anonymous sign-in
          signInAnonymously(authInstance)
            .then(() => resolve())
            .catch((error) => reject(error));
        }
      },
      (error) => {
        unsubscribe(); // Unsubscribe on error
        reject(error);
      }
    );
  });
}
