import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "success", duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center p-4 rounded-lg shadow-lg border text-white min-w-[300px] animate-in slide-in-from-right fade-in duration-300 ${toast.type === "success" ? "bg-green-600 border-green-700" :
                                toast.type === "error" ? "bg-red-600 border-red-700" :
                                    "bg-blue-600 border-blue-700"
                            }`}
                    >
                        <div className="mr-3">
                            {toast.type === "success" && <CheckCircle size={20} />}
                            {toast.type === "error" && <AlertCircle size={20} />}
                            {toast.type === "info" && <Info size={20} />}
                        </div>
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-4 hover:bg-white/20 p-1 rounded-full transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
