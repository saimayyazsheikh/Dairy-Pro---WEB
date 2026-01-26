import { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, remove } from "firebase/database";

export function useProduction() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const logsRef = ref(rtdb, 'production_logs');
        const unsubscribe = onValue(logsRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const logsList = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    logsList.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setLogs(logsList);
                } else {
                    setLogs([]);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching production logs:", err);
                setError("Failed to fetch production history");
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const addProductionLog = async (data) => {
        try {
            const logsRef = ref(rtdb, 'production_logs');
            await push(logsRef, {
                ...data,
                createdAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error adding production log:", err);
            throw err;
        }
    };

    const deleteProductionLog = async (id) => {
        try {
            const logRef = ref(rtdb, `production_logs/${id}`);
            await remove(logRef);
        } catch (err) {
            console.error("Error deleting production log:", err);
            throw err;
        }
    };

    return { logs, loading, error, addProductionLog, deleteProductionLog };
}
