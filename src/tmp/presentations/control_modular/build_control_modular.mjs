import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:\\Users\\CCERNA\\control-modulos\\src";
const SKILL_DIR = "C:\\Users\\CCERNA\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.921.10847\\skills\\presentations";
const TMP_DIR = path.join(workspaceDir, "tmp", "presentations", "control_modular");
const FINAL_PPTX = path.join(workspaceDir, "output", "pptx", "Presentacion_Control_Modular_Gerencia_Final.pptx");
const RUNTIME_PYTHON = "C:\\Users\\CCERNA\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href,
);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const FONT = resolvePresentationFont();
const W = 794;
const H = 1123;
const M = 68;

const C = {
  navy: "#0B2533",
  navy2: "#102F3E",
  cyan: "#31D6D1",
  blue: "#2476D0",
  green: "#29D878",
  amber: "#F4B51D",
  red: "#FF5364",
  ink: "#17202A",
  slate: "#586675",
  muted: "#8492A0",
  paper: "#F8FAFC",
  light: "#EEF3F6",
  line: "#D7E0E6",
  white: "#FFFFFF",
  softGreen: "#E7F7EF",
  softAmber: "#FFF6DC",
  softBlue: "#E8F2FD",
};

const imgPaths = {
  cover: "C:\\Users\\CCERNA\\AppData\\Local\\Temp\\codex-clipboard-07fbfca5-5c14-491b-b131-b7359155041b.png",
  modules: "C:\\Users\\CCERNA\\AppData\\Local\\Temp\\codex-clipboard-c6df228a-9597-4593-987b-952b0a771d95.png",
  protocols: "C:\\Users\\CCERNA\\AppData\\Local\\Temp\\codex-clipboard-3b091708-a213-4de9-9b53-b20bd336c781.png",
  warehouse: "C:\\Users\\CCERNA\\AppData\\Local\\Temp\\codex-clipboard-1b01f670-0d75-4b1d-a8f7-722275d63108.png",
  mobile: "C:\\Users\\CCERNA\\control-modulos\\src\\.codex-remote-attachments\\019f3dc1-a626-7233-913c-2039d55028fc\\0af27628-bf65-4de6-87be-14cca3cccd63\\1-1000464293.jpg",
  balance: "C:\\Users\\CCERNA\\AppData\\Local\\Temp\\codex-clipboard-05cba685-bf6b-4ec5-b9bb-775ad6a0d2b0.png",
};

const images = {};
for (const [key, file] of Object.entries(imgPaths)) images[key] = new Uint8Array(await fs.readFile(file));

function addShape(slide, { left, top, width, height, fill = "none", line = "none", radius = 0, shadow }) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line: line === "none" ? { fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
    ...(shadow ? { shadow } : {}),
  });
}

function addText(slide, text, { left, top, width, height, size = 22, color = C.ink, bold = false, align = "left", valign = "top", spacing = 1, italic = false }) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    typeface: FONT,
    fontSize: size,
    color,
    bold,
    italic,
    alignment: align,
    verticalAlignment: valign,
    lineSpacing: spacing,
    autoFit: "none",
  };
  box.text.alignment = align;
  box.text.verticalAlignment = valign;
  return box;
}

function addRichText(slide, paragraphs, pos, style = {}) {
  const box = slide.shapes.add({ geometry: "textbox", position: pos, fill: "none", line: { fill: "none", width: 0 } });
  box.text = paragraphs;
  box.text.style = {
    typeface: FONT,
    fontSize: style.size ?? 20,
    color: style.color ?? C.ink,
    verticalAlignment: style.valign ?? "top",
    lineSpacing: style.spacing ?? 1.08,
    autoFit: "none",
  };
  return box;
}

