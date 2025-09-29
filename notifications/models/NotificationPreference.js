const mongoose = require("mongoose")

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // ID del usuario del microservicio de usuarios
      required: true,
      unique: true,
    },
    preferences: {
      workoutReminders: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push", "email", "sms"],
            default: "push",
          },
        ],
        frequency: {
          type: String,
          enum: ["daily", "weekly", "custom"],
          default: "daily",
        },
        time: {
          type: String,
          default: "08:00", // formato HH:MM
        },
        daysOfWeek: [
          {
            type: Number, // 0 = domingo, 1 = lunes, etc.
            min: 0,
            max: 6,
          },
        ],
      },
      mealReminders: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push", "email"],
            default: "push",
          },
        ],
        meals: {
          breakfast: {
            enabled: { type: Boolean, default: true },
            time: { type: String, default: "08:00" },
          },
          lunch: {
            enabled: { type: Boolean, default: true },
            time: { type: String, default: "12:00" },
          },
          dinner: {
            enabled: { type: Boolean, default: true },
            time: { type: String, default: "19:00" },
          },
          snack: {
            enabled: { type: Boolean, default: false },
            time: { type: String, default: "15:00" },
          },
        },
      },
      waterReminders: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push"],
            default: "push",
          },
        ],
        interval: {
          type: Number,
          default: 120, // minutos
        },
        startTime: {
          type: String,
          default: "08:00",
        },
        endTime: {
          type: String,
          default: "22:00",
        },
      },
      achievements: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push", "email"],
            default: "push",
          },
        ],
      },
      healthAlerts: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push", "email", "sms"],
            default: "push",
          },
        ],
        severity: {
          type: String,
          enum: ["medium", "high", "urgent"],
          default: "medium", // nivel mínimo para enviar alertas
        },
      },
      weeklyReports: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: [
          {
            type: String,
            enum: ["push", "email"],
            default: "email",
          },
        ],
        dayOfWeek: {
          type: Number,
          default: 1, // lunes
        },
        time: {
          type: String,
          default: "09:00",
        },
      },
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startTime: {
        type: String,
        default: "22:00",
      },
      endTime: {
        type: String,
        default: "08:00",
      },
    },
    timezone: {
      type: String,
      default: "America/Mexico_City",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema)
