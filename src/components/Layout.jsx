import React from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
