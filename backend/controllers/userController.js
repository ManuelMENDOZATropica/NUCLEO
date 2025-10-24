import User from "../models/User.js";

export async function createUser(req, res) {
  try {
    const payload = req.body || {};
    const user = await User.create(payload);
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    res.status(500).json({ message: "No se pudo crear el usuario" });
  }
}

export async function getUsers(_req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "No se pudieron obtener los usuarios" });
  }
}

export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "No se pudo obtener el usuario" });
  }
}

export async function updateUser(req, res) {
  try {
    const updates = req.body || {};
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    res.status(500).json({ message: "No se pudo actualizar el usuario" });
  }
}

export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ message: "No se pudo eliminar el usuario" });
  }
}
