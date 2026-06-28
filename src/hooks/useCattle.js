import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, onValue, push, remove, update } from "firebase/database";

export function useCattle() {
    const { userData } = useAuth();
    const farmId = userData?.farmId;
    const [cattle, setCattle] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!farmId) return;
        const cattleRef = ref(rtdb, `farms/${farmId}/cattle`);
        const unsubscribe = onValue(cattleRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const cattleList = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    // Sort locally since RTDB sorting is limited without index
                    cattleList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setCattle(cattleList);
                } else {
                    setCattle([]);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching cattle:", err);
                setError("Failed to fetch cattle data");
                setLoading(false);
            }
        }, (err) => {
            console.error("Snapshot error:", err);
            setError("Failed to subscribe to cattle updates");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [farmId]);

    const addCattle = async (data) => {
        try {
            const cattleRef = ref(rtdb, `farms/${farmId}/cattle`);
            await push(cattleRef, {
                ...data,
                createdAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error adding cattle:", err);
            throw err;
        }
    };

    const updateCattle = async (id, data) => {
        try {
            const cattleRef = ref(rtdb, `farms/${farmId}/cattle/${id}`);
            await update(cattleRef, {
                ...data,
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error updating cattle:", err);
            throw err;
        }
    };

    const deleteCattle = async (id) => {
        try {
            const cattleRef = ref(rtdb, `farms/${farmId}/cattle/${id}`);
            await remove(cattleRef);
        } catch (err) {
            console.error("Error deleting cattle:", err);
            throw err;
        }
    };

    return { cattle, loading, error, addCattle, updateCattle, deleteCattle };
}
