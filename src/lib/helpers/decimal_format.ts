// transformer
export class DecimalColumnTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    if (data === null || data === 'null') {
      return parseFloat('0.00');
    }
    return parseFloat(data);
  }
}
