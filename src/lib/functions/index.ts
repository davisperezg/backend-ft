export const validarFormatoUUID = (uuid: string) => {
  const regex =
    /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regex.test(uuid);
};

export const completarConCeros = (valor: string, longitud = 8) => {
  // Asegurarse de que el valor sea una cadena
  let valorCadena = String(valor);

  // Completar con ceros a la izquierda hasta alcanzar la longitud deseada (8)
  while (valorCadena.length < longitud) {
    valorCadena = '0' + valorCadena;
  }

  // Limitar la longitud a 8 caracteres
  if (valorCadena.length > longitud) {
    valorCadena = valorCadena.slice(0, longitud);
  }

  return valorCadena;
};

export const quitarCerosIzquierda = (valor: string) => {
  return valor.replace(/^0+/, '');
};

export const parseFloatDecimal = (valor: number, decimales: number) => {
  return Math.round(valor * decimales) / decimales;
};

export const convertirDecimales = (valor: string, decimales: number) => {
  const valorNumber = parseFloat(valor.replace(/,/g, ''));
  return parseFloat(valorNumber.toFixed(decimales));
};

export const centavosFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Función para convertir un número a letras, con centavos (ideal para representar dinero). Fuente: https://gist.github.com/alfchee/e563340276f89b22042a
 *
 * @param {float} cantidad - La cantidad a convertir en letras.
 * @param {string} moneda - Moneda opcional para desplegarse en el texto si es que se especifica una. Ej: "PESOS", "DÓLARES"
 *
 * NumeroALetras
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Luis Alfredo Chee
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author Rodolfo Carmona
 * @contributor Jean (jpbadoino@gmail.com)
 *
 */
export const decimalesSimples = (value: string) => {
  return centavosFormatter.format(parseFloat(value));
};

export const numeroALetras = (cantidad: string | number, moneda: string) => {
  let numero: string | number = 0;
  cantidad = filterNum(String(cantidad));
  cantidad = Number(parseFloat(cantidad));

  if (String(cantidad) == '0.00' || String(cantidad) == '0') {
    return 'CERO CON 00/100' + ' ' + moneda;
  } else {
    const cantidadConCentavosExplicitos = centavosFormatter
      .format(parseFloat(String(cantidad)))
      .toString()
      .split('.');
    const ent = cantidad.toString().split('.');
    const arreglo = separar_split(ent[0]);
    const longitud = arreglo.length;

    switch (longitud) {
      case 1:
        numero = unidades(Number(arreglo[0]));
        break;
      case 2:
        numero = decenas(Number(arreglo[0]), Number(arreglo[1]));
        break;
      case 3:
        numero = centenas(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
        );
        break;
      case 4:
        numero = unidadesdemillar(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
        );
        break;
      case 5:
        numero = decenasdemillar(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
          Number(arreglo[4]),
        );
        break;
      case 6:
        numero = centenasdemillar(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
          Number(arreglo[4]),
          Number(arreglo[5]),
        );
        break;
      case 7:
        numero = unidadesdemillon(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
          Number(arreglo[4]),
          Number(arreglo[5]),
          Number(arreglo[6]),
        );
        break;
      case 8:
        numero = decenasdemillon(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
          Number(arreglo[4]),
          Number(arreglo[5]),
          Number(arreglo[6]),
          Number(arreglo[7]),
        );
        break;
      case 9:
        numero = centenasdemillon(
          Number(arreglo[0]),
          Number(arreglo[1]),
          Number(arreglo[2]),
          Number(arreglo[3]),
          Number(arreglo[4]),
          Number(arreglo[5]),
          Number(arreglo[6]),
          Number(arreglo[7]),
          Number(arreglo[8]),
        );
        break;
      default:
        numero =
          '______________________________________________________________________';
        break;
    }

    cantidadConCentavosExplicitos[1] = isNaN(
      Number(cantidadConCentavosExplicitos[1]),
    )
      ? '00'
      : cantidadConCentavosExplicitos[1];

    if (String(cantidad) == '1000000' && numero == 'UN MILLÓN MIL ') {
      numero = 'UN MILLÓN ';
    }

    const divisibleEntreUnMillon = parseInt(String(cantidad)) % 1000000;

    if (divisibleEntreUnMillon == 0) {
      numero = numero.replace('MILLONES MIL', 'MILLONES');
    }

    if (moneda) {
      if (String(cantidad) == '1000000' && numero == 'UN MILLÓN ') {
        numero = 'UN MILLÓN DE';
      }
      if (divisibleEntreUnMillon == 0 && parseInt(String(cantidad)) > 1000000) {
        numero = numero.replace('MILLONES', 'MILLONES DE');
      }

      return (
        numero +
        ' CON ' +
        cantidadConCentavosExplicitos[1] +
        '/100' +
        ' ' +
        moneda
      );
    } else {
      return numero + ' CON ' + cantidadConCentavosExplicitos[1] + '/100';
    }
  }
};

