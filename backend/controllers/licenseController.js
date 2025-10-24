import License from "../models/License.js";

export async function createLicense(req, res) {
  try {
    const payload = req.body || {};
    const license = await License.create(payload);
    res.status(201).json(license);
  } catch (error) {
    res.status(500).json({ message: "No se pudo crear la licencia" });
  }
}

export async function getLicenses(req, res) {
  try {
    const { categoria } = req.query;
    const filters = {};

    if (categoria) {
      filters.categoria = categoria;
    }

    const licenses = await License.find(filters).sort({ createdAt: -1 }).lean();
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ message: "No se pudieron obtener las licencias" });
  }
}

export async function getLicenseById(req, res) {
  try {
    const license = await License.findById(req.params.id).lean();
    if (!license) {
      return res.status(404).json({ message: "Licencia no encontrada" });
    }
    res.json(license);
  } catch (error) {
    res.status(500).json({ message: "No se pudo obtener la licencia" });
  }
}

export async function updateLicense(req, res) {
  try {
    const updates = req.body || {};
    const license = await License.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!license) {
      return res.status(404).json({ message: "Licencia no encontrada" });
    }

    res.json(license);
  } catch (error) {
    res.status(500).json({ message: "No se pudo actualizar la licencia" });
  }
}

export async function deleteLicense(req, res) {
  try {
    const license = await License.findByIdAndDelete(req.params.id).lean();
    if (!license) {
      return res.status(404).json({ message: "Licencia no encontrada" });
    }
    res.json({ message: "Licencia eliminada" });
  } catch (error) {
    res.status(500).json({ message: "No se pudo eliminar la licencia" });
  }
}
