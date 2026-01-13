
'use client';
import { getAuth, signOut, createUserWithEmailAndPassword, Auth } from "firebase/auth";

// It's better to pass the auth instance to the functions
// to make them more testable and less reliant on a global getAuth() call.

export const handleSignUp = async (auth: Auth, email: string, password: string): Promise<void> => {
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("User signed up successfully.");
};

export const handleSignOut = async (auth: Auth) => {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out: ", error);
    }
};
