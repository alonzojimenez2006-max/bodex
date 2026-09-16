import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import logoBlanco from './assets/logo-blanco.png';
import logoMorado from './assets/logo-morado.png';
import './index.css';

function App() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [logeado, setLogeado] = useState(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [vistaActual, setVistaActual] = useState('dashboard'); 
  const [menuAbierto, setMenuAbierto] = useState(false); // 📱 Controla el menú móvil

// Función para cambiar de vista y cerrar el menú automáticamente en celular
const cambiarVista = (vista) => {
  setVistaActual(vista);
  setMenuAbierto(false); 
};

  // SuperAdmin Data
  const [listaBodegas, setListaBodegas] = useState([]);
  const [formNuevaTienda, setFormNuevaTienda] = useState({ nombre_tienda: '', usuario_admin: '', password: '' });

  // Tasa
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [tasaGuardada, setTasaGuardada] = useState(1);

  // Inventario
  const [productos, setProductos] = useState([]);
  const [subInventario, setSubInventario] = useState('crear');
  const [formCrear, setFormCrear] = useState({ codigo: '', nombre: '', stock: '', precio_adquisicion: '', precio_venta: '' });
  const [formRestock, setFormRestock] = useState({ producto_id: '', cantidad_sumar: '', precio_adquisicion: '', precio_venta: '' });
  const [formPrecio, setFormPrecio] = useState({ producto_id: '', precio_venta: '' });

  // POS
  const [busquedaPOS, setBusquedaPOS] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [totalPOS, setTotalPOS] = useState(0);
  const [formaPagoPOS, setFormaPagoPOS] = useState('Efectivo en Dólares');
  const [escaneandoPOS, setEscaneandoPOS] = useState(false);
  const scannerRef = useRef(null);

  // Transacción Simple
  const [formSimple, setFormSimple] = useState({ tipo: 'Ingreso', categoria: 'Servicios', monto_usd: '', forma_pago: 'Efectivo en Dólares', descripcion: '' });

  // Movimientos y Dashboard
  const [transacciones, setTransacciones] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState('completo');
  const [papeleraProds, setPapeleraProds] = useState([]);
  const [papeleraTrans, setPapeleraTrans] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [detallesFactura, setDetallesFactura] = useState([]);

  useEffect(() => {
    if (logeado) {
      if (esSuperAdmin) {
        cargarBodegasSuperAdmin();
      } else {
        cargarTasaActual();
        cargarTransacciones();
        if (vistaActual === 'inventario' || vistaActual === 'pos') cargarProductos();
        if (vistaActual === 'papelera') cargarPapelera();
      }
    }
  }, [vistaActual, logeado, esSuperAdmin]);

  const fetchAPI = async (ruta, metodo = 'GET', body = null) => {
    const token = localStorage.getItem('tokenBodex');
    const opciones = { method: metodo, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
    if (body) opciones.body = JSON.stringify(body);
    return await fetch(`https://bodex-backend.onrender.com/api/${ruta}`, opciones);
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setMensaje('Conectando...');
    try {
      const res = await fetch('https://bodex-backend.onrender.com/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_admin: usuario, password })
      });
      const datos = await res.json();
      if (res.ok) { 
        localStorage.setItem('tokenBodex', datos.token); 
        setLogeado(true); 
        if (usuario === 'superadmin') {
          setEsSuperAdmin(true);
        } else {
          setEsSuperAdmin(false);
        }
        setMensaje(''); 
      } else {
        setMensaje(datos.error);
      }
    } catch (e) { setMensaje('Error de conexión.'); }
  };

  const cerrarSesion = () => {
    setLogeado(false); setEsSuperAdmin(false); setUsuario(''); setPassword('');
    localStorage.removeItem('tokenBodex'); setVistaActual('dashboard');
  };

  // Funciones SuperAdmin
  const cargarBodegasSuperAdmin = async () => {
    const res = await fetch('https://bodex-backend.onrender.com/api/superadmin/bodegas');
    if (res.ok) setListaBodegas(await res.json());
  };

  const crearNuevaTiendaAdmin = async (e) => {
    e.preventDefault();
    const res = await fetch('https://bodex-backend.onrender.com/api/bodegas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formNuevaTienda)
    });
    if (res.ok) {
      alert('¡Tienda/Cliente creado con éxito!');
      setFormNuevaTienda({ nombre_tienda: '', usuario_admin: '', password: '' });
      cargarBodegasSuperAdmin();
    } else alert('Error creando tienda');
  };

  const cambiarEstadoTienda = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'congelado' : 'activo';
    const res = await fetch(`https://bodex-backend.onrender.com/api/superadmin/bodegas/${id}/estado`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    if (res.ok) cargarBodegasSuperAdmin();
  };

  const borrarTiendaAdmin = async (id) => {
    if (!window.confirm('¿Eliminar esta tienda por completo?')) return;
    const res = await fetch(`https://bodex-backend.onrender.com/api/superadmin/bodegas/${id}`, { method: 'DELETE' });
    if (res.ok) cargarBodegasSuperAdmin();
  };

  const actualizarFechasPago = async (id, proximo) => {
    const hoy = new Date().toISOString().split('T')[0];
    const res = await fetch(`https://bodex-backend.onrender.com/api/superadmin/bodegas/${id}/pagos`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ultimo_pago: hoy, proximo_pago: proximo })
    });
    if (res.ok) { alert('Pago registrado y fechas actualizadas'); cargarBodegasSuperAdmin(); }
  };

  // Funciones normales de Tienda
  const cargarTasaActual = async () => {
    const res = await fetchAPI('tasa');
    if (res.ok) { const datos = await res.json(); if (datos.tasa) setTasaGuardada(parseFloat(datos.tasa)); }
  };

  const guardarTasa = async (e) => {
    e.preventDefault();
    const res = await fetchAPI('tasa', 'POST', { tasa: parseFloat(nuevaTasa) });
    if (res.ok) { const datos = await res.json(); setTasaGuardada(parseFloat(datos.registro.tasa)); setNuevaTasa(''); alert('Tasa actualizada'); }
  };

  const cargarProductos = async () => {
    const res = await fetchAPI('productos');
    if (res.ok) setProductos(await res.json());
  };

  const cargarTransacciones = async () => {
    const res = await fetchAPI('transacciones');
    if (res.ok) setTransacciones(await res.json());
  };

  const cargarPapelera = async () => {
    const res = await fetchAPI('papelera');
    if (res.ok) { const datos = await res.json(); setPapeleraProds(datos.productos); setPapeleraTrans(datos.transacciones); }
  };

  const enviarA_Papelera = async (tipo, id) => {
    if (!window.confirm('¿Enviar a papelera?')) return;
    const ruta = tipo === 'producto' ? `productos/${id}/papelera` : `transacciones/${id}/papelera`;
    const res = await fetchAPI(ruta, 'PUT');
    if (res.ok) { cargarProductos(); cargarTransacciones(); }
  };

  const restaurarItem = async (tipo, id) => {
    const ruta = tipo === 'producto' ? `productos/${id}/restaurar` : `transacciones/${id}/restaurar`;
    const res = await fetchAPI(ruta, 'PUT');
    if (res.ok) cargarPapelera();
  };

  const borrarPermanente = async (tipo, id) => {
    if (!window.confirm('¿Borrar definitivamente?')) return;
    const ruta = tipo === 'producto' ? `productos/${id}/permanente` : `transacciones/${id}/permanente`;
    const res = await fetchAPI(ruta, 'DELETE');
    if (res.ok) cargarPapelera();
  };

  const verDetallesFactura = async (tx) => {
    setFacturaSeleccionada(tx);
    const res = await fetchAPI(`transacciones/${tx.id}/detalles`);
    if (res.ok) setDetallesFactura(await res.json());
  };

  const registrarTransaccionSimple = async (e) => {
    e.preventDefault();
    const res = await fetchAPI('transacciones', 'POST', {
      tipo: formSimple.tipo, categoria: formSimple.categoria, monto_usd: parseFloat(formSimple.monto_usd),
      tasa_aplicada: tasaGuardada, forma_pago: formSimple.forma_pago, descripcion: formSimple.descripcion || 'Transacción simple'
    });
    if (res.ok) { alert('Registrado'); setFormSimple({ tipo: 'Ingreso', categoria: 'Servicios', monto_usd: '', forma_pago: 'Efectivo en Dólares', descripcion: '' }); cargarTransacciones(); }
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    let payload = { ...formCrear };
    if (!payload.codigo || payload.codigo.trim() === '') payload.codigo = 'BX-' + Math.floor(Math.random() * 90000 + 10000);
    const res = await fetchAPI('productos', 'POST', payload);
    if (res.ok) { alert('Producto creado'); setFormCrear({ codigo: '', nombre: '', stock: '', precio_adquisicion: '', precio_venta: '' }); cargarProductos(); }
  };

  const procesarRestock = async (e) => {
    e.preventDefault();
    const res = await fetchAPI('restock', 'POST', {
      producto_id: parseInt(formRestock.producto_id), cantidad_sumار: parseInt(formRestock.cantidad_sumar),
      precio_adquisicion: parseFloat(formRestock.precio_adquisicion), precio_venta: parseFloat(formRestock.precio_venta), tasa_aplicada: tasaGuardada
    });
    if (res.ok) { alert('Restock aplicado'); setFormRestock({ producto_id: '', cantidad_sumar: '', precio_adquisicion: '', precio_venta: '' }); cargarProductos(); }
  };

  const actualizarPrecio = async (e) => {
    e.preventDefault();
    const res = await fetchAPI(`productos/${formPrecio.producto_id}/precio`, 'PUT', { precio_venta: parseFloat(formPrecio.precio_venta) });
    if (res.ok) { alert('Precio actualizado'); setFormPrecio({ producto_id: '', precio_venta: '' }); cargarProductos(); }
  };

  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.id === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.stock) return alert('No hay más stock');
      setCarrito(carrito.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      if (prod.stock < 1) return alert('Sin stock');
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
    setTotalPOS(totalPOS + parseFloat(prod.precio_venta));
  };

  const iniciarEscannerPOS = () => {
    setEscaneandoPOS(true);
    setTimeout(() => {
      const scanner = new Html5Qrcode("reader-pos");
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
          scanner.stop(); setEscaneandoPOS(false);
          const encontrado = productos.find(p => p.codigo === decodedText || p.codigo.toLowerCase() === decodedText.toLowerCase());
          if (encontrado) agregarAlCarrito(encontrado); else alert(`Código no encontrado.`);
        }, () => {}
      ).catch(() => { alert('No se pudo abrir cámara.'); setEscaneandoPOS(false); });
    }, 100);
  };

  const detenerEscanner = () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); setEscaneandoPOS(false); };

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert('Carrito vacío');
    const detalle = carrito.map(i => ({ producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio_venta }));
    const res = await fetchAPI('transacciones', 'POST', {
      tipo: 'Ingreso', categoria: 'Ventas de Mercancía', monto_usd: totalPOS, tasa_aplicada: tasaGuardada, forma_pago: formaPagoPOS, descripcion: 'Venta POS', carrito: detalle
    });
    if (res.ok) { alert('¡Venta cobrada!'); setCarrito([]); setTotalPOS(0); cargarTransacciones(); cargarProductos(); }
  };

  const totalIngresos = transacciones.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + parseFloat(t.monto_usd), 0);
  const totalEgresos = transacciones.filter(t => t.tipo === 'Egreso').reduce((acc, t) => acc + parseFloat(t.monto_usd), 0);
  const balanceNeto = totalIngresos - totalEgresos;

  const agruparPor = (array, clave) => array.reduce((acc, item) => { const k = item[clave] || 'Otros'; acc[k] = (acc[k] || 0) + parseFloat(item.monto_usd); return acc; }, {});
  const ingresosPorCat = agruparPor(transacciones.filter(t => t.tipo === 'Ingreso'), 'categoria');
  const egresosPorCat = agruparPor(transacciones.filter(t => t.tipo === 'Egreso'), 'categoria');
  const ingresosPorMet = agruparPor(transacciones.filter(t => t.tipo === 'Ingreso'), 'forma_pago');
  const egresosPorMet = agruparPor(transacciones.filter(t => t.tipo === 'Egreso'), 'forma_pago');

  const transaccionesFiltradas = transacciones.filter(t => {
    if (filtroTiempo === 'completo') return true;
    const fechaTx = new Date(t.fecha_hora); const hoy = new Date();
    if (filtroTiempo === 'hoy') return fechaTx.toDateString() === hoy.toDateString();
    if (filtroTiempo === 'semana') { const hace7 = new Date(); hace7.setDate(hoy.getDate() - 7); return fechaTx >= hace7; }
    if (filtroTiempo === 'mes') return fechaTx.getMonth() === hoy.getMonth() && fechaTx.getFullYear() === hoy.getFullYear();
    if (filtroTiempo === 'año') return fechaTx.getFullYear() === hoy.getFullYear();
    return true;
  });

  if (!logeado) return (
    <div className="bodex-container">
      <header className="bodex-header">
        <h1>Bodex</h1>
        <p>Sistema Integral de Gestión</p>
      </header>
      <main className="bodex-main">
        <div className="card">
          <img src={logoMorado} alt="Bodex Logo" className="bodex-logo-login" />
          <h2>Bienvenido</h2>
          <p>Inicia sesión para continuar</p>
          <form onSubmit={iniciarSesion}>
            <input type="text" placeholder="Usuario" className="input-field" value={usuario} onChange={(e)=>setUsuario(e.target.value)} required />
            <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            <button type="submit" className="btn-primary">Entrar al Panel</button>
          </form>
          {mensaje && <p className="mensaje-estado" style={{color:'#d32f2f'}}>{mensaje}</p>}
        </div>
      </main>
    </div>
  );

  // --- VISTA SUPERADMIN (PANEL MAESTRO DE ALQUILERES) ---
  if (esSuperAdmin) {
    return (
      <div className="layout-panel">
        {/* Fondo oscuro para cerrar menú al tocar afuera en móvil */}
    {/* Fondo oscuro para celular */}
    <div className={`overlay-menu ${menuAbierto ? 'activo' : ''}`} onClick={() => setMenuAbierto(false)}></div>

    <aside className={`sidebar ${menuAbierto ? 'abierta' : ''}`}>
      <div className="sidebar-header">
        <img src={logoBlanco} alt="Logo" className="sidebar-logo-main" />
        <p style={{marginTop: '5px'}}>Tienda: {usuario}</p>
      </div>
      <nav className="sidebar-nav">
        <button className={vistaActual==='dashboard'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('dashboard')}>📊 Dashboard</button>
        <button className={vistaActual==='tasa'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('tasa')}>💵 Tasa Dólar</button>
        <button className={vistaActual==='inventario'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('inventario')}>📦 Inventario</button>
        <button className={vistaActual==='pos'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('pos')}>🛒 Punto de Venta</button>
        <button className={vistaActual==='simple'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('simple')}>💰 Transacción Simple</button>
        <button className={vistaActual==='movimientos'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('movimientos')}>📝 Movimientos</button>
        <button className={vistaActual==='papelera'?'nav-btn activo':'nav-btn'} onClick={()=>cambiarVista('papelera')}>🗑️ Papelera</button>
      </nav>
      <div className="sidebar-footer"><button className="btn-logout" onClick={cerrarSesion}>Salir</button></div>
    </aside>

    <main className="panel-content">
      <button className="menu-toggle" onClick={() => setMenuAbierto(true)}>☰ Menú Bodex</button>
      <div className="modulo">
            <h2>🏢 Clientes Alquilados / Bodegas</h2>
            <p>Crea cuentas para tus clientes, controla sus estados (congelado por falta de pago) y gestiona fechas de cobro.</p>

            {/* Formulario Crear Tienda */}
            <form onSubmit={crearNuevaTiendaAdmin} className="grid-form" style={{marginTop:'20px'}}>
              <input type="text" placeholder="Nombre de Tienda" className="input-field" value={formNuevaTienda.nombre_tienda} onChange={e=>setFormNuevaTienda({...formNuevaTienda, nombre_tienda: e.target.value})} required/>
              <input type="text" placeholder="Usuario Cliente" className="input-field" value={formNuevaTienda.usuario_admin} onChange={e=>setFormNuevaTienda({...formNuevaTienda, usuario_admin: e.target.value})} required/>
              <input type="password" placeholder="Contraseña Inicial" className="input-field" value={formNuevaTienda.password} onChange={e=>setFormNuevaTienda({...formNuevaTienda, password: e.target.value})} required/>
              <button type="submit" className="btn-primary" style={{gridColumn: 'span 3'}}>+ Registrar Nueva Tienda</button>
            </form>

            <table className="tabla-bodex" style={{marginTop:'30px'}}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tienda</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Próximo Pago</th>
                  <th>Acciones de Alquiler</th>
                </tr>
              </thead>
              <tbody>
                {listaBodegas.map(b => {
                  const vencido = b.proximo_pago && new Date(b.proximo_pago) < new Date();
                  return (
                    <tr key={b.id} style={{backgroundColor: vencido ? '#ffebee' : 'transparent'}}>
                      <td>{b.id}</td>
                      <td><b>{b.nombre_tienda}</b></td>
                      <td>{b.usuario_admin}</td>
                      <td>
                        <span style={{padding:'4px 8px', borderRadius:'4px', fontWeight:'bold', background: b.estado === 'activo' ? '#e8f5e9' : '#ffebee', color: b.estado === 'activo' ? '#2e7d32' : '#c62828'}}>
                          {b.estado.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {b.proximo_pago || 'No fijada'} 
                        {vencido && <span style={{display:'block', color:'#d32f2f', fontSize:'11px'}}>⚠️ Vencido</span>}
                      </td>
                      <td>
                        <button className={b.estado === 'activo' ? 'btn-quitar' : 'btn-editar'} onClick={()=>cambiarEstadoTienda(b.id, b.estado)}>
                          {b.estado === 'activo' ? '❄️ Congelar' : '🔥 Descongelar'}
                        </button>
                        <button className="btn-editar" style={{marginLeft:'5px'}} onClick={()=>{
                          const nuevaFecha = prompt('Ingrese la nueva fecha de próximo pago (AAAA-MM-DD):', b.proximo_pago || '');
                          if(nuevaFecha) actualizarFechasPago(b.id, nuevaFecha);
                        }}>📅 Pago</button>
                        <button className="btn-quitar" style={{marginLeft:'5px'}} onClick={()=>borrarTiendaAdmin(b.id)}>🗑️ Borrar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  }

  // --- VISTA NORMAL DE TIENDA / CLIENTE ---
  return (
    <div className="layout-panel">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logoBlanco} alt="Logo" className="sidebar-logo-main" />
          <p style={{marginTop: '5px'}}>Tienda: {usuario}</p>
        </div>
        <nav className="sidebar-nav">
          <button className={vistaActual==='dashboard'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('dashboard')}>📊 Dashboard</button>
          <button className={vistaActual==='tasa'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('tasa')}>💵 Tasa Dólar</button>
          <button className={vistaActual==='inventario'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('inventario')}>📦 Inventario</button>
          <button className={vistaActual==='pos'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('pos')}>🛒 Punto de Venta</button>
          <button className={vistaActual==='simple'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('simple')}>💰 Transacción Simple</button>
          <button className={vistaActual==='movimientos'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('movimientos')}>📝 Movimientos</button>
          <button className={vistaActual==='papelera'?'nav-btn activo':'nav-btn'} onClick={()=>setVistaActual('papelera')}>🗑️ Papelera</button>
        </nav>
        <div className="sidebar-footer"><button className="btn-logout" onClick={cerrarSesion}>Salir</button></div>
      </aside>

      <main className="panel-content">
        <button className="menu-toggle" onClick={() => setMenuAbierto(true)}>☰ Menú Bodex</button>
        {vistaActual === 'dashboard' && (
          <div className="modulo">
            <h2>📊 Dashboard Financiero General</h2>
            <div className="dashboard-cards">
              <div className="dash-card card-verde"><h3>Total Ingresos</h3><p>${totalIngresos.toFixed(2)}</p></div>
              <div className="dash-card card-rojo"><h3>Total Egresos</h3><p>${totalEgresos.toFixed(2)}</p></div>
              <div className="dash-card card-morado"><h3>Balance Neto</h3><p>${balanceNeto.toFixed(2)}</p></div>
            </div>
            <div className="dash-sections-grid" style={{marginTop: '30px'}}>
              <div className="dash-box">
                <h3 style={{color: '#008060', marginBottom: '15px'}}>📈 Ingresos por Tipo de Cuenta</h3>
                <ul className="dash-list">{Object.entries(ingresosPorCat).map(([k,v])=>(<li key={k}><span>{k}</span> <b>${v.toFixed(2)}</b></li>))}</ul>
              </div>
              <div className="dash-box">
                <h3 style={{color: '#d32f2f', marginBottom: '15px'}}>📉 Egresos por Tipo de Cuenta</h3>
                <ul className="dash-list">{Object.entries(egresosPorCat).map(([k,v])=>(<li key={k}><span>{k}</span> <b>${v.toFixed(2)}</b></li>))}</ul>
              </div>
            </div>
            <div className="dash-sections-grid" style={{marginTop: '20px'}}>
              <div className="dash-box">
                <h3 style={{color: '#6a1b9a', marginBottom: '15px'}}>💳 Ingresos por Método de Pago</h3>
                <ul className="dash-list">{Object.entries(ingresosPorMet).map(([k,v])=>(<li key={k}><span>{k}</span> <b>${v.toFixed(2)}</b></li>))}</ul>
              </div>
              <div className="dash-box">
                <h3 style={{color: '#6a1b9a', marginBottom: '15px'}}>💸 Egresos por Método de Pago</h3>
                <ul className="dash-list">{Object.entries(egresosPorMet).map(([k,v])=>(<li key={k}><span>{k}</span> <b>${v.toFixed(2)}</b></li>))}</ul>
              </div>
            </div>
          </div>
        )}
        
        {vistaActual === 'tasa' && (
          <div className="modulo"><h2>💵 Configuración de Tasa</h2>
            <div className="tasa-card"><h3>Registrada Activa: Bs. {tasaGuardada}</h3>
              <form onSubmit={guardarTasa} className="tasa-form">
                <input type="number" step="0.01" className="input-field" value={nuevaTasa} onChange={(e)=>setNuevaTasa(e.target.value)} required />
                <button type="submit" className="btn-primary">Actualizar Tasa</button>
              </form>
            </div>
          </div>
        )}

        {vistaActual === 'inventario' && (
          <div className="modulo">
            <h2>📦 Gestión de Inventario</h2>
            <div className="subnav-tabs">
              <button className={subInventario==='crear'?'tab-btn activo':'tab-btn'} onClick={()=>setSubInventario('crear')}>➕ Crear</button>
              <button className={subInventario==='restock'?'tab-btn activo':'tab-btn'} onClick={()=>setSubInventario('restock')}>📥 Restock</button>
              <button className={subInventario==='precios'?'tab-btn activo':'tab-btn'} onClick={()=>setSubInventario('precios')}>💲 Precios</button>
            </div>

            {subInventario === 'crear' && (
              <form onSubmit={crearProducto} className="grid-form">
                <input type="text" placeholder="Código (Auto si vacío)" className="input-field" value={formCrear.codigo} onChange={e=>setFormCrear({...formCrear, codigo: e.target.value})}/>
                <input type="text" placeholder="Nombre" className="input-field" value={formCrear.nombre} onChange={e=>setFormCrear({...formCrear, nombre: e.target.value})} required/>
                <input type="number" placeholder="Stock" className="input-field" value={formCrear.stock} onChange={e=>setFormCrear({...formCrear, stock: e.target.value})} required/>
                <input type="number" step="0.01" placeholder="Costo $" className="input-field" value={formCrear.precio_adquisicion} onChange={e=>setFormCrear({...formCrear, precio_adquisicion: e.target.value})} required/>
                <input type="number" step="0.01" placeholder="Venta $" className="input-field" value={formCrear.precio_venta} onChange={e=>setFormCrear({...formCrear, precio_venta: e.target.value})} required/>
                <button type="submit" className="btn-primary">Guardar</button>
              </form>
            )}

            {subInventario === 'restock' && (
              <form onSubmit={procesarRestock} className="grid-form">
                <select className="input-field" value={formRestock.producto_id} onChange={e=>setFormRestock({...formRestock, producto_id: e.target.value})} required>
                  <option value="">Selecciona producto...</option>
                  {productos.map(p => (<option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>))}
                </select>
                <input type="number" placeholder="Cantidad (+)" className="input-field" value={formRestock.cantidad_sumar} onChange={e=>setFormRestock({...formRestock, cantidad_sumar: e.target.value})} required/>
                <input type="number" step="0.01" placeholder="Costo Adq. $" className="input-field" value={formRestock.precio_adquisicion} onChange={e=>setFormRestock({...formRestock, precio_adquisicion: e.target.value})} required/>
                <input type="number" step="0.01" placeholder="Precio Venta $" className="input-field" value={formRestock.precio_venta} onChange={e=>setFormRestock({...formRestock, precio_venta: e.target.value})} required/>
                <button type="submit" className="btn-primary">Registrar Restock</button>
              </form>
            )}

            {subInventario === 'precios' && (
              <form onSubmit={actualizarPrecio} className="grid-form">
                <select className="input-field" value={formPrecio.producto_id} onChange={e=>setFormPrecio({...formPrecio, producto_id: e.target.value})} required>
                  <option value="">Selecciona producto...</option>
                  {productos.map(p => (<option key={p.id} value={p.id}>{p.nombre} (${p.precio_venta})</option>))}
                </select>
                <input type="number" step="0.01" placeholder="Nuevo Precio Venta $" className="input-field" value={formPrecio.precio_venta} onChange={e=>setFormPrecio({...formPrecio, precio_venta: e.target.value})} required/>
                <button type="submit" className="btn-primary">Actualizar Precio</button>
              </form>
            )}

            <table className="tabla-bodex" style={{marginTop: '30px'}}>
              <thead><tr><th>Código</th><th>Nombre</th><th>Stock</th><th>Costo</th><th>Venta</th><th>Margen</th><th>Acción</th></tr></thead>
              <tbody>
                {productos.map(p => {
                  const costo = parseFloat(p.precio_adquisicion || 0);
                  const venta = parseFloat(p.precio_venta || 0);
                  const ganancia = (venta - costo).toFixed(2);
                  const pct = venta > 0 ? (((venta - costo) / venta) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.id}>
                      <td>{p.codigo}</td><td>{p.nombre}</td><td>{p.stock}</td><td>${costo.toFixed(2)}</td><td>${venta.toFixed(2)}</td>
                      <td><span className="txt-verde">${ganancia} ({pct}%)</span></td>
                      <td><button className="btn-quitar" onClick={()=>enviarA_Papelera('producto', p.id)}>🗑️ Papelera</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {vistaActual === 'pos' && (
          <div className="modulo pos-grid">
            <div className="pos-productos">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <h2>🛒 POS (Tasa: {tasaGuardada} Bs.)</h2>
                <button className="btn-editar" onClick={escaneandoPOS ? detenerEscanner : iniciarEscannerPOS}>
                  {escaneandoPOS ? '❌ Cerrar' : '📷 Cámara'}
                </button>
              </div>
              {escaneandoPOS && <div style={{marginBottom:'20px', background:'#000', padding:'10px', borderRadius:'8px', textAlign:'center'}}><div id="reader-pos" style={{width:'100%', maxWidth:'400px', margin:'0 auto'}}></div></div>}
              <input type="text" placeholder="🔍 Buscar..." className="input-field" value={busquedaPOS} onChange={e=>setBusquedaPOS(e.target.value)}/>
              <div className="lista-grid">
                {productos.filter(p => p.nombre.toLowerCase().includes(busquedaPOS.toLowerCase()) || p.codigo.toLowerCase().includes(busquedaPOS.toLowerCase())).map(p => (
                  <div key={p.id} className="prod-card" onClick={()=>agregarAlCarrito(p)}>
                    <h4>{p.nombre}</h4><p>${p.precio_venta}</p><small>Stock: {p.stock}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="pos-carrito">
              <h2>Total: ${totalPOS.toFixed(2)}</h2>
              <p className="subtotal-bs">Bs. {(totalPOS * tasaGuardada).toFixed(2)}</p>
              <div style={{marginBottom: '15px'}}>
                <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px', color:'#555'}}>Método de Pago:</label>
                <select className="input-field" value={formaPagoPOS} onChange={e=>setFormaPagoPOS(e.target.value)}>
                  <option value="Efectivo en Dólares">Efectivo en Dólares</option>
                  <option value="Efectivo en Bolívares">Efectivo en Bolívares</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Punto de Venta">Punto de Venta</option>
                </select>
              </div>
              <ul className="lista-carrito">{carrito.map(c => (<li key={c.id}>{c.nombre} (x{c.cantidad}) - ${(c.precio_venta * c.cantidad).toFixed(2)}</li>))}</ul>
              <button onClick={procesarVenta} className="btn-cobrar">💳 COBRAR</button>
            </div>
          </div>
        )}

        {vistaActual === 'simple' && (
          <div className="modulo">
            <h2>💰 Transacción Simple</h2>
            <form onSubmit={registrarTransaccionSimple} className="grid-form" style={{marginTop: '20px'}}>
              <select className="input-field" value={formSimple.tipo} onChange={e => {
                const nt = e.target.value; setFormSimple({...formSimple, tipo: nt, categoria: nt === 'Ingreso' ? 'Cuentas por cobrar' : 'Gastos operativos'});
              }}>
                <option value="Ingreso">Ingreso</option><option value="Egreso">Egreso</option>
              </select>
              <select className="input-field" value={formSimple.categoria} onChange={e=>setFormSimple({...formSimple, categoria: e.target.value})} required>
                {formSimple.tipo === 'Ingreso' ? (
                  <><option value="Cuentas por cobrar">Cuentas por cobrar</option><option value="Servicios">Servicios</option><option value="Inversiones">Inversiones</option><option value="Otros ingresos">Otros ingresos</option></>
                ) : (
                  <><option value="Gastos operativos">Gastos operativos</option><option value="Nómina">Nómina</option><option value="Impuestos">Impuestos</option><option value="Cuentas por pagar">Cuentas por pagar</option><option value="Otros egresos">Otros egresos</option></>
                )}
              </select>
              <input type="number" step="0.01" placeholder="Monto USD ($)" className="input-field" value={formSimple.monto_usd} onChange={e=>setFormSimple({...formSimple, monto_usd: e.target.value})} required/>
              <select className="input-field" value={formSimple.forma_pago} onChange={e=>setFormSimple({...formSimple, forma_pago: e.target.value})}>
                <option value="Efectivo en Dólares">Efectivo en Dólares</option><option value="Efectivo en Bolívares">Efectivo en Bolívares</option><option value="Pago Móvil">Pago Móvil</option><option value="Punto de Venta">Punto de Venta</option>
              </select>
              <input type="text" placeholder="Descripción..." className="input-field" value={formSimple.descripcion} onChange={e=>setFormSimple({...formSimple, descripcion: e.target.value})} style={{gridColumn: 'span 2'}}/>
              <button type="submit" className="btn-primary" style={{gridColumn: 'span 2'}}>Registrar</button>
            </form>
          </div>
        )}

        {vistaActual === 'movimientos' && (
          <div className="modulo">
            <h2>📝 Historial de Movimientos</h2>
            <div className="filtros-container">
              <button className={filtroTiempo==='hoy'?'btn-filtro activo':'btn-filtro'} onClick={()=>setFiltroTiempo('hoy')}>Día</button>
              <button className={filtroTiempo==='semana'?'btn-filtro activo':'btn-filtro'} onClick={()=>setFiltroTiempo('semana')}>Semana</button>
              <button className={filtroTiempo==='mes'?'btn-filtro activo':'btn-filtro'} onClick={()=>setFiltroTiempo('mes')}>Mes</button>
              <button className={filtroTiempo==='año'?'btn-filtro activo':'btn-filtro'} onClick={()=>setFiltroTiempo('año')}>Año</button>
              <button className={filtroTiempo==='completo'?'btn-filtro activo':'btn-filtro'} onClick={()=>setFiltroTiempo('completo')}>Completo</button>
            </div>

            <table className="tabla-bodex">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Cuenta</th><th>Pago</th><th>Descripción</th><th>Monto</th><th>Acción</th></tr></thead>
              <tbody>
                {transaccionesFiltradas.map(t => {
                  const tasaTx = parseFloat(t.tasa_aplicada || 1);
                  const montoBs = (parseFloat(t.monto_usd) * tasaTx).toFixed(2);
                  return (
                    <tr key={t.id}>
                      <td>{new Date(t.fecha_hora).toLocaleString()}</td>
                      <td className={t.tipo==='Ingreso'?'txt-verde':'txt-rojo'}>{t.tipo}</td>
                      <td>{t.categoria}</td>
                      <td>{t.forma_pago}</td>
                      <td>{t.descripcion}</td>
                      <td><b>${t.monto_usd}</b> ({montoBs} Bs.)</td>
                      <td>
                        {t.categoria === 'Ventas de Mercancía' && <button className="btn-editar" onClick={()=>verDetallesFactura(t)}>🧾 Ver Factura</button>}
                        <button className="btn-quitar" style={{marginLeft:'5px'}} onClick={()=>enviarA_Papelera('transaccion', t.id)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {facturaSeleccionada && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <h3>🧾 Resumen de Factura #{facturaSeleccionada.id}</h3>
                  <p><small>{new Date(facturaSeleccionada.fecha_hora).toLocaleString()}</small></p>
                  <hr style={{margin:'10px 0'}}/>
                  <ul style={{listStyle:'none', padding:0, marginBottom:'15px'}}>
                    {detallesFactura.map((d, i) => (
                      <li key={i} style={{display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px dashed #eee'}}>
                        <span>{d.nombre} (x{d.cantidad})</span>
                        <b>${(d.cantidad * parseFloat(d.precio_unitario)).toFixed(2)}</b>
                      </li>
                    ))}
                  </ul>
                  <h4>Total Pagado: ${facturaSeleccionada.monto_usd} ({ (parseFloat(facturaSeleccionada.monto_usd) * parseFloat(facturaSeleccionada.tasa_aplicada)).toFixed(2) } Bs.)</h4>
                  <button className="btn-primary" style={{marginTop:'15px'}} onClick={()=>setFacturaSeleccionada(null)}>Cerrar Factura</button>
                </div>
              </div>
            )}
          </div>
        )}

        {vistaActual === 'papelera' && (
          <div className="modulo">
            <h2>🗑️ Papelera de Reciclaje</h2>
            <h3 style={{color: '#6a1b9a', marginTop: '20px'}}>Productos</h3>
            <table className="tabla-bodex">
              <thead><tr><th>Nombre</th><th>Código</th><th>Acciones</th></tr></thead>
              <tbody>
                {papeleraProds.map(p => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td><td>{p.codigo}</td>
                    <td>
                      <button className="btn-editar" onClick={()=>restaurarItem('producto', p.id)}>♻️ Restaurar</button>
                      <button className="btn-quitar" style={{marginLeft:'5px'}} onClick={()=>borrarPermanente('producto', p.id)}>🔥 Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{color: '#6a1b9a', marginTop: '30px'}}>Movimientos</h3>
            <table className="tabla-bodex">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th><th>Acciones</th></tr></thead>
              <tbody>
                {papeleraTrans.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.fecha_hora).toLocaleString()}</td><td>{t.tipo}</td><td>{t.descripcion}</td><td>${t.monto_usd}</td>
                    <td>
                      <button className="btn-editar" onClick={()=>restaurarItem('transaccion', t.id)}>♻️ Restaurar</button>
                      <button className="btn-quitar" style={{marginLeft:'5px'}} onClick={()=>borrarPermanente('transaccion', t.id)}>🔥 Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
