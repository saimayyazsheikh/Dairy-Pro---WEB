import React, { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useSales } from "../hooks/useSales";
import { useToast } from "../contexts/ToastContext";
import { useConfirmation } from "../contexts/ConfirmationContext";
import { Calendar, DollarSign, TrendingUp, ShoppingBag, Clock, FileText, Trash2, Banknote } from "lucide-react";

export default function Sales() {
    const { sales, loading, addSaleRecord, deleteSaleRecord } = useSales();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        liters: "",
        rate: "",
        buyer: "",
        note: ""
    });

    // Calculate Total Amount dynamically
    const totalAmount = (parseFloat(formData.liters) || 0) * (parseFloat(formData.rate) || 0);

    // Performance Stats Calculation
    const stats = useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const thisMonth = new Date().getMonth();

        const todaySales = sales
            .filter(sale => sale.date === today)
            .reduce((acc, sale) => ({
                liters: acc.liters + (parseFloat(sale.liters) || 0),
                amount: acc.amount + (parseFloat(sale.totalAmount) || 0)
            }), { liters: 0, amount: 0 });

        const weekSales = sales
            .filter(sale => new Date(sale.date) >= last7Days)
            .reduce((acc, sale) => ({
                liters: acc.liters + (parseFloat(sale.liters) || 0),
                amount: acc.amount + (parseFloat(sale.totalAmount) || 0)
            }), { liters: 0, amount: 0 });

        const monthSales = sales
            .filter(sale => new Date(sale.date).getMonth() === thisMonth)
            .reduce((acc, sale) => ({
                liters: acc.liters + (parseFloat(sale.liters) || 0),
                amount: acc.amount + (parseFloat(sale.totalAmount) || 0)
            }), { liters: 0, amount: 0 });

        return { todaySales, weekSales, monthSales };
    }, [sales]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addSaleRecord({
                ...formData,
                liters: parseFloat(formData.liters),
                rate: parseFloat(formData.rate),
                totalAmount: totalAmount
            });

            setFormData(prev => ({
                ...prev,
                liters: "",
                buyer: "",
                note: ""
            }));
            // Keep the rate same for convenience

            addToast("Sale recorded successfully!", "success");
        } catch (err) {
            addToast("Failed to record sale.", "error");
        }
        setSubmitting(false);
    };

    const handleDelete = async (id) => {
        if (await confirm("Are you sure you want to delete this sale record?", "Confirm Deletion")) {
            try {
                await deleteSaleRecord(id);
                addToast("Sale record deleted successfully", "delete");
            } catch (error) {
                addToast("Failed to delete record", "error");
            }
        }
    };

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Milk Sales & Revenue</h1>
                <p className="text-gray-600">Track daily sales and revenue</p>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Today */}
                <div className="bg-green-50 p-4 rounded-xl flex items-center border border-green-100 shadow-sm">
                    <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-green-600 font-medium">Today's Revenue</p>
                        <p className="text-2xl font-bold text-gray-800">Rs {stats.todaySales.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{stats.todaySales.liters} Liters Sold</p>
                    </div>
                </div>

                {/* Weekly */}
                <div className="bg-blue-50 p-4 rounded-xl flex items-center border border-blue-100 shadow-sm">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-blue-600 font-medium">Last 7 Days</p>
                        <p className="text-2xl font-bold text-gray-800">Rs {stats.weekSales.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{stats.weekSales.liters} Liters Sold</p>
                    </div>
                </div>

                {/* Monthly */}
                <div className="bg-purple-50 p-4 rounded-xl flex items-center border border-purple-100 shadow-sm">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600 mr-4">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-purple-600 font-medium">This Month</p>
                        <p className="text-2xl font-bold text-gray-800">Rs {stats.monthSales.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{stats.monthSales.liters} Liters Sold</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <FileText className="mr-2 text-primary" /> Record Sale
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                            <input
                                type="date"
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (L) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    placeholder="0.0"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.liters}
                                    onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (Rs/L) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.rate}
                                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Total Amount:</span>
                                <span className="text-xl font-bold text-green-600">Rs {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer / Company Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Nestle, Engro, Local"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.buyer}
                                onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                            <textarea
                                rows="2"
                                placeholder="Any details..."
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-green-600 transition font-medium"
                        >
                            {submitting ? "Saving..." : "Record Sale"}
                        </button>
                    </form>
                </div>

                {/* History Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <Clock className="mr-2 text-gray-500" /> Recent Sales
                    </h2>

                    {loading ? (
                        <p className="text-center text-gray-500 py-8">Loading history...</p>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 font-semibold text-gray-600">Date</th>
                                            <th className="p-3 font-semibold text-gray-600">Buyer</th>
                                            <th className="p-3 font-semibold text-gray-600">Qty (L)</th>
                                            <th className="p-3 font-semibold text-gray-600">Rate</th>
                                            <th className="p-3 font-semibold text-gray-600">Total</th>
                                            <th className="p-3 font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-500">No sales record found.</td>
                                            </tr>
                                        ) : (
                                            sales.map((sale) => (
                                                <tr key={sale.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3 text-gray-800">{sale.date}</td>
                                                    <td className="p-3 text-gray-600">{sale.buyer || '-'}</td>
                                                    <td className="p-3 font-medium">{sale.liters} L</td>
                                                    <td className="p-3 text-gray-600">Rs {sale.rate}</td>
                                                    <td className="p-3 font-bold text-green-600">Rs {sale.totalAmount.toLocaleString()}</td>
                                                    <td className="p-3">
                                                        <button
                                                            onClick={() => handleDelete(sale.id)}
                                                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
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

                            {/* Mobile Card View */}
                            <div className="md:hidden grid grid-cols-1 gap-4">
                                {sales.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No sales record found.</p>
                                ) : (
                                    sales.map((sale) => (
                                        <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                            {/* Header */}
                                            <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">{new Date(sale.date).toLocaleDateString()}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-bold text-gray-800 text-md">{sale.buyer || "Unknown Buyer"}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(sale.id)}
                                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Stats Block */}
                                            <div className="grid grid-cols-2 gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-green-800 uppercase mb-0.5">SOLD</span>
                                                    <span className="font-bold text-gray-800 text-lg">{sale.liters} <span className="text-sm font-normal text-gray-500">L</span></span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold text-green-800 uppercase mb-0.5">TOTAL</span>
                                                    <span className="font-bold text-green-700 text-lg">Rs {sale.totalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="col-span-2 border-t border-green-200 mt-1 pt-1 flex justify-between items-center">
                                                    <span className="text-xs text-green-700">Rate: Rs {sale.rate}/L</span>
                                                </div>
                                            </div>
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
