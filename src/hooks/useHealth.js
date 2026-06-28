import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, onValue, push, remove, query, orderByChild, equalTo, get, update } from "firebase/database";

export function useHealth() {
    const { userData } = useAuth();
    const farmId = userData?.farmId;
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!farmId) return;
        const healthRef = ref(rtdb, `farms/${farmId}/health_records`);
        const unsubscribe = onValue(healthRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data && typeof data === 'object') {
                    const healthList = Object.keys(data).map(key => ({
                        id: key,
                        ...(typeof data[key] === 'object' ? data[key] : {})
                    }));
                    // Safely sort
                    healthList.sort((a, b) => {
                        const dateA = new Date(a.date || 0);
                        const dateB = new Date(b.date || 0);
                        return dateB - dateA;
                    });
                    setRecords(healthList);
                } else {
                    setRecords([]);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching health records:", err);
                setError("Failed to fetch health records");
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [farmId]);

    const addHealthRecord = async (data) => {
        try {
            const healthRef = ref(rtdb, `farms/${farmId}/health_records`);
            const newRecordRef = await push(healthRef, {
                ...data, // date, cowId, recordType, etc.
                createdAt: new Date().toISOString(),
            });

            // Automatically add to Expenses (Split)
            const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);

            // 1. Medicine Expense
            if (data.medicineCost && parseFloat(data.medicineCost) > 0) {
                await push(expensesRef, {
                    date: data.date,
                    category: 'Medical',
                    amount: parseFloat(data.medicineCost),
                    description: `Medicine: ${data.vaccineName || data.treatment || data.recordType} for ${data.cowTag}`,
                    referenceId: newRecordRef.key,
                    createdAt: new Date().toISOString(),
                    type: 'Auto'
                });
            }

            // 2. Doctor Fee Expense
            if (data.doctorFee && parseFloat(data.doctorFee) > 0) {
                await push(expensesRef, {
                    date: data.date,
                    category: 'Doctor Fees', // Distinct Category
                    amount: parseFloat(data.doctorFee),
                    description: `Dr. Fee: ${data.doctorName || 'Unknown'} - ${data.recordType} for ${data.cowTag}`,
                    referenceId: newRecordRef.key,
                    createdAt: new Date().toISOString(),
                    type: 'Auto'
                });
            }

            return newRecordRef;
        } catch (err) {
            console.error("Error adding health record:", err);
            throw err;
        }
    };

    const deleteHealthRecord = async (id) => {
        try {
            // 1. Delete the Health Record
            await remove(ref(rtdb, `farms/${farmId}/health_records/${id}`));

            // 2. Find and Delete associated Expense record
            // We wrap this in a separate try-catch so that if expense cleanup fails (e.g. index issue),
            // the user still knows the main record was deleted.
            try {
                const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
                const expenseQuery = query(expensesRef, orderByChild('referenceId'), equalTo(id));
                const snapshot = await get(expenseQuery);

                if (snapshot.exists()) {
                    const updates = {};
                    snapshot.forEach(child => {
                        updates[child.key] = null;
                    });
                    await update(expensesRef, updates);
                }
            } catch (expenseErr) {
                console.warn("Health record deleted, but failed to clean up expenses:", expenseErr);
                // We do NOT re-throw here because the primary action (deleting health record) succeeded.
            }
        } catch (err) {
            console.error("Error deleting record:", err);
            throw err;
        }
    };

    const updateHealthRecord = async (id, data) => {
        try {
            // 1. Update Health Record
            const healthRef = ref(rtdb, `farms/${farmId}/health_records/${id}`);
            await update(healthRef, data);

            // 2. Sync Expense Record
            const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
            const expenseQuery = query(expensesRef, orderByChild('referenceId'), equalTo(id));
            const snapshot = await get(expenseQuery);

            const newCost = data.cost ? parseFloat(data.cost) : 0;

            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach(child => {
                    updates[child.key] = null; // Delete old expenses
                });
                await update(expensesRef, updates);
            }

            // Re-create Expenses
            // 1. Medicine
            const medCost = data.medicineCost ? parseFloat(data.medicineCost) : 0;
            if (medCost > 0) {
                await push(expensesRef, {
                    date: data.date,
                    category: 'Medical',
                    amount: medCost,
                    description: `Medicine: ${data.vaccineName || data.treatment || data.recordType} for ${data.cowTag}`,
                    referenceId: id,
                    createdAt: new Date().toISOString(),
                    type: 'Auto'
                });
            }

            // 2. Doctor Fee
            const docFee = data.doctorFee ? parseFloat(data.doctorFee) : 0;
            if (docFee > 0) {
                await push(expensesRef, {
                    date: data.date,
                    category: 'Doctor Fees',
                    amount: docFee,
                    description: `Dr. Fee: ${data.doctorName || 'Unknown'} - ${data.recordType} for ${data.cowTag}`,
                    referenceId: id,
                    createdAt: new Date().toISOString(),
                    type: 'Auto'
                });
            }

        } catch (err) {
            console.error("Error updating health record:", err);
            throw err;
        }
    };

    return { records, loading, error, addHealthRecord, deleteHealthRecord, updateHealthRecord };
}
