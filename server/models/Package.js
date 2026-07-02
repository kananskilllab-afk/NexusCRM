const mongoose = require('mongoose');

const itineraryDaySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  city: String,
  title: String,
  description: String,
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
  },
  activities: [String],
  accommodation: String,
}, { _id: false });

const packageSchema = new mongoose.Schema(
  {
    // Core identity
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    category: {
      type: String,
      enum: ['Honeymoon', 'Family', 'Adventure', 'Beach', 'Cultural', 'Religious', 'Wildlife', 'Corporate', 'Group Tour', 'Custom'],
      default: 'Custom',
    },
    status: { type: String, enum: ['Draft', 'Active', 'Archived'], default: 'Draft' },
    description: String,
    highlights: [String],
    tags: [String],

    // Duration & Destinations
    days: { type: Number, required: true, min: 1 },
    nights: { type: Number, min: 0 },
    destinations: [String],

    // Day-by-day itinerary
    itinerary: [itineraryDaySchema],

    // Pricing
    pricePerPerson: { type: Number, required: true, min: 0 },
    pricePerCouple: { type: Number, min: 0 },
    childPrice: { type: Number, min: 0 },     // age 2–11
    infantPrice: { type: Number, min: 0 },    // age < 2
    currency: { type: String, default: 'INR' },
    markup: { type: Number, default: 0 },     // percentage added on top
    costPrice: { type: Number, min: 0 },      // internal cost (not shown to customer)

    // Validity & Departures
    validFrom: Date,
    validTo: Date,
    fixedDepartures: [Date],

    // Accommodation & Meals
    hotelCategory: {
      type: String,
      enum: ['2 Star', '3 Star', '4 Star', '5 Star', 'Resort', 'Homestay', 'Mixed'],
    },
    mealPlan: {
      type: String,
      enum: ['EP', 'CP', 'MAP', 'AP', 'All Inclusive'],
      // EP=Room Only, CP=Bed+Breakfast, MAP=Breakfast+Dinner, AP=All Meals
    },

    // Transport
    flightIncluded: { type: Boolean, default: false },
    trainIncluded: { type: Boolean, default: false },
    transfersIncluded: { type: Boolean, default: true },
    transportDetails: String,

    // Visa
    visaRequired: { type: Boolean, default: false },
    visaType: String,
    visaAssistance: { type: Boolean, default: false },

    // Inclusions & Exclusions
    inclusions: [String],
    exclusions: [String],

    // Capacity
    minPax: { type: Number, default: 1 },
    maxPax: Number,

    // Policy
    cancellationPolicy: String,
    termsAndConditions: String,

    // Meta
    createdBy: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Auto-generate code and sync nights — synchronous hook, no next() needed in Mongoose 9
packageSchema.pre('save', function () {
  if (!this.code && this.name) {
    const prefix = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    this.code = `${prefix}-${Date.now().toString().slice(-5)}`;
  }
  if (this.nights == null && this.days) {
    this.nights = this.days - 1;
  }
});

module.exports = mongoose.models.Package || mongoose.model('Package', packageSchema);
