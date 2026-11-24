import { Router } from 'express';
import { requireToken } from '../auth/auth-cookie.ts';
import { createStaff, patchStaff, employeeId, listStaff } from './employees.schema.ts';
import { createEmployee, updateEmployee, listEmployees, employeeDetail } from './employees.service.ts';

export const employees = Router();
employees.get('/', async (req, res) => {
  const token = requireToken(req);
  res.json(await listEmployees(token, listStaff.parse(req.query)));
});
employees.get('/:id', async (req, res) =>
  res.json(await employeeDetail(requireToken(req), employeeId.parse(req.params.id))),
);
employees.post('/', async (req, res) =>
  res.status(201).json(await createEmployee(requireToken(req), createStaff.parse(req.body))),
);
employees.patch('/:id', async (req, res) =>
  res.json(
    await updateEmployee(requireToken(req), employeeId.parse(req.params.id), patchStaff.parse(req.body)),
  ),
);
