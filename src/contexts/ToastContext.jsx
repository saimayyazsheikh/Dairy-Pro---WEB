import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

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
            {/* Position: Top-Right, Fixed, with z-index above modals if needed */}
            <div className="fixed top-4 right-4 z-[70] flex flex-col gap-3 w-full max-w-sm px-4 md:px-0">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start p-4 rounded-xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-right fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
                            toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
                                toast.type === "delete" ? "bg-orange-50 border-orange-200 text-orange-800" :
                                    "bg-blue-50 border-blue-200 text-blue-800"
                            }`}
                    >
                        <div className={`mr-3 mt-0.5 p-1 rounded-full ${toast.type === "success" ? "bg-green-100 text-green-600" :
                            toast.type === "error" ? "bg-red-100 text-red-600" :
                                toast.type === "delete" ? "bg-orange-100 text-orange-600" :
                                    "bg-blue-100 text-blue-600"
                            }`}>
                            {toast.type === "success" && <CheckCircle size={18} />}
                            {toast.type === "error" && <AlertCircle size={18} />}
                            {toast.type === "delete" && <AlertTriangle size={18} />}
                            {toast.type === "info" && <Info size={18} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm capitalize mb-0.5">
                                {toast.type === 'delete' ? 'Deleted' : toast.type}
                            </h4>
                            <p className="text-sm font-medium opacity-90">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 hover:bg-black/5 p-1 rounded-full transition opacity-60 hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
