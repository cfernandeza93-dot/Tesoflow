import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseclient';

export default function TesoFlow() {
  const [tab, setTab] = useState('dashboard');
  const [alumnos, setAlumnos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cuotasConfig, setCuotasConfig] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [presupuesto, setPresupuesto] = useState([]);
  const [pagosCuotas, setPagosCuotas] = useState([]);
  const [mesActual] = useState(9);
  const [loading, setLoading] = useState(true);

  const [formAlumno, setFormAlumno] = useState({ nombre: '', email_apoderado: '', telefono_apoderado: '', genero: '' });
  const [formCategoria, setFormCategoria] = useState({ nombre: '', tipo: 'ingreso', descripcion: '', color: '#3B82F6' });
  const [formCuota, setFormCuota] = useState({ nombre: '', categoria_id: '', mes: '', monto_hombre: '', monto_mujer: '' });
  const [formTransaccion, setFormTransaccion] = useState({ alumno_id: '', categoria_id: '', tipo: 'ingreso', monto: '', descripcion: '' });
  const [formPresupuesto, setFormPresupuesto] = useState({ categoria_id: '', monto: '' });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    await Promise.all([
      cargarAlumnos(),
      cargarCategorias(),
      cargarTransacciones(),
      cargarPresupuesto()
    ]);
    setLoading(false);
  };

  const cargarAlumnos = async () => {
    const { data, error } = await supabase.from('alumnos').select('*').eq('activo', true);
    if (error) console.error('Error cargando alumnos:', error);
    else setAlumnos(data || []);
  };

  const cargarCategorias = async () => {
    const { data, error } = await supabase.from('categorias').select('*');
    if (error) console.error('Error cargando categorias:', error);
    else setCategorias(data || []);
  };

  const cargarTransacciones = async () => {
    const { data, error } = await supabase.from('transacciones').select('*').order('fecha', { ascending: false });
    if (error) console.error('Error cargando transacciones:', error);
    else setTransacciones(data || []);
  };

  const cargarPresupuesto = async () => {
    const { data, error } = await supabase.from('presupuesto').select('*');
    if (error) console.error('Error cargando presupuesto:', error);
    else setPresupuesto(data || []);
  };

  const calcularDeudasAlumno = (alumnoId) => {
    const pagosAlumno = transacciones.filter(t => t.alumno_id === alumnoId && t.tipo === 'ingreso');
    const totalPagado = pagosAlumno.reduce((s, t) => s + parseFloat(t.monto), 0);
    const totalDebe = 100000;
    return { debido: totalDebe, pagado: totalPagado, deuda: totalDebe - totalPagado };
  };

  const agregarAlumno = async () => {
    if (!formAlumno.nombre || !formAlumno.email_apoderado) return alert('Completa nombre y email');
    const { error } = await supabase.from('alumnos').insert([formAlumno]);
    if (error) {
      console.error('Error:', error);
      alert('Error al agregar alumno');
    } else {
      setFormAlumno({ nombre: '', email_apoderado: '', telefono_apoderado: '', genero: '' });
      cargarAlumnos();
    }
  };

  const eliminarAlumno = async (id) => {
    const { error } = await supabase.from('alumnos').update({ activo: false }).eq('id', id);
    if (error) console.error('Error:', error);
    else cargarAlumnos();
  };

  const agregarCategoria = async () => {
    if (!formCategoria.nombre) return alert('Ingresa nombre de categoría');
    const { error } = await supabase.from('categorias').insert([formCategoria]);
    if (error) {
      console.error('Error:', error);
      alert('Error al agregar categoría');
    } else {
      setFormCategoria({ nombre: '', tipo: 'ingreso', descripcion: '', color: '#3B82F6' });
      cargarCategorias();
    }
  };

  const eliminarCategoria = async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) console.error('Error:', error);
    else cargarCategorias();
  };

  const agregarPresupuesto = async () => {
    if (!formPresupuesto.categoria_id || !formPresupuesto.monto) return alert('Completa los campos');
    const { error } = await supabase.from('presupuesto').insert([{
      categoria_id: formPresupuesto.categoria_id,
      monto_presupuestado: parseFloat(formPresupuesto.monto),
      monto_actual: 0
    }]);
    if (error) {
      console.error('Error:', error);
      alert('Error al agregar presupuesto');
    } else {
      setFormPresupuesto({ categoria_id: '', monto: '' });
      cargarPresupuesto();
    }
  };

  const agregarTransaccion = async () => {
    if (!formTransaccion.monto || !formTransaccion.categoria_id) return alert('Completa los campos');
    const { error } = await supabase.from('transacciones').insert([{
      alumno_id: formTransaccion.alumno_id || null,
      categoria_id: formTransaccion.categoria_id,
      tipo: formTransaccion.tipo,
      monto: parseFloat(formTransaccion.monto),
      descripcion: formTransaccion.descripcion
    }]);
    if (error) {
      console.error('Error:', error);
      alert('Error al agregar transacción');
    } else {
      setFormTransaccion({ alumno_id: '', categoria_id: '', tipo: 'ingreso', monto: '', descripcion: '' });
      cargarTransacciones();
    }
  };

  const eliminarTransaccion = async (id) => {
    const { error } = await supabase.from('transacciones').delete().eq('id', id);
    if (error) console.error('Error:', error);
    else cargarTransacciones();
  };

  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + parseFloat(t.monto), 0);
  const totalGastos = transacciones.filter(t => t.tipo === 'gasto').reduce((s, t) => s + parseFloat(t.monto), 0);
  const balance = totalIngresos - totalGastos;
  const presupuestoExcedido = presupuesto.filter(p => p.monto_actual > p.monto_presupuestado);

  const exportarReporte = () => {
    const deudas = alumnos.map(a => {
      const { debido, pagado, deuda } = calcularDeudasAlumno(a.id);
      return { nombre: a.nombre, debido, pagado, deuda };
    });

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte Tesorería</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}h1{text-align:center}h2{border-bottom:2px solid #4F46E5;padding-bottom:10px;margin-top:30px}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#F3F4F6;padding:12px;text-align:left}td{padding:10px;border-bottom:1px solid #E5E7EB}.ingreso{color:#059669}.gasto{color:#DC2626}</style></head><body><h1>Reporte Tesorería</h1><h2>Resumen</h2><p>Ingresos: $${totalIngresos.toLocaleString()}<br>Gastos: $${totalGastos.toLocaleString()}<br>Saldo: $${balance.toLocaleString()}</p></body></html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte.html';
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-700">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">TesoFlow</h1>
            <p className="text-gray-600">Sistema de Tesorería de Cursos</p>
          </div>
          <button onClick={exportarReporte} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition">
            <Download size={20} /> Exportar Reporte
          </button>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap bg-white rounded-lg p-2 shadow-lg">
          {['dashboard', 'alumnos', 'categorias', 'presupuesto', 'movimientos'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg font-semibold transition ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Total Ingresos</p>
                <p className="text-3xl font-bold text-green-600">${totalIngresos.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Total Gastos</p>
                <p className="text-3xl font-bold text-red-600">${totalGastos.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <p className="text-gray-600 text-sm">Saldo</p>
                <p className="text-3xl font-bold text-blue-600">${balance.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4">Deudas de Alumnos</h2>
                <div className="space-y-3">
                  {alumnos.map(a => {
                    const { deuda } = calcularDeudasAlumno(a.id);
                    return (
                      <div key={a.id} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-semibold">{a.nombre}</span>
                          <span className={`font-bold ${deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${deuda.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4">Últimas Transacciones</h2>
                <div className="space-y-2">
                  {transacciones.slice(0, 5).map(t => (
                    <div key={t.id} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="flex justify-between">
                        <span>{t.descripcion}</span>
                        <span className={t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}>
                          {t.tipo === 'ingreso' ? '+' : '-'}${parseFloat(t.monto).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'alumnos' && (
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Alumnos</h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <input placeholder="Nombre" value={formAlumno.nombre} onChange={e => setFormAlumno({...formAlumno, nombre: e.target.value})} className="border rounded px-3 py-2" />
              <input placeholder="Email" value={formAlumno.email_apoderado} onChange={e => setFormAlumno({...formAlumno, email_apoderado: e.target.value})} className="border rounded px-3 py-2" />
              <input placeholder="Teléfono" value={formAlumno.telefono_apoderado} onChange={e => setFormAlumno({...formAlumno, telefono_apoderado: e.target.value})} className="border rounded px-3 py-2" />
              <select value={formAlumno.genero} onChange={e => setFormAlumno({...formAlumno, genero: e.target.value})} className="border rounded px-3 py-2">
                <option value="">Género</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <button onClick={agregarAlumno} className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <Plus size={18} /> Agregar
            </button>
            <div className="space-y-2">
              {alumnos.map(a => (
                <div key={a.id} className="p-4 bg-gray-50 rounded flex justify-between">
                  <div>
                    <p className="font-bold">{a.nombre}</p>
                    <p className="text-sm text-gray-600">{a.email_apoderado}</p>
                  </div>
                  <button onClick={() => eliminarAlumno(a.id)} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'categorias' && (
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Categorías</h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <input placeholder="Nombre" value={formCategoria.nombre} onChange={e => setFormCategoria({...formCategoria, nombre: e.target.value})} className="border rounded px-3 py-2" />
              <select value={formCategoria.tipo} onChange={e => setFormCategoria({...formCategoria, tipo: e.target.value})} className="border rounded px-3 py-2">
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
              <input placeholder="Descripción" value={formCategoria.descripcion} onChange={e => setFormCategoria({...formCategoria, descripcion: e.target.value})} className="border rounded px-3 py-2" />
              <input type="color" value={formCategoria.color} onChange={e => setFormCategoria({...formCategoria, color: e.target.value})} className="border rounded px-3 py-2" />
            </div>
            <button onClick={agregarCategoria} className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Plus size={18} /> Agregar
            </button>
            <div className="grid grid-cols-3 gap-4">
              {categorias.map(c => (
                <div key={c.id} className="p-4 border-l-4 rounded" style={{borderColor: c.color}}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{c.nombre}</p>
                      <p className="text-sm text-gray-600">{c.tipo}</p>
                    </div>
                    <button onClick={() => eliminarCategoria(c.id)} className="text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'movimientos' && (
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Movimientos</h2>
            <div className="grid grid-cols-6 gap-3 mb-6">
              <select value={formTransaccion.alumno_id} onChange={e => setFormTransaccion({...formTransaccion, alumno_id: e.target.value})} className="border rounded px-3 py-2">
                <option value="">Alumno</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <select value={formTransaccion.categoria_id} onChange={e => setFormTransaccion({...formTransaccion, categoria_id: e.target.value})} className="border rounded px-3 py-2">
                <option value="">Categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={formTransaccion.tipo} onChange={e => setFormTransaccion({...formTransaccion, tipo: e.target.value})} className="border rounded px-3 py-2">
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
              <input type="number" placeholder="Monto" value={formTransaccion.monto} onChange={e => setFormTransaccion({...formTransaccion, monto: e.target.value})} className="border rounded px-3 py-2" />
              <input placeholder="Descripción" value={formTransaccion.descripcion} onChange={e => setFormTransaccion({...formTransaccion, descripcion: e.target.value})} className="border rounded px-3 py-2" />
              <button onClick={agregarTransaccion} className="bg-indigo-600 text-white px-4 py-2 rounded-lg"><Plus size={18} /></button>
            </div>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2">{t.descripcion}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${t.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      ${parseFloat(t.monto).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => eliminarTransaccion(t.id)} className="text-red-600"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}