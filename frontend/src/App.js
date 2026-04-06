import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";

// Pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AgentsPage from "./pages/admin/AgentsPage";
import EventsPage from "./pages/admin/EventsPage";
import StudentsPage from "./pages/admin/StudentsPage";
import StudentDetailsPage from "./pages/admin/StudentDetailsPage";
import StudentEditPage from "./pages/admin/StudentEditPage";
import EventDetailsPage from "./pages/admin/EventDetailsPage";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentEventsPage from "./pages/agent/AgentEventsPage";

// Layouts
import DashboardLayout from "./components/layout/DashboardLayout";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <div className="App">
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="agents" element={<AgentsPage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:eventId" element={<EventDetailsPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:studentId" element={<StudentDetailsPage />} />
                  <Route path="students/:studentId/edit" element={<StudentEditPage />} />
                </Route>

                {/* Agent Routes */}
                <Route path="/agent" element={<DashboardLayout requiredRole="agent" />}>
                  <Route index element={<Navigate to="/agent/dashboard" replace />} />
                  <Route path="dashboard" element={<AgentDashboard />} />
                  <Route path="events" element={<AgentEventsPage />} />
                  <Route path="events/:eventId" element={<EventDetailsPage />} />
                </Route>

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" richColors closeButton />
          </div>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
