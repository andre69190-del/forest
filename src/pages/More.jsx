/**
 * „Mehr“: gegliedert in Hilfe & Info · Werkzeuge · Einstellungen · Daten & Sicherung · Rechtliches.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, LANGUAGES } from '../i18n/i18n.jsx';
import { PROFILES } from '../lib/forestry.js';
import { getDeviceKey, APP_VERSION, wipeAllLocalData } from '../lib/evidence.js';
import { useSettings } from '../App.jsx';
import { Card, Field, PageHeader } from '../components/ui.jsx';

function LinkList({ items }) {
  return (
    <ul className="list">
      {items.map(([to, label, desc, external]) => (
        <li key={to}>{external
          ? <a className="list-item" href={to}><strong>{label}</strong>{desc && <span>{desc}</span>}</a>
          : <Link className="list-item" to={to}><strong>{label}</strong>{desc && <span>{desc}</span>}</Link>}
        </li>
      ))}
    </ul>
  );
}

export default function More() {
  const { t, lang, setLang } = useI18n();
  const settings = useSettings();
  const [keyId, setKeyId] = useState('');
  useEffect(() => { getDeviceKey().then((k) => setKeyId(k.keyId)); }, []);

  return (
    <div className="page">
      <PageHeader title={t('more.title')} />

      <h2 className="section-title">{t('more.help')}</h2>
      <LinkList items={[
        ['/info', t('home.info'), t('home.infoDesc')],
        ['/geplant', t('plan.title'), t('plan.short')],
      ]} />
      <button type="button" className="btn btn-quiet" onClick={() => settings.update('welcomeDone', false)}>{t('more.welcomeAgain')}</button>

      <h2 className="section-title">{t('more.tools')}</h2>
      <LinkList items={[
        ['/scannen', t('scan.title'), t('scan.short')],
        ['/nachweise#manipulation', t('tamper.title'), t('tamper.short')],
        ['/pruefen', t('more.audit'), t('more.auditDesc')],
      ]} />

      <h2 className="section-title">{t('more.settings')}</h2>
      <Card>
        <Field label={t('set.language')}>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([code, l]) => <option key={code} value={code}>{l.name}</option>)}
          </select>
        </Field>
        <Field label={t('set.theme')}>
          <select value={settings.theme} onChange={(e) => settings.update('theme', e.target.value)}>
            {['system', 'light', 'dark'].map((k) => <option key={k} value={k}>{t(`set.theme.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t('set.profile')} hint={t('set.profileHint')}>
          <select value={settings.profile} onChange={(e) => settings.update('profile', e.target.value)}>
            {Object.keys(PROFILES).map((k) => <option key={k} value={k}>{t(`profile.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t('trem.detail')} hint={t('trem.detailHint')}>
          <select value={settings.tremDetail} onChange={(e) => settings.update('tremDetail', e.target.value)}>
            {['groups', 'types'].map((d) => <option key={d} value={d}>{t(`trem.detail.${d}`)}</option>)}
          </select>
        </Field>
        <Field label={t('set.gpsAverage')} hint={t('set.gpsAverageHint')}>
          <select value={settings.gpsAverageSec} onChange={(e) => settings.update('gpsAverageSec', Number(e.target.value))}>
            {[5, 10, 20, 30].map((s) => <option key={s} value={s}>{t('set.seconds', { n: s })}</option>)}
          </select>
        </Field>
      </Card>
      <Card title={t('species.title')}>
        <p className="muted">{t('species.settingsHint')}</p>
        <Field label={t('species.key')}><input value={settings.plantnetKey} onChange={(e) => settings.update('plantnetKey', e.target.value.trim())} placeholder={t('species.keyPh')} autoComplete="off" /></Field>
      </Card>
      <Card title={t('set.eudr')}>
        <p className="muted">{t('set.eudrHint')}</p>
        <Field label={t('set.producer')}><input value={settings.producerName} onChange={(e) => settings.update('producerName', e.target.value)} /></Field>
        <Field label={t('set.country')}><input value={settings.producerCountry} maxLength={2} onChange={(e) => settings.update('producerCountry', e.target.value.toUpperCase())} /></Field>
      </Card>

      <h2 className="section-title">{t('more.data')}</h2>
      <LinkList items={[['/nachweise', t('ev.bundle'), t('more.backupDesc')]]} />
      <Card title={t('wipe.title')}>
        <p className="muted">{t('wipe.text')}</p>
        <button type="button" className="btn btn-danger" onClick={async () => {
          if (window.prompt(t('wipe.confirm')) !== t('wipe.word')) return;
          await wipeAllLocalData(); window.location.hash = '#/'; window.location.reload();
        }}>{t('wipe.button')}</button>
      </Card>

      <h2 className="section-title">{t('more.legal')}</h2>
      <LinkList items={[
        ['impressum.html', t('more.imprint'), null, true],
        ['datenschutz.html', t('more.privacy'), null, true],
      ]} />
      <p className="muted">{t('set.device')}: <code>{keyId}</code> · {t('app.name')} {APP_VERSION}</p>
    </div>
  );
}
