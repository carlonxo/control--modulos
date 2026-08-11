import fs from "node:fs/promises";
import { createClient } from "../../../node_modules/@supabase/supabase-js/dist/index.mjs";

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => {
    const m = line.match(/^([^#=\s]+)=(.*)$/);
    return m ? [m[1], m[2]] : null;
  }).filter(Boolean));
}

const env = parseEnv(await fs.readFile("../.env", "utf8"));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const inicio = "2026-07-01T00:00:00";
const fin = "2026-08-01T00:00:00";

const balanceCaptura = {
  valorProtocolos: 30013414,
  materialUsado: 14798793,
  sueldos: 20000000,
  balance: -4785379,
};

const objetivos = [
  { item: "Tapa ciega - Pasac.", precioActual: 480, precioSugerido: 600 },
  { item: "Cable RZ1 2,5mm", precioActual: 353, precioSugerido: 500 },
  { item: "Cable RZ1 4mm", precioActual: 493, precioSugerido: 626 },
  { item: "Cable RZ1 6mm", precioActual: 710, precioSugerido: 900 },
  { item: "Cordon flex 3 x 2.5/4mm", precioActual: 2872, precioSugerido: 3450 },
  { item: "Cordon flex 3 x 6mm", precioActual: 3460, precioSugerido: 4152 },
  { item: "Plafón", precioActual: 6702, precioSugerido: 8000 },
  { item: "Tub Flexible Metálica c/acces", precioActual: 3390, precioSugerido: 4000 },
  { item: "Prensa Estopa 16-21mm", precioActual: 1458, precioSugerido: 1700 },
  { item: "Aut. monof. 10-16-20A", precioActual: 2578, precioSugerido: 3000 },
  { item: "Artefacto simple", precioActual: 1856, precioSugerido: 2130 },
  { item: "Artefacto doble", precioActual: 2578, precioSugerido: 2964 },
];

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizarNumero(valor) {
  const coincidencia = String(valor || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  const numero = Number(coincidencia?.[0] || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function esCantidadReutilizada(valor) {
  const texto = String(valor || "").replace(",", ".");
  const coincidencia = texto.match(/-?\d+(?:\.\d+)?/);
  if (!coincidencia) return false;
  const despuesDelNumero = texto.slice((coincidencia.index || 0) + coincidencia[0].length).trim();
  return /^r\b/i.test(despuesDelNumero) || /reutiliz/i.test(despuesDelNumero);
}

function parsearCantidad(valor) {
  return String(valor || "")
    .split("/")
    .map((parte) => parte.trim())
    .filter(Boolean)
    .reduce((total, parte) => {
      const cantidad = normalizarNumero(parte);
      if (!cantidad) return total;
      if (esCantidadReutilizada(parte)) return { ...total, reutilizado: total.reutilizado + cantidad };
      return { ...total, nuevo: total.nuevo + cantidad };
    }, { nuevo: 0, reutilizado: 0 });
}

function fechaDoc(registro) {
  const fechaInterna = registro?.protocolo_entrega?.fecha;
  if (fechaInterna) return `${fechaInterna}T00:00:00`;
  return registro?.fecha_prueba_electrica || "";
}

function enJulio(registro) {
  const fecha = String(fechaDoc(registro)).slice(0, 10);
  return fecha >= "2026-07-01" && fecha < "2026-08-01";
}

function obtenerDetalle(detalleMateriales, item) {
  if (!detalleMateriales) return {};
  if (detalleMateriales[item]) return detalleMateriales[item];
  const clave = normalizarTexto(item);
  const encontrado = Object.entries(detalleMateriales).find(([nombre]) => normalizarTexto(nombre) === clave);
  return encontrado?.[1] || {};
}

const tablas = [
  ["modulos", "actual"],
  ["historial_modulos", "historial"],
  ["protocolos_manuales", "manual"],
];

async function cargarTabla(tabla) {
  const porId = new Map();
  const columnas = "id,serie,fecha_prueba_electrica,protocolo_entrega,materiales";
  const consultas = [
    supabase.from(tabla).select(columnas).gte("fecha_prueba_electrica", inicio).lt("fecha_prueba_electrica", fin).limit(1000),
    supabase.from(tabla).select(columnas).order("fecha_prueba_electrica", { ascending: false, nullsFirst: false }).limit(1000),
  ];
  for (const consulta of consultas) {
    const { data, error } = await consulta;
    if (error) throw new Error(`${tabla}: ${error.message}`);
    for (const registro of data || []) {
      if (enJulio(registro)) porId.set(String(registro.id), registro);
    }
  }
  return [...porId.values()];
}

const registros = [];
for (const [tabla, origen] of tablas) {
  const cargados = await cargarTabla(tabla);
  cargados.forEach((r) => registros.push({ ...r, origen }));
}

const resumen = objetivos.map((objetivo) => ({
  ...objetivo,
  cantidadNueva: 0,
  cantidadReutilizada: 0,
  adicional: 0,
}));

for (const registro of registros) {
  const detalleMateriales = registro?.protocolo_entrega?.detalleMateriales || {};
  for (const fila of resumen) {
    const detalle = obtenerDetalle(detalleMateriales, fila.item);
    const mantencion = parsearCantidad(detalle.mantencion);
    const modificacion = parsearCantidad(detalle.modificacion);
    const nuevo = mantencion.nuevo + modificacion.nuevo;
    const reutilizado = mantencion.reutilizado + modificacion.reutilizado;
    const diferencia = fila.precioSugerido - fila.precioActual;
    fila.cantidadNueva += nuevo;
    fila.cantidadReutilizada += reutilizado;
    fila.adicional += (nuevo * diferencia) + (reutilizado * (diferencia / 2));
  }
}

const adicionalTotal = resumen.reduce((total, fila) => total + fila.adicional, 0);
const simulado = {
  registros: registros.length,
  valorProtocolosActual: balanceCaptura.valorProtocolos,
  valorProtocolosSimulado: balanceCaptura.valorProtocolos + adicionalTotal,
  materialUsado: balanceCaptura.materialUsado,
  sueldos: balanceCaptura.sueldos,
  balanceActual: balanceCaptura.balance,
  mejora: adicionalTotal,
  balanceSimulado: balanceCaptura.balance + adicionalTotal,
  detalle: resumen.filter((fila) => fila.cantidadNueva || fila.cantidadReutilizada || fila.adicional),
};

await fs.writeFile("outputs/propuesta-ajuste-precios-agosto-2026/simulacion-julio-propuesta.json", JSON.stringify(simulado, null, 2), "utf8");
console.log(JSON.stringify(simulado, null, 2));
