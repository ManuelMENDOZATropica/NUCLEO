import users from '../../../data/users.json';
import { ROLES } from '../permissions.js';

export const USERS = users;

export function getUsers() {
  return USERS.slice();
}

export function getUserByEmail(email) {
  if (!email) {
    return null;
  }
  return USERS.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getUsersByRole(role) {
  return USERS.filter((user) => user.role === role);
}

export function isActiveUser(email) {
  const user = getUserByEmail(email);
  return Boolean(user?.active);
}

export function listEditors() {
  return getUsersByRole(ROLES.EDITOR);
}

export function listAdmins() {
  return getUsersByRole(ROLES.ADMIN);
}

export function ensureUserExists(email) {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error(`No existe un usuario registrado con el correo ${email}.`);
  }
  return user;
}
