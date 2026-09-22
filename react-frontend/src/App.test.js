import { render, screen } from '@testing-library/react';
import App from './App';
import EmployeeService from './services/EmployeeService';

// App mounts ListEmployeeComponent at "/", which fetches on mount.
// Without this the smoke test would attempt a real HTTP call under jsdom.
jest.mock('./services/EmployeeService');

beforeEach(() => {
  EmployeeService.getAllEmployees.mockResolvedValue({ data: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders the application shell', async () => {
  render(<App />);

  expect(screen.getByText(/Employee Management App/i)).toBeInTheDocument();
  expect(await screen.findByText(/List Employees/i)).toBeInTheDocument();
});
