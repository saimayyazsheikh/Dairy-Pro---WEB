import React, { useState } from "react";
import Layout from "../components/Layout";
import { useHR } from "../hooks/useHR";
import { useToast } from "../contexts/ToastContext";
import { useConfirmation } from "../contexts/ConfirmationContext";
import { Users, UserPlus, Stethoscope, Phone, Briefcase, Trash2, Edit2, X, CheckCircle, Clock } from "lucide-react";

export default function HR() {
    const { employees, doctors, loading, payrollStatus, doctorStats, addEmployee, updateEmployee, deleteEmployee, addDoctor, updateDoctor, deleteDoctor, runMonthlyPayroll } = useHR();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();

    const [activeTab, setActiveTab] = useState("employees"); // employees | doctors
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Run Payroll Check on Load
    React.useEffect(() => {
        const runPayroll = async () => {
            const count = await runMonthlyPayroll();
            if (count > 0) {
                addToast(`Payroll Run: Paid ${count} employees.`, "success");
            }
        };
        // Small delay to ensure data loaded
        if (!loading) runPayroll();
    }, [loading]);

    // Initial States
    const initialEmpState = { name: "", role: "", contact: "", salary: "", dateJoined: "" };
    const initialDocState = { name: "", specialization: "", contact: "", hospital: "", visitSchedule: "" };

    const [empForm, setEmpForm] = useState(initialEmpState);
    const [docForm, setDocForm] = useState(initialDocState);

    // --- Handlers ---
    const handleOpenModal = (item = null) => {
        setEditingId(item ? item.id : null);
        if (activeTab === "employees") {
            setEmpForm(item ? { ...item } : initialEmpState);
        } else {
            setDocForm(item ? { ...item } : initialDocState);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === "employees") {
                if (editingId) {
                    await updateEmployee(editingId, empForm);
                    addToast("Employee updated successfully", "success");
                } else {
                    const salaryLogged = await addEmployee(empForm);
                    if (salaryLogged) {
                        addToast("Employee Added & Initial Salary Logged to Expenses", "success");
                    } else {
                        addToast("Employee Added Successfully", "success");
                    }
                }
            } else {
                if (editingId) await updateDoctor(editingId, docForm);
                else await addDoctor(docForm);
                addToast("Doctor saved successfully", "success");
            }
            setIsModalOpen(false);
        } catch (err) {
            addToast("Action failed: " + err.message, "error");
        }
    };

    const handleDelete = async (id) => {
        if (await confirm("Are you sure?")) {
            if (activeTab === "employees") await deleteEmployee(id);
            else await deleteDoctor(id);
            addToast("Record deleted", "delete");
        }
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Human Resources</h1>
                    <p className="text-gray-600">Manage Farm Staff & Veterinary Partners</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="mt-4 md:mt-0 bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-600 transition"
                >
                    <UserPlus size={20} className="mr-2" />
                    Add {activeTab === "employees" ? "Employee" : "Doctor"}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    className={`pb-2 px-4 font-medium transition ${activeTab === "employees" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setActiveTab("employees")}
                >
                    <div className="flex items-center"><Users className="mr-2" size={18} /> Staff / Employees</div>
                </button>
                <button
                    className={`pb-2 px-4 font-medium transition ${activeTab === "doctors" ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setActiveTab("doctors")}
                >
                    <div className="flex items-center"><Stethoscope className="mr-2" size={18} /> Doctors / Vets</div>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <p className="text-center py-8 text-gray-500">Loading HR data...</p>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                {activeTab === "employees" ? (
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">Name</th>
                                        <th className="p-4 font-semibold text-gray-600">Role</th>
                                        <th className="p-4 font-semibold text-gray-600">Contact</th>
                                        <th className="p-4 font-semibold text-gray-600">Salary</th>
                                        <th className="p-4 font-semibold text-gray-600">Payroll Status</th>
                                        <th className="p-4 font-semibold text-gray-600">Joined</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">Name</th>
                                        <th className="p-4 font-semibold text-gray-600">Specialization</th>
                                        <th className="p-4 font-semibold text-gray-600">Contact</th>
                                        <th className="p-4 font-semibold text-gray-600">Total Paid</th>
                                        <th className="p-4 font-semibold text-gray-600">Clinic/Hospital</th>
                                        <th className="p-4 font-semibold text-gray-600">Schedule</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {(activeTab === "employees" ? employees : doctors).map(item => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-800">{item.name}</td>
                                        <td className="p-4 text-gray-600 text-sm">
                                            {activeTab === "employees" ? (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{item.role}</span>
                                            ) : (
                                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">{item.specialization}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-600 text-sm flex items-center">
                                            {item.contact && <Phone size={14} className="mr-1 text-gray-400" />} {item.contact}
                                        </td>
                                        {activeTab === "employees" ? (
                                            <>
                                                <td className="p-4 text-gray-700">
                                                    {item.salary ? `Rs ${parseInt(item.salary).toLocaleString()}` : '-'}
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {payrollStatus[item.id] ? (
                                                        <span className="flex items-center text-green-600 font-medium">
                                                            <CheckCircle size={14} className="mr-1" />
                                                            Paid
                                                            {payrollStatus[item.id].date && <span className="text-xs text-green-500 ml-1">({new Date(payrollStatus[item.id].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-orange-500 font-medium"><Clock size={14} className="mr-1" /> Pending</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">{item.dateJoined}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-bold text-gray-700">
                                                    Rs {(doctorStats[item.name]?.amount || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-gray-700">{item.hospital}</td>
                                                <td className="p-4 text-gray-500 text-sm">{item.visitSchedule}</td>
                                            </>
                                        )}
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleOpenModal(item)} className="text-blue-500 hover:text-blue-700 mx-2"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 mx-2"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {(activeTab === "employees" ? employees : doctors).length === 0 && (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500">No records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Views */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {(activeTab === "employees" ? employees : doctors).length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                                <p className="text-gray-500">No records found.</p>
                            </div>
                        ) : (
                            (activeTab === "employees" ? employees : doctors).map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                                    {activeTab === "employees" ? (
                                        // Mobile Staff Card
                                        <>
                                            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                                                    <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                                        {item.role || "Staff"}
                                                    </span>
                                                </div>
                                                {payrollStatus[item.id] ? (
                                                    <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 text-xs font-bold uppercase">
                                                        <CheckCircle size={12} className="mr-1" /> Paid
                                                        {payrollStatus[item.id].date && <span className="ml-1 text-[10px] opacity-75">{new Date(payrollStatus[item.id].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 text-xs font-bold uppercase">
                                                        <Clock size={12} className="mr-1" /> Pending
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">CONTACT</span>
                                                    {item.contact ? (
                                                        <a href={`tel:${item.contact}`} className="text-blue-600 font-medium text-sm flex items-center hover:underline">
                                                            <Phone size={12} className="mr-1" /> {item.contact}
                                                        </a>
                                                    ) : <span className="text-gray-400 text-sm">-</span>}
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">SALARY</span>
                                                    <span className="font-bold text-gray-800 text-sm">
                                                        {item.salary ? `Rs ${parseInt(item.salary).toLocaleString()}` : '-'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 border-t border-gray-200 mt-1 pt-2">
                                                    <span className="text-gray-500 text-xs">Joined: <span className="font-medium text-gray-800">{item.dateJoined || "N/A"}</span></span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // Mobile Doctor Card
                                        <>
                                            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                                                    <span className="inline-block mt-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                                        VETERINARY PARTNER
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium">
                                                        {item.specialization}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">TOTAL PAID</span>
                                                    <span className="font-bold text-gray-800 text-sm">
                                                        Rs {(doctorStats[item.name]?.amount || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">LAST VISIT</span>
                                                    <span className="font-medium text-gray-800 text-sm">
                                                        {doctorStats[item.name]?.lastVisit ? new Date(doctorStats[item.name].lastVisit).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 border-t border-gray-200 mt-1 pt-2">
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CONTACT</span>
                                                    {item.contact ? (
                                                        <div className="flex gap-2">
                                                            <a href={`tel:${item.contact}`} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded text-center text-xs font-bold hover:bg-gray-50">
                                                                CALL
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-gray-400 text-sm">-</span>}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-end gap-2 mt-1 border-t border-gray-50 pt-2">
                                        <button onClick={() => handleOpenModal(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingId ? "Edit" : "Add"} {activeTab === "employees" ? "Employee" : "Doctor"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeTab === "employees" ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Full Name</label>
                                        <input type="text" required className="w-full p-2 border rounded" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Role</label>
                                            <input type="text" placeholder="e.g. Herdsman" required className="w-full p-2 border rounded" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contact</label>
                                            <input type="text" required className="w-full p-2 border rounded" value={empForm.contact} onChange={e => setEmpForm({ ...empForm, contact: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Salary</label>
                                            <input type="text" placeholder="e.g. 15000 PKR" className="w-full p-2 border rounded" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Date Joined</label>
                                            <input type="date" className="w-full p-2 border rounded" value={empForm.dateJoined} onChange={e => setEmpForm({ ...empForm, dateJoined: e.target.value })} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Doctor Name</label>
                                        <input type="text" required className="w-full p-2 border rounded" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Specialization</label>
                                            <input type="text" placeholder="e.g. Surgeon" className="w-full p-2 border rounded" value={docForm.specialization} onChange={e => setDocForm({ ...docForm, specialization: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Contact</label>
                                            <input type="text" required className="w-full p-2 border rounded" value={docForm.contact} onChange={e => setDocForm({ ...docForm, contact: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Clinic / Hospital</label>
                                        <input type="text" className="w-full p-2 border rounded" value={docForm.hospital} onChange={e => setDocForm({ ...docForm, hospital: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Visit Schedule / Availability</label>
                                        <input type="text" placeholder="e.g. Fridays, On Call" className="w-full p-2 border rounded" value={docForm.visitSchedule} onChange={e => setDocForm({ ...docForm, visitSchedule: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-green-600">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
