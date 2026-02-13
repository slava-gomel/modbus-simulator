import { api } from "./client";
import { SignalGeneratorConfig, GeneratorsPayload } from "./types";

/**
 * Получить список генераторов сигналов
 */
export async function fetchSignalGenerators(): Promise<SignalGeneratorConfig[]> {
  const { data } = await api.get<GeneratorsPayload>("/generators");
  return data.generators;
}

/**
 * Сохранить конфигурацию генераторов
 */
export async function saveSignalGenerators(
  generators: SignalGeneratorConfig[]
): Promise<SignalGeneratorConfig[]> {
  const { data } = await api.put<GeneratorsPayload>("/generators", { generators });
  return data.generators;
}
