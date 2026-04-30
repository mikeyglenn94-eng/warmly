import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import OperatorConfig from "./pages/OperatorConfig";
import PublicForm from "./pages/PublicForm";
// Upgrade page kept as breadcrumb code in src/pages/Upgrade.tsx but not
// routed while the paywall is disabled — /app/upgrade redirects to /app.
// Re-wire the route when re-enabling the paywall.

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/app" element={<OperatorConfig />} />
      <Route path="/app/upgrade" element={<Navigate to="/app" replace />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Admin />
          </RequireAuth>
        }
      />
      <Route path="/m/:slug" element={<PublicForm />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
