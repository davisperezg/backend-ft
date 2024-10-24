import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CodesReturnSunatEntity } from '../entities/codes-return-sunat.entity';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

@Injectable()
export class CodesReturnSunatService implements OnApplicationBootstrap {
  private logger = new Logger('CodesReturnSunatService');

  constructor(
    @InjectRepository(CodesReturnSunatEntity)
    private codeReturnRepository: Repository<CodesReturnSunatEntity>,
  ) {}

  async onApplicationBootstrap() {
    console.log(
      '='.repeat(30),
      'SE INICIA PROCESO DE VALIDACION DE CODIGOS DE RETORNO DE SUNAT',
      '='.repeat(30),
    );
    // Directorio donde se guardan los archivos Excel
    const excelDirectory = path.join(
      process.cwd(),
      `uploads/utils/validaciones`,
    );

    // Directorio donde se guardan los archivos Excel Migrations
    const excelDirectoryMigrations = path.join(
      process.cwd(),
      `uploads/utils/migraciones`,
    );

    // Buscar el archivo Excel más reciente validaciones
    const latestFile = this.findLatestExcelFile(excelDirectory);

    // Buscar el archivo Excel más reciente migraciones
    const latestFileMigrations = this.findLatestExcelFile(
      excelDirectoryMigrations,
    );

    //Si existe archivo xml validaciones
    if (latestFile) {
      // Leer el archivo Excel
      const fileBuffer = fs.readFileSync(latestFile);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Obtenemos todos los codigos de retorno de sunat
      const sheetNameCodeReturn = 'CódigosRetorno';
      const worksheetCodesReturn = workbook.Sheets[sheetNameCodeReturn];
      const jsonDataCodesReturn =
        XLSX.utils.sheet_to_json(worksheetCodesReturn);

      // Convertir los datos de la hoja a JSON
      const XML_CODES = jsonDataCodesReturn
        .slice(1, jsonDataCodesReturn.length)
        .map((data) => {
          const values = Object.values(data);

          const codeReturn = Number(values[0]);
          let tipoReturn = '';

          // Del 0100 al 999 Excepciones propias de SUNAT
          if (codeReturn >= 100 && codeReturn <= 999) {
            tipoReturn = 'ERROR_EXCEPCION';
          }
          // Del 1000 al 1999 Excepciones (formatos y estructura)propias del contribuyente
          else if (codeReturn >= 1000 && codeReturn <= 1999) {
            tipoReturn = 'ERROR_CONTRIBUYENTE';
          }
          // Del 2000 al 3999 Errores que generan rechazo
          else if (codeReturn >= 2000 && codeReturn <= 3999) {
            tipoReturn = 'RECHAZO';
          }
          // Del 4000 en adelante Observaciones
          else {
            tipoReturn = 'OBSERV';
          }

          // Muestra solo si existe mensaje de retorno
          if (values[1]) {
            return {
              codigo_retorno: values[0],
              tipo_retorno: tipoReturn,
              mensaje_retorno: values[1],
              grupo: null,
            };
          }
        })
        .filter(Boolean);

      // Datos actual de la db
      const listCodesReturnSunat = await this.findAllCodesReturnSunat();

      /**PROCESO PARA OBTENER SIEMPRE UNA DATA ACTUALIZADA EN BASE A CODIGOS DE RETORNO DE SUNAT
       * Ejemplo:
        //Database
        const array1 = [
            {codigo: "1", descripcion: "abc"},
            {codigo: "2", descripcion: "abc"},
            {codigo: "3", descripcion: "abc"}
            ]

        //Llega en mi nuevo xml
        const array2 = [
            {codigo: "1", descripcion: "abc"},
            {codigo: "2", descripcion: "abc"},
            {codigo: "4", descripcion: "abc"},
            {codigo: "5", descripcion: "abc"}
            ]

        //Resultado = quitamos 3 y agregamos 4 y 5; Siempre debe llegar 1 archivo xml de validaciones
        const Resultado = [
            {codigo: "1", descripcion: "abc"},
            {codigo: "2", descripcion: "abc"},
            {codigo: "4", descripcion: "abc"},
            {codigo: "5", descripcion: "abc"}
            ]
      */

      // 1: Comparamos si los valores que tiene mi db son diferentes a los que llega el xml_validaciones
      // Obtenemos solo los codigos de retorno de la db
      const codesActually = [
        ...new Set(listCodesReturnSunat.map((item) => item.codigo_retorno)),
      ];

      // Filtramos los elementos que no estan en la db, con esto obtenemos los nuevos elementos que vienen del xml_validaciones
      const NEW_ELEMENTOS_XML_CODES_RETURN_MAP = XML_CODES.filter(
        (nuevo) => !codesActually.includes(nuevo.codigo_retorno),
      ); // Fin 1

      // Agregamos los nuevos elementos al array de la db
      listCodesReturnSunat.push(...NEW_ELEMENTOS_XML_CODES_RETURN_MAP);

      //2: Comparamos la db que no estan en el xml_validaciones, con esto obtenemos los elementos obsoletos
      // Obtenemos solo los codigos de retorno del xml_validaciones
      const codesXML = [
        ...new Set(XML_CODES.map((item) => item.codigo_retorno)),
      ];

      // Elementos obsoletos: los que estaban en db pero ya no están en xml_validaciones
      const CODES_OBSOLETE = listCodesReturnSunat.filter(
        (existente) => !codesXML.includes(existente.codigo_retorno),
      ); // Fin 2

      //   const NEW_DATA_UPDATED = listCodesReturnSunat.filter((existente) =>
      //     codesXML.includes(existente.codigo_retorno),
      //   );
      /** Fin del proceso  */

      //Si hay obsoletos eliminamos de la db: estos son los que ya no llegan en el xml_validaciones sin embargo estan en la db
      if (CODES_OBSOLETE.length > 0) {
        this.logger.error(
          `Eliminando códigos obsoletos de la base de datos: ${
            CODES_OBSOLETE.length
          }:${JSON.stringify(
            CODES_OBSOLETE.map((item) => item.codigo_retorno),
          )}`,
        );
        for (let index = 0; index < CODES_OBSOLETE.length; index++) {
          const obsoleto = CODES_OBSOLETE[index];
          await this.codeReturnRepository.delete({
            codigo_retorno: obsoleto.codigo_retorno,
          });
        }
      }

      //Si hay nuevos elementos filtramos con el xml obs para obtener solo los nuevos codigos
      if (NEW_ELEMENTOS_XML_CODES_RETURN_MAP.length > 0) {
        this.logger.debug(
          `Recibimos nuevos codigos procedemos a filtrar: ${
            NEW_ELEMENTOS_XML_CODES_RETURN_MAP.length
          }:${JSON.stringify(
            NEW_ELEMENTOS_XML_CODES_RETURN_MAP.map(
              (item) => item.codigo_retorno,
            ),
          )}`,
        );

        //Se lee el archivo de migraciones
        if (latestFileMigrations) {
          const codesMigrations = this.getCodesMigrations(latestFileMigrations);
          this.logger.verbose(
            `Existe un listado de observaciones que migran a errores: ${
              codesMigrations.length
            }:${JSON.stringify(codesMigrations)}`,
          );

          //Filtramos los elementos(nuevos) que no estan en el archivo de migraciones
          //Estos elementos son los que no se han migrado y son considerados nuevos
          const NEW_CODES_CLEAR = NEW_ELEMENTOS_XML_CODES_RETURN_MAP.filter(
            (nuevo) => !codesMigrations.includes(nuevo.codigo_retorno),
          );

          //los agregamos a la db
          if (NEW_CODES_CLEAR.length > 0) {
            this.logger.log(
              `Hay nuevos códigos de retorno de SUNAT: ${
                NEW_CODES_CLEAR.length
              }:${JSON.stringify(
                NEW_CODES_CLEAR.map((item) => item.codigo_retorno),
              )}`,
            );
            const new_codes_return_sunat =
              this.codeReturnRepository.create(NEW_CODES_CLEAR);

            await this.codeReturnRepository.insert(new_codes_return_sunat);
          } else {
            this.logger.log(
              'No se encontró ningún código de retorno de SUNAT nuevo para procesar.',
            );
          }
        } else {
          this.logger.log(
            'No se encontró ningún archivo Excel Migrations para procesar.',
          );
        }
      } else {
        this.logger.debug(
          'No se encontraron nuevos códigos de retorno de SUNAT.',
        );

        const codesMigrations = this.getCodesMigrations(latestFileMigrations);
        this.logger.verbose(
          `Existe un listado de observaciones que migran a errores: ${
            codesMigrations.length
          }:${JSON.stringify(codesMigrations)}`,
        );

        //Filtramos solo los codigos con observaciones
        const listadoObsoletos = listCodesReturnSunat.filter(
          (existente) =>
            codesMigrations.includes(existente.codigo_retorno) &&
            existente.tipo_retorno === 'OBSERV',
        );

        //Si existe obsoletos se eliminan ya que son observaciones que migran a errores y los errores ya vienen por defecto en los xml_validaciones
        if (listadoObsoletos.length > 0) {
          this.logger.log(
            `Procedemos a eliminar los obsoletos: ${
              listadoObsoletos.length
            }: ${JSON.stringify(
              listadoObsoletos.map((item) => item.codigo_retorno),
            )}`,
          );
          for (let index = 0; index < listadoObsoletos.length; index++) {
            const obs = listadoObsoletos[index];
            await this.codeReturnRepository.delete({
              codigo_retorno: obs.codigo_retorno,
            });
          }
        }
      }
    } else {
      //Si no existe termina proceso
      this.logger.log(
        'No se encontró ningún archivo Excel Validaciones para procesar.',
      );
    }
    console.log(
      '='.repeat(30),
      'FINALIZA PROCESO DE VALIDACION DE CODIGOS DE RETORNO DE SUNAT',
      '='.repeat(30),
    );
  }

