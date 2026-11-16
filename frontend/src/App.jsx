import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import WalletFeedback from './components/WalletFeedback.jsx'
import { useWallet } from './context/WalletContext.jsx'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import FacultyDashboard from './pages/FacultyDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import VerifyIdentity from './pages/VerifyIdentity.jsx'
import Activity from './pages/Activity.jsx'
import AccessDenied from './pages/AccessDenied.jsx'

function DashboardLayout({ children }) {
  const { identity, isOwner, demoMode } = useWallet()
  const role = isOwner ? 'ADMIN' : identity?.roleName
  return <div className="dashboard-frame"><Sidebar role={role} /><div className="dashboard-main">
    {demoMode && <div className="demo-ribbon"><span /> Demo environment · sample records only · no blockchain writes</div>}
    {children}
  </div></div>
}

function ProtectedPage({ role, children }) {
  return <ProtectedRoute role={role}><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
}

export default function App() {
  return <><WalletFeedback /><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/register" element={<><Navbar /><Register /></>} />
    <Route path="/verify" element={<><Navbar /><VerifyIdentity /></>} />
    <Route path="/access-denied" element={<AccessDenied />} />
    <Route path="/admin" element={<ProtectedPage role="ADMIN"><AdminDashboard /></ProtectedPage>} />
    <Route path="/activity" element={<ProtectedPage role="ADMIN"><Activity /></ProtectedPage>} />
    <Route path="/student" element={<ProtectedPage role="STUDENT"><StudentDashboard /></ProtectedPage>} />
    <Route path="/faculty" element={<ProtectedPage role="FACULTY"><FacultyDashboard /></ProtectedPage>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></>
}