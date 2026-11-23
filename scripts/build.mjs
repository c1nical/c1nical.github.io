import {readFile, writeFile, readdir, mkdir, cp, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await mkdir(dist, {recursive:true});
await cp(path.join(root, 'static'), dist, {recursive:true});
const escape = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const base = process.env.SITE_URL?.replace(/\/$/,'');
const icons = {
 orbit:'<ellipse cx="12" cy="12" rx="6.4" ry="7.3" transform="rotate(-28 12 12)"/><ellipse cx="12" cy="12" rx="11.5" ry="3.4" transform="rotate(-28 12 12)"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.7"/><path d="m16 16 5 5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 moon:'<path d="M20 15.5A9 9 0 0 1 8.5 4a9 9 0 1 0 11.5 11.5Z"/>',
 clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7v5l3.5 2"/>',
 star:'<path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1Z"/>',
 book:'<path d="M3 5.5c3.1-1.1 6-.8 9 1.1 3-1.9 5.9-2.2 9-1.1v13c-3.1-1.1-6-.8-9 1.1-3-1.9-5.9-2.2-9-1.1zM12 7v12"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 list:'<path d="M4 6h2m3 0h11M4 12h2m3 0h11M4 18h2m3 0h11"/>',
 bookmark:'<path d="M6 3.5h12v17L12 17l-6 3.5Z"/>',
 rss:'<path d="M4 5c8.3 0 15 6.7 15 15M4 11c5 0 9 4 9 9"/><circle cx="5" cy="19" r="1" fill="currentColor"/>',
 close:'<path d="m5 5 14 14M19 5 5 19"/>', link:'<path d="m9 15 6-6m-4-2 2-2a4 4 0 0 1 6 6l-2 2m-4 4-2 2a4 4 0 0 1-6-6l2-2"/>'
};
const icon=(n,size=18)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[n]}</svg>`;
function inline(s) {return escape(s).replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
function renderMarkdown(raw){
 const blocks=raw.trim().split(/(\x60{3}[^\n]*\n[\s\S]*?\n\x60{3})/g);
 const heads=[]; let html='';
 for(const block of blocks){
  if(block.startsWith('```')){html+='\n<pre><code>'+escape(block.split('\n').slice(1,-1).join('\n'))+'</code></pre>';continue;}
  for(const part of block.trim().split(/\r?\n\s*\n/).filter(Boolean)){
   if(/^## /.test(part)){const name=part.slice(3); heads.push(name);html+=`\n<h2 id="s${heads.length}">${inline(name)}</h2>`;}
   else html+='\n<p>'+inline(part)+'</p>';
  }
 } return {html,heads};
}
const posts=[];
for(const file of await readdir(path.join(root,'content'))){
 if(!file.endsWith('.md'))continue;
 const source=(await readFile(path.join(root,'content',file),'utf8')).replaceAll('\r\n','\n');
 const match=/^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
 if(!match)throw Error('文章头部格式有误 '+file);
 const meta=Object.fromEntries(match[1].split('\n').map(l=>{const i=l.indexOf(':');return [l.slice(0,i),l.slice(i+1).trim()]}));
 const slug=file.slice(0,-3); if(!/^[a-z0-9-]+$/.test(slug))throw Error('请使用英文短链接 '+file);
 for(const k of ['title','category','date','cover','tags','description'])if(!meta[k])throw Error(file+' 缺少 '+k);
 const body=match[2]; posts.push({...meta,slug,tags:meta.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean),body,minutes:Math.max(1,Math.ceil(body.length/280)),...renderMarkdown(body)});
}
posts.sort((a,b)=>b.date.localeCompare(a.date));
const postsDir=path.join(dist,'posts');
await mkdir(postsDir,{recursive:true});
const currentFiles=new Set(posts.map(p=>p.slug+'.html'));
for(const old of await readdir(postsDir)){
 if(/^[a-z0-9-]+\.html$/.test(old) && !currentFiles.has(old))await unlink(path.join(postsDir,old));
}
const readConfig = async name => JSON.parse(await readFile(path.join(root,'config',name),'utf8'));
const [hero, friends, site] = await Promise.all([
  readConfig('home.json'),
  readConfig('friends.json'),
  readConfig('site.json')
]);
if (typeof site?.author !== 'string' || !site.author.trim()) {
  throw Error('请在 config/site.json 中填写 author');
}
const author = escape(site.author.trim());
if (!hero || typeof hero !== 'object' || Array.isArray(hero)) throw Error('home.json 应为一个对象');
for (const field of ['featuredPost','title','description','label','labelEnglish','buttonText']) {
 if (hero[field] != null && typeof hero[field] !== 'string') throw Error('home.json 的 '+field+' 应填写文本');
}
const featured=hero.featuredPost ? posts.find(p=>p.slug===hero.featuredPost) : posts.find(p=>p.featured==='true')||posts[0];
if(!featured) throw Error('找不到首页精选文章，请检查 home.json 的 featuredPost 和 content/ 中的文件名。');
const cats=[...new Set(posts.map(p=>p.category))];
const tags=[...new Set(posts.flatMap(p=>p.tags))];
const stamp=p=>escape(p.date.replaceAll('-','.'));
const url=(p,prefix)=>prefix+'posts/'+p.slug+'.html';
const color=p=>p.cover.includes('keys')?'mint':p.cover.includes('walk')?'peach':'lilac';
function card(p,prefix=''){
 return `<article class="card" data-category="${escape(p.category)}" data-slug="${p.slug}">
  <a href="${url(p,prefix)}" class="card-link">
  <div class="cover">
    <img loading="lazy" src="${prefix}assets/${escape(p.cover)}" alt="">
  </div>
  <div class="card-copy">
    <span class="category ${color(p)}">${escape(p.category)}</span>
    <h3>${escape(p.title)}</h3>
    <p>${escape(p.description)}</p>
    <div class="meta">
      <time datetime="${p.date}">${stamp(p)}</time>
      <i></i>${icon('clock',13)} ${p.minutes} 分钟</div>
    </div>
    </a>
  </article>`;
}
const tools=`<div class="view-tools">
  <button aria-label="网格视图" title="网格视图" data-view="grid" aria-pressed="true">${icon('grid',16)}</button>
  <button aria-label="列表视图" title="列表视图" data-view="list" aria-pressed="false">${icon('list',18)}</button>
</div>`;
const listRow=(p,prefix='')=>`<a class="row-link" href="${url(p,prefix)}"><time>${stamp(p)}</time><strong>${escape(p.title)}</strong><span class="category ${color(p)}">${escape(p.category)}</span></a>`;
const nav=[['首页','index.html'],['归档','archive.html'],['标签','tags.html'],['友链','friends.html'],['关于','about.html']];
const titleblock=(en,title,sub='')=>`<div class="page-title"><span class="kicker">${en}</span><h1>${title}</h1>${sub?'<p>'+sub+'</p>':''}</div>`;
async function page(file,title,content,active,description=site.author+'的个人博客，记录编程、声音与日常观察。'){
 const prefix=file.startsWith('posts/')?'../':'';
 const brand=`<a class="brand" href="${prefix}index.html" aria-label="夜航手记首页">${icon('orbit',36)}<b>夜航手记</b><small>NIGHTLOG</small></a>`;
 const text=`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="description" content="${escape(description)}">
    <meta name="theme-color" content="#101014">
    <title>${escape(title)} · 夜航手记</title>
    <link rel="icon" href="${prefix}assets/favicon.svg">
    <link rel="alternate" type="application/atom+xml" href="${prefix}feed.xml">
    <link rel="stylesheet" href="${prefix}assets/site.css">
    <script>try{if(localStorage.getItem('nightlog-theme')==='light')document.documentElement.dataset.theme='light'}catch{}</script>
    <script defer src="${prefix}assets/search-index.js"></script>
    <script defer src="${prefix}assets/site.js"></script>
    <script defer src="${prefix}assets/particles.js"></script>
  </head>
  <body data-base="${prefix}"${file === 'about.html' ? ' class="about-page"' : ''}>
    <canvas id="pointer-particles" aria-hidden="true"></canvas>
    <a href="#main" class="skip">跳到正文</a>
    <header>
      <div class="bar">
        ${brand}
        <nav aria-label="主导航">
          ${nav.map(([name,f])=>`<a href="${prefix}${f}" ${active===name?'aria-current="page"':''}>${name}</a>`).join('\n          ')}
        </nav>
        <div class="utilities">
          <button class="search-open" aria-label="搜索文章">${icon('search',17)}<span>搜索</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button class="theme" aria-label="切换到浅色主题" title="切换主题">${icon('sun',19)}${icon('moon',19)}</button>
        </div>
      </div>
    </header>
    <main id="main" class="wrap">
${content}
    </main>
    <footer class="wrap">
      <span>© 2026 ${author} · 夜航手记</span>
      <a href="${prefix}feed.xml">${icon('rss',15)} RSS 订阅</a>
    </footer>
    <dialog id="search-dialog">
      <form method="dialog" class="search-bar">${icon('search',21)}<input id="query" type="search" aria-label="搜索文章" placeholder="搜索文章、标签或正文…" autocomplete="off">
        <button title="关闭搜索" aria-label="关闭搜索">${icon('close')}</button>
      </form>
      <div id="search-results"></div>
    </dialog>
    <div id="notice" role="status"></div>
  </body>
</html>`;
 await mkdir(path.dirname(path.join(dist,file)),{recursive:true});await writeFile(path.join(dist,file),text);
}
const home=`<section class="hero" aria-labelledby="hero-title">
  <div class="hero-art" style="background-image:url('assets/${escape(featured.cover)}')"></div>
  <div class="hero-shade"></div>
  <div class="hero-copy">
    <div class="featured">${icon('star',16)} ${escape(hero.label ?? '精选文章')} <i></i>
      <span>${escape(hero.labelEnglish ?? 'FEATURED')}</span>
    </div>
    <h1 id="hero-title">${escape(hero.title || featured.title).replace('，','，<wbr>')}</h1>
    <p>${escape(hero.description || featured.description)}</p>
    <div class="hero-meta">
      <span>${author}</span>
      <i></i>
      <time>${stamp(featured)}</time>
      <i></i>${icon('clock',14)} ${featured.minutes} 分钟阅读</div>
      <a href="${url(featured,'')}" class="read">${icon('book',17)} ${escape(hero.buttonText || '阅读文章')}</a>
    </div>
  </section>
  <section class="latest">
    <div class="section-heading">
      <div class="section-title">
        <span class="section-mark"></span>
        <h2>最新文章</h2>
        <small>LATEST POSTS</small>
        </div>
${tools}
</div>
        <div class="filters" aria-label="按分类筛选">${['全部',...cats].map((c,i)=>`<button data-filter="${escape(c)}" aria-pressed="${i===0}">${escape(c)}</button>`).join('\n')}</div>
        <div id="cards" class="cards">${posts.map(p=>card(p)).join('\n')}</div>
      </section>`;
