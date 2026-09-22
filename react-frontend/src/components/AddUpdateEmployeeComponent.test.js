import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AddUpdateEmployeeComponent from './AddUpdateEmployeeComponent';
import EmployeeService from '../services/EmployeeService';

// Explicit factory rather than automock: EmployeeService is a default-exported
// class *instance*, and an explicit shape is unambiguous about what is mocked.
jest.mock('../services/EmployeeService', () => ({
    __esModule: true,
    default: {
        getEmployeeById: jest.fn(),
        createEmployee: jest.fn(),
        updateEmployee: jest.fn(),
    },
}));

const EMPLOYEE_1 = { id: 1, firstName: 'Ada', lastName: 'Lovelace', emailId: 'ada@example.com' };
const EMPLOYEE_2 = { id: 2, firstName: 'Grace', lastName: 'Hopper', emailId: 'grace@example.com' };

/**
 * Drives route changes from *inside* the mounted tree.
 *
 * MemoryRouter reads `initialEntries` only on first mount, so re-rendering it with a
 * new value is a silent no-op: the location never changes, useParams().id never
 * changes, and the effect under test never re-fires. A test written that way can go
 * green while exercising nothing. See design-review.md, Required Change 1.
 */
function NavHarness() {
    const navigate = useNavigate();
    return (
        <>
            <button onClick={() => navigate('/edit-employee/2')}>go-edit-2</button>
            <button onClick={() => navigate('/add-employee')}>go-add</button>
        </>
    );
}

function renderAt(path, { strict = false } = {}) {
    const tree = (
        <MemoryRouter initialEntries={[path]}>
            <NavHarness />
            <Routes>
                <Route path="/add-employee" element={<AddUpdateEmployeeComponent />} />
                <Route path="/edit-employee/:id" element={<AddUpdateEmployeeComponent />} />
            </Routes>
        </MemoryRouter>
    );
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}

const firstName = () => screen.getByPlaceholderText(/enter first name/i);
const lastName = () => screen.getByPlaceholderText(/enter last name/i);
const emailId = () => screen.getByPlaceholderText(/enter email id/i);
const submit = () => screen.getByRole('button', { name: /submit/i });

beforeEach(() => {
    EmployeeService.getEmployeeById.mockImplementation((id) =>
        Promise.resolve({ data: id === '2' ? EMPLOYEE_2 : EMPLOYEE_1 })
    );
    // Never-resolving: keeps the component's .then (window.location.href = ...) from
    // firing, which jsdom cannot perform. The assertions are on the service call itself.
    EmployeeService.createEmployee.mockReturnValue(new Promise(() => { }));
    EmployeeService.updateEmployee.mockReturnValue(new Promise(() => { }));
});

afterEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// AC-1 (FR-001) — must fail against the unfixed component
// ---------------------------------------------------------------------------
test('AC-1: the add route issues no employee fetch and renders empty fields', () => {
    renderAt('/add-employee');

    expect(EmployeeService.getEmployeeById).not.toHaveBeenCalled();
    expect(firstName()).toHaveValue('');
    expect(lastName()).toHaveValue('');
    expect(emailId()).toHaveValue('');
});

// ---------------------------------------------------------------------------
// AC-2 (FR-002) — expected to pass both before and after the fix
// ---------------------------------------------------------------------------
test('AC-2: the edit route fetches once by id and populates the form', async () => {
    renderAt('/edit-employee/1');

    expect(await screen.findByDisplayValue('Ada')).toBeInTheDocument();
    expect(EmployeeService.getEmployeeById).toHaveBeenCalledTimes(1);
    expect(EmployeeService.getEmployeeById).toHaveBeenCalledWith('1');
    expect(lastName()).toHaveValue('Lovelace');
    expect(emailId()).toHaveValue('ada@example.com');
});

