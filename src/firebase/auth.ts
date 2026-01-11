'use client';
import { getAuth, signOut } from "firebase/auth";

export const handleSignOut = async () => {
    const auth = getAuth();
    try {
        await signOut(auth);
        // You might want to redirect the user to the login page after sign out
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out: ", error);
    }
};
