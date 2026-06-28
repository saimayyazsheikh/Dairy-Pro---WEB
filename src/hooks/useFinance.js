import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { rtdb } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function useFinance() {
    const { userData, currentUser } = useAuth();
    const farmId = userData?.farmId;
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!farmId || !currentUser) {
            setLoading(false);
            return;
        }

        const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
        const unsubscribe = onValue(expensesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedExpenses = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                // Sort by date (newest first)
                loadedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                setExpenses(loadedExpenses);
            } else {
                setExpenses([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [farmId, currentUser]);

    const addExpense = async (expenseData) => {
        try {
            const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
            await push(expensesRef, {
                ...expenseData,
                date: expenseData.date || new Date().toISOString(),
                createdAt: new Date().toISOString(),
                type: 'Manual' // Default for direct additions
            });
        } catch (error) {
            console.error("Error adding expense:", error);
            throw error;
        }
    };

    const updateExpense = async (id, updates) => {
        try {
            const expenseRef = ref(rtdb, `farms/${farmId}/expenses/${id}`);
            await update(expenseRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating expense:", error);
            throw error;
        }
    };

    const deleteExpense = async (id) => {
        try {
            const expenseRef = ref(rtdb, `farms/${farmId}/expenses/${id}`);
            await remove(expenseRef);
        } catch (error) {
            console.error("Error deleting expense:", error);
            throw error;
        }
    };

    return {
        expenses,
        loading,
        addExpense,
        updateExpense,
        deleteExpense
    };
}
