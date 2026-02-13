import { api } from "./client";
import { ProfileItem } from "./types";

/**
 * Получить список профилей
 */
export async function listProfiles(): Promise<ProfileItem[]> {
  const { data } = await api.get<ProfileItem[]>("/profiles");
  return data;
}

/**
 * Сохранить новый профиль
 */
export async function saveProfile(
  name: string,
  comment?: string
): Promise<{ slug: string; name: string }> {
  const { data } = await api.post<{ slug: string; name: string }>("/profiles", {
    name,
    comment: comment ?? ""
  });
  return data;
}

/**
 * Загрузить профиль
 */
export async function loadProfile(slug: string): Promise<{ slug: string; loaded: boolean }> {
  const { data } = await api.post<{ slug: string; loaded: boolean }>(`/profiles/${slug}/load`);
  return data;
}

/**
 * Удалить профиль
 */
export async function deleteProfile(slug: string): Promise<void> {
  await api.delete(`/profiles/${slug}`);
}

/**
 * Обновить комментарий профиля
 */
export async function updateProfile(
  slug: string,
  comment?: string
): Promise<{ slug: string; updated: boolean }> {
  const payload = comment !== undefined ? { comment } : {};
  const { data } = await api.post<{ slug: string; updated: boolean }>(
    `/profiles/${slug}/update`,
    payload
  );
  return data;
}
