import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";

// Pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AgentsPage = lazy(() => import("./pages/admin/AgentsPage"));
const NewsPage = lazy(() => import("./pages/shared/NewsPage"));
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const StudentDetailsPage = lazy(() => import("./pages/admin/StudentDetailsPage"));
const StudentEditPage = lazy(() => import("./pages/admin/StudentEditPage"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));
const InvoicesPage = lazy(() => import("./pages/agent/InvoicesPage"));
const AgentPayoffsPage = lazy(() => import("./pages/agent/AgentPayoffsPage"));
const SupportPage = lazy(() => import("./pages/agent/SupportPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const TeamPage = lazy(() => import("./pages/admin/TeamPage"));
const RolesGuidePage = lazy(() => import("./pages/admin/RolesGuidePage"));
const AgentStudentsPage = lazy(() => import("./pages/agent/AgentStudentsPage"));

const AdminInvoicesPage = lazy(() => import("./pages/admin/AdminInvoicesPage"));
const AdminPayoffsPage = lazy(() => import("./pages/admin/AdminPayoffsPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
const AgentReportPage = lazy(() => import("./pages/admin/AgentReportPage"));
const AgentDetailPage = lazy(() => import("./pages/admin/AgentDetailPage"));
const UniversitiesPage = lazy(() => import("./pages/admin/UniversitiesPage"));
const UniversityDetailsPage = lazy(() => import("./pages/admin/UniversityDetailsPage"));
const ProgramDetailsPage = lazy(() => import("./pages/admin/ProgramDetailsPage"));
const CoursesPage = lazy(() => import("./pages/admin/CoursesPage"));
const ApplicationsPage = lazy(() => import("./pages/admin/ApplicationsPage"));
const ApplicationDetailsPage = lazy(() => import("./pages/admin/ApplicationDetailsPage"));
const AgentUniversitiesPage = lazy(() => import("./pages/agent/AgentUniversitiesPage"));
const AgentProgramsPage = lazy(() => import("./pages/agent/AgentProgramsPage"));
const AgentProgramDetailPage = lazy(() => import("./pages/agent/AgentProgramDetailPage"));
const AgentApplicationsPage = lazy(() => import("./pages/agent/AgentApplicationsPage"));
const SettingsPage = lazy(() => import("./pages/shared/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/shared/NotificationsPage"));
const CommissionsPage = lazy(() => import("./pages/shared/CommissionsPage"));

// Layouts
import DashboardLayout from "./components/layout/DashboardLayout";
import PageSkeleton from "./components/common/PageSkeleton";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <div className="App">
            <BrowserRouter>
              <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register/:token" element={<RegisterPage />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="agents" element={<AgentsPage />} />
                  <Route path="agents/:agentId" element={<AgentDetailPage />} />
                  <Route path="agents/:agentId/report" element={<AgentReportPage />} />
                  <Route path="news" element={<NewsPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:studentId" element={<StudentDetailsPage />} />
                  <Route path="students/:studentId/edit" element={<StudentEditPage />} />
                  <Route path="applications" element={<ApplicationsPage />} />
                  <Route path="applications/:applicationId" element={<ApplicationDetailsPage />} />
                  <Route path="universities" element={<UniversitiesPage />} />
                  <Route path="universities/:universityId" element={<UniversityDetailsPage />} />
                  <Route path="commission" element={<CommissionsPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="courses/:programId" element={<ProgramDetailsPage />} />
                  <Route path="invoices" element={<AdminInvoicesPage />} />
                  <Route path="payoffs" element={<AdminPayoffsPage />} />
                  {/* Verification now lives inside the Students page; keep old links working */}
                  <Route path="verification" element={<Navigate to="/admin/students?tab=queue" replace />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="audit-log" element={<AuditLogPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="roles-guide" element={<RolesGuidePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                {/* Agent Routes */}
                <Route path="/agent" element={<DashboardLayout requiredRole="agent" />}>
                  <Route index element={<Navigate to="/agent/dashboard" replace />} />
                  <Route path="dashboard" element={<AgentDashboard />} />
                  <Route path="news" element={<NewsPage />} />
                  <Route path="students" element={<AgentStudentsPage />} />
                  <Route path="students/:studentId" element={<StudentDetailsPage />} />
                  <Route path="applications" element={<AgentApplicationsPage />} />
                  <Route path="applications/:applicationId" element={<ApplicationDetailsPage />} />
                  <Route path="universities" element={<AgentUniversitiesPage />} />
                  <Route path="commission" element={<CommissionsPage />} />
                  <Route path="programs" element={<AgentProgramsPage />} />
                  <Route path="programs/:programId" element={<AgentProgramDetailPage />} />
                  <Route path="universities/:universityId" element={<UniversityDetailsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="payoffs" element={<AgentPayoffsPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster position="top-right" richColors closeButton />
          </div>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
