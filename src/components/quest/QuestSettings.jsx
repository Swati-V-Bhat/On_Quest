import React from 'react';

const QuestSettings = ({ questData, setQuestData }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quest Title
          </label>
          <input
            type="text"
            value={questData.title}
            onChange={(e) => setQuestData({ ...questData, title: e.target.value })}
            placeholder="Enter quest title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={questData.description}
            onChange={(e) => setQuestData({ ...questData, description: e.target.value })}
            placeholder="Brief description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>
    </div>
  );
};

export default QuestSettings;