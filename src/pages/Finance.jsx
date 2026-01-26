import React, { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useFinance } from "../hooks/useFinance";
import { useToast } from "../contexts/ToastContext";
import {
    CircleDollarSign,
    Plus,
    Trash2,
    Calendar,
    Tag,
    FileText,
    TrendingUp,
    DollarSign,
    Filter
} from "lucide-react";

export default function Finance() {
    const { expenses, loading, addExpense, deleteExpense } = useFinance();
    const { addToast } = useToast();

    // Form State
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: "Feed",
        amount: "",
        description: ""
    });

    // Confirmation Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addExpense({
                ...form,
                amount: parseFloat(form.amount)
            });
            addToast("Expense added successfully", "success");
            setForm({
                date: new Date().toISOString().split('T')[0],
                category: "Feed",
                amount: "",
                description: ""
            });
        } catch (error) {
            addToast("Failed to add expense", "error");
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteExpense(deleteId);
            addToast("Expense deleted", "success");
        } catch (error) {
            addToast("Failed to delete", "error");
        } finally {
            setIsDeleteModalOpen(false);
            setDeleteId(null);
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
                        <Plus className="mr-2 text-primary" /> Add New Expense
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
                        <button
                            type="submit"
                            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-green-700 transition font-medium"
                        >
                            Save Expense
                        </button>
                    </form>
                </div>

                {/* Expenses List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center">
                            <FileText className="mr-2 text-gray-500" size={20} /> Expense History
                        </h3>
                    </div>
                    {loading ? (
                        <p className="p-8 text-center text-gray-500">Loading expenses...</p>
                    ) : (
                        <div className="overflow-x-auto">
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
                                            <tr key={exp.id} className="border-b hover:bg-gray-50">
                                                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                                    {new Date(exp.date).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-800">{exp.description || '-'}</td>
                                                <td className="p-4 font-bold text-gray-800">
                                                    Rs {parseFloat(exp.amount).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteClick(exp.id)}
                                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Expense?</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to remove this record? This action cannot be undone.</p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
