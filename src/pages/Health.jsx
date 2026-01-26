import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useHealth } from "../hooks/useHealth";
import { useCattle } from "../hooks/useCattle";
import { useHR } from "../hooks/useHR";
import { Activity, Syringe, HeartPulse, Stethoscope, Plus, X, Search, Calendar, Edit, Trash2, Filter, Check, ChevronDown } from "lucide-react";

// Helper Component for Multi-Select
const MultiSelect = ({ options, selectedValues, onChange, label, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAllSelected = options.length > 0 && selectedValues.length === options.length;

    const toggleOption = (value) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const toggleAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange(options.map(o => o.value));
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div
                className="w-full p-2 border rounded-lg flex justify-between items-center cursor-pointer bg-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1 overflow-hidden h-6">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-400">{placeholder}</span>
                    ) : selectedValues.length === options.length ? (
                        <span className="font-semibold text-green-700">All Animals Selected ({options.length})</span>
                    ) : (
                        <span className="text-gray-800">{selectedValues.length} Animal(s) Selected</span>
                    )}
                </div>
                <ChevronDown size={16} className="text-gray-500" />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full p-1 border rounded text-sm outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div
                        className="p-2 hover:bg-green-50 cursor-pointer border-b flex items-center font-semibold text-green-700"
                        onClick={toggleAll}
                    >
                        <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${isAllSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                            {isAllSelected && <Check size={12} className="text-white" />}
                        </div>
                        All Animals
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="p-2 text-gray-500 text-sm">No animals found.</div>
                    ) : (
                        filteredOptions.map(opt => {
                            const isSelected = selectedValues.includes(opt.value);
                            return (
                                <div
                                    key={opt.value}
                                    className={`p-2 hover:bg-gray-50 cursor-pointer flex items-center ${isSelected ? 'bg-blue-50' : ''}`}
                                    onClick={() => toggleOption(opt.value)}
                                >
                                    <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className="text-sm">{opt.label}</span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default function Health() {
    const { records, loading, addHealthRecord, deleteHealthRecord, updateHealthRecord } = useHealth();
    const { cattle } = useCattle();
    const { doctors } = useHR();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Filter State
    const [filters, setFilters] = useState({
        search: "",
        type: "All",
        startDate: "",
        endDate: ""
    });

    // Form Type Toggle: 'Vaccination' | 'Insemination' | 'Treatment' (General)
    const [activeFormType, setActiveFormType] = useState("Vaccination");

    const initialFormState = {
        cowIds: [], // For bulk selection
        date: new Date().toISOString().split("T")[0],
        doctorName: "",
        medicineCost: "",
        doctorFee: "",
        // Vaccination Fields
        vaccineName: "FMD",
        nextDueDate: "",
        // Insemination Fields
        semenName: "",
        semenCompany: "",
        semenColor: "",
        expectedDeliveryDate: "",
        // Treatment/Other Fields
        diagnosis: "",
        treatment: "",
        symptoms: ""
    };

    const [formData, setFormData] = useState(initialFormState);

    // Predefined lists
    const vaccineOptions = ["FMD", "Toxipra", "Will", "Brucella", "Theleria", "Lumpy"];

    // Auto-calculate Delivery Date (270 days)
    useEffect(() => {
        if (activeFormType === "Insemination" && formData.date) {
            const d = new Date(formData.date);
            d.setDate(d.getDate() + 270);
            setFormData(prev => ({ ...prev, expectedDeliveryDate: d.toISOString().split("T")[0] }));
        }
    }, [formData.date, activeFormType]);

    // --- Filter Logic ---
    const filteredRecords = records.filter(record => {
        const searchLower = filters.search.toLowerCase().trim();

        // 1. Standard Match
        // Does the record itself contain the search term? (Tag, Vaccine, Doctor, etc.)
        const searchContent = `${record.cowTag} ${record.vaccineName} ${record.doctorName} ${record.semenName}`.toLowerCase();
        const matchesStandard = searchContent.includes(searchLower);

        // 2. Contextual "All Animals" Match 
        // If the user searches for a specific TAG (e.g. "108"), we want to show "All Animals" records too.
        // Logic: If record is "ALL" AND the search term partially matches ANY cattle tag, show it.
        // This implicitly assumes that if the user is typing a tag, they want to see herd-wide events.
        const isGlobalRecord = record.cowId === "ALL";
        // Check if the current search term looks like it could be a tag in our system
        const searchTermIsTag = searchLower.length > 0 && cattle.some(c => c.tagId.toLowerCase().includes(searchLower));

        const matchesGlobalContext = isGlobalRecord && searchTermIsTag;

        const matchesSearch = matchesStandard || matchesGlobalContext;

        // Type Filter
        const matchesType = filters.type === 'All' || record.recordType === filters.type;

        // Date Range Filter
        let matchesDate = true;
        if (filters.startDate) matchesDate = matchesDate && new Date(record.date) >= new Date(filters.startDate);
        if (filters.endDate) matchesDate = matchesDate && new Date(record.date) <= new Date(filters.endDate);

        return matchesSearch && matchesType && matchesDate;
    }).sort((a, b) => {
        // Sort Logic: Prioritize Ex act Tag matches over "All Animals"
        const searchLower = filters.search.toLowerCase().trim();
        if (!searchLower) return 0; // No custom sort if no search

        const aIsExact = a.cowTag.toLowerCase().includes(searchLower) && a.cowId !== "ALL";
        const bIsExact = b.cowTag.toLowerCase().includes(searchLower) && b.cowId !== "ALL";

        if (aIsExact && !bIsExact) return -1; // a comes first
        if (!aIsExact && bIsExact) return 1;  // b comes first
        return 0;
    });



    const handleEdit = (record) => {
        setEditingId(record.id);
        setActiveFormType(record.recordType);

        setFormData({
            date: record.date,
            doctorName: record.doctorName || "",
            medicineCost: record.medicineCost || "",
            doctorFee: record.doctorFee || "",
            cowIds: [record.cowId], // Edit mode only supports single record editing
            // Type specific
            vaccineName: record.vaccineName || "FMD",
            nextDueDate: record.nextDueDate || "",
            semenName: record.semenName || "",
            semenCompany: record.semenCompany || "",
            semenColor: record.semenColor || "",
            expectedDeliveryDate: record.expectedDeliveryDate || "",
            diagnosis: record.diagnosis || "",
            treatment: record.treatment || "",
            symptoms: record.symptoms || ""
        });

        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const targets = formData.cowIds;

            if (targets.length === 0) {
                alert("Please select at least one animal");
                return;
            }

            if (editingId) {
                // UPDATE MODE
                const payload = {
                    date: formData.date,
                    recordType: activeFormType,
                    cowId: targets[0], // Single ID in edit mode
                    cowTag: cattle.find(c => c.id === targets[0])?.tagId || "Unknown",
                    cowTag: cattle.find(c => c.id === targets[0])?.tagId || "Unknown",
                    doctorName: formData.doctorName,
                    medicineCost: formData.medicineCost ? parseFloat(formData.medicineCost) : 0,
                    doctorFee: formData.doctorFee ? parseFloat(formData.doctorFee) : 0,
                    // Fields based on type
                    ...(activeFormType === 'Vaccination' ? {
                        vaccineName: formData.vaccineName,
                        nextDueDate: formData.nextDueDate
                    } : activeFormType === 'Insemination' ? {
                        semenName: formData.semenName,
                        semenCompany: formData.semenCompany,
                        semenColor: formData.semenColor,
                        expectedDeliveryDate: formData.expectedDeliveryDate
                    } : {
                        diagnosis: formData.diagnosis,
                        treatment: formData.treatment,
                        symptoms: formData.symptoms
                    })
                };
                await updateHealthRecord(editingId, payload);
            } else {
                // CREATE MODE

                // Check if "All Animals" are selected
                const isAllAnimals = targets.length === cattle.length && cattle.length > 0;

                if (isAllAnimals) {
                    // Create SINGLE Master Record
                    const payload = {
                        date: formData.date,
                        recordType: activeFormType,
                        cowId: "ALL",
                        cowTag: "All Animals",
                        doctorName: formData.doctorName,
                        medicineCost: (formData.medicineCost ? parseFloat(formData.medicineCost) : 0) * cattle.length,
                        doctorFee: (formData.doctorFee ? parseFloat(formData.doctorFee) : 0) * cattle.length,
                        // Fields based on type
                        ...(activeFormType === 'Vaccination' ? {
                            vaccineName: formData.vaccineName,
                            nextDueDate: formData.nextDueDate
                        } : activeFormType === 'Insemination' ? {
                            semenName: formData.semenName,
                            semenCompany: formData.semenCompany,
                            semenColor: formData.semenColor,
                            expectedDeliveryDate: formData.expectedDeliveryDate
                        } : {
                            diagnosis: formData.diagnosis,
                            treatment: formData.treatment,
                            symptoms: formData.symptoms
                        })
                    };
                    await addHealthRecord(payload);
                } else {
                    // Create Individual Records
                    const promises = targets.map(id => {
                        const cow = cattle.find(c => c.id === id);
                        const payload = {
                            date: formData.date,
                            recordType: activeFormType,
                            cowId: id,
                            cowTag: cow ? cow.tagId : "Unknown",
                            doctorName: formData.doctorName,
                            medicineCost: formData.medicineCost ? parseFloat(formData.medicineCost) : 0,
                            doctorFee: formData.doctorFee ? parseFloat(formData.doctorFee) : 0,
                            // Fields based on type
                            ...(activeFormType === 'Vaccination' ? {
                                vaccineName: formData.vaccineName,
                                nextDueDate: formData.nextDueDate
                            } : activeFormType === 'Insemination' ? {
                                semenName: formData.semenName,
                                semenCompany: formData.semenCompany,
                                semenColor: formData.semenColor,
                                expectedDeliveryDate: formData.expectedDeliveryDate
                            } : {
                                diagnosis: formData.diagnosis,
                                treatment: formData.treatment,
                                symptoms: formData.symptoms
                            })
                        };
                        return addHealthRecord(payload);
                    });
                    await Promise.all(promises);
                }
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData(initialFormState);
        } catch (err) {
            console.error(err);
            alert("Failed to save record");
        }
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Medical & Health</h1>
                    <p className="text-gray-600">Veterinary care, treatments, and vaccinations</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData(initialFormState);
                        setIsModalOpen(true);
                    }}
                    className="mt-4 md:mt-0 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-600 transition"
                >
                    <Plus size={20} className="mr-2" />
                    Record Medical Event
                </button>
            </div>

            {/* --- Filter Bar --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 w-full md:w-auto relative">
                        <input
                            type="text"
                            placeholder="Search Animal, Doctor, Vaccine..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-primary outline-none"
                            value={filters.search}
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            className="p-2 border rounded-lg outline-none cursor-pointer"
                            value={filters.type}
                            onChange={e => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="All">All Types</option>
                            <option value="Vaccination">Vaccination</option>
                            <option value="Insemination">Insemination</option>
                            <option value="Checkup">Checkup</option>
                        </select>
                        <input
                            type="date"
                            className="p-2 border rounded-lg outline-none"
                            value={filters.startDate}
                            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        />
                        <span className="self-center text-gray-400">-</span>
                        <input
                            type="date"
                            className="p-2 border rounded-lg outline-none"
                            value={filters.endDate}
                            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        />
                        {/* Clear Filters */}
                        {(filters.search || filters.type !== 'All' || filters.startDate || filters.endDate) && (
                            <button
                                onClick={() => setFilters({ search: "", type: "All", startDate: "", endDate: "" })}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Clear Filters"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- History Table --- */}
            {/* --- History Table --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <HeartPulse className="mr-2 text-red-500" /> Medical History
                    </h3>
                    <span className="text-sm text-gray-500">{filteredRecords.length} records found</span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading records...</div>
                ) : (<>
                    {/* Desktop Table */}
                    < div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="p-4 font-semibold">Animal ID</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Type</th>
                                    <th className="p-4 font-semibold">Details</th>
                                    <th className="p-4 font-semibold">Doctor</th>
                                    <th className="p-4 font-semibold">Med Cost</th>
                                    <th className="p-4 font-semibold">Dr. Fee</th>
                                    <th className="p-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.length === 0 ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500">No matching records found.</td></tr>
                                ) : (
                                    filteredRecords.map((record, index) => {
                                        // Find Animal for Mother Tag
                                        const animal = cattle.find(c => c.tagId === record.cowTag);

                                        return (
                                            <tr key={record.id} className={`hover:bg-gray-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                <td className="p-4">
                                                    {record.cowId === "ALL" ? (
                                                        <div className="font-bold text-blue-700 text-lg flex items-center">
                                                            <Activity size={18} className="mr-1" /> All Animals
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="font-bold text-gray-800 text-lg">{record.cowTag}</div>
                                                            {animal && animal.motherId && (
                                                                <div className="text-xs font-semibold" style={{ color: '#ec4899' }}>
                                                                    M: {animal.motherId}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-600 font-medium">
                                                    {record.date.split("-").reverse().join("-")}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${record.recordType === 'Vaccination' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        record.recordType === 'Insemination' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                            'bg-blue-100 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {record.recordType}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {record.recordType === 'Vaccination' && (
                                                        <div>
                                                            <div className="font-bold text-green-800">{record.vaccineName}</div>
                                                            {record.nextDueDate && (
                                                                <div className="text-xs text-orange-600 flex items-center mt-1">
                                                                    <Calendar size={12} className="mr-1" /> Due: {record.nextDueDate.split("-").reverse().join("-")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {record.recordType === 'Insemination' && (
                                                        <div>
                                                            <div className="font-semibold text-purple-800">{record.semenName} <span className="text-gray-400 text-xs font-normal">({record.semenCompany})</span></div>
                                                            {record.expectedDeliveryDate && (
                                                                <div className="text-xs font-bold text-orange-600 mt-1 flex items-center bg-orange-50 w-fit px-2 py-0.5 rounded">
                                                                    <Activity size={12} className="mr-1" /> Exp: {record.expectedDeliveryDate.split("-").reverse().join("-")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {record.recordType === 'Checkup' && (
                                                        <div>
                                                            <div className="font-medium text-gray-800">{record.diagnosis}</div>
                                                            <div className="text-xs text-gray-500">{record.treatment}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {record.doctorName ? (
                                                        <div className="flex items-center">
                                                            <Stethoscope size={14} className="mr-1 text-gray-400" /> {record.doctorName}
                                                        </div>
                                                    ) : <span className="text-gray-400 italic">Self</span>}
                                                </td>
                                                <td className="p-4 font-mono font-medium text-gray-700">
                                                    {(parseFloat(record.medicineCost) || 0) > 0 ? `Rs ${parseInt(record.medicineCost).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="p-4 font-mono font-medium text-gray-700">
                                                    {(parseFloat(record.doctorFee) || 0) > 0 ? `Rs ${parseInt(record.doctorFee).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(record)}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm("Are you sure you want to delete this record?")) {
                                                                    try {
                                                                        await deleteHealthRecord(record.id);
                                                                    } catch (err) {
                                                                        alert("Failed to delete record");
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                        {filteredRecords.map((record) => {
                            const animal = cattle.find(c => c.tagId === record.cowTag);
                            return (
                                <div key={record.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${record.recordType === 'Vaccination' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    record.recordType === 'Insemination' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        'bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {record.recordType}
                                                </span>
                                                <span className="text-xs text-gray-500">{record.date.split("-").reverse().join("-")}</span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="font-bold text-gray-800 text-lg">
                                                    {record.cowId === "ALL" ? "All Animals" : `#${record.cowTag}`}
                                                </span>
                                                {animal && animal.motherId && (
                                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1 py-0.5 rounded">M: {animal.motherId}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(record)} className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => {
                                                if (window.confirm("Delete record?")) deleteHealthRecord(record.id);
                                            }} className="p-2 bg-red-50 text-red-600 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="py-2 border-t border-b border-gray-50 my-2 space-y-2">
                                        {record.recordType === 'Vaccination' && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Vaccine</span>
                                                <span className="text-sm font-medium text-green-700">{record.vaccineName}</span>
                                            </div>
                                        )}
                                        {record.recordType === 'Insemination' && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Semen</span>
                                                <span className="text-sm font-medium text-purple-700">{record.semenName}</span>
                                            </div>
                                        )}
                                        {record.doctorName && (
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Doctor</span>
                                                <span className="text-sm font-medium text-gray-800">{record.doctorName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">Total Cost</span>
                                            <span className="font-bold text-gray-800">
                                                Rs {((parseFloat(record.medicineCost) || 0) + (parseFloat(record.doctorFee) || 0)).toLocaleString()}
                                            </span>
                                        </div>
                                        {record.nextDueDate && (
                                            <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-semibold flex items-center">
                                                <Calendar size={12} className="mr-1" /> Due: {record.nextDueDate}
                                            </div>
                                        )}
                                        {record.expectedDeliveryDate && (
                                            <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-semibold flex items-center">
                                                <Activity size={12} className="mr-1" /> Exp: {record.expectedDeliveryDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>)}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Event' : 'Record Event'}</h2>
                                    <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
                                </div>

                                {/* Toggle - Hide in Edit Mode */}
                                {!editingId && (
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {['Vaccination', 'Insemination', 'Checkup'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => { setActiveFormType(type); setFormData(initialFormState); }}
                                                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${activeFormType === type ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                        <input type="date" required className="w-full p-2 border rounded-lg" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Attending Doctor</label>
                                        <select className="w-full p-2 border rounded-lg" value={formData.doctorName} onChange={e => setFormData({ ...formData, doctorName: e.target.value })}>
                                            <option value="">Select Doctor (or Self)</option>
                                            {doctors.map(d => <option key={d.id} value={d.name}>{d.name} ({d.specialization})</option>)}
                                            <option value="Self">Self / Farm Staff</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Animal Selection - Conditional logic for Bulk */}
                                {activeFormType === 'Vaccination' && !editingId ? (
                                    <div>
                                        <MultiSelect
                                            label="Affected Animals *"
                                            placeholder="Select Animals..."
                                            options={cattle.map(c => ({ value: c.id, label: `${c.tagId} - ${c.status}` }))}
                                            selectedValues={formData.cowIds}
                                            onChange={(newValues) => setFormData({ ...formData, cowIds: newValues })}
                                        />
                                        {formData.cowIds.length > 0 && (
                                            <div className="mt-2 text-right text-sm font-semibold text-gray-700">
                                                Total Estimated Cost: <span className="text-green-600">Rs {(formData.cowIds.length * ((parseFloat(formData.medicineCost) || 0) + (parseFloat(formData.doctorFee) || 0))).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal *</label>
                                        <select
                                            required
                                            disabled={!!editingId} // Disable animal change while editing to simplify logic
                                            className={`w-full p-2 border rounded-lg ${editingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            value={formData.cowIds[0] || ""}
                                            onChange={e => setFormData({ ...formData, cowIds: [e.target.value] })}
                                        >
                                            <option value="">Select Cow...</option>
                                            {cattle.map(c => <option key={c.id} value={c.id}>{c.tagId} - {c.status}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* --- Type Specific Fields --- */}

                                {/* VACCINATION */}
                                {activeFormType === 'Vaccination' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine Name *</label>
                                            <select required className="w-full p-2 border rounded-lg" value={formData.vaccineName} onChange={e => setFormData({ ...formData, vaccineName: e.target.value })}>
                                                {vaccineOptions.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Cost</label>
                                                <input type="number" placeholder="0.00" className="w-full p-2 border rounded-lg" value={formData.medicineCost} onChange={e => setFormData({ ...formData, medicineCost: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Dr. Fee</label>
                                                <input type="number" placeholder="0.00" className="w-full p-2 border rounded-lg" value={formData.doctorFee} onChange={e => setFormData({ ...formData, doctorFee: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Total (Auto)</label>
                                                <div className="p-2 bg-gray-100 rounded text-gray-700 font-mono">
                                                    Rs {((parseFloat(formData.medicineCost) || 0) + (parseFloat(formData.doctorFee) || 0)).toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                                                <input type="date" className="w-full p-2 border rounded-lg" value={formData.nextDueDate} onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* INSEMINATION */}
                                {activeFormType === 'Insemination' && (
                                    <>
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                            <h4 className="font-semibold text-purple-800 mb-3">Semen Details</h4>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" placeholder="Semen Name" required className="p-2 border rounded" value={formData.semenName} onChange={e => setFormData({ ...formData, semenName: e.target.value })} />
                                                    <input type="text" placeholder="Company" required className="p-2 border rounded" value={formData.semenCompany} onChange={e => setFormData({ ...formData, semenCompany: e.target.value })} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" placeholder="Color" className="p-2 border rounded" value={formData.semenColor} onChange={e => setFormData({ ...formData, semenColor: e.target.value })} />
                                                    <input type="number" placeholder="Med Cost" className="p-2 border rounded" value={formData.medicineCost} onChange={e => setFormData({ ...formData, medicineCost: e.target.value })} />
                                                    <input type="number" placeholder="Dr Fee" className="p-2 border rounded" value={formData.doctorFee} onChange={e => setFormData({ ...formData, doctorFee: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex items-center justify-between">
                                            <span className="text-orange-700 font-medium">Expected Delivery:</span>
                                            <span className="text-xl font-bold text-orange-800">{formData.expectedDeliveryDate || '---'}</span>
                                        </div>
                                    </>
                                )}

                                {/* CHECKUP / GENERAL */}
                                {activeFormType === 'Checkup' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Illness</label>
                                            <input type="text" className="w-full p-2 border rounded-lg" value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment / Medication</label>
                                            <textarea rows="2" className="w-full p-2 border rounded-lg" value={formData.treatment} onChange={e => setFormData({ ...formData, treatment: e.target.value })}></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Cost</label>
                                                <input type="number" placeholder="0.00" className="w-full p-2 border rounded-lg" value={formData.medicineCost} onChange={e => setFormData({ ...formData, medicineCost: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Dr. Fee</label>
                                                <input type="number" placeholder="0.00" className="w-full p-2 border rounded-lg" value={formData.doctorFee} onChange={e => setFormData({ ...formData, doctorFee: e.target.value })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Save Record</button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }
        </Layout >
    );
}
