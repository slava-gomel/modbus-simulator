// Re-export типов
export type * from "./types";

// Re-export клиента и утилит
export { api, setAuth } from "./client";

// Re-export функций регистров
export { fetchRegisters, writeSingle, writeBatch } from "./registers";

// Re-export функций генераторов
export { fetchSignalGenerators, saveSignalGenerators } from "./generators";

// Re-export функций профилей
export { listProfiles, saveProfile, loadProfile, deleteProfile, updateProfile } from "./profiles";

// Re-export функций сервера
export {
  fetchConfig,
  updateConfig,
  fetchServerStatus,
  startServer,
  stopServer,
  fetchModbusLog,
  authRequired
} from "./server";