function addBulletList(slide, items, { left, top, width, size = 18, color = C.ink, gap = 50, accent = C.cyan }) {
  items.forEach((item, i) => {
    addShape(slide, { left, top: top + i * gap + 8, width: 8, height: 8, fill: accent, radius: 2 });
    if (typeof item === "string") {
      addText(slide, item, { left: left + 20, top: top + i * gap, width: width - 20, height: gap + 12, size, color });
    } else {
      addRichText(slide, [{ runs: [{ run: item.lead, textStyle: { bold: true } }, item.text] }], { left: left + 20, top: top + i * gap, width: width - 20, height: gap + 16 }, { size, color });
    }
  });
}

function addImage(slide, bytes, { left, top, width, height, fit = "cover", crop, radius = 12, alt = "Captura de la aplicación" }) {
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit,
    position: { left, top, width, height },
    ...(crop ? { crop } : {}),
    geometry: radius ? "roundRect" : "rect",
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function addHeader(slide, section, page, dark = false) {
  const color = dark ? "#B8CDD7" : C.muted;
  addText(slide, "CONTROL MODULAR", { left: M, top: 34, width: 250, height: 24, size: 12, color, bold: true });
  addText(slide, section.toUpperCase(), { left: W - M - 260, top: 34, width: 260, height: 24, size: 12, color, align: "right" });
  addShape(slide, { left: M, top: H - 52, width: W - M * 2, height: 1, fill: dark ? "#355260" : C.line });
  addText(slide, "Planta Bayona", { left: M, top: H - 42, width: 200, height: 20, size: 11, color });
  addText(slide, String(page), { left: W - M - 40, top: H - 42, width: 40, height: 20, size: 11, color, align: "right" });
}

function addSectionTitle(slide, kicker, title, subtitle, { top = 78, titleSize = 42, dark = false } = {}) {
  addText(slide, kicker.toUpperCase(), { left: M, top, width: W - M * 2, height: 26, size: 13, color: dark ? C.cyan : C.blue, bold: true });
  addText(slide, title, { left: M, top: top + 34, width: W - M * 2, height: 115, size: titleSize, color: dark ? C.white : C.navy, bold: true, spacing: 0.95 });
  if (subtitle) addText(slide, subtitle, { left: M, top: top + 150, width: W - M * 2, height: 68, size: 20, color: dark ? "#C6D5DC" : C.slate, spacing: 1.12 });
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

// 1. Portada
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addShape(slide, { left: 0, top: 0, width: W, height: 770, fill: C.navy });
  addShape(slide, { left: M, top: 80, width: 72, height: 72, fill: C.cyan, radius: 16 });
  addText(slide, "CM", { left: M, top: 80, width: 72, height: 72, size: 28, color: C.navy, bold: true, align: "center", valign: "middle" });
  addText(slide, "PRESENTACIÓN A GERENCIA", { left: M, top: 214, width: 420, height: 26, size: 14, color: C.amber, bold: true });
  addText(slide, "Control\nModular", { left: M, top: 250, width: 650, height: 145, size: 60, color: C.white, bold: true, spacing: 0.88 });
  addText(slide, "Gestión integral de módulos, protocolos, mantención y bodega en una sola aplicación.", { left: M, top: 418, width: 620, height: 70, size: 21, color: "#C9D8DF", spacing: 1.15 });
  addShape(slide, { left: 166, top: 560, width: 560, height: 336, fill: C.white, radius: 14, shadow: "shadow-xl" });
  addImage(slide, images.cover, { left: 176, top: 570, width: 540, height: 316, fit: "cover", crop: { left: 0.12, top: 0, right: 0, bottom: 0.09 }, radius: 10, alt: "Vista principal de Control Modular" });
  const cols = [M, 300, 540];
  const labels = [["APLICACIÓN", "Control Modular"], ["PLANTA", "Planta Bayona"], ["FECHA", "Septiembre 2026"]];
  labels.forEach((pair, i) => {
    addText(slide, pair[0], { left: cols[i], top: 944, width: 190, height: 22, size: 11, color: C.muted, bold: true });
    addText(slide, pair[1], { left: cols[i], top: 972, width: 210, height: 48, size: 17, color: C.navy, bold: true });
  });
  slide.speakerNotes.textFrame.setText("Diseño inspirado en el documento de referencia entregado por el usuario. Captura de la aplicación Control Modular.");
}

// 2. Resumen ejecutivo
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Resumen ejecutivo", 2);
  addSectionTitle(slide, "Resumen ejecutivo", "Una sola trazabilidad desde la línea hasta bodega", "La aplicación conecta el estado físico de cada módulo con sus materiales, pruebas eléctricas, protocolos y costos asociados.", { top: 76, titleSize: 39 });

  const y = 315;
  addShape(slide, { left: M, top: y, width: 310, height: 260, fill: "#F8EEE8", line: "#E7D4C9", radius: 12 });
  addShape(slide, { left: M, top: y, width: 5, height: 260, fill: "#D67535", radius: 2 });
  addText(slide, "Antes", { left: M + 22, top: y + 20, width: 240, height: 34, size: 22, color: C.navy, bold: true });
  addBulletList(slide, [
    "Estado de módulos disperso entre personas y registros.",
    "Solicitudes de material sin una trazabilidad uniforme.",
    "Protocolos y costos revisados en etapas separadas.",
    "Dificultad para detectar diferencias entre retiro y cobro.",
  ], { left: M + 22, top: y + 67, width: 268, size: 17, gap: 47, accent: C.amber });

  addShape(slide, { left: 416, top: y, width: 310, height: 260, fill: C.softGreen, line: "#C5E9D5", radius: 12 });
  addShape(slide, { left: 416, top: y, width: 5, height: 260, fill: "#198B55", radius: 2 });
  addText(slide, "Con Control Modular", { left: 438, top: y + 20, width: 260, height: 34, size: 22, color: C.navy, bold: true });
  addBulletList(slide, [
    "Estado por serie y línea visible en tiempo real.",
    "Pedidos de bodega ligados al módulo y al responsable.",
    "Protocolos con detalle de materiales y valores.",
    "Balances que comparan cantidades retiradas y cobradas.",
  ], { left: 438, top: y + 67, width: 268, size: 17, gap: 47, accent: C.green });

  const benefits = [
    ["01", "Trazabilidad", "Cada serie conserva su historia y responsables."],
    ["02", "Control operativo", "Las líneas muestran estados y trabajos pendientes."],
    ["03", "Bodega", "Pedidos, devoluciones e inventario quedan vinculados."],
    ["04", "Control de costos", "Protocolos y balances permiten revisar diferencias."],
    ["05", "Acceso por rol", "Cada usuario ve las acciones que le corresponden."],
    ["06", "Uso en terreno", "La interfaz funciona en computador y teléfono."],
  ];
  benefits.forEach((b, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = M + col * 220;
    const by = 615 + row * 145;
    addShape(slide, { left: bx, top: by, width: 196, height: 120, fill: C.paper, line: C.line, radius: 10 });
    addText(slide, b[0], { left: bx + 14, top: by + 12, width: 44, height: 28, size: 22, color: C.amber, bold: true });
    addText(slide, b[1], { left: bx + 14, top: by + 43, width: 168, height: 28, size: 17, color: C.navy, bold: true });
    addText(slide, b[2], { left: bx + 14, top: by + 72, width: 168, height: 38, size: 13, color: C.slate, spacing: 1.08 });
  });
}

