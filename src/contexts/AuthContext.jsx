import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, rtdb } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref, onValue, update, push } from "firebase/database";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [farmData, setFarmData] = useState(null);

    async function login(email, password) {
        return await signInWithEmailAndPassword(auth, email, password);
    }

    async function register(ownerName, farmName, location, mobile, email, password) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: ownerName });

        const newFarmRef = push(ref(rtdb, 'farms'));
        const farmId = newFarmRef.key;

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 3);

        await update(ref(rtdb, `users/${user.uid}`), {
            farmId: farmId,
            name: ownerName,
            email: email,
            mobile: mobile
        });

        await update(ref(rtdb, `farms/${farmId}`), {
            ownerId: user.uid,
            farmName: farmName,
            location: location,
            trialEndDate: trialEndDate.toISOString(),
            subscriptionStatus: 'trial'
        });

        return user;
    }

    function logout() {
        setUserData(null);
        setFarmData(null);
        return signOut(auth);
    }

    useEffect(() => {
        let userUnsub;
        let farmUnsub;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth State Changed:", user ? user.uid : "No User");
            setCurrentUser(user);

            if (userUnsub) userUnsub();
            if (farmUnsub) farmUnsub();

            if (user) {
                const userRef = ref(rtdb, `users/${user.uid}`);
                userUnsub = onValue(userRef, (snapshot) => {
                    const uData = snapshot.val();
                    setUserData(uData);

                    if (uData && uData.farmId) {
                        if (farmUnsub) farmUnsub();
                        
                        const farmRef = ref(rtdb, `farms/${uData.farmId}`);
                        farmUnsub = onValue(farmRef, (farmSnap) => {
                            setFarmData(farmSnap.val());
                            setLoading(false);
                        }, (error) => {
                            console.error("Error reading farm data:", error);
                            setLoading(false);
                        });
                    } else {
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Error reading user data:", error);
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setFarmData(null);
                setLoading(false);
            }
        });
        
        return () => {
            unsubscribe();
            if (userUnsub) userUnsub();
            if (farmUnsub) farmUnsub();
        };
    }, []);

    const value = {
        currentUser,
        userData,
        farmData,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center h-screen">
                    <div className="flex flex-col items-center">
                        <div className="border-4 border-primary/30 border-t-primary rounded-full w-12 h-12 animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading Session...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
