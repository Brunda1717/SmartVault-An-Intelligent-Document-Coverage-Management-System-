import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddAsset from "./pages/AddAsset";
import AssetDetails from "./pages/AssetDetails";
import AddCoverage from "./pages/AddCoverage";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-asset" element={<AddAsset />} />
                <Route path="/asset/:id" element={<AssetDetails />} />
                <Route path="/asset/:id/add-coverage" element={<AddCoverage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;