await page('index.html','首页',home,'首页');
const months = [...new Set(posts.map(p => p.date.slice(0, 7)))];
const archiveMonths = months.map(month => {
  const rows = posts.filter(p => p.date.startsWith(month)).map(p =>
    `<div data-archive-slug="${p.slug}">${listRow(p)}</div>`
  );
  return `<section class="month">
  <h2>${month.replace('-', ' 年 ')} 月</h2>
  ${rows.join('\n  ')}
</section>`;
});
const archive = `${titleblock('ARCHIVE', '文章归档', `共 ${posts.length} 篇文章，按发表时间排列。`)}
<div class="archive-panel">
  <div class="filters">
    <button data-archive="all" aria-pressed="true">全部文章</button>
    <button data-archive="saved" aria-pressed="false">${icon('bookmark', 14)} 我的收藏</button>
  </div>
  ${archiveMonths.join('\n  ')}
  <p id="empty-saved" hidden>还没有收藏。在文章页点击「收藏」，即可在这里找到它。</p>
</div>`;
await page('archive.html', '文章归档', archive, '归档');

const tagLinks = [];
const tagSections = [];
for (const [index, tag] of tags.entries()) {
  const matches = posts.filter(p => p.tags.includes(tag));
  tagLinks.push(`<a href="#tag-${index}"># ${escape(tag)} <small>${matches.length}</small></a>`);
  tagSections.push(`<section class="month" id="tag-${index}">
  <h2># ${escape(tag)}</h2>
  ${matches.map(p => listRow(p)).join('\n  ')}
</section>`);
}
const tagPage = `${titleblock('TOPICS', '文章标签')}
<div class="tag-cloud">
  ${tagLinks.join('\n  ')}
</div>
${tagSections.join('\n')}`;
await page('tags.html', '文章标签', tagPage, '标签');
if (!Array.isArray(friends)) throw Error('friends.json 应为一个列表，用 [ ] 包住所有友链。');
function friendCard(friend, index) {
 const hint = 'friends.json 第 '+(index+1)+' 条';
 if (!friend || typeof friend.name !== 'string' || !friend.name.trim()) throw Error(hint+' 缺少 name');
 let target;
 try { target = new URL(friend.url); } catch { throw Error(hint+' 的 url 需要填写完整网址'); }
 if (!['https:','http:'].includes(target.protocol) || target.username || target.password) throw Error(hint+' 请使用普通 http 或 https 网址');
 if (friend.description != null && typeof friend.description !== 'string') throw Error(hint+' 的 description 应为文字');
 const name = friend.name.trim();
 return `<a class="friend-card" href="${escape(target.href)}" target="_blank" rel="noopener noreferrer">
<span class="friend-initial" aria-hidden="true">${escape([...name][0])}</span>
<div>
  <h2>${escape(name)}</h2>
  <span class="friend-host">${escape(target.host)}</span>${friend.description ? '<p>'+escape(friend.description)+'</p>' : ''}</div>
  </a>`;
}
const friendList = friends.length
 ? '<div class="friend-grid">'+friends.map(friendCard).join('\n')+'</div>'
 : `<div class="friend-empty">${icon('orbit',43)}<h2>这里为朋友们留着位置</h2><p>第一份友链会出现在这里。</p></div>`;
