import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Legacy UI / Home Page</h1>
      <p>This is a placeholder for the existing or main application content.</p>
      <p>The new chat interface can be accessed separately.</p>
      {/* Add link to chat page if needed */}
      {/* <a href="/chat" className="link link-primary">Go to Chat</a> */}
    </div>
  );
};

export default HomePage;

