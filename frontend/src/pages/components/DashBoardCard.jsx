import React from "react";
import { dashboardItems } from "../../utils/data";

const DashboardCard = () => {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-xl max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Advanced Dashboard</h2>
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-3xl font-bold text-blue-600">47</p>
          <p className="text-gray-600">Today's Appointments</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">$12,450</p>
          <p className="text-gray-600">Weekly Revenue</p>
        </div>
      </div>
      <ul className="space-y-3">
        {dashboardItems.map((item, index) => (
          <li
            key={index}
            className={`flex items-center px-4 py-2 rounded-lg bg-${item.bgColor}-50`}
          >
            <item.icon className={`text-${item.color}-600 mr-2`} size={20} />
            <span className="text-gray-800">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardCard;
