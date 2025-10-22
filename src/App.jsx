import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tropica:user")) || null; }
    catch { return null; }
  });

  const isValidEmail = useMemo(() => /^(?!.*\s)[^@]+@tropica\.me$/i, []);

  useEffect(() => {
    if (user) localStorage.setItem("tropica:user", JSON.stringify(user));
    else localStorage.removeItem("tropica:user");
  }, [user]);

  function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!isValidEmail.test(email)) { setError("Usa un correo @tropica.me válido"); return; }
    if (!name.trim()) { setError("Escribe tu nombre"); return; }
    setLoading(true);
    setTimeout(() => {
      setUser({ name: name.trim(), email: email.trim() });
      setLoading(false);
    }, 300);
  }

  function signOut() {
    setUser(null); setEmail(""); setName(""); setError("");
  }

  if (!user) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#f7f7f8"}}>
        <div style={{width:"100%",maxWidth:420,background:"#fff",borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.06)",padding:24}}>
          <h1 style={{fontSize:22,fontWeight:600,marginBottom:8}}>Acceso TRÓPICA</h1>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>
            Ingresa con tu correo corporativo <code>@tropica.me</code>.
          </p>
          <form onSubmit={handleLogin} style={{display:"grid",gap:12}}>
            <div>
              <label htmlFor="name" style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Nombre</label>
              <input id="name" type="text" value={name} onChange={e=>setName(e.target.value)}
                     style={{width:"100%",border:"1px solid #d1d5db",borderRadius:12,padding:"10px 12px"}} placeholder="Tu nombre"/>
            </div>
            <div>
              <label htmlFor="email" style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6}}>Correo</label>
              <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                     style={{width:"100%",border:"1px solid #d1d5db",borderRadius:12,padding:"10px 12px"}} placeholder="nombre@tropica.me"/>
              <p style={{fontSize:12,color:"#6b7280",marginTop:6}}>Solo dominios <strong>@tropica.me</strong>.</p>
            </div>
            {error && <div style={{fontSize:13,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:12}}>{error}</div>}
            <button type="submit" disabled={loading}
                    style={{width:"100%",borderRadius:16,background:"#000",color:"#fff",padding:"10px 14px",fontWeight:600,opacity:loading?0.6:1}}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
          <div style={{marginTop:16,fontSize:12,color:"#9ca3af",lineHeight:1.5}}>
            Esta demo no realiza autenticación real; solo valida el dominio. Para producción, integra tu IdP (Auth0/Firebase)
            y restringe a <code>@tropica.me</code>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"#f7f7f8"}}>
      <div style={{width:"100%",maxWidth:520,background:"#fff",borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.06)",padding:24}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{height:48,width:48,borderRadius:999,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
            {(user.name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,margin:0}}>Hola, {user.name}</h2>
            <p style={{fontSize:13,color:"#6b7280",margin:0}}>{user.email}</p>
          </div>
        </div>
        <div style={{marginTop:16,border:"1px solid #e5e7eb",borderRadius:16,padding:14,fontSize:14,color:"#4b5563"}}>
          Sesión activa en TRÓPICA. Se eliminó todo excepto el acceso y este panel mínimo.
        </div>
        <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:12,color:"#9ca3af",margin:0}}>Tip: cierra sesión para probar otro usuario.</p>
          <button onClick={signOut} style={{border:"1px solid #d1d5db",borderRadius:14,padding:"8px 12px",fontSize:13,background:"#fff"}}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
