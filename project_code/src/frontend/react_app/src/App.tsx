import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import './index.css'; // Ensure Tailwind styles are loaded

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}> { /* Use MainLayout for these routes */}
        <Route index element={<HomePage />} /> { /* Default route for / */}
        <Route path="chat" element={<ChatPage />} /> { /* Route for /chat */}
        {/* Add other routes for legacy UI or future features here */}
      </Route>
      {/* Routes without MainLayout can be defined here if needed */}
    </Routes>
  );
}

export default App;