// 3. Flujo y roles
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Cómo funciona", 3);
  addSectionTitle(slide, "Cómo funciona", "Un flujo operativo conectado", "Cada acción queda asociada a una serie, una línea, una persona y una fecha.", { top: 76, titleSize: 43 });

  const steps = [
    ["1", "Ingreso", "Se registra la serie y se asigna a una línea."],
    ["2", "Mantención", "El equipo registra notas y solicita materiales."],
    ["3", "Bodega", "El pedido se aprueba, prepara y entrega."],
    ["4", "Prueba", "La prueba eléctrica actualiza el estado del módulo."],
    ["5", "Protocolo", "Materiales, valores e historial quedan disponibles."],
  ];
  steps.forEach((s, i) => {
    const x = M + i * 132;
    addShape(slide, { left: x, top: 300, width: 120, height: 205, fill: i === 4 ? C.softGreen : C.light, line: C.line, radius: 12 });
    addShape(slide, { left: x + 14, top: 316, width: 34, height: 34, fill: C.navy, radius: 17 });
    addText(slide, s[0], { left: x + 14, top: 316, width: 34, height: 34, size: 16, color: C.white, bold: true, align: "center", valign: "middle" });
    addText(slide, s[1], { left: x + 11, top: 362, width: 98, height: 40, size: 14, color: C.navy, bold: true });
    addText(slide, s[2], { left: x + 11, top: 404, width: 98, height: 90, size: 12, color: C.slate, spacing: 1.05 });
    if (i < 4) addText(slide, ">", { left: x + 120, top: 370, width: 12, height: 40, size: 23, color: C.amber, bold: true, align: "center" });
  });

  addText(slide, "Roles del sistema", { left: M, top: 535, width: 300, height: 34, size: 25, color: C.navy, bold: true });
  addShape(slide, { left: M, top: 580, width: W - M * 2, height: 46, fill: C.navy });
  addText(slide, "ROL", { left: M + 12, top: 580, width: 135, height: 46, size: 14, color: C.white, bold: true, valign: "middle" });
  addText(slide, "RESPONSABILIDAD PRINCIPAL", { left: M + 145, top: 580, width: 490, height: 46, size: 14, color: C.white, bold: true, valign: "middle" });
  const roles = [
    ["Administrador", "Configura usuarios, permisos, catálogos y revisa toda la operación."],
    ["Operador / eléctrico", "Actualiza módulos, solicita materiales y registra pruebas o protocolos según permiso."],
    ["Bodega / analista", "Recibe avisos, gestiona pedidos, inventario, vales y devoluciones."],
    ["Jefatura", "Consulta indicadores, balances, auditoría e historial por serie."],
  ];
  roles.forEach((r, i) => {
    const ry = 626 + i * 68;
    addShape(slide, { left: M, top: ry, width: W - M * 2, height: 68, fill: i % 2 ? C.paper : C.white, line: C.line });
    addText(slide, r[0], { left: M + 12, top: ry, width: 135, height: 68, size: 15, color: C.navy, bold: true, valign: "middle" });
    addText(slide, r[1], { left: M + 145, top: ry + 9, width: 490, height: 50, size: 15, color: C.ink, valign: "middle" });
  });

  addShape(slide, { left: M, top: 930, width: W - M * 2, height: 100, fill: C.softBlue, radius: 12 });
  addText(slide, "Datos conectados", { left: M + 18, top: 946, width: 220, height: 30, size: 19, color: C.navy, bold: true });
  addText(slide, "Supabase centraliza la información y los permisos. La aplicación permite exportar listados e inventario cuando el equipo necesita trabajar en Excel.", { left: M + 18, top: 980, width: W - M * 2 - 36, height: 46, size: 15, color: C.slate });
}

