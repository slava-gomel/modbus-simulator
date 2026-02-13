import React, { useState } from "react";
import { useProfiles } from "./ProfilesContext";

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

  const handleSave = async () => {
    await saveNewProfile(profileName, profileComment);
    setProfileName("");
    setProfileComment("");
  };

  return (
    <section className="panel panel-profiles">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <div className="panel-title">Профили</div>
            <div className="panel-subtitle">
              Сохраняйте и переключайте наборы конфигурации и регистров
            </div>
          </div>
          <div className="panel-toolbar">
            <button
              type="button"
              className="btn btn-sm btn-icon"
              onClick={() => void refreshProfiles()}
            >
              Обновить список
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
              Сохранить текущий профиль
            </button>
          </div>

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
                  >
                    Загрузить
                  </button>
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={() => void updateProfileBySlug(p.slug)}
                    disabled={profilesLoading}
                  >
                    Обновить из текущей конфигурации
                  </button>
                  {p.slug !== "default" && (
                    <button
                      type="button"
                      className="btn-chip"
                      data-variant="danger"
                      onClick={() => void deleteProfileBySlug(p.slug)}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfilesPanel);
