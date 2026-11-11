import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { chartTypes, IStatisticDoc, IStatisticModel } from './statistic.interfaces';

const statisticSchema = new mongoose.Schema<IStatisticDoc, IStatisticModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    chartType: {
      type: String,
      required: true,
      enum: chartTypes,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    compareBy: {
      type: String,
      required: true,
      trim: true,
    },
    dateFrom: {
      type: Date,
    },
    dateTo: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
statisticSchema.plugin(toJSON);
statisticSchema.plugin(paginate);

const Statistic = mongoose.model<IStatisticDoc, IStatisticModel>('Statistic', statisticSchema);

export default Statistic;
