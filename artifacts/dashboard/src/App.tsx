import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import OperatorConfig from "./pages/OperatorConfig";
import PublicForm from "./pages/PublicForm";
import Upgrade from "./pages/Upgrade";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <OperatorConfig />
          </RequireAuth>
        }
      />
      <Route
        path="/app/upgrade"
        element={
          <RequireAuth>
            <Upgrade />
          </RequireAuth>
        }
      />
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
