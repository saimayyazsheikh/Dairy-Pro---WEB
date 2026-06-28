import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb } from "../firebase";
import { ref, onValue, push, update, remove, get } from "firebase/database";

export function useHR() {
    const { userData } = useAuth();
    const farmId = userData?.farmId;
    const [employees, setEmployees] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payrollStatus, setPayrollStatus] = useState({}); // { empId: boolean }
    const [doctorStats, setDoctorStats] = useState({}); // { docName: totalPaid }

    useEffect(() => {
        if (!farmId) return;
        const empRef = ref(rtdb, `farms/${farmId}/employees`);
        const docRef = ref(rtdb, `farms/${farmId}/doctors`);
        const expenseRef = ref(rtdb, `farms/${farmId}/expenses`);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const payrollRef = ref(rtdb, `farms/${farmId}/payroll_runs/${currentMonth}`);

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
            setPayrollStatus(data); // Store full object: { empId: { amount, date, status } }
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
                            if (!stats[docName]) {
                                stats[docName] = { amount: 0, lastVisit: "" };
                            }
                            stats[docName].amount += (parseFloat(exp.amount) || 0);

                            // Update Last Visit if this expense is newer
                            if (!stats[docName].lastVisit || exp.date > stats[docName].lastVisit) {
                                stats[docName].lastVisit = exp.date;
                            }
                        }
                    }
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
    }, [farmId]);

    // --- Employee Actions ---
    // --- Employee Actions ---
    const addEmployee = async (data) => {
        const newRef = push(ref(rtdb, `farms/${farmId}/employees`));
        const newId = newRef.key;
        const today = new Date();
        const createdData = { ...data, createdAt: today.toISOString() };

        await update(newRef, createdData);

        // Immediate "Sign-on" Expense Trigger (If not 1st of month)
        // User Requirement: "Initial Salary... only if current date is not already the 1st"
        let salaryLogged = false;
        if (today.getDate() !== 1) {
            const salaryAmount = parseFloat(data.salary ? data.salary.toString().replace(/[^0-9.]/g, '') : "0");

            if (salaryAmount > 0) {
                const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
                const dateStr = today.toISOString().split("T")[0];
                const monthName = today.toLocaleString('default', { month: 'short', year: 'numeric' });

                // 1. Log Expense
                await push(ref(rtdb, `farms/${farmId}/expenses`), {
                    date: dateStr,
                    category: "Salaries",
                    amount: salaryAmount,
                    description: `[Auto] Monthly Salary - ${data.name} (${monthName})`,
                    createdAt: today.toISOString(),
                    referenceId: newId, // Critical for duplicate checks
                    type: 'Auto'
                });

                // 2. Mark as Paid in Validation Ledger
                await update(ref(rtdb, `farms/${farmId}/payroll_runs/${currentMonth}/${newId}`), {
                    amount: salaryAmount,
                    date: dateStr,
                    status: "Paid"
                });
                salaryLogged = true;
            }
        }
        return salaryLogged;
    };

    const updateEmployee = async (id, data) => {
        await update(ref(rtdb, `farms/${farmId}/employees/${id}`), { ...data, updatedAt: new Date().toISOString() });
    };
    const deleteEmployee = async (id) => {
        await remove(ref(rtdb, `farms/${farmId}/employees/${id}`));
    };

    // --- Doctor Actions ---
    const addDoctor = async (data) => {
        await push(ref(rtdb, `farms/${farmId}/doctors`), { ...data, createdAt: new Date().toISOString() });
    };
    const updateDoctor = async (id, data) => {
        await update(ref(rtdb, `farms/${farmId}/doctors/${id}`), { ...data, updatedAt: new Date().toISOString() });
    };
    const deleteDoctor = async (id) => {
        await remove(ref(rtdb, `farms/${farmId}/doctors/${id}`));
    };

    const runMonthlyPayroll = async () => {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
        const todayStr = now.toISOString().split("T")[0];
        const monthName = now.toLocaleString('default', { month: 'short', year: 'numeric' });

        // "1st of Month" Rule Check (User: "On the 1st... loop")
        // We run this check anytime, but we only auto-pay if valid.
        // The calling component handles the "when to call" (usually on mount), 
        // but we assume this function is idempotent and safe to call anytime.

        let processedCount = 0;

        try {
            // Fetch Expenses for "Double-Entry Check"
            const expSnapshot = await get(ref(rtdb, `farms/${farmId}/expenses`));
            const expensesData = expSnapshot.val() || {};
            const expensesList = Object.values(expensesData);

            for (const emp of employees) {
                // 1. Ledger Check (Fast)
                if (payrollStatus[emp.id]) continue;

                // 2. Double-Entry Check (Deep check in Expenses table)
                // Look for expense with same referenceId in current month
                const alreadyPaidInExpenses = expensesList.some(exp =>
                    exp.referenceId === emp.id &&
                    exp.category === "Salaries" &&
                    exp.date.startsWith(currentMonth)
                );

                if (alreadyPaidInExpenses) {
                    // Sync Ledger if missing (Data integrity fix)
                    await update(ref(rtdb, `farms/${farmId}/payroll_runs/${currentMonth}/${emp.id}`), {
                        amount: 0,
                        date: todayStr,
                        status: "Paid (Found in Expenses)"
                    });
                    continue;
                }

                // Parse Salary
                const rawSalary = emp.salary ? emp.salary.toString().replace(/[^0-9.]/g, '') : "0";
                const salaryAmount = parseFloat(rawSalary);

                if (salaryAmount > 0) {
                    // 3. Create Expense
                    await push(ref(rtdb, `farms/${farmId}/expenses`), {
                        date: todayStr,
                        category: "Salaries",
                        amount: salaryAmount,
                        description: `[Auto] Monthly Salary - ${emp.name} (${monthName})`,
                        createdAt: now.toISOString(),
                        referenceId: emp.id,
                        type: 'Auto'
                    });

                    // 4. Mark as Paid
                    await update(ref(rtdb, `farms/${farmId}/payroll_runs/${currentMonth}/${emp.id}`), {
                        amount: salaryAmount,
                        date: todayStr,
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
