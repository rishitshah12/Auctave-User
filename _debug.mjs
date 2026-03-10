import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
const content = fs.readFileSync('.env.local', 'utf8');
content.split('\n').forEach(l => { const [k,...v] = l.split('='); if(k) env[k.trim()] = v.join('=').trim(); });

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await sb.from('trending_banners').select('*');

if (error) { console.log('ERROR:', error.message); process.exit(1); }
if (!data || data.length === 0) { console.log('No banners found'); process.exit(0); }

for (const b of data) {
  console.log('\n========================================');
  console.log('ID:', b.id);
  console.log('Title:', b.title);
  console.log('is_active:', b.is_active);
  console.log('is_slideshow:', b.is_slideshow);
  console.log('image_url:', b.image_url);
  console.log('slides:', JSON.stringify(b.slides, null, 2));

  // Test all URLs
  const urls = [];
  if (b.image_url) urls.push({ label: 'image_url', url: b.image_url });
  if (Array.isArray(b.slides)) {
    b.slides.forEach((s, i) => {
      if (s.url) urls.push({ label: `slide[${i}] (${s.type})`, url: s.url });
    });
  }

  for (const { label, url } of urls) {
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      console.log(`  ${label}: ${resp.status} ${resp.statusText} [${resp.headers.get('content-type')}]`);
    } catch (e) {
      console.log(`  ${label}: FETCH ERROR - ${e.message}`);
    }
  }
}
