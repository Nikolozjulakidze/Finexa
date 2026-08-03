import { Routes, Route, Navigate } from "react-router-dom";
import Starter from "./pages/Starter.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Categories from "./pages/Categories.jsx";
import Budgets from "./pages/Budgets.jsx";
import Insights from "./pages/Insights.jsx";
import AIChat from "./pages/AIChat.jsx";
import Cards from "./pages/Cards.jsx";
import BankConnections from "./pages/BankConnections.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Starter />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/bank-connections" element={<BankConnections />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/ai-chat" element={<AIChat />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
