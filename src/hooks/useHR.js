import { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, update, remove, get } from "firebase/database";

export function useHR() {
    const [employees, setEmployees] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payrollStatus, setPayrollStatus] = useState({}); // { empId: boolean }
    const [doctorStats, setDoctorStats] = useState({}); // { docName: totalPaid }

    useEffect(() => {
        const empRef = ref(rtdb, 'employees');
        const docRef = ref(rtdb, 'doctors');
        const expenseRef = ref(rtdb, 'expenses');
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const payrollRef = ref(rtdb, `payroll_runs/${currentMonth}`);

        // Fetch Employees
        const unsubEmp = onValue(empRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                    setEmployees(list);
                } else {
                    setEmployees([]);
                }
            } catch (err) {
                console.error("Error fetching employees:", err);
            }
        });

        // Fetch Doctors
        const unsubDoc = onValue(docRef, (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                    setDoctors(list);
                } else {
                    setDoctors([]);
                }
            } catch (err) {
                console.error("Error fetching doctors:", err);
            }
        });

        // Fetch Payroll Status for Current Month
        const unsubPayroll = onValue(payrollRef, (snapshot) => {
            const data = snapshot.val() || {};
            const statusMap = {};
            Object.keys(data).forEach(empId => statusMap[empId] = true);
            setPayrollStatus(statusMap);
        });

        // Fetch Expenses to Calculate Doctor Totals
        const unsubExpenses = onValue(expenseRef, (snapshot) => {
            const data = snapshot.val();
            const stats = {};
            if (data) {
                Object.values(data).forEach(exp => {
                    // New Category for Doctor Fees
                    if (exp.category === "Doctor Fees" && exp.description && exp.description.startsWith("Dr. Fee:")) {
                        // Desc: "Dr. Fee: [Name] - [Type] ..."
                        const firstPart = exp.description.split(" - ")[0]; // "Dr. Fee: [Name]"
                        const docName = firstPart.replace("Dr. Fee: ", "").trim();
                        if (docName) {
                            stats[docName] = (stats[docName] || 0) + (parseFloat(exp.amount) || 0);
                        }
                    }
                    // Fallback / Legacy (Optional: disable if you want strict separation)
                    // else if (exp.category === "Medical" && exp.description.includes("Vet Visit:")) ...
                });
            }
            setDoctorStats(stats);
            setLoading(false);
        });

        return () => {
            unsubEmp();
            unsubDoc();
            unsubPayroll();
            unsubExpenses();
        };
    }, []);

    // --- Employee Actions ---
    const addEmployee = async (data) => {
        await push(ref(rtdb, 'employees'), { ...data, createdAt: new Date().toISOString() });
    };
    const updateEmployee = async (id, data) => {
        await update(ref(rtdb, `employees/${id}`), { ...data, updatedAt: new Date().toISOString() });
    };
    const deleteEmployee = async (id) => {
        await remove(ref(rtdb, `employees/${id}`));
    };

    // --- Doctor Actions ---
    const addDoctor = async (data) => {
        await push(ref(rtdb, 'doctors'), { ...data, createdAt: new Date().toISOString() });
    };
    const updateDoctor = async (id, data) => {
        await update(ref(rtdb, `doctors/${id}`), { ...data, updatedAt: new Date().toISOString() });
    };
    const deleteDoctor = async (id) => {
        await remove(ref(rtdb, `doctors/${id}`));
    };

    const runMonthlyPayroll = async () => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const today = new Date().toISOString().split("T")[0];
        let processedCount = 0;

        try {
            // Already have employees state, assuming it's fresh enough or fetch fresh?
            // Safer to fetch fresh for critical financial op, but state is synced via websocket.
            // Let's iterate current employees.
            for (const emp of employees) {
                // Check if already paid
                if (payrollStatus[emp.id]) continue;

                // Parse Salary
                // Salary field might be "40000" or "40,000" or "40000 PKR". Need to clean.
                const rawSalary = emp.salary ? emp.salary.toString().replace(/[^0-9.]/g, '') : "0";
                const salaryAmount = parseFloat(rawSalary);

                if (salaryAmount > 0) {
                    // 1. Create Expense
                    await push(ref(rtdb, 'expenses'), {
                        date: today,
                        category: "Salaries",
                        amount: salaryAmount,
                        description: `Monthly Salary - ${emp.name}`,
                        createdAt: new Date().toISOString()
                    });

                    // 2. Mark as Paid
                    await update(ref(rtdb, `payroll_runs/${currentMonth}/${emp.id}`), {
                        amount: salaryAmount,
                        date: today,
                        status: "Paid"
                    });
                    processedCount++;
                }
            }
        } catch (err) {
            console.error("Payroll Error:", err);
            throw err;
        }
        return processedCount;
    };

    return {
        employees, doctors, loading, error, payrollStatus, doctorStats,
        addEmployee, updateEmployee, deleteEmployee,
        addDoctor, updateDoctor, deleteDoctor,
        runMonthlyPayroll
    };
}
