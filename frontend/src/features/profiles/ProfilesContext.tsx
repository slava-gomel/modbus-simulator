import React, { createContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { ProfileItem, listProfiles, saveProfile, loadProfile, updateProfile, deleteProfile } from "../../api";
import { useLogsContext } from "../logs";

interface ProfilesContextValue {
  profiles: ProfileItem[];
  currentProfileSlug: string;
  profilesLoading: boolean;
  profilesError: string | null;
  refreshProfiles: () => Promise<void>;
  saveNewProfile: (name: string, comment: string) => Promise<void>;
  loadProfileBySlug: (slug: string) => Promise<void>;
  updateProfileBySlug: (slug: string) => Promise<void>;
  deleteProfileBySlug: (slug: string) => Promise<void>;
  setCurrentProfileSlug: (slug: string) => void;
}

const ProfilesContext = createContext<ProfilesContextValue | undefined>(undefined);

export const ProfilesProvider: React.FC<{
  children: ReactNode;
  onProfileLoad?: () => Promise<void>;
}> = ({ children, onProfileLoad }) => {
  const { pushLog } = useLogsContext();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [currentProfileSlug, setCurrentProfileSlug] = useState<string>("default");
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    try {
      setProfilesError(null);
      const list = await listProfiles();
      setProfiles(list);
      // Если текущий профиль ещё не выбран, но есть default – считаем его активным.
      if (!currentProfileSlug) {
        const def = list.find((p) => p.slug === "default");
        if (def) setCurrentProfileSlug(def.slug);
      }
    } catch (e) {
      setProfilesError("Не удалось загрузить список профилей");
      pushLog("error", "Список профилей: ошибка");
    }
  }, [currentProfileSlug, pushLog]);

  const saveNewProfile = useCallback(async (name: string, comment: string) => {
    if (!name.trim()) return;
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      const saved = await saveProfile(name.trim(), comment.trim());
      setCurrentProfileSlug(saved.slug);
      await refreshProfiles();
      pushLog(
        "profile_save",
        `Профиль «${saved.name}» сохранён (slug: ${saved.slug})`
      );
      toast.success(`Профиль «${saved.name}» сохранён`);
    } catch (e) {
      setProfilesError("Не удалось сохранить профиль");
      pushLog("error", "Сохранение профиля: ошибка");
      toast.error("Не удалось сохранить профиль");
    } finally {
      setProfilesLoading(false);
    }
  }, [pushLog, refreshProfiles]);

  const loadProfileBySlug = useCallback(async (slug: string) => {
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      await loadProfile(slug);
      // После загрузки профиля нужно обновить конфигурацию и генераторы
      if (onProfileLoad) {
        await onProfileLoad();
      }
      setCurrentProfileSlug(slug);
      await refreshProfiles();
      const currentProfile = profiles.find((p) => p.slug === slug);
      const profileLabel = currentProfile?.name || slug;
      pushLog("profile_load", `Профиль «${profileLabel}» загружен`);
      toast.success(`Профиль «${profileLabel}» загружен`);
    } catch (e) {
      setProfilesError("Не удалось загрузить профиль");
      pushLog("error", "Загрузка профиля: ошибка");
      toast.error("Не удалось загрузить профиль");
    } finally {
      setProfilesLoading(false);
    }
  }, [onProfileLoad, pushLog, refreshProfiles, profiles]);

  const updateProfileBySlug = useCallback(async (slug: string) => {
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      await updateProfile(slug);
      await refreshProfiles();
      setCurrentProfileSlug(slug);
      const currentProfile = profiles.find((p) => p.slug === slug) ?? { name: slug, slug, comment: "" };
      pushLog(
        "profile_update",
        `Профиль «${currentProfile.name}» обновлён из текущей конфигурации`
      );
      toast.success(`Профиль «${currentProfile.name}» обновлён`);
    } catch (e) {
      setProfilesError("Не удалось обновить профиль");
      pushLog("error", "Обновление профиля: ошибка");
      toast.error("Не удалось обновить профиль");
    } finally {
      setProfilesLoading(false);
    }
  }, [pushLog, refreshProfiles, profiles]);

  const deleteProfileBySlug = useCallback(async (slug: string) => {
    try {
      setProfilesError(null);
      await deleteProfile(slug);
      await refreshProfiles();
      if (slug === currentProfileSlug) {
        setCurrentProfileSlug("default");
      }
      toast.success("Профиль удалён");
    } catch (e) {
      setProfilesError("Не удалось удалить профиль");
      pushLog("error", "Удаление профиля: ошибка");
      toast.error("Не удалось удалить профиль");
    }
  }, [pushLog, refreshProfiles, currentProfileSlug]);

  return (
    <ProfilesContext.Provider
      value={{
        profiles,
        currentProfileSlug,
        profilesLoading,
        profilesError,
        refreshProfiles,
        saveNewProfile,
        loadProfileBySlug,
        updateProfileBySlug,
        deleteProfileBySlug,
        setCurrentProfileSlug
      }}
    >
      {children}
    </ProfilesContext.Provider>
  );
};

export const useProfiles = (): ProfilesContextValue => {
  const context = React.useContext(ProfilesContext);
  if (!context) {
    throw new Error("useProfiles must be used within ProfilesProvider");
  }
  return context;
};
