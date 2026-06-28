import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, onValue, push, remove, update, query, orderByChild, equalTo, get } from "firebase/database";

export function useMilk() {
    const { userData } = useAuth();
    const farmId = userData?.farmId;
    const [milkRecords, setMilkRecords] = useState([]);
    const [performanceLogs, setPerformanceLogs] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!farmId) return;
        const milkRef = ref(rtdb, `farms/${farmId}/milk_records`);
        const perfRef = ref(rtdb, `farms/${farmId}/cow_performance_logs`);
        const vendorsRef = ref(rtdb, `farms/${farmId}/vendors`);

        // Fetch Milk Records
        const unsubMilk = onValue(milkRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                    list.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setMilkRecords(list);
                } else {
                    setMilkRecords([]);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch milk records");
            }
        });

        // Fetch Performance Logs
        const unsubPerf = onValue(perfRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                    list.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setPerformanceLogs(list);
                } else {
                    setPerformanceLogs([]);
                }
            } catch (err) {
                console.error(err);
            }
        });

        // Fetch Vendors
        const unsubVendors = onValue(vendorsRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                    setVendors(list);
                } else {
                    setVendors([]);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        });

        return () => {
            unsubMilk();
            unsubPerf();
            unsubVendors();
        };
    }, [farmId]);

    // --- Actions ---

    const addMilkRecord = async (data) => {
        try {
            const milkRef = ref(rtdb, `farms/${farmId}/milk_records`);

            // 1. Add Record (Critical Path)
            await push(milkRef, {
                ...data, // date, vendorId, vendorName, quantity, pricePerLiter, totalAmount, fat, snf, note
                createdAt: new Date().toISOString()
            });

        } catch (err) {
            console.error("Error adding milk record:", err);
            throw err;
        }
    };

    const deleteMilkRecord = async (id) => {
        try {
            await remove(ref(rtdb, `farms/${farmId}/milk_records/${id}`));
        } catch (err) {
            throw err;
        }
    };

    const addPerformanceLog = async (data) => {
        try {
            const perfRef = ref(rtdb, `farms/${farmId}/cow_performance_logs`);
            await push(perfRef, {
                ...data, // date, cowId, cowTag, morningYield, eveningYield, nightYield, avgFat, avgSnf
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            throw err;
        }
    };

    const updatePerformanceLog = async (id, data) => {
        try {
            const perfRef = ref(rtdb, `farms/${farmId}/cow_performance_logs/${id}`);
            await update(perfRef, {
                ...data
            });
        } catch (err) {
            throw err;
        }
    };

    const deletePerformanceLog = async (id) => {
        try {
            await remove(ref(rtdb, `farms/${farmId}/cow_performance_logs/${id}`));
        } catch (err) {
            throw err;
        }
    };

    const addVendor = async (data) => {
        try {
            const vendorsRef = ref(rtdb, `farms/${farmId}/vendors`);
            await push(vendorsRef, {
                name: data.name,
                defaultPrice: parseFloat(data.defaultPrice),
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            throw err;
        }
    };

    const updateVendor = async (id, data) => {
        try {
            await update(ref(rtdb, `farms/${farmId}/vendors/${id}`), {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            throw err;
        }
    };

    const deleteVendor = async (id) => {
        try {
            await remove(ref(rtdb, `farms/${farmId}/vendors/${id}`));
        } catch (err) {
            throw err;
        }
    };

    return {
        milkRecords,
        performanceLogs,
        vendors,
        loading,
        error,
        addMilkRecord,
        deleteMilkRecord,
        addPerformanceLog,
        updatePerformanceLog,
        deletePerformanceLog,
        addVendor,
        updateVendor,
        deleteVendor
    };
}
