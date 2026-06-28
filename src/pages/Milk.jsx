import React, { useState, useMemo, useEffect } from "react";
import Layout from "../components/Layout";
import { useMilk } from "../hooks/useMilk";
import { useCattle } from "../hooks/useCattle";
import { useToast } from "../contexts/ToastContext";
import { useConfirmation } from "../contexts/ConfirmationContext";
import { useAuth } from "../contexts/AuthContext";
import {
    Droplet, DollarSign, Calendar, TrendingUp,
    FileText, Save, Trash2, User, ChevronDown, Plus, Download, Filter, FileSpreadsheet, FileCode, X, Edit2
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Milk() {
    const {
        milkRecords, performanceLogs, vendors,
        loading, addMilkRecord, deleteMilkRecord,
        addPerformanceLog, updatePerformanceLog, deletePerformanceLog,
        addVendor, updateVendor, deleteVendor
    } = useMilk();
    const { cattle } = useCattle();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();
    const { farmData } = useAuth();
    const farmName = farmData?.farmName || "DairyPro";

    const [activeTab, setActiveTab] = useState("daily"); // daily | monthly
    const [submitting, setSubmitting] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);

    // --- DAILY FORM STATE (COLLECTIVE LOGGING) ---
    const initialEntry = { vendorName: "", vendorId: "", quantity: "", pricePerLiter: "", isCustom: false };
    const [dailyDate, setDailyDate] = useState(new Date().toLocaleDateString('en-CA'));
    // Session state removed
    const [entries, setEntries] = useState([{ ...initialEntry }]);
    const [isCustomVendor, setIsCustomVendor] = useState(false); // Track custom vendor per row? No, simplified for now: generic list

    // --- MONTHLY FORM STATE ---
    const initialMonthlyState = {
        date: new Date().toISOString().slice(0, 7), // YYYY-MM
        cowId: "",
        morningYield: "",
        eveningYield: "",
        nightYield: "",
    };
    const [monthlyForm, setMonthlyForm] = useState(initialMonthlyState);
    const [editingPerformanceId, setEditingPerformanceId] = useState(null);

    // --- FILTERS ---
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [vendorFilter, setVendorFilter] = useState("All");

    // --- CALCULATIONS & STATS ---

    // 1. Dashboard Stats (Today/Month)
    const stats = useMemo(() => {
        const today = new Date().toLocaleDateString('en-CA');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const todayRecords = milkRecords.filter(r => r.date === today);
        const monthRecords = milkRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const todayYield = todayRecords.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
        const todayRevenue = todayRecords.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
        const monthRevenue = monthRecords.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);

        return {
            todayYield: todayYield.toFixed(1),
            todayRevenue: todayRevenue.toFixed(0),
            monthRevenue: monthRevenue.toFixed(0)
        };
    }, [milkRecords]);


    // --- HANDLERS ---

    // Entry Management
    const handleAddEntry = () => {
        setEntries([...entries, { ...initialEntry }]);
    };

    const handleRemoveEntry = (index) => {
        const newEntries = [...entries];
        newEntries.splice(index, 1);
        setEntries(newEntries);
    };

    const handleEntryChange = (index, field, value) => {
        const newEntries = [...entries];
        newEntries[index][field] = value;

        // Auto-fill price if vendor selected
        if (field === "vendorName" && !newEntries[index].isCustom) {
            const vendor = vendors.find(v => v.name.toLowerCase() === value.toLowerCase());
            if (vendor) {
                newEntries[index].pricePerLiter = vendor.defaultPrice || "";
                newEntries[index].vendorId = vendor.id;
            } else {
                newEntries[index].vendorId = ""; // Clear ID if custom/new
            }
        }

        setEntries(newEntries);
    };

    const handleDailySubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Process all entries
            const promises = entries.map(entry => {
                const qty = parseFloat(entry.quantity) || 0;
                const price = parseFloat(entry.pricePerLiter) || 0;
                return addMilkRecord({
                    date: dailyDate,
                    session: "-", // Session removed
                    vendorName: entry.vendorName,
                    vendorId: entry.vendorId,
                    quantity: qty,
                    pricePerLiter: price,
                    totalAmount: qty * price,
                    // Removed Fat/SNF
                });
            });

            await Promise.all(promises);

            // Reset
            setEntries([{ ...initialEntry }]);
            addToast("Sales logged successfully!", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to log sales", "error");
        }
        setSubmitting(false);
    };

    const handleMonthlySubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedCow = cattle.find(c => c.id === monthlyForm.cowId);
            const payload = {
                ...monthlyForm,
                cowTag: selectedCow ? selectedCow.tagId : "Unknown",
                morningYield: parseFloat(monthlyForm.morningYield) || 0,
                eveningYield: parseFloat(monthlyForm.eveningYield) || 0,
                nightYield: parseFloat(monthlyForm.nightYield) || 0,
                // Removed avgFat and avgSnf
            };

            if (editingPerformanceId) {
                await updatePerformanceLog(editingPerformanceId, payload);
                addToast("Performance record updated successfully", "success");
            } else {
                await addPerformanceLog(payload);
                addToast("Performance record added successfully", "success");
            }

            setMonthlyForm(initialMonthlyState);
            setEditingPerformanceId(null);
        } catch (err) {
            console.error("Monthly Log Error:", err);
            addToast("Failed to save monthly log: " + err.message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditPerformanceLog = (log) => {
        setMonthlyForm({
            date: log.date || "",
            cowId: log.cowId || "",
            morningYield: (log.morningYield !== undefined && log.morningYield !== null) ? log.morningYield : "",
            eveningYield: (log.eveningYield !== undefined && log.eveningYield !== null) ? log.eveningYield : "",
            nightYield: (log.nightYield !== undefined && log.nightYield !== null) ? log.nightYield : "",
        });
        setEditingPerformanceId(log.id);
        // Scroll to form (optional, simplified for now)
    };

    const handleMonthlyExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(farmName, 14, 15);
        doc.setFontSize(12);
        doc.text("Monthly Cow Performance", 14, 22);
        const tableColumn = ["Month", "Animal Tag", "Morning (L)", "Evening (L)", "Night (L)", "Total (L)"];
        const tableRows = [];

        // Sort Ascending by Date
        const sortedLogs = [...performanceLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedLogs.forEach(log => {
            const m = parseFloat(log.morningYield) || 0;
            const e = parseFloat(log.eveningYield) || 0;
            const n = parseFloat(log.nightYield) || 0;
            const total = (m + e + n).toFixed(1);
            const row = [
                new Date(log.date + "-01").toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                log.cowTag,
                m, e, n, total
            ];
            tableRows.push(row);
        });

        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 28 });
        doc.save("monthly_performance.pdf");
    };

    const handleMonthlyExportExcel = () => {
        const sortedLogs = [...performanceLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
        const data = sortedLogs.map(log => {
            const m = parseFloat(log.morningYield) || 0;
            const e = parseFloat(log.eveningYield) || 0;
            const n = parseFloat(log.nightYield) || 0;
            return {
                Month: new Date(log.date + "-01").toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                "Animal Tag": log.cowTag,
                "Morning (L)": m,
                "Evening (L)": e,
                "Night (L)": n,
                "Total (L)": m + e + n,
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Performance");
        XLSX.writeFile(wb, "monthly_performance.xlsx");
    };

    // --- RECENT SALES TABLE DATA ---
    const consolidatedRecords = useMemo(() => {
        // Filter first
        let filtered = milkRecords;
        if (dateRange.start) filtered = filtered.filter(r => r.date >= dateRange.start);
        if (dateRange.end) filtered = filtered.filter(r => r.date <= dateRange.end);
        if (vendorFilter !== "All") filtered = filtered.filter(r => r.vendorName === vendorFilter);

        // Group by Date
        const grouped = {};
        filtered.forEach(record => {
            if (!grouped[record.date]) {
                grouped[record.date] = {
                    date: record.date,
                    totalQuantity: 0,
                    totalAmount: 0,
                    records: []
                };
            }
            const qty = parseFloat(record.quantity) || 0;
            const amt = parseFloat(record.totalAmount) || 0;

            grouped[record.date].totalQuantity += qty;
            grouped[record.date].totalAmount += amt;
            grouped[record.date].records.push(record);
        });

        // Convert to array and Sort Ascending
        return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [milkRecords, dateRange, vendorFilter]);


    // --- EXPORT ---
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text(farmName, 14, 15);
            doc.setFontSize(12);
            doc.text("Milk Sales Report", 14, 22);

            if (dateRange.start || dateRange.end) {
                const start = dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Start';
                const end = dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'End';
                doc.setFontSize(10);
                doc.text(`Period: ${start} - ${end}`, 14, 28);
            }

            const tableColumn = ["Date", "Vendor", "Qty (L)", "Price", "Total (Rs)"];
            const tableRows = [];

            let recordsToExport = [];
            consolidatedRecords.forEach(group => {
                group.records.forEach(r => recordsToExport.push(r));
            });
            recordsToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

            recordsToExport.forEach(ticket => {
                const ticketData = [
                    ticket.date,
                    ticket.vendorName,
                    ticket.quantity,
                    ticket.pricePerLiter,
                    ticket.totalAmount.toLocaleString(),
                ];
                tableRows.push(ticketData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
            });
            doc.save(`milk_sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
            addToast("PDF exported successfully", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to export PDF", "error");
        }
    };

    const handleExportExcel = () => {
        try {
            let recordsToExport = [];
            consolidatedRecords.forEach(group => {
                group.records.forEach(r => recordsToExport.push(r));
            });
            recordsToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

            const worksheet = XLSX.utils.json_to_sheet(recordsToExport.map(r => ({
                Date: r.date,
                Session: r.session,
                Vendor: r.vendorName,
                Quantity: r.quantity,
                Price: r.pricePerLiter,
                Total: r.totalAmount
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
            XLSX.writeFile(workbook, `milk_sales_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
            addToast("Excel exported successfully", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to export Excel", "error");
        }
    };

    const handleDeleteRecord = async (id, type = 'daily') => {
        if (await confirm("This action cannot be undone. Are you sure you want to delete this record?", "Confirm Deletion")) {
            try {
                if (type === 'monthly') {
                    await deletePerformanceLog(id);
                } else {
                    await deleteMilkRecord(id);
                }
                addToast("Record deleted successfully", "delete");
            } catch (err) {
                console.error("Delete error:", err);
                addToast("Failed to delete record", "error");
            }
        }
    }

    // Vendor Modal State
    const [newVendor, setNewVendor] = useState({ name: "", defaultPrice: "" });
    const [editingVendorId, setEditingVendorId] = useState(null);

    const handleSaveVendor = async () => {
        if (!newVendor.name || !newVendor.defaultPrice) {
            addToast("Please fill all fields", "error");
            return;
        }
        try {
            if (editingVendorId) {
                await updateVendor(editingVendorId, { name: newVendor.name, defaultPrice: parseFloat(newVendor.defaultPrice) });
                addToast("Vendor updated", "success");
            } else {
                await addVendor({ name: newVendor.name, defaultPrice: parseFloat(newVendor.defaultPrice) });
                addToast("Vendor added", "success");
            }
            setNewVendor({ name: "", defaultPrice: "" });
            setEditingVendorId(null);
        } catch (err) {
            addToast("Failed to save vendor", "error");
        }
    };

    const handleEditVendor = (v) => {
        setNewVendor({ name: v.name, defaultPrice: v.defaultPrice });
        setEditingVendorId(v.id);
    };

    const handleDeleteVendor = async (id) => {
        if (await confirm("Delete this permanent vendor?")) {
            try {
                await deleteVendor(id);
                addToast("Vendor deleted", "delete");
            } catch (err) {
                addToast("Failed to delete vendor", "error");
            }
        }
    };

    const dynamicVendors = Array.from(new Set([...milkRecords.map(r => r.vendorName), ...vendors.map(v => v.name)])).filter(Boolean);

    return (
        <Layout>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Milk Management</h1>
                <p className="text-gray-600">Unified production logging and sales tracking</p>
            </div>

            {/* Dashboard Cards (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-xl flex items-center border border-blue-100 shadow-sm">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4"><Droplet size={24} /></div>
                    <div><p className="text-sm text-blue-600 font-medium">Today's Yield</p><p className="text-2xl font-bold text-gray-800">{stats.todayYield} L</p></div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl flex items-center border border-green-100 shadow-sm">
                    <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4"><DollarSign size={24} /></div>
                    <div><p className="text-sm text-green-600 font-medium">Today's Revenue</p><p className="text-2xl font-bold text-gray-800">Rs {stats.todayRevenue}</p></div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl flex items-center border border-purple-100 shadow-sm">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600 mr-4"><TrendingUp size={24} /></div>
                    <div><p className="text-sm text-purple-600 font-medium">Monthly Revenue</p><p className="text-2xl font-bold text-gray-800">Rs {stats.monthRevenue}</p></div>
                </div>
            </div>


            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab("daily")} className={`pb-2 px-4 text-sm font-medium transition ${activeTab === "daily" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}>Daily Sales Audit</button>
                <button onClick={() => setActiveTab("monthly")} className={`pb-2 px-4 text-sm font-medium transition ${activeTab === "monthly" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"}`}>Monthly Cow Performance</button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- DAILY SALES VIEW --- */}
                {activeTab === "daily" && (
                    <>
                        {/* Collective Form */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                    <FileText className="mr-2 text-primary" /> Log Sales
                                </h2>
                                <button type="button" onClick={() => setShowVendorModal(true)} className="text-sm text-primary hover:underline font-medium">Manage Vendors</button>
                            </div>
                            <form onSubmit={handleDailySubmit}>
                                <div className="grid grid-cols-1 gap-3 mb-4">
                                    {/* Date - Span Full Width now since session is gone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input type="date" required className="w-full p-2 border rounded-lg" value={dailyDate} onChange={e => setDailyDate(e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <label className="block text-sm font-medium text-gray-700">Entries</label>
                                    {entries.map((entry, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative">
                                            <div className="grid grid-cols-1 gap-3 mb-2">
                                                <select
                                                    className="w-full p-2 border rounded bg-white text-sm"
                                                    value={entry.isCustom ? "custom" : entry.vendorName}
                                                    onChange={e => {
                                                        if (e.target.value === "custom") {
                                                            handleEntryChange(index, "isCustom", true);
                                                            handleEntryChange(index, "vendorName", "");
                                                            handleEntryChange(index, "vendorId", "");
                                                            handleEntryChange(index, "pricePerLiter", "");
                                                        } else {
                                                            handleEntryChange(index, "isCustom", false);
                                                            handleEntryChange(index, "vendorName", e.target.value);
                                                        }
                                                    }}
                                                    required={!entry.isCustom}
                                                >
                                                    <option value="" disabled>Select Vendor...</option>
                                                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                                    <option value="custom">Other (Temporary Vendor)</option>
                                                </select>

                                                {entry.isCustom && (
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 border rounded bg-white text-sm"
                                                        placeholder="Enter Temporary Vendor Name..."
                                                        value={entry.vendorName}
                                                        onChange={e => handleEntryChange(index, "vendorName", e.target.value)}
                                                        required
                                                    />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="number" step="0.1" placeholder="Qty (L)"
                                                    className="p-2 border rounded text-sm w-full"
                                                    value={entry.quantity} onChange={e => handleEntryChange(index, "quantity", e.target.value)} required
                                                />
                                                <input
                                                    type="number" step="0.1" placeholder="Price"
                                                    className="p-2 border rounded text-sm w-full"
                                                    value={entry.pricePerLiter} onChange={e => handleEntryChange(index, "pricePerLiter", e.target.value)} required
                                                />
                                            </div>
                                            {entries.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveEntry(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-200"><Trash2 size={12} /></button>
                                            )}
                                        </div>
                                    ))}

                                </div>

                                <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center mb-4">
                                    <span className="text-green-800 font-medium text-sm">Total EST Revenue:</span>
                                    <span className="text-lg font-bold text-green-700">
                                        Rs {entries.reduce((sum, e) => sum + ((parseFloat(e.quantity) || 0) * (parseFloat(e.pricePerLiter) || 0)), 0).toLocaleString()}
                                    </span>
                                </div>

                                <button type="submit" disabled={submitting} className="w-full bg-primary text-white p-3 rounded-lg hover:bg-green-600 font-medium">
                                    {submitting ? "Saving..." : "Save All Entries"}
                                </button>
                            </form>
                        </div>


                        {/* Recent Sales Table */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h2 className="text-xl font-bold text-gray-800">Recent Sales</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleExportPDF} className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200">
                                        <FileCode size={16} className="mr-2" /> PDF
                                    </button>
                                    <button onClick={handleExportExcel} className="flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 border border-green-200">
                                        <FileSpreadsheet size={16} className="mr-2" /> Excel
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 flex flex-wrap gap-3 items-center border border-gray-200">
                                <Filter size={16} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">Filter:</span>

                                <input type="date" className="p-1.5 border rounded text-sm" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} placeholder="Start Date" />
                                <span className="text-gray-400">-</span>
                                <input type="date" className="p-1.5 border rounded text-sm" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} placeholder="End Date" />

                                <select className="p-1.5 border rounded text-sm" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
                                    <option value="All">All Vendors</option>
                                    {dynamicVendors.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600 text-sm">Date</th>
                                            <th className="p-3 font-semibold text-gray-600 text-sm">Total Yield</th>
                                            <th className="p-3 font-semibold text-gray-600 text-sm">Total Revenue</th>
                                            <th className="p-3 font-semibold text-gray-600 text-sm">Vendors</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {consolidatedRecords.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-gray-500">No records found.</td></tr>
                                        ) : (
                                            consolidatedRecords.map(group => (
                                                <tr key={group.date} className="hover:bg-gray-50">
                                                    <td className="p-3 font-medium text-gray-800">
                                                        {group.date.split('-').reverse().join('-')}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-bold text-gray-700">{group.totalQuantity.toFixed(1)} L</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-bold text-green-600">Rs {group.totalAmount.toLocaleString()}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {group.records.map((r) => (
                                                                <span key={r.id} className="pl-2 pr-1 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100 flex items-center">
                                                                    <span className="font-semibold mr-1">{r.vendorName}</span>
                                                                    <span className="text-blue-500 mr-2">({parseFloat(r.quantity).toFixed(1)} L)</span>
                                                                    <button onClick={() => handleDeleteRecord(r.id)} className="text-red-400 hover:text-red-600 p-0.5 rounded-full hover:bg-white"><Trash2 size={10} /></button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Layout */}
                            <div className="md:hidden grid grid-cols-1 gap-4 mt-4">
                                {consolidatedRecords.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No records found.</p>
                                ) : (
                                    consolidatedRecords.map(group => (
                                        <div key={group.date} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-800 text-lg">{group.date.split('-').reverse().join('-')}</span>
                                                <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">Rs {group.totalAmount.toLocaleString()}</span>
                                            </div>

                                            <div className="text-sm font-medium text-gray-600 mb-3">
                                                Total Yield: <span className="font-bold text-gray-800">{group.totalQuantity.toFixed(1)} L</span>
                                            </div>

                                            <div className="space-y-2">
                                                {group.records.map((r) => (
                                                    <div key={r.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-gray-800">{r.vendorName}</span>
                                                            <span className="text-xs text-gray-500">{parseFloat(r.quantity).toFixed(1)} L @ Rs {r.pricePerLiter}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteRecord(r.id)} className="p-1.5 bg-white text-red-500 rounded border hover:bg-red-50">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* --- MONTHLY PERFORMANCE VIEW --- */}
                {activeTab === "monthly" && (
                    <>
                        {/* Keeping existing Monthly View Logic */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                                <Calendar className="mr-2 text-purple-600" /> Monthly Log
                            </h2>
                            <form onSubmit={handleMonthlySubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                                    <input type="month" required className="w-full p-2 border rounded-lg focus:ring-primary outline-none"
                                        value={monthlyForm.date} onChange={e => setMonthlyForm({ ...monthlyForm, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal *</label>
                                    <select required className="w-full p-2 border rounded-lg focus:ring-primary outline-none"
                                        value={monthlyForm.cowId} onChange={e => setMonthlyForm({ ...monthlyForm, cowId: e.target.value })}>
                                        <option value="">Select Cow...</option>
                                        {cattle.map(cow => (
                                            <option key={cow.id} value={cow.id}>{cow.tagId} - {cow.type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Morning (L)</label>
                                        <input type="number" step="0.1" placeholder="0.0"
                                            className="w-full p-2 border rounded-lg focus:ring-primary outline-none"
                                            value={monthlyForm.morningYield} onChange={e => setMonthlyForm({ ...monthlyForm, morningYield: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Evening (L)</label>
                                        <input type="number" step="0.1" placeholder="0.0"
                                            className="w-full p-2 border rounded-lg focus:ring-primary outline-none"
                                            value={monthlyForm.eveningYield} onChange={e => setMonthlyForm({ ...monthlyForm, eveningYield: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Night (L)</label>
                                        <input type="number" step="0.1" placeholder="0.0"
                                            className="w-full p-2 border rounded-lg focus:ring-primary outline-none"
                                            value={monthlyForm.nightYield} onChange={e => setMonthlyForm({ ...monthlyForm, nightYield: e.target.value })} />
                                    </div>
                                </div>
                                {/* Removed Avg Fat / SNF inputs */}
                                {editingPerformanceId && (
                                    <button type="button" onClick={() => { setMonthlyForm(initialMonthlyState); setEditingPerformanceId(null); }} className="block w-full text-center text-sm text-gray-500 mt-2 hover:text-gray-700">Cancel Edit</button>
                                )}
                                <button type="submit" disabled={submitting} className={`w-full ${editingPerformanceId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white p-3 rounded-lg font-medium`}>
                                    {submitting ? "Saving..." : (editingPerformanceId ? "Update Monthly Log" : "Log Monthly Stats")}
                                </button>
                            </form>
                        </div>

                        {/* History Table */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Performance Records</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleMonthlyExportPDF} className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200">
                                        <FileCode size={16} className="mr-2" /> PDF
                                    </button>
                                    <button onClick={handleMonthlyExportExcel} className="flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 border border-green-200">
                                        <FileSpreadsheet size={16} className="mr-2" /> Excel
                                    </button>
                                </div>
                            </div>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Month</th>
                                            <th className="p-3 font-semibold text-gray-600">Animal</th>
                                            <th className="p-3 font-semibold text-gray-600">Yield Breakdown</th>
                                            {/* Removed Quality Stats column */}
                                            <th className="p-3 font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {performanceLogs.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-gray-500">No records found.</td></tr>
                                        ) : (
                                            [...performanceLogs]
                                                .sort((a, b) => new Date(a.date) - new Date(b.date)) // Ascending Sort
                                                .map(log => (
                                                    <tr key={log.id} className="hover:bg-purple-50/50">
                                                        <td className="p-3 font-medium text-gray-800">
                                                            {new Date(log.date + "-01").toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="p-3 text-purple-700 font-bold">{log.cowTag}</td>
                                                        <td className="p-3 text-sm text-gray-800">
                                                            <div className="flex gap-2">
                                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">M: {log.morningYield || 0}</span>
                                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">E: {log.eveningYield || 0}</span>
                                                                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">N: {log.nightYield || 0}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleEditPerformanceLog(log)} className="text-blue-500 hover:bg-blue-50 p-1 rounded">
                                                                    <FileText size={16} />
                                                                </button>
                                                                <button onClick={() => handleDeleteRecord(log.id, 'monthly')} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card Layout */}
                            <div className="md:hidden grid grid-cols-1 gap-4 font-sans mt-4">
                                {performanceLogs.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No records found.</p>
                                ) : (
                                    [...performanceLogs]
                                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                                        .map(log => (
                                            <div key={log.id} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm relative">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg text-purple-700">{log.cowTag}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                                            {new Date(log.date + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditPerformanceLog(log)} className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                            <FileText size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteRecord(log.id, 'monthly')} className="p-1.5 bg-red-50 text-red-600 rounded">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                    <div className="bg-orange-50 p-2 rounded text-center">
                                                        <span className="block text-[10px] text-orange-500 font-bold uppercase">Morning</span>
                                                        <span className="block font-bold text-orange-700">{log.morningYield || 0}</span>
                                                    </div>
                                                    <div className="bg-blue-50 p-2 rounded text-center">
                                                        <span className="block text-[10px] text-blue-500 font-bold uppercase">Evening</span>
                                                        <span className="block font-bold text-blue-700">{log.eveningYield || 0}</span>
                                                    </div>
                                                    <div className="bg-indigo-50 p-2 rounded text-center">
                                                        <span className="block text-[10px] text-indigo-500 font-bold uppercase">Night</span>
                                                        <span className="block font-bold text-indigo-700">{log.nightYield || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Manage Vendors Modal */}
            {showVendorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Manage Permanent Vendors</h3>
                            <button onClick={() => setShowVendorModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Vendor Name"
                                    className="flex-1 p-2 border rounded"
                                    value={newVendor.name}
                                    onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Rate"
                                    className="w-24 p-2 border rounded"
                                    value={newVendor.defaultPrice}
                                    onChange={e => setNewVendor({ ...newVendor, defaultPrice: e.target.value })}
                                />
                                <button onClick={handleSaveVendor} className="bg-primary text-white px-4 rounded hover:bg-green-700">
                                    {editingVendorId ? "Update" : "Add"}
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto">
                                {vendors.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No permanent vendors found.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {vendors.map(v => (
                                            <li key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                                <div>
                                                    <span className="font-semibold block">{v.name}</span>
                                                    <span className="text-sm text-green-600">Fixed Rate: Rs {v.defaultPrice}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditVendor(v)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteVendor(v.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded"><Trash2 size={16}/></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