// 4. Control de módulos
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Control de módulos", 4);
  addSectionTitle(slide, "Control de módulos", "El estado de cada serie queda visible", "Las tarjetas permiten reconocer rápidamente qué módulos están disponibles, pendientes, en mantención o con una alerta.", { top: 76, titleSize: 41 });

  addShape(slide, { left: M, top: 300, width: W - M * 2, height: 425, fill: C.navy, radius: 14, shadow: "shadow-lg" });
  addImage(slide, images.modules, { left: M + 12, top: 312, width: W - M * 2 - 24, height: 401, fit: "cover", crop: { left: 0.01, top: 0.04, right: 0.01, bottom: 0.05 }, radius: 10, alt: "Tarjetas de módulos organizadas por línea" });
  addText(slide, "Vista de líneas y estados por módulo", { left: M, top: 735, width: 420, height: 24, size: 12, color: C.muted, italic: true });

  addBulletList(slide, [
    { lead: "Lectura inmediata: ", text: "color e ícono distinguen prueba aprobada, mantención, alerta y módulo sin iniciar." },
    { lead: "Historial por serie: ", text: "la búsqueda reúne movimientos, notas y pruebas eléctricas anteriores." },
    { lead: "Garantía automática: ", text: "al ingresar una serie, el sistema revisa pruebas eléctricas de los últimos tres meses y conserva la fecha anterior cuando corresponde." },
    { lead: "Acciones controladas: ", text: "guardar nota, solicitar material y solicitar prueba dependen del rol del usuario." },
  ], { left: M, top: 790, width: W - M * 2, size: 17, gap: 64, accent: C.cyan });
}

