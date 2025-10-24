import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- IMPORTANTE: Ajusta estas rutas si tus modelos se llaman diferente ---
import User from './models/User.js';
import License from './models/License.js'; // Asumo que se llama 'License.js'

// Configuración para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Conectar a la Base de Datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Conectado para el seeder...');
  } catch (err) {
    console.error(`Error de conexión (Seeder): ${err.message}`);
    process.exit(1);
  }
};

// Leer archivos JSON
const readJsonFile = (filePath) => {
  const fullPath = path.join(__dirname, filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
};

// Función para importar datos
const importData = async () => {
  try {
    // Cargar datos desde los JSON
    const usersData = readJsonFile('../frontend/public/json-db/users.json');
    const licensesDataByCat = readJsonFile('../frontend/public/json-db/licenses.json');

    // Limpiar la base de datos
    console.log('Limpiando base de datos...');
    await User.deleteMany();
    await License.deleteMany();

    // Preparar datos de licencias (transformarlos)
    // Tu JSON está como { "Categoria": [...] }, lo pasamos a [{... , categoria: "..."}]
    const licensesToInsert = [];
    for (const categoria in licensesDataByCat) {
      const items = licensesDataByCat[categoria];
      items.forEach(item => {
        licensesToInsert.push({ ...item, categoria: categoria });
      });
    }
    
    console.log('Insertando datos...');
    
    // Insertar usuarios
    await User.insertMany(usersData);

    // Insertar licencias
    await License.insertMany(licensesToInsert);

    console.log('¡Datos importados exitosamente!');
    process.exit();
  } catch (error) {
    console.error(`Error al importar datos: ${error}`);
    process.exit(1);
  }
};

// Función para destruir datos
const destroyData = async () => {
  try {
    // Limpiar la base de datos
    await User.deleteMany();
    await License.deleteMany();

    console.log('Datos destruidos exitosamente.');
    process.exit();
  } catch (error) {
    console.error(`Error al destruir datos: ${error}`);
    process.exit(1);
  }
};

// Lógica para ejecutar el script
(async () => {
  await connectDB();

  if (process.argv[2] === '-d') {
    // Si se pasa el argumento -d (destroy)
    await destroyData();
  } else {
    // Por defecto, importar
    await importData();
  }
})();