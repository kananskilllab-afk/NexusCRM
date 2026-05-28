const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

CounterSchema.statics.bump = async function (name, base = 0) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 }, $setOnInsert: {} },
    { upsert: true, new: true }
  );
  return doc.seq + base;
};

module.exports = mongoose.model('Counter', CounterSchema);
