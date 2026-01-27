import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

const ConfirmationContext = createContext();

export function useConfirmation() {
    return useContext(ConfirmationContext);
}

export function ConfirmationProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({ title: "", message: "" });
    const resolver = useRef(null);

    const confirm = useCallback((message = "This action cannot be undone. Are you sure you want to delete this record?", title = "Confirm Deletion") => {
        setIsOpen(true);
        setConfig({ title, message });

        return new Promise((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolver.current) resolver.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolver.current) resolver.current(false);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <DeleteConfirmationModal
                isOpen={isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={config.title}
                message={config.message}
            />
        </ConfirmationContext.Provider>
    );
}
