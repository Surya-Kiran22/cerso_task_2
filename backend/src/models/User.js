const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpPurpose: {
      type: String,
      enum: ['registration', 'login'],
      select: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.otpCode;
    delete ret.otpExpires;
    delete ret.otpPurpose;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
