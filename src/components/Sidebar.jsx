import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Milk, Stethoscope, Package, Menu, X, LogOut, Beef, Users, CircleDollarSign, Banknote } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { name: "Dashboard", icon: LayoutDashboard, path: "/" },
        { name: "Cattle", icon: Beef, path: "/cattle" },
        { name: "Milk Management", icon: Milk, path: "/milk" },
        { name: "Health Records", icon: Stethoscope, path: "/health" },
        { name: "Inventory", icon: Package, path: "/inventory" },
        { name: "HR Management", icon: Users, path: "/hr" },
        { name: "Expenses", icon: CircleDollarSign, path: "/finance" },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-primary text-white rounded shadow-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Container */}
            <div
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
                    } md:translate-x-0`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-center h-24 border-b">
                        <img src={logo} alt="SAIM Dairy Farm" className="h-20 w-auto" />
                    </div>

                    <nav className="flex-1 overflow-y-auto py-4">
                        <ul className="space-y-2 px-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <li key={item.name}>
                                        <Link
                                            to={item.path}
                                            className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
                                                ? "bg-green-100 text-primary"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                                                }`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <Icon size={20} className="mr-3" />
                                            <span className="font-medium">{item.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className="p-4 border-t">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-3 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} className="mr-3" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black opacity-50 md:hidden"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </>
    );
}
