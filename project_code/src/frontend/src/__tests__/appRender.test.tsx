import React from 'react'; // Added missing React import
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
// Adjust the import path if App.tsx is located elsewhere
import App from '../App';

describe('App component', () => {
  it('renders without crashing', () => {
    // Render the App component
    const { getByText } = render(<App />);
    
    // Check if an element containing the text 'branda' (case-insensitive) is present
    // This assumes the main App component or one of its children renders this text.
    // If the main page content changes, this text might need adjustment.
    expect(getByText(/branda/i)).toBeDefined();
  });
});