await page('friends.html','友链',titleblock('BLOGROLL','友链','朋友们的独立博客与个人站点。')+friendList,'友链');
const aboutTemplate = await readFile(path.join(root, 'content/about.html'), 'utf8');
const about = aboutTemplate.replace(/\{\{(author|orbitIcon)\}\}/g, (_, field) =>
  field === 'author' ? author : icon('orbit', 46)
);
await page('about.html', '关于', about, '关于');

for(const [index,p] of posts.entries()){
 const next=posts[(index+1)%posts.length];
 const taglinks=p.tags.map(t=>`<a href="../tags.html#tag-${tags.indexOf(t)}"># ${escape(t)}</a>`).join(' ');
 const article=`<div class="reading-progress" aria-hidden="true"></div>
<article class="reader" data-post="${p.slug}">
  <div class="reader-head">
    <a class="breadcrumb" href="../archive.html">文章归档</a>
    <span class="slash">/</span>
    <span class="category ${color(p)}">${escape(p.category)}</span>
    <h1>${escape(p.title)}</h1>
    <p class="dek">${escape(p.description)}</p>
    <div class="reader-meta">
      <span>${author}</span>
      <i></i>
      <time>${stamp(p)}</time>
      <i></i>${icon('clock',14)} ${p.minutes} 分钟阅读</div>
    </div>
    <img class="reader-img" src="../assets/${escape(p.cover)}" alt="">
    <div class="article-layout">
      <div class="prose">
${p.html}
<div class="post-tags">${taglinks}</div>
      <div class="post-actions">
        <button id="save-post" aria-pressed="false">${icon('bookmark')}<span>收藏</span>
        </button>
        <button id="copy-url">${icon('link')} 复制链接</button>
      </div>
      <div class="next">
        <span>继续阅读</span>
        <a href="${next.slug}.html">${escape(next.title)}</a>
      </div>
    </div>
    <aside>
      <strong>文章目录</strong>${p.heads.map((h,i)=>`<a href="#s${i+1}">${escape(h)}</a>`).join('\n')}</aside>
    </div>
  </article>`;
 await page('posts/'+p.slug+'.html',p.title,article,'',p.description);
}
await writeFile(path.join(dist,'assets/search-index.js'),'window.NIGHTLOG_SEARCH='+JSON.stringify(posts.map(({slug,title,tags,category,body,description})=>({slug,title,tags,category,body,description}))).replaceAll('<','\\u003c')+';');
const feedBase=base||'.';
const entryUrl=p=>feedBase+'/posts/'+p.slug+'.html';
const atom=`<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>夜航手记</title><id>urn:nightlog:42</id><updated>${posts[0].date}T00:00:00Z</updated><author><name>${author}</name></author><link href="${escape(feedBase)}/"/><link rel="self" href="${escape(feedBase)}/feed.xml"/>${posts.map(p=>`<entry><title>${escape(p.title)}</title><id>urn:nightlog:42:${p.slug}</id><updated>${p.date}T00:00:00Z</updated><link href="${escape(entryUrl(p))}"/><summary>${escape(p.description)}</summary></entry>`).join('\n')}</feed>`;
await writeFile(path.join(dist,'feed.xml'),atom);
if(base)await writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...nav.map(n=>n[1]),...posts.map(p=>'posts/'+p.slug+'.html')].map(f=>'<url><loc>'+escape(base+'/'+f)+'</loc></url>').join('\n')}</urlset>`);
console.log('Built '+posts.length+' posts in dist.');
