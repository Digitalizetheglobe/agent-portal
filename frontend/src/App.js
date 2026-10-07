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
import AgentEventsManagementPage from "./pages/agent/AgentEventsManagementPage";
import InvoicesPage from "./pages/agent/InvoicesPage";
import AgentPayoffsPage from "./pages/agent/AgentPayoffsPage";
import SupportPage from "./pages/agent/SupportPage";
import AgentStudentsPage from "./pages/agent/AgentStudentsPage";

import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import AdminPayoffsPage from "./pages/admin/AdminPayoffsPage";
import AdminStudentVerificationPage from "./pages/admin/AdminStudentVerificationPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AgentReportPage from "./pages/admin/AgentReportPage";
import UniversitiesPage from "./pages/admin/UniversitiesPage";
import UniversityDetailsPage from "./pages/admin/UniversityDetailsPage";
import CoursesPage from "./pages/admin/CoursesPage";
import ApplicationsPage from "./pages/admin/ApplicationsPage";
import ApplicationDetailsPage from "./pages/admin/ApplicationDetailsPage";
import AgentUniversitiesPage from "./pages/agent/AgentUniversitiesPage";
import AgentApplicationsPage from "./pages/agent/AgentApplicationsPage";
import SettingsPage from "./pages/shared/SettingsPage";
import NotificationsPage from "./pages/shared/NotificationsPage";

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
                  <Route path="agents/:agentId/report" element={<AgentReportPage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:eventId" element={<EventDetailsPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:studentId" element={<StudentDetailsPage />} />
                  <Route path="students/:studentId/edit" element={<StudentEditPage />} />
                  <Route path="applications" element={<ApplicationsPage />} />
                  <Route path="applications/:applicationId" element={<ApplicationDetailsPage />} />
                  <Route path="universities" element={<UniversitiesPage />} />
                  <Route path="universities/:universityId" element={<UniversityDetailsPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="invoices" element={<AdminInvoicesPage />} />
                  <Route path="payoffs" element={<AdminPayoffsPage />} />
                  <Route path="verification" element={<AdminStudentVerificationPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                {/* Agent Routes */}
                <Route path="/agent" element={<DashboardLayout requiredRole="agent" />}>
                  <Route index element={<Navigate to="/agent/dashboard" replace />} />
                  <Route path="dashboard" element={<AgentDashboard />} />
                  <Route path="events" element={<Navigate to="/agent/events-management" replace />} />
                  <Route path="events-management" element={<AgentEventsManagementPage />} />
                  <Route path="events/:eventId" element={<EventDetailsPage />} />
                  <Route path="students" element={<AgentStudentsPage />} />
                  <Route path="students/:studentId" element={<StudentDetailsPage />} />
                  <Route path="applications" element={<AgentApplicationsPage />} />
                  <Route path="applications/:applicationId" element={<ApplicationDetailsPage />} />
                  <Route path="universities" element={<AgentUniversitiesPage />} />
                  <Route path="universities/:universityId" element={<UniversityDetailsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="payoffs" element={<AgentPayoffsPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
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
