#!/usr/bin/env python3
"""Assemble les slides en une seule page HTML défilable : python3 build.py"""
import json, re, pathlib
here = pathlib.Path(__file__).parent
deck = json.loads((here / "deck.json").read_text())
css = (here / "deck.css").read_text()

ICONS = {
 "Globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 "Search": '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 "Settings": '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 "Star": '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
 "Trust": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 "Users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M17 14c2.8 0 4.5 2 4.5 5"/>',
}
def icon(m):
    name, style = m.group(1), m.group(2)
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
            f'stroke-linejoin="round" style="{style}">{ICONS[name]}</svg>')
def shape(m):
    return f'<span class="shp-arrow" style="display:block;{m.group(1)}"></span>'

slides = []
for sid in deck["order"]:
    h = (here / "slides" / f"{sid}.html").read_text()
    h = re.sub(r'<x-icon name="(\w+)" style="([^"]*)"></x-icon>', icon, h)
    h = re.sub(r'<x-shape kind="arrow-right" style="([^"]*)"></x-shape>', shape, h)
    notes = re.search(r"<aside>(.*?)</aside>", h, re.S)
    n = notes.group(1).strip() if notes else ""
    h = re.sub(r"<aside>.*?</aside>", "", h, flags=re.S)
    h = h.replace("<section ", f'<section data-notes="{n.replace(chr(34), "&quot;")}" ', 1)
    slides.append(f'<div class="frame" id="f-{sid}"><div class="stage">{h}</div></div>')

fonts = "".join(f'<link rel="stylesheet" href="{f["href"]}">' for f in deck["faces"].values())
page = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{deck["title"]}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{css}
html{{scroll-snap-type:y mandatory;background:#0e1d18}}
body{{margin:0}}
section p,section h1,section h2,section h3,section ul,section li{{margin:0}}
section *{{box-sizing:border-box}}
.frame{{height:100vh;scroll-snap-align:start;scroll-snap-stop:always;position:relative;overflow:hidden;background:#0e1d18}}
.stage{{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--s,1))}}
.stage section{{position:relative;width:1920px;height:1080px;box-sizing:border-box;overflow:hidden}}
.shp-arrow{{background:currentColor;clip-path:polygon(0 30%,58% 30%,58% 0,100% 50%,58% 100%,58% 70%,0 70%)}}
.frame:not(.on) *{{animation-play-state:paused!important}}
.frame.reset *{{animation:none!important}}
#notes{{position:fixed;left:0;right:0;bottom:0;background:rgba(14,29,24,.94);color:#f2f4f3;font:20px/1.45 'Public Sans',Arial,sans-serif;padding:18px 32px;display:none;z-index:9;max-height:32vh;overflow:auto}}
#notes.show{{display:block}}
#hint{{position:fixed;right:14px;top:10px;font:13px 'Public Sans',Arial,sans-serif;color:#a9b8b2;z-index:9;opacity:.8}}
</style></head><body>
{chr(10).join(slides)}
<div id="notes"></div><div id="hint">↑ ↓ naviguer · N notes · F plein écran</div>
<script>
const frames=[...document.querySelectorAll('.frame')],notes=document.getElementById('notes');
function fit(){{document.documentElement.style.setProperty('--s',Math.min(innerWidth/1920,innerHeight/1080))}}
addEventListener('resize',fit);fit();
let cur=0;
const io=new IntersectionObserver(es=>es.forEach(e=>{{
  const f=e.target;
  if(e.isIntersecting&&e.intersectionRatio>.6){{f.classList.remove('reset');void f.offsetWidth;f.classList.add('on');cur=frames.indexOf(f);
    notes.textContent=f.querySelector('section').dataset.notes||'';history.replaceState(null,'','#'+f.id.slice(2))}}
  else if(!e.isIntersecting){{f.classList.remove('on');f.classList.add('reset')}}
}}),{{threshold:[0,.6]}});
frames.forEach(f=>io.observe(f));
function go(i){{cur=Math.max(0,Math.min(frames.length-1,i));frames[cur].scrollIntoView({{behavior:'smooth'}})}}
addEventListener('keydown',e=>{{
  if(['ArrowDown','ArrowRight','PageDown',' ','Enter'].includes(e.key)){{e.preventDefault();go(cur+1)}}
  else if(['ArrowUp','ArrowLeft','PageUp','Backspace'].includes(e.key)){{e.preventDefault();go(cur-1)}}
  else if(e.key==='Home')go(0);else if(e.key==='End')go(frames.length-1);
  else if(e.key==='n'||e.key==='N')notes.classList.toggle('show');
  else if(e.key==='f'||e.key==='F'){{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}}
}});
if(location.hash){{const t=document.getElementById('f-'+location.hash.slice(1));if(t)t.scrollIntoView()}}
</script></body></html>"""
(here / "kwedo-presentation.html").write_text(page)
print("ok", len(page))
