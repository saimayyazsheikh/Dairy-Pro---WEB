import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";

export default function SubscriptionGuard({ children }) {
    const { farmData } = useAuth();

    if (!farmData) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Workspace Not Found</h2>
                    <p className="text-gray-600 mb-6">We couldn't find your farm details. Your registration might have been interrupted.</p>
                    <button 
                        onClick={() => auth.signOut()} 
                        className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                        Sign Out & Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { trialEndDate, subscriptionEndDate } = farmData;
    
    const now = new Date();
    
    // 1. Are they still in their 3-day trial?
    const isTrialActive = trialEndDate ? now <= new Date(trialEndDate) : false;
    
    // 2. Do they have a paid subscription that hasn't expired yet?
    const isSubActive = subscriptionEndDate ? now <= new Date(subscriptionEndDate) : false;

    // If neither is true, lock them out and force them to pay
    if (!isTrialActive && !isSubActive) {
        return <Navigate to="/subscription" replace />;
    }

    return children;
}
