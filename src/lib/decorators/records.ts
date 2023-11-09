import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

//https://github.com/typestack/class-validator/issues/1378
//https://stackoverflow.com/questions/73905403/validating-recordstring-string-using-class-validator
export const IsRecord = (validationOptions?: ValidationOptions) => {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'IsRecord',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: 'Ingrese las series correctamente.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          /**
           * Esto valida si documentos no tiene un objeto, un key diferente de string
           * y si sus values son vacios. Solo permite un array de strings
           */
          if (typeof value !== 'object') return false;
          if (Object.keys(value).length === 0) return false;
          if (Object.values(value)[0].length === 0) return false;
          const keys = Object.keys(value);

          return keys.every((key) => {
            if (typeof key != 'string') return false;

            return (
              Array.isArray(value[key]) &&
              value[key].every((val) => {
                return typeof val === 'string';
              })
            );
          });
        },
      },
    });
  };
};
