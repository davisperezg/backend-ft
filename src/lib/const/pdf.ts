import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

export const docDefinitionA4: TDocumentDefinitions = {
  pageSize: {
    width: 80 * 2.83465,
    height: 'auto',
  },
  //pageMargins: [30, 30],
  content: [
    {
      text: 'keinr',
    },
  ],
};

// ── Tipos ──────────────────────────────────────────────────────────
export interface ItemVenta {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  mtoPrecioUnitario: number;
  precioTotal: number;
}

export interface DatosTicket {
  empresa: {
    razonSocial: string;
    nombreComercial?: string;
    direccion: string;
  };
  tipoDocumento: string; // 'NOTA DE VENTA', 'BOLETA', etc.
  serie: string; // 'NV01-00000003'
  cliente: {
    nombre: string;
    dni: string;
  };
  fechaEmision: string; // '2026-02-26 - 00:23:41'
  items: ItemVenta[];
  opGravada: number;
  igv: number;
  total: number;
  pie1?: string;
  pie2?: string;
}

const MM = 2.83465;

const ticketContent: TDocumentDefinitions['content'] = [
  {
    text: 'keinr',
  },
];

// ── Generador ──────────────────────────────────────────────────────
export function crearDocTicket(
  datos: DatosTicket,
  anchoMM: 58 | 80,
): TDocumentDefinitions {
  const anchoPt = anchoMM * MM;
  const margen = 1.5 * MM;
  const anchoUtil = anchoPt - margen * 2;

  const fs =
    anchoMM === 58
      ? { titulo: 9, sub: 8, normal: 7, small: 6.5, total: 11 }
      : { titulo: 10, sub: 9, normal: 8, small: 7.5, total: 13 };

  //   const nChar = anchoMM === 58 ? 40 : 54;
  const nChar = anchoMM === 58 ? 32 : 46;
  const sep = (char: '=' | '-') => ({
    text: char.repeat(nChar),
    fontSize: fs.small,
    alignment: 'center' as const,
    margin: [0, 1, 0, 1] as [number, number, number, number],
  });

  // ── Columnas: COD | DESCRIPCION | CANT | P.UNIT | P.TOTAL ──────
  //  • DESCRIPCION usa '*' para ocupar TODO el espacio restante
  const wCod = anchoUtil * 0.1; // ← reducido
  const wCant = anchoUtil * 0.12;
  const wUnit = anchoUtil * 0.2;
  const wTot = anchoUtil * 0.22;
  // widths: [wCod, '*', wCant, wUnit, wTot]

  const layoutMinimo = {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 1,
    paddingRight: () => 1,
    paddingTop: () => 1,
    paddingBottom: () => 1,
  };

  const tableBody: TableCell[][] = [
    // ── Cabecera ────────────────────────────────────────────────
    [
      { text: 'COD', bold: true, fontSize: fs.small },
      { text: 'DESC', bold: true, fontSize: fs.small }, // ← columna propia
      { text: 'CANT', bold: true, fontSize: fs.small, alignment: 'center' },
      { text: 'P.UNIT', bold: true, fontSize: fs.small, alignment: 'right' },
      { text: 'P.TOTAL', bold: true, fontSize: fs.small, alignment: 'right' },
    ],
    // ── Ítems (1 fila por ítem) ──────────────────────────────────
    ...datos.items.map((item): TableCell[] => [
      { text: item.codigo, fontSize: fs.small },
      { text: item.descripcion, fontSize: fs.small }, // ← separado
      {
        // cantidad arriba, unidad abajo
        stack: [
          {
            text: item.cantidad.toString(),
            fontSize: fs.small,
            alignment: 'center',
          },
          {
            text: item.unidad,
            fontSize: fs.small - 0.5,
            alignment: 'center',
            color: '#444',
          },
        ],
      },
      {
        text: item.mtoPrecioUnitario.toFixed(3),
        fontSize: fs.small,
        alignment: 'right',
      },
      {
        text: item.precioTotal.toFixed(2),
        fontSize: fs.small,
        alignment: 'right',
      },
    ]),
  ];

  const content: Content[] = [
    // ── ENCABEZADO ────────────────────────────────────────────────
    {
      text: datos.empresa.razonSocial,
      bold: true,
      fontSize: fs.titulo,
      alignment: 'center',
    },
    ...(datos.empresa.nombreComercial
      ? [
          {
            text: datos.empresa.nombreComercial,
            bold: true,
            fontSize: fs.titulo,
            alignment: 'center',
          } as Content,
        ]
      : []),
    { text: datos.empresa.direccion, fontSize: fs.normal, alignment: 'center' },

    sep('='),

    // ── TIPO / SERIE ──────────────────────────────────────────────
    {
      text: datos.tipoDocumento,
      bold: true,
      fontSize: fs.sub,
      alignment: 'center',
    },
    { text: datos.serie, bold: true, fontSize: fs.sub, alignment: 'center' },

    // ── CLIENTE ───────────────────────────────────────────────────
    { text: `NOMBRE:  ${datos.cliente.nombre}`, fontSize: fs.normal },
    { text: `DNI:     ${datos.cliente.dni}`, fontSize: fs.normal },
    { text: `EMISIÓN: ${datos.fechaEmision}`, fontSize: fs.normal },

    sep('-'),

    // ── TABLA DE ÍTEMS ────────────────────────────────────────────
    {
      table: {
        widths: [wCod, '*', wCant, wUnit, wTot], // '*' → DESCRIPCION ocupa lo restante
        body: tableBody,
      },
      layout: layoutMinimo,
    },

    sep('-'),

    // ── SUBTOTALES ────────────────────────────────────────────────
    {
      columns: [
        { text: 'OP. GRAVADA', fontSize: fs.normal, width: '*' },
        {
          text: datos.opGravada.toFixed(2),
          fontSize: fs.normal,
          alignment: 'right',
          width: 'auto',
        },
      ],
    },
    {
      columns: [
        { text: 'IGV', fontSize: fs.normal, width: '*' },
        {
          text: datos.igv.toFixed(2),
          fontSize: fs.normal,
          alignment: 'right',
          width: 'auto',
        },
      ],
    },

    sep('-'),

    // ── IMPORTE TOTAL ─────────────────────────────────────────────
    {
      columns: [
        { text: 'IMPORTE TOTAL', bold: true, fontSize: fs.total, width: '*' },
        {
          text: `S/ ${datos.total.toFixed(2)}`,
          bold: true,
          fontSize: fs.total,
          alignment: 'right',
          width: 'auto',
        },
      ],
    },

    sep('='),

    // ── PIE ───────────────────────────────────────────────────────
    {
      text: datos.pie1 ?? 'Documento generado en apisunat.com',
      fontSize: fs.small,
      alignment: 'center',
    },
    {
      text: datos.pie2 ?? 'ESTE NO ES UN COMPROBANTE DE PAGO',
      fontSize: fs.small,
      bold: true,
      alignment: 'center',
    },
  ];

  return {
    pageSize: { width: anchoPt, height: 'auto' },
    pageMargins: [margen, margen],
    defaultStyle: { lineHeight: 1.1 },
    content,
  };
}

export const docDefinition58mm: TDocumentDefinitions = {
  pageSize: {
    width: 58 * MM, // ~164.41 pt
    height: 'auto',
  },
  pageMargins: [4 * MM, 4 * MM],
  content: ticketContent,
};

export const docDefinition80mm: TDocumentDefinitions = {
  pageSize: {
    width: 80 * MM, // ~226.77 pt
    height: 'auto',
  },
  pageMargins: [4 * MM, 4 * MM],
  content: ticketContent,
};
