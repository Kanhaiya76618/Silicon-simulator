import { Route, Routes } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import { Workspace } from "./features/workspace/Workspace";

function App() {
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/workspace" element={<Workspace />} /></Routes>;
}

export default App;
