import { randomUUID } from 'crypto';
import { Router } from 'express';
import HttpError from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { usersStore } from '../lib/stores.js';
import { buildValidator, formatErrors, userCreateSchema, userUpdateSchema } from '../lib/validation.js';

const router = Router();

const validateCreate = buildValidator(userCreateSchema);
const validateUpdate = buildValidator(userUpdateSchema);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await usersStore.read();
    res.json(users);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const users = await usersStore.read();
    const user = users.find((item) => item.id === id);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    res.json(user);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { valid, errors } = validateCreate(req.body);
    if (!valid) {
      res.status(400).json({ errors: formatErrors(errors) });
      return;
    }

    const payload = req.body;
    const newUser = {
      id: randomUUID(),
      email: payload.email,
      name: payload.name,
      role: payload.role,
      picture: payload.picture ?? '',
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };

    await usersStore.update((users) => {
      if (users.some((user) => user.email === newUser.email)) {
        throw new HttpError(409, 'A user with that email already exists');
      }
      return [...users, newUser];
    });

    res.status(201).json(newUser);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { valid, errors } = validateUpdate(req.body);
    if (!valid) {
      res.status(400).json({ errors: formatErrors(errors) });
      return;
    }

    const { id } = req.params;
    const payload = req.body;

    const updatedUser = await usersStore.update((users) => {
      const index = users.findIndex((user) => user.id === id);
      if (index === -1) {
        throw new HttpError(404, 'User not found');
      }
      const duplicate = users.some((user, idx) => idx !== index && user.email === payload.email);
      if (duplicate) {
        throw new HttpError(409, 'A user with that email already exists');
      }
      const nextUsers = [...users];
      nextUsers[index] = {
        ...nextUsers[index],
        email: payload.email,
        name: payload.name,
        role: payload.role,
        picture: payload.picture ?? '',
        createdAt: payload.createdAt ?? nextUsers[index].createdAt,
      };
      return nextUsers;
    });

    const user = updatedUser.find((item) => item.id === id);
    res.json(user);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await usersStore.update((users) => {
      const index = users.findIndex((user) => user.id === id);
      if (index === -1) {
        throw new HttpError(404, 'User not found');
      }
      const nextUsers = [...users];
      nextUsers.splice(index, 1);
      return nextUsers;
    });

    res.status(204).send();
  }),
);

export default router;
