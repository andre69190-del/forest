/**
 * BIOGLOW Forest – Verbindung zum selbst gehosteten Supabase (supabase.arndt-software.de).
 * Zugangsdaten kommen als Build-Variablen aus Coolify (nicht im Code):
 *   VITE_SUPABASE_URL       (Standard: https://supabase.arndt-software.de)
 *   VITE_SUPABASE_ANON_KEY  (öffentlicher „anon“-Schlüssel; ohne ihn ist der Sync ausgeblendet)
 * supabase-js wird erst geladen, wenn jemand das Konto öffnet (Start bleibt schlank).
 */
export const SUPABASE_URL = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://supabase.arndt-software.de';
const ANON = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

export const cloudConfigured = () => Boolean(ANON);

let clientPromise = null;
export function getClient() {
  if (!cloudConfigured()) return Promise.reject(new Error('cloud_not_configured'));
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'forest.auth' },
    }));
  }
  return clientPromise;
}

const isDuplicate = (error) => error && (error.code === '23505' || /duplicate|already exists/i.test(error.message || ''));
function must({ data, error }) { if (error) throw error; return data; }

/** Adapter für sync.js */
export async function api() {
  const sb = await getClient();
  return {
    async registerDevice(row) {
      const { error } = await sb.from('forest_devices').insert({ ...row, user_id: (await sb.auth.getUser()).data.user.id });
      if (error && !isDuplicate(error)) throw error;
    },
    async insertRecord(row) {
      const { data, error } = await sb.from('forest_records').insert(row).select('uploaded_at').single();
      if (isDuplicate(error)) return { duplicate: true };
      if (error) throw error;
      return data;
    },
    async uploadFile(path, bytes, type) {
      const { error } = await sb.storage.from('forest-media').upload(path, new Blob([bytes], { type }), { contentType: type, upsert: false });
      if (error && !isDuplicate(error) && error.statusCode !== '409') throw error;
    },
    async insertMedia(row) {
      const { error } = await sb.from('forest_media').insert(row);
      if (error && !isDuplicate(error)) throw error;
    },
    listRecords: async () => must(await sb.from('forest_records').select('id,user_id,group_id,device_key_id,uploaded_at,record').order('uploaded_at')),
    listDevices: async () => must(await sb.from('forest_devices').select('key_id,public_jwk,user_id')),
    listMedia: async (ids) => must(await sb.from('forest_media').select('id,record_id,path,sha256').in('record_id', ids)),
    async downloadFile(path) {
      const blob = must(await sb.storage.from('forest-media').download(path));
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}

// ── Konto ───────────────────────────────────────────────────────────────────
export async function currentUser() {
  if (!cloudConfigured()) return null;
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}
export async function signIn(email, password) { const sb = await getClient(); return must(await sb.auth.signInWithPassword({ email, password })); }
export async function signUp(email, password) {
  const sb = await getClient();
  return must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/#/konto` } }));
}
export async function resetPassword(email) { const sb = await getClient(); return must(await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/#/konto` })); }
export async function signOut() { const sb = await getClient(); await sb.auth.signOut(); }

// ── Gruppen ─────────────────────────────────────────────────────────────────
export async function myGroups() {
  const sb = await getClient();
  const groups = must(await sb.from('forest_groups').select('id,name,invite_code,created_at').order('created_at'));
  const members = must(await sb.from('forest_members').select('group_id,user_id,role,display_name,joined_at'));
  const me = (await sb.auth.getUser()).data.user.id;
  return groups.map((g) => {
    const list = members.filter((m) => m.group_id === g.id);
    return { ...g, members: list, myRole: list.find((m) => m.user_id === me)?.role || null, me };
  });
}
export async function createGroup(name, myName) { const sb = await getClient(); return must(await sb.rpc('forest_create_group', { group_name: name, my_name: myName || null }))[0]; }
export async function joinGroup(code, myName) { const sb = await getClient(); return must(await sb.rpc('forest_join_group', { code, my_name: myName || null })); }
export async function setRole(groupId, userId, role) { const sb = await getClient(); return must(await sb.rpc('forest_set_role', { gid: groupId, member: userId, new_role: role })); }
export async function leaveGroup(groupId) {
  const sb = await getClient();
  const me = (await sb.auth.getUser()).data.user.id;
  return must(await sb.from('forest_members').delete().eq('group_id', groupId).eq('user_id', me));
}