// 5. Protocolos y garantía
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Protocolos y costos", 5);
  addSectionTitle(slide, "Protocolos y costos", "Cada cobro conserva su detalle", "Los protocolos mensuales muestran la serie, fecha, tipo de módulo, valores, orden de trabajo y materiales registrados.", { top: 76, titleSize: 41 });

  addShape(slide, { left: M, top: 296, width: W - M * 2, height: 470, fill: C.navy, radius: 14, shadow: "shadow-lg" });
  addImage(slide, images.protocols, { left: M + 12, top: 308, width: W - M * 2 - 24, height: 446, fit: "cover", crop: { left: 0.12, top: 0.02, right: 0.02, bottom: 0.03 }, radius: 10, alt: "Vista de protocolos mensuales" });
  addText(slide, "Protocolos mensuales con filtros, serie, valores e ID de orden de trabajo", { left: M, top: 776, width: 560, height: 24, size: 12, color: C.muted, italic: true });

  const features = [
    ["Detalle editable", "Cada protocolo conserva mano de obra, materiales, cantidades y precios aplicados."],
    ["Exportación", "El listado de pruebas eléctricas puede filtrarse por fecha y exportarse."],
    ["Garantía", "La fecha de una prueba anterior acompaña al módulo cuando reingresa dentro del período definido."],
    ["Seguimiento", "Las diferencias entre material retirado y protocolizado quedan disponibles para revisión."],
  ];
  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * 335;
    const y = 828 + row * 104;
    addShape(slide, { left: x, top: y, width: 305, height: 88, fill: row === 0 ? C.paper : C.softGreen, line: C.line, radius: 10 });
    addText(slide, f[0], { left: x + 14, top: y + 12, width: 275, height: 25, size: 16, color: C.navy, bold: true });
    addText(slide, f[1], { left: x + 14, top: y + 39, width: 275, height: 43, size: 13, color: C.slate });
  });
}

// 6. Bodega
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Bodega", 6);
  addSectionTitle(slide, "Bodega", "Pedidos e inventario en el mismo flujo", "La vista de bodega recibe solicitudes, controla entregas y devoluciones, y mantiene el historial de cada vale.", { top: 76, titleSize: 41 });

  addShape(slide, { left: M, top: 294, width: 455, height: 360, fill: C.navy, radius: 14, shadow: "shadow-lg" });
  addImage(slide, images.warehouse, { left: M + 10, top: 304, width: 435, height: 340, fit: "cover", crop: { left: 0.12, top: 0.02, right: 0.01, bottom: 0.05 }, radius: 10, alt: "Inventario de bodega en escritorio" });
  addShape(slide, { left: 545, top: 294, width: 181, height: 360, fill: C.light, radius: 14, shadow: "shadow-lg" });
  slide.images.add({ blob: images.mobile, contentType: "image/jpeg", alt: "Vista móvil de bodega", fit: "cover", position: { left: 555, top: 304, width: 161, height: 340 }, crop: { left: 0.01, top: 0.05, right: 0.01, bottom: 0.39 }, geometry: "roundRect", borderRadius: 10 });
  addText(slide, "Escritorio y teléfono", { left: M, top: 664, width: 300, height: 24, size: 12, color: C.muted, italic: true });

  addBulletList(slide, [
    { lead: "Solicitud asociada: ", text: "cada pedido mantiene proyecto, módulo, serie, responsable y materiales." },
    { lead: "Aprobación identificada: ", text: "el vale muestra quién autorizó la entrega y quién recibió." },
    { lead: "Inventario operativo: ", text: "entradas, salidas y saldo final se consultan desde la misma vista." },
    { lead: "Herramientas de bodega: ", text: "carga de inventario, exportación, historial de vales y códigos de barra." },
    { lead: "Notificaciones por rol: ", text: "bodega y analistas reciben los avisos que corresponden a sus permisos." },
  ], { left: M, top: 724, width: W - M * 2, size: 17, gap: 58, accent: C.blue });
}

