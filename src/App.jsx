import { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n/i18n.jsx';
import { getSetting, setSetting } from './lib/db.js';
import Home from './pages/Home.jsx';
import Capture from './pages/Capture.jsx';
import Plots from './pages/Plots.jsx';
import PlotNew from './pages/PlotNew.jsx';
import PlotDetail from './pages/PlotDetail.jsx';
import TreeNew from './pages/TreeNew.jsx';
import Deadwood from './pages/Deadwood.jsx';
import Visit from './pages/Visit.jsx';
import Evidence from './pages/Evidence.jsx';
import Audit from './pages/Audit.jsx';
import More from './pages/More.jsx';
import Info from './pages/Info.jsx';
import Plan from './pages/Plan.jsx';
import Welcome from './components/Welcome.jsx';
import Meeting from './pages/Meeting.jsx';
import TreeDetail from './pages/TreeDetail.jsx';
import Scan from './pages/Scan.jsx';

const DEFAULTS = {
  profile: 'INT', producerName: '', producerCountry: '',
  theme: 'system', gpsAverageSec: 10, tremDetail: 'groups', plantnetKey: '', welcomeDone: false, installHintDone: false,
};
const SettingsContext = createContext({ ...DEFAULTS, update: () => {} });
export const useSettings = () => useContext(SettingsContext);

function SettingsProvider({ children }) {
  const [s, setS] = useState({ ...DEFAULTS, loaded: false });
  useEffect(() => {
    Promise.all(Object.keys(DEFAULTS).map(async (k) => [k, await getSetting(k, DEFAULTS[k])]))
      .then((pairs) => setS({ ...Object.fromEntries(pairs), loaded: true }));
  }, []);
  // Darstellung: hell / dunkel / wie System (data-theme am <html>)
  useEffect(() => {
    if (s.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', s.theme);
  }, [s.theme]);
  const update = (k, v) => { setS((old) => ({ ...old, [k]: v })); setSetting(k, v); };
  return <SettingsContext.Provider value={{ ...s, update }}>{children}</SettingsContext.Provider>;
}

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}

function Nav() {
  const { t } = useI18n();
  const items = [['/', 'home'], ['/flaechen', 'plots'], ['/erfassen', 'capture'], ['/nachweise', 'evidence'], ['/mehr', 'more']];
  return (
    <nav className="bottom-nav" aria-label="Navigation">
      {items.map(([to, k]) => <NavLink key={k} to={to} end={to === '/'}>{t(`nav.${k}`)}</NavLink>)}
    </nav>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <HashRouter>
          <main className="app">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/erfassen" element={<Capture />} />
              <Route path="/erfassen/flaeche" element={<PlotNew />} />
              <Route path="/erfassen/baum" element={<TreeNew />} />
              <Route path="/erfassen/totholz" element={<Deadwood />} />
              <Route path="/erfassen/besuch" element={<Visit />} />
              <Route path="/erfassen/gespraech" element={<Meeting />} />
              <Route path="/baum/:id" element={<TreeDetail />} />
              <Route path="/scannen" element={<Scan />} />
              <Route path="/flaechen" element={<Plots />} />
              <Route path="/flaechen/:key" element={<PlotDetail />} />
              <Route path="/nachweise" element={<Evidence />} />
              <Route path="/pruefen" element={<Audit />} />
              <Route path="/mehr" element={<More />} />
              <Route path="/info" element={<Info />} />
              <Route path="/geplant" element={<Plan />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Nav />
          <Welcome />
        </HashRouter>
      </SettingsProvider>
    </I18nProvider>
  );
}
