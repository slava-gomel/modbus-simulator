import React, { useState } from "react";
import { ArrowPathIcon, BookmarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/20/solid";
import { useProfiles } from "./ProfilesContext";
import { ConfirmDialog, Skeleton } from "../../shared/components";

const ProfilesPanel: React.FC = () => {
  const {
    profiles,
    currentProfileSlug,
    profilesLoading,
    profilesError,
    refreshProfiles,
    saveNewProfile,
    loadProfileBySlug,
    updateProfileBySlug,
    deleteProfileBySlug
  } = useProfiles();

  const [profileName, setProfileName] = useState("");
  const [profileComment, setProfileComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<string | null>(null);

  const handleSave = async () => {
    await saveNewProfile(profileName, profileComment);
    setProfileName("");
    setProfileComment("");
  };

  const profileToDelete = confirmDelete
    ? profiles.find((p) => p.slug === confirmDelete)
    : null;

  const profileToUpdate = confirmUpdate
    ? profiles.find((p) => p.slug === confirmUpdate)
    : null;

  return (
    <section className="panel panel-profiles">
      <div className="panel-inner">
        <div className="panel-header">
          <div className="panel-title">Профили</div>
          <div className="panel-toolbar">
            <button
              type="button"
              className="btn-chip"
              onClick={() => void refreshProfiles()}
              title="Обновить список профилей"
            >
              <ArrowPathIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {profilesError && (
          <div className="error-text">
            <span className="error-dot" />
            {profilesError}
          </div>
        )}

        <div className="panel-section">
          <div className="input-row">
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="profile-name">
                Имя профиля
              </label>
              <input
                id="profile-name"
                className="field-input"
                type="text"
                placeholder="Например: demo‑проект"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="profile-comment">
                Комментарий
              </label>
              <input
                id="profile-comment"
                className="field-input"
                type="text"
                placeholder="Опционально"
                value={profileComment}
                onChange={(e) => setProfileComment(e.target.value)}
              />
            </div>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void handleSave()}
              disabled={profilesLoading || !profileName.trim()}
            >
              <BookmarkIcon />
              Сохранить профиль
            </button>
          </div>

          {profilesLoading && profiles.length === 0 && (
            <Skeleton variant="rect" rows={2} height="2.2rem" />
          )}

          <ul className="profiles-list">
            {profiles.map((p) => (
              <li
                key={p.slug}
                className={
                  "profiles-item" +
                  (p.slug === currentProfileSlug ? " profiles-item-current" : "")
                }
              >
                <div className="profiles-item-main">
                  <span className="profiles-name">{p.name}</span>
                  {p.comment && (
                    <span className="profiles-comment">{p.comment}</span>
                  )}
                </div>
                <div className="profiles-actions">
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => void loadProfileBySlug(p.slug)}
                    disabled={profilesLoading}
                    title="Загрузить профиль"
                  >
                    <ArrowDownTrayIcon style={{ width: 13, height: 13 }} />
                    Загрузить
                  </button>
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => setConfirmUpdate(p.slug)}
                    disabled={profilesLoading}
                    title="Обновить из текущей конфигурации"
                  >
                    <ArrowUpTrayIcon style={{ width: 13, height: 13 }} />
                    Обновить
                  </button>
                  {p.slug !== "default" && (
                    <button
                      type="button"
                      className="btn-chip"
                      data-variant="danger"
                      onClick={() => setConfirmDelete(p.slug)}
                      title="Удалить профиль"
                    >
                      <TrashIcon style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удалить профиль?"
        message={`Профиль «${profileToDelete?.name || confirmDelete}» будет удалён безвозвратно.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) void deleteProfileBySlug(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmUpdate}
        title="Обновить профиль?"
        message={`Профиль «${profileToUpdate?.name || confirmUpdate}» будет перезаписан текущей конфигурацией, регистрами и генераторами.`}
        confirmLabel="Обновить"
        onConfirm={() => {
          if (confirmUpdate) void updateProfileBySlug(confirmUpdate);
          setConfirmUpdate(null);
        }}
        onCancel={() => setConfirmUpdate(null)}
      />
    </section>
  );
};

export default React.memo(ProfilesPanel);
