import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ConfirmationProvider } from "./contexts/ConfirmationContext";
import PrivateRoute from "./components/PrivateRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";

// Lazy Load Pages to isolate crashes
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Settings = lazy(() => import("./pages/Settings"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Cattle = lazy(() => import("./pages/Cattle"));
const Milk = lazy(() => import("./pages/Milk"));
const Health = lazy(() => import("./pages/Health"));
const Inventory = lazy(() => import("./pages/Inventory"));
const HR = lazy(() => import("./pages/HR"));
const Finance = lazy(() => import("./pages/Finance"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8 text-gray-500">
    Loading Component...
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/subscription" 
                  element={
                    <PrivateRoute>
                      <Subscription />
                    </PrivateRoute>
                  } 
                />
                
                {/* Protected & Subscription Guarded Routes */}
                <Route path="/" element={<PrivateRoute><SubscriptionGuard><Dashboard /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/cattle" element={<PrivateRoute><SubscriptionGuard><Cattle /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/milk" element={<PrivateRoute><SubscriptionGuard><Milk /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/health" element={<PrivateRoute><SubscriptionGuard><Health /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/inventory" element={<PrivateRoute><SubscriptionGuard><Inventory /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/hr" element={<PrivateRoute><SubscriptionGuard><HR /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/finance" element={<PrivateRoute><SubscriptionGuard><Finance /></SubscriptionGuard></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><SubscriptionGuard><Settings /></SubscriptionGuard></PrivateRoute>} />

                {/* Default redirect for unknown routes */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </ConfirmationProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
