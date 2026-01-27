import React, { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useFinance } from "../hooks/useFinance";
import { useToast } from "../contexts/ToastContext";
import { useConfirmation } from "../contexts/ConfirmationContext";
import {
    CircleDollarSign,
    Plus,
    Trash2,
    Calendar,
    Tag,
    FileText,
    TrendingUp,
    DollarSign,
    Filter,
    FileCode,
    FileSpreadsheet,
    Lock,
    Pencil
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Finance() {
    const { expenses, loading, addExpense, deleteExpense, updateExpense } = useFinance();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();

    // Form State
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: "Feed",
        amount: "",
        description: ""
    });
    const [editingId, setEditingId] = useState(null);

    // Derived Stats
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const lastMonthDate = new Date();
        lastMonthDate.setMonth(now.getMonth() - 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        let totalThisMonth = 0;
        let totalLastMonth = 0;
        const categoryTotals = {};

        expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            const amt = parseFloat(exp.amount) || 0;

            if (expDate.getMonth() === thisMonth && expDate.getFullYear() === thisYear) {
                totalThisMonth += amt;
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
            }
            if (expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear) {
                totalLastMonth += amt;
            }
        });

        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

        return {
            totalThisMonth,
            totalLastMonth,
            topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
        };
    }, [expenses]);

    const categories = [
        "Feed", "Medicine", "Wages", "Maintenance", "Utilities", "Fuel", "Equipment", "Other"
    ];

    // --- HANDLERS ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const expenseData = {
                ...form,
                amount: parseFloat(form.amount)
            };

            if (editingId) {
                await updateExpense(editingId, expenseData);
                addToast("Expense updated successfully", "success");
                setEditingId(null);
            } else {
                await addExpense(expenseData);
                addToast("Expense added successfully", "success");
            }

            setForm({
                date: new Date().toISOString().split('T')[0],
                category: "Feed",
                amount: "",
                description: ""
            });
        } catch (error) {
            addToast(editingId ? "Failed to update expense" : "Failed to add expense", "error");
        }
    };

    const handleEditClick = (exp) => {
        setEditingId(exp.id);
        setForm({
            date: exp.date || new Date().toISOString().split('T')[0],
            category: exp.category || "Feed",
            amount: exp.amount || "",
            description: exp.description || ""
        });
        // Scroll to form (Mobile UX)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm({
            date: new Date().toISOString().split('T')[0],
            category: "Feed",
            amount: "",
            description: ""
        });
    };

    const handleDeleteClick = async (id) => {
        if (await confirm("Are you sure you want to remove this record? This action cannot be undone.", "Delete Expense?")) {
            try {
                await deleteExpense(id);
                addToast("Expense deleted", "success");
                if (editingId === id) handleCancelEdit(); // Reset form if deleting currently edited item
            } catch (error) {
                addToast("Failed to delete", "error");
            }
        }
    };

    const handleAutoActionClick = () => {
        addToast("Automated expenses cannot be edited or deleted directly. Please update or remove the source record in Inventory, HR, or Health Records.", "error");
    };

    // --- EXPORT ---
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text("SAIM Dairy Farm", 14, 15);
            doc.setFontSize(12);
            doc.text("Financial Expense Report", 14, 22);
            doc.setFontSize(10);
            const dateStr = new Date().toLocaleDateString();
            doc.text(`Generated: ${dateStr}`, 14, 28);

            const tableColumn = ["Date", "Type", "Category", "Description", "Amount (Rs)"];
            const tableRows = [];

            const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

            sortedExpenses.forEach(exp => {
                const row = [
                    new Date(exp.date).toLocaleDateString(),
                    exp.type || "Manual", // Default to Manual if missing
                    exp.category,
                    exp.description || "-",
                    parseFloat(exp.amount).toLocaleString()
                ];
                tableRows.push(row);
            });

            // Calculate Total
            const totalExpense = sortedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
            });

            // Add Total Summary at the bottom
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Monthly Expense / Period Total: Rs ${totalExpense.toLocaleString()}`, 14, finalY);

            doc.save(`expense_report_${new Date().toISOString().slice(0, 10)}.pdf`);
            addToast("Expense Report Downloaded Successfully", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to export PDF", "error");
        }
    };

    const handleExportExcel = () => {
        try {
            const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
            const data = sortedExpenses.map(exp => ({
                Date: new Date(exp.date).toLocaleDateString(),
                Type: exp.type || "Manual",
                Category: exp.category,
                Description: exp.description || "-",
                Amount: parseFloat(exp.amount)
            }));

            // Calculate Total Row
            const totalExpense = sortedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            data.push({
                Date: "TOTAL",
                Type: "",
                Category: "",
                Description: "",
                Amount: totalExpense
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
            XLSX.writeFile(workbook, `expense_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
            addToast("Expense Report Downloaded Successfully", "success");
        } catch (error) {
            console.error(error);
            addToast("Failed to export Excel", "error");
        }
    };

    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Expense Management</h1>
                    <p className="text-gray-600">Track and manage farm expenditures</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-red-100 rounded-full text-red-600 mr-4">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Expenses (This Month)</p>
                        <h3 className="text-2xl font-bold text-gray-800">Rs {stats.totalThisMonth.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-gray-100 rounded-full text-gray-600 mr-4">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Expenses (Last Month)</p>
                        <h3 className="text-2xl font-bold text-gray-800">Rs {stats.totalLastMonth.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                        <Tag size={24} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Top Category (This Month)</p>
                        <h3 className="text-2xl font-bold text-gray-800">
                            {stats.topCategory ? stats.topCategory.name : 'N/A'}
                        </h3>
                        {stats.topCategory && (
                            <p className="text-xs text-gray-500">Rs {stats.topCategory.amount.toLocaleString()}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Add Expense Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        {editingId ? <Pencil className="mr-2 text-primary" /> : <Plus className="mr-2 text-primary" />}
                        {editingId ? "Edit Expense" : "Add New Expense"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="0.00"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                rows="3"
                                placeholder="Details regarding the expense..."
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="flex gap-2">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-green-700 transition font-medium"
                            >
                                {editingId ? "Update Expense" : "Save Expense"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Expenses List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <h3 className="font-bold text-gray-700 flex items-center">
                            <FileText className="mr-2 text-gray-500" size={20} /> Expense History
                        </h3>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={handleExportPDF}
                                className="flex-1 md:flex-none flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 transition"
                            >
                                <FileCode size={16} className="mr-2" /> PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex-1 md:flex-none flex items-center justify-center px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 border border-green-200 transition"
                            >
                                <FileSpreadsheet size={16} className="mr-2" /> Excel
                            </button>
                        </div>
                    </div>
                    {loading ? (
                        <p className="p-8 text-center text-gray-500">Loading expenses...</p>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white border-b">
                                        <tr>
                                            <th className="p-4 font-semibold text-gray-600">Date</th>
                                            <th className="p-4 font-semibold text-gray-600">Category</th>
                                            <th className="p-4 font-semibold text-gray-600">Description</th>
                                            <th className="p-4 font-semibold text-gray-600">Amount</th>
                                            <th className="p-4 font-semibold text-gray-600 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-500">No expenses recorded yet.</td>
                                            </tr>
                                        ) : (
                                            expenses.map(exp => (
                                                <tr key={exp.id} className={`border-b hover:bg-gray-50 ${editingId === exp.id ? 'bg-blue-50' : ''}`}>
                                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                                        {new Date(exp.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200">
                                                            {exp.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-800">
                                                        <div className="flex flex-col">
                                                            <span>{exp.description || '-'}</span>
                                                            {exp.type === 'Auto' && (
                                                                <span className="text-[10px] text-gray-400 font-medium bg-gray-50 w-fit px-1 rounded border border-gray-100 mt-0.5">AUTO</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-800">
                                                        Rs {parseFloat(exp.amount).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {exp.type === 'Auto' ? (
                                                            <button
                                                                onClick={handleAutoActionClick}
                                                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded transition"
                                                                title="Automated Record (Locked)"
                                                            >
                                                                <Lock size={16} />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => handleEditClick(exp)}
                                                                    className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded transition"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(exp.id)}
                                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden grid grid-cols-1 gap-4 p-4 text-left">
                                {expenses.length === 0 ? (
                                    <p className="text-center text-gray-500">No expenses recorded yet.</p>
                                ) : (
                                    expenses.map(exp => (
                                        <div key={exp.id} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 ${editingId === exp.id ? 'ring-2 ring-primary' : ''}`}>
                                            {/* Header */}
                                            <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">{new Date(exp.date).toLocaleDateString()}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                                                            {exp.category}
                                                        </span>
                                                        {exp.type === 'Auto' && (
                                                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-blue-100 flex items-center gap-1">
                                                                <Lock size={8} /> AUTO
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {exp.type === 'Auto' ? (
                                                    <button
                                                        onClick={handleAutoActionClick}
                                                        className="p-2 bg-gray-50 text-gray-400 rounded-lg transition"
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleEditClick(exp)}
                                                            className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(exp.id)}
                                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Amount Block */}
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">AMOUNT</span>
                                                    <span className="font-bold text-gray-900 text-lg">Rs {parseFloat(exp.amount).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {exp.description && (
                                                <div className="text-sm text-gray-600 bg-white p-2 border border-gray-50 rounded italic">
                                                    "{exp.description}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}



