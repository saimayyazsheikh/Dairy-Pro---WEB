import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ConfirmationProvider } from "./contexts/ConfirmationContext";
import PrivateRoute from "./components/PrivateRoute";

// Lazy Load Pages to isolate crashes
const Login = lazy(() => import("./pages/Login"));
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
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cattle"
                  element={
                    <PrivateRoute>
                      <Cattle />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/milk"
                  element={
                    <PrivateRoute>
                      <Milk />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/health"
                  element={
                    <PrivateRoute>
                      <Health />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <PrivateRoute>
                      <Inventory />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/hr"
                  element={
                    <PrivateRoute>
                      <HR />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <PrivateRoute>
                      <Finance />
                    </PrivateRoute>
                  }
                />
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
