import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase"; // Only import auth for now
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    // Default to NOT loading, so we show the UI immediately.
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    // Manual Login
    async function login(email, password) {
        setLoading(true);
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        return signOut(auth);
    }

    // We will attempt to restore session, but nicely.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth State Changed:", user ? user.uid : "No User");
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData, // Will be null for now, preventing DB crash
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center h-screen">
                    Loading Session...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