// ---------------------------------------------------------------------------
// AC-3 (FR-003, FR-004, FR-005) — must fail against the unfixed component
// ---------------------------------------------------------------------------
test('AC-3: changing the route id refetches and shows the new employee', async () => {
    renderAt('/edit-employee/1');
    await screen.findByDisplayValue('Ada');

    userEvent.click(screen.getByText('go-edit-2'));

    expect(await screen.findByDisplayValue('Grace')).toBeInTheDocument();
    expect(EmployeeService.getEmployeeById).toHaveBeenCalledTimes(2);
    expect(EmployeeService.getEmployeeById).toHaveBeenLastCalledWith('2');

    // The employee-1 values must be gone, not merely overwritten in one field.
    expect(screen.queryByDisplayValue('Ada')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Lovelace')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('ada@example.com')).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// AC-4 (FR-006) — must fail against the unfixed component
// ---------------------------------------------------------------------------
test('AC-4: navigating from edit to add clears the form and issues no further fetch', async () => {
    renderAt('/edit-employee/1');
    await screen.findByDisplayValue('Ada');
    const callsAfterLoad = EmployeeService.getEmployeeById.mock.calls.length;

    userEvent.click(screen.getByText('go-add'));

    // Harness sanity check: this heading flips purely from routing, independently of the
    // effect fix. If it fails, the navigation never happened and every other assertion
    // in this file's navigation tests is meaningless.
    expect(await screen.findByRole('heading', { name: /add employee/i })).toBeInTheDocument();

    expect(EmployeeService.getEmployeeById).toHaveBeenCalledTimes(callsAfterLoad);

    // waitFor, not a bare assertion: the heading flips during the render commit, but the
    // reset runs in the effect that follows it. There is a real one-commit window where
    // the new heading is on screen beside the previous employee's values — the transient
    // flash recorded as an accepted limitation in architecture.md's risk table. AC-4 is
    // about the settled state, so assert that. Against the unfixed component the fields
    // never clear at all and this still fails.
    await waitFor(() => {
        expect(firstName()).toHaveValue('');
    });
    expect(lastName()).toHaveValue('');
    expect(emailId()).toHaveValue('');
});

// ---------------------------------------------------------------------------
// AC-5 (FR-007) — the id-change case must fail against the unfixed component
// ---------------------------------------------------------------------------
test('AC-5: a superseded response never overwrites state after the id changes', async () => {
    let resolveFirst;
    EmployeeService.getEmployeeById
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => Promise.resolve({ data: EMPLOYEE_2 }));

    renderAt('/edit-employee/1');
    userEvent.click(screen.getByText('go-edit-2'));
    await screen.findByDisplayValue('Grace');

    // Employee 1's request now lands, long after the route moved on.
    await act(async () => {
        resolveFirst({ data: EMPLOYEE_1 });
    });

    expect(screen.queryByDisplayValue('Ada')).not.toBeInTheDocument();
    expect(firstName()).toHaveValue('Grace');
});

test('AC-5: a response resolving after unmount does not throw', async () => {
    let resolveFirst;
    EmployeeService.getEmployeeById.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
    );

    const { unmount } = renderAt('/edit-employee/1');
    unmount();

    // React 18 removed the "state update on an unmounted component" warning, so there is
    // no observable signal here beyond the absence of a throw. Deliberately weak: the
    // id-change case above carries the real weight for FR-007.
    await act(async () => {
        resolveFirst({ data: EMPLOYEE_1 });
    });
});

// ---------------------------------------------------------------------------
// FR-008 / FR-009 regression — passes before and after; that is the point.
// Added per design-review.md Required Change 2.
// ---------------------------------------------------------------------------
describe('FR-009: heading is unchanged', () => {
    test('reads "Add Employee" on the add route', () => {
        renderAt('/add-employee');
        expect(screen.getByRole('heading')).toHaveTextContent(/add employee/i);
    });

    test('reads "Update Employee" on the edit route', async () => {
        renderAt('/edit-employee/1');
        await screen.findByDisplayValue('Ada');
        expect(screen.getByRole('heading')).toHaveTextContent(/update employee/i);
    });
});

describe('FR-008: submit routing is unchanged', () => {
    test('the add route creates', async () => {
        renderAt('/add-employee');

        userEvent.type(firstName(), 'Alan');
        userEvent.type(lastName(), 'Turing');
        userEvent.type(emailId(), 'alan@example.com');
        userEvent.click(submit());

        expect(EmployeeService.createEmployee).toHaveBeenCalledWith({
            firstName: 'Alan',
            lastName: 'Turing',
            emailId: 'alan@example.com',
        });
        expect(EmployeeService.updateEmployee).not.toHaveBeenCalled();
    });

    test('the edit route updates, passing the id', async () => {
        renderAt('/edit-employee/1');
        await screen.findByDisplayValue('Ada');

        userEvent.click(submit());

        expect(EmployeeService.updateEmployee).toHaveBeenCalledWith('1', {
            firstName: 'Ada',
            lastName: 'Lovelace',
            emailId: 'ada@example.com',
        });
        expect(EmployeeService.createEmployee).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// NFR-001 — StrictMode. Asserts FINAL rendered values only.
// Call counts are meaningless here: StrictMode intentionally double-invokes.
// ---------------------------------------------------------------------------
test('NFR-001: renders the correct final values under StrictMode', async () => {
    renderAt('/edit-employee/1', { strict: true });

    expect(await screen.findByDisplayValue('Ada')).toBeInTheDocument();
    expect(lastName()).toHaveValue('Lovelace');
    expect(emailId()).toHaveValue('ada@example.com');
});
