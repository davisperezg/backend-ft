import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CodesReturnSunatEntity } from '../entities/codes-return-sunat.entity';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

@Injectable()
export class CodesReturnSunatService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(CodesReturnSunatEntity)
    private codeReturnRepository: Repository<CodesReturnSunatEntity>,
  ) {}

  async onApplicationBootstrap() {
    // Directorio donde se guardan los archivos Excel
    const excelDirectory = path.join(
      process.cwd(),
      `uploads/utils/validaciones`,
    );

    // Buscar el archivo Excel más reciente
    const latestFile = this.findLatestExcelFile(excelDirectory);

    if (latestFile) {
      // Leer el archivo Excel
      const fileBuffer = fs.readFileSync(latestFile);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Obtener los nombres de las hojas
      //const sheetNames = workbook.SheetNames;
      //console.log('Hojas disponibles:', sheetNames);

      const sheetName = 'CódigosRetorno';
      const worksheet = workbook.Sheets[sheetName];

      if (worksheet) {
        // Convertir los datos de la hoja a JSON 1986
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const countCodes = await this.codeReturnRepository.count();
        if (countCodes > 0) return;

        const CODES_RETURN_MAP = jsonData
          .slice(1, jsonData.length)
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

        const codesReturnSunat =
          this.codeReturnRepository.create(CODES_RETURN_MAP);

        await this.codeReturnRepository.insert(codesReturnSunat);
      } else {
        console.log(`La hoja "${sheetName}" no se encontró en el archivo.`);
      }
    } else {
      console.log('No se encontró ningún archivo Excel para procesar.');
    }
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
}
