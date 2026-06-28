import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, update } from "firebase/database";
import { useToast } from "../contexts/ToastContext";
import { Link } from "react-router-dom";
import { Save, User, Home, MapPin, Loader2, CreditCard, Calendar, ShieldCheck, AlertTriangle } from "lucide-react";
import Layout from "../components/Layout";

export default function Settings() {
    const { currentUser, userData, farmData } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        ownerName: "",
        farmName: "",
        location: ""
    });

    useEffect(() => {
        if (userData && farmData) {
            setFormData({
                ownerName: userData.name || "",
                farmName: farmData.farmName || "",
                location: farmData.location || ""
            });
        }
    }, [userData, farmData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!currentUser || !userData?.farmId) return;

            const updates = {};
            updates[`/users/${currentUser.uid}/name`] = formData.ownerName;
            updates[`/farms/${userData.farmId}/farmName`] = formData.farmName;
            updates[`/farms/${userData.farmId}/location`] = formData.location;

            await update(ref(rtdb), updates);
            addToast("Settings updated successfully", "success");
        } catch (error) {
            console.error("Error updating settings", error);
            addToast("Failed to update settings", "error");
        } finally {
            setLoading(false);
        }
    };

    // Calculate Subscription Info
    const status = farmData?.subscriptionStatus || "unpaid";
    const expiryDateStr = farmData?.subscriptionEndDate || farmData?.trialEndDate;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
    
    let daysRemaining = null;
    if (expiryDate) {
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return (
        <Layout title="Settings" subtitle="Manage your workspace preferences">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Workspace Settings</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Owner Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="ownerName"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
                                value={formData.ownerName}
                                onChange={handleChange}
                                required
                            />
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Farm Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="farmName"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
                                value={formData.farmName}
                                onChange={handleChange}
                                required
                            />
                            <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Location</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="location"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Subscription Section */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mt-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Subscription Details</h2>
                
                <div className="space-y-4">
                    {daysRemaining !== null && daysRemaining <= 3 && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-sm font-semibold text-orange-800">Your subscription expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}!</p>
                                <p className="text-sm text-orange-700 mt-1">Please subscribe or renew before the expiry date to avoid losing access to your dashboard and data.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="text-primary" size={24} />
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Current Status</p>
                                <p className="text-lg font-bold text-gray-800 capitalize">{status}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {status === 'paid' ? 'Active' : 'Trial / Pending'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-blue-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Valid Until</p>
                                <p className="text-lg font-bold text-gray-800">
                                    {expiryDate ? expiryDate.toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Link 
                            to="/subscription"
                            className="bg-primary hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm shadow-primary/30 transition-all flex items-center gap-2"
                        >
                            <CreditCard size={18} />
                            {status === 'paid' ? "Renew Subscription" : "Subscribe Now"}
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
