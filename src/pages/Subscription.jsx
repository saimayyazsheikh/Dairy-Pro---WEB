import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle2, ShieldCheck, Zap, Database, Headphones, LogOut, ArrowLeft } from "lucide-react";
import { rtdb } from "../firebase";
import { ref, update } from "firebase/database";

export default function Subscription() {
    const { logout, farmData, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const now = new Date();
    const isTrialActive = farmData?.trialEndDate ? now <= new Date(farmData.trialEndDate) : false;
    const isSubActive = farmData?.subscriptionEndDate ? now <= new Date(farmData.subscriptionEndDate) : false;
    const canGoBack = isTrialActive || isSubActive;

    // Simulated payment gateway integration
    const handlePayment = async (planType, amount) => {
        setLoading(true);
        try {
            console.log(`Initiating payment for ${planType} plan - Amount: Rs. ${amount}`);
            
            // In a real app, this is where you'd redirect to Stripe Checkout
            // and the update would happen in a backend webhook. 
            // For now, we simulate a successful payment instantly.

            if (!userData?.farmId) return;

            const now = new Date();
            // If they already have a subscriptionEndDate in the future, we extend it. Otherwise, start from today.
            let currentExpiry = farmData?.subscriptionEndDate ? new Date(farmData.subscriptionEndDate) : now;
            if (currentExpiry < now) currentExpiry = now;

            const newExpiry = new Date(currentExpiry);
            if (planType === "Monthly") {
                newExpiry.setMonth(newExpiry.getMonth() + 1);
            } else if (planType === "Yearly") {
                newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            }

            const updates = {};
            updates[`/farms/${userData.farmId}/subscriptionStatus`] = "paid";
            updates[`/farms/${userData.farmId}/subscriptionEndDate`] = newExpiry.toISOString();
            updates[`/farms/${userData.farmId}/subscriptionPlan`] = planType;

            await update(ref(rtdb), updates);
            
            alert(`Simulated Payment Successful! Your ${planType} subscription is now active until ${newExpiry.toLocaleDateString()}.`);
            
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
            {canGoBack && (
                <div className="absolute top-4 left-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary font-medium px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                    >
                        <ArrowLeft size={18} /> Back
                    </button>
                </div>
            )}
            <div className="absolute top-4 right-4">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-500 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <LogOut size={18} /> Logout
                </button>
            </div>
            
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Choose Your Plan</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Your free trial has expired. Upgrade your workspace to continue managing {farmData?.farmName || "your dairy farm"} with unlimited features.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Monthly Plan */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Monthly</h3>
                            <p className="text-gray-500 mt-2">Perfect for getting started</p>
                            <div className="mt-4 flex items-baseline text-5xl font-extrabold text-primary">
                                Rs 2,500
                                <span className="ml-1 text-xl font-medium text-gray-500">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start">
                                <CheckCircle2 className="text-green-500 mr-3 shrink-0" size={20} />
                                <span className="text-gray-600">Full access to Cattle Management</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle2 className="text-green-500 mr-3 shrink-0" size={20} />
                                <span className="text-gray-600">Daily Milk Production Logging</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle2 className="text-green-500 mr-3 shrink-0" size={20} />
                                <span className="text-gray-600">Health & Vaccination Tracking</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle2 className="text-green-500 mr-3 shrink-0" size={20} />
                                <span className="text-gray-600">Basic Inventory & HR modules</span>
                            </li>
                        </ul>

                        <button
                            disabled={loading}
                            onClick={() => handlePayment("Monthly", 2500)}
                            className="w-full bg-primary text-white rounded-xl py-4 font-bold hover:bg-green-700 transition-colors flex justify-center items-center"
                        >
                            Select Monthly Plan
                        </button>
                    </div>

                    {/* Yearly Plan */}
                    <div className="bg-primary rounded-2xl shadow-2xl p-8 flex flex-col relative transform md:-translate-y-4 border-4 border-green-500/30">
                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
                            Save 20%
                        </div>
                        
                        <div className="mb-6 text-white">
                            <h3 className="text-2xl font-bold">Yearly</h3>
                            <p className="text-green-100 mt-2">Best value for established farms</p>
                            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                                Rs 24,000
                                <span className="ml-1 text-xl font-medium text-green-200">/yr</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start text-white">
                                <CheckCircle2 className="text-green-300 mr-3 shrink-0" size={20} />
                                <span>Everything in Monthly, plus:</span>
                            </li>
                            <li className="flex items-start text-white">
                                <ShieldCheck className="text-green-300 mr-3 shrink-0" size={20} />
                                <span>Advanced Financial Analytics</span>
                            </li>
                            <li className="flex items-start text-white">
                                <Database className="text-green-300 mr-3 shrink-0" size={20} />
                                <span>Priority Cloud Backup</span>
                            </li>
                            <li className="flex items-start text-white">
                                <Headphones className="text-green-300 mr-3 shrink-0" size={20} />
                                <span>24/7 Dedicated Support</span>
                            </li>
                        </ul>

                        <button
                            disabled={loading}
                            onClick={() => handlePayment("Yearly", 24000)}
                            className="w-full bg-white text-primary rounded-xl py-4 font-bold hover:bg-gray-50 transition-colors flex justify-center items-center shadow-lg"
                        >
                            Select Yearly Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