// 7. Gestión y próximos pasos
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "Gestión y control", 7);
  addSectionTitle(slide, "Gestión y control", "Los datos permiten revisar diferencias antes del cierre", "Los balances comparan cantidades retiradas y protocolizadas, y ayudan a enfocar la revisión donde existe una desviación.", { top: 76, titleSize: 39 });

  addShape(slide, { left: M, top: 296, width: W - M * 2, height: 330, fill: "#202020", radius: 14, shadow: "shadow-lg" });
  addImage(slide, images.balance, { left: M + 12, top: 308, width: W - M * 2 - 24, height: 306, fit: "cover", crop: { left: 0.01, top: 0, right: 0.01, bottom: 0 }, radius: 10, alt: "Balance de materiales retirados y cobrados" });

  const metrics = [
    ["RETIRO", "Cantidad informada por bodega"],
    ["COBRO", "Cantidad registrada en protocolos"],
    ["DIFERENCIA", "Unidades que requieren revisión"],
    ["IMPACTO", "Valor asociado a la desviación"],
  ];
  metrics.forEach((m, i) => {
    const x = M + i * 165;
    addShape(slide, { left: x, top: 660, width: 145, height: 112, fill: i === 2 ? C.softAmber : C.paper, line: C.line, radius: 9 });
    addText(slide, m[0], { left: x + 12, top: 675, width: 121, height: 24, size: 15, color: i === 2 ? "#A86900" : C.blue, bold: true });
    addText(slide, m[1], { left: x + 12, top: 707, width: 121, height: 52, size: 13, color: C.slate });
  });

  addText(slide, "Siguiente etapa", { left: M, top: 820, width: 300, height: 34, size: 25, color: C.navy, bold: true });
  addBulletList(slide, [
    { lead: "Publicación: ", text: "alojar la aplicación en un dominio propio con certificados y respaldos definidos." },
    { lead: "Integración: ", text: "evaluar intercambio de datos con Unisoft mediante archivos, API o una capa intermedia." },
    { lead: "Gobierno de datos: ", text: "formalizar responsables, revisiones periódicas y criterios para corregir diferencias." },
  ], { left: M, top: 866, width: W - M * 2, size: 17, gap: 63, accent: C.cyan });
}

const candidatePath = path.join(TMP_DIR, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 7,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};
const fontPolicy = { basis: "design", families: [FONT] };
const expectedSlideSizeEmu = "7562850,10696575";

const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", expectedSlideSizeEmu,
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(TMP_DIR, "Presentacion_Control_Modular_Gerencia_Final.validation.json"),
});

for (let i = 0; i < presentation.slides.items.length; i++) {
  const slide = presentation.slides.items[i];
  const preview = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(TMP_DIR, `slide-${i + 1}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const montage = await presentation.export({ format: "png", montage: true, scale: 0.35 });
await fs.writeFile(path.join(TMP_DIR, "montage.png"), new Uint8Array(await montage.arrayBuffer()));

console.log(JSON.stringify({ font: FONT, finalPath: FINAL_PPTX, result }, null, 2));
