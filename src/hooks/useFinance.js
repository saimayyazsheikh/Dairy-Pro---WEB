import { useState, useEffect } from "react";
import { ref, onValue, push, remove } from "firebase/database";
import { rtdb } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function useFinance() {
    const { currentUser } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const expensesRef = ref(rtdb, "expenses");
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
        });

        return () => unsubscribe();
    }, [currentUser]);

    const addExpense = async (expenseData) => {
        try {
            const expensesRef = ref(rtdb, "expenses");
            await push(expensesRef, {
                ...expenseData,
                date: expenseData.date || new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding expense:", error);
            throw error;
        }
    };

    const deleteExpense = async (id) => {
        try {
            const expenseRef = ref(rtdb, `expenses/${id}`);
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
        deleteExpense
    };
}
