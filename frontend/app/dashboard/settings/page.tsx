"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface TenantProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  forclusion_alert_days: number;
  active_payers: string;
  is_active: boolean;
  created_at: string;
}

interface Agent {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin:    "Administrateur",
  biller:   "Agent BAF",
  auditor:  "Auditeur",
  director: "Directeur financier",
};

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin:    { bg: "#EEEDFB", color: "#1E40AF" },
  biller:   { bg: "#F0FDF4", color: "#166534" },
  auditor:  { bg: "#FFF7ED", color: "#9A3412" },
  director: { bg: "#F5F3FF", color: "#6D28D9" },
};

const ALL_PAYERS = ["CNOPS", "CNSS", "FAR"];

export default function SettingsPage() {
  const [activeTab, setActiveTab]   = useState("profil");
  const [tenant, setTenant]         = useState<TenantProfile | null>(null);
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "", email: "", phone: "", address: "", city: ""
  });

  // Notifications form
  const [forclusionDays, setForclusionDays] = useState(7);

  // Payer config
  const [activePayers, setActivePayers] = useState<string[]>(ALL_PAYERS);

  // Password form
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });

  // New agent form
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentForm, setAgentForm] = useState({ full_name: "", email: "", password: "", role: "biller" });

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("sihaiq_tenant_id") : null;
  const token    = typeof window !== "undefined" ? localStorage.getItem("sihaiq_token") : null;
  const userId   = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("sihaiq_user") || "{}").id : null;

  useEffect(() => {
    if (!tenantId || !token) { window.location.href = "/auth/login"; return; }
    const load = async () => {
      try {
        const [tr, ur] = await Promise.all([
          fetch(`${API_URL}/tenants/${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/tenants/${tenantId}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (tr.ok) {
          const t: TenantProfile = await tr.json();
          setTenant(t);
          setProfileForm({
            name:    t.name    ?? "",
            email:   t.email   ?? "",
            phone:   t.phone   ?? "",
            address: t.address ?? "",
            city:    t.city    ?? "",
          });
          setForclusionDays(t.forclusion_alert_days ?? 7);
          setActivePayers(t.active_payers ? t.active_payers.split(",") : ALL_PAYERS);
        }
        if (ur.ok) setAgents(await ur.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [tenantId, token]);

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error("Erreur sauvegarde");
      // Update local state so topbar reflects new name immediately
      setTenant(prev => prev ? { ...prev, ...profileForm } : prev);
      showMsg("✅ Profil mis à jour avec succès.");
    } catch { showMsg("❌ Erreur lors de la sauvegarde."); }
    finally { setSaving(false); }
  }

  async function saveNotifications() {
    setSaving(true);
    try {
      const payersStr = activePayers.join(",");
      const res = await fetch(`${API_URL}/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ forclusion_alert_days: forclusionDays, active_payers: payersStr }),
      });
      if (!res.ok) throw new Error("Erreur sauvegarde");
      showMsg("✅ Préférences enregistrées.");
    } catch { showMsg("❌ Erreur lors de la sauvegarde."); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (pwForm.newPw !== pwForm.confirm) { showMsg("❌ Les mots de passe ne correspondent pas."); return; }
    if (pwForm.newPw.length < 8) { showMsg("❌ Le mot de passe doit contenir au moins 8 caractères."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/tenants/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId, current_password: pwForm.current, new_password: pwForm.newPw }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur");
      }
      showMsg("✅ Mot de passe modifié avec succès.");
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      showMsg("❌ " + message);
    }
    finally { setSaving(false); }
  }

  async function createAgent() {
    if (!agentForm.full_name || !agentForm.email || !agentForm.password) {
      showMsg("❌ Remplissez tous les champs."); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...agentForm, tenant_id: tenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur création");
      }
      showMsg("✅ Compte créé avec succès.");
      setShowAgentForm(false);
      setAgentForm({ full_name: "", email: "", password: "", role: "biller" });
      const ur = await fetch(`${API_URL}/tenants/${tenantId}/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (ur.ok) setAgents(await ur.json());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      showMsg("❌ " + message);
    }
    finally { setSaving(false); }
  }

  async function toggleAgent(agentId: string, isActive: boolean) {
    try {
      await fetch(`${API_URL}/tenants/${tenantId}/users/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !isActive }),
      });
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !isActive } : a));
    } catch { showMsg("❌ Erreur mise à jour agent."); }
  }

  async function deleteAgent(agentId: string, name: string) {
    if (!confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) return;
    try {
      await fetch(`${API_URL}/tenants/${tenantId}/users/${agentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(prev => prev.filter(a => a.id !== agentId));
      showMsg("✅ Compte supprimé.");
    } catch { showMsg("❌ Erreur suppression."); }
  }

  const tabs = [
    { key: "profil",        label: "🏥 Profil établissement" },
    { key: "agents",        label: "👥 Gestion des agents" },
    { key: "notifications", label: "🔔 Alertes & préférences" },
    { key: "securite",      label: "🔒 Sécurité" },
  ];

  return (
    <div style={s.shell}>

      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbTop}>
          <div style={s.sbBrand}>
            <div style={s.sbMark}>
              <svg width="14" height="14" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" fill="white"/>
                <circle cx="22" cy="22" r="2.8" fill="#5B4FE8"/>
                <line x1="22" y1="7"    x2="22" y2="14"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="22" y1="30"   x2="22" y2="37"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="7"  y1="22"   x2="14" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="30" y1="22"   x2="37" y2="22"   stroke="white"   strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="12"   y1="12"   x2="16.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="27.5" y1="27.5" x2="32"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="32"   y1="12"   x2="27.5" y2="16.5" stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
                <line x1="16.5" y1="27.5" x2="12"   y2="32"   stroke="#C7C2F7" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={s.sbName}>Siha<span style={s.sbIQ}>IQ</span></div>
              <div style={s.sbRole}>RCM Platform</div>
            </div>
          </div>
        </div>
        <nav style={s.sbNav}>
          <div style={s.sbSec}>Principal</div>
          <Link href="/dashboard"            style={s.sbItem}> Tableau de bord</Link>
          <Link href="/dashboard/dossiers"   style={s.sbItem}> Dossiers BAF</Link>
          <Link href="/dashboard/patients"   style={s.sbItem}> Patients</Link>
          <Link href="/dashboard/prediction" style={s.sbItem}> Prédiction IA</Link>
          <div style={s.sbSec}>Analyse</div>
          <Link href="/dashboard/performance" style={s.sbItem}> Performance</Link>
          <Link href="/dashboard/forclusion"  style={s.sbItem}> Forclusion</Link>
          <Link href="/dashboard/encours"     style={s.sbItem}> Encours A/R</Link>
          <div style={s.sbSec}>Système</div>
          <Link href="/dashboard/financier" style={s.sbItem}> Activité financière</Link>
                    <Link href="/dashboard/comptabilite" style={s.sbItem}>📒 Comptabilité DAF</Link>
          <Link href="/dashboard/audit"    style={s.sbItem}> Journal d&apos;audit</Link>
          <div style={{ ...s.sbItem, ...s.sbItemActive }}> Paramètres</div>
        </nav>
        <div style={s.sbFooter}>
          <button style={s.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/auth/login"; }}>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={s.main}>

        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <div style={s.topTitle}>Paramètres</div>
            <div style={s.topSub}>{tenant?.name ?? "Chargement..."}</div>
          </div>
          {msg && (
            <div style={{ ...s.msgBanner, background: msg.startsWith("✅") ? "#DCFCE7" : "#FEE2E2", color: msg.startsWith("✅") ? "#166534" : "#991B1B" }}>
              {msg}
            </div>
          )}
        </div>

        <div style={s.content}>
          <div style={s.layout}>

            {/* TAB NAV */}
            <div style={s.tabNav}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  style={activeTab === t.key ? { ...s.tabBtn, ...s.tabBtnActive } : s.tabBtn}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div style={s.tabContent}>

              {/* ── PROFIL ── */}
              {activeTab === "profil" && (
                <div style={s.card}>
                  <div style={s.cardTitle}>Profil de l&apos;établissement</div>
                  <div style={s.cardSub}>Informations affichées sur les bordereaux et rapports</div>
                  {loading ? <div style={s.loading}>Chargement...</div> : (
                    <>
                      <div style={s.formGrid}>
                        <div style={s.formGroup}>
                          <label style={s.label}>Nom de l&apos;établissement *</label>
                          <input style={s.input} value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Email de contact *</label>
                          <input style={s.input} type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Téléphone</label>
                          <input style={s.input} placeholder="+212 5XX XXX XXX" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Ville</label>
                          <input style={s.input} placeholder="Casablanca" value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} />
                        </div>
                        <div style={{ ...s.formGroup, gridColumn: "1 / -1" }}>
                          <label style={s.label}>Adresse complète</label>
                          <input style={s.input} placeholder="123 Rue Mohammed V, Quartier..." value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
                        </div>
                      </div>
                      <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={saveProfile}>
                        {saving ? "Enregistrement..." : "Enregistrer le profil"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── AGENTS ── */}
              {activeTab === "agents" && (
                <div style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={s.cardTitle}>Gestion des agents</div>
                      <div style={s.cardSub}>{agents.length} compte{agents.length > 1 ? "s" : ""} dans votre établissement</div>
                    </div>
                    <button style={s.addBtn} onClick={() => setShowAgentForm(!showAgentForm)}>
                      + Nouveau compte
                    </button>
                  </div>

                  {showAgentForm && (
                    <div style={s.agentForm}>
                      <div style={s.agentFormTitle}>Créer un nouveau compte</div>
                      <div style={s.formGrid}>
                        <div style={s.formGroup}>
                          <label style={s.label}>Nom complet *</label>
                          <input style={s.input} placeholder="Mohamed S..." value={agentForm.full_name} onChange={e => setAgentForm({ ...agentForm, full_name: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Email *</label>
                          <input style={s.input} type="email" placeholder="agent@clinique.ma" value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Mot de passe *</label>
                          <input style={s.input} type="password" placeholder="Min. 8 caractères" value={agentForm.password} onChange={e => setAgentForm({ ...agentForm, password: e.target.value })} />
                        </div>
                        <div style={s.formGroup}>
                          <label style={s.label}>Rôle *</label>
                          <select style={s.input} value={agentForm.role} onChange={e => setAgentForm({ ...agentForm, role: e.target.value })}>
                            <option value="biller">Agent BAF</option>
                            <option value="admin">Responsable de Cellule ...</option>
                            <option value="auditor">Auditeur</option>
                            <option value="Responsable de BAF">Chef de BAF</option>
                            <option value="director">Directeur financier</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <button style={s.saveBtn} disabled={saving} onClick={createAgent}>
                          {saving ? "Création..." : "Créer le compte"}
                        </button>
                        <button style={s.cancelBtn} onClick={() => setShowAgentForm(false)}>Annuler</button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    {agents.map(agent => {
                      const rs = ROLE_STYLES[agent.role] ?? { bg: "#F3F4F6", color: "#5C5852" };
                      return (
                        <div key={agent.id} style={s.agentRow}>
                          <div style={s.agentAvatar}>
                            {agent.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={s.agentName}>{agent.full_name}</div>
                            <div style={s.agentEmail}>{agent.email}</div>
                          </div>
                          <span style={{ ...s.roleBadge, background: rs.bg, color: rs.color }}>
                            {ROLE_LABELS[agent.role] ?? agent.role}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              style={{ ...s.toggleBtn, background: agent.is_active ? "#DCFCE7" : "#FEE2E2", color: agent.is_active ? "#166534" : "#991B1B" }}
                              onClick={() => toggleAgent(agent.id, agent.is_active)}
                            >
                              {agent.is_active ? "Actif" : "Inactif"}
                            </button>
                            <button style={s.deleteAgentBtn} onClick={() => deleteAgent(agent.id, agent.full_name)}>
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === "notifications" && (
                <div style={s.card}>
                  <div style={s.cardTitle}>Alertes & Préférences</div>
                  <div style={s.cardSub}>Configurez les seuils d&apos;alerte forclusion et les caisses actives</div>

                  <div style={s.settingSection}>
                    <div style={s.settingTitle}>⏰ Seuil d&apos;alerte forclusion</div>
                    <div style={s.settingDesc}>Recevoir une alerte quand un dossier est à moins de X jours de la forclusion</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                      {[3, 7, 10, 15].map(d => (
                        <button
                          key={d}
                          style={{ ...s.dayBtn, ...(forclusionDays === d ? s.dayBtnActive : {}) }}
                          onClick={() => setForclusionDays(d)}
                        >
                          J-{d}
                        </button>
                      ))}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#5C5852" }}>Personnalisé :</span>
                        <input
                          style={{ ...s.input, width: 70 }}
                          type="number"
                          min={1}
                          max={30}
                          value={forclusionDays}
                          onChange={e => setForclusionDays(parseInt(e.target.value) || 7)}
                        />
                        <span style={{ fontSize: 12, color: "#5C5852" }}>jours</span>
                      </div>
                    </div>
                  </div>

                  <div style={s.settingSection}>
                    <div style={s.settingTitle}>🏦 Caisses actives</div>
                    <div style={s.settingDesc}>Sélectionnez les organismes payeurs avec lesquels votre établissement travaille</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      {ALL_PAYERS.map(p => (
                        <button
                          key={p}
                          style={{ ...s.payerBtn, ...(activePayers.includes(p) ? s.payerBtnActive : {}) }}
                          onClick={() => {
                            if (activePayers.includes(p)) {
                              if (activePayers.length > 1) setActivePayers(activePayers.filter(x => x !== p));
                            } else {
                              setActivePayers([...activePayers, p]);
                            }
                          }}
                        >
                          {activePayers.includes(p) ? "✓ " : ""}{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={saveNotifications}>
                    {saving ? "Enregistrement..." : "Enregistrer les préférences"}
                  </button>
                </div>
              )}

              {/* ── SECURITE ── */}
              {activeTab === "securite" && (
                <div style={s.card}>
                  <div style={s.cardTitle}>Sécurité du compte</div>
                  <div style={s.cardSub}>Modifier votre mot de passe de connexion</div>

                  <div style={{ ...s.formGrid, maxWidth: 440 }}>
                    <div style={{ ...s.formGroup, gridColumn: "1 / -1" }}>
                      <label style={s.label}>Mot de passe actuel *</label>
                      <input style={s.input} type="password" placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Nouveau mot de passe *</label>
                      <input style={s.input} type="password" placeholder="Min. 8 caractères" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} />
                    </div>
                    <div style={s.formGroup}>
                      <label style={s.label}>Confirmer le nouveau mot de passe *</label>
                      <input style={s.input} type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                    </div>
                  </div>

                  {pwForm.newPw && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                    <div style={s.pwMismatch}>⚠️ Les mots de passe ne correspondent pas</div>
                  )}

                  <button
                    style={{ ...s.saveBtn, marginTop: 16, opacity: saving ? 0.6 : 1 }}
                    disabled={saving}
                    onClick={changePassword}
                  >
                    {saving ? "Modification..." : "Modifier le mot de passe"}
                  </button>

                  <div style={s.securityInfo}>
                    <div style={s.securityInfoTitle}>🔒 Informations de sécurité</div>
                    <div style={s.securityInfoItem}>• Toutes les actions sont enregistrées dans le journal d&apos;audit</div>
                    <div style={s.securityInfoItem}>• Conforme CNDP Loi 09-08 — données souveraines</div>
                    <div style={s.securityInfoItem}>• Sessions JWT avec expiration automatique</div>
                    <div style={s.securityInfoItem}>• Mots de passe chiffrés avec bcrypt</div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:   { display: "flex", height: "100vh", overflow: "hidden", background: "#F2F1EE", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" },
  sidebar: { width: 210, flexShrink: 0, background: "#fff", borderRight: "0.5px solid #E5E3DD", display: "flex", flexDirection: "column" },
  sbTop:   { padding: "16px 14px 12px", borderBottom: "0.5px solid #F2F1EE" },
  sbBrand: { display: "flex", alignItems: "center", gap: 9 },
  sbMark:  { width: 28, height: 28, background: "#5B4FE8", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sbName:  { fontSize: 15, fontWeight: 300, color: "#1A1814", letterSpacing: "-0.02em", lineHeight: 1.1 },
  sbIQ:    { fontWeight: 800, color: "#5B4FE8" },
  sbRole:  { fontSize: 9, fontWeight: 600, color: "#9C9890", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 },
  sbNav:   { flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column" },
  sbSec:   { fontSize: 9, fontWeight: 600, color: "#C7C2F7", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 8px 4px" },
  sbItem:  { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", color: "#5C5852", fontSize: 12, textDecoration: "none", marginBottom: 1 },
  sbItemActive: { background: "#EEEDFB", color: "#5B4FE8", fontWeight: 500 },
  sbFooter:{ padding: "10px 8px", borderTop: "0.5px solid #F2F1EE" },
  logoutBtn: { width: "100%", padding: "8px", borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontFamily: "inherit" },

  main:    { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:  { background: "#fff", borderBottom: "0.5px solid #E5E3DD", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  topTitle:{ fontSize: 14, fontWeight: 600, color: "#1A1814" },
  topSub:  { fontSize: 11, color: "#9C9890", marginTop: 2 },
  msgBanner: { fontSize: 12, padding: "7px 14px", borderRadius: 8, fontWeight: 500 },

  content: { flex: 1, overflowY: "auto", padding: "20px" },
  layout:  { display: "flex", gap: 20, alignItems: "flex-start" },

  tabNav:  { width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 },
  tabBtn:  { textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#5C5852", fontFamily: "inherit" },
  tabBtnActive: { background: "#EEEDFB", color: "#5B4FE8", fontWeight: 500 },

  tabContent: { flex: 1 },
  card:    { background: "#fff", border: "0.5px solid #E5E3DD", borderRadius: 12, padding: "24px" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#1A1814", marginBottom: 4 },
  cardSub:   { fontSize: 12, color: "#9C9890", marginBottom: 20 },
  loading:   { fontSize: 13, color: "#9C9890", padding: "20px 0" },

  formGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label:     { fontSize: 10, fontWeight: 600, color: "#5C5852", textTransform: "uppercase", letterSpacing: "0.06em" },
  input:     { padding: "9px 12px", border: "0.5px solid #E5E3DD", borderRadius: 8, fontSize: 13, color: "#1A1814", fontFamily: "inherit", outline: "none", background: "#FAFAFA" },
  saveBtn:   { marginTop: 20, padding: "10px 24px", background: "#5B4FE8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { marginTop: 20, padding: "10px 24px", background: "#fff", color: "#5C5852", border: "0.5px solid #E5E3DD", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  addBtn:    { padding: "7px 14px", background: "#5B4FE8", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  agentForm:      { background: "#F8F7FE", border: "0.5px solid #C7C2F7", borderRadius: 10, padding: 16, marginBottom: 16 },
  agentFormTitle: { fontSize: 12, fontWeight: 600, color: "#4A3FD4", marginBottom: 12 },
  agentRow:   { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "0.5px solid #F3F4F6" },
  agentAvatar:{ width: 32, height: 32, borderRadius: "50%", background: "#EEEDFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#5B4FE8", flexShrink: 0 },
  agentName:  { fontSize: 13, fontWeight: 500, color: "#1A1814" },
  agentEmail: { fontSize: 11, color: "#9C9890", marginTop: 2 },
  roleBadge:  { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  toggleBtn:  { fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit" },
  deleteAgentBtn: { fontSize: 14, background: "none", border: "none", cursor: "pointer", color: "#DC2626", padding: "2px 6px" },

  settingSection: { marginBottom: 28, paddingBottom: 28, borderBottom: "0.5px solid #F2F1EE" },
  settingTitle:   { fontSize: 13, fontWeight: 600, color: "#1A1814", marginBottom: 4 },
  settingDesc:    { fontSize: 12, color: "#5C5852" },
  dayBtn:     { padding: "8px 16px", borderRadius: 8, border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  dayBtnActive: { background: "#EEEDFB", color: "#5B4FE8", borderColor: "#C7C2F7", fontWeight: 600 },
  payerBtn:     { padding: "8px 18px", borderRadius: 8, border: "0.5px solid #E5E3DD", background: "#fff", color: "#5C5852", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  payerBtnActive: { background: "#EEEDFB", color: "#5B4FE8", borderColor: "#C7C2F7", fontWeight: 600 },

  pwMismatch: { fontSize: 12, color: "#DC2626", marginTop: 8 },
  securityInfo: { marginTop: 24, background: "#F8F7FE", border: "0.5px solid #C7C2F7", borderRadius: 10, padding: "14px 16px" },
  securityInfoTitle: { fontSize: 12, fontWeight: 600, color: "#4A3FD4", marginBottom: 10 },
  securityInfoItem:  { fontSize: 12, color: "#5C5852", marginBottom: 6 },
};