/**
 * Konto & Sync: Anmeldung, Abgleich, Gruppen (anlegen, beitreten, Rollen), Teilen.
 * Ohne Anmeldung funktioniert die App weiter rein lokal.
 */
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import { useSync } from '../components/SyncContext.jsx';
import { signIn, signUp, resetPassword, signOut, myGroups, createGroup, joinGroup, setRole, leaveGroup } from '../lib/cloud.js';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';

const ROLES = ['manager', 'member', 'inspector', 'auditor'];
const WRITE_ROLES = ['manager', 'member', 'inspector'];

function Login() {
  const { t } = useI18n();
  const sync = useSync();
  const [f, setF] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (okText) setMsg({ kind: 'ok', text: okText }); await sync.refresh(); }
    catch (e) { setMsg({ kind: 'error', text: t('acc.err', { msg: e.message || String(e) }) }); }
    setBusy(false);
  };
  return (
    <Card title={t('acc.login')}>
      <p className="muted">{t('acc.why')}</p>
      <Field label={t('meet.email')}><input type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value.trim() })} /></Field>
      <Field label={t('acc.password')} hint={t('acc.passwordHint')}><input type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={busy || !f.email || f.password.length < 8} onClick={() => act(() => signIn(f.email, f.password))}>{t('acc.signIn')}</button>
        <button type="button" className="btn" disabled={busy || !f.email || f.password.length < 8} onClick={() => act(() => signUp(f.email, f.password), t('acc.checkMail'))}>{t('acc.signUp')}</button>
        <button type="button" className="btn-link" disabled={busy || !f.email} onClick={() => act(() => resetPassword(f.email), t('acc.resetSent'))}>{t('acc.reset')}</button>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </Card>
  );
}

function Groups() {
  const { t } = useI18n();
  const settings = useSettings();
  const sync = useSync();
  const [groups, setGroups] = useState(null);
  const [f, setF] = useState({ name: '', code: '', myName: '' });
  const [msg, setMsg] = useState(null);
  const load = async () => { try { setGroups(await myGroups()); } catch (e) { setMsg({ kind: 'error', text: t('acc.err', { msg: e.message }) }); } };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn, okText) => {
    setMsg(null);
    try { await fn(); await load(); if (okText) setMsg({ kind: 'ok', text: okText }); await sync.syncNow(); }
    catch (e) { setMsg({ kind: 'error', text: t('acc.err', { msg: e.message || String(e) }) }); }
  };
  const share = async (g) => {
    const text = t('grp.inviteText', { name: g.name, code: g.invite_code, url: `${location.origin}/#/konto` });
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* abgebrochen */ } }
    try { await navigator.clipboard.writeText(text); setMsg({ kind: 'ok', text: t('grp.copied') }); } catch { setMsg({ kind: 'info', text }); }
  };
  if (!groups) return null;
  const writable = groups.filter((g) => WRITE_ROLES.includes(g.myRole));
  return (
    <>
      <Card title={t('grp.share')}>
        <p className="muted">{t('grp.shareHint')}</p>
        <select value={settings.shareGroupId || ''} onChange={(e) => settings.update('shareGroupId', e.target.value || null)}>
          <option value="">{t('grp.private')}</option>
          {writable.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Card>
      {groups.map((g) => (
        <Card key={g.id} title={g.name}>
          <p>{t('grp.myRole')}: <strong>{t(`role.${g.myRole}`)}</strong> · {t('grp.members', { n: g.members.length })}</p>
          {g.myRole === 'manager' && (
            <>
              <p>{t('grp.code')}: <code className="big">{g.invite_code}</code></p>
              <button type="button" className="btn" onClick={() => share(g)}>{t('grp.invite')}</button>
              <ul className="list">
                {g.members.map((m) => (
                  <li key={m.user_id} className="list-item row-between">
                    <span>{m.display_name || t('grp.noName')}{m.user_id === g.me ? ` (${t('grp.you')})` : ''}</span>
                    <select value={m.role} style={{ width: 'auto' }} onChange={(e) => act(() => setRole(g.id, m.user_id, e.target.value))}>
                      {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted">{t(`role.${g.myRole}.desc`)}</p>
          <button type="button" className="btn-link" onClick={() => window.confirm(t('grp.leaveConfirm', { name: g.name })) && act(() => leaveGroup(g.id))}>{t('grp.leave')}</button>
        </Card>
      ))}
      <Card title={t('grp.newOrJoin')}>
        <Field label={t('grp.myName')} hint={t('grp.myNameHint')}><input value={f.myName} onChange={(e) => setF({ ...f, myName: e.target.value })} /></Field>
        <Field label={t('grp.name')}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('grp.namePh')} /></Field>
        <button type="button" className="btn" disabled={!f.name.trim()} onClick={() => act(async () => { const r = await createGroup(f.name.trim(), f.myName.trim()); settings.update('shareGroupId', r.id); setF({ ...f, name: '' }); }, t('grp.created'))}>{t('grp.create')}</button>
        <Field label={t('grp.code')}><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="A1B2C3D4" maxLength={8} /></Field>
        <button type="button" className="btn" disabled={f.code.trim().length < 6} onClick={() => act(async () => { await joinGroup(f.code.trim(), f.myName.trim()); setF({ ...f, code: '' }); }, t('grp.joined'))}>{t('grp.join')}</button>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </Card>
    </>
  );
}

export default function Account() {
  const { t, date } = useI18n();
  const settings = useSettings();
  const sync = useSync();
  if (!sync.configured) {
    return (
      <div className="page">
        <PageHeader title={t('acc.title')} back />
        <Notice kind="warn">{t('acc.notConfigured')}</Notice>
      </div>
    );
  }
  return (
    <div className="page">
      <PageHeader title={t('acc.title')} back />
      {!sync.user ? <Login /> : (
        <>
          <Card title={t('acc.status')}>
            <p>{t('acc.signedInAs', { email: sync.user.email })}</p>
            <p className="muted">{sync.lastSync ? t('acc.lastSync', { d: date(sync.lastSync) }) : t('acc.neverSynced')} · {t('acc.pending', { n: sync.pending })}</p>
            {sync.result && <p className="muted">{t('acc.result', { up: sync.result.uploaded, down: sync.result.received })}{sync.result.rejected ? ` · ${t('acc.rejected', { n: sync.result.rejected })}` : ''}</p>}
            {sync.error && <Notice kind="error">{t('acc.err', { msg: sync.error })}</Notice>}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={sync.syncNow} disabled={sync.busy}>{sync.busy ? t('acc.syncing') : t('acc.syncNow')}</button>
              <button type="button" className="btn" onClick={async () => { await signOut(); await sync.refresh(); }}>{t('acc.signOut')}</button>
            </div>
            <label className="check"><input type="checkbox" checked={!!settings.autoSync} onChange={(e) => settings.update('autoSync', e.target.checked)} /><span>{t('acc.auto')}</span></label>
          </Card>
          <Groups />
        </>
      )}
    </div>
  );
}
