import React, { useState } from "react";
import Layout from "../components/Layout";
import { useInventory } from "../hooks/useInventory";
import { useToast } from "../contexts/ToastContext";
import { Package, AlertTriangle, Plus, Edit2, Trash2, X, Truck, ClipboardList, History, Repeat, Clock } from "lucide-react";

export default function Inventory() {
    const { items, usageLogs, templates, loading, addItem, updateItem, deleteItem, logUsage, deleteUsageLog, addTemplate, deleteTemplate, runRecurringTemplates, cleanUpDuplicates } = useInventory();
    const { addToast } = useToast();

    // Modals state
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    // Auto-Run Recurring Logic
    React.useEffect(() => {
        const runAutoLogs = async () => {
            // 1. Cleanup Duplicates
            const deleted = await cleanUpDuplicates();
            if (deleted > 0) {
                addToast(`System cleanup: Removed ${deleted} duplicate logs & expenses.`, "warning");
            }

            // 2. Run Auto-Logs
            const count = await runRecurringTemplates();
            if (count > 0) {
                addToast(`Auto-logged ${count} recurring feed entries.`, "info");
            }
        };
        // Small delay to ensure data loaded? useInventory logic fetches inside runRecurringTemplates so should be fine.
        runAutoLogs();
    }, []); // Run once on mount

    // Item Form State
    const [itemForm, setItemForm] = useState({
        name: "", // Computed or Manual
        category: "Feed",
        subCategory: "",
        brand: "",
        feedType: "",
        quantity: "",
        unit: "",
        cost: "",
        lowStockThreshold: ""
    });

    // --- Category Definitions ---
    const categoryOptions = {
        "Feed": {
            color: "bg-green-100 text-green-800",
            subCategories: [
                { name: "Silage", unit: "Mund" },
                { name: "Grain Fodder", unit: "Kanal" },
                { name: "Wheat Straw", unit: "Mund" },
                { name: "Hay", unit: "Mund" },
                { name: "Wanda", unit: "Bag" },
                { name: "Self Entry", unit: "" },
            ]
        },
        "Minerals": {
            color: "bg-blue-100 text-blue-800",
            subCategories: [
                { name: "Fat 84%", unit: "Bag" },
                { name: "Fat 99%", unit: "Bag" },
                { name: "DCP Organic", unit: "Bag" },
                { name: "DCP Inorganic", unit: "Bag" },
                { name: "Sodium Bicarbonate", unit: "Bag" },
                { name: "Molasses", unit: "KG" },
                { name: "Yeast", unit: "KG" },
                { name: "Namak", unit: "Stone" },
                { name: "Self Entry", unit: "" },
            ]
        },
        "Medicine": { color: "bg-red-100 text-red-800", subCategories: [] },
        "Vaccine": { color: "bg-orange-100 text-orange-800", subCategories: [] },
        "Semen": { color: "bg-purple-100 text-purple-800", subCategories: [] },
    };

    const wandaOptions = {
        brands: ["Ahsan Feed Mills", "Hamid", "Other"],
        types: ["Calf Starter", "Customized", "Heifers", "Meat", "Milking"],
    };

    // Logging Form State
    const [usageForm, setUsageForm] = useState({
        itemId: "",
        quantity: "",
        note: "",
        isRecurring: false
    });

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        type: null, // 'item' or 'log'
        id: null,
        title: "",
        message: ""
    });

    // --- Item Handlers ---
    const handleOpenItemModal = (item = null) => {
        if (item) {
            setCurrentItem(item);
            setItemForm({
                name: item.name,
                category: item.category,
                subCategory: item.subCategory || "",
                brand: item.brand || "",
                feedType: item.feedType || "",
                quantity: item.quantity,
                unit: item.unit,
                cost: item.cost || "",
                lowStockThreshold: item.lowStockThreshold
            });
        } else {
            setCurrentItem(null);
            setItemForm({
                name: "",
                category: "Feed",
                subCategory: "",
                brand: "",
                feedType: "",
                quantity: "",
                unit: "",
                cost: "",
                lowStockThreshold: ""
            });
        }
        setIsItemModalOpen(true);
    };

    const handleItemSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...itemForm,
                quantity: parseFloat(itemForm.quantity),
                cost: parseFloat(itemForm.cost) || 0,
                lowStockThreshold: parseFloat(itemForm.lowStockThreshold)
            };

            // Check if item name already exists (case insensitive)
            const existingItem = items.find(
                item => item.name.toLowerCase() === itemForm.name.toLowerCase() &&
                    (!currentItem || item.id !== currentItem.id) // Exclude current item if editing
            );

            if (existingItem) {
                // Merge Logic: Update existing item's quantity AND update cost to latest
                const newQuantity = parseFloat(existingItem.quantity) + parseFloat(itemForm.quantity);
                await updateItem(existingItem.id, {
                    ...data,
                    quantity: newQuantity,
                    cost: parseFloat(itemForm.cost) || existingItem.cost // Update cost if provided
                });
                addToast(`Merged with "${existingItem.name}". Stock updated.`, "success");
            } else {
                // Normal Update or Create
                if (currentItem) {
                    await updateItem(currentItem.id, data);
                    addToast("Item updated successfully", "success");
                } else {
                    await addItem(data);
                    addToast("Item added successfully", "success");
                }
            }
            setIsItemModalOpen(false);
        } catch (err) {
            addToast("Failed to save item", "error");
        }
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setItemForm(prev => ({ ...prev, name }));
        // Logic to auto-fill details based on existing names removed to avoid conflict with structured form.
        // User should use structured fields first, which behave as the "Master" controls.
        // Name generation logic will be in the form render or pre-submit.
    };

    // Helper to generate name based on selections
    React.useEffect(() => {
        if (currentItem) return; // Don't auto-rename in edit mode to avoid confusion, or maybe we should? Let's skip for now.

        const { category, subCategory, brand, feedType } = itemForm;
        let generatedName = itemForm.name; // Default to manual

        if (category === "Feed" && subCategory === "Wanda") {
            if (brand && feedType) generatedName = `Wanda ${brand} - ${feedType}`;
        } else if ((category === "Feed" || category === "Minerals") && subCategory && subCategory !== "Self Entry") {
            generatedName = subCategory;
        }

        // Only update if it's different and user hasn't typed a custom "Self Entry" name manually (if we tracked that aspect, but for now strict generation is safer for standardization)
        if (subCategory !== "Self Entry" && generatedName !== itemForm.name) {
            setItemForm(prev => ({ ...prev, name: generatedName }));
        }

    }, [itemForm.category, itemForm.subCategory, itemForm.brand, itemForm.feedType]);

    // Update Unit when SubCategory Changes
    const handleSubCategoryChange = (sub) => {
        const catConfig = categoryOptions[itemForm.category];
        const subConfig = catConfig?.subCategories.find(s => s.name === sub);
        setItemForm(prev => ({
            ...prev,
            subCategory: sub,
            unit: subConfig ? subConfig.unit : prev.unit,
            // Reset wanda fields if not wanda
            brand: sub === "Wanda" ? prev.brand : "",
            feedType: sub === "Wanda" ? prev.feedType : "",
        }));
    };

    const handleDeleteClick = (id) => {
        setConfirmation({
            isOpen: true,
            type: 'item',
            id: id,
            title: "Delete Item",
            message: "Are you sure you want to delete this item? This action cannot be undone."
        });
    };

    // --- Usage Logging Handlers ---
    const handleUsageSubmit = async (e) => {
        e.preventDefault();
        try {
            const usedItem = items.find(i => i.id === usageForm.itemId);
            if (!usedItem) return;

            const qty = parseFloat(usageForm.quantity);
            const costPerUnit = parseFloat(usedItem.cost) || 0;
            const totalCost = qty * costPerUnit;

            // 1. Log Inventory Usage (Reduces Stock & Auto-Logs Expense in Hook)
            await logUsage(usageForm.itemId, qty, usageForm.note);

            // 3. Save as Recurring Template (If checked)
            if (usageForm.isRecurring) {
                await addTemplate({
                    itemId: usageForm.itemId,
                    itemName: usedItem.name,
                    quantity: qty,
                    unit: usedItem.unit,
                    isActive: true,
                    note: usageForm.note || "Daily Recurring"
                });
                addToast("Recurring usage template saved.", "info");
            }

            addToast(`Usage logged. Expense of Rs ${totalCost.toLocaleString()} recorded.`, "success");
            setUsageForm({ itemId: "", quantity: "", note: "", isRecurring: false });
        } catch (err) {
            console.error(err);
            addToast("Failed to log usage. Check permissions.", "error");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (window.confirm("Delete this recurring template?")) {
            await deleteTemplate(id);
            addToast("Template removed", "success");
        }
    };

    const handleDeleteLogClick = (id) => {
        setConfirmation({
            isOpen: true,
            type: 'log',
            id: id,
            title: "Delete Log & Restore Stock",
            message: "Are you sure? This will delete the log and automatically restore the stock quantity."
        });
    };

    const executeDelete = async () => {
        try {
            if (confirmation.type === 'item') {
                await deleteItem(confirmation.id);
                addToast("Item deleted", "success");
            } else if (confirmation.type === 'log') {
                await deleteUsageLog(confirmation.id);
                addToast("Log deleted & stock restored", "success");
            }
        } catch (error) {
            addToast("Failed to delete", "error");
        } finally {
            setConfirmation({ isOpen: false, type: null, id: null, title: "", message: "" });
        }
    };

    // Derived state
    const lowStockItems = items.filter(item => item.quantity <= item.lowStockThreshold);

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Inventory & Feed</h1>
                    <p className="text-gray-600">Manage stocks and feed distribution</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={() => handleOpenItemModal()}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-600 transition"
                    >
                        <Plus size={20} className="mr-2" />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Alerts Banner */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start">
                    <AlertTriangle className="text-red-500 mr-3 mt-1" size={24} />
                    <div>
                        <h3 className="text-red-800 font-bold text-lg">Low Stock Alert</h3>
                        <ul className="list-disc list-inside text-red-600 mt-1">
                            {lowStockItems.map(item => (
                                <li key={item.id} className="text-sm">
                                    <span className="font-semibold">{item.name}</span>: {item.quantity} {item.unit} left (Reorder at {item.lowStockThreshold})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Log Usage Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <ClipboardList className="mr-2 text-primary" /> Log Daily Usage
                    </h2>
                    <form onSubmit={handleUsageSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Item *</label>
                            <select
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={usageForm.itemId}
                                onChange={(e) => setUsageForm({ ...usageForm, itemId: e.target.value })}
                            >
                                <option value="">Choose item...</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.quantity} {item.unit})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Used *</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                placeholder="0.0"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={usageForm.quantity}
                                onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note / Allocation</label>
                            <input
                                type="text"
                                placeholder="e.g. Morning Feed, Sick Bay"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={usageForm.note}
                                onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <input
                                type="checkbox"
                                id="recurring"
                                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                checked={usageForm.isRecurring}
                                onChange={(e) => setUsageForm({ ...usageForm, isRecurring: e.target.checked })}
                            />
                            <label htmlFor="recurring" className="text-sm text-blue-800 font-medium">Set as Recurring Daily Usage</label>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition font-medium"
                        >
                            Log Usage
                        </button>

                        <button type="button" onClick={() => setIsManageTemplatesOpen(true)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2 underline">
                            Manage Recurring Templates
                        </button>
                    </form>
                </div>

                {/* Recent Logs Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <History className="mr-2 text-gray-500" /> Recent Usage Activity
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-600">Date</th>
                                    <th className="p-3 font-semibold text-gray-600">Item</th>
                                    <th className="p-3 font-semibold text-gray-600">Used</th>
                                    <th className="p-3 font-semibold text-gray-600">Note</th>
                                    <th className="p-3 font-semibold text-gray-600 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usageLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-center text-gray-500">No usage logs found.</td>
                                    </tr>
                                ) : (
                                    usageLogs.slice(0, 5).map(log => (
                                        <tr key={log.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                                            <td className="p-3 font-medium text-gray-800">{log.itemName}</td>
                                            <td className="p-3 font-bold text-orange-600">-{log.quantity} {log.unit}</td>
                                            <td className="p-3 text-sm text-gray-500">{log.note}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteLogClick(log.id)}
                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Inventory Listing */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-gray-700">Current Stock Levels</h3>
                </div>
                {loading ? (
                    <p className="p-8 text-center">Loading inventory...</p>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">Item</th>
                                        <th className="p-4 font-semibold text-gray-600">Category</th>
                                        <th className="p-4 font-semibold text-gray-600">Stock Level</th>
                                        <th className="p-4 font-semibold text-gray-600">Est. Cost</th>
                                        <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => {
                                        const isLow = item.quantity <= item.lowStockThreshold;
                                        return (
                                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-800 flex items-center">
                                                        <Package size={18} className="mr-2 text-gray-400" />
                                                        {item.name}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${categoryOptions[item.category]?.color || "bg-gray-100 text-gray-700"}`}>
                                                        {item.category}
                                                    </span>
                                                    {item.subCategory && <div className="text-xs text-gray-500 mt-1">{item.subCategory}</div>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">
                                                        {item.quantity} <span className="font-normal text-sm text-gray-500">{item.unit}</span>
                                                    </div>
                                                    {isLow && <div className="text-xs text-red-500 font-medium mt-1">Low Stock!</div>}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {item.cost ? (
                                                        <div className="flex items-center">
                                                            Rs {item.cost}/{item.unit}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => handleOpenItemModal(item)} className="text-blue-500 hover:text-blue-700 mx-2">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(item.id)} className="text-red-500 hover:text-red-700 mx-2">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-gray-500">No inventory items found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                            {items.map(item => {
                                const isLow = item.quantity <= item.lowStockThreshold;
                                return (
                                    <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                                                    {isLow && <AlertTriangle size={16} className="text-red-500" />}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${categoryOptions[item.category]?.color || "bg-gray-100 text-gray-700"}`}>
                                                        {item.category}
                                                    </span>
                                                    {item.subCategory && <span className="text-xs text-gray-500">{item.subCategory}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-800 text-lg">
                                                    {item.quantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                                </div>
                                                {isLow && <div className="text-xs text-red-500 font-bold">Low Stock</div>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 py-2 border-t border-b border-gray-50 my-2">
                                            <div>
                                                <span className="text-xs text-gray-400 block">Unit Cost</span>
                                                {item.cost ? `Rs ${item.cost}` : '-'}
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block">Reorder Level</span>
                                                {item.lowStockThreshold} {item.unit}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-2">
                                            <button onClick={() => handleOpenItemModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg flex items-center text-sm font-medium">
                                                <Edit2 size={16} className="mr-1" /> Edit
                                            </button>
                                            <button onClick={() => handleDeleteClick(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg flex items-center text-sm font-medium">
                                                <Trash2 size={16} className="mr-1" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmation.title}</h3>
                            <p className="text-gray-600 mb-6">{confirmation.message}</p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirmation({ ...confirmation, isOpen: false })}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Templates Modal */}
            {isManageTemplatesOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center"><Repeat size={20} className="mr-2 text-blue-600" /> Recurring Usage Templates</h2>
                            <button onClick={() => setIsManageTemplatesOpen(false)}><X size={24} className="text-gray-400" /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">These items will be automatically logged as usage every day when you open the app.</p>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {templates.length === 0 ? (
                                <p className="text-center text-gray-400 py-4">No recurring templates set.</p>
                            ) : (
                                templates.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                                        <div>
                                            <p className="font-bold text-gray-800">{t.itemName}</p>
                                            <p className="text-xs text-gray-500">{t.quantity} {t.unit} / day</p>
                                        </div>
                                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 bg-white p-2 border rounded hover:bg-red-50">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setIsManageTemplatesOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{currentItem ? "Edit Item" : "Add Inventory Item"}</h2>
                            <button onClick={() => setIsItemModalOpen(false)}><X size={24} className="text-gray-400" /></button>
                        </div>

                        <form onSubmit={handleItemSubmit} className="space-y-4">

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(categoryOptions).map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setItemForm({ ...itemForm, category: cat, subCategory: "", unit: "" })}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${itemForm.category === cat
                                                ? categoryOptions[cat].color + " border-transparent ring-2 ring-offset-1 ring-gray-200"
                                                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sub-Category (If applicable) */}
                            {categoryOptions[itemForm.category].subCategories.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type / Sub-Category</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white"
                                        value={itemForm.subCategory}
                                        onChange={(e) => handleSubCategoryChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Type...</option>
                                        {categoryOptions[itemForm.category].subCategories.map(sub => (
                                            <option key={sub.name} value={sub.name}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Wanda Specifics */}
                            {itemForm.subCategory === "Wanda" && (
                                <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-3 rounded border border-yellow-100">
                                    <div>
                                        <label className="block text-xs font-bold text-yellow-800 mb-1">Company</label>
                                        <select
                                            className="w-full p-2 border rounded text-sm"
                                            value={itemForm.brand}
                                            onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {wandaOptions.brands.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-yellow-800 mb-1">Feed Type</label>
                                        <select
                                            className="w-full p-2 border rounded text-sm"
                                            value={itemForm.feedType}
                                            onChange={(e) => setItemForm({ ...itemForm, feedType: e.target.value })}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {wandaOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Item Name (Auto-Generated or Manual) */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded bg-gray-50"
                                    value={itemForm.name}
                                    onChange={handleNameChange} // Allows manual override
                                    placeholder="Complete Item Name"
                                />
                                {items.find(i => i.name.toLowerCase() === itemForm.name.toLowerCase() && (!currentItem || i.id !== currentItem.id)) && (
                                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                                        <History size={12} className="mr-1" /> Existing item found. Stock will be merged.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cost per Unit</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 500"
                                        className="w-full p-2 border rounded"
                                        value={itemForm.cost}
                                        onChange={e => setItemForm({ ...itemForm, cost: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Reorder Level</label>
                                    <input type="number" required className="w-full p-2 border rounded" value={itemForm.lowStockThreshold} onChange={e => setItemForm({ ...itemForm, lowStockThreshold: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantity</label>
                                    <input type="number" step="0.1" required className="w-full p-2 border rounded" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Unit</label>
                                    <input
                                        type="text"
                                        placeholder="kg, bags"
                                        required
                                        className="w-full p-2 border rounded"
                                        value={itemForm.unit}
                                        onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                                        // Disable unit editing if it's fixed by subcategory (unless self-entry)
                                        disabled={itemForm.subCategory && itemForm.subCategory !== "Self Entry"}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-green-600">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
