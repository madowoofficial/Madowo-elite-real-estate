const $ = s => document.querySelector(s);
let config = {};
const money = n => new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(n);
async function loadConfig(){
  try { config = await (await fetch("/api/config")).json(); } catch {}
  if(config.phone && config.phone !== "+254700000000") $("#contactPhone").textContent = "Phone: " + config.phone;
  if(config.email && config.email !== "hello@madowoelite.co.ke") $("#contactEmail").textContent = "Email: " + config.email;
}
function propertyCard(p){
  const img = p.image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80";
  const detail = [p.bedrooms ? `${p.bedrooms} beds` : "",p.bathrooms ? `${p.bathrooms} baths` : "",p.area].filter(Boolean).join(" · ");
  const wa = config.whatsapp ? `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hello, I am interested in "+p.title+" in "+p.location)}` : "#contact";
  return `<article class="property-card"><img src="${img}" alt="${p.title}" loading="lazy"><div class="property-info"><span class="property-type">${p.purpose} · ${p.type}</span><h3>${escapeHtml(p.title)}</h3><p class="location">⌖ ${escapeHtml(p.location)}</p><div class="price">${money(p.price)}</div><div class="property-meta">${detail || "Contact us for details"}</div><a class="card-link" href="${wa}" target="${config.whatsapp ? "_blank" : "_self"}" rel="noopener">ENQUIRE ABOUT THIS PROPERTY ↗</a></div></article>`;
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadProperties(){
  const params = new URLSearchParams();
  if($("#purpose").value!=="All") params.set("purpose",$("#purpose").value);
  if($("#type").value!=="All") params.set("type",$("#type").value);
  if($("#search").value.trim()) params.set("search",$("#search").value.trim());
  const grid=$("#propertyGrid"); grid.innerHTML='<div class="loading">Loading properties…</div>';
  try {
    const items=await (await fetch("/api/properties?"+params)).json();
    grid.innerHTML=items.length?items.map(propertyCard).join(""):"<p>No matching properties at the moment. Contact us and we can help with your search.</p>";
  } catch { grid.innerHTML="<p>Properties could not be loaded. Please refresh or contact us.</p>"; }
}
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();loadProperties();$("#properties").scrollIntoView({behavior:"smooth"});});
$("#enquiryForm").addEventListener("submit",async e=>{
  e.preventDefault(); const form=e.currentTarget, data=Object.fromEntries(new FormData(form).entries());
  $("#formMessage").textContent="Sending…";
  try { const r=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); const out=await r.json(); if(!r.ok)throw Error(out.error); form.reset();$("#formMessage").textContent="Thank you. Your enquiry has been received."; }
  catch(err){$("#formMessage").textContent=err.message||"Could not send. Please try again.";}
});
$("#menuToggle").addEventListener("click",()=>$("#nav").classList.toggle("open"));
$("#nav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>$("#nav").classList.remove("open")));
$("#year").textContent=new Date().getFullYear();
loadConfig().then(loadProperties);