const filterNum = (str: string) => {
  const numericalChar = new Set([
    '.',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ]);
  str = str
    .split('')
    .filter((char) => numericalChar.has(char))
    .join('');
  return str;
};

function unidades(unidad: number) {
  const unidades = [
    'UN ',
    'DOS ',
    'TRES ',
    'CUATRO ',
    'CINCO ',
    'SEIS ',
    'SIETE ',
    'OCHO ',
    'NUEVE ',
  ];

  return unidades[unidad - 1];
}

function decenas(decena: number, unidad: number) {
  const diez = [
    'ONCE ',
    'DOCE ',
    'TRECE ',
    'CATORCE ',
    'QUINCE',
    'DIECISEIS ',
    'DIECISIETE ',
    'DIECIOCHO ',
    'DIECINUEVE ',
  ];

  const decenas = [
    'DIEZ ',
    'VEINTE',
    'TREINTA',
    'CUARENTA',
    'CINCUENTA',
    'SESENTA',
    'SETENTA',
    'OCHENTA',
    'NOVENTA',
  ];

  if (decena == 0 && unidad == 0) {
    return '';
  }

  if (decena == 0 && unidad > 0) {
    return unidades(unidad);
  }

  if (decena == 1) {
    if (unidad == 0) {
      return decenas[decena - 1];
    } else {
      return diez[unidad - 1];
    }
  } else if (decena == 2) {
    if (unidad == 0) {
      return decenas[decena - 1];
    } else if (unidad == 1) {
      return 'VEINTI' + 'UNO ';
    } else {
      return 'VEINTI' + unidades(unidad);
    }
  } else {
    if (unidad == 0) {
      return decenas[decena - 1] + ' ';
    }
    if (unidad == 1) {
      return decenas[decena - 1] + ' Y ' + 'UNO ';
    }

    return decenas[decena - 1] + ' Y ' + unidades(unidad);
  }
}

function centenas(centena: number, decena: number, unidad: number) {
  const centenas = [
    'CIENTO ',
    'DOSCIENTOS ',
    'TRESCIENTOS ',
    'CUATROCIENTOS ',
    'QUINIENTOS ',
    'SEISCIENTOS ',
    'SETECIENTOS ',
    'OCHOCIENTOS ',
    'NOVECIENTOS ',
  ];

  if (centena == 0 && decena == 0 && unidad == 0) {
    return '';
  }
  if (centena == 1 && decena == 0 && unidad == 0) {
    return 'CIEN ';
  }

  if (centena == 0 && decena == 0 && unidad > 0) {
    return unidades(unidad);
  }

  if (decena == 0 && unidad == 0) {
    return centenas[centena - 1] + '';
  }

  if (decena == 0) {
    const numero = centenas[centena - 1] + '' + decenas(decena, unidad);
    return numero.replace(' Y ', ' ');
  }
  if (centena == 0) {
    return decenas(decena, unidad);
  }

  return centenas[centena - 1] + '' + decenas(decena, unidad);
}

function unidadesdemillar(
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  let numero = unidades(unimill) + 'MIL ' + centenas(centena, decena, unidad);
  numero = numero.replace('UN MIL ', 'MIL ');
  if (unidad == 0) {
    return numero.replace(' Y ', ' ');
  } else {
    return numero;
  }
}

function decenasdemillar(
  decemill: number,
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  const numero =
    decenas(decemill, unimill) + 'MIL ' + centenas(centena, decena, unidad);
  return numero;
}

function centenasdemillar(
  centenamill: number,
  decemill: number,
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  const numero =
    centenas(centenamill, decemill, unimill) +
    'MIL ' +
    centenas(centena, decena, unidad);

  return numero;
}

function unidadesdemillon(
  unimillon: number,
  centenamill: number,
  decemill: number,
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  let numero =
    unidades(unimillon) +
    'MILLONES ' +
    centenas(centenamill, decemill, unimill) +
    'MIL ' +
    centenas(centena, decena, unidad);
  numero = numero.replace('UN MILLONES ', 'UN MILLÓN ');
  if (unidad == 0) {
    return numero.replace(' Y ', ' ');
  } else {
    return numero;
  }
}

function decenasdemillon(
  decemillon: number,
  unimillon: number,
  centenamill: number,
  decemill: number,
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  const numero =
    decenas(decemillon, unimillon) +
    'MILLONES ' +
    centenas(centenamill, decemill, unimill) +
    'MIL ' +
    centenas(centena, decena, unidad);
  return numero;
}

function centenasdemillon(
  centenamillon: number,
  decemillon: number,
  unimillon: number,
  centenamill: number,
  decemill: number,
  unimill: number,
  centena: number,
  decena: number,
  unidad: number,
) {
  const numero =
    centenas(centenamillon, decemillon, unimillon) +
    'MILLONES ' +
    centenas(centenamill, decemill, unimill) +
    'MIL ' +
    centenas(centena, decena, unidad);

  return numero;
}

function separar_split(texto: string) {
  const contenido = [];
  for (let i = 0; i < texto.length; i++) {
    contenido[i] = texto.substr(i, 1);
  }
  return contenido;
}
