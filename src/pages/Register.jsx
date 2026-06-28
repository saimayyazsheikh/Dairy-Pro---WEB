import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { Eye, EyeOff, Mail, Lock, User, Home, MapPin, Phone } from "lucide-react";

export default function Register() {
    const [formData, setFormData] = useState({
        ownerName: "",
        farmName: "",
        location: "",
        mobile: "",
        email: "",
        password: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError("");
            setLoading(true);
            await register(
                formData.ownerName,
                formData.farmName,
                formData.location,
                formData.mobile,
                formData.email,
                formData.password
            );
            navigate("/");
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to create an account.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>

            <div className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-2xl border border-white/50 w-full max-w-lg relative z-10 my-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md flex items-center justify-center bg-white p-0.5 mb-4">
                        <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800 text-center tracking-tight">Dairy Pro</h2>
                    <p className="text-gray-500 text-sm mt-1">Create your Dairy Farm workspace</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 mb-6 rounded-xl border border-red-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Owner Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="ownerName"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                    placeholder="Full Name"
                                    value={formData.ownerName}
                                    onChange={handleChange}
                                    required
                                />
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Farm Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="farmName"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                    placeholder="Dairy Farm Name"
                                    value={formData.farmName}
                                    onChange={handleChange}
                                    required
                                />
                                <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Location</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="location"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                    placeholder="City/Region"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                />
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-600 mb-1">Mobile</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    name="mobile"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                    placeholder="Phone Number"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    required
                                />
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                name="email"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                className="w-full pl-10 pr-12 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-sm"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength="6"
                            />
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary rounded-lg"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-green-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="border-2 border-white/30 border-t-white rounded-full w-5 h-5 animate-spin"></span>
                        ) : "Create Workspace"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary font-bold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
