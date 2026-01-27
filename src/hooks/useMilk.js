import { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, remove, update, query, orderByChild, equalTo, get } from "firebase/database";

export function useMilk() {
    const [milkRecords, setMilkRecords] = useState([]);
    const [performanceLogs, setPerformanceLogs] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const milkRef = ref(rtdb, 'milk_records');
        const perfRef = ref(rtdb, 'cow_performance_logs');
        const vendorsRef = ref(rtdb, 'vendors');

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
    }, []);

    // --- Actions ---

    const addMilkRecord = async (data) => {
        try {
            const milkRef = ref(rtdb, 'milk_records');
            const vendorsRef = ref(rtdb, 'vendors');

            // 1. Add Record (Critical Path)
            await push(milkRef, {
                ...data, // date, vendorId, vendorName, quantity, pricePerLiter, totalAmount, fat, snf, note
                createdAt: new Date().toISOString()
            });

            // 2. Update Vendor's Default Price (Non-Critical)
            try {
                if (data.vendorId) {
                    // Check if vendorId is valid before updating
                    const snapshot = await get(ref(rtdb, `vendors/${data.vendorId}`));
                    if (snapshot.exists()) {
                        await update(ref(rtdb, `vendors/${data.vendorId}`), {
                            defaultPrice: parseFloat(data.pricePerLiter),
                            updatedAt: new Date().toISOString()
                        });
                    }
                } else if (data.vendorName) {
                    const existingVendor = vendors.find(v => v.name.toLowerCase() === data.vendorName.toLowerCase());
                    if (existingVendor) {
                        await update(ref(rtdb, `vendors/${existingVendor.id}`), {
                            defaultPrice: parseFloat(data.pricePerLiter),
                            updatedAt: new Date().toISOString()
                        });
                    } else {
                        // Create new vendor if not exists
                        await push(vendorsRef, {
                            name: data.vendorName,
                            defaultPrice: parseFloat(data.pricePerLiter),
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            } catch (vendorErr) {
                console.warn("Failed to update vendor price (non-critical):", vendorErr);
            }

        } catch (err) {
            console.error("Error adding milk record:", err);
            throw err;
        }
    };

    const deleteMilkRecord = async (id) => {
        try {
            await remove(ref(rtdb, `milk_records/${id}`));
        } catch (err) {
            throw err;
        }
    };

    const addPerformanceLog = async (data) => {
        try {
            const perfRef = ref(rtdb, 'cow_performance_logs');
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
            const perfRef = ref(rtdb, `cow_performance_logs/${id}`);
            await update(perfRef, {
                ...data
            });
        } catch (err) {
            throw err;
        }
    };

    const deletePerformanceLog = async (id) => {
        try {
            await remove(ref(rtdb, `cow_performance_logs/${id}`));
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
        deletePerformanceLog
    };
}
