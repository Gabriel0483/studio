
'use client';
import { getAuth, signOut, createUserWithEmailAndPassword } from "firebase/auth";

export const handleSignUp = async (email: string, password: string): Promise<void> => {
    const auth = getAuth();
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("User signed up successfully.");
};

export const handleSignOut = async () => {
    const auth = getAuth();
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out: ", error);
    }
};
