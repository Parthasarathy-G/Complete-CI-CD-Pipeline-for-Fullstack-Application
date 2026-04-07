// components/DashboardLayout.jsx
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* margin only on desktop */}
      <main className="px-4 sm:px-6 py-6 md:ml-[280px]">{children}</main>
    </div>
  );
}
