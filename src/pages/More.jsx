import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, LANGUAGES } from '../i18n/i18n.jsx';
import { PROFILES } from '../lib/forestry.js';
import { getDeviceKey, APP_VERSION } from '../lib/evidence.js';
import { useSettings } from '../App.jsx';
import { Card, Field, PageHeader } from '../components/ui.jsx';

export default function More() {
  const { t, lang, setLang } = useI18n();
  const settings = useSettings();
  const [keyId, setKeyId] = useState('');
  useEffect(() => { getDeviceKey().then((k) => setKeyId(k.keyId)); }, []);
  return (
    <div className="page">
      <PageHeader title={t('more.title')} />
      <Card title={t('more.settings')}>
        <Field label={t('set.language')}>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([code, l]) => <option key={code} value={code}>{l.name}</option>)}
          </select>
        </Field>
        <Field label={t('set.profile')}>
          <select value={settings.profile} onChange={(e) => settings.update('profile', e.target.value)}>
            {Object.keys(PROFILES).map((k) => <option key={k} value={k}>{t(`profile.${k}`)}</option>)}
          </select>
        </Field>
        <Field label={t('set.producer')}><input value={settings.producerName} onChange={(e) => settings.update('producerName', e.target.value)} /></Field>
        <Field label={t('set.country')}><input value={settings.producerCountry} maxLength={2} onChange={(e) => settings.update('producerCountry', e.target.value.toUpperCase())} /></Field>
        <p className="muted">{t('set.device')}: <code>{keyId}</code> · v{APP_VERSION}</p>
      </Card>
      <ul className="list">
        <li><Link className="list-item" to="/pruefen"><strong>{t('more.audit')}</strong></Link></li>
        <li><a className="list-item" href="impressum.html"><strong>{t('more.legal')}</strong></a></li>
      </ul>
      <Card title={t('more.about')}>
        {['about.text1', 'about.text2', 'about.text3', 'about.text4'].map((k) => <p key={k}>{t(k)}</p>)}
      </Card>
    </div>
  );
}
