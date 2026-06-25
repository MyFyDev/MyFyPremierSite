(() => {
  const norm = s => (s||'').replace(/\s+/g,' ').trim();
  const cs = el => { const c = getComputedStyle(el); return {
    ff: c.fontFamily.replace(/"/g,'').split(',')[0], fs: c.fontSize, fw: c.fontWeight,
    lh: c.lineHeight, ls: c.letterSpacing, col: c.color, ta: c.textAlign }; };
  const vis = el => el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden' && getComputedStyle(el).display!=='none';
  const txt = el => norm(el.textContent);
  const top = el => Math.round(el.getBoundingClientRect().top + scrollY);
  // descend while a single child holds all the text (to reach the real styled leaf)
  const leaf = el => { let c=el; for(let i=0;i<6;i++){ const k=[...c.children].filter(x=>vis(x)&&txt(x)); if(k.length===1 && txt(k[0])===txt(c)) c=k[0]; else break; } return c; };
  const probe = el => { const L=leaf(el); return {t:txt(el).slice(0,60), tag:el.tagName, top:top(el), ...cs(L)}; };
  const path = href => { try { const u=new URL(href, location.href);
    return (u.host.includes('myfypremier')||u.host.includes('localhost'))?u.pathname:u.host+u.pathname; } catch(e){ return '#'; } };

  // all visible headings
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).filter(txt).map(probe);

  // nav links near the top
  const navlinks = [...document.querySelectorAll('a[href]')].filter(vis).filter(e=>top(e)<220 && txt(e) && txt(e).length<24)
    .map(e=>{const L=leaf(e); const c=getComputedStyle(L); return {t:txt(e), href:path(e.getAttribute('href')), fs:c.fontSize, fw:c.fontWeight, col:c.color, ff:c.fontFamily.split(',')[0].replace(/"/g,''), ls:c.letterSpacing};});

  // buttons (apply / submit / connect ...)
  const btns = [...document.querySelectorAll('a,button')].filter(vis)
    .filter(e=>/^(apply|request|connect|submit|get started|reach out|connect with)/i.test(txt(e)) && txt(e).length<40)
    .map(e=>{const L=leaf(e); const c=getComputedStyle(L); const cb=getComputedStyle(e); return {t:txt(e).slice(0,30), href:path(e.getAttribute('href')||''),
       fs:c.fontSize, fw:c.fontWeight, col:c.color, ff:c.fontFamily.split(',')[0].replace(/"/g,''), bg:cb.backgroundColor!=='rgba(0, 0, 0, 0)'?cb.backgroundColor:getComputedStyle(e.parentElement).backgroundColor, pad:cb.padding, br:cb.borderRadius};});

  // representative body paragraphs (long text, leaf)
  const paras = [...document.querySelectorAll('p,span,div,li')].filter(vis).filter(e=>{const t=txt(e); return t.length>55 && [...e.children].filter(x=>txt(x)).length===0;})
    .slice(0,6).map(e=>({t:txt(e).slice(0,34), ...cs(e)}));

  // footer band: locate by the privacy/terms/copyright anchors, then grab text leaves below
  const anchorTops = [...document.querySelectorAll('a[href]')].filter(vis)
    .filter(e=>/privacy-policy|terms-and-conditions|terms-of-use/i.test(e.getAttribute('href')||'')).map(top);
  const copyEl = [...document.querySelectorAll('*')].filter(vis).find(e=>/powered by My Financing|©|All Rights Reserved/i.test(txt(e)) && [...e.children].filter(x=>txt(x)).length===0);
  let fTop = anchorTops.length ? Math.min(...anchorTops)-120 : (copyEl?top(copyEl)-200:1e9);
  const footerLeaves = [...document.querySelectorAll('p,span,div,a,li,h1,h2,h3,h4,h5,h6')].filter(vis)
    .filter(e=>top(e)>=fTop && txt(e) && [...e.children].filter(x=>txt(x)).length===0)
    .map(e=>{const c=getComputedStyle(e); return {t:txt(e).slice(0,90), tag:e.tagName, top:top(e), fs:c.fontSize, fw:c.fontWeight, col:c.color, ta:c.textAlign, ff:c.fontFamily.split(',')[0].replace(/"/g,''), href:e.tagName==='A'?path(e.getAttribute('href')):undefined};});
  // dedup footer leaves by text
  const fseen=new Set(); const footer=footerLeaves.filter(o=>{if(fseen.has(o.t))return false;fseen.add(o.t);return true;}).slice(0,40);

  // header / nav structural colors
  const navBarEl = document.querySelector('nav') || (navlinks.length?[...document.querySelectorAll('*')].find(e=>{const cc=getComputedStyle(e);return cc.backgroundColor==='rgb(62, 126, 123)';}):null);
  const headerInfo = navBarEl ? (()=>{const c=getComputedStyle(navBarEl); return {bg:c.backgroundColor, bb:c.borderBottom, h:Math.round(navBarEl.getBoundingClientRect().height)};})() : null;

  const body = cs(document.body);
  const fonts = [...new Set([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+'|'+f.weight))];
  return JSON.stringify({title:document.title, w:innerWidth, body, fonts, headerInfo, navlinks, heads, btns, paras, footerTop:Math.round(fTop), footer});
})()
