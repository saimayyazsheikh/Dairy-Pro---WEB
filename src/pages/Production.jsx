import React, { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { useCattle } from "../hooks/useCattle";
import { useProduction } from "../hooks/useProduction";
import { useToast } from "../contexts/ToastContext";
import { Calendar, Droplet, Clock, Activity, BarChart2, Trash2 } from "lucide-react";

export default function Production() {
    const { cattle } = useCattle();
    const { logs, loading, addProductionLog, deleteProductionLog } = useProduction();
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        cowId: "",
        date: new Date().toLocaleDateString('en-CA'),
        session: "Morning",
        liters: "",
        fat: "",
        snf: "",
        quality: "Good",
        note: ""
    });

    // Performance Stats Calculation
    const stats = useMemo(() => {
        const today = new Date().toLocaleDateString('en-CA');
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const currentMonth = new Date().getMonth();

        const todayTotal = logs
            .filter(log => log.date === today)
            .reduce((sum, log) => sum + (parseFloat(log.liters) || 0), 0);

        const weekTotal = logs
            .filter(log => new Date(log.date) >= last7Days)
            .reduce((sum, log) => sum + (parseFloat(log.liters) || 0), 0);

        const monthTotal = logs
            .filter(log => new Date(log.date).getMonth() === currentMonth)
            .reduce((sum, log) => sum + (parseFloat(log.liters) || 0), 0);

        return {
            todayTotal: todayTotal.toFixed(1),
            weekTotal: weekTotal.toFixed(1),
            monthTotal: monthTotal.toFixed(1)
        };
    }, [logs]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedCow = cattle.find(c => c.id === formData.cowId);
            const cowTag = selectedCow ? selectedCow.tagId : "Unknown";

            await addProductionLog({
                ...formData,
                cowTag,
                liters: parseFloat(formData.liters),
                fat: parseFloat(formData.fat) || 0,
                snf: parseFloat(formData.snf) || 0
            });

            setFormData(prev => ({
                ...prev,
                liters: "",
                fat: "",
                snf: "",
                note: ""
            }));
            addToast("Production logged successfully!", "success");
        } catch (err) {
            addToast("Failed to log production.", "error");
        }
        setSubmitting(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this log?")) {
            try {
                await deleteProductionLog(id);
                addToast("Log deleted successfully", "success");
            } catch (error) {
                addToast("Failed to delete log", "error");
            }
        }
    };

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Milk Production</h1>
                <p className="text-gray-600">Daily yield and quality monitoring</p>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Today - Green */}
                <div className="bg-green-50 p-4 rounded-xl flex items-center border border-green-100 shadow-sm">
                    <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
                        <Droplet size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-green-600 font-medium">Today's Production</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.todayTotal} L</p>
                    </div>
                </div>

                {/* Week - Blue */}
                <div className="bg-blue-50 p-4 rounded-xl flex items-center border border-blue-100 shadow-sm">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-blue-600 font-medium">Last 7 Days</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.weekTotal} L</p>
                    </div>
                </div>

                {/* Month - Purple */}
                <div className="bg-purple-50 p-4 rounded-xl flex items-center border border-purple-100 shadow-sm">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600 mr-4">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-purple-600 font-medium">This Month</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.monthTotal} L</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <Activity className="mr-2 text-primary" /> Log Production
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal *</label>
                            <select
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={formData.cowId}
                                onChange={(e) => setFormData({ ...formData, cowId: e.target.value })}
                            >
                                <option value="">Select Cow/Buffalo...</option>
                                {cattle.map(cow => (
                                    <option key={cow.id} value={cow.id}>{cow.tagId} - {cow.type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                <select
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.session}
                                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                                >
                                    <option value="Morning">Morning</option>
                                    <option value="Evening">Evening</option>
                                    <option value="Night">Night</option>
                                </select>
                            </div>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fat %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 4.5"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.fat}
                                    onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SNF %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 8.5"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.snf}
                                    onChange={(e) => setFormData({ ...formData, snf: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                                <select
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.quality}
                                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                                >
                                    <option value="Excellent">Excellent</option>
                                    <option value="Good">Good</option>
                                    <option value="Average">Average</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-green-600 transition font-medium"
                        >
                            {submitting ? "Saving..." : "Log Production"}
                        </button>
                    </form>
                </div>

                {/* History Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <Clock className="mr-2 text-gray-500" /> Recent Logs
                    </h2>

                    {loading ? (
                        <p>Loading history...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-600">Date / Session</th>
                                        <th className="p-3 font-semibold text-gray-600">Animal ID</th>
                                        <th className="p-3 font-semibold text-gray-600">Yield</th>
                                        <th className="p-3 font-semibold text-gray-600">Quality</th>
                                        <th className="p-3 font-semibold text-gray-600">Fat/SNF</th>
                                        <th className="p-3 font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-6 text-center text-gray-500">No records found.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="text-gray-800">{log.date}</div>
                                                    <span className={`text-xs font-bold ${log.session === 'Morning' ? 'text-orange-500' :
                                                        log.session === 'Evening' ? 'text-indigo-500' :
                                                            'text-purple-600' // Night
                                                        }`}>
                                                        {log.session}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-700 font-medium">{log.cowTag}</td>
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-800">{log.liters} L</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${log.quality === 'Excellent' ? 'bg-green-100 text-green-700' :
                                                        log.quality === 'Good' ? 'bg-blue-100 text-blue-700' :
                                                            log.quality === 'Poor' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {log.quality}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm text-gray-500">
                                                    <div>F: {log.fat}%</div>
                                                    <div>S: {log.snf}%</div>
                                                </td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => handleDelete(log.id)}
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
                    )}
                </div>
            </div>
        </Layout>
    );
}
