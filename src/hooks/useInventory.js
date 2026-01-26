import { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, update, remove, get } from "firebase/database";

export function useInventory() {
    const [items, setItems] = useState([]);
    const [templates, setTemplates] = useState([]); // Defined here for scope access
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [usageLogs, setUsageLogs] = useState([]);

    useEffect(() => {
        const inventoryRef = ref(rtdb, 'inventory');
        const usageRef = ref(rtdb, 'inventory_usage');
        const templatesRef = ref(rtdb, 'inventory_templates');

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
    }, []);

    const addItem = async (data) => {
        try {
            const inventoryRef = ref(rtdb, 'inventory');
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
            const itemRef = ref(rtdb, `inventory/${id}`);
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
            const itemRef = ref(rtdb, `inventory/${id}`);
            await remove(itemRef);
        } catch (err) {
            console.error("Error deleting item:", err);
            throw err;
        }
    };

    const logUsage = async (itemId, quantity, note) => {
        try {
            const itemRef = ref(rtdb, `inventory/${itemId}`);
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
                const usageRef = ref(rtdb, 'inventory_usage');
                await push(usageRef, {
                    itemId,
                    itemName: currentData.name,
                    quantity: parseFloat(quantity),
                    unit: currentData.unit,
                    note: note || "Manual Log",
                    date: currentDate,
                });

                // 3. Log Expense (Auto-Sync)
                if (expenseAmount > 0) {
                    const expensesRef = ref(rtdb, 'expenses');
                    await push(expensesRef, {
                        description: `Consumption: ${currentData.name} (${quantity} ${currentData.unit}). Note: ${note || '-'}`,
                        amount: expenseAmount,
                        category: "Feed/Inventory",
                        date: currentDateShort,
                        createdAt: currentDate,
                        referenceId: itemId
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
            const logRef = ref(rtdb, `inventory_usage/${logId}`);
            const logSnapshot = await get(logRef);

            if (logSnapshot.exists()) {
                const logData = logSnapshot.val();

                // 2. Restore Stock
                const itemRef = ref(rtdb, `inventory/${logData.itemId}`);
                const itemSnapshot = await get(itemRef);

                if (itemSnapshot.exists()) {
                    const currentItemData = itemSnapshot.val();
                    const newQuantity = (parseFloat(currentItemData.quantity) || 0) + parseFloat(logData.quantity);

                    await update(itemRef, {
                        quantity: newQuantity
                    });
                }

                // 3. Delete Log
                await remove(logRef);
            }
        } catch (err) {
            console.error("Error deleting usage log:", err);
            throw err;
        }
    };

    const addTemplate = async (data) => {
        try {
            await push(ref(rtdb, 'inventory_templates'), {
                ...data,
                createdAt: new Date().toISOString(),
                lastRunDate: "" // Never run
            });
        } catch (err) {
            throw err;
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await remove(ref(rtdb, `inventory_templates/${id}`));
        } catch (err) {
            throw err;
        }
    };

    const runRecurringTemplates = async () => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        let processedCount = 0;

        try {
            // Fetch Templates
            const snapshot = await get(ref(rtdb, 'inventory_templates'));
            if (!snapshot.exists()) return 0;
            const currentTemplates = snapshot.val();

            // Fetch *Today's* Usage to prevent duplicates (Race Condition / State Lag Fix)
            const usageSnapshot = await get(ref(rtdb, 'inventory_usage'));
            const usageData = usageSnapshot.val() || {};
            const todaysAutoLogs = Object.values(usageData).filter(
                log => log.date.startsWith(today) && log.note === "Recurring Auto-Log"
            );
            const processedItemIds = new Set(todaysAutoLogs.map(log => log.itemId));

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
                    await update(ref(rtdb, `inventory_templates/${key}`), {
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
            const usageRef = ref(rtdb, 'inventory_usage');
            const expensesRef = ref(rtdb, 'expenses');

            const [usageSnap, expenseSnap] = await Promise.all([
                get(usageRef),
                get(expensesRef)
            ]);

            if (!usageSnap.exists()) return 0;

            const usageData = usageSnap.val();
            const logs = Object.keys(usageData).map(key => ({ id: key, ...usageData[key] }));

            // Group by Date + ItemID + Note
            const groups = {};
            logs.forEach(log => {
                if (log.note === "Recurring Auto-Log") {
                    const dateKey = log.date.split("T")[0];
                    const key = `${dateKey}_${log.itemId}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(log);
                }
            });

            // Process Groups with Duplicates
            for (const key in groups) {
                const groupLogs = groups[key];
                if (groupLogs.length > 1) {
                    // Sort by creation time (if possible, or just pick index 0 as keeper)
                    // We keep the first one, delete the rest.
                    const keeper = groupLogs[0];
                    const duplicates = groupLogs.slice(1);

                    for (const dup of duplicates) {
                        // 1. Restore Stock (Revert the consumption)
                        // logic similar to deleteUsageLog but manual here to avoid loop/overhead issues? 
                        // Actually calling deleteUsageLog is safer but it might be async/slow in loop. 
                        // Let's call deleteUsageLog as it handles stock restoration + log removal.
                        await deleteUsageLog(dup.id);
                        deletedCount++;
                    }

                    // 2. Cleanup Expenses
                    // Expenses don't have a direct link ID in the old logic? 
                    // New logic has referenceId = itemId, not logId. 
                    // We need to match by Description/Date/Amount.
                    // Description format: "Consumption: {ItemName} ({Qty} {Unit}). Note: Recurring Auto-Log"
                    // We will search for duplicates in expenses for this day/item.
                    if (expenseSnap.exists()) {
                        const expData = expenseSnap.val();
                        const day = keeper.date.split("T")[0];
                        const relatedExpenses = Object.keys(expData).map(k => ({ id: k, ...expData[k] }))
                            .filter(e =>
                                e.description.includes(keeper.itemName) &&
                                e.description.includes("Recurring Auto-Log") &&
                                e.date === day
                            );

                        if (relatedExpenses.length > 1) {
                            // Keep one, delete others
                            const expDuplicates = relatedExpenses.slice(1);
                            const updates = {};
                            expDuplicates.forEach(e => updates[e.id] = null);
                            await update(expensesRef, updates);
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


