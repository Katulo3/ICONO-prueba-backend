import { Model } from 'mongoose';
import { roles } from '../../config/roles';
import User from '../user/user.model';
import Product from '../product/product.model';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export interface IStatisticDimension {
  // expresión de $group._id que calcula la clave de cada documento
  groupBy: string | Record<string, unknown>;
  // etiquetas que se muestran aunque tengan count 0, en el orden indicado
  knownLabels: string[];
  // convierte la clave agrupada en etiqueta (por defecto String)
  toLabel?: (key: any) => string;
}

export interface IStatisticSource {
  model: Model<any>;
  // dimensiones que pueden usarse para comparar, indexadas por su nombre (valor de compareBy)
  compareBy: Record<string, IStatisticDimension>;
}

export const statisticSources: Record<string, IStatisticSource> = {
  users: {
    model: User,
    compareBy: {
      role: { groupBy: '$role', knownLabels: roles },
      // $month usa UTC, igual que el filtro por días de fecha
      registered: {
        groupBy: { $month: '$createdAt' },
        knownLabels: MONTH_NAMES,
        toLabel: (month: number) => MONTH_NAMES[month - 1] ?? String(month),
      },
    },
  },
  products: {
    model: Product,
    compareBy: {
      category: { groupBy: '$category', knownLabels: [] },
    },
  },
};
