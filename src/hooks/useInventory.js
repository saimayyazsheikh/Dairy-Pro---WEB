import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, onValue, push, update, remove, get } from "firebase/database";

export function useInventory() {
    const { userData } = useAuth();
    const farmId = userData?.farmId;
    const [items, setItems] = useState([]);
    const [templates, setTemplates] = useState([]); // Defined here for scope access
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [usageLogs, setUsageLogs] = useState([]);

    useEffect(() => {
        if (!farmId) return;
        const inventoryRef = ref(rtdb, `farms/${farmId}/inventory`);
        const usageRef = ref(rtdb, `farms/${farmId}/inventory_usage`);
        const templatesRef = ref(rtdb, `farms/${farmId}/inventory_templates`);

        const unsubscribeInventory = onValue(inventoryRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const inventoryList = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    inventoryList.sort((a, b) => a.name.localeCompare(b.name));
                    setItems(inventoryList);
                } else {
                    setItems([]);
                }
                setLoading(false);
            } catch (err) {
                console.error("Error fetching inventory:", err);
                setError("Failed to fetch inventory");
                setLoading(false);
            }
        });

        // Templates Listener
        // Templates Listener
        const unsubscribeTemplates = onValue(templatesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setTemplates(list);
            } else {
                setTemplates([]);
            }
        });

        const unsubscribeUsage = onValue(usageRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const logsList = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    logsList.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setUsageLogs(logsList);
                } else {
                    setUsageLogs([]);
                }
            } catch (err) {
                console.error("Error fetching usage logs:", err);
            }
        });

        return () => {
            unsubscribeInventory();
            unsubscribeUsage();
            unsubscribeTemplates();
        };
    }, [farmId]);

    const addItem = async (data) => {
        try {
            const inventoryRef = ref(rtdb, `farms/${farmId}/inventory`);
            await push(inventoryRef, {
                ...data,
                createdAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error adding inventory item:", err);
            throw err;
        }
    };

    const updateItem = async (id, data) => {
        try {
            const itemRef = ref(rtdb, `farms/${farmId}/inventory/${id}`);
            await update(itemRef, {
                ...data,
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error updating item:", err);
            throw err;
        }
    };

    const deleteItem = async (id) => {
        try {
            const itemRef = ref(rtdb, `farms/${farmId}/inventory/${id}`);
            await remove(itemRef);
        } catch (err) {
            console.error("Error deleting item:", err);
            throw err;
        }
    };

    const logUsage = async (itemId, quantity, note) => {
        try {
            const itemRef = ref(rtdb, `farms/${farmId}/inventory/${itemId}`);
            const snapshot = await get(itemRef);
            if (snapshot.exists()) {
                const currentData = snapshot.val();
                const newQuantity = (parseFloat(currentData.quantity) || 0) - parseFloat(quantity);
                const costPerUnit = parseFloat(currentData.cost) || 0;
                const expenseAmount = parseFloat(quantity) * costPerUnit;
                const currentDate = new Date().toISOString();
                const currentDateShort = currentDate.split("T")[0];

                // 1. Update Stock
                await update(itemRef, {
                    quantity: newQuantity < 0 ? 0 : newQuantity,
                    updatedAt: currentDate,
                });

                // 2. Log Usage
                const usageRef = ref(rtdb, `farms/${farmId}/inventory_usage`);
                const newLogRef = await push(usageRef, {
                    itemId,
                    itemName: currentData.name,
                    quantity: parseFloat(quantity),
                    unit: currentData.unit,
                    note: note || "Manual Log",
                    date: currentDate,
                });

                // 3. Log Expense (Auto-Sync)
                if (expenseAmount > 0) {
                    const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
                    await push(expensesRef, {
                        description: `Consumption: ${currentData.name} (${quantity} ${currentData.unit}). Note: ${note || '-'}`,
                        amount: expenseAmount,
                        category: "Feed/Inventory",
                        date: currentDateShort,
                        createdAt: currentDate,
                        referenceId: newLogRef.key, // Link to unique Log ID
                        type: 'Auto' // Protected State
                    });
                }
            }
        } catch (err) {
            console.error("Error logging usage:", err);
            throw err;
        }
    };

    const deleteUsageLog = async (logId) => {
        try {
            // 1. Get the log to know details
            const logRef = ref(rtdb, `farms/${farmId}/inventory_usage/${logId}`);
            const logSnapshot = await get(logRef);

            if (logSnapshot.exists()) {
                const logData = logSnapshot.val();

                // 2. Restore Stock
                const itemRef = ref(rtdb, `farms/${farmId}/inventory/${logData.itemId}`);
                const itemSnapshot = await get(itemRef);

                if (itemSnapshot.exists()) {
                    const currentItemData = itemSnapshot.val();
                    const newQuantity = (parseFloat(currentItemData.quantity) || 0) + parseFloat(logData.quantity);

                    await update(itemRef, {
                        quantity: newQuantity
                    });
                }

                // 3. Delete Associated Expense (Cascade)
                const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);
                // We need to query for the expense that has referenceId === logId
                // Assuming we haven't indexed referenceId, we might need to filter manually if dataset is small, 
                // but better to use a query if possible or just loop since we don't have indexes set up in rules.use 
                // However, user has standard firebase. Let's try to find it.

                // Fetch expenses (Optimization: In a real app index this. Here we fetch once).
                const expSnapshot = await get(expensesRef);
                if (expSnapshot.exists()) {
                    const expData = expSnapshot.val();
                    const expKeyToDelete = Object.keys(expData).find(key => expData[key].referenceId === logId);
                    if (expKeyToDelete) {
                        await remove(ref(rtdb, `farms/${farmId}/expenses/${expKeyToDelete}`));
                    }
                }

                // 4. Delete Log
                await remove(logRef);
            }
        } catch (err) {
            console.error("Error deleting usage log:", err);
            throw err;
        }
    };

    const addTemplate = async (data) => {
        try {
            await push(ref(rtdb, `farms/${farmId}/inventory_templates`), {
                ...data,
                createdAt: new Date().toISOString(),
                // If lastRunDate is passed (Start Tomorrow path), use it. Else default empty.
                lastRunDate: data.lastRunDate || ""
            });
        } catch (err) {
            throw err;
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await remove(ref(rtdb, `farms/${farmId}/inventory_templates/${id}`));
        } catch (err) {
            throw err;
        }
    };

    const runRecurringTemplates = async () => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        let processedCount = 0;

        try {
            // Fetch Templates
            const snapshot = await get(ref(rtdb, `farms/${farmId}/inventory_templates`));
            if (!snapshot.exists()) return 0;
            const currentTemplates = snapshot.val();

            // Fetch *Today's* Usage to prevent duplicates
            // VALIDATION: Check for ANY log for this item today (Manual or Auto) to prevent double-dipping.
            const usageSnapshot = await get(ref(rtdb, `farms/${farmId}/inventory_usage`));
            const usageData = usageSnapshot.val() || {};
            const todaysLogs = Object.values(usageData).filter(
                log => log.date.startsWith(today)
            );
            // Set of ItemIDs that have ANY activity today
            const processedItemIds = new Set(todaysLogs.map(log => log.itemId));

            for (const key in currentTemplates) {
                const t = currentTemplates[key];

                // Logic: 
                // 1. Check if Template says it ran today (Fast check)
                // 2. Check if a Log actually exists for today (Robust check)
                const alreadyRanInState = t.lastRunDate === today;
                const alreadyRanInLogs = processedItemIds.has(t.itemId);

                if (t.isActive && !alreadyRanInState && !alreadyRanInLogs) {
                    // RUN IT
                    await logUsage(t.itemId, t.quantity, "Recurring Auto-Log");

                    // Update Last Run
                    await update(ref(rtdb, `farms/${farmId}/inventory_templates/${key}`), {
                        lastRunDate: today
                    });
                    processedCount++;
                    // Add to Set to prevent double run if template logic loops (though it shouldn't)
                    processedItemIds.add(t.itemId);
                }
            }
        } catch (err) {
            console.error(err);
        }
        return processedCount;
    };

    // Cleanup Utility to fix existing bugs
    const cleanUpDuplicates = async () => {
        let deletedCount = 0;
        try {
            const usageRef = ref(rtdb, `farms/${farmId}/inventory_usage`);
            const expensesRef = ref(rtdb, `farms/${farmId}/expenses`);

            const [usageSnap, expenseSnap] = await Promise.all([
                get(usageRef),
                get(expensesRef)
            ]);

            if (!usageSnap.exists()) return 0;

            const usageData = usageSnap.val();
            const logs = Object.keys(usageData).map(key => ({ id: key, ...usageData[key] }));

            // Group ALL logs by Date + ItemID
            const groups = {};
            logs.forEach(log => {
                const dateKey = log.date.split("T")[0];
                const key = `${dateKey}_${log.itemId}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(log);
            });

            // Process Groups for Duplicates
            for (const key in groups) {
                const groupLogs = groups[key];

                // If we have more than 1 log for the same item on the same day, checks priorities.
                // Priority: Keep Manual Log > Keep First Auto Log.
                if (groupLogs.length > 1) {

                    // Filter out Auto Logs vs Manual Logs
                    const autoLogs = groupLogs.filter(l => l.note === "Recurring Auto-Log");
                    const manualLogs = groupLogs.filter(l => l.note !== "Recurring Auto-Log");

                    let logsToDelete = [];

                    if (manualLogs.length > 0) {
                        // If Manual log exists, DELETE ALL Auto Logs for this day (Assumes Manual entry supercedes Auto)
                        logsToDelete = [...autoLogs];

                        // If multiple manual logs? We assume they are valid separate feedings unless exactly duplicate?
                        // User request: "remove existing duplicate recurring logs".
                        // So we only target autoLogs here if a manual exists.
                    } else if (autoLogs.length > 1) {
                        // If only Auto Logs exist but multiple? Keep one.
                        // Sort by created/date? They usually have same Date string.
                        // Just keep first, delete rest.
                        logsToDelete = autoLogs.slice(1);
                    }

                    if (logsToDelete.length > 0) {
                        for (const dup of logsToDelete) {
                            // 1. Restore Stock & Delete Log
                            await deleteUsageLog(dup.id);
                            deletedCount++;
                        }
                    }
                }
            }

        } catch (err) {
            console.error("Cleanup Error:", err);
        }
        return deletedCount;
    };

    return { items, usageLogs, templates, loading, error, addItem, updateItem, deleteItem, logUsage, deleteUsageLog, addTemplate, deleteTemplate, runRecurringTemplates, cleanUpDuplicates };
}