  // Función para buscar el archivo más reciente con el patrón de nombre
  private findLatestExcelFile(directory: string): string | null {
    const files = fs
      .readdirSync(directory)
      .filter((file) => path.extname(file) === '.xlsx');

    if (files.length === 0) {
      console.log('No se encontraron archivos Excel.');
      return null;
    }

    // Ordenar los archivos por fecha de modificación (el más reciente primero)
    const sortedFiles = files.sort((a, b) => {
      const aTime = fs.statSync(path.join(directory, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(directory, b)).mtime.getTime();
      return bTime - aTime; // El más reciente primero
    });

    // Retorna el archivo más reciente
    return path.join(directory, sortedFiles[0]);
  }

  private getCodesMigrations(latestFileMigrations: string): string[] {
    const fileBufferMigrations = fs.readFileSync(latestFileMigrations);
    const workbookMigrations = XLSX.read(fileBufferMigrations, {
      type: 'buffer',
    });
    const sheetNamesMigrations = workbookMigrations.SheetNames;

    const [
      worksheetMigrationsFactura,
      worksheetMigrationsPercepciones,
      worksheetMigrationsRetenciones,
      worksheetMigrationsNotaCredito,
      worksheetMigrationsNotaDebito,
    ] = sheetNamesMigrations.map(
      (sheetName) => workbookMigrations.Sheets[sheetName],
    );

    const jsonDataMigrations = [
      worksheetMigrationsFactura,
      worksheetMigrationsPercepciones,
      worksheetMigrationsRetenciones,
      worksheetMigrationsNotaCredito,
      worksheetMigrationsNotaDebito,
    ].map((worksheet) => XLSX.utils.sheet_to_json(worksheet));

    const combinedArray = jsonDataMigrations.flatMap((data) =>
      data.map((item) => Object.values(item)[1]),
    );

    // Crear un Set para eliminar duplicados y convertirlo de nuevo en un array
    return [...new Set(combinedArray)];
  }

  async findAllCodesReturnSunat() {
    try {
      return await this.codeReturnRepository.find();
    } catch (e) {
      throw new HttpException(
        'Error al listar los códigos de retorno de SUNAT',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
