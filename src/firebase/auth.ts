
'use client';
import { getAuth, signOut, createUserWithEmailAndPassword, Auth, sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";

/**
 * Handles the user sign-up process, including sending a verification email.
 */
export const handleSignUp = async (auth: Auth, email: string, password: string): Promise<void> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Send email verification immediately after account creation
    await sendEmailVerification(userCredential.user);
    console.log("User signed up successfully. Verification email sent.");
};

/**
 * Handles the user sign-out process.
 */
export const handleSignOut = async (auth: Auth) => {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out: ", error);
    }
};

/**
 * Handles the password reset process.
 */
export const handlePasswordReset = async (auth: Auth, email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent.");
};
