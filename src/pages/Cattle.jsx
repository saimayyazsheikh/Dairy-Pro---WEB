import React, { useState } from "react";
import Layout from "../components/Layout";
import { useCattle } from "../hooks/useCattle";
import { Plus, Search, Edit2, Trash2, X, Filter, Calendar, Activity, MapPin, Syringe, Dna, AlertCircle, ChevronDown } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useConfirmation } from "../contexts/ConfirmationContext";

export default function Cattle() {
    const { cattle, loading, error, addCattle, updateCattle, deleteCattle } = useCattle();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [currentCow, setCurrentCow] = useState(null);

    // Initial Form State
    const initialFormState = {
        tagId: "",
        name: "",
        type: "Cow",
        breed: "",
        gender: "Female",
        dob: "",
        purchasedYear: "",
        status: "Milking",
        bms: "",
        motherId: "",
        fatherSemenCompany: "",
        location: "South 1",
        vaccinationDate: "",
        vaccinationType: "",
        turnOfPregnancy: "",
        inseminationDate: "",
        expectedDeliveryDate: "",
    };

    const [formData, setFormData] = useState(initialFormState);

    const ALL_STATUSES = [
        "Milking",
        "Pregnant",
        "Pregnant 1st",
        "Dry",
        "Ready To Inseminate",
        "Heifer",
        "Minor ( Calf )"
    ];

    // Detailed Age Calculation (Y M D)
    const calculateAge = (dob, purchasedYear) => {
        if (!dob) return purchasedYear ? `${purchasedYear}` : "Unknown";
        const birthDate = new Date(dob);
        const today = new Date();

        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();

        if (days < 0) {
            months--;
            // Get days in previous month
            const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            days += prevMonth;
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        return `${years}Y ${months}M ${days}D`;
    };

    // Auto-calculate Delivery Date if Pregnant
    // Handle Status Change (Multi-select logic)
    const toggleStatus = (statusToToggle) => {
        const currentStatuses = formData.status ? formData.status.split(', ') : [];
        let newStatuses;

        if (currentStatuses.includes(statusToToggle)) {
            newStatuses = currentStatuses.filter(s => s !== statusToToggle);
        } else {
            newStatuses = [...currentStatuses, statusToToggle];
        }

        const newStatusString = newStatuses.join(', ');

        let newData = { ...formData, status: newStatusString };

        // Check for Pregnancy to trigger delivery date logic
        // Checks for "Pregnant" or "Pregnant 1st"
        if (newStatusString.includes("Pregnant")) {
            if (!formData.expectedDeliveryDate) { // Only set if not already set or needing update
                const baseDate = formData.inseminationDate ? new Date(formData.inseminationDate) : new Date();
                const deliveryDate = new Date(baseDate);
                deliveryDate.setDate(deliveryDate.getDate() + 270);
                newData.expectedDeliveryDate = deliveryDate.toISOString().split('T')[0];
            }
        } else {
            newData.expectedDeliveryDate = ""; // Clear if no longer pregnant
        }
        setFormData(newData);
    };

    // Recalculate delivery date if Insemination Date changes while Pregnant
    const handleInseminationChange = (date) => {
        let newData = { ...formData, inseminationDate: date };

        if (formData.status && formData.status.includes("Pregnant")) {
            const baseDate = date ? new Date(date) : new Date();
            const deliveryDate = new Date(baseDate);
            deliveryDate.setDate(deliveryDate.getDate() + 270);
            newData.expectedDeliveryDate = deliveryDate.toISOString().split('T')[0];
        }
        setFormData(newData);
    };

    // Check if delivery is due soon (within 7 days)
    const isDueSoon = (dateString) => {
        if (!dateString) return false;
        const due = new Date(dateString);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    };

    // Helper to format date as DD-MM-YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        // Check if it matches YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    };

    // Filtering Logic
    const filteredCattle = cattle.filter((cow) => {
        const matchesSearch =
            cow.tagId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cow.breed?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "All" || cow.type === filterType;
        // Fix filtering to check if the comma-separated string INCLUDES the selected status
        const matchesStatus = filterStatus === "All" || (cow.status && cow.status.includes(filterStatus));

        return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => {
        return a.tagId.localeCompare(b.tagId, undefined, { numeric: true, sensitivity: 'base' });
    });

    const handleOpenModal = (cow = null) => {
        if (cow) {
            setCurrentCow(cow);
            setFormData({ ...initialFormState, ...cow });
        } else {
            setCurrentCow(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Create a clean payload object
            const payload = { ...formData };

            // Remove 'id' if it exists, as it shouldn't be stored in the database record itself (it's the key)
            // also 'createdAt' shouldn't be updated manually if it exists from the spread
            delete payload.id;
            delete payload.createdAt;

            // Sanitize payload: remove undefined values, convert them to null or empty string
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    payload[key] = "";
                }
            });

            if (currentCow) {
                await updateCattle(currentCow.id, payload);
                addToast("Cattle record updated successfully", "success");
            } else {
                await addCattle(payload);
                addToast("New cattle added successfully", "success");
            }
            setIsModalOpen(false);
            // Optional: reset form or rely on Modal open/close to reset
        } catch (err) {
            console.error("Save error:", err);
            addToast(`Failed to save cattle record: ${err.message}`, "error");
        }
    };

    const handleDelete = async (id) => {
        if (await confirm("This action cannot be undone. Are you sure you want to delete this record?", "Confirm Deletion")) {
            try {
                await deleteCattle(id);
                addToast("Record deleted successfully", "delete");
            } catch (err) {
                console.error("Delete error:", err);
                addToast("Failed to delete record: " + err.message, "error");
            }
        }
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Livestock Management</h1>
                    <p className="text-gray-600">Track genealogy, health, and location</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="mt-4 md:mt-0 bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-600 transition"
                >
                    <Plus size={20} className="mr-2" />
                    Add Animal
                </button>
            </div>

            {/* Search and Filters */}
            <div className="sticky top-0 z-20 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 flex items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                    <Search className="text-gray-400 mr-2" size={20} />
                    <input
                        type="text"
                        placeholder="Search Tag ID, Name, Breed..."
                        className="flex-1 bg-transparent outline-none text-gray-700 py-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Type Filter */}
                <select
                    className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="All">All Types</option>
                    <option value="Heifer">Heifer</option>
                    <option value="Calf">Calf</option>
                    <option value="Cow">Cow</option>
                    <option value="Bull">Bull</option>
                    <option value="Buffalo">Buffalo</option>
                </select>
                {/* Status Filter */}
                <select
                    className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All">All Statuses</option>
                    {ALL_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {/* Cattle Table / List View */}
            {loading ? (
                <div className="text-center py-10">Loading herd data...</div>
            ) : error ? (
                <div className="text-center text-red-500 py-10">{error}</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">ID/Name</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Type/Breed</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Age/Gender</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Insemination Record</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Expected Delivery</th>

                                    <th className="p-4 font-semibold text-gray-600 text-sm">Metrics</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Vaccination</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Location</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCattle.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="p-8 text-center text-gray-500">
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCattle.map((cow) => (
                                        <tr key={cow.id} className="hover:bg-blue-50/30 transition even:bg-gray-50/50">
                                            {/* Identity */}
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-800 text-base">#{cow.tagId}</span>
                                                        {cow.motherId && (
                                                            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                                                                M: {cow.motherId}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500 mt-1">{cow.name || "Unnamed"}</span>
                                                </div>
                                            </td>

                                            {/* Classification */}
                                            <td className="p-4 align-top">
                                                <div className="font-medium text-gray-700 text-sm">{cow.type}</div>
                                                <div className="text-xs text-gray-500">{cow.breed}</div>
                                            </td>

                                            {/* Demographics */}
                                            <td className="p-4 align-top">
                                                <div className="text-sm text-gray-700">{calculateAge(cow.dob, cow.purchasedYear)}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{cow.gender}</div>
                                            </td>

                                            {/* Status */}
                                            <td className="p-4 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {(cow.status || "").split(', ').map((s, i) => (
                                                        <span key={i} className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${s === 'Milking' ? 'bg-green-100 text-green-700' :
                                                            s.includes('Pregnant') ? 'bg-purple-100 text-purple-700' :
                                                                s === 'Sick' ? 'bg-red-100 text-red-700' :
                                                                    s === 'Ready to Inseminate' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Insemination Record */}
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    {cow.inseminationDate ? (
                                                        <div className="text-sm text-gray-700">
                                                            {formatDate(cow.inseminationDate)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                    {cow.fatherSemenCompany && (
                                                        <div className="text-xs text-blue-600/80">
                                                            Semen: {cow.fatherSemenCompany}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Expected Delivery */}
                                            <td className="p-4 align-top">
                                                {(() => {
                                                    const deliveryDate = cow.expectedDeliveryDate || (cow.inseminationDate && cow.status && (cow.status.includes('Pregnant') || cow.status.includes('Pregnant 1st')) ? (() => {
                                                        const date = new Date(cow.inseminationDate);
                                                        date.setDate(date.getDate() + 275); // Updated to 275 days
                                                        return date.toISOString().split('T')[0];
                                                    })() : null);

                                                    return deliveryDate ? (
                                                        <div className={`text-sm font-medium flex items-center gap-1 ${isDueSoon(deliveryDate) ? 'text-red-600 bg-red-50 p-1 rounded animate-pulse' : 'text-purple-600'}`}>
                                                            {isDueSoon(deliveryDate) && <AlertCircle size={14} />}
                                                            {formatDate(deliveryDate)}
                                                            {!cow.expectedDeliveryDate && <span className="text-[10px] text-gray-400 ml-1">(Est)</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    );
                                                })()}
                                            </td>

                                            {/* Metrics */}
                                            <td className="p-4 align-top">
                                                <div className="text-xs text-gray-600 mb-1">
                                                    <span className="font-semibold">Turn:</span> {cow.turnOfPregnancy || '-'}
                                                </div>
                                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                                    <Activity size={12} className="text-orange-400" />
                                                    BMS: <span className="font-semibold">{cow.bms || '-'}</span>
                                                </div>
                                            </td>

                                            {/* Health */}
                                            <td className="p-4 align-top">
                                                <div className="text-xs text-gray-700 font-medium flex items-center gap-1 mb-0.5">
                                                    <Syringe size={12} className="text-teal-500" /> {cow.vaccinationType || '-'}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {formatDate(cow.vaccinationDate) || 'No Record'}
                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="p-4 align-top">
                                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                                    <MapPin size={14} className="text-gray-400" />
                                                    {cow.location}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(cow)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(cow.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition">
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

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-4 p-4 pb-20">
                        {filteredCattle.map((cow) => (
                            <div key={cow.id} className="bg-white px-5 py-4 rounded-xl shadow-md border border-gray-100 flex flex-col relative">

                                {/* Header Section */}
                                <div className="mb-4 flex justify-between items-start">
                                    <div className="flex flex-col">
                                        {/* ID & Mother Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold text-gray-800">#{cow.tagId}</span>
                                            {cow.motherId && (
                                                <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">
                                                    M: {cow.motherId}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium mt-1">{cow.name || "Unnamed"}</span>
                                    </div>

                                    {/* Status Badges - Top Right */}
                                    <div className="flex flex-col items-end gap-1">
                                        {(cow.status || "").split(', ').slice(0, 3).map((s, i) => (
                                            <span key={i} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${s === 'Milking' ? 'bg-green-100 text-green-700' :
                                                s.includes('Pregnant') ? 'bg-purple-100 text-purple-700' :
                                                    s === 'Sick' ? 'bg-red-100 text-red-700' :
                                                        s === 'Ready to Inseminate' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {s}
                                            </span>
                                        ))}
                                        {(cow.status || "").split(', ').length > 3 && <span className="text-[10px] text-gray-400">+{((cow.status || "").split(', ').length - 3)} more</span>}
                                    </div>
                                </div>

                                {/* Data Blocks Grid */}
                                <div className="flex flex-col gap-4 mb-14"> {/* Increased bottom margin for actions */}

                                    {/* IDENTITY Block */}
                                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">IDENTITY</span>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                            <div>
                                                <span className="text-[10px] text-gray-400 block uppercase font-medium">Type</span>
                                                <span className="text-sm font-bold text-gray-800">{cow.type}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 block uppercase font-medium">Breed</span>
                                                <span className="text-sm font-bold text-gray-800">{cow.breed}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 block uppercase font-medium">Age</span>
                                                <span className="text-sm font-bold text-gray-800">{calculateAge(cow.dob, cow.purchasedYear)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 block uppercase font-medium">Gender</span>
                                                <span className="text-sm font-bold text-gray-800">{cow.gender}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insemination Block - Light Purple */}
                                    <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-100">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">INSEMINATION</span>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium text-gray-800">
                                                {cow.inseminationDate ? (
                                                    <span>{formatDate(cow.inseminationDate)} <span className="text-gray-500 font-normal">({cow.fatherSemenCompany || 'Unknown'})</span></span>
                                                ) : <span className="text-gray-400 italic">No record</span>}
                                            </div>
                                            {/* Expected Delivery Highlight */}
                                            {(cow.expectedDeliveryDate || (cow.inseminationDate && cow.status && (cow.status.includes('Pregnant') || cow.status.includes('Pregnant 1st')))) && (
                                                <div className={`text-sm font-bold mt-1 ${isDueSoon(cow.expectedDeliveryDate) ? "text-red-600" : "text-purple-700"}`}>
                                                    Expected: {cow.expectedDeliveryDate ? formatDate(cow.expectedDeliveryDate) : formatDate(new Date(new Date(cow.inseminationDate).setDate(new Date(cow.inseminationDate).getDate() + 275)).toISOString().split('T')[0])}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metrics & Health - 2 Column Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Metrics Block */}
                                        <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">METRICS</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-gray-400 block uppercase font-medium">Turn</span>
                                                    <span className="text-sm font-bold text-gray-800">{cow.turnOfPregnancy || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-gray-400 block uppercase font-medium">BMS</span>
                                                    <span className="text-sm font-bold text-gray-800">{cow.bms || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Health Block */}
                                        <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">VACCINATION</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800 truncate">{cow.vaccinationType || '-'}</span>
                                                <span className="text-xs text-gray-500">{formatDate(cow.vaccinationDate)}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Footer: Location & Actions */}
                                <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                                    {/* Location */}
                                    <div className="flex items-center gap-1.5 text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-100 shadow-sm">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="text-xs font-semibold">{cow.location}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2.5">
                                        <button onClick={() => handleOpenModal(cow)} className="p-2.5 text-blue-600 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all shadow-sm">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(cow.id)} className="p-2.5 text-red-600 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 active:scale-95 transition-all shadow-sm">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentCow ? "Edit Record" : "New Animal Registration"}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <form onSubmit={handleSubmit}>
                                {/* Basic Info */}
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Identification</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tag ID *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg" value={formData.tagId} onChange={(e) => setFormData({ ...formData, tagId: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input type="text" className="w-full p-2 border rounded-lg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                        <select className="w-full p-2 border rounded-lg" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="Heifer">Heifer</option>
                                            <option value="Calf">Calf</option>
                                            <option value="Cow">Cow</option>
                                            <option value="Bull">Bull</option>
                                            <option value="Buffalo">Buffalo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Breed *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg" value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select className="w-full p-2 border rounded-lg" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="Female">Female</option>
                                            <option value="Male">Male</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded-lg"
                                                value={formData.dob}
                                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            />
                                            {formData.dob && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, dob: "" })}
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                                    title="Clear Date"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchased Year</label>
                                        <input type="number" placeholder="e.g. 2023" className="w-full p-2 border rounded-lg" value={formData.purchasedYear} onChange={(e) => setFormData({ ...formData, purchasedYear: e.target.value })} />
                                    </div>
                                </div>

                                {/* Status & Reproductive */}
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Status & Reproduction</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Status (Select Multiple) *</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                                className="w-full min-h-[42px] p-2 border rounded-lg text-left flex justify-between items-center bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                <div className="flex flex-wrap gap-1">
                                                    {!formData.status ? (
                                                        <span className="text-gray-400">Select Statuses...</span>
                                                    ) : (
                                                        formData.status.split(', ').map((status, index) => (
                                                            <span
                                                                key={index}
                                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                                            >
                                                                {status}
                                                                <span className="ml-1 cursor-pointer hover:text-blue-900" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleStatus(status);
                                                                }}>×</span>
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isStatusDropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsStatusDropdownOpen(false)}
                                                    ></div>
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                        {ALL_STATUSES.map(status => {
                                                            const isSelected = (formData.status || "").split(', ').includes(status);
                                                            return (
                                                                <div
                                                                    key={status}
                                                                    onClick={() => toggleStatus(status)}
                                                                    className={`px-4 py-2.5 flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                                                >
                                                                    <div className={`w-5 h-5 mr-3 border rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
                                                                    </div>
                                                                    <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-gray-700'}`}>{status}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Turn of Pregnancy</label>
                                        <input type="number" className="w-full p-2 border rounded-lg" value={formData.turnOfPregnancy} onChange={(e) => setFormData({ ...formData, turnOfPregnancy: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Insemination Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded-lg"
                                                value={formData.inseminationDate}
                                                onChange={(e) => handleInseminationChange(e.target.value)}
                                            />
                                            {formData.inseminationDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleInseminationChange("")}
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                                    title="Clear Date"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Father Semen Company</label>
                                        <input type="text" className="w-full p-2 border rounded-lg" value={formData.fatherSemenCompany} onChange={(e) => setFormData({ ...formData, fatherSemenCompany: e.target.value })} />
                                    </div>
                                    {/* Conditionally Show Expected Delivery Date */}
                                    {(formData.status || "").split(', ').some(s => s === "Pregnant" || s === "Pregnant 1st") && (
                                        <div className="md:col-span-2 animate-fadeIn">
                                            <label className="block text-sm font-medium text-purple-700 mb-1">Expected Delivery (Auto 275d)</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    className="w-full p-2 border border-purple-200 bg-purple-50 rounded-lg text-purple-900 font-medium"
                                                    value={formData.expectedDeliveryDate}
                                                    readOnly
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-400 font-medium">Auto-Calculated</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Health & Location */}
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Health & Location</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Body Mass Score (20-100)</label>
                                        <input type="number" min="20" max="100" className="w-full p-2 border rounded-lg" value={formData.bms} onChange={(e) => setFormData({ ...formData, bms: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vaccination Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded-lg"
                                                value={formData.vaccinationDate}
                                                onChange={(e) => setFormData({ ...formData, vaccinationDate: e.target.value })}
                                            />
                                            {formData.vaccinationDate && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, vaccinationDate: "" })}
                                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                                    title="Clear Date"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vaccination Type</label>
                                        <input type="text" className="w-full p-2 border rounded-lg" value={formData.vaccinationType} onChange={(e) => setFormData({ ...formData, vaccinationType: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                                        <select className="w-full p-2 border rounded-lg" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}>
                                            <option value="South 1">South 1</option>
                                            <option value="South 2">South 2</option>
                                            <option value="South 3">South 3</option>
                                            <option value="North 1">North 1</option>
                                            <option value="North 2">North 2</option>
                                            <option value="North 3">North 3</option>
                                            <option value="Calf East">Calf East</option>
                                            <option value="Calf West">Calf West</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mother ID (Optional)</label>
                                        <input type="text" className="w-full p-2 border rounded-lg" value={formData.motherId} onChange={(e) => setFormData({ ...formData, motherId: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-green-600 font-medium"
                                    >
                                        {currentCow ? "Update Record" : "Save Record"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
