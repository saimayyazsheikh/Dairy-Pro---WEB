import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError("");
            setLoading(true);
            await login(email, password);
            navigate("/");
        } catch (err) {
            console.error(err);
            setError("Failed to log in. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>

            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-2xl border border-white/50 w-full max-w-md relative z-10 transition-all duration-300 hover:shadow-green-900/5">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md flex items-center justify-center bg-white p-0.5 mb-4">
                        <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800 text-center tracking-tight">Ayyaz Dairy Farm</h2>
                    <p className="text-gray-500 text-sm mt-1">Management Portal</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 mb-6 rounded-xl border border-red-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Email Address</label>
                        <div className="relative">
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300 text-gray-800 text-sm"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full pl-10 pr-12 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300 text-gray-800 text-sm"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-all duration-200"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-green-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98] transition-all duration-300 mt-2 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="border-2 border-white/30 border-t-white rounded-full w-5 h-5 animate-spin"></span>
                        ) : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
