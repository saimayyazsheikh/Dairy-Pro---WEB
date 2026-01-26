import React, { useMemo } from "react";
import Layout from "../components/Layout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Beef, Milk, Wheat, DollarSign, Calendar, Banknote } from 'lucide-react';
import { useCattle } from "../hooks/useCattle";
import { useProduction } from "../hooks/useProduction";
import { useInventory } from "../hooks/useInventory";
import { useHealth } from "../hooks/useHealth";
import { useMilk } from "../hooks/useMilk";
import { useFinance } from "../hooks/useFinance";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
  </div>
);

export default function Dashboard() {
  const { cattle, loading: cattleLoading } = useCattle();
  const { logs, loading: productionLoading } = useProduction();
  const { items, loading: inventoryLoading } = useInventory();
  const { records: healthRecords, loading: healthLoading } = useHealth();
  const { expenses, loading: expensesLoading } = useFinance();
  const { milkRecords, loading: milkLoading } = useMilk();

  // 1. Total Cattle
  const totalCattle = cattle.length;

  // 2. Daily Milk (Today) - Use Local Date (en-CA gives YYYY-MM-DD)
  const today = new Date().toLocaleDateString('en-CA');
  const dailyMilk = useMemo(() => {
    return milkRecords
      .filter(record => record.date === today)
      .reduce((sum, record) => sum + (parseFloat(record.quantity) || 0), 0)
      .toFixed(1);
  }, [milkRecords, today]);

  // 3. Monthly Expenses (Replacing Feed Stock)
  const monthlyExpenses = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const total = expenses
      .filter(exp => {
        const d = new Date(exp.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    return Math.floor(total).toLocaleString();
  }, [expenses]);

  // 4. Revenue (Actual Sales from Milk Records)
  const revenue = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = milkRecords
      .filter(sale => {
        const d = new Date(sale.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, sale) => sum + (parseFloat(sale.totalAmount) || 0), 0);
    return Math.floor(monthlySales).toLocaleString();
  }, [milkRecords]);

  // 5. Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-CA');
    }).reverse();

    return last7Days.map(date => {
      const dayTotal = milkRecords
        .filter(record => record.date === date)
        .reduce((sum, record) => sum + (parseFloat(record.quantity) || 0), 0);

      const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
      return { name: dayName, milk: dayTotal };
    });
  }, [milkRecords]);

  // 6. Medical / Health Alerts
  const upcomingMedical = useMemo(() => {
    return healthRecords.filter(record => {
      if (!record.nextDueDate) return false;
      const due = new Date(record.nextDueDate);
      const now = new Date();
      const diffTime = due - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7; // Upcoming in next 7 days
    });
  }, [healthRecords]);

  // 7. Inventory Low Stock
  const lowStockItems = items.filter(item => item.quantity <= item.lowStockThreshold);

  const stats = [
    { title: "Total Cattle", value: cattleLoading ? "..." : totalCattle, icon: Beef, color: "bg-blue-500" },
    { title: "Daily Milk (L)", value: milkLoading ? "..." : dailyMilk, icon: Milk, color: "bg-blue-400" },
    { title: "Monthly Expenses (PKR)", value: expensesLoading ? "..." : `Rs ${monthlyExpenses}`, icon: DollarSign, color: "bg-red-500" },
    { title: "Monthly Revenue (PKR)", value: milkLoading ? "..." : `Rs ${revenue}`, icon: Banknote, color: "bg-green-500" },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Overview of farm performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Production Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Milk Production</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="milk" stroke="#4CAF50" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Action Required</h3>
          <div className="flex-1 overflow-y-auto max-h-[320px] pr-2 space-y-4">

            {/* Empty State */}
            {lowStockItems.length === 0 && upcomingMedical.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calendar size={48} className="mb-2 opacity-20" />
                <p>No active alerts. All systems nominal.</p>
              </div>
            )}

            {/* Low Stock Alerts */}
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-start p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-red-500 mr-3 shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-red-800">Low Stock: {item.name}</p>
                  <p className="text-xs text-red-600 font-medium">
                    {item.quantity} {item.unit} remaining
                    <span className="text-red-400 block font-normal">Threshold: {item.lowStockThreshold} {item.unit}</span>
                  </p>
                </div>
              </div>
            ))}

            {/* Medical Alerts */}
            {upcomingMedical.map(record => (
              <div key={record.id} className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 mr-3 shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Upcoming: {record.recordType}</p>
                  <p className="text-xs text-blue-600 font-medium">
                    Due on {record.nextDueDate} for Cow/Animal {record.cowTag}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
