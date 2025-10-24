import { randomUUID } from 'crypto';
import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { licensesStore } from '../lib/stores.js';
import { findLicense } from '../lib/licenses.js';
import { buildValidator, formatErrors, licenseCreateSchema, licenseUpdateSchema } from '../lib/validation.js';

const router = Router();

const validateCreate = buildValidator(licenseCreateSchema);
const validateUpdate = buildValidator(licenseUpdateSchema);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const licenses = await licensesStore.read();
    res.json(licenses);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await licensesStore.read();
    const { license } = findLicense(data, id);
    res.json(license);
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
    const newLicense = {
      id: randomUUID(),
      category: payload.category,
      nombre: payload.nombre,
      licencia: payload.licencia,
      enlace: payload.enlace,
      logo: payload.logo,
      subHerramientas: payload.subHerramientas ?? [],
      usos: payload.usos ?? [],
    };

    await licensesStore.update((data) => {
      const nextData = { ...data };
      const categoryItems = Array.isArray(nextData[newLicense.category])
        ? [...nextData[newLicense.category]]
        : [];
      categoryItems.push(newLicense);
      nextData[newLicense.category] = categoryItems;
      return nextData;
    });

    res.status(201).json(newLicense);
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

    const updatedData = await licensesStore.update((data) => {
      const { license, category, index } = findLicense(data, id);
      const sourceItems = [...data[category]];
      const targetCategory = payload.category ?? category;

      const updatedLicense = {
        ...license,
        ...payload,
        category: targetCategory,
        id,
      };

      if (targetCategory === category) {
        sourceItems[index] = updatedLicense;
        return { ...data, [category]: sourceItems };
      }

      sourceItems.splice(index, 1);
      const targetItems = Array.isArray(data[targetCategory]) ? [...data[targetCategory]] : [];
      targetItems.push(updatedLicense);
      return {
        ...data,
        [category]: sourceItems,
        [targetCategory]: targetItems,
      };
    });

    const { license } = findLicense(updatedData, id);
    res.json(license);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await licensesStore.update((data) => {
      const { category, index } = findLicense(data, id);
      const nextItems = [...data[category]];
      nextItems.splice(index, 1);
      const nextData = { ...data, [category]: nextItems };
      return nextData;
    });

    res.status(204).send();
  }),
);

export default router;
