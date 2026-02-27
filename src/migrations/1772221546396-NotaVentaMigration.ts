import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1772221546396 implements MigrationInterface {
    name = 'InitialMigration1772221546396'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notas_venta_details\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cantidad\` int NOT NULL, \`codigo\` varchar(255) NULL, \`descripcion\` text NULL, \`mtoValorUnitario\` decimal(22,10) NULL, \`porcentajeIgv\` decimal(10,2) NOT NULL, \`nota_venta_id\` int NOT NULL, \`product_id\` int NULL, \`presentation_id\` int NULL, \`unidad_id\` int NOT NULL, \`tipo_igv_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notas_venta\` (\`id\` int NOT NULL AUTO_INCREMENT, \`serie\` char(4) NOT NULL, \`correlativo\` char(8) NOT NULL, \`fecha_emision\` datetime NOT NULL, \`mto_operaciones_gravadas\` decimal(14,2) NULL, \`mto_operaciones_exoneradas\` decimal(14,2) NULL, \`mto_operaciones_inafectas\` decimal(14,2) NULL, \`mto_operaciones_exportacion\` decimal(14,2) NULL, \`mto_operaciones_gratuitas\` decimal(14,2) NULL, \`mto_igv\` decimal(14,2) NULL, \`mto_igv_gratuitas\` decimal(14,2) NULL, \`porcentaje_igv\` decimal(10,2) NOT NULL, \`estado_operacion\` tinyint NOT NULL DEFAULT '0', \`estado_anulacion\` tinyint NULL, \`observaciones\` text NULL, \`entidad\` varchar(255) NULL, \`entidad_tipo\` char(1) NULL, \`entidad_documento\` varchar(255) NULL, \`entidad_direccion\` varchar(255) NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`tipodoc_id\` int NOT NULL, \`moneda_id\` int NOT NULL, \`empresa_id\` int NOT NULL, \`establecimiento_id\` int NOT NULL, \`cliente_id\` int NULL, \`usuario_id\` int NOT NULL, \`pos_id\` int NULL, UNIQUE INDEX \`unique_notas_venta_constraint\` (\`empresa_id\`, \`establecimiento_id\`, \`pos_id\`, \`tipodoc_id\`, \`serie\`, \`correlativo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` ADD CONSTRAINT \`FK_8172abbde94320f7f16bd7da3dc\` FOREIGN KEY (\`nota_venta_id\`) REFERENCES \`notas_venta\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` ADD CONSTRAINT \`FK_533996362d72c83420ec8b7117f\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` ADD CONSTRAINT \`FK_db4a75d37680dce1cfc985b73a1\` FOREIGN KEY (\`presentation_id\`) REFERENCES \`presentations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` ADD CONSTRAINT \`FK_4cbdce71c2a6ff75c683a135efa\` FOREIGN KEY (\`unidad_id\`) REFERENCES \`unidades\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` ADD CONSTRAINT \`FK_dec7554b6f0193ca2142e5448c6\` FOREIGN KEY (\`tipo_igv_id\`) REFERENCES \`tipo_igvs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_5e5416eae48579e6bd200672045\` FOREIGN KEY (\`tipodoc_id\`) REFERENCES \`tipo_documentos\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_03407e27a5247dd0bbe7d0b840e\` FOREIGN KEY (\`moneda_id\`) REFERENCES \`monedas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_8f274047a29c8aa7737db4fa365\` FOREIGN KEY (\`empresa_id\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_e643a414ff4fc8edade6e31f4b5\` FOREIGN KEY (\`establecimiento_id\`) REFERENCES \`establecimientos\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_73f69a0825e1e0bc92892506f6c\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`entidades\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_d60becdb640c9054b17d182ea88\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` ADD CONSTRAINT \`FK_665f6bbd1c9968e896c20b5eccb\` FOREIGN KEY (\`pos_id\`) REFERENCES \`puntos_de_venta\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_665f6bbd1c9968e896c20b5eccb\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_d60becdb640c9054b17d182ea88\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_73f69a0825e1e0bc92892506f6c\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_e643a414ff4fc8edade6e31f4b5\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_8f274047a29c8aa7737db4fa365\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_03407e27a5247dd0bbe7d0b840e\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta\` DROP FOREIGN KEY \`FK_5e5416eae48579e6bd200672045\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` DROP FOREIGN KEY \`FK_dec7554b6f0193ca2142e5448c6\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` DROP FOREIGN KEY \`FK_4cbdce71c2a6ff75c683a135efa\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` DROP FOREIGN KEY \`FK_db4a75d37680dce1cfc985b73a1\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` DROP FOREIGN KEY \`FK_533996362d72c83420ec8b7117f\``);
        await queryRunner.query(`ALTER TABLE \`notas_venta_details\` DROP FOREIGN KEY \`FK_8172abbde94320f7f16bd7da3dc\``);
        await queryRunner.query(`DROP INDEX \`unique_notas_venta_constraint\` ON \`notas_venta\``);
        await queryRunner.query(`DROP TABLE \`notas_venta\``);
        await queryRunner.query(`DROP TABLE \`notas_venta_details\``);
    }

}